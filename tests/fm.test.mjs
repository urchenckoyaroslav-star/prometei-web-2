import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
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
  assert.match(html,/id="support"/);
  assert.match(html,/id="donate-qr-tron"/);
  assert.match(html,/id="donate-qr-bsc"/);
  assert.match(html,/data-copy-donation="tron-trc20"/);
  assert.match(html,/data-copy-donation="bsc-bep20"/);
  const config=JSON.parse(read('fm-donations.json'));
  assert.equal(config.enabled,true);
  assert.equal(config.version,2);
  assert.equal(config.asset,'USDT');
  assert.equal(config.ownerProvided,true);
  assert.deepEqual(config.networks.map(n=>n.id),['tron-trc20','bsc-bep20']);
  assert.equal(config.networks[0].address,'TMGRFJKH851fjYZB6RmJSXKhsnDBq5gkGr');
  assert.equal(config.networks[1].address,'0x5a289561bf0bbd6b6748d8dcda2e37ef8d6d120a');
  for(const network of config.networks){
    assert.equal(network.address,network.qrPayload,'QR must encode exactly the displayed address');
    assert.ok(html.includes(network.address),'address must be visible in static HTML');
  }
  const qrSource=read('fm-donate.js');
  const matrices=[...qrSource.matchAll(/qrRows: '([0-9a-f:]+)'/g)].map(m=>m[1]);
  assert.equal(matrices.length,2,'both networks must have actual embedded QR matrices');
  const fixtureDigests=[
    'f9a58fb064067a5557e15b4055db1f1750e1928730d0c2d8f5dbbbf55aff152d',
    '9ae44777e4b55e098aed67bf508beedb03454cab2109e4358a7ef59b7b3d7e66'
  ];
  for(let i=0;i<2;i++){
    const rows=matrices[i].split(':');
    assert.equal(rows.length,41);
    assert.ok(rows.every(r=>/^[0-9a-f]{11}$/.test(r)));
    assert.equal(createHash('sha256').update(matrices[i]).digest('hex'),fixtureDigests[i],
      'QR matrix changed independently of the owner-supplied address');
  }
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
  res=await onRequestPost({request:req(DJ_TOKEN,{...base,mode:'youtube_live',liveVideoId:'short'}),env});
  assert.equal(res.status,400);
  res=await onRequestPost({request:req(DJ_TOKEN,{...base,mode:'youtube_live',liveVideoId:'abcdefghijk'}),env});
  assert.equal(res.status,200);
  res=await onRequestGet({env:{}});
  assert.equal(res.status,503);
});
