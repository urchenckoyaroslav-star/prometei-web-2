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
export function adBox(base,slot="newsFeed",place="inline"){
 const key=String(slot).replaceAll(/[^a-zA-Z0-9]/g,"");
 const zone=ad.slots?.[key]||"";
 const active=adsEnabled()&&/^\d{8,13}$/.test(zone);
 const label='<span class="site-ad-label">ADVERTISEMENT</span>';
 const content=active
  ?'<ins class="adsbygoogle" style="display:block" data-ad-client="'+pub+'" data-ad-slot="'+zone+'" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(window.adsbygoogle=window.adsbygoogle||[]).push({});</script>'
  :'<div class="site-ad-inner"><span class="site-ad-spark" aria-hidden="true">✦</span><div class="site-ad-copy"><strong>'+esc(config.house.headline)+'</strong><p>'+esc(config.house.description)+'</p><a href="'+esc(base+'portfolio')+'">Sponsorship and portfolio information ↗</a></div></div><small class="site-ad-disclaimer">House promotion · Paid advertising is not active in this placement.</small>';
 return '<aside class="site-ad-placement site-ad-'+esc(place)+'" data-ad-placement="'+key+'" aria-label="Advertisement">'+label+content+'</aside>';
}
