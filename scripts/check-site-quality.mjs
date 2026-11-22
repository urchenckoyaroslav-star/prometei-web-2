/** PROMETEI global SEO, localization, semantics, responsive and accessibility QA.
    Dependency-free; examines generated Cloudflare Pages HTML, not just sources. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const dist=path.resolve("dist");
const read=file=>fs.readFileSync(file,"utf8");
const base=(process.env.SITE_URL||"https://prometei-web-2.pages.dev/").replace(/\/?$/,"/");
const site=new URL(base);
const languages=["en","uk","ru","de","es","zh","ja"];
const mappings={en:"en",uk:"uk",ru:"ru",de:"de",es:"es",zh:"zh-CN",ja:"ja"};
const sitemap=read(path.join(dist,"sitemap.xml"));
const sitemapURLs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].replaceAll("&amp;","&"));
assert.ok(sitemapURLs.length>=200,"Sitemap unexpectedly lost site pages");
assert.equal(new Set(sitemapURLs).size,sitemapURLs.length,"Duplicate canonical URLs in sitemap");
const fileFor=url=>{
 const u=new URL(url);
 assert.equal(u.origin,site.origin,"Unexpected sitemap domain "+url);
 const slug=decodeURIComponent(u.pathname).replace(/^\/+/,"");
 if(/(?:^|\/)fm-history\/?$/.test(slug))return null; // Live Cloudflare Pages Function, not static HTML
 const tests=slug.endsWith("/")?[path.join(dist,slug,"index.html")]:[path.join(dist,slug),path.join(dist,slug+".html"),path.join(dist,slug,"index.html")];
 for(const candidate of tests)if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return candidate;
 throw Error("Sitemap URL has no deployed file: "+url);
};
const getTag=(html,tag)=>{const m=html.match(new RegExp("<"+tag+"\\b[^>]*>([\\s\\S]*?)<\\/"+tag+">","i"));return m?.[1]||""};
let pages=0;
const warns=[];
for(const url of sitemapURLs){
 const file=fileFor(url);
 if(!file)continue;
 const html=read(file);
 pages++;
 assert.ok(/^<!doctype html>/i.test(html.trimStart()),"Missing doctype: "+file);
 assert.ok(/<html\b[^>]*\blang="[^"]+"/i.test(html),"Missing document language: "+file);
 assert.ok(/<meta\b(?=[^>]*\bname="viewport")[^>]*>/i.test(html),"Viewport missing: "+file);
 const title=getTag(html,"title").replace(/<[^>]*>/g,"").trim();
 assert.ok(title.length>=10&&title.length<=140,"Missing/unreasonable title: "+url+" "+title);
 assert.ok(!/&amp;amp;/i.test(title),"Double-escaped title: "+url+" "+title);
 const metaDescription=[...html.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]).find(tag=>/\bname="description"/i.test(tag));
 assert.ok(metaDescription&&/\bcontent="[^"]{35,}"/i.test(metaDescription),"Description missing or too short: "+url);
 const canonicalTag=[...html.matchAll(/<link\b[^>]*>/gi)].map(x=>x[0]).find(tag=>/\brel="canonical"/i.test(tag));
 assert.ok(canonicalTag,"Canonical missing: "+url);
 const c=canonicalTag.match(/\bhref="([^"]+)"/i)?.[1];
 assert.equal(c,url,"Sitemap and canonical disagree: "+url);
 assert.ok(/<h1\b[^>]*>/i.test(html),"H1 missing: "+url);
 assert.ok(!/<meta[^>]*name="robots"[^>]*noindex/i.test(html),"Indexable sitemap page is noindex: "+url);
 assert.ok(html.includes('href="/site-quality.css"'),"Shared responsive layer missing: "+url);
 assert.ok(html.includes('class="prometei-install-band"'),"Universal Play download band missing: "+url);
 assert.ok(html.includes('class="prometei-install-button" href="https://play.google.com/store/apps/details?id=com.meshnetwork.app"'),"Direct official Google Play URL missing: "+url);
 assert.ok(html.includes('class="prometei-partner-link"'),"Sponsor contact route missing: "+url);
 assert.equal((html.match(/class="prometei-install-band"/g)||[]).length,1,"Duplicate global install CTA: "+url);
 for(const img of html.matchAll(/<img\b[^>]*>/gi)){
   assert.ok(/\balt="[^"]*"/.test(img[0]),"Image without alt: "+url+" "+img[0].slice(0,140));
 }
 for(const [i,match] of [...html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/gi)].entries()){
   if(!/\brel="[^"]*noopener/.test(match[0]))warns.push("External link missing noopener ("+url+", "+i+")");
 }
 const linkTags=[...html.matchAll(/<a\b[^>]*\bhref="#([^"]+)"[^>]*>/gi)];
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const tag of linkTags){
   const hash=decodeURIComponent(tag[1]);
   if(hash&&!ids.has(hash))warns.push("Unresolved same-page anchor "+hash+" on "+url);
 }
}
assert.ok(pages>=190,"Too few static pages were actually generated");
const app=read("app.js");
const start=app.indexOf("const translations=")+"const translations=".length;
const match=app.slice(start).match(/;\r?\nconst modeText=/);
assert.ok(start>20&&match,"Could not find application dictionaries");
const stop=start+match.index;
const dictionary=vm.runInNewContext("("+app.slice(start,stop)+")",Object.create(null),{timeout:1000});
const reference=Object.keys(dictionary.en);
const localesFM=JSON.parse(read("fm-translations.json"));
for(const l of languages){
 const entry=dictionary[l];
 assert.ok(entry,"Missing app translation "+l);
 for(const key of reference)assert.ok(typeof entry[key]==="string"&&entry[key].trim(),"Missing localized key "+l+"."+key);
 assert.equal(Object.keys(entry).length,reference.length,"Locale key count mismatch "+l);
 const fm=localesFM[l]||{};
 assert.ok(Object.keys(fm).length>=190,"Incomplete FM translations "+l);
 const page=read(path.join(dist,...(l==="en"?[]:[l]),"index.html"));
 assert.ok(page.includes('<html lang="'+mappings[l]+'"'),"Incorrect homepage language "+l);
 assert.ok(page.includes('<link rel="canonical" href="'+base+(l==="en"?"":l+"/")+'">'),"Wrong home canonical "+l);
 assert.ok(page.includes('hreflang="x-default"'),"Missing home language alternatives "+l);
 const hero=entry.heroLine1;
 assert.ok(page.includes(hero.replaceAll("&","&amp;"))||page.includes(hero),"Server-generated homepage isn't translated: "+l);
 assert.ok(page.includes('href="/site-quality.css"'),"Unpolished homepage "+l);
}
for(const l of languages){
 const page=read(path.join(dist,...(l==="en"?[]:[l]),"fm.html"));
 const expected=mappings[l];
 assert.ok(page.includes('<html lang="'+expected+'"'),"FM language wrong "+l);
 assert.ok(page.includes('hreflang="x-default"'));
}
const siteCSS=read("site-quality.css");
assert.ok(siteCSS.includes(".prometei-install-band")&&siteCSS.includes("@media (max-width:760px)"),"Responsive global install strip CSS missing");
for(const term of ["max-width:320px","max-width:390px","max-width:640px","min-width:1920px","prefers-reduced-motion:reduce","pointer:coarse","focus-visible","forced-colors:active"]){
 assert.ok(siteCSS.includes(term),"Responsive or accessible design rule missing: "+term);
}
const home=read(path.join(dist,"index.html"));
assert.ok(home.includes('href="/advertise/"')&&home.includes('href="/news/"')&&home.includes('href="/crypto-atlas/"'),"Main page lacks links across the ecosystem");
assert.ok(!/href="javascript:/i.test(home));
const fmScript=read("fm.html");
assert.ok(!fmScript.includes('id="playlist-list"'),"FM actual UI changed; stale tests must not require a fake playlist control");
assert.ok(fmScript.includes('id="history-list"')&&fmScript.includes('id="request-form"')&&fmScript.includes('id="sources"'),"Actual FM controls missing");
if(warns.length)console.log("Non-blocking anchor and external-link observations ("+warns.length+"): "+warns.slice(0,12).join(" | "));
console.log("SITE QUALITY PASS: "+pages+" static pages, "+sitemapURLs.length+" sitemap URLs (FM history endpoints included), 7 complete app/FM locales, accurate canonical/title/description/H1/alt, global responsive and motion preferences.");
