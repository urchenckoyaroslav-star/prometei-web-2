const fields='name radio chart history pick vote yours saved retry share source period empty'.split(' ');
const strings={
 ru:['Русский','Радио онлайн','Хит-парад недели','История эфира','Выбери трек недели','Голосовать','Ваш голос','Голос принят','Обновите страницу, чтобы проверить голос','Доля голосов','Музыкальные тренды','Последние 36 часов · время Киева','Пока нет записей'],
 en:['English','Online radio','Weekly music chart','Recently played','Vote for the track of the week','Vote','Your vote','Vote recorded','Refresh the page to check your vote','Vote share','Music trends','Last 36 hours · Kyiv time','No tracks yet'],
 uk:['Українська','Радіо онлайн','Хіт-парад тижня','Історія ефіру','Обери трек тижня','Голосувати','Ваш голос','Голос зараховано','Оновіть сторінку, щоб перевірити голос','Частка голосів','Музичні тренди','Останні 36 годин · київський час','Записів поки немає'],
 de:['Deutsch','Online-Radio','Musikcharts der Woche','Zuletzt gespielt','Wähle den Song der Woche','Abstimmen','Deine Stimme','Stimme gezählt','Seite neu laden, um die Stimme zu prüfen','Stimmenanteil','Musiktrends','Letzte 36 Stunden · Kiewer Zeit','Noch keine Titel'],
 es:['Español','Radio en línea','Lista musical semanal','Canciones emitidas','Elige la canción de la semana','Votar','Tu voto','Voto registrado','Actualiza la página para comprobar tu voto','Porcentaje de votos','Tendencias musicales','Últimas 36 horas · hora de Kyiv','Aún no hay canciones'],
 zh:['中文','在线电台','每周音乐排行榜','播放记录','票选本周歌曲','投票','你的选择','投票成功','请刷新页面查看投票状态','得票率','音乐趋势','过去36小时 · 基辅时间','暂无播放记录'],
 ja:['日本語','オンラインラジオ','週間音楽チャート','放送履歴','今週の一曲に投票','投票する','投票済み','投票しました','ページを更新して投票状況を確認してください','得票率','音楽トレンド','過去36時間・キーウ時間','放送履歴はまだありません']
};
export const locales=Object.keys(strings);
export const labels=lang=>Object.fromEntries(fields.map((field,i)=>[field,strings[lang][i]]));
export const urlFor=(lang,page)=>'/'+(lang===(page==='fm'?'en':'ru')?'':lang+'/')+page;
export const alternate=(page,base)=>[...locales,'x-default'].map(l=>'<link rel="alternate" hreflang="'+l+'" href="'+base+urlFor(l==='x-default'?'ru':l,page)+'">').join('');
export function languages(page,lang){
  const options=locales.map(l=>`<a lang="${l}" hreflang="${l}" href="${urlFor(l,page)}" ${l===lang?'aria-current="page"':''}><b>${l.toUpperCase()}</b>${strings[l][0]}</a>`).join('');
  return `<header class="station-bar"><a class="wordmark" href="${urlFor(lang,'fm')}"><i aria-hidden="true">▮▥▮</i> PROMETEI <em>FM</em></a><details class="locale"><summary><b>${lang.toUpperCase()}</b> ${strings[lang][0]} <span aria-hidden="true">⌄</span></summary><nav aria-label="Languages">${options}</nav></details></header>`;
}
