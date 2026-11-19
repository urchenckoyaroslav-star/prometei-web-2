import {labels,urlFor,alternate,languages} from '../fm-locales.js';
export function chartPage(catalog,lang,base){
  const t=labels(lang);
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const clips=new Map();
  for(const [region,tracks] of Object.entries(catalog)){
    tracks.forEach((track,index)=>{
      const existing=clips.get(track.id);
      if(!existing || index<existing.seed)clips.set(track.id,{...track,region,seed:index});
    });
  }
  const tracks=[...clips.values()].sort((a,b)=>a.seed-b.seed);
  const rows=tracks.map((v,i)=>`<li data-id="${v.id}" data-seed="${i}" data-origin="${v.region}"><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">${escape(v.title)}</a><output aria-label="${t.share}">—</output><button disabled data-vote>${t.vote}</button></li>`).join('');
  const desc=t.chart+' · PROMETEI FM · '+tracks.slice(0,3).map(t=>t.title).join(' · ');
  const schema={'@context':'https://schema.org','@type':'ItemList',name:t.chart+' · PROMETEI FM',itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:tracks.length,itemListElement:tracks.map(t=>({'@type':'CreativeWork',name:t.title,url:'https://www.youtube.com/watch?v='+t.id}))};
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.chart} | PROMETEI FM</title><meta name="description" content="${escape(desc)}"><link rel="canonical" href="${base}${urlFor(lang,"fm-charts")}"><link rel="stylesheet" href="/fm-ranking.css?v=motion1"><script defer src="/fm-ranking.js?v=motion1"></script><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>${alternate("fm-charts",base)}</head><body><main>${languages("fm-charts",lang)}<nav><a href="${urlFor(lang,"fm")}">← ${t.radio}</a><a href="${urlFor(lang,"fm-history")}">${t.history}</a></nav><h1>${t.pick}</h1><p id="vote-message" data-vote="${t.vote}" data-yours="${t.yours}" data-saved="${t.saved}" data-retry="${t.retry}" role="status"></p><ol id="chart">${rows}</ol><small><a href="https://kworb.net/youtube/trending_countries.html">${t.source} — Kworb</a></small></main></body></html>`;
}
