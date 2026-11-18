import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestGet,onRequestPost} from '../functions/api/fm/control.js';
globalThis.crypto ||= webcrypto;
const TOKEN='dj-control-private-test-only-1234567890';
const URL='https://prometei.example/api/fm/control';
const RUN='a'.repeat(32),ID='b'.repeat(24),PLAY='c'.repeat(32);
function fakeStore(){
 const values=new Map();
 return {
   async get(k){return values.get(k)||null;},
   async put(k,v){values.set(k,v);},
   raw:values
 };
}
function post(env,type,body={},token=TOKEN,origin='https://prometei.example'){
 return onRequestPost({env,request:new Request(URL,{
   method:'POST',headers:{'authorization':'Bearer '+token,
   'content-type':'application/json','origin':origin},
   body:JSON.stringify({type,...body})
 })});
}
function get(env,token=TOKEN,poll=false){
 return onRequestGet({env,request:new Request(URL+(poll?'?poll=1':''),
   {headers:{authorization:'Bearer '+token}})});
}
const catalog={runId:RUN,tracks:[{id:ID,title:'The Song',artist:'Artist',durationSec:212}]};
const state={runId:RUN,trackId:ID,playId:PLAY,title:'The Song',
 artist:'Artist',durationSec:212,elapsedSec:35,state:'playing'};
test('Control API is private and requires KV + DJ secret',async()=>{
 assert.equal((await get({})).status,503);
 const env={FM_STATE:fakeStore(),FM_DJ_TOKEN:TOKEN};
 assert.equal((await get(env,'invalid-token-1234567890123456')).status,401);
 assert.equal((await post(env,'status',state,TOKEN,'https://evil.example')).status,403);
 assert.equal((await post(env,'command',{action:'next'})).status,409);
});
test('Catalog, precise playback, skip, seek and selection are transmitted and ACKed',async()=>{
 const env={FM_STATE:fakeStore(),FM_DJ_TOKEN:TOKEN};
 let r=await post(env,'catalog',catalog);
 assert.equal(r.status,200);
 r=await post(env,'status',state);assert.equal(r.status,200);
 let data=await (await get(env)).json();
 assert.equal(data.online,true);
 assert.equal(data.total,1);
 assert.equal(data.tracks[0].title,'The Song');
 assert.equal(data.status.elapsedSec,35);
 r=await post(env,'command',{action:'next'});assert.equal(r.status,200);
 let commandId=(await r.json()).commandId;assert.match(commandId,/^[a-f0-9]{32}$/);
 data=await (await get(env,TOKEN,true)).json();
 assert.equal(data.command.action,'next');
 assert.equal(data.command.id,commandId);
 r=await post(env,'command',{action:'pause'});
 assert.equal(r.status,409,'must not overwrite unacknowledged PC command');
 await post(env,'status',{...state,commandAck:commandId,commandResult:'ok'});
 data=await (await get(env,TOKEN,true)).json();
 assert.equal(data.command,null);
 r=await post(env,'command',{action:'seek',offsetSec:9999});
 assert.equal(r.status,400);
 r=await post(env,'command',{action:'seek',offsetSec:118});
 assert.equal(r.status,200);
 commandId=(await r.json()).commandId;
 data=await (await get(env,TOKEN,true)).json();
 assert.equal(data.command.action,'seek');
 assert.equal(data.command.offsetSec,118);
 await post(env,'status',{...state,elapsedSec:118,commandAck:commandId,commandResult:'ok'});
 r=await post(env,'command',{action:'play',trackId:'d'.repeat(24)});
 assert.equal(r.status,400);
 r=await post(env,'command',{action:'play',trackId:ID});
 assert.equal(r.status,200);
 data=await (await get(env,TOKEN,true)).json();
 assert.equal(data.command.trackId,ID);
});
test('Sanitization and immutable private access protections',async()=>{
 const env={FM_STATE:fakeStore(),FM_DJ_TOKEN:TOKEN};
 let r=await post(env,'catalog',{runId:RUN,tracks:[{id:ID,
   title:'Track',artist:'A',durationSec:180},{id:ID,title:'dup',durationSec:1}]});
 assert.equal(r.status,400);
 r=await post(env,'catalog',{runId:RUN,tracks:[{
   id:ID,title:'<script>alert(1)</script>',artist:'Composer',durationSec:180}]});
 assert.equal(r.status,200);
 r=await post(env,'status',{...state,runId:'broken'});
 assert.equal(r.status,400);
 r=await post(env,'status',{...state,elapsedSec:-1});
 assert.equal(r.status,400);
});
