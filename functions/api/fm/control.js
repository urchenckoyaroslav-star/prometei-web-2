/* PROMETEI FM private owner remote DJ bridge.
 * Only Cloudflare-held FM_DJ_TOKEN authorizes catalog, telemetry or commands.
 * The public radio API never exposes the local music catalog or filesystem paths.
 * KV is eventually consistent: controls show "queued" until the PC confirms.
 */
const PREFIX='prometei:fm:control:v1:';
const CATALOG=PREFIX+'catalog', STATUS=PREFIX+'status', COMMAND=PREFIX+'command';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','x-robots-tag':'noindex'
}});
const clean=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const hex24=v=>typeof v==='string'&&/^[a-f0-9]{24}$/.test(v);
const hex32=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
async function authorized(request,env){
  const secret=String(env.FM_DJ_TOKEN||'');
  const token=/^Bearer ([A-Za-z0-9._~-]{24,256})$/.exec(request.headers.get('authorization')||'');
  if(!env.FM_STATE||secret.length<24||!token)return false;
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([token[1],secret].map(x=>crypto.subtle.digest('SHA-256',encoder.encode(x))));
  const x=new Uint8Array(a),y=new Uint8Array(b);
  let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
  return diff===0;
}
const runtimeAge=(s,now)=>s&&Number.isSafeInteger(s.updatedAt)?now-s.updatedAt:Infinity;
async function storage(env,key){
  try{return JSON.parse(await env.FM_STATE.get(key)||'null');}
  catch(_){return null;}
}
export async function onRequestGet({request,env}){
  if(!env.FM_STATE||String(env.FM_DJ_TOKEN||'').length<24)
    return reply({error:'Private DJ control is not configured'},503);
  if(!await authorized(request,env))return reply({error:'DJ authorization failed'},401);
  try{
    const poll=new URL(request.url).searchParams.get('poll')==='1';
    const now=Date.now();
    const [status,command]=await Promise.all([storage(env,STATUS),storage(env,COMMAND)]);
    const online=runtimeAge(status,now)>=0&&runtimeAge(status,now)<45000;
    const pending=online&&command&&command.runId===status.runId&&
      command.id!==status.commandAck&&command.at>now-90000&&command.at<=now+30000?command:null;
    if(poll)return reply({online,command:pending,status:online?status:null,serverAt:now});
    const catalog=await storage(env,CATALOG);
    const tracks=catalog&&Array.isArray(catalog.tracks)?catalog.tracks:[];
    const sameCatalog=online&&catalog?.runId===status.runId;
    return reply({configured:true,online,status:online?status:null,
      tracks:sameCatalog?tracks:[],total:sameCatalog?tracks.length:0,
      pending:pending?{id:pending.id,action:pending.action,at:pending.at}:null,
      serverAt:now});
  }catch(_){return reply({error:'DJ control storage unavailable'},503);}
}
export async function onRequestPost({request,env}){
  if(!env.FM_STATE||String(env.FM_DJ_TOKEN||'').length<24)
    return reply({error:'Private DJ control is not configured'},503);
  if(!await authorized(request,env))return reply({error:'DJ authorization failed'},401);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return reply({error:'Cross-origin control blocked'},403);
  if(Number(request.headers.get('content-length')||0)>450000)
    return reply({error:'Control payload too large'},413);
  let data;
  try{data=await request.json();}catch(_){return reply({error:'Invalid JSON'},400);}
  if(!data||typeof data!=='object'||Array.isArray(data))return reply({error:'Invalid payload'},400);
  const now=Date.now(),type=data.type;
  try{
    if(type==='catalog'){
      if(!hex32(data.runId)||!Array.isArray(data.tracks)||data.tracks.length>2500)
        return reply({error:'Invalid catalog'},400);
      const seen=new Set(),tracks=[];
      for(const value of data.tracks){
        if(!value||!hex24(value.id)||seen.has(value.id))return reply({error:'Invalid track ID'},400);
        const title=clean(value.title,180),artist=clean(value.artist,140);
        const durationSec=Number(value.durationSec);
        if(!title||!Number.isFinite(durationSec)||durationSec<0||durationSec>14400)
          return reply({error:'Invalid catalog metadata'},400);
        seen.add(value.id);tracks.push({id:value.id,title,artist,durationSec:Math.round(durationSec)});
      }
      await env.FM_STATE.put(CATALOG,JSON.stringify({runId:data.runId,tracks,updatedAt:now}),
        {expirationTtl:36*3600});
      return reply({ok:true,total:tracks.length});
    }
    if(type==='status'){
      if(!hex32(data.runId))return reply({error:'Invalid PC session'},400);
      const position=Number(data.elapsedSec),duration=Number(data.durationSec);
      if(!Number.isFinite(position)||position<0||position>14400||
         !Number.isFinite(duration)||duration<0||duration>14400)
        return reply({error:'Invalid playback position'},400);
      if(data.trackId&&!hex24(data.trackId))return reply({error:'Invalid track ID'},400);
      if(data.playId&&!hex32(data.playId))return reply({error:'Invalid play ID'},400);
      if(data.commandAck&&!hex32(data.commandAck))return reply({error:'Invalid command acknowledgment'},400);
      const state=['playing','paused','idle'].includes(data.state)?data.state:'idle';
      const status={runId:data.runId,trackId:data.trackId||'',playId:data.playId||'',
        title:clean(data.title,180),artist:clean(data.artist,140),
        durationSec:Math.round(duration),elapsedSec:Math.round(position*10)/10,
        state,commandAck:data.commandAck||'',commandResult:clean(data.commandResult,90),
        updatedAt:now};
      // Allow a newer sender instance to replace stale telemetry; a matching
      // runId must be supplied by remote commands, so restarts reject old commands.
      await env.FM_STATE.put(STATUS,JSON.stringify(status),{expirationTtl:180});
      return reply({ok:true,serverAt:now});
    }
    if(type==='command'){
      const status=await storage(env,STATUS);
      if(!(runtimeAge(status,now)>=0&&runtimeAge(status,now)<45000))
        return reply({error:'PC music engine is offline'},409);
      const action=clean(data.action,16);
      if(!['next','previous','play','seek','pause','resume'].includes(action))
        return reply({error:'Unknown DJ command'},400);
      const catalog=await storage(env,CATALOG);
      if((action==='play'||action==='seek')&&catalog?.runId!==status.runId)
        return reply({error:'The PC catalog is not ready'},409);
      const trackId=clean(data.trackId,24);
      if(action==='play'&&(!hex24(trackId)||!catalog.tracks.some(t=>t.id===trackId)))
        return reply({error:'Choose a listed song'},400);
      const offsetSec=Number(data.offsetSec);
      if(action==='seek'&&(!Number.isFinite(offsetSec)||offsetSec<0||
          offsetSec>=status.durationSec||status.durationSec<1))
        return reply({error:'Seek time is outside the current track'},400);
      const older=await storage(env,COMMAND);
      if(older&&older.runId===status.runId&&older.id!==status.commandAck&&
         older.at>now-30000)return reply({error:'Waiting for previous PC command'},409);
      const command={id:crypto.randomUUID().replaceAll('-',''),action,
        runId:status.runId,trackId:action==='play'?trackId:'',
        offsetSec:action==='seek'?Math.round(offsetSec*10)/10:0,at:now};
      await env.FM_STATE.put(COMMAND,JSON.stringify(command),{expirationTtl:180});
      return reply({ok:true,queued:true,commandId:command.id});
    }
    return reply({error:'Unsupported message type'},400);
  }catch(_){return reply({error:'Could not save DJ control message'},503);}
}
