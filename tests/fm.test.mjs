import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {onRequestGet,onRequestPost,determinePcFallback,probePcStream} from '../functions/api/fm/station.js';

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
  assert.match(html,/PROMETEI FM · YouTube backup/);
  assert.doesNotMatch(html,/NCS · Electronic|NCS · House|NCS · Full selection/);
  const staticFallback=JSON.parse(read('fm-config.json'));
  assert.equal(staticFallback.mode,'youtube');
  assert.equal(staticFallback.playlistId,'PLFS8aAbOL3x5wZaXGyuSy9Hl-LLI_KhUX');
  assert.deepEqual(staticFallback.playlists.map(p=>p.id),['PLFS8aAbOL3x5wZaXGyuSy9Hl-LLI_KhUX']);
  assert.match(studio,/noindex,nofollow/);
  assert.match(studio,/id="dj-token"/);
  assert.match(js,/fetch\('\/api\/fm\/station'/);
  assert.ok(html.includes('fm-pc-websocket.js'));
  assert.match(js,/trycloudflare/);
  assert.match(js,/previewStream/);
  assert.match(read('fm-pc-websocket.js'),/new WebSocket/);
  assert.match(read('fm-pc-websocket.js'),/MediaSource/);
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


test('PC watchdog switches to the owner backup playlist only after 20 minutes without DJ signal',async()=>{
  const now=Date.now(),min=60*1000;
  const playing={mode:'pc',enabled:true,updatedAt:now-21*min,
    pcStreamUrl:'https://radio.example/live.mp3'};
  assert.equal(determinePcFallback(playing,null,now),true,
    'PC went silent >20 minutes ago');
  assert.equal(determinePcFallback({...playing,updatedAt:now-19*min},null,now),false,
    'grace period must be a full 20 minutes');
  assert.equal(determinePcFallback(playing,{at:now-2*min},now),false,
    'recent heartbeat overrides old station configuration');
  assert.equal(determinePcFallback(playing,{at:now-21*min},now),true);
  assert.equal(determinePcFallback({...playing,enabled:false},null,now),false,
    'manual OFF AIR must remain off air');
  assert.equal(determinePcFallback({...playing,mode:'youtube'},null,now),false,
    'operator Youtube choice must not be hijacked');

  const kv=fakeStore(), env={FM_STATE:kv,FM_DJ_TOKEN:DJ_TOKEN};
  await kv.put('prometei:fm:station:v1',JSON.stringify({
    ...playing, playlists:[{id:'PLRBp0Fe2GpgnZOm5rCopMAOYhZCPoUyO5',name:'Original list'}],
    playlistId:'PLRBp0Fe2GpgnZOm5rCopMAOYhZCPoUyO5'
  }));
  let res=await onRequestGet({env});
  let data=await res.json();
  assert.equal(data.mode,'pc','operator-saved PC mode must remain untouched');
  assert.equal(data.fallbackActive,true);
  assert.equal(data.fallbackAfterMinutes,20);
  assert.equal(data.fallbackPlaylistId,'PLFS8aAbOL3x5wZaXGyuSy9Hl-LLI_KhUX');
  await kv.put('prometei:fm:onair:v1',JSON.stringify({
    playId:'a'.repeat(32), at:Date.now(), startedAt:Date.now()-180000
  }));
  res=await onRequestGet({env});
  data=await res.json();
  assert.equal(data.fallbackActive,false,'PC signal restoration automatically cancels backup');
  assert.equal(data.mode,'pc');
  // Simulate a STOP event 19m ago, not a deletion of the timestamp.
  await kv.put('prometei:fm:onair:v1',JSON.stringify({offline:true,at:Date.now()-19*min}));
  res=await onRequestGet({env});
  assert.equal((await res.json()).fallbackActive,false);
  await kv.put('prometei:fm:onair:v1',JSON.stringify({offline:true,at:Date.now()-21*min}));
  res=await onRequestGet({env});
  assert.equal((await res.json()).fallbackActive,true);
});

test('listener presents official YouTube as backup without erasing the PC play log',()=>{
  const js=read('fm.js');
  assert.match(js,/PC_BACKUP_PLAYLIST_ID = 'PLFS8aAbOL3x5wZaXGyuSy9Hl-LLI_KhUX'/);
  assert.match(js,/state\.config\.fallbackActive/);
  assert.match(js,/backupActive\?'youtube'/);
  assert.match(js,/previousListening/);
  assert.match(js,/startYoutube\(\)/);
  assert.match(js,/loadPlaylist/);
  assert.match(js,/setInterval\(loadConfig, 20000\)/);
  assert.match(js,/globalMode=\(\)=>state\.config/);
  assert.match(read('fm.html'),/20 minutes/);
});

test('public owner-PC audio health is verifiable without a DJ secret and never probes arbitrary hosts',async()=>{
  const now=Date.now(),stream='https://national-sitemap-panel-presented.trycloudflare.com/live.mp3';
  let called='';
  const healthy=(url)=>{
    called=url;
    return Promise.resolve({ok:true,text:async()=>JSON.stringify({
      onAir:true,audioFresh:true,lastAudioAt:now-1500,
      current:{playId:'a'.repeat(32),title:'Owner track'}
    })});
  };
  assert.equal(await probePcStream(stream,now,healthy),true);
  assert.equal(called,'https://national-sitemap-panel-presented.trycloudflare.com/status.json');
  called='';
  assert.equal(await probePcStream('https://example.com/live.mp3',now,healthy),false);
  assert.equal(called,'','unrelated domains must never be fetched');
  assert.equal(await probePcStream('https://local.trycloudflare.com/other.mp3',now,healthy),false);
  assert.equal(called,'','wrong stream path must never be fetched');
  const stale=async()=>({ok:true,text:async()=>JSON.stringify({
    onAir:true,audioFresh:true,lastAudioAt:now-100000,
    current:{playId:'a'.repeat(32)}
  })});
  assert.equal(await probePcStream(stream,now,stale),false,'stale audio is not an active stream');
});

test('public PC health prevents fallback even without a DJ history token',async()=>{
  const now=Date.now(),stream='https://owner-pc.trycloudflare.com/live.mp3';
  const kv=fakeStore(),env={FM_STATE:kv};
  await kv.put('prometei:fm:station:v1',JSON.stringify({
    version:4,mode:'pc',enabled:true,pcStreamUrl:stream,updatedAt:now-30*60*1000,
    playlists:[{id:'PLFS8aAbOL3x5wZaXGyuSy9Hl-LLI_KhUX',name:'Owner playlist'}]
  }));
  const original=globalThis.fetch;
  let attempts=0;
  try{
    globalThis.fetch=async(url)=>{
      attempts++;
      assert.equal(url,'https://owner-pc.trycloudflare.com/status.json');
      return {ok:true,text:async()=>JSON.stringify({
        onAir:true,audioFresh:true,lastAudioAt:Date.now()-1000,
        current:{playId:'a'.repeat(32)}
      })};
    };
    let response=await onRequestGet({env});
    let data=await response.json();
    assert.equal(data.mode,'pc');
    assert.equal(data.fallbackActive,false);
    assert.equal(attempts,1);
    const saved=JSON.parse(await kv.get('prometei:fm:pc-verified:v1'));
    assert.equal(saved.stream,stream);
    assert.ok(Date.now()-saved.at<5000);
    // Same recent probe should be reused, avoiding repeated external requests.
    response=await onRequestGet({env});
    data=await response.json();
    assert.equal(data.fallbackActive,false);
    assert.equal(attempts,1);
  }finally{
    globalThis.fetch=original;
  }
});
