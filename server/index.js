import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomInt,randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {cleanName,VEHICLES,createRace,stepRace,DT} from '../src/core.js';
import {MemoryStore,roomRequest} from './rooms.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
export function startServer({port=Number(process.env.PORT)||8080,host='0.0.0.0',origins=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)}={}){
  if(process.env.NODE_ENV==='production'&&!origins.length)throw new Error('ALLOWED_ORIGINS is required in production');
  const rooms=new Map(),httpStore=new MemoryStore(),server=http.createServer(async(req,res)=>{
    if(req.url==='/api/race'&&req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){res.writeHead(413);res.end('Payload too large');return;}}try{const data=await roomRequest(httpStore,JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({messages:[{type:'error',message:e.message}]}));}return;}
    if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',rooms:rooms.size,protocol:1}));return;}
    const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname),relative=name==='/'?'index.html':name.slice(1);
    if(!/^(index\.html|style\.css|config\.js|src\/[\w.-]+\.js|vendor\/three\.(module|core)\.js)$/.test(relative)){res.writeHead(404);res.end('Not found');return;}
    const file=relative.startsWith('vendor/')?path.join(root,'node_modules/three/build',path.basename(relative)):path.join(root,relative);
    try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(404);res.end('Missing resource');}
  });
  const wss=new WebSocketServer({server,maxPayload:4096,verifyClient:({origin},cb)=>cb(!origins.length||origins.includes(origin),403,'Origin not permitted')});
  const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<128000)ws.send(JSON.stringify(data));};
  const roomState=r=>({type:'room',code:r.code,host:r.host,mode:r.mode,status:r.status,players:r.players.map(p=>({id:p.id,name:p.name,vehicle:p.vehicle,ready:p.ready,connected:p.connected}))});
  const broadcast=(r,msg)=>r.players.forEach(p=>send(p.ws,msg));
  function leave(ws){const r=rooms.get(ws.room);if(!r)return;const p=r.players.find(p=>p.id===ws.playerId);if(!p)return;p.connected=false;p.input={};
    if(r.status==='racing'||r.status==='countdown'){const c=r.race.cars.find(c=>c.id===p.id);c.dnf=true;c.connected=false;if(r.players.filter(p=>p.connected).length<=1){for(const c of r.race.cars)if(!c.dnf)c.walkover=true;r.race.done=true;r.status='result';broadcast(r,{type:'result',race:r.race,reason:'상대가 연결을 종료하여 기권 처리되었습니다.'});}}else{r.players=r.players.filter(p=>p.ws!==ws);}
    // A remaining player becomes host; no cross-room state is reused.
    if(!r.players.some(p=>p.id===r.host&&p.connected))r.host=r.players.find(p=>p.connected)?.id;
    ws.room=null;if(!r.players.some(p=>p.connected)){rooms.delete(r.code);}else broadcast(r,roomState(r));
  }
  wss.on('connection',ws=>{ws.playerId=randomUUID();ws.lastAlive=Date.now();ws.messageWindow=0;ws.messageCount=0;send(ws,{type:'hello',id:ws.playerId,protocol:1});ws.on('pong',()=>ws.lastAlive=Date.now());
    ws.on('message',raw=>{const now=Date.now();if(now-ws.messageWindow>1000){ws.messageWindow=now;ws.messageCount=0;}if(++ws.messageCount>90){ws.close(1008,'Rate limit');return;}let m;try{m=JSON.parse(raw);}catch{send(ws,{type:'error',message:'잘못된 메시지입니다.'});return;}
      try{const r=rooms.get(ws.room),p=r?.players.find(p=>p.id===ws.playerId);
        if(m.type==='create'||m.type==='join'){if(ws.room)throw new Error('먼저 현재 방에서 나가세요.');const name=cleanName(m.name);if(!VEHICLES.some(v=>v.id===m.vehicle))throw new Error('차량을 선택하세요.');let room;
          if(m.type==='create'){if(rooms.size>=250)throw new Error('서버가 혼잡합니다. 잠시 후 다시 시도하세요.');let code;do{code=String(randomInt(0,1000000)).padStart(6,'0');}while(rooms.has(code));room={code,host:ws.playerId,mode:m.mode==='item'?'item':'speed',status:'waiting',players:[],created:now};rooms.set(code,room);}
          else{if(!/^\d{6}$/.test(String(m.code)))throw new Error('6자리 숫자 코드를 입력하세요.');room=rooms.get(m.code);if(!room)throw new Error('존재하지 않는 방입니다.');if(room.status!=='waiting')throw new Error('이미 시작한 방입니다.');if(room.players.length>=2)throw new Error('방 정원이 가득 찼습니다.');}
          room.players.push({id:ws.playerId,ws,name,vehicle:m.vehicle,ready:false,connected:true,input:{},inputAt:now});ws.room=room.code;broadcast(room,roomState(room));return;
        }
        if(m.type==='ping'){send(ws,{type:'pong',clientNow:m.clientNow,serverNow:Date.now()});return;}
        if(m.type==='leave'){leave(ws);send(ws,{type:'left'});return;}if(!r||!p)throw new Error('방에 먼저 입장하세요.');
        if(m.type==='ready'&&r.status==='waiting'){p.ready=!p.ready;broadcast(r,roomState(r));}
        else if(m.type==='mode'&&r.status==='waiting'&&r.host===p.id){r.mode=m.mode==='item'?'item':'speed';r.players.forEach(p=>p.ready=false);broadcast(r,roomState(r));}
        else if(m.type==='start'){if(r.host!==p.id||r.status!=='waiting'||r.players.length!==2||!r.players.every(p=>p.ready&&p.connected))throw new Error('두 플레이어가 준비해야 방장이 시작할 수 있습니다.');r.race=createRace(r.players,r.mode);r.race.online=true;r.status='countdown';r.startAt=Date.now()+4000;r.lastTick=r.startAt;r.accumulator=0;r.tickCount=0;broadcast(r,{type:'start',race:r.race,startAt:r.startAt,serverNow:Date.now()});}
        else if(m.type==='input'&&(r.status==='racing'||r.status==='countdown')){const allowed=['accelerate','brake','left','right','drift','boost','item','reset'];p.input=Object.fromEntries(allowed.map(k=>[k,m.keys?.[k]===true]));p.inputAt=now;}
        else if(m.type==='rematch'&&r.status==='result'){p.ready=true;if(r.players.length===2&&r.players.every(p=>p.ready&&p.connected)){r.status='waiting';r.players.forEach(p=>p.ready=false);delete r.race;}broadcast(r,roomState(r));return;}
        else if(m.type==='ping')send(ws,{type:'pong',clientNow:m.clientNow,serverNow:Date.now()});
      }catch(e){send(ws,{type:'error',message:e.message});}
    });ws.on('close',()=>leave(ws));ws.on('error',()=>{});
  });
  const timer=setInterval(()=>{const now=Date.now();for(const r of rooms.values()){
    if((r.status!=='racing'&&r.status!=='countdown')||now<r.startAt)continue;r.status='racing';const delta=Math.min((now-r.lastTick)/1000,.25);r.lastTick=now;r.accumulator+=delta;
    while(r.accumulator>=DT&&!r.race.done){const inputs={};for(const p of r.players)inputs[p.id]=now-p.inputAt<350?p.input:{};stepRace(r.race,inputs,DT);r.accumulator-=DT;r.tickCount++;}
    if(r.race.done){r.status='result';r.players.forEach(p=>p.ready=false);broadcast(r,{type:'result',race:r.race});broadcast(r,roomState(r));}
    else if(r.tickCount%3===0||now-(r.lastBroadcast||0)>=50){r.lastBroadcast=now;broadcast(r,{type:'state',race:r.race,serverNow:now});}
  }},1000/60);
  const heartbeat=setInterval(()=>{const now=Date.now();for(const ws of wss.clients){if(now-ws.lastAlive>45000)ws.terminate();else ws.ping();}for(const r of rooms.values())if(r.status==='waiting'&&now-r.created>30*60000){broadcast(r,{type:'error',message:'대기 시간이 초과되어 방이 정리되었습니다.'});r.players.forEach(p=>{p.ws.room=null;send(p.ws,{type:'left'});});rooms.delete(r.code);}},15000);
  server.listen(port,host,()=>console.log(`Neon Apex local: http://localhost:${server.address().port}`));
  return {server,wss,rooms,close:async()=>{clearInterval(timer);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))startServer();
