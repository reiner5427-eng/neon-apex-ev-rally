import {getStore} from '@netlify/blobs';
export default async function(){const store=getStore({name:'neon-apex-rooms-v1',consistency:'strong'});const {blobs}=await store.list({prefix:'rooms/'});let count=0;for(const {key} of blobs.slice(0,500)){const item=await store.getWithMetadata(key,{type:'json',consistency:'strong'});if(item&&item.data.expires<Date.now()){await store.delete(key);count++;}}return Response.json({removed:count});}
export const config={schedule:'@hourly'};
