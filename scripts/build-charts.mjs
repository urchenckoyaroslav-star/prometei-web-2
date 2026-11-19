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
  const controls={
    ru:['Слушать топ','Закрыть плеер','Перейти к треку'],uk:['Слухати топ','Закрити плеєр','Перейти до треку'],
    en:['Play the Top','Close player','Jump to track'],de:['Top abspielen','Player schließen','Titel auswählen'],
    es:['Escuchar el Top','Cerrar reproductor','Ir a la canción'],zh:['播放排行榜','关闭播放器','跳至歌曲'],ja:['トップを再生','プレーヤーを閉じる','曲を選ぶ']
  }[lang];
  const player=`<section class="chart-playback"><button id="play-chart" type="button" aria-expanded="false" aria-controls="chart-player">▶ ${controls[0]} ${tracks.length}</button><div id="chart-player" hidden><div id="chart-screen"></div><div class="queue-tools"><select id="chart-jump" aria-label="${controls[2]}"><option value="">${controls[2]}</option></select><button type="button" id="close-chart">${controls[1]}</button></div></div></section>`;
  const rows=tracks.map((v,i)=>`<li data-id="${v.id}" data-seed="${i}" data-origin="${v.region}"><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">${escape(v.title)}</a><output aria-label="${t.share}">—</output><button disabled data-vote>${t.vote}</button></li>`).join('');
  const install={ru:'Установить из Google Play',uk:'Встановити з Google Play',en:'Install from Google Play',de:'Bei Google Play installieren',es:'Instalar desde Google Play',zh:'从 Google Play 安装',ja:'Google Play からインストール'}[lang];
  const messenger=`<aside class="messenger-card" aria-label="PROMETEI Messenger"><div class="orbital-art" aria-hidden="true"><i></i><i></i><i></i><span></span></div><div class="messenger-content"><strong>PROMETEI Messenger</strong><a class="install-app" href="https://play.google.com/store/apps/details?id=com.meshnetwork.app"><span aria-hidden="true">▶</span> ${install}</a></div></aside>`;
  const intros={
    en:'Discover our curated online music chart. Browse the playlist, listen through the embedded YouTube player and vote for your favourite tracks. Ranking positions may change when listeners vote.',
    uk:'Переглядайте наш музичний хіт-парад онлайн. Слухайте добірку через YouTube-плеєр і голосуйте за улюблені треки. Позиції змінюються після голосування.',
    ru:'Откройте наш музыкальный хит-парад онлайн. Слушайте подборку через YouTube-плеер и голосуйте за любимые треки. Позиции меняются после голосования.',
    de:'Entdecke unsere Musikcharts online, höre die Playlist im eingebetteten YouTube-Player und stimme für deine Lieblingstitel ab. Die Rangliste kann sich ändern.',
    es:'Descubre nuestra lista musical online, escucha los vídeos con el reproductor de YouTube y vota por tus canciones favoritas. Las posiciones pueden cambiar.',
    zh:'探索我们的在线音乐排行榜，使用嵌入的 YouTube 播放器收听，并为喜欢的歌曲投票。排名会随投票结果变化。',
    ja:'オンライン音楽チャートをチェック。埋め込みYouTubeプレーヤーで楽曲を聴き、お気に入りに投票できます。順位は投票により変動します。'
  };
  const desc='PROMETEI FM — '+intros[lang];
  const intro='<p class="chart-intro">'+escape(intros[lang])+'</p>';
  const schema={'@context':'https://schema.org','@type':'ItemList',name:t.chart+' · PROMETEI FM',itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:tracks.length,itemListElement:tracks.map(t=>({'@type':'CreativeWork',name:t.title,url:'https://www.youtube.com/watch?v='+t.id}))};
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.chart} | PROMETEI FM</title><meta name="description" content="${escape(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:title" content="${escape(t.chart)} | PROMETEI FM"><meta property="og:description" content="${escape(desc)}"><meta property="og:url" content="${base}${urlFor(lang,'fm-charts')}"><link rel="canonical" href="${base}${urlFor(lang,"fm-charts")}"><link rel="stylesheet" href="/fm-ranking.css?v=queue"><script defer src="/fm-ranking.js?v=queue"></script><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>${alternate("fm-charts",base)}</head><body><main>${languages("fm-charts",lang)}<nav><a href="${urlFor(lang,"fm")}">← ${t.radio}</a><a href="${urlFor(lang,"fm-history")}">${t.history}</a></nav><h1>${t.pick}</h1>${intro}${messenger}${player}<p id="vote-message" data-vote="${t.vote}" data-yours="${t.yours}" data-saved="${t.saved}" data-retry="${t.retry}" role="status"></p><ol id="chart">${rows}</ol><small><a href="https://kworb.net/youtube/trending_countries.html">${t.source} — Kworb</a></small></main></body></html>`;
}
