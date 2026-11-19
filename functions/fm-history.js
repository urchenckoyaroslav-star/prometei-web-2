import {labels,alternate,languages,urlFor,locales} from '../fm-locales.js';
import {onRequestGet as history} from './api/fm/history.js';
import recovered from '../fm-recovered-history.json';
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export async function onRequestGet(ctx){
  const lang=ctx.params?.locale||'ru';
  if(!locales.includes(lang))return new Response('Not found',{status:404});
  const base='https://prometei-web-2.pages.dev',t=labels(lang);
  const data=await (await history(ctx)).json(), cutoff=Date.now()-36*3600000;
  let recent=[];
  try{
    const station=await ctx.env.FM_STATE.get('prometei:fm:station:v1','json');
    if(station?.enabled && station.mode==='pc' && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/live\.mp3$/.test(station.pcStreamUrl)){
      const r=await fetch(new URL('/status.json',station.pcStreamUrl),{redirect:'error',signal:AbortSignal.timeout(2500)});
      if(r.ok){const status=await r.json();if(Array.isArray(status.recent))recent=status.recent.slice(0,2200);}
    }
  }catch{/* Central history remains available between broadcasts. */}
  const plays=new Map();
  for(const row of [...recovered,...(data.tracks||[]),...recent])if(row?.title && row.playId && row.startedAt>=cutoff && row.startedAt<=Date.now()+30000)plays.set(row.playId,row);
  const rows=[...plays.values()].sort((a,b)=>b.startedAt-a.startedAt);
  const time=new Intl.DateTimeFormat(lang,{timeZone:'Europe/Kyiv',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const html=rows.map(t=>'<p><time>'+time.format(t.startedAt)+'</time> · <strong>'+escape(t.title)+'</strong> '+escape(t.artist)+'</p>').join('');
  return new Response(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.history} · ${t.radio} | PROMETEI FM</title><meta name="description" content="${t.history} · PROMETEI FM · ${t.period}"><link rel="canonical" href="${base}${urlFor(lang,'fm-history')}">${alternate('fm-history',base)}<link rel="stylesheet" href="/fm-ranking.css?v=motion1"></head><body><main>${languages('fm-history',lang)}<nav><a href="${urlFor(lang,'fm')}">${t.radio}</a><a href="${urlFor(lang,'fm-charts')}">${t.chart}</a></nav><h1>${t.history}</h1><p>${t.period}</p>${html||t.empty}</main></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=30'}});
}
