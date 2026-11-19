import {onRequestGet as history} from './api/fm/history.js';
import recovered from '../fm-recovered-history.json';
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export async function onRequestGet(ctx){
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
  const time=new Intl.DateTimeFormat('ru',{timeZone:'Europe/Kyiv',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const html=rows.map(t=>'<p><time>'+time.format(t.startedAt)+'</time> · <strong>'+escape(t.title)+'</strong> '+escape(t.artist)+'</p>').join('');
  return new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Что играло на радио онлайн — история PROMETEI FM</title><link rel="canonical" href="https://prometei-web-2.pages.dev/fm-history"><link rel="stylesheet" href="/fm-ranking.css"><main><nav><a href="/ru/fm">Слушать радио онлайн</a><a href="/fm-charts">Чарт клипов</a></nav><h1>Что играло в эфире</h1><p>Последние 36 часов · время Киева</p>'+ (html||'<p>Пока нет записей.</p>')+'</main></html>',{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=30'}});
}
