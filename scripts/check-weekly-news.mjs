/** Validate a fully attributed English-only 40-article weekly newsroom. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const base=(process.env.SITE_URL||"https://prometei-web-2.pages.dev/").replace(/\/?$/,"/");
const dist=path.resolve("dist"), newsroom=path.join(dist,"news");
const issues=Array.from({length:4},(_,i)=>JSON.parse(fs.readFileSync("news-week-"+String(i+1).padStart(2,"0")+".json","utf8"))).flat();
const photos=JSON.parse(fs.readFileSync("news-images.json","utf8"));
const xml=fs.readFileSync(path.join(dist,"sitemap.xml"),"utf8");
const categories=new Set(["World","Technology","Economy","Climate","Science","Culture"]);
assert.equal(issues.length,40,"Exactly 40 English articles must be published");
assert.equal(new Set(issues.map(x=>x.slug)).size,40,"Duplicate article slug");
assert.equal(new Set(issues.map(x=>x.title)).size,40,"Duplicate headline");
for(const [key,img] of Object.entries(photos)){
 assert.match(img.image,/^https:\/\/images\.unsplash\.com\/photo-/,"Unsupported photo URL: "+key);
 assert.match(img.creditUrl,/^https:\/\/unsplash\.com\/photos\//);
 assert.ok(img.alt && img.credit && img.license==="Unsplash License" && img.disclaimer.includes("Illustrative"));
}
const get=(f)=>fs.readFileSync(f,"utf8");
const root=get(path.join(newsroom,"index.html"));
assert.ok(root.includes('<html lang="en">'),"Newsroom must be English only");
assert.ok(root.includes('href="'+base+'news/"'),"Missing canonical");
assert.ok(root.includes('id="story-search"'),"Missing search input");
assert.ok(root.includes('data-category-filter'),"Missing filters");
assert.ok(root.includes("40 source-linked articles"),"Issue count missing");
assert.ok(root.includes("Illustrative photo")&&root.includes("Not a photograph"),"Photo disclosure missing");
assert.ok(root.includes("play.google.com/store/apps/details?id=com.meshnetwork.app"),"Messenger link missing");
assert.ok(xml.includes("<loc>"+base+"news/</loc>"),"Newsroom missing from sitemap");
for(const [i,s] of issues.entries()){
 assert.match(s.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/,"SEO slug invalid");
 assert.ok(categories.has(s.category),"Unexpected category: "+s.category);
 assert.match(s.date,/^2026-11-(1[5-9]|2[0-2])$/,"Date outside requested week");
 assert.ok(s.lead.length>60 && s.body.length===2 && s.body.every(p=>p.length>65),"Too little original news text: "+s.slug);
 assert.ok(s.why.length>55,"Missing impact context: "+s.slug);
 assert.ok(s.source.name && /^https:\/\//.test(s.source.url),"Source URL missing");
 const photo=photos[s.photo];
 assert.ok(photo,"Missing licensed photo "+s.photo+" in "+s.slug);
 const file=path.join(newsroom,s.slug,"index.html"),url=base+"news/"+s.slug+"/";
 assert.ok(fs.existsSync(file),"Missing rendered story "+s.slug);
 const html=get(file);
 assert.ok(html.includes('<html lang="en">'),"Not English: "+s.slug);
 assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),"Wrong canonical: "+s.slug);
 assert.ok(html.includes('application/ld+json') && html.includes('"@type":"NewsArticle"'),"Missing NewsArticle JSON-LD "+s.slug);
 assert.ok(html.includes('<meta name="description"'),"Meta description absent "+s.slug);
 assert.ok(html.includes('datetime="'+s.date+'"'),"Published day missing "+s.slug);
 assert.ok(html.includes(photo.image.replaceAll("&","&amp;")),"Image absent "+s.slug);
 assert.ok(html.includes(photo.credit),"Photo credit missing "+s.slug);
 assert.ok(html.includes("Not a photograph of this reported event"),"Photo disclaimer missing "+s.slug);
 assert.ok(html.includes('href="'+s.source.url.replaceAll("&","&amp;")+'"'),"Original reporting link missing "+s.slug);
 assert.ok(html.includes("play.google.com/store/apps/details?id=com.meshnetwork.app"),"PROMETEI download link missing "+s.slug);
 assert.ok(xml.includes("<loc>"+url+"</loc>"),"Sitemap does not list "+s.slug);
}
assert.ok(get(path.join(dist,"index.html")).includes('href="/news/"'),"Main homepage not linking to news");
for(const lang of ["uk","ru","de","es","zh","ja"])assert.ok(get(path.join(dist,lang,"index.html")).includes('href="/news/"'),"Localized homepage missing news link "+lang);
assert.ok(get("news.css").includes("prefers-reduced-motion"),"Accessibility animation fallback missing");
assert.ok(get("news.js").includes("aria-pressed"),"Accessible filter state missing");
assert.ok(fs.existsSync(path.join(dist,"crypto-atlas","bitcoin","index.html")),"Crypto Atlas missing");
assert.ok(fs.existsSync(path.join(dist,"ru","guides","index.html")),"Connection science missing");
console.log("PROMETEI WEEKLY NEWS PASS: 40 dated, original English recaps; 41 indexed URLs; sourced photos, citations, schema, search, filters, PROMETEI links; prior atlases intact.");
