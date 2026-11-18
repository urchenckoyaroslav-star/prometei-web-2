/* PROMETEI FM / station-wide history
 * GET: true public station play events for the last 36 hours.
 * POST: DJ only, bearer FM_DJ_TOKEN, verified by Cloudflare Pages.
 * Storage: existing FM_STATE KV binding; one TTL key per broadcast track.
 * KV list(metadata) avoids missing history from a single overwritten shared index.
 */
const PREFIX='prometei:fm:played:v1:';
const NOW='prometei:fm:onair:v1';
const WINDOW_MS=36*60*60*1000;
const TTL_SECONDS=36*60*60+180;
const ACTIVE_TTL=120;
const MAX_EVENTS=2200;
const headers={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, max-age=0',
  'x-content-type-options':'nosniff',
  'x-robots-tag':'noindex'
};
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
const clean=(v,n=160)=>typeof v==='string'?
  v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
const playIdValid=id=>typeof id==='string'&&/^[a-f0-9]{32}$/i.test(id);
async function authorized(request,env){
  const value=String(env.FM_DJ_TOKEN||'');
  const match=/^Bearer ([A-Za-z0-9._~-]{24,256})$/.exec(request.headers.get('authorization')||'');
  if(!match||value.length<24)return false;
  const enc=new TextEncoder();
  const [a,b]=await Promise.all([match[1],value].map(v=>crypto.subtle.digest('SHA-256',enc.encode(v))));
  const x=new Uint8Array(a),y=new Uint8Array(b);
  let diff=0;
  for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
  return diff===0;
}
function extractEvent(payload,serverTimestamp){
  const playId=payload.playId;
  const title=clean(payload.title,180);
  const artist=clean(payload.artist,140);
  const album=clean(payload.album,120);
  const durationSec=Number(payload.durationSec);
  const metadataSource=['tag','sidecar','override','filename'].includes(payload.metadataSource)?
    payload.metadataSource:'unknown';
  if(!playIdValid(playId)||!title||!(durationSec>=1&&durationSec<=14400)){
    return null;
  }
  return {
    playId,title,artist,album,
    durationSec:Math.round(durationSec),
    metadataSource,
    source:'pc',
    startedAt:serverTimestamp
  };
}
export async function onRequestGet({env}){
  if(!env.FM_STATE)return response({configured:false,windowHours:36,tracks:[],live:false},503);
  const now=Date.now();
  const from=now-WINDOW_MS;
  let cursor;
  const items=[];
  try{
    for(let i=0;i<4;i++){
      const result=await env.FM_STATE.list({
        prefix:PREFIX,limit:1000,...(cursor?{cursor}:{})
      });
      for(const item of result.keys||[]){
        const e=item.metadata;
        if(e && Number.isFinite(e.startedAt) && e.startedAt>=from &&
            e.startedAt<=now+30000 && clean(e.title,180)){
          items.push({
            playId:clean(e.playId,32),
            title:clean(e.title,180),
            artist:clean(e.artist,140),
            album:clean(e.album,120),
            durationSec:Number(e.durationSec)||0,
            metadataSource:clean(e.metadataSource,20),
            source:'pc',
            startedAt:e.startedAt
          });
        }
      }
      if(result.list_complete||!result.cursor||items.length>=MAX_EVENTS)break;
      cursor=result.cursor;
    }
    items.sort((a,b)=>b.startedAt-a.startedAt);
    const current=await env.FM_STATE.get(NOW,'json');
    const active=!!(current && current.at>=now-110000 && playIdValid(current.playId));
    return response({
      configured:true,
      windowHours:36,
      tracks:items.slice(0,MAX_EVENTS),
      count:Math.min(items.length,MAX_EVENTS),
      live:active,
      current:active?{
        playId:clean(current.playId,32),title:clean(current.title,180),
        artist:clean(current.artist,140),album:clean(current.album,120),
        startedAt:current.startedAt
      }:null,
      updatedAt:now
    });
  }catch(_){return response({error:'History service temporarily unavailable'},503);}
}
export async function onRequestPost({request,env}){
  if(!env.FM_STATE||!env.FM_DJ_TOKEN)return response({error:'DJ history storage not configured'},503);
  if(!(await authorized(request,env)))return response({error:'DJ authorization failed'},401);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin action blocked'},403);
  const len=Number(request.headers.get('content-length')||0);
  if(len>4096)return response({error:'Payload too large'},413);
  let payload;
  try{payload=await request.json();}catch(_){return response({error:'Invalid JSON'},400);}
  if(!payload||typeof payload!=='object'||Array.isArray(payload))
    return response({error:'Invalid payload'},400);
  const now=Date.now();
  const type=payload.type;
  try{
    if(type==='offline'){
      await env.FM_STATE.delete(NOW);
      return response({ok:true,live:false});
    }
    if(type==='start'){
      // Backfill keeps the broadcaster's real clock time. Never turn an old
      // or malformed replay into a new "now playing" event.
      const suppliedStart=Object.prototype.hasOwnProperty.call(payload,'startedAt')?
        Number(payload.startedAt):now;
      if(!Number.isSafeInteger(suppliedStart) || suppliedStart>now+30000 ||
          suppliedStart<now-WINDOW_MS){
        return response({error:'Track timestamp is outside the last 36 hours'},400);
      }
      const event=extractEvent(payload,suppliedStart);
      if(!event)return response({error:'Invalid track metadata or playId'},400);
      const key=PREFIX+event.playId;
      const existing=await env.FM_STATE.get(key,'json');
      if(existing)return response({ok:true,duplicate:true});
      await env.FM_STATE.put(key,JSON.stringify(event),{
        expirationTtl:Math.max(60,TTL_SECONDS-Math.floor((now-event.startedAt)/1000)),
        metadata:event
      });
      // Replaying an older, successfully aired song fills the public log but
      // must not resurrect it as currently broadcasting.
      if(now-event.startedAt<=90000){
        const previous=await env.FM_STATE.get(NOW,'json');
        if(!previous || !Number.isFinite(previous.startedAt) ||
            previous.startedAt<=event.startedAt){
          await env.FM_STATE.put(NOW,JSON.stringify({...event,at:now}),{
            expirationTtl:ACTIVE_TTL
          });
        }
      }
      return response({ok:true,startedAt:event.startedAt});
    }
    if(type==='heartbeat'){
      if(!playIdValid(payload.playId))return response({error:'Invalid playId'},400);
      const key=PREFIX+payload.playId;
      const event=await env.FM_STATE.get(key,'json');
      if(!event)return response({error:'Track has not been registered'},409);
      await env.FM_STATE.put(NOW,JSON.stringify({...event,at:now}),{
        expirationTtl:ACTIVE_TTL
      });
      return response({ok:true,live:true});
    }
    return response({error:'Unknown history event'},400);
  }catch(_){return response({error:'Could not update station history'},503);}
}
