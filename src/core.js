export const TRACK_ID = 'harbor-loop';
export const LAPS = 3;
export const DT = 1 / 60;
export const DRIVING = Object.freeze({topSpeed:64,boostSpeed:92,magnetSpeed:82,acceleration:27,boostAcceleration:35,braking:45});
export const VEHICLES = [
  {id:'ev6',name:'기아 EV6',tag:'FACELIFT CROSSOVER',color:0x5be4d3,length:4.695,width:1.880,height:1.550},
  {id:'cybertruck',name:'테슬라 사이버트럭',tag:'ANGULAR PICKUP',color:0xa9b8c6,length:5.683,width:2.032,height:1.794},
  {id:'model-s',name:'테슬라 모델 S',tag:'GRAND TOURING',color:0xec5770,length:5.021,width:1.987,height:1.430},
  {id:'model-y',name:'테슬라 모델 Y',tag:'JUNIPER SUV',color:0xdbe6ef,length:4.790,width:1.920,height:1.624},
  {id:'ioniq5',name:'현대 아이오닉 5',tag:'PIXEL HATCHBACK',color:0xb6a3ec,length:4.64,width:1.90,height:1.61},
  {id:'ev3',name:'기아 EV3',tag:'COMPACT SUV',color:0xf2ba54,length:4.300,width:1.850,height:1.560}
];
export const ITEMS=['missile','water','banana','magnet','shield'];
export const ITEM_LABELS={missile:'미사일',water:'물폭탄',banana:'바나나',magnet:'자석',shield:'실드'};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function cleanName(name){ const s=String(name??'').trim(); if(!s || [...s].length>12) throw new Error('이름은 공백을 제외하고 1~12자로 입력하세요.'); return s; }
const controls=[[0,110],[110,110],[185,60],[165,-35],[110,-80],[175,-145],[155,-210],[65,-215],[15,-155],[-45,-135],[-105,-205],[-170,-190],[-185,-95],[-115,-55],[-155,30],[-95,110]];
function cat(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
export const track={points:[],length:0,width:19,gates:12};
for(let i=0;i<controls.length;i++) for(let j=0;j<45;j++){
  const a=controls[(i+controls.length-1)%controls.length], b=controls[i], c=controls[(i+1)%controls.length],d=controls[(i+2)%controls.length],t=j/45;
  const p={x:cat(a[0],b[0],c[0],d[0],t),z:cat(a[1],b[1],c[1],d[1],t),s:track.length};
  if(track.points.length){const q=track.points.at(-1);track.length+=Math.hypot(p.x-q.x,p.z-q.z);p.s=track.length;}track.points.push(p);
}
track.length+=Math.hypot(track.points.at(-1).x-track.points[0].x,track.points.at(-1).z-track.points[0].z);
export function at(s){ s=((s%track.length)+track.length)%track.length;let lo=0,hi=track.points.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(track.points[m].s<=s)lo=m;else hi=m-1;}const a=track.points[lo],b=track.points[(lo+1)%track.points.length],bs=lo===track.points.length-1?track.length:b.s,t=(s-a.s)/(bs-a.s);const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);return {x:a.x+dx*t,z:a.z+dz*t,yaw:Math.atan2(dx,dz),nx:dz/len,nz:-dx/len}; }
export function nearest(x,z){let best={dist:Infinity,s:0,x:0,z:0,nx:0,nz:0};for(let i=0;i<track.points.length;i++){const a=track.points[i],b=track.points[(i+1)%track.points.length],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/l2,0,1),px=a.x+dx*t,pz=a.z+dz*t,dist=Math.hypot(x-px,z-pz);if(dist<best.dist){const len=Math.sqrt(l2);best={dist,s:(a.s+len*t)%track.length,x:px,z:pz,nx:dz/len,nz:-dx/len,yaw:Math.atan2(dx,dz)};}}return best;}
export function createCar(id,name,vehicle,slot=0,ai=false){const s=-8-Math.floor(slot/2)*7,p=at(s),offset=(slot%2===0?-1:1)*3.4;return {id,name:cleanName(name),vehicle,ai,x:p.x+p.nx*offset,z:p.z+p.nz*offset,yaw:p.yaw,vx:0,vz:0,speed:0,steer:0,s:((s%track.length)+track.length)%track.length,nextGate:1,lap:0,lapTimes:[],lastLapAt:0,finish:null,penalty:0,resetCooldown:0,meter:0,boosts:0,boost:0,drifting:false,slip:0,stun:0,shield:0,magnet:0,item:null,connected:true,dnf:false,aiSeed:slot};}
export function createRace(players,mode='speed'){return {mode,trackId:TRACK_ID,time:0,cars:players.map((p,i)=>createCar(p.id,p.name,p.vehicle,i,!!p.ai)),boxes:mode==='item'?Array.from({length:18},(_,i)=>({s:(i+.7)*track.length/18,cooldown:0,id:i})):[],entities:[],events:[],done:false,firstFinish:null};}
export function rankCars(race){return [...race.cars].sort((a,b)=>{if(a.dnf!==b.dnf)return a.dnf?1:-1;if(a.finish!==null&&b.finish!==null)return a.finish-b.finish;if(a.finish!==null)return -1;if(b.finish!==null)return 1;return progress(b)-progress(a);});}
export function progress(c){const gate=track.length/track.gates,last=(c.nextGate+track.gates-1)%track.gates,within=((c.s-last*gate)%track.length+track.length)%track.length;return c.lap*track.length+last*gate+Math.min(within,gate);}
export function aiInput(c,race){const p=at(c.s+clamp(Math.abs(c.speed)*.6,12,38)),desired=Math.atan2(p.x-c.x,p.z-c.z),err=wrapAngle(desired-c.yaw),bend=Math.abs(wrapAngle(at(c.s+52).yaw-at(c.s+10).yaw)),limit=bend>.5?28:bend>.25?40:60;return {accelerate:c.speed<limit,brake:c.speed>limit+3,left:err>.025,right:err<-.025,analog:clamp(-err*1.8,-1,1),drift:Math.abs(err)>.20&&c.speed>23,boost:bend<.13&&Math.abs(err)<.12&&c.boosts>0&&c.boost<=0,item:!!c.item&&((Math.floor(race.time*4)+c.aiSeed)%13===0),reset:false};}
export function resetCar(c,race){if(c.resetCooldown>0||c.finish!==null||c.dnf)return;const last=(c.nextGate+track.gates-1)%track.gates,p=at(last*track.length/track.gates+3);c.x=p.x;c.z=p.z;c.yaw=p.yaw;c.vx=c.vz=c.speed=0;c.s=(last*track.length/track.gates+3)%track.length;c.penalty+=3;c.resetCooldown=2;c.boost=0;race.events.push({type:'reset',id:c.id});}
function target(c,race){return rankCars(race).filter(o=>o.id!==c.id&&!o.dnf&&o.finish===null&&progress(o)>progress(c)).sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z))[0];}
export function getTarget(c,race){return target(c,race)?.id??null;}
export function hit(c,duration,race,type){if(c.shield>0){c.shield=0;race.events.push({type:'block',id:c.id});return false;}c.stun=Math.max(c.stun,duration);c.speed*=.30;c.vx*=.30;c.vz*=.30;race.events.push({type,id:c.id});return true;}
export function useItem(c,race){if(!c.item||c.finish!==null||c.dnf)return false;const kind=c.item,t=target(c,race);if((kind==='missile'||kind==='magnet')&&!t)return false;c.item=null;race.events.push({type:'item',id:c.id,kind});if(kind==='shield')c.shield=5;else if(kind==='magnet') {c.magnet=3.2;c.magnetTarget=t.id;}else if(kind==='missile')race.entities.push({kind,x:c.x,z:c.z,target:t.id,owner:c.id,ttl:6});else if(kind==='water')race.entities.push({kind,x:c.x,z:c.z,vx:Math.sin(c.yaw)*44,vz:Math.cos(c.yaw)*44,owner:c.id,ttl:1.0});else race.entities.push({kind,x:c.x-Math.sin(c.yaw)*5,z:c.z-Math.cos(c.yaw)*5,owner:c.id,ttl:30});return true;}
function gates(c,oldS,race,dt){let d=c.s-oldS;if(d<-track.length/2)d+=track.length;if(d>track.length/2)d-=track.length;if(d<=0||d>Math.max(5,Math.hypot(c.vx,c.vz)*dt+3))return;const gs=c.nextGate*track.length/track.gates,along=(gs-oldS+track.length)%track.length;if(along<=d+.001){const gate=at(gs);if(Math.abs(wrapAngle(c.yaw-gate.yaw))>Math.PI/2)return;if(c.nextGate===0){c.lap++;const elapsed=race.time+c.penalty;c.lapTimes.push(elapsed-c.lastLapAt);c.lastLapAt=elapsed;if(c.lap===LAPS){c.finish=elapsed;c.speed=c.vx=c.vz=0;race.firstFinish??=race.time;race.events.push({type:'finish',id:c.id});}}c.nextGate=(c.nextGate+1)%track.gates;}}
export function stepRace(race,inputs={},dt=DT){if(race.done)return;race.events=[];race.time+=dt;for(const b of race.boxes)b.cooldown=Math.max(0,b.cooldown-dt);
  for(const c of race.cars){if(c.finish!==null||c.dnf)continue;const input=c.ai?aiInput(c,race):inputs[c.id]||{};
    for(const timer of ['boost','stun','shield','magnet','resetCooldown'])c[timer]=Math.max(0,c[timer]-dt);
    if(input.reset)resetCar(c,race);if(input.item)useItem(c,race);if(input.boost&&c.boosts>0&&c.boost===0&&c.stun===0){c.boosts--;c.boost=2.6;race.events.push({type:'boost',id:c.id});}
    const oldS=c.s;c.steer=typeof input.analog==='number'?clamp(input.analog,-1,1):(Number(!!input.right)-Number(!!input.left));
    const forwardX=Math.sin(c.yaw),forwardZ=Math.cos(c.yaw),moving=Math.hypot(c.vx,c.vz);
    c.speed=c.vx*forwardX+c.vz*forwardZ;const max=c.boost>0?DRIVING.boostSpeed:c.magnet>0?DRIVING.magnetSpeed:DRIVING.topSpeed;
    const accel=(input.accelerate?DRIVING.acceleration:0)+(c.boost>0?DRIVING.boostAcceleration:0)+(c.magnet>0?24:0)-(input.brake?(c.speed>1?DRIVING.braking:12):0);
    c.speed=clamp(c.speed+(c.stun>0?0:accel)*dt,-12,max);c.speed*=Math.exp(-(input.accelerate?.12:input.brake?.1:.70)*dt);
    if(c.stun>0)c.speed*=Math.exp(-3*dt);
    c.drifting=!!input.drift&&Math.abs(c.steer)>.15&&c.speed>17&&c.stun===0;
    const turn=(1.15+Math.min(Math.abs(c.speed),25)*.023)*(c.drifting?1.38:1)*clamp(Math.abs(c.speed)/9,0,1)*Math.sign(c.speed||1);
    // Forward is +Z. From the chase camera, right is (-cos(yaw), sin(yaw)).
    // A positive right input must therefore decrease yaw.
    c.yaw=wrapAngle(c.yaw-c.steer*turn*dt*(c.stun>0?.28:1));
    if(c.magnet>0){const t=race.cars.find(o=>o.id===c.magnetTarget);if(t&&!t.dnf)c.yaw+=clamp(wrapAngle(Math.atan2(t.x-c.x,t.z-c.z)-c.yaw),-.8*dt,.8*dt);}
    // Apply longitudinal acceleration in full. Grip damps only lateral slip,
    // otherwise the old vector lerp discarded most acceleration at 60 Hz.
    const rightX=Math.cos(c.yaw),rightZ=-Math.sin(c.yaw),sideLimit=Math.abs(c.speed)*(c.drifting?.60:.24),sideSpeed=clamp((c.vx*rightX+c.vz*rightZ)*Math.exp(-(c.drifting?3.0:13)*dt),-sideLimit,sideLimit);
    c.vx=Math.sin(c.yaw)*c.speed+rightX*sideSpeed;c.vz=Math.cos(c.yaw)*c.speed+rightZ*sideSpeed;c.x+=c.vx*dt;c.z+=c.vz*dt;
    c.slip=wrapAngle(c.yaw-Math.atan2(c.vx,c.vz));if(c.drifting&&moving>17&&Math.abs(c.slip)>.12){c.meter+=dt*clamp(Math.abs(c.slip),.12,.9)*50;if(c.meter>=100){if(c.boosts<2)c.boosts++;c.meter-=100;}}
    const near=nearest(c.x,c.z),edge=track.width/2-1.1;if(near.dist>edge){const k=edge/near.dist;c.x=near.x+(c.x-near.x)*k;c.z=near.z+(c.z-near.z)*k;const nx=(c.x-near.x)/edge,nz=(c.z-near.z)/edge,out=c.vx*nx+c.vz*nz;if(out>0){c.vx-=out*nx*1.45;c.vz-=out*nz*1.45;c.speed*=.72;}if(near.dist>12)race.events.push({type:'wall',id:c.id});}
    c.s=nearest(c.x,c.z).s;gates(c,oldS,race,dt);
    if(!c.item&&race.mode==='item')for(const b of race.boxes){if(b.cooldown>0)continue;const p=at(b.s);if(Math.hypot(c.x-p.x,c.z-p.z)<4.2){c.item=ITEMS[Math.floor((race.time*3+b.id*1.7+c.aiSeed)%5)];b.cooldown=7;race.events.push({type:'pickup',id:c.id});break;}}
  }
  for(let i=0;i<race.cars.length;i++)for(let j=i+1;j<race.cars.length;j++){const a=race.cars[i],b=race.cars[j];if(a.dnf||b.dnf||a.finish!==null||b.finish!==null)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<3&&d>.001){const nx=dx/d,nz=dz/d,over=(3-d)*.5;a.x-=nx*over;a.z-=nz*over;b.x+=nx*over;b.z+=nz*over;const impact=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;if(impact>0){a.vx-=nx*impact*.65;a.vz-=nz*impact*.65;b.vx+=nx*impact*.65;b.vz+=nz*impact*.65;}}}
  for(const e of race.entities){e.ttl-=dt;if(e.kind==='missile'){const t=race.cars.find(c=>c.id===e.target);if(!t||t.dnf||t.finish!==null){e.ttl=0;continue;}const d=Math.hypot(t.x-e.x,t.z-e.z);if(d<2.8){hit(t,1.7,race,'missile');e.ttl=0;}else {e.x+=(t.x-e.x)/d*85*dt;e.z+=(t.z-e.z)/d*85*dt;}}else if(e.kind==='water'){e.x+=e.vx*dt;e.z+=e.vz*dt;if(e.ttl<=0){for(const c of race.cars)if(c.id!==e.owner&&!c.dnf&&c.finish===null&&Math.hypot(c.x-e.x,c.z-e.z)<13)hit(c,2.2,race,'water');race.events.push({type:'splash',x:e.x,z:e.z});}}else if(e.kind==='banana'){for(const c of race.cars)if(c.id!==e.owner&&!c.dnf&&c.finish===null&&Math.hypot(c.x-e.x,c.z-e.z)<2.5){if(hit(c,1.4,race,'banana'))c.yaw+=1.4;e.ttl=0;break;}}}
  race.entities=race.entities.filter(e=>e.ttl>0);
  if(race.cars.every(c=>c.finish!==null||c.dnf)||race.time>420||(race.firstFinish!==null&&race.time-race.firstFinish>35)){for(const c of race.cars)if(c.finish===null)c.dnf=true;race.done=true;}
}

