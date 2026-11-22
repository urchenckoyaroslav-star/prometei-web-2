/** Guardrails for honest, non-tracking sponsorship pages before AdSense approval. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=path.resolve("dist");
const base=(process.env.SITE_URL||"https://prometei-web-2.pages.dev/").replace(/\/?$/,"/");
const text=path=>fs.readFileSync(path,"utf8");
const cfg=JSON.parse(text("site-ad-config.json"));
assert.equal(cfg.adsense.enabled,false,"Live advertising must remain disabled without verified publisher approval");
assert.equal(cfg.adsense.consentReady,false,"Static consent flags cannot substitute for a real certified consent integration");
assert.equal(cfg.house.contactUrl,"/advertise/");
assert.ok(cfg.house.description&&cfg.house.headline);
const sponsor=text(path.join(root,"advertise","index.html"));
assert.ok(sponsor.includes('<html lang="en">'));
assert.ok(sponsor.includes('<link rel="canonical" href="'+base+'advertise/">'),"Sponsor canonical missing");
assert.ok(sponsor.includes('"@type":"WebPage"')&&sponsor.includes("application/ld+json"),"Search metadata missing");
assert.ok(sponsor.includes('href="../advertise.css"'));
assert.ok(sponsor.includes('mailto:prometeimes@gmail.com'),"Contact link must use existing public address");
assert.ok(sponsor.includes("No invented traffic figures"),"No invented traffic claims");
assert.ok(sponsor.includes("Sponsors do not purchase favorable coverage"),"Editorial independence commitment missing");
assert.ok(sponsor.includes("rel=\"noopener noreferrer\""),"External link privacy attributes missing");
assert.ok(!sponsor.includes("adsbygoogle")&&!sponsor.includes("pagead2.googlesyndication.com"),"No third-party ad scripts until site is approved");
const css=text(path.join(root,"advertise.css"));
assert.ok(css.includes("prefers-reduced-motion"),"Reduced-motion accessibility required");
const sitemap=text(path.join(root,"sitemap.xml"));
assert.ok(sitemap.includes("<loc>"+base+"advertise/</loc>"),"Sponsor page missing from sitemap");
const homepage=text(path.join(root,"index.html"));
assert.ok(homepage.includes('href="/advertise/"'),"Site homepage needs sponsor link");
for(const lang of ["uk","ru","de","es","zh","ja"]){
 const home=text(path.join(root,lang,"index.html"));
 assert.ok(home.includes('href="/advertise/"'),"Multilingual home should preserve sponsorship navigation "+lang);
}
const news=text(path.join(root,"news","index.html"));
const story=text(path.join(root,"news","signal-adds-defenses-against-screen-reading-agents","index.html"));
const crypto=text(path.join(root,"crypto-atlas","index.html"));
const bitcoin=text(path.join(root,"crypto-atlas","bitcoin","index.html"));
for(const [name,html] of [["news",news],["news article",story],["crypto",crypto],["crypto article",bitcoin]]){
 assert.ok(html.includes("ADVERTISEMENT"),"Ad/sponsor label missing "+name);
 assert.ok(html.includes('href="'+base+'advertise/"'),"Sponsor link missing "+name);
 assert.ok(!html.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),"Cannot load unapproved live ads "+name);
}
assert.ok(news.includes("50 source-linked articles"));
console.log("SPONSORSHIP QA PASS: standalone English media kit, clear editor/advertiser separation, direct contact and ad CTA, 1 new crawlable URL, reduced motion, no live AdSense while account approval is unverified.");
