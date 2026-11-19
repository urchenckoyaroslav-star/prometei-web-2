import catalog from '../../../fm-vote-catalog.js';

export function ballotWeek(now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
  const date=new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day));
  const days=date.getUTCDay();
  date.setUTCDate(date.getUTCDate()-days-(days===0 && parts.hour+parts.minute<'2359'?7:0));
  return date.toISOString().slice(0,10);
}
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
async function handleVoteRequest({request,env}){
  const store=env.FM_STATE;
  if(!store || !env.FM_DJ_TOKEN)return reply({error:'Сервис голосования временно недоступен'},503);
  const week=ballotWeek(), prefix='fm:vote:'+week+':';
  const address=request.headers.get('CF-Connecting-IP');
  if(!address)return reply({error:'Не удалось определить подключение'},503);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([env.FM_DJ_TOKEN,week,address])));
  const key=prefix+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(request.method==='POST'){
    if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({},403);
    const body=await request.json().catch(()=>null);
    if(body?.week!==week)return reply({error:'Началась новая неделя. Обновите рейтинг.'},409);
    const tracks=body && typeof body.region==='string' && Object.hasOwn(catalog,body.region)?catalog[body.region]:[];
    if(!tracks.includes(body?.id))return reply({error:'Клип отсутствует в списке'},400);
    if(await store.get(key))return reply({error:'Голос с этого подключения уже принят'},409);
    const choice=body.region+'/'+body.id;
    await store.put(key,choice,{expirationTtl:8*86400,metadata:{choice}});
    return reply({ok:true,choice,week});
  }
  if(request.method!=='GET')return reply({},405);
  const scores={}; let cursor;
  do{
    const page=await store.list({prefix,...(cursor?{cursor}:{})});
    for(const row of page.keys){const id=row.metadata?.choice;if(id)scores[id]=(scores[id]||0)+1;}
    cursor=page.list_complete?null:page.cursor;
  }while(cursor);
  return reply({scores,week,choice:await store.get(key)});
}

export async function onRequest(context){
  try{
    return await handleVoteRequest(context);
  }catch(err){
    console.error('PROMETEI FM votes request failed',err);
    return reply({error:'Сервис голосования временно недоступен',code:'VOTES_RUNTIME_ERROR'},503);
  }
}
