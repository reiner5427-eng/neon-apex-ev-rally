export class HttpSocket{
 constructor(url){this.url=url;this.readyState=0;this.keys={};this.queue=[];this.seq=0;this.closed=false;this.epoch=0;this.failures=0;this.generation=null;this.request({type:'health'}).then(data=>{if(this.closed)return;this.readyState=1;this.onmessage?.({data:JSON.stringify({type:'hello',id:'pending',protocol:1})});this.timer=setTimeout(()=>this.tick(),100);}).catch(()=>this.onerror?.());}
 async request(body){const sentAt=Date.now(),response=await fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!response.ok&&response.status!==400)throw new Error(`HTTP ${response.status}`);const data=await response.json();data.roundtrip=Date.now()-sentAt;return data;}
 emit(m){this.onmessage?.({data:JSON.stringify(m)});}
 send(raw){const m=JSON.parse(raw);if(m.type==='input'){this.keys=m.keys||{};return;}if(m.type==='ping'){this.emit({type:'pong',clientNow:m.clientNow,serverNow:Date.now()});return;}this.queue.push(m);}
 async tick(){if(this.closed)return;let m=this.queue.shift();if(!m&&this.code)m={type:'poll',keys:this.keys,seq:++this.seq};if(!m){this.timer=setTimeout(()=>this.tick(),150);return;}const epoch=this.epoch;
  try{const data=await this.request({...m,code:m.code||this.code,id:this.id,token:this.token});if(this.closed||epoch!==this.epoch)return;if(data.retry){this.queue.unshift(m);this.timer=setTimeout(()=>this.tick(),80+Math.random()*100);return;}this.failures=0;
    if(data.token){this.id=data.yourId;this.token=data.token;this.code=data.code;this.emit({type:'hello',id:this.id,protocol:1});}
    for(const msg of data.messages||[]){if(msg.type==='room'){const signature=JSON.stringify(msg);if(signature===this.lastRoom)continue;this.lastRoom=signature;}
      if(msg.type==='left'){this.code=null;this.token=null;this.id=null;this.generation=null;this.keys={};this.lastRoom=null;}
      if(msg.type==='startOrState'){if(this.generation!==msg.startAt){this.generation=msg.startAt;this.emit({...msg,type:'start',serverNow:msg.serverNow+data.roundtrip/2});}else this.emit({...msg,type:'state'});}
      else this.emit(msg);
    }
  }catch(e){if(++this.failures>=5){this.close();this.onclose?.();return;}}
  if(!this.closed)this.timer=setTimeout(()=>this.tick(),this.code?180:250);
 }
 close(){this.closed=true;this.readyState=3;this.epoch++;clearTimeout(this.timer);if(this.code&&this.token){navigator.sendBeacon?.(this.url,new Blob([JSON.stringify({type:'leave',code:this.code,id:this.id,token:this.token})],{type:'application/json'}));}this.code=null;}
}
