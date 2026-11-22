/** Editorial sponsorships. AdSense is intentionally off until verified publisher settings and consent are supplied. */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const config=JSON.parse(fs.readFileSync(path.join(root,"site-ad-config.json"),"utf8"));
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const ad=config.adsense||{},pub=ad.publisherId||"";
const hasConsent=ad.enabled===true&&ad.consentReady===true;
const correctId=/^ca-pub-\d{16}$/.test(pub);
export function adsEnabled(){return hasConsent&&correctId}
export function adHead(){
 return adsEnabled()?'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+pub+'" crossorigin="anonymous"></script>':'';
}
const localizedHouse={
 en:{label:"ADVERTISEMENT",headline:config.house.headline,description:config.house.description,link:"Explore sponsorship opportunities ↗",note:"House promotion · Google ads are not currently active in this placement."},
 uk:{label:"РЕКЛАМА",headline:"Співпраця з PROMETEI",description:"Відкриті до прозорого спонсорства технологічних та освітніх матеріалів. Реклама не впливає на редакційні тексти.",link:"Дізнатися про співпрацю ↗",note:"Власне оголошення · Google Ads тут наразі не працює."},
 ru:{label:"РЕКЛАМА",headline:"Сотрудничество с PROMETEI",description:"Обсуждаем прозрачное спонсорство технологических и научных материалов. Реклама не влияет на редакционные тексты.",link:"Узнать о сотрудничестве ↗",note:"Собственное объявление · Реклама Google здесь пока не включена."},
 de:{label:"WERBUNG",headline:"Mit PROMETEI zusammenarbeiten",description:"Kennzeichnetes Sponsoring für Technik und Bildung. Werbung beeinflusst unsere redaktionellen Inhalte nicht.",link:"Partnerschaft anfragen ↗",note:"Eigenwerbung · Google-Anzeigen sind hier derzeit nicht aktiv."},
 es:{label:"PUBLICIDAD",headline:"Colabora con PROMETEI",description:"Patrocinios identificados para contenido educativo y tecnológico. La publicidad no cambia nuestra información editorial.",link:"Consultar colaboraciones ↗",note:"Promoción propia · Los anuncios de Google todavía no están activos."},
 zh:{label:"广告",headline:"与 PROMETEI 合作",description:"欢迎了解清晰标注的科技与教育内容赞助机会。广告不会改变我们的独立编辑内容。",link:"了解赞助合作 ↗",note:"本站推广 · 此处尚未启用 Google 广告。"},
 ja:{label:"広告",headline:"PROMETEI とパートナーシップ",description:"技術・教育コンテンツに明確に表示するスポンサー枠をご案内します。広告は編集内容に影響しません。",link:"協業について ↗",note:"自社告知 · Google 広告は現在配信していません。"}
};
export function adBox(base,slot="newsFeed",place="inline",lang="en"){
 const t=localizedHouse[lang]||localizedHouse.en;
 const key=String(slot).replaceAll(/[^a-zA-Z0-9]/g,"");
 const zone=ad.slots?.[key]||"";
 const active=adsEnabled()&&/^\d{8,13}$/.test(zone);
 const label='<span class="site-ad-label">'+esc(t.label)+'</span>';
 const content=active
  ?'<ins class="adsbygoogle" style="display:block" data-ad-client="'+pub+'" data-ad-slot="'+zone+'" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(window.adsbygoogle=window.adsbygoogle||[]).push({});</script>'
  :'<div class="site-ad-inner"><span class="site-ad-spark" aria-hidden="true">✦</span><div class="site-ad-copy"><strong>'+esc(t.headline)+'</strong><p>'+esc(t.description)+'</p><a href="'+esc(new URL(config.house.contactUrl||"/advertise/",base).href)+'">'+esc(t.link)+'</a></div></div><small class="site-ad-disclaimer">'+esc(t.note)+'</small>';
 return '<aside class="site-ad-placement site-ad-'+esc(place)+'" data-ad-placement="'+key+'" aria-label="'+esc(t.label)+'">'+label+content+'</aside>';
}
