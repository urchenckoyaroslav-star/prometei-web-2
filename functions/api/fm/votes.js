import catalog from '../../../fm-vote-catalog.js';

export function ballotWeek(now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
  const date=new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day));
  const days=date.getUTCDay();
  date.setUTCDate(date.getUTCDate()-days-(days===0 && parts.hour+parts.minute<'2359'?7:0));
  return date.toISOString().slice(0,10);
}
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
async function handleVoteRequest({request,env},trace){
  trace.stage='bindings';
  const store=env.FM_STATE;
  if(!store || !env.FM_DJ_TOKEN)return reply({error:'Сервис голосования временно недоступен'},503);
  trace.stage='week';
  const week=ballotWeek(), prefix='fm:vote:'+week+':';
  trace.stage='address';
  const address=request.headers.get('CF-Connecting-IP');
  if(!address)return reply({error:'Не удалось определить подключение'},503);
  trace.stage='digest';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([env.FM_DJ_TOKEN,week,address])));
  const key=prefix+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const totalsKey='fm:vote:totals:'+week;
  trace.stage='method';
  if(request.method==='POST'){
    if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({},403);
    const body=await request.json().catch(()=>null);
    if(body?.week!==week)return reply({error:'Началась новая неделя. Обновите рейтинг.'},409);
    const tracks=body && typeof body.region==='string' && Object.hasOwn(catalog,body.region)?catalog[body.region]:[];
    if(!tracks.includes(body?.id))return reply({error:'Клип отсутствует в списке'},400);
    trace.stage='post-get';
    if(await store.get(key))return reply({error:'Голос с этого подключения уже принят'},409);
    const choice=body.region+'/'+body.id;
    // KV namespace supports get/put, but this deployment's list() fails.
    // Maintain a weekly summary instead of relying on KV listing for every read.
    trace.stage='post-totals-get';
    const current=await store.get(totalsKey,'json');
    const next=current && typeof current==='object' && !Array.isArray(current)?current:{};
    next[choice]=(Number(next[choice])||0)+1;
    trace.stage='post-put';
    await store.put(key,choice,{expirationTtl:8*86400,metadata:{choice}});
    trace.stage='post-totals-put';
    await store.put(totalsKey,JSON.stringify(next),{expirationTtl:8*86400});
    return reply({ok:true,choice,week});
  }
  if(request.method!=='GET')return reply({},405);
  trace.stage='get-totals';
  const totals=await store.get(totalsKey,'json');
  const scores=totals && typeof totals==='object' && !Array.isArray(totals)?totals:{};
  trace.stage='get-choice';
  return reply({scores,week,choice:await store.get(key)});
}

export async function onRequest(context){
  const trace={stage:'start'};
  try{
    return await handleVoteRequest(context,trace);
  }catch(err){
    console.error('PROMETEI FM votes request failed',err);
    return reply({error:'Сервис голосования временно недоступен',code:'VOTES_'+trace.stage.toUpperCase().replace(/[^A-Z_]/g,'')},503);
  }
}
