/** Ensure service inquiry funnel is truthful, crawlable, linked and accessible. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const dist=path.resolve("dist");
const base=(process.env.SITE_URL||"https://prometei-web-2.pages.dev/").replace(/\/?$/,"/");
const read=f=>fs.readFileSync(f,"utf8");
const file=path.join(dist,"services","index.html");
assert.ok(fs.existsSync(file),"Services landing page must deploy");
const html=read(file);
assert.ok(/<html lang="en">/.test(html),"English service page language metadata missing");
assert.ok(html.includes('<link rel="canonical" href="'+base+'services/">'),"Wrong service canonical");
assert.ok(/<meta name="description" content="[^"]{100,}"/i.test(html));
assert.ok(/<h1[\s>]/i.test(html));
assert.ok(html.includes('"@type":"Service"'),"Honest, non-priced Service schema missing");
assert.ok(!/"ratingValue"|"aggregateRating"|"reviewCount"|"price"/.test(html),"Do not invent ratings or pricing");
assert.ok(html.includes("No invented testimonials")&&html.includes("Availability, deliverables"),"Transparent scope missing");
assert.ok(html.includes('href="/site-quality.css"'),"Responsive and accessibility layer missing");
assert.ok(html.includes('href="../services.css"'),"Service-specific styling missing");
assert.ok(html.includes("mailto:prometeimes@gmail.com"),"Existing public contact missing");
assert.ok(html.includes('../portfolio#case-prometei')&&html.includes('../portfolio#case-pokonap'),"Real project evidence missing");
assert.ok(html.includes("Godot game polish")&&html.includes("Android app development"),"Distinct useful engineering offerings missing");
assert.ok(html.includes("No private credentials"),"Safety and access guidance missing");
assert.ok(read(path.join(dist,"sitemap.xml")).includes("<loc>"+base+"services/</loc>"),"Service page absent from sitemap");
for(const l of ["","uk/","ru/","de/","es/","zh/","ja/"]){
 const home=read(path.join(dist,l,"index.html"));
 assert.ok(home.includes('href="/services/"'),"Home must link to services: "+l);
}
const portfolio=read(path.join(dist,"portfolio.html"));
assert.ok(portfolio.includes('href="/services/"'),"Portfolio has no conversion path to scoped services");
const sponsor=read(path.join(dist,"advertise","index.html"));
assert.ok(sponsor.includes('href="../services/"'),"Ad sponsors need cross-link to technical services");
const news=read(path.join(dist,"news","index.html"));
const crypto=read(path.join(dist,"crypto-atlas","index.html"));
assert.ok(news.includes('href="'+base+'services/"'),"News readers need an optional service link");
assert.ok(crypto.includes(base+"services/"),"Crypto readers need service navigation");
const css=read("services.css");
for(const v of ["max-width:900px","max-width:690px","prefers-reduced-motion:reduce"]){
 assert.ok(css.includes(v),"Missing responsive/accessibility rule: "+v);
}
const conf=JSON.parse(read("site-ad-config.json"));
assert.equal(conf.adsense.enabled,false,"Never activate Google ads without eligible publisher and approved site");
console.log("SERVICES REVENUE READINESS PASS: honest detailed service offerings, contact, case studies, 7 localized-home links, sitemap, and disabled unverified AdSense.");
