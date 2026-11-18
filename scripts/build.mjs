/** Static, dependency-free Cloudflare Pages build.
 * SITE_URL is the canonical production base URL (with trailing slash).
 * Set it to the verified Cloudflare Pages production URL after project creation.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(source, 'dist');
const fallback='https://urchenckoyaroslav-star.github.io/prometei-web-2/';
const siteURL=process.env.SITE_URL || process.env.CF_PAGES_URL || fallback;
let site;
try{site=new URL(siteURL); if(site.protocol!=='https:')throw Error('HTTPS required'); site.hash='';site.search=''; if(!site.pathname.endsWith('/'))site.pathname+='/';}
catch(e){console.error('Invalid SITE_URL:',e.message);process.exit(1);}
const base=site.href;
const locales=['en','uk','ru','de','es','zh','ja'];
const localized=['uk','ru','de','es','zh','ja'];
const mappings={en:'en',uk:'uk',ru:'ru',de:'de',es:'es',zh:'zh-CN',ja:'ja'};
const ogLocales={en:'en_US',uk:'uk_UA',ru:'ru_RU',de:'de_DE',es:'es_ES',zh:'zh_CN',ja:'ja_JP'};
const titles={
 en:'PROMETEI Messenger for Android — Bluetooth, LAN & Internet',
 uk:'PROMETEI — Android-месенджер: Bluetooth, Wi-Fi LAN та інтернет',
 ru:'PROMETEI — Android-мессенджер: Bluetooth, Wi-Fi LAN и интернет',
 de:'PROMETEI für Android — Messenger mit Bluetooth, LAN & Internet',
 es:'PROMETEI para Android — Mensajería Bluetooth, Wi-Fi LAN e Internet',
 zh:'PROMETEI Android 聊天应用 — 蓝牙、局域网与互联网连接',
 ja:'PROMETEI Androidメッセンジャー — Bluetooth・LAN・インターネット'
};
const descriptions={
 en:'Discover PROMETEI, an Android messenger with Bluetooth, local Wi-Fi/LAN, Internet and Mixed communication modes. Learn when nearby messaging can work without Internet.',
 uk:'Відкрийте PROMETEI для Android: повідомлення через Bluetooth, локальну Wi-Fi/LAN мережу та інтернет. Дізнайтеся, як працює зв’язок без інтернету.',
 ru:'Откройте PROMETEI для Android: сообщения через Bluetooth, локальную Wi-Fi/LAN сеть и интернет. Узнайте, когда возможна связь без интернета.',
 de:'PROMETEI für Android verbindet über Bluetooth, lokales WLAN/LAN, Internet und gemischte Routen. Erfahren Sie, wann Nachrichten ohne Internet möglich sind.',
 es:'PROMETEI para Android combina Bluetooth, Wi-Fi/LAN local, Internet y modo mixto. Descubre cuándo es posible comunicarse sin conexión a Internet.',
 zh:'探索 PROMETEI 安卓通讯应用：通过蓝牙、本地 Wi-Fi 局域网、互联网及混合模式发送消息。了解何时可以离线连接。',
 ja:'PROMETEIはBluetooth、ローカルWi-Fi/LAN、インターネット、混合モードに対応するAndroidメッセンジャーです。オフライン通信の条件をご覧ください。'
};
const extraDescriptions={
 'how-it-works.html':'How PROMETEI messages can use Bluetooth, local Wi-Fi/LAN, Internet and Mixed routes, including limits of offline messaging on Android.',
 'portfolio.html':'Explore Android development case studies: PROMETEI Messenger, PHANTOM GPS testing utility, PokoNap and independent web development.',
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
  return html.replace('</head>','  '+tags+'\n</head>');
}
function localize(html,locale){
  const dict=translations[locale];
  html=html.replace(/<([a-z][a-z\d-]*)([^>]*\bdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi,(match,tag,attrs,key)=>dict[key]===undefined?match:`<${tag}${attrs}>${dict[key]}</${tag}>`);
  // Only the six localized homepage variants use ../ relative resource links.
  const resources=['styles.css','app.js','manifest.webmanifest','privacy.html','privacy-phantom.html','privacy-pokonap.html','child-safety.html','account-deletion.html','terms.html','support.html','portfolio.html','how-it-works.html'];
  for(const f of resources){html=html.replaceAll('href="'+f+'"','href="../'+f+'"').replaceAll('src="'+f+'"','src="../'+f+'"');}
  html=html.replaceAll('href="assets/','href="../assets/').replaceAll('src="assets/','src="../assets/').replaceAll('href="index.html"','href="./"');
  return html;
}
if(fs.existsSync(output))fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
function copy(d){for(const entry of fs.readdirSync(d,{withFileTypes:true})){
  if(['dist','node_modules','tests','scripts','.git','__pycache__'].includes(entry.name))continue;
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
 const title=titleMatch?titleMatch[1]:'PROMETEI';
 const url=base+filename;
 fs.writeFileSync(path.join(output,filename),metadata(old,{url,title,description:extraDescriptions[filename]||'Official PROMETEI documentation',lang:'en'}),'utf8');
}
const urls=['',...localized.map(x=>x+'/'),...docs];
const xml=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for(const item of urls){
 xml.push('  <url><loc>'+base+item+'</loc>');
 if(item===''||localized.some(l=>item===l+'/')){
  for(const l of locales)xml.push(`    <xhtml:link rel="alternate" hreflang="${mappings[l]}" href="${base+(l==='en'?'':l+'/')}"/>`);
  xml.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${base}"/>`);
 }
 xml.push('  </url>');
}
xml.push('</urlset>');
fs.writeFileSync(path.join(output,'sitemap.xml'),xml.join('\n')+'\n');
fs.writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\n');
fs.writeFileSync(path.join(output,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=3600\n`);
// Google and other public site crawlers may index the pages. Do not add invented verification tokens.
console.log('Built',urls.length,'crawlable URLs for',base,'in',output);
