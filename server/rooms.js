import {randomInt,randomUUID,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createRace,stepRace,DT,VEHICLES,cleanName} from '../src/core.js';
const hash=token=>createHash('sha256').update(String(token)).digest('hex');
const validToken=(token,digest)=>{const a=Buffer.from(hash(token)),b=Buffer.from(digest||'');return a.length===b.length&&timingSafeEqual(a,b);};
const publicRoom=r=>({type:'room',code:r.code,host:r.host,mode:r.mode,status:r.status,players:r.players.map(({id,name,vehicle,ready,connected})=>({id,name,vehicle,ready,connected}))});
const allowed=['accelerate','brake','left','right','drift','boost','item','reset'];
export class MemoryStore{
 constructor(){this.data=new Map();this.version=0;}
 async getWithMetadata(k){const e=this.data.get(k);return e?structuredClone(e):null;}
 async setJSON(k,value,{onlyIfNew,onlyIfMatch,metadata}={}){const old=this.data.get(k);if((onlyIfNew&&old)||(onlyIfMatch&&old?.etag!==onlyIfMatch))return {modified:false};const etag=String(++this.version);this.data.set(k,{data:structuredClone(value),etag,metadata});return {modified:true,etag};}
 async delete(k){this.data.delete(k);}
 async list(){return {blobs:[...this.data].map(([key,e])=>({key,etag:e.etag}))};}
}
function advance(r,now){
 for(const p of r.players)if(p.connected&&now-p.seen>25000){p.connected=false;p.ready=false;p.keys={};if(r.race){const c=r.race.cars.find(c=>c.id===p.id);if(c)c.dnf=true;}}
 if(r.status==='waiting'){r.players=r.players.filter(p=>p.connected);if(!r.players.some(p=>p.id===r.host))r.host=r.players[0]?.id;}
 if(r.status==='countdown'||r.status==='racing'){
   if(r.players.filter(p=>p.connected).length<2){for(const c of r.race.cars)if(!c.dnf)c.walkover=true;r.race.done=true;r.status='result';r.reason='상대가 연결을 종료하여 기권 처리되었습니다.';}
   else if(now>=r.startAt){r.status='racing';const stop=Math.min(now,r.lastTick+2000);while(r.lastTick+DT*1000<=stop&&!r.race.done){const keys={};for(const p of r.players)keys[p.id]=r.lastTick-p.inputAt<2200?p.keys:{};stepRace(r.race,keys,DT);r.lastTick+=DT*1000;}if(now-stop>10000){r.reason='서버 응답이 장시간 중단되어 경기를 종료했습니다.';r.race.cars.forEach(c=>c.dnf=true);r.race.done=true;}if(r.race.done){r.status='result';r.players.forEach(p=>p.ready=false);}}
 }
}
function reply(r,now,extra={}){const messages=[publicRoom(r)];if(r.race&&(r.status==='countdown'||r.status==='racing'))messages.push({type:'startOrState',race:r.race,startAt:r.startAt,serverNow:now});if(r.status==='result')messages.push({type:'result',race:r.race,reason:r.reason||''});return {messages,serverNow:now,...extra};}
export async function roomRequest(store,m,now=Date.now()){
 if(!m||typeof m!=='object')throw new Error('잘못된 요청입니다.');
 if(m.type==='health')return {ok:true,transport:'Netlify Functions + strong Blobs',serverNow:now};
 if(m.type==='create'){
   const name=cleanName(m.name);if(!VEHICLES.some(v=>v.id===m.vehicle))throw new Error('차량을 선택하세요.');
   for(let i=0;i<16;i++){const code=String(randomInt(0,1000000)).padStart(6,'0'),id=randomUUID(),token=randomBytes(32).toString('hex');const r={code,host:id,mode:m.mode==='item'?'item':'speed',status:'waiting',created:now,expires:now+1800000,players:[{id,name,vehicle:m.vehicle,ready:false,connected:true,seen:now,keys:{},inputAt:now,tokenHash:hash(token)}]};const result=await store.setJSON(`rooms/${code}`,r,{onlyIfNew:true,metadata:{expires:r.expires}});if(result.modified)return reply(r,now,{yourId:id,token,code});}throw new Error('방 생성에 실패했습니다. 다시 시도하세요.');
 }
 if(!/^\d{6}$/.test(String(m.code)))throw new Error('6자리 숫자 코드를 입력하세요.');const key=`rooms/${m.code}`;
 for(let retry=0;retry<8;retry++){
   const entry=await store.getWithMetadata(key,{type:'json',consistency:'strong'});if(!entry||entry.data.closed||entry.data.expires<now)throw new Error('존재하지 않거나 만료된 방입니다.');const r=entry.data;
   advance(r,now);let extra={};
   if(m.type==='join'){if(r.status!=='waiting')throw new Error('이미 시작한 방입니다.');if(r.players.length>=2)throw new Error('방 정원이 가득 찼습니다.');const name=cleanName(m.name);if(!VEHICLES.some(v=>v.id===m.vehicle))throw new Error('차량을 선택하세요.');const id=randomUUID(),token=randomBytes(32).toString('hex');r.players.push({id,name,vehicle:m.vehicle,ready:false,connected:true,seen:now,keys:{},inputAt:now,tokenHash:hash(token)});extra={yourId:id,token,code:r.code};}
   else{
     const p=r.players.find(p=>p.id===m.id);if(!p||!validToken(m.token,p.tokenHash))throw new Error('참가자 인증에 실패했습니다. 방에 다시 입장하세요.');if(!p.connected&&m.type!=='leave')throw new Error('연결 시간이 초과되었습니다. 방에 다시 입장하세요.');
     p.seen=now;
     if(m.type==='poll'){const seq=Number(m.seq);if(Number.isSafeInteger(seq)&&seq>(p.seq??-1)){p.seq=seq;p.keys=Object.fromEntries(allowed.map(k=>[k,m.keys?.[k]===true]));p.inputAt=now;}}
     else if(m.type==='ready'&&r.status==='waiting')p.ready=!p.ready;
     else if(m.type==='mode'&&r.status==='waiting'&&r.host===p.id){r.mode=m.mode==='item'?'item':'speed';r.players.forEach(p=>p.ready=false);}
     else if(m.type==='start'){if(r.host!==p.id||r.status!=='waiting'||r.players.length!==2||!r.players.every(p=>p.ready&&p.connected))throw new Error('두 플레이어가 준비해야 방장이 시작할 수 있습니다.');r.race=createRace(r.players,r.mode);r.race.online=true;r.startAt=now+4000;r.lastTick=r.startAt;r.status='countdown';r.reason='';}
     else if(m.type==='leave'){p.connected=false;p.keys={};if(r.status==='waiting'){r.players=r.players.filter(o=>o.id!==p.id);if(r.host===p.id)r.host=r.players[0]?.id;}else if(r.race&&!r.race.done){const c=r.race.cars.find(c=>c.id===p.id);c.dnf=true;c.connected=false;for(const o of r.race.cars)if(!o.dnf)o.walkover=true;r.race.done=true;r.status='result';r.reason='상대가 방을 나가 기권 처리되었습니다.';}extra={messages:[{type:'left'}]};}
     else if(m.type==='rematch'&&r.status==='result'){p.ready=true;if(r.players.length===2&&r.players.every(p=>p.ready&&p.connected)){r.status='waiting';r.players.forEach(p=>p.ready=false);delete r.race;}}
   }
   const empty=!r.players.some(p=>p.connected);r.closed=empty;r.expires=empty?now:now+1800000;r.revision=(r.revision||0)+1;
   const result=await store.setJSON(key,r,{onlyIfMatch:entry.etag,metadata:{expires:r.expires}});if(result.modified){const response=reply(r,now,extra);if(empty)await store.delete(key);return response;}
 }
 return {retry:true,messages:[],serverNow:now};
}
