import {labels,urlFor,alternate,languages} from '../fm-locales.js';
const editorialLabels = {
  en: ['About the artists', 'Watch on YouTube', 'Sources', 'Advertisement'],
  uk: ['Про виконавців', 'Дивитися на YouTube', 'Джерела', 'Реклама'],
  ru: ['Об исполнителях', 'Смотреть на YouTube', 'Источники', 'Реклама'],
  de: ['Über die Künstler', 'Auf YouTube ansehen', 'Quellen', 'Werbung'],
  es: ['Sobre los artistas', 'Ver en YouTube', 'Fuentes', 'Publicidad'],
  zh: ['艺人介绍', '在 YouTube 观看', '来源', '广告'],
  ja: ['アーティストについて', 'YouTube で見る', '出典', '広告']
};

const pendingEditorial = {
  en: 'Artist credits and career milestones are being checked for this new entry.',
  uk: 'Для нової позиції перевіряємо виконавців і факти про їхню кар’єру.',
  ru: 'Для новой позиции уточняем состав исполнителей и факты об их карьере.',
  de: 'Für diesen neuen Titel werden die Mitwirkenden und ihre Karriere geprüft.',
  es: 'Estamos verificando los créditos y la trayectoria de esta nueva entrada.',
  zh: '这首新上榜歌曲的艺人信息和经历正在核实。',
  ja: '新しく入った曲の参加アーティストと経歴を確認中です。'
};

const alternateVideos = {
  'mtTZ_-VbS30': 'https://www.youtube.com/watch?v=58u-zkDLNPg',
  'hQ8HPxk4AkA': 'https://music.apple.com/us/music-video/bby-wow/6823341383',
  'tDH5ec1F_uQ': 'https://www.youtube.com/watch?v=up5nHOguw7I'
};

export function chartPage(catalog,lang,base,editorial,adSlot){
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
  const [about, watch, sources, advertisement] = editorialLabels[lang];
  const privacy = {
    en: 'Website privacy', uk: 'Конфіденційність сайту', ru: 'Конфиденциальность сайта',
    de: 'Datenschutz', es: 'Privacidad del sitio', zh: '网站隐私', ja: 'サイトのプライバシー'
  }[lang];
  const rows = tracks.map((track, index) => {
    const videoUrl = 'https://www.youtube.com/watch?v=' + track.id;
    const clipUrl = alternateVideos[track.id] || videoUrl;
    const clipLabel = clipUrl.includes('music.apple.com') ? 'Apple Music · Video' : watch;
    const note = editorial[track.id];
    const artist = note ? `<strong class="track-artist">${escape(note[0])}</strong>` : '';
    const pending = !note ? `<details class="track-editorial"><summary>${about}</summary><article><h2>${escape(track.title)}</h2><p>${pendingEditorial[lang]}</p><div class="editorial-links"><a class="video-link" href="${videoUrl}" target="_blank" rel="noopener"><span aria-hidden="true">▶</span> ${watch}</a></div></article></details>` : '';
    const details = note ? `<details class="track-editorial"><summary>${about}</summary><article aria-labelledby="artist-${track.id}"><h2 id="artist-${track.id}">${escape(note[0])}</h2><p lang="${lang === 'ru' ? 'ru' : 'en'}">${escape(note[lang === 'ru' ? 2 : 1])}</p><div class="editorial-links"><a class="video-link" href="${escape(clipUrl)}" target="_blank" rel="noopener"><span aria-hidden="true">▶</span> ${clipLabel}</a><ul aria-label="${sources}">${note.slice(3).map(url => `<li><a href="${escape(url)}" target="_blank" rel="noopener">${escape(new URL(url).hostname.replace(/^www\./, ''))}</a></li>`).join('')}</ul></div></article></details>` : pending;
    return `<li data-id="${track.id}" data-seed="${index}" data-origin="${track.region}"><div class="track-title"><a data-track-title href="${videoUrl}" target="_blank" rel="noopener">${escape(track.title)}</a>${artist}</div><output aria-label="${t.share}">—</output><button disabled data-vote>${t.vote}</button>${details}</li>`;
  }).join('');
  const publisher = 'ca-pub-7195249956747821';
  const hasAd = /^\d{10}$/.test(adSlot || '');
  const adScript = hasAd ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisher}" crossorigin="anonymous"></script>` : '';
  const ad = hasAd ? `<aside class="chart-ad" aria-label="${advertisement}"><p>${advertisement}</p><ins class="adsbygoogle" style="display:block" data-ad-client="${publisher}" data-ad-slot="${adSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(window.adsbygoogle = window.adsbygoogle || []).push({});</script></aside>` : '';
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
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.chart} | PROMETEI FM</title><meta name="description" content="${escape(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:title" content="${escape(t.chart)} | PROMETEI FM"><meta property="og:description" content="${escape(desc)}"><meta property="og:url" content="${base}${urlFor(lang,'fm-charts')}"><link rel="canonical" href="${base}${urlFor(lang,"fm-charts")}"><link rel="stylesheet" href="/fm-ranking.css?v=editorial"><script defer src="/fm-ranking.js?v=editorial"></script><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>${alternate("fm-charts",base)}${adScript}</head><body><main>${languages("fm-charts",lang)}<nav><a href="${urlFor(lang,"fm")}">← ${t.radio}</a><a href="${urlFor(lang,"fm-history")}">${t.history}</a></nav><h1>${t.pick}</h1>${intro}${messenger}${player}<p id="vote-message" data-vote="${t.vote}" data-yours="${t.yours}" data-saved="${t.saved}" data-retry="${t.retry}" role="status"></p><ol id="chart">${rows}</ol>${ad}<small><a href="https://kworb.net/youtube/trending_countries.html">${t.source} — Kworb</a> · <a href="/fm-privacy">${privacy}</a></small></main></body></html>`;
}
