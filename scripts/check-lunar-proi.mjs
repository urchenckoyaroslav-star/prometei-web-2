/* Verify science integrity, 7 localized PROI pages, user controls, and indexable hreflang. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const base=(process.env.SITE_URL||"https://prometei-web-2.pages.dev/").replace(/\/?$/,"/");
const dist=path.resolve("dist");
const langs={en:"en",uk:"uk",ru:"ru",de:"de",es:"es",zh:"zh-CN",ja:"ja"};
const data=Object.fromEntries(Object.keys(langs).map(l=>[l,JSON.parse(fs.readFileSync("lunar-proi-i18n/"+l+".json","utf8"))]));
const sitemap=fs.readFileSync(path.join(dist,"sitemap.xml"),"utf8");
const src=fs.readFileSync("lunar-proi.js","utf8");
const css=fs.readFileSync("lunar-proi.css","utf8");
const escape=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const pathFor=l=>(l==="en"?"":l+"/")+"crypto-atlas/proi/";
for(const l of Object.keys(langs)){
 const t=data[l],slug=pathFor(l),file=path.join(dist,slug,"index.html");
 assert.ok(fs.existsSync(file),"Missing "+l+" Moon PROI page");
 assert.equal(t.sections.length,9,"Each article must explain 9 substantial topics in "+l);
 assert.equal(t.ui.phases.length,8,"All moon phases translated in "+l);
 assert.equal(t.ui.days.length,7,"All calendar weekdays translated in "+l);
 for(const s of t.sections){
  assert.equal(s.p.length,2,"Two detailed paragraphs required "+l+" "+s.h);
  assert.ok(s.p.every(p=>p.length>40),"Short science paragraph "+l+" "+s.h);
 }
 const html=fs.readFileSync(file,"utf8"),canonical=base+slug;
 assert.ok(html.includes('<html lang="'+langs[l]+'">'));
 assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),"Canonical "+l);
 assert.ok(html.includes('application/ld+json')&&html.includes('"@type":"Article"'),"Structured data "+l);
 assert.ok(html.includes('name="description"')&&html.includes('meta name="robots" content="index,follow'),"Meta "+l);
 assert.ok(html.includes('href="/site-quality.css"'),"Responsive CSS not injected "+l);
 assert.ok(html.includes('lunar-proi.css')&&html.includes('lunar-proi.js'),"Interactive assets "+l);
 for(const x of Object.keys(langs)){
  const alt=base+pathFor(x);
  assert.ok(html.includes('hreflang="'+langs[x]+'" href="'+alt+'"'),"Missing hreflang "+l+" -> "+x);
 }
 for(const id of ["lp-slider","lp-moon-light-path","lp-calendar-days","lp-month-prev","lp-month-next","lp-month-today","lp-phase-name","lp-issuance","lp-cycle-total","lp-transfer","lp-fee-total","lp-fee-burn","lp-fee-network","lp-config"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing interactive control "+l+":"+id);
 }
 assert.equal((html.match(/data-phase-index="/g)||[]).length,8);
 for(const section of t.sections){
  assert.ok(html.includes(escape(section.h)),"Heading not server-rendered "+l);
  assert.ok(html.includes(escape(section.p[0]))&&html.includes(escape(section.p[1])),"Full article not server-rendered "+l);
 }
 for(const url of ["https://science.nasa.gov/moon/moon-phases/","https://oceanservice.noaa.gov/facts/springtide.html","https://pubmed.ncbi.nlm.nih.gov/34373318/","https://pmc.ncbi.nlm.nih.gov/articles/PMC11646031/"]){
  assert.ok(html.includes('href="'+url+'"'),"Science link absent "+l+":"+url);
 }
 assert.ok(html.includes('Google Play')&&html.includes('play.google.com/store/apps/details?id=com.meshnetwork.app'));
 assert.ok(html.includes("illustrativeDailyBase")&&html.includes("exampleBurnPercent"));
 assert.ok(sitemap.includes("<loc>"+canonical+"</loc>"),"Sitemap "+l);
 assert.ok(html.includes("100 × (1 + 2")||html.includes("100 ×（1 + 2"),"Emission formula disclosure "+l);
 const status=t.ui.status.toLowerCase();
 assert.ok(/points|балл|бали|балів|punkte|puntos|积分|ポイント/i.test(status),"Current points state "+l);
 assert.ok(t.ui.roadmapText.length>50,"Future token disclaimer "+l);
}
const sourceHome=fs.readFileSync(path.join(dist,"index.html"),"utf8");
assert.ok(sourceHome.includes('href="/crypto-atlas/proi/"'),"Homepage PROI navigation missing");
for(const l of Object.keys(langs).filter(l=>l!=="en")){
 const html=fs.readFileSync(path.join(dist,l,"index.html"),"utf8");
 assert.ok(html.includes('href="/'+l+'/crypto-atlas/proi/"'),"Localized homepage Moon link missing "+l);
}
assert.ok(src.includes("cancelAnimationFrame")&&src.includes("requestAnimationFrame"),"Slider animation missing");
assert.ok(src.includes("synodicDays")&&src.includes("exampleFeePercent"),"Moon model missing");
assert.ok(src.includes("aria-pressed")&&src.includes("getUTCDay"),"Calendar keyboard state/dates missing");
assert.ok(src.includes("cfg.labels.estimate"),"Calendar day descriptions must use localized units");
assert.ok(src.includes("normalize((date.getTime()-epoch)/dayMs)"),"Astronomical epoch approximation missing");
for(const rule of ["max-width:390px","max-width:640px","max-width:900px","min-width:1920px","prefers-reduced-motion:reduce","pointer:coarse","focus-visible"])assert.ok(css.includes(rule),"Missing responsive/accessibility "+rule);
assert.ok(!/connectWallet|buyToken|sendTransaction|web3\.eth|window\.ethereum/.test(src),"No functional token sales or transfers in concept UI");
console.log("LUNAR PROI PASS: 7 scientifically sourced articles, 9 sections each, 7×8 phases, 7 interactive calendars, hypothetical issuance/fee maths, SEO/hreflang, all local homepage links.");
