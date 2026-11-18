import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestGet,onRequestPost} from '../functions/api/fm/history.js';
globalThis.crypto ||= webcrypto;
const TOKEN='test-dj-super-secret-token-xyz-1234567';
const URL='https://prometei.example/api/fm/history';
const HOURS_36=36*3600*1000;
const example={
  type:'start',playId:'a'.repeat(32),
  title:'Example Track',artist:'Composer Name',album:'Album',
  metadataSource:'tag',durationSec:213
};
function store(){
  const entries=new Map();
  return {
    async get(key,kind){const item=entries.get(key);if(!item)return null;return kind==='json'?JSON.parse(item.value):item.value;},
    async put(key,value,opts={}){entries.set(key,{value,metadata:opts.metadata||null});},
    async delete(key){entries.delete(key);},
    async list({prefix,limit=1000,cursor}){
      const all=[...entries.entries()].filter(([k])=>k.startsWith(prefix));
      const offset=cursor?Number(cursor):0;
      const chunk=all.slice(offset,offset+limit);
      return {keys:chunk.map(([name,v])=>({name,metadata:v.metadata})),
        list_complete:offset+limit>=all.length,cursor:String(offset+limit)};
    }
  };
}
const request=(token,payload)=>new Request(URL,{
  method:'POST',
  headers:{
    'authorization':'Bearer '+token,
    'content-type':'application/json',
    'origin':'https://prometei.example'
  },
  body:JSON.stringify(payload)
});
test('no KV returns safe unavailable response',async()=>{
  const res=await onRequestGet({env:{}});
  assert.equal(res.status,503);
  assert.equal((await res.json()).configured,false);
});
test('only signed DJ may add played tracks',async()=>{
  const env={FM_STATE:store(),FM_DJ_TOKEN:TOKEN};
  let res=await onRequestPost({request:request('wrong-password-token-123456789',example),env});
  assert.equal(res.status,401);
  res=await onRequestPost({request:request(TOKEN,{...example,title:'',durationSec:1}),env});
  assert.equal(res.status,400);
  res=await onRequestPost({request:request(TOKEN,{...example,durationSec:99999}),env});
  assert.equal(res.status,400);
  res=await onRequestPost({request:request(TOKEN,example),env});
  assert.equal(res.status,200);
  const event=await res.json();
  assert.equal(event.ok,true);
  res=await onRequestPost({request:request(TOKEN,example),env});
  assert.equal((await res.json()).duplicate,true);
  res=await onRequestGet({env});
  const data=await res.json();
  assert.equal(data.windowHours,36);
  assert.equal(data.live,true);
  assert.equal(data.tracks.length,1);
  assert.equal(data.tracks[0].title,'Example Track');
  assert.equal(data.tracks[0].artist,'Composer Name');
  assert.equal(data.tracks[0].metadataSource,'tag');
  assert.ok(data.tracks[0].startedAt>0);
});
test('history excludes tracks older than 36 hours and keeps current',async()=>{
  const kv=store(),env={FM_STATE:kv,FM_DJ_TOKEN:TOKEN};
  await kv.put('prometei:fm:played:v1:very-old','{}',{
    metadata:{...example,startedAt:Date.now()-HOURS_36-100000}
  });
  await kv.put('prometei:fm:played:v1:recent','{}',{
    metadata:{...example,playId:'b'.repeat(32),title:'Recent Track',startedAt:Date.now()-2000}
  });
  const res=await onRequestGet({env});
  const data=await res.json();
  assert.equal(data.tracks.length,1);
  assert.equal(data.tracks[0].title,'Recent Track');
});
test('heartbeat requires prior broadcast track and offline clears live',async()=>{
  const env={FM_STATE:store(),FM_DJ_TOKEN:TOKEN};
  let res=await onRequestPost({request:request(TOKEN,{type:'heartbeat',playId:'c'.repeat(32)}),env});
  assert.equal(res.status,409);
  await onRequestPost({request:request(TOKEN,example),env});
  res=await onRequestPost({request:request(TOKEN,{type:'heartbeat',playId:example.playId}),env});
  assert.equal(res.status,200);
  res=await onRequestPost({request:request(TOKEN,{type:'offline'}),env});
  assert.equal(res.status,200);
  res=await onRequestGet({env});
  const data=await res.json();
  assert.equal(data.live,false);
  assert.equal(data.tracks.length,1);
});
