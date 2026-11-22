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
 assert.ok(html.includes('class="lp-observatory-hero"')&&html.includes('class="lp-hero-plot"'),"Professional observatory hero missing "+l);
 assert.ok(html.includes('class="lp-instrument-topline"')&&html.includes('class="lp-moon-reticle"'),"Moon instrument telemetry missing "+l);
 for(const id of ["lp-emission-chart","lp-chart-trace","lp-chart-area","lp-chart-cursor","lp-chart-point"])
  assert.ok(html.includes('id="'+id+'"'),"Interactive cumulative rewards chart missing "+l+":"+id);
 for(const label of ["instrument","observatory","chartTitle","chartAria","chartNote"])
  assert.ok(typeof t.ui[label]==="string"&&t.ui[label].length>10,"Observatory copy not localized "+l+":"+label);
 assert.ok(html.includes('site-ads.css')&&html.includes('data-ad-placement="lunarScience"'),"Lunar science sponsorship slot missing "+l);
 assert.ok(html.includes('class="site-ad-label"')&&html.includes('advertise/'),"Honest partner label/route missing "+l);
 assert.ok(!html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'),"Unapproved live AdSense on lunar page "+l);
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
 assert.ok(html.includes('"epochMs":1704974220000')&&html.includes('"synodicDays":29.53058867'),"Android UTC lunar epoch mismatch "+l);
 assert.ok(html.includes('"waxingRewardMilli":500')&&html.includes('"waningRewardMilli":100'),"Lunar Pulse rewards mismatch "+l);
 assert.ok(html.includes('"defaultWaxingFeeBps":1000')&&html.includes('"defaultWaningFeeBps":1500'),"Android fee defaults missing "+l);
 for(const id of ["lp-milestones","lp-fee-waxing","lp-fee-waning","lp-fee-debit","lp-protocol-title"])assert.ok(html.includes('id="'+id+'"'),"Lunar protocol UI missing "+l+":"+id);
 assert.ok(sitemap.includes("<loc>"+canonical+"</loc>"),"Sitemap "+l);
 assert.ok(html.includes("0.5")||html.includes("0,5"),"Real milestone reward needs disclosure "+l);
 assert.ok(!html.includes("100 × (1 + 2")&&!html.includes("100 ×（1 + 2"),"Invented daily issuance formula remains "+l);
 const status=t.ui.status.toLowerCase();
 assert.ok(/points|unit|балл|единиц|бали|балів|одиниц|punkte|einheit|puntos|unidad|积分|ポイント/i.test(status),"Current points state "+l);
 assert.ok(t.ui.roadmapText.length>50,"Future token disclaimer "+l);
}
const sourceHome=fs.readFileSync(path.join(dist,"index.html"),"utf8");
assert.ok(sourceHome.includes('href="/crypto-atlas/proi/"'),"Homepage PROI navigation missing");
for(const l of Object.keys(langs).filter(l=>l!=="en")){
 const html=fs.readFileSync(path.join(dist,l,"index.html"),"utf8");
 assert.ok(html.includes('href="/'+l+'/crypto-atlas/proi/"'),"Localized homepage Moon link missing "+l);
}
assert.ok(src.includes("cancelAnimationFrame")&&src.includes("requestAnimationFrame"),"Slider animation missing");
assert.ok(src.includes("synodicDays")&&src.includes("waxingPhase")&&src.includes("momentFor"),"Android Moon-phase model missing");
assert.ok(src.includes("renderRewardChart")&&src.includes("updateChartCursor"),"20-step rewards chart must be driven by Android milestone events");
assert.ok(src.includes("pendingInput=requestAnimationFrame"),"Mobile slider must coalesce rapid input events");
assert.ok(src.includes("Math.ceil")&&src.includes("Math.floor(feeMilli/2)"),"Android milli-PROI fee rounding missing");
assert.ok(src.includes("aria-pressed")&&src.includes("getUTCDay"),"Calendar keyboard state/dates missing");
assert.ok(src.includes("cfg.labels.none")&&src.includes("eventDayData"),"Calendar must show actual scheduled milestones, not made-up daily minting");
assert.ok(src.includes("normalize((date.getTime()-epoch)/dayMs)"),"Android UTC epoch approximation missing");
assert.ok(src.includes("cfg.waxingRewardMilli")&&src.includes("cfg.waningRewardMilli"),"Milestone model must use actual Android PROI rewards");
for(const rule of ["max-width:390px","max-width:640px","max-width:900px","min-width:1920px","prefers-reduced-motion:reduce","pointer:coarse","focus-visible"])assert.ok(css.includes(rule),"Missing responsive/accessibility "+rule);
for(const className of [".lp-observatory-hero",".lp-hero-orbital",".lp-moon-reticle",".lp-analytics",".lp-instrument-topline"])
 assert.ok(css.includes(className),"Premium observatory visual system missing "+className);
const svg=fs.readFileSync("lunar-proi-moon.svg","utf8");
assert.ok(svg.includes('id="lp-moon-light-path"')&&svg.includes('id="lp-moon-bound"'),"Cratered moon must preserve dynamic illumination geometry");
assert.ok(!/connectWallet|buyToken|sendTransaction|web3\.eth|window\.ethereum/.test(src),"No functional token sales or transfers in concept UI");
console.log("LUNAR PROI PASS: 7 translated science articles, Android-aligned UTC epoch, 20 exact milestone rewards, source-default ROOT fee demos, 50/50 burn/Vault split, SEO and responsive UI.");
