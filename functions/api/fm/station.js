/* PROMETEI FM station API — Cloudflare Pages Functions.
   Cloudflare dashboard: KV binding FM_STATE; secret FM_DJ_TOKEN.
   Server-side authorization only. No credentials embedded in client assets.
   KV is eventually consistent; station changes may propagate with delay.
*/
const KEY = 'prometei:fm:station:v1';
const reply = (data, status=200) => new Response(JSON.stringify(data), {
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, max-age=0',
    'x-content-type-options':'nosniff',
    'x-robots-tag':'noindex'
  }
});
function idOkay(v) { return typeof v==='string' && /^[A-Za-z0-9_-]{10,120}$/.test(v); }
function clean(v, n=150) { return typeof v==='string' ? v.trim().slice(0,n) : ''; }
function streamOkay(v) {
  if (v==='') return true;
  if (typeof v!=='string' || v.length>500) return false;
  try {
    const u=new URL(v);
    if (u.protocol!=='https:' || u.username || u.password || u.hash) return false;
    const h=u.hostname.toLowerCase();
    if (h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||h==='127.0.0.1'||h==='[::1]') return false;
    if (/^(?:10|127|169\.254|192\.168)\./.test(h)) return false;
    return true;
  } catch (_) {return false;}
}
async function equalToken(a,b) {
  if (!a || !b) return false;
  const bytes=new TextEncoder();
  const [one,two]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',bytes.encode(v))));
  const x=new Uint8Array(one), y=new Uint8Array(two);
  let mismatch=0;
  for(let i=0;i<x.length;i++) mismatch |= x[i]^y[i];
  return mismatch===0;
}
export async function onRequestGet({env}) {
  if (!env.FM_STATE) return reply({error:'Station control storage not configured'},503);
  try {
    const content=await env.FM_STATE.get(KEY);
    if(!content) return reply({configured:false},404);
    const state=JSON.parse(content);
    return reply({...state, managed:true});
  } catch(_) {return reply({error:'Station control temporarily unavailable'},503);}
}
export async function onRequestPost({request,env}) {
  if (!env.FM_STATE || !env.FM_DJ_TOKEN || String(env.FM_DJ_TOKEN).length<24)
    return reply({error:'Admin control is not configured on Cloudflare'},503);
  const match=/^Bearer ([A-Za-z0-9._~-]{24,256})$/.exec(request.headers.get('authorization')||'');
  if (!match || !(await equalToken(match[1],env.FM_DJ_TOKEN)))
    return reply({error:'DJ authorization failed'},401);
  const origin=request.headers.get('origin');
  if (origin && origin!==new URL(request.url).origin)
    return reply({error:'Cross-origin write blocked'},403);
  if (Number(request.headers.get('content-length')||0)>16384)
    return reply({error:'Request too large'},413);
  let data;
  try{data=await request.json();}catch(_){return reply({error:'Invalid JSON'},400);}
  if(!data||typeof data!=='object'||Array.isArray(data))return reply({error:'Invalid payload'},400);
  const playlists=Array.isArray(data.playlists)?data.playlists:[];
  if(playlists.length>24)return reply({error:'Maximum 24 playlists'},400);
  const seen=new Set();
  const selected=[];
  for(const p of playlists) {
    if(!p||!idOkay(p.id)||!clean(p.name,70))return reply({error:'Invalid playlist'},400);
    if(seen.has(p.id))continue;
    selected.push({id:p.id,name:clean(p.name,70)});seen.add(p.id);
  }
  const mode=data.mode==='pc'?'pc':data.mode==='youtube'?'youtube':null;
  if(!mode)return reply({error:'Choose YouTube or PC stream'},400);
  const enabled=data.enabled===true;
  const pcStreamUrl=clean(data.pcStreamUrl,501);
  if(!streamOkay(pcStreamUrl))return reply({error:'Stream URL must be valid HTTPS without credentials'},400);
  if(mode==='pc' && enabled && !pcStreamUrl)
    return reply({error:'An HTTPS stream URL is required before going on air from PC'},400);
  const playlistId=clean(data.playlistId,120);
  if(playlistId && !seen.has(playlistId))return reply({error:'Selected playlist is not in the station collection'},400);
  if(mode==='youtube' && enabled && selected.length===0)
    return reply({error:'Add at least one playlist'},400);
  const state={version:3,enabled,mode,playlistId,pcStreamUrl,playlists:selected,updatedAt:Date.now()};
  try {
    await env.FM_STATE.put(KEY,JSON.stringify(state));
    return reply({ok:true,state});
  } catch(_) {return reply({error:'Cannot save station settings'},503);}
}
