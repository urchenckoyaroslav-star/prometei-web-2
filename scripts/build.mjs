/** Static, dependency-free Cloudflare Pages build.
 * SITE_URL is the canonical production base URL (with trailing slash).
 * Set it to the verified Cloudflare Pages production URL after project creation.
 */
import fs from 'node:fs';
import {urlFor} from '../fm-locales.js';
import {chartPage} from './build-charts.mjs';
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
 en:'PROMETEI Android Messenger — Bluetooth & Internet',
 uk:'PROMETEI — Android-месенджер: Bluetooth та інтернет',
 ru:'PROMETEI — Android-мессенджер: Bluetooth и интернет',
 de:'PROMETEI Android-Messenger — Bluetooth & Internet',
 es:'PROMETEI Android — Mensajes por Bluetooth e Internet',
 zh:'PROMETEI Android 聊天应用 — 蓝牙、局域网与互联网连接',
 ja:'PROMETEI Androidメッセンジャー — Bluetooth・LAN・インターネット'
};
const descriptions={
 en:'PROMETEI for Android supports Bluetooth, local Wi-Fi/LAN, Internet and Mixed routes. Explore nearby messaging, including offline limits.',
 uk:'Відкрийте PROMETEI для Android: повідомлення через Bluetooth, локальну Wi-Fi/LAN мережу та інтернет. Дізнайтеся, як працює зв’язок без інтернету.',
 ru:'PROMETEI — мессенджер для Android. Отправляйте сообщения через Bluetooth, локальную Wi-Fi/LAN сеть и интернет. Узнайте, когда возможна связь без интернета.',
 de:'PROMETEI für Android verbindet über Bluetooth, lokales WLAN/LAN, Internet und gemischte Routen. Erfahren Sie, wann Nachrichten ohne Internet möglich sind.',
 es:'PROMETEI para Android combina Bluetooth, Wi-Fi/LAN local, Internet y modo mixto. Descubre cuándo es posible comunicarse sin conexión a Internet.',
 zh:'探索 PROMETEI 安卓通讯应用：通过蓝牙、本地 Wi-Fi 局域网、互联网及混合模式发送消息。了解何时可以离线连接，以及附近设备通信的条件、场景与限制。',
 ja:'PROMETEIはBluetooth、ローカルWi-Fi/LAN、インターネット、混合モードに対応するAndroidメッセンジャーです。オフライン通信の条件をご覧ください。'
};
const extraDescriptions={
 'how-it-works.html':'How PROMETEI messages can use Bluetooth, local Wi-Fi/LAN, Internet and Mixed routes, including limits of offline messaging on Android.',
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
  html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escapeAttr(title)+'</title>');
  html=html.replace(/<html lang="[^"]*"/i,'<html lang="'+mappings[lang]+'"');
  const data={
    '@context':'https://schema.org',
    '@type':app?'MobileApplication':'WebPage',
    name:app?'PROMETEI Messenger':title,
    url,
    description,
    ...(app?{operatingSystem:'Android',applicationCategory:'CommunicationApplication',downloadUrl:'https://play.google.com/store/apps/details?id=com.meshnetwork.app',publisher:{'@type':'Organization',name:'PROMETEI'}}:{inLanguage:mappings[lang]})
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
  // Only the six localized homepage variants use ../ relative resource links.
  const resources=['styles.css','app.js','manifest.webmanifest','privacy.html','privacy-phantom.html','privacy-pokonap.html','child-safety.html','account-deletion.html','terms.html','support.html','portfolio.html','how-it-works.html','fm.html'];
  for(const f of resources){html=html.replaceAll('href="'+f+'"','href="../'+f+'"').replaceAll('src="'+f+'"','src="../'+f+'"');}
  // Keep radio visitors in the same UI language as the localized home page.
  html=html.replaceAll('href="../fm.html"','href="/'+locale+'/fm"');
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
  page=metadata(page,{url:base+locale+'/',title:titles[locale],description:descriptions[locale],lang:locale,app:true,alternate:true});
  const folder=path.join(output,locale);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'index.html'),page,'utf8');
}
const docs=['portfolio.html','privacy.html','privacy-phantom.html','privacy-pokonap.html','account-deletion.html','child-safety.html','terms.html','support.html','how-it-works.html'];
for(const filename of docs){
 if(!fs.existsSync(path.join(source,filename)))continue;
 const old=fs.readFileSync(path.join(source,filename),'utf8');
 const titleMatch=old.match(/<title>([^<]+)<\/title>/i);
 const title=titleMatch?titleMatch[1].replace(/&(?:amp;)+/gi,'&'):'PROMETEI';
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
const fmTitles={"en":"PROMETEI FM — Online Radio, Live DJ & Music Chart","uk":"PROMETEI FM — Радіо онлайн, живий ефір і хіт-парад","ru":"PROMETEI FM — Радио онлайн, прямой эфир и хит-парад","de":"PROMETEI FM — Online-Radio, Live-DJ und Musikcharts","es":"PROMETEI FM — Radio online, DJ en vivo y éxitos musicales","zh":"PROMETEI FM — 在线电台、直播与音乐排行榜","ja":"PROMETEI FM — オンラインラジオ・生放送・音楽チャート"};
const fmDescriptions={"en":"Listen to PROMETEI FM online radio when live. Discover our DJ-led music stream, recently played tracks, song requests and a listener-voted music chart.","uk":"Слухайте PROMETEI FM онлайн під час ефіру: музика від діджея, історія треків, замовлення пісень та хіт-парад із голосуванням.","ru":"Слушайте PROMETEI FM онлайн во время эфира: музыка от диджея, история треков, заявки на песни и хит-парад с голосованием.","de":"PROMETEI FM online hören: DJ-Livestream, gespielte Titel, Musikwünsche und Musikcharts mit Publikumsabstimmung.","es":"Escucha PROMETEI FM en directo: radio online con DJ, historial de canciones, solicitudes y lista musical con votaciones.","zh":"收听 PROMETEI FM 在线直播：DJ 播放、歌曲历史、点歌服务和听众投票音乐排行榜。","ja":"PROMETEI FMのオンラインラジオを聴こう。DJ生放送、再生履歴、リクエスト、投票できる音楽チャート。"};
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
  const url=base+(lang==='en'?'fm':lang+'/fm');
  html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escapeAttr(fmTitles[lang])+'</title>');
  const d=escapeAttr(fmDescriptions[lang]);
  html=html.replace(/<meta name="description"[^>]*>/i,'<meta name="description" content="'+d+'">');
  html=html.replace(/<meta name="twitter:title"[^>]*>/i,'<meta name="twitter:title" content="'+escapeAttr(fmTitles[lang])+'">');
  html=html.replace(/<meta name="twitter:description"[^>]*>/i,'<meta name="twitter:description" content="'+d+'">');
  html=html.replace(/<meta property="og:title"[^>]*>/i,'<meta property="og:title" content="'+escapeAttr(fmTitles[lang])+'">');
  html=html.replace(/<meta property="og:description"[^>]*>/i,'<meta property="og:description" content="'+d+'">');
  html=html.replace(/<meta property="og:url"[^>]*>/i,'<meta property="og:url" content="'+escapeAttr(url)+'">');
  html=html.replace(/<link rel="canonical"[^>]*>/i,'<link rel="canonical" href="'+escapeAttr(url)+'">');
  // The WebApplication schema is uniform. Update its URL to each localized page.
  html=html.replace('https://prometei-web-2.pages.dev/fm","description"',url+'","description"');
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
const urls=[...locales.flatMap(l=>['fm-charts','fm-history'].map(page=>urlFor(l,page).slice(1))),'',...localized.map(x=>x+'/'),...docs.map(x=>x.slice(0,-5)),'fm',...localized.map(x=>x+'/fm')];
const xml=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for(const item of urls){
 xml.push('  <url><loc>'+base+item+'</loc>');
 if(item===''||localized.some(l=>item===l+'/')){
  for(const l of locales)xml.push(`    <xhtml:link rel="alternate" hreflang="${mappings[l]}" href="${base+(l==='en'?'':l+'/')}"/>`);
  xml.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${base}"/>`);
 }
 if(item==='fm'||localized.some(l=>item===l+'/fm')){
  for(const l of locales)xml.push(`    <xhtml:link rel="alternate" hreflang="${mappings[l]}" href="${base+(l==='en'?'fm':l+'/fm')}"/>`);
  xml.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${base}fm"/>`);
 }
 xml.push('  </url>');
}
xml.push('</urlset>');
fs.writeFileSync(path.join(output,'sitemap.xml'),xml.join('\n')+'\n');
fs.writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\n');
fs.writeFileSync(path.join(output,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=3600\n`);
// Restrict Cloudflare Pages Functions invocation to the station API.
fs.writeFileSync(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/fm/*',...locales.map(l=>urlFor(l,'fm-history'))],exclude:[]},null,2)+'\n');
// Google and other public site crawlers may index the pages. Do not add invented verification tokens.
console.log('Built',urls.length,'crawlable URLs for',base,'in',output);
