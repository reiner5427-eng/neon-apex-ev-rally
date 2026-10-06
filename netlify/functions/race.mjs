import {getStore} from '@netlify/blobs';
import {roomRequest} from '../../server/rooms.js';
export default async function(request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return new Response('Origin not permitted',{status:403});
 if(request.method!=='POST')return new Response('Use POST',{status:405});
 const text=await request.text();if(text.length>4096)return new Response('Payload too large',{status:413});
 try{const body=JSON.parse(text);const store=getStore({name:'neon-apex-rooms-v1',consistency:'strong'});const data=await roomRequest(store,body);return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch(e){console.error('Room request:',e.message);return Response.json({messages:[{type:'error',message:/environment|token|fetch|store|blobs/i.test(e.message)?'온라인 서버 저장소 연결에 실패했습니다. 잠시 후 다시 시도하세요.':e.message}]},{status:400,headers:{'Cache-Control':'no-store'}});}
}
