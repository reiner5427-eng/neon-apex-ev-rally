import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore,roomRequest} from '../server/rooms.js';
import {aiInput,DT} from '../src/core.js';
test('conditional writes isolate concurrent joins, authenticate input, preserve ordered server-owned results',async()=>{
 const store=new MemoryStore(),start=100000,host=await roomRequest(store,{type:'create',name:'HOST',vehicle:'ev6',mode:'item'},start),code=host.code;
 const auth={id:host.yourId,token:host.token,code};assert.equal(JSON.stringify(host).includes('tokenHash'),false);
 const joined=await Promise.allSettled([roomRequest(store,{type:'join',name:'B',vehicle:'ev3',code},start+1),roomRequest(store,{type:'join',name:'C',vehicle:'model-s',code},start+1)]);assert.equal(joined.filter(r=>r.status==='fulfilled').length,1);const guest=joined.find(r=>r.status==='fulfilled').value,guestAuth={id:guest.yourId,token:guest.token,code};
 await assert.rejects(roomRequest(store,{type:'poll',...auth,token:'fake',keys:{accelerate:true}},start+10),/인증/);
 await roomRequest(store,{type:'ready',...auth},start+20);await roomRequest(store,{type:'ready',...guestAuth},start+30);const response=await roomRequest(store,{type:'start',...auth},start+40);assert.equal(response.messages.at(-1).race.cars.length,2);
 await roomRequest(store,{type:'poll',...auth,seq:0,keys:{accelerate:true},lap:3,finish:0,x:999999},start+45);let r=(await store.getWithMetadata(`rooms/${code}`)).data;assert.equal(r.race.cars[0].finish,null);assert.equal(r.race.cars[0].lap,0);
 const other=await roomRequest(store,{type:'create',name:'OTHER',vehicle:'model-y'},start+100);assert.notEqual(other.code,code);
 let now=r.startAt,seq=1,data;for(let i=0;i<2800&&!r.race.done;i++){
   now+=100;const byId=Object.fromEntries(r.race.cars.map(c=>{const k=aiInput(c,r.race);delete k.analog;return [c.id,k];}));
   await roomRequest(store,{type:'poll',...auth,seq:seq++,keys:byId[auth.id]},now);data=await roomRequest(store,{type:'poll',...guestAuth,seq:seq++,keys:byId[guestAuth.id]},now);r=(await store.getWithMetadata(`rooms/${code}`)).data;
 }
 assert.equal(r.status,'result');assert.ok(r.race.cars.every(c=>c.finish!==null&&c.lap===3));assert.equal(r.race.cars.some(c=>c.ai),false);assert.equal((await store.getWithMetadata(`rooms/${other.code}`)).data.status,'waiting');
 const hostResult=await roomRequest(store,{type:'poll',...auth,seq:seq++},now+1);assert.deepEqual(hostResult.messages.at(-1).race.cars,data.messages.at(-1).race.cars);
 await roomRequest(store,{type:'rematch',...auth},now+10);const rematch=await roomRequest(store,{type:'rematch',...guestAuth},now+20);assert.equal(rematch.messages[0].status,'waiting');
 await roomRequest(store,{type:'leave',...auth},now+30);assert.equal((await store.getWithMetadata(`rooms/${code}`)).data.host,guestAuth.id);await roomRequest(store,{type:'leave',...guestAuth},now+40);assert.equal(await store.getWithMetadata(`rooms/${code}`),null);
});
test('HTTP heartbeat timeout causes forfeit and empty/expired room lifecycle is explicit',async()=>{const store=new MemoryStore();const a=await roomRequest(store,{type:'create',name:'A',vehicle:'ev6'},0),b=await roomRequest(store,{type:'join',name:'B',vehicle:'ev3',code:a.code},1),aa={id:a.yourId,token:a.token,code:a.code},ba={id:b.yourId,token:b.token,code:a.code};await roomRequest(store,{type:'ready',...aa},2);await roomRequest(store,{type:'ready',...ba},3);await roomRequest(store,{type:'start',...aa},4);for(let t=1000;t<=24000;t+=1000)await roomRequest(store,{type:'poll',...ba,seq:t},t);const result=await roomRequest(store,{type:'poll',...ba,seq:26000},26000);assert.equal(result.messages.at(-1).race.cars.find(c=>c.id===aa.id).dnf,true);assert.equal(result.messages.at(-1).race.cars.find(c=>c.id===ba.id).walkover,true);});

