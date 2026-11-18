/* PROMETEI FM station API — Cloudflare Pages Functions.
   Cloudflare dashboard: KV binding FM_STATE; secret FM_DJ_TOKEN.
   Server-side authorization only. No credentials embedded in client assets.
   KV is eventually consistent; station changes may propagate with delay.
*/
const KEY = 'prometei:fm:station:v1';
// Last owner-PC DJ signal is retained by the history API for longer than the
// live indicator, permitting a deterministic station-wide 20-minute fallback.
const SIGNAL_KEY = 'prometei:fm:onair:v1';
const PC_VERIFIED_KEY = 'prometei:fm:pc-verified:v1';
const PC_HEALTH_TTL_SECONDS = 30*60;
const PC_HEALTH_RECHECK_MS = 25000;
// Only the public PC preview tunnel may be health-probed. Do not fetch URLs
// submitted by visitors or arbitrary hosts (SSRF prevention).
const TEMP_PC_STREAM = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/live\.mp3$/;

export async function probePcStream(streamUrl, now=Date.now(), fetcher=fetch) {
  if(typeof streamUrl!=='string'||!TEMP_PC_STREAM.test(streamUrl))return false;
  const statusUrl=new URL('/status.json',streamUrl).href;
  try {
    const response=await fetcher(statusUrl,{
      method:'GET',headers:{'accept':'application/json','cache-control':'no-cache'},
      signal:AbortSignal.timeout(3000)
    });
    if(!response.ok)return false;
    const body=await response.text();
    if(body.length>4096)return false;
    const status=JSON.parse(body);
    const audioAt=Number(status?.lastAudioAt);
    return status?.onAir===true && status?.audioFresh===true &&
      Number.isSafeInteger(audioAt) && audioAt>=now-60000 && audioAt<=now+30000 &&
      /^[a-f0-9]{32}$/i.test(status?.current?.playId||'');
  }catch(_){return false;}
}
const PC_FALLBACK_DELAY_MS = 20 * 60 * 1000;
const PC_FALLBACK_PLAYLIST_ID = 'PLFS8aAbOL3x5wZaXGyuSy9Hl-LLI_KhUX';

export function determinePcFallback(state, signal, now=Date.now()) {
  if (!state || state.enabled !== true || state.mode !== 'pc') return false;
  const configuredAt = Number(state.updatedAt);
  const lastSignalAt = Number(signal?.at);
  // A malicious/malformed or very old timestamp must not be treated as live.
  const configClock = Number.isSafeInteger(configuredAt) &&
    configuredAt > 0 && configuredAt <= now + 30000 ? configuredAt : 0;
  const liveClock = Number.isSafeInteger(lastSignalAt) &&
    lastSignalAt > 0 && lastSignalAt <= now + 30000 ? lastSignalAt : 0;
  const anchor = Math.max(configClock, liveClock);
  return anchor > 0 && now - anchor >= PC_FALLBACK_DELAY_MS;
}
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
    let lastSignal=null;
    if (state.enabled === true && state.mode === 'pc') {
      const [encodedSignal,encodedVerified]=await Promise.all([
        env.FM_STATE.get(SIGNAL_KEY), env.FM_STATE.get(PC_VERIFIED_KEY)
      ]);
      if (encodedSignal) {
        try { lastSignal=JSON.parse(encodedSignal); } catch (_) { /* malformed signal */ }
      }
      let verified=null;
      if(encodedVerified) {
        try { verified=JSON.parse(encodedVerified); } catch (_) { /* malformed probe record */ }
      }
      const now=Date.now();
      const lastVerifiedAt=verified?.stream===state.pcStreamUrl &&
        Number.isSafeInteger(verified?.at) && verified.at<=now+30000 ?
        verified.at:0;
      // A healthy public stream is sufficient to keep the owner-PC primary,
      // even before a separate DJ history token is configured. Probing only
      // the exact trycloudflare.com status endpoint prevents unsafe fetches.
      if(TEMP_PC_STREAM.test(state.pcStreamUrl||'') &&
         now-lastVerifiedAt>=PC_HEALTH_RECHECK_MS &&
         await probePcStream(state.pcStreamUrl,now)){
        const observed={at:now,stream:state.pcStreamUrl};
        try {
          await env.FM_STATE.put(PC_VERIFIED_KEY,JSON.stringify(observed),{
            expirationTtl:PC_HEALTH_TTL_SECONDS
          });
        }catch(_){ /* a fresh valid probe still confirms PC health now */ }
        verified=observed;
      }
      // A stale verified timestamp from a different tunnel is not trusted.
      const goodAt=verified?.stream===state.pcStreamUrl &&
        Number.isSafeInteger(verified?.at) && verified.at<=now+30000 ?
        verified.at:0;
      if(goodAt>Number(lastSignal?.at||0))lastSignal={at:goodAt};
    }
    const fallbackActive=determinePcFallback(state,lastSignal);
    return reply({...state, managed:true, fallbackActive,
      fallbackAfterMinutes:20, fallbackPlaylistId:PC_FALLBACK_PLAYLIST_ID});
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
  const mode=['pc','youtube','youtube_live'].includes(data.mode)?data.mode:null;
  if(!mode)return reply({error:'Choose playlist, YouTube Live or PC stream'},400);
  const enabled=data.enabled===true;
  const pcStreamUrl=clean(data.pcStreamUrl,501);
  const liveVideoId=clean(data.liveVideoId,30);
  if(!streamOkay(pcStreamUrl))return reply({error:'Stream URL must be valid HTTPS without credentials'},400);
  if(liveVideoId && !/^[A-Za-z0-9_-]{11}$/.test(liveVideoId))return reply({error:'YouTube Live ID must be 11 characters'},400);
  if(mode==='youtube_live' && enabled && !liveVideoId)return reply({error:'YouTube Live ID is required'},400);
  if(mode==='pc' && enabled && !pcStreamUrl)
    return reply({error:'An HTTPS stream URL is required before going on air from PC'},400);
  const playlistId=clean(data.playlistId,120);
  if(playlistId && !seen.has(playlistId))return reply({error:'Selected playlist is not in the station collection'},400);
  if(mode==='youtube' && enabled && selected.length===0)
    return reply({error:'Add at least one playlist'},400);
  const state={version:4,enabled,mode,playlistId,pcStreamUrl,liveVideoId,playlists:selected,updatedAt:Date.now()};
  try {
    await env.FM_STATE.put(KEY,JSON.stringify(state));
    return reply({ok:true,state});
  } catch(_) {return reply({error:'Cannot save station settings'},503);}
}
