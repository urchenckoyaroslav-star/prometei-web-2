export function chartPage(catalog){
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const clips=new Map();
  for(const [region,tracks] of Object.entries(catalog)){
    tracks.forEach((track,index)=>{
      const existing=clips.get(track.id);
      if(!existing || index<existing.seed)clips.set(track.id,{...track,region,seed:index});
    });
  }
  const tracks=[...clips.values()].sort((a,b)=>a.seed-b.seed);
  const rows=tracks.map((v,i)=>`<li data-id="${v.id}" data-seed="${i}" data-origin="${v.region}"><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">${escape(v.title)}</a><output aria-label="Доля голосов">—</output><button disabled data-vote>Голосовать</button></li>`).join('');
  const desc='Музыкальный чарт PROMETEI FM. В подборке недели: '+tracks.slice(0,3).map(t=>t.title).join(' · ');
  const schema={'@context':'https://schema.org','@type':'ItemList',name:'Музыкальные клипы недели на PROMETEI FM',itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:tracks.length,itemListElement:tracks.map(t=>({'@type':'CreativeWork',name:t.title,url:'https://www.youtube.com/watch?v='+t.id}))};
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Музыкальный чарт недели — исполнители и клипы | PROMETEI FM</title><meta name="description" content="${escape(desc)}"><link rel="canonical" href="https://prometei-web-2.pages.dev/fm-charts"><link rel="stylesheet" href="/fm-ranking.css?v=unified"><script defer src="/fm-ranking.js?v=unified"></script><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head><body><main><nav><a href="/ru/fm">← Радио онлайн</a><a href="/fm-history">История эфира</a></nav><h1>Выбери трек недели</h1><p id="vote-message" role="status"></p><ol id="chart">${rows}</ol><small><a href="https://kworb.net/youtube/trending_countries.html">Источник музыкальных трендов — Kworb</a></small></main></body></html>`;
}
