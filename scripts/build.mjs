/** Static, dependency-free Cloudflare Pages build.
 * SITE_URL is the canonical production base URL (with trailing slash).
 * Set it to the verified Cloudflare Pages production URL after project creation.
 */
import fs from 'node:fs';
import {urlFor} from '../fm-locales.js';
import {chartPage} from './build-charts.mjs';
import {generateGuides} from './build-guides.mjs';
import {generateCryptoAtlas} from './build-crypto-atlas.mjs';
import {generateWeeklyNews} from './build-news.mjs';
import {generateLunarProi} from './build-lunar-proi.mjs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(source, 'dist');
const fallback='https://prometei-web-2.pages.dev/';
// CF_PAGES_URL points to an individual hashed deployment; do not use it for canonical URLs.
const siteURL=process.env.SITE_URL || fallback;
let site;
try{site=new URL(siteURL); if(site.protocol!=='https:')throw Error('HTTPS required'); site.hash='';site.search=''; if(!site.pathname.endsWith('/'))site.pathname+='/';}
catch(e){console.error('Invalid SITE_URL:',e.message);process.exit(1);}
const base=site.href;
const locales=['en','uk','ru','de','es','zh','ja'];
const localized=['uk','ru','de','es','zh','ja'];
const mappings={en:'en',uk:'uk',ru:'ru',de:'de',es:'es',zh:'zh-CN',ja:'ja'};
const ogLocales={en:'en_US',uk:'uk_UA',ru:'ru_RU',de:'de_DE',es:'es_ES',zh:'zh_CN',ja:'ja_JP'};
const titles={
 en:'PROMETEI Messenger — Android Chat via Bluetooth and Wi-Fi',
 uk:'PROMETEI — месенджер без інтернету для Android',
 ru:'PROMETEI — мессенджер без номера и SIM для Android',
 de:'PROMETEI Android-Messenger — Bluetooth & Internet',
 es:'PROMETEI Android — Mensajes por Bluetooth e Internet',
 zh:'PROMETEI Android 聊天应用 — 蓝牙、局域网与互联网连接',
 ja:'PROMETEI Androidメッセンジャー — Bluetooth・LAN・インターネット'
};
const descriptions={
 en:'PROMETEI Android messenger: Internet chat and nearby Bluetooth or local Wi-Fi/LAN messaging. Start without a phone number or email. Explore guides and limitations.',
 uk:'Відкрийте PROMETEI для Android: повідомлення через Bluetooth, локальну Wi-Fi/LAN мережу та інтернет. Дізнайтеся, як працює зв’язок без інтернету.',
 ru:'PROMETEI — Android-мессенджер без обязательного номера или SIM для локальной связи. Интернет, Bluetooth и Wi-Fi/LAN: способы переписки и ограничения.',
 de:'PROMETEI für Android verbindet über Bluetooth, lokales WLAN/LAN, Internet und gemischte Routen. Erfahren Sie, wann Nachrichten ohne Internet möglich sind.',
 es:'PROMETEI para Android combina Bluetooth, Wi-Fi/LAN local, Internet y modo mixto. Descubre cuándo es posible comunicarse sin conexión a Internet.',
 zh:'探索 PROMETEI 安卓通讯应用：通过蓝牙、本地 Wi-Fi 局域网、互联网及混合模式发送消息。了解何时可以离线连接，以及附近设备通信的条件、场景与限制。',
 ja:'PROMETEIはBluetooth、ローカルWi-Fi/LAN、インターネット、混合モードに対応するAndroidメッセンジャーです。オフライン通信の条件をご覧ください。'
};
const extraDescriptions={
 'how-it-works.html':'Learn how to test offline messaging on two Android phones with Bluetooth or local Wi-Fi, and troubleshoot why messages may not arrive.',
 'portfolio.html':'Android and web developer portfolio: PROMETEI Messenger on Google Play, PHANTOM GPS testing, multilingual website and PROMETEI FM radio. Remote development services and verifiable case studies.',
 'privacy.html':'PROMETEI Messenger privacy information and data handling disclosure. Review notice: policy details are being verified against the Android release.',
 'privacy-phantom.html':'PHANTOM GPS privacy information for the Android mock-location utility in closed testing.',
 'privacy-pokonap.html':'PokoNap Android educational game privacy information and development status.',
 'account-deletion.html':'Read about PROMETEI account deletion, local data removal and available support channels.',
 'child-safety.html':'PROMETEI safety standards, reporting information and protections for child safety.',
 'terms.html':'PROMETEI Android Messenger terms of use, responsibilities and service limitations.',
 'support.html':'Find PROMETEI Messenger support, Google Play information and app documentation.'
};
const appJs=fs.readFileSync(path.join(source,'app.js'),'utf8');
const start=appJs.indexOf('const translations=')+'const translations='.length;
const modeMarker=appJs.slice(start).match(/;\r?\nconst modeText=/);
const stop=modeMarker?start+modeMarker.index:-1;
if(start<20 || stop<0)throw Error('Translation source not found');
const translations=vm.runInNewContext('('+appJs.slice(start,stop)+')', Object.create(null), {timeout:1000});
const toText=s=>String(s).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const escapeAttr=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const q=s=>JSON.stringify(s).replace(/</g,'\\u003c');
const alternates=()=>[...locales.map(x=>`<link rel="alternate" hreflang="${mappings[x]}" href="${escapeAttr(base+(x==='en'?'':x+'/'))}">`),`<link rel="alternate" hreflang="x-default" href="${escapeAttr(base)}">`].join('\n');
function metadata(html,{url,title,description,lang='en',app=false,alternate=false}){
  html=html.replace(/<meta name="description"[^>]*>/gi,'').replace(/<meta property="og:(?:type|title|description|image|url|locale|image:width|image:height)"[^>]*>/gi,'').replace(/<meta name="(?:twitter:card|twitter:title|twitter:description|twitter:image|robots)"[^>]*>/gi,'').replace(/<link rel="canonical"[^>]*>/gi,'').replace(/<link rel="alternate" hreflang="[^"]+"[^>]*>/gi,'');
  html=html.replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escapeAttr(title)+'</title>');
  html=html.replace(/<html lang="[^"]*"/i,'<html lang="'+mappings[lang]+'"');
  const data={
    '@context':'https://schema.org',
    '@type':app?'MobileApplication':'WebPage',
    name:app?'PROMETEI Offline Messenger':title,
    url,
    description,
    inLanguage:mappings[lang],
    ...(app?{
      alternateName:'PROMETEI Messenger',
      operatingSystem:'Android',
      applicationCategory:'CommunicationApplication',
      installUrl:'https://play.google.com/store/apps/details?id=com.meshnetwork.app',
      sameAs:'https://play.google.com/store/apps/details?id=com.meshnetwork.app',
      publisher:{'@type':'Organization',name:'Prometeimsndgr',url:base}
    }:{})
  };
  const tags=[
   `<meta name="description" content="${escapeAttr(description)}">`,
   `<meta name="robots" content="index,follow,max-image-preview:large">`,
   `<link rel="canonical" href="${escapeAttr(url)}">`,
   alternate?alternates():'',
   `<meta property="og:type" content="${app?'website':'article'}">`,
   `<meta property="og:locale" content="${ogLocales[lang]}">`,
   `<meta property="og:title" content="${escapeAttr(title)}">`,
   `<meta property="og:description" content="${escapeAttr(description)}">`,
   `<meta property="og:url" content="${escapeAttr(url)}">`,
   `<meta property="og:image" content="${escapeAttr(base+'assets/og-cover.png')}">`,
   `<meta property="og:image:width" content="1200">`,
   `<meta property="og:image:height" content="630">`,
   `<meta name="twitter:card" content="summary_large_image">`,
   `<meta name="twitter:title" content="${escapeAttr(title)}">`,
   `<meta name="twitter:description" content="${escapeAttr(description)}">`,
   `<meta name="twitter:image" content="${escapeAttr(base+'assets/og-cover.png')}">`,
   `<script type="application/ld+json">${q(data)}</script>`
  ].filter(Boolean).join('\n  ');
  return html.replace('</head>','  '+tags+'\n</head>').replace(/href="(\.\.\/)?(portfolio|privacy|privacy-phantom|privacy-pokonap|account-deletion|child-safety|terms|support|how-it-works|fm)\.html"/g,'href="$1$2"');
}
function localize(html,locale){
  const dict=translations[locale];
  html=html.replace(/<([a-z][a-z\d-]*)([^>]*\bdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi,(match,tag,attrs,key)=>dict[key]===undefined?match:`<${tag}${attrs}>${dict[key]}</${tag}>`);
  const guideText={"ru":{"nav":"Статьи","eyebrow":"БИБЛИОТЕКА СВЯЗИ","title":"КАК РАБОТАЕТ СВЯЗЬ В МЕССЕНДЖЕРАХ.","lead":"Девять статей о Bluetooth, локальном Wi-Fi, интернете и смешанном режиме. Когда не нужны SIM-карта и номер телефона, а когда требуется сеть.","bt":"Bluetooth без интернета","btText":"Сообщения поблизости, разрешения Android и ограничения.","wifi":"Локальный Wi-Fi без интернета","wifiText":"Связь по LAN, даже если провайдер недоступен.","privacy":"Мессенджер без номера","privacyText":"PROMETEI, Telegram, WhatsApp, Signal и Viber: честное сравнение.","all":"Читать все девять статей"},"uk":{"nav":"Статті","eyebrow":"БІБЛІОТЕКА ЗВ’ЯЗКУ","title":"ЯК ПРАЦЮЄ ЗВ’ЯЗОК У МЕСЕНДЖЕРАХ.","lead":"Дев’ять матеріалів про Bluetooth, локальний Wi-Fi, інтернет і змішані маршрути. Коли можливий зв’язок без SIM-картки чи номера.","bt":"Bluetooth без інтернету","btText":"Повідомлення поблизу, дозволи Android і обмеження.","wifi":"Локальний Wi-Fi без інтернету","wifiText":"LAN-зв’язок без доступу до провайдера.","privacy":"Месенджер без номера","privacyText":"PROMETEI, Telegram, WhatsApp, Signal і Viber: чесне порівняння.","all":"Читати дев’ять статей"},"de":{"nav":"Ratgeber","eyebrow":"WISSEN ZUR VERBINDUNG","title":"SO FUNKTIONIERT MESSAGING.","lead":"Neun Ratgeber über Bluetooth, lokales WLAN, Internet und gemischte Verbindungen – mit Grenzen und Tests.","bt":"Bluetooth ohne Internet","btText":"Nachrichten in der Nähe, Android-Berechtigungen und Grenzen.","wifi":"Lokales WLAN ohne Internet","wifiText":"LAN-Kommunikation auch bei Ausfall des Internetanbieters.","privacy":"Messenger ohne Nummer","privacyText":"PROMETEI, Telegram, WhatsApp, Signal und Viber im fairen Vergleich.","all":"Alle neun Ratgeber ansehen"},"es":{"nav":"Guías","eyebrow":"BIBLIOTECA DE CONEXIONES","title":"CÓMO FUNCIONA LA MENSAJERÍA.","lead":"Nueve guías sobre Bluetooth, Wi-Fi local, Internet y rutas mixtas: usos reales y límites.","bt":"Bluetooth sin Internet","btText":"Mensajes cercanos, permisos Android y limitaciones.","wifi":"Wi-Fi local sin Internet","wifiText":"Comunicación LAN cuando no funciona el proveedor.","privacy":"Mensajero sin número","privacyText":"Comparación equilibrada de PROMETEI, Telegram, WhatsApp, Signal y Viber.","all":"Explorar las nueve guías"},"zh":{"nav":"通信指南","eyebrow":"连接知识库","title":"即时通信究竟如何工作？","lead":"九篇指南介绍蓝牙、本地 Wi-Fi、互联网与混合连接，说明真实的使用条件及限制。","bt":"无互联网蓝牙通信","btText":"近距离消息、Android 权限与实际限制。","wifi":"无互联网本地 Wi-Fi","wifiText":"没有外部互联网时的局域网通信。","privacy":"无需电话号码的通信","privacyText":"客观比较 PROMETEI、Telegram、WhatsApp、Signal 与 Viber。","all":"阅读全部九篇指南"},"ja":{"nav":"通信ガイド","eyebrow":"接続の知識","title":"メッセージはどう届くのか。","lead":"Bluetooth、ローカルWi-Fi、インターネット、混合ルートを9本の記事で解説。条件と制限も説明します。","bt":"インターネット不要のBluetooth","btText":"近距離のメッセージ、Android権限と制約。","wifi":"インターネット不要のローカルWi-Fi","wifiText":"外部回線がなくても利用できるLAN通信。","privacy":"電話番号なしで始める","privacyText":"PROMETEI、Telegram、WhatsApp、Signal、Viberを公平に比較。","all":"9本のガイドを読む"}};
  html=html.replace(/(<span data-guide="([^"]+)">)([^<]*)(<\/span>)/g,(match,open,key,content,close)=>open+(guideText[locale]?.[key]??content)+close);
  html=html.replaceAll('href="/guides/','href="/'+locale+'/guides/');
  // Only the six localized homepage variants use ../ relative resource links.
  const resources=['styles.css','app.js','manifest.webmanifest','privacy.html','privacy-phantom.html','privacy-pokonap.html','child-safety.html','account-deletion.html','terms.html','support.html','portfolio.html','how-it-works.html','fm.html'];
  for(const f of resources){html=html.replaceAll('href="'+f+'"','href="../'+f+'"').replaceAll('src="'+f+'"','src="../'+f+'"');}
  // Keep radio visitors in the same UI language as the localized home page.
  html=html.replaceAll('href="../fm.html"','href="/'+locale+'/fm"');
  if(locale==='ru'||locale==='uk')html=html.replaceAll('♫ PROMETEI FM</a>','♫ Прометей ФМ</a>');
  html=html.replaceAll('href="assets/','href="../assets/').replaceAll('src="assets/','src="../assets/').replaceAll('href="index.html"','href="./"');
  return html;
}
if(fs.existsSync(output))fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
function copy(d){for(const entry of fs.readdirSync(d,{withFileTypes:true})){
  if(['dist','node_modules','tests','scripts','functions','.github','.git','__pycache__'].includes(entry.name))continue;
  const file=path.join(d,entry.name);const dest=path.join(output,path.relative(source,file));
  if(entry.isDirectory()){fs.mkdirSync(dest,{recursive:true});copy(file);}else if(entry.isFile()&&!entry.name.endsWith('.pyc')){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
}}
copy(source);
const home=fs.readFileSync(path.join(source,'index.html'),'utf8');
let root=metadata(home,{url:base,title:titles.en,description:descriptions.en,lang:'en',app:true,alternate:true});
fs.writeFileSync(path.join(output,'index.html'),root,'utf8');
for(const locale of localized){
  let page=localize(home,locale);
  const lunarLabels={"uk":"Місяць і PROI","ru":"Луна и PROI","de":"Mond & PROI","es":"Luna y PROI","zh":"月球与 PROI","ja":"月と PROI"};
  page=page.replaceAll('<a href="/crypto-atlas/proi/" lang="en">Moon & PROI</a>','<a href="/'+locale+'/crypto-atlas/proi/" lang="'+mappings[locale]+'">'+lunarLabels[locale]+'</a>');
  page=metadata(page,{url:base+locale+'/',title:titles[locale],description:descriptions[locale],lang:locale,app:true,alternate:true});
  const folder=path.join(output,locale);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'index.html'),page,'utf8');
}
const docs=['portfolio.html','privacy.html','privacy-phantom.html','privacy-pokonap.html','account-deletion.html','child-safety.html','terms.html','support.html','how-it-works.html'];
for(const filename of docs){
 if(!fs.existsSync(path.join(source,filename)))continue;
 const old=fs.readFileSync(path.join(source,filename),'utf8');
 const titleMatch=old.match(/<title>([^<]+)<\/title>/i);
 let title=titleMatch?titleMatch[1]:'PROMETEI';
  // Source files may contain layered &amp;amp; entities: decode repeatedly, then escape once in metadata().
  for(let attempt=0;attempt<4&&/&amp;/i.test(title);attempt++)title=title.replace(/&amp;/gi,'&');
 const url=base+filename.slice(0,-5);
 fs.writeFileSync(path.join(output,filename),metadata(old,{url,title,description:extraDescriptions[filename]||'Official PROMETEI documentation',lang:'en'}),'utf8');
}

// Localized PROMETEI FM pages are server-rendered for crawlers and users who
// block JavaScript; the runtime language picker uses the same shared catalog.
const fmCatalog=JSON.parse(fs.readFileSync(path.join(source,'fm-translations.json'),'utf8'));
for(const l of locales){
  if(!fmCatalog[l] || Object.keys(fmCatalog[l]).length<70)
    throw Error('FM locale missing translations: '+l);
}
const fmTitles={"en":"PROMETEI FM — Online Radio, Live DJ & Music Chart","uk":"Прометей ФМ (PROMETEI FM) — слухати радіо онлайн","ru":"Прометей ФМ (PROMETEI FM) — слушать радио онлайн","de":"PROMETEI FM — Online-Radio, Live-DJ und Musikcharts","es":"PROMETEI FM — Radio online, DJ en vivo y éxitos musicales","zh":"PROMETEI FM — 在线电台、直播与音乐排行榜","ja":"PROMETEI FM — オンラインラジオ・生放送・音楽チャート"};
const fmDescriptions={"en":"Listen to PROMETEI FM online radio when live. Discover our DJ-led music stream, recently played tracks, song requests and a listener-voted music chart.","uk":"Слухайте Прометей ФМ (PROMETEI FM) онлайн під час ефіру. Дивіться історію треків і голосуйте в музичному хіт-параді.","ru":"Слушайте Прометей ФМ (PROMETEI FM) онлайн во время эфира. Смотрите историю треков и голосуйте в музыкальном чарте.","de":"PROMETEI FM online hören: DJ-Livestream, gespielte Titel, Musikwünsche und Musikcharts mit Publikumsabstimmung.","es":"Escucha PROMETEI FM en directo: radio online con DJ, historial de canciones, solicitudes y lista musical con votaciones.","zh":"收听 PROMETEI FM 在线直播：DJ 播放、歌曲历史、点歌服务和听众投票音乐排行榜。","ja":"PROMETEI FMのオンラインラジオを聴こう。DJ生放送、再生履歴、リクエスト、投票できる音楽チャート。"};
const fmHeading={
 en:['PROMETEI FM','Online radio'],
 uk:['Прометей ФМ','Радіо онлайн'],
 ru:['Прометей ФМ','Радио онлайн'],
 de:['PROMETEI FM','Online-Radio'],
 es:['PROMETEI FM','Radio en línea'],
 zh:['PROMETEI FM','在线电台'],
 ja:['PROMETEI FM','オンラインラジオ']
};
function fmTranslate(html, lang){
  for(const page of ['fm-charts','fm-history'])html=html.replaceAll('href="/'+page+'"','href="'+urlFor(lang,page)+'"');
  const dictionary=fmCatalog[lang];
  html=html.replace(/>([^<>]+)</g,(match,text)=>{
    const value=text.trim(),translated=dictionary[value];
    if(!translated || translated===value)return match;
    const lead=(text.match(/^\s*/)||[''])[0],trail=(text.match(/\s*$/)||[''])[0];
    return '>'+lead+translated+trail+'<';
  });
  html=html.replace(/\b(placeholder|aria-label)="([^"]+)"/g,(match,kind,value)=>{
    const translated=dictionary[value];
    return translated?kind+'="'+escapeAttr(translated)+'"':match;
  });
  html=html.replace(/<html lang="[^"]*"/,'<html lang="'+mappings[lang]+'"');
  const url=new URL(urlFor(lang,'fm').slice(1),base).href;
  const [name, label]=fmHeading[lang];
  html=html.replace(/<h1>[^]*?<\/h1>/i,
    '<h1>'+escapeAttr(name)+'<br><span>'+escapeAttr(label)+'</span></h1>');
  html=html.replace(/<p class="lede">[^]*?<\/p>/i,
    '<p class="lede">'+escapeAttr(fmDescriptions[lang])+'</p>');
  html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escapeAttr(fmTitles[lang])+'</title>');
  const d=escapeAttr(fmDescriptions[lang]);
  html=html.replace(/<meta name="description"[^>]*>/i,'<meta name="description" content="'+d+'">');
  html=html.replace(/<meta name="twitter:title"[^>]*>/i,'<meta name="twitter:title" content="'+escapeAttr(fmTitles[lang])+'">');
  html=html.replace(/<meta name="twitter:description"[^>]*>/i,'<meta name="twitter:description" content="'+d+'">');
  html=html.replace(/<meta property="og:title"[^>]*>/i,'<meta property="og:title" content="'+escapeAttr(fmTitles[lang])+'">');
  html=html.replace(/<meta property="og:description"[^>]*>/i,'<meta property="og:description" content="'+d+'">');
  html=html.replace(/<meta property="og:url"[^>]*>/i,'<meta property="og:url" content="'+escapeAttr(url)+'">');
  html=html.replace(/<link rel="canonical"[^>]*>/i,'<link rel="canonical" href="'+escapeAttr(url)+'">');
  const stationUrl=base+'fm';
  const radioPage={
    '@context':'https://schema.org',
    '@type':'WebPage',
    url,
    name:fmTitles[lang],
    description:fmDescriptions[lang],
    inLanguage:mappings[lang],
    mainEntity:{
      '@type':'BroadcastService',
      '@id':stationUrl+'#station',
      name:'PROMETEI FM',
      alternateName:['Прометей ФМ','Прометей FM'],
      url:stationUrl,
      broadcaster:{'@type':'Organization',name:'PROMETEI',url:base}
    }
  };
  html=html.replace(/<script type="application\/ld\+json">[^]*?<\/script>/i,
    '<script type="application/ld+json">'+q(radioPage)+'</script>');
  const fmAlternates=[
    ...locales.map(code=>'<link rel="alternate" hreflang="'+mappings[code]+'" href="'+base+(code==='en'?'fm':code+'/fm')+'">'),
    '<link rel="alternate" hreflang="x-default" href="'+base+'fm">'
  ].join('\n  ');
  html=html.replace('</head>','  '+fmAlternates+'\n</head>');
  return html;
}
const fmSource=fs.readFileSync(path.join(source,'fm.html'),'utf8');
fs.writeFileSync(path.join(output,'fm.html'),fmTranslate(fmSource,'en'));
for(const lang of localized){
  fs.writeFileSync(path.join(output,lang,'fm.html'),fmTranslate(fmSource,lang));
}

const catalog=JSON.parse(fs.readFileSync(path.join(source,'fm-ballot.json'),'utf8'));
for(const lang of locales){
  const dest=path.join(output,urlFor(lang,'fm-charts')+'.html');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,chartPage(catalog,lang,site.origin));
}
// Keep the sponsor-page canonical URLs aligned if SITE_URL changes to a custom domain.
const servicePath=path.join(output,'services','index.html');
if(!fs.existsSync(servicePath))throw Error('Services landing page missing');
fs.writeFileSync(servicePath,fs.readFileSync(servicePath,'utf8').replaceAll(fallback,base),'utf8');
const sponsorPath=path.join(output,'advertise','index.html');
if(!fs.existsSync(sponsorPath))throw Error('Sponsorship landing page missing');
fs.writeFileSync(sponsorPath,fs.readFileSync(sponsorPath,'utf8').replaceAll(fallback,base),'utf8');
const guideUrls=generateGuides(output,base);
const cryptoUrls=generateCryptoAtlas(output,base);
const lunarUrls=generateLunarProi(output,base);
const weeklyNewsUrls=generateWeeklyNews(output,base);
// One first-party Play Store route for every public static page. Inline HTML works without
// JavaScript, pop-ups, sticky banners, third-party scripts, or misleading download buttons.
const playStoreURL='https://play.google.com/store/apps/details?id=com.meshnetwork.app';
const installMessages={
  en:{region:'PROMETEI Android app',headline:'Stay connected with PROMETEI',copy:'Explore Internet chat and nearby Bluetooth or local Wi-Fi messaging on supported Android devices.',button:'Get PROMETEI on Google Play',partner:'Advertising & partnerships'},
  uk:{region:'Застосунок PROMETEI для Android',headline:'Залишайтеся на зв’язку з PROMETEI',copy:'Спробуйте повідомлення через інтернет, Bluetooth поблизу або локальну Wi-Fi мережу на сумісних пристроях Android.',button:'Встановити з Google Play',partner:'Реклама та співпраця'},
  ru:{region:'Приложение PROMETEI для Android',headline:'Оставайтесь на связи с PROMETEI',copy:'Попробуйте переписку через интернет, Bluetooth поблизости или локальную сеть Wi-Fi на совместимых устройствах Android.',button:'Установить из Google Play',partner:'Реклама и сотрудничество'},
  de:{region:'PROMETEI Android-App',headline:'Mit PROMETEI in Verbindung bleiben',copy:'Entdecke Chats per Internet, Bluetooth in der Nähe oder lokalem WLAN auf kompatiblen Android-Geräten.',button:'PROMETEI bei Google Play',partner:'Werbung & Partnerschaften'},
  es:{region:'Aplicación PROMETEI para Android',headline:'Sigue conectado con PROMETEI',copy:'Descubre chats por Internet, Bluetooth cercano o Wi-Fi local en dispositivos Android compatibles.',button:'Instalar desde Google Play',partner:'Publicidad y colaboraciones'},
  zh:{region:'PROMETEI 安卓应用',headline:'使用 PROMETEI 保持联系',copy:'在兼容的安卓设备上体验互联网聊天、近距离蓝牙通信及本地 Wi-Fi 消息。',button:'前往 Google Play 安装',partner:'广告与合作'},
  ja:{region:'Android用 PROMETEI',headline:'PROMETEI でつながろう',copy:'対応する Android 端末で、インターネット、近距離 Bluetooth、ローカル Wi-Fi のメッセージ機能をご覧ください。',button:'Google Play でインストール',partner:'広告・パートナーシップ'}
};
const directoryLabels={
 en:'All site pages',uk:'Карта сторінок',ru:'Карта сайта',de:'Seitenübersicht',
 es:'Mapa del sitio',zh:'网站目录',ja:'サイトマップ'
};
function installationBand(html){
  const lang=(html.match(/<html\b[^>]*\blang="([^"]+)"/i)?.[1]||'en').slice(0,2).toLowerCase();
  const t=installMessages[lang]||installMessages.en;
  const a=escapeAttr;
  return '<aside class="prometei-install-band" aria-label="'+a(t.region)+'"><div class="prometei-install-inner">'+
    '<span class="prometei-install-mark" aria-hidden="true">✦</span>'+
    '<div class="prometei-install-copy"><span class="prometei-install-eyebrow">PROMETEI · ANDROID</span><strong>'+a(t.headline)+'</strong><p>'+a(t.copy)+'</p></div>'+
    '<div class="prometei-install-actions"><a class="prometei-install-button" href="'+playStoreURL+'" target="_blank" rel="noopener noreferrer">'+a(t.button)+' <span aria-hidden="true">↗</span></a>'+
    '<a class="prometei-partner-link" href="'+a(base+'advertise/')+'">'+a(t.partner)+'</a>'+
    '<a class="prometei-directory-link" href="'+a(base+'site-map/')+'">'+a(directoryLabels[lang]||directoryLabels.en)+'</a></div></div></aside>';
}
// Promote PROI to a first-class, crawlable main-menu destination on EVERY generated page.
// This is independent of JavaScript, correctly localized, and points at the existing
// authoritative Android-aligned Lunar Pulse / PROI science and economy hub.
const proiNavLabels={
  en:'All about PROI',
  uk:'Усе про PROI',
  ru:'Всё о PROI',
  de:'Alles über PROI',
  es:'Todo sobre PROI',
  zh:'PROI 完整指南',
  ja:'PROI のすべて'
};
function putProiInMainMenu(html){
  const lang=(html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1]||'en').slice(0,2).toLowerCase();
  const target=base+(lang==='en'?'':lang+'/')+'crypto-atlas/proi/';
  const active=new URL(html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]||base).pathname.replace(/\/?$/,'/')===new URL(target).pathname.replace(/\/?$/,'/');
  const link='<a class="prometei-proi-nav" href="'+escapeAttr(target)+'"'+(active?' aria-current="page"':'')+'><span class="prometei-proi-glyph" aria-hidden="true">✦</span> '+escapeAttr(proiNavLabels[lang]||proiNavLabels.en)+'</a>';
  // Restrict modification to header navigation; never change article links, footer,
  // content or external ad blocks. Existing Moon & PROI links become this exact entry.
  return html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i,header=>
    header.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi,nav=>{
      if(/class=["'][^"']*prometei-proi-nav/.test(nav))return nav;
      const old=/<a\b[^>]*\bhref=["'][^"']*\/crypto-atlas\/proi\/["'][^>]*>[\s\S]*?<\/a>/i;
      if(old.test(nav))return nav.replace(old,link);
      return nav.replace(/(<nav\b[^>]*>)/i,'$1'+link);
    })
  );
}
// Apply consistent responsive and accessible controls to every generated static page,
 // including translated home pages, FM charts, scientific articles and sponsor pages.
function applyGlobalQualityStyles(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const pathname=path.join(directory,entry.name);
    if(entry.isDirectory()){applyGlobalQualityStyles(pathname);continue;}
    if(!entry.isFile()||!entry.name.endsWith('.html'))continue;
    let html=fs.readFileSync(pathname,'utf8');
    if(!/<\/head>/i.test(html))continue; // Google ownership-verification and HTML fragments are not site pages.
    if(!/<\/main>/i.test(html))continue; // Ignore technical verification files and fragments.
    html=putProiInMainMenu(html);
    if(!html.includes('href="/site-quality.css"'))
      html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/site-quality.css">\n</head>');
    if(!html.includes('class="prometei-install-band"'))
      html=html.replace(/<\/main>/i,match=>match+'\n'+installationBand(html));
    fs.writeFileSync(pathname,html,'utf8');
  }
}
applyGlobalQualityStyles(output);
const urls=[...locales.flatMap(l=>['fm-charts','fm-history'].map(page=>urlFor(l,page).slice(1))),'',...localized.map(x=>x+'/'),...docs.map(x=>x.slice(0,-5)),'fm',...localized.map(x=>x+'/fm'),...guideUrls,...cryptoUrls,...lunarUrls,...weeklyNewsUrls,'advertise/','services/','site-map/'];
const xml=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for(const item of urls){
 xml.push('  <url><loc>'+base+item+'</loc>');
 if(item===''||localized.some(l=>item===l+'/')){
  for(const l of locales)xml.push(`    <xhtml:link rel="alternate" hreflang="${mappings[l]}" href="${base+(l==='en'?'':l+'/')}"/>`);
  xml.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${base}"/>`);
 }
 if(/^(?:(?:uk|ru|de|es|zh|ja)\/)?guides\//.test(item)){
   const suffix=item.replace(/^(uk|ru|de|es|zh|ja)\//,'');
   for(const l of locales)xml.push('    <xhtml:link rel="alternate" hreflang="'+mappings[l]+'" href="'+base+(l==='en'?'':l+'/')+suffix+'"/>');
   xml.push('    <xhtml:link rel="alternate" hreflang="x-default" href="'+base+suffix+'"/>');
 }
 if(/^(?:(?:uk|ru|de|es|zh|ja)\/)?crypto-atlas\/proi\/$/.test(item)){
  for(const l of locales)xml.push('    <xhtml:link rel="alternate" hreflang="'+mappings[l]+'" href="'+base+(l==='en'?'':l+'/')+'crypto-atlas/proi/"/>');
  xml.push('    <xhtml:link rel="alternate" hreflang="x-default" href="'+base+'crypto-atlas/proi/"/>');
 }
 if(item==='fm'||localized.some(l=>item===l+'/fm')){
  for(const l of locales)xml.push(`    <xhtml:link rel="alternate" hreflang="${mappings[l]}" href="${base+(l==='en'?'fm':l+'/fm')}"/>`);
  xml.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${base}fm"/>`);
 }
 xml.push('  </url>');
}
xml.push('</urlset>');
fs.writeFileSync(path.join(output,'sitemap.xml'),xml.join('\n')+'\n');

// Human-friendly HTML directory: every XML-sitemap destination has a plain HTML link.
// This augments article collections and XML discovery; it does not guarantee indexing.
function buildSiteDirectory(){
 const groups={
  core:{name:'PROMETEI · Messenger & projects / Главные разделы',items:[]},
  proi:{name:'PROI · Lunar Observatory / Лунная лаборатория',items:[]},
  guides:{name:'Connection Science · Seven languages / Наука о связи',items:[]},
  crypto:{name:'Crypto Atlas · 50 histories / Истории криптовалют',items:[]},
  news:{name:'World News · Original briefs / Новости',items:[]},
  fm:{name:'PROMETEI FM · Radio & charts / Радио',items:[]},
  languages:{name:'Language homepages / Другие языки',items:[]}
 };
 const fileForSlug=slug=>{
  const clean=String(slug).replace(/^\/+/,'');
  const choices=clean.endsWith('/')||clean===''?
   [path.join(output,clean,'index.html')]:
   [path.join(output,clean,'index.html'),path.join(output,clean+'.html'),path.join(output,clean)];
  return choices.find(p=>fs.existsSync(p)&&fs.statSync(p).isFile())||null;
 };
 const titleForSlug=slug=>{
  const location=fileForSlug(slug);
  if(!location)return slug||'PROMETEI';
  const contents=fs.readFileSync(location,'utf8');
  return (contents.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||slug||'PROMETEI')
   .replace(/<[^>]+>/g,'').replaceAll('&amp;','&').trim();
 };
 for(const slug of urls){
  let category='core';
  if(/crypto-atlas\/proi\/$/.test(slug))category='proi';
  else if(/guides\//.test(slug))category='guides';
  else if(/crypto-atlas\//.test(slug))category='crypto';
  else if(/news\//.test(slug))category='news';
  else if(/(?:^|\/)fm(?:-|\/|$)/.test(slug))category='fm';
  else if(/^(?:uk|ru|de|es|zh|ja)\/$/.test(slug))category='languages';
  groups[category].items.push({url:base+slug,title:titleForSlug(slug)});
 }
 const sections=Object.values(groups).filter(group=>group.items.length).map(group=>
  '<section class="sd-section"><h2>'+escapeAttr(group.name)+' <span>'+group.items.length+'</span></h2>'+
  '<ul>'+group.items.map(item=>'<li><a href="'+escapeAttr(item.url)+'">'+escapeAttr(item.title)+'</a></li>').join('')+'</ul></section>'
 ).join('\n');
 const canonical=base+'site-map/';
 const description='Browse all PROMETEI Messenger pages, PROI Lunar Lab, 7-language connection guides, 50 crypto histories, FM and news. Direct links to every published sitemap URL.';
 const schema={'@context':'https://schema.org','@type':'CollectionPage','name':'PROMETEI website directory','description':description,'url':canonical,'inLanguage':'en','isPartOf':{'@type':'WebSite','name':'PROMETEI','url':base}};
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
  '<meta name="theme-color" content="#081624"><meta name="robots" content="index,follow,max-image-preview:large">'+
  '<title>PROMETEI — All pages & articles | Website Directory</title>'+
  '<meta name="description" content="'+escapeAttr(description)+'"><link rel="canonical" href="'+escapeAttr(canonical)+'">'+
  '<meta property="og:type" content="website"><meta property="og:title" content="PROMETEI — All pages & articles">'+
  '<meta property="og:description" content="'+escapeAttr(description)+'"><meta property="og:url" content="'+escapeAttr(canonical)+'">'+
  '<link rel="icon" type="image/svg+xml" href="'+base+'assets/mark.svg">'+
  '<script type="application/ld+json">'+q(schema)+'</script></head>'+
  '<body class="sd-page"><a class="sd-skip" href="#main">Skip to content</a>'+
  '<header class="sd-header"><div class="sd-wrap sd-header-inner"><a class="sd-brand" href="'+base+'">✦ PROMETEI</a>'+
  '<nav aria-label="Main navigation"><a href="'+base+'">Messenger</a><a href="'+base+'guides/">Science Atlas</a></nav></div></header>'+
  '<main id="main" class="sd-wrap"><section class="sd-hero"><span class="sd-eyebrow">PROMETEI / KNOWLEDGE NAVIGATION</span>'+
  '<h1>All pages <span lang="ru">/ Карта сайта</span></h1>'+
  '<p>Browse every published page in the site map, including translated guides, PROI Lunar Pulse, crypto research, radio and news. <span lang="ru">Здесь собраны прямые ссылки на все страницы и статьи PROMETEI.</span></p>'+
  '<div class="sd-summary"><strong>'+urls.length+'</strong><span>Indexable URLs listed in our sitemap · адресов в XML-карте</span></div></section>'+
  '<div class="sd-sections">'+sections+'</div><p class="sd-note">A published URL is not a promise of Google indexing. / Наличие страницы не гарантирует её индексацию Google.</p></main>'+
  '<footer class="sd-footer sd-wrap"><a href="'+base+'">PROMETEI Messenger</a> · <a href="'+base+'crypto-atlas/proi/">PROI Lunar Lab</a> · <a href="'+base+'sitemap.xml">XML Sitemap</a></footer>'+
  '</body></html>';
 const dest=path.join(output,'site-map');
 fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'index.html'),html,'utf8');
 applyGlobalQualityStyles(dest);
}
buildSiteDirectory();

const fmUrls=locales.map(lang=>base+urlFor(lang,'fm').slice(1));
const fmSitemap=[
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...fmUrls.map(url=>'<url><loc>'+escapeAttr(url)+'</loc></url>'),
  '</urlset>'
].join('\n');
fs.writeFileSync(path.join(output,'sitemap-fm.xml'),fmSitemap+'\n');
fs.writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\nSitemap: '+base+'sitemap-fm.xml\n');
fs.writeFileSync(path.join(output,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=3600\n`);
// Restrict Cloudflare Pages Functions invocation to the station API.
fs.writeFileSync(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/fm/*',...locales.map(l=>urlFor(l,'fm-history'))],exclude:[]},null,2)+'\n');
// Google and other public site crawlers may index the pages. Do not add invented verification tokens.
console.log('Built',urls.length,'crawlable URLs for',base,'in',output);
