import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {onRequestGet,onRequestPost} from '../functions/api/fm/station.js';

globalThis.crypto ||= webcrypto;
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const DJ_TOKEN='local-testing-example-token-only-123456789';
function fakeStore(){
  const cache=new Map();
  return {async get(k){return cache.get(k)||null;},async put(k,v){cache.set(k,v);}};
}
const base={mode:'youtube', enabled:true, pcStreamUrl:'', playlistId:'PLRBp0Fe2GpgnZOm5rCopMAOYhZCPoUyO5', playlists:[{id:'PLRBp0Fe2GpgnZOm5rCopMAOYhZCPoUyO5',name:'NCS Electronic'}]};

test('SEO and listener controls',()=>{
  const html=read('fm.html'), studio=read('fm-studio.html'), js=read('fm.js'), css=read('fm.css');
  assert.match(html,/<title>PROMETEI FM/);
  assert.match(html,/rel="canonical"/);
  assert.match(html,/id="request-form"/);
  assert.doesNotMatch(html,/id="playlist-form"|id="file-input"|id="next-btn"/);
  assert.match(html,/INSTALL PROMETEI MESSENGER/);
  assert.match(html,/NCS · Electronic/);
  assert.match(studio,/noindex,nofollow/);
  assert.match(studio,/id="dj-token"/);
  assert.match(js,/fetch\('\/api\/fm\/station'/);
  assert.match(css,/@media\(max-width:380px\)/);
  assert.match(read('scripts/build.mjs'),/functions'.*\.includes\(entry\.name\)/);
});
test('auth protects writes; station is read-only for unauthenticated visitors',async()=>{
  const env={FM_DJ_TOKEN:DJ_TOKEN,FM_STATE:fakeStore()};
  const url='https://prometei.example/api/fm/station';
  const req=(token,payload)=>new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',origin:'https://prometei.example'},body:JSON.stringify(payload)});
  let res=await onRequestPost({request:req('wrong-password-not-even-long-enough',base),env});
  assert.equal(res.status,401);
  res=await onRequestPost({request:req(DJ_TOKEN,{...base, mode:'pc', pcStreamUrl:'http://127.0.0.1/live.mp3'}),env});
  assert.equal(res.status,400);
  res=await onRequestPost({request:req(DJ_TOKEN,base),env});
  assert.equal(res.status,200);
  assert.equal((await res.json()).ok,true);
  res=await onRequestGet({env});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.managed,true);
  assert.equal(data.playlists.length,1);
  res=await onRequestGet({env:{}});
  assert.equal(res.status,503);
});
