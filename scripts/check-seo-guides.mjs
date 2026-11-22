/** PROMETEI seven-language science atlas smoke tests. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=path.resolve("dist");
const data=JSON.parse(fs.readFileSync("guides-data.json","utf8"));
const languages=["en","uk","ru","de","es","zh","ja"];
const langTags={en:"en",uk:"uk",ru:"ru",de:"de",es:"es",zh:"zh-CN",ja:"ja"};
const site=(process.env.SITE_URL||"https://prometei-web-2.pages.dev/").replace(/\/?$/,"/");
assert.equal(data.guides.length,9);
assert.equal(new Set(data.guides.map(g=>g.slug)).size,9);
for(const group of ["bluetooth","wifi","internet"]){
 assert.equal(data.guides.filter(g=>g.group===group).length,3);
 const archive=JSON.parse(fs.readFileSync("guides-history-"+group+".json","utf8"));
 assert.ok(archive.sources.length>=2,"missing documented primary sources");
 for(const lang of languages)assert.ok(archive.languages[lang]?.history && archive.languages[lang]?.science && archive.languages[lang]?.future,"history must be translated: "+group+"/"+lang);
}
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
let checked=0;
for(const lang of languages){
 const prefix=lang==="en"?"":lang+"/";
 if(!["en","ru"].includes(lang)){
  const locale=JSON.parse(fs.readFileSync("guides-"+lang+".json","utf8"));
  assert.equal(locale.titles.length,9);
  assert.equal(locale.intros.length,9);
  assert.equal(locale.focus.length,9);
  assert.ok(locale.focus.every(f=>f.length>(lang==="zh"?110:lang==="ja"?115:150)),"insufficient translated science: "+lang);
 }
 for(const guide of [null,...data.guides]){
  const suffix="guides/"+(guide?guide.slug+"/":"");
  const rel=prefix+suffix+"index.html";
  const url=site+prefix+suffix;
  const file=path.join(root,rel);
  assert.ok(fs.existsSync(file),"missing "+rel);
  const html=fs.readFileSync(file,"utf8");
  assert.ok(html.includes('<html lang="'+langTags[lang]+'">'),"HTML language missing: "+rel);
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),"canonical mismatch: "+rel);
  assert.ok(html.includes('<meta name="description"'),"description missing: "+rel);
  assert.ok(html.includes('application/ld+json'),"schema missing: "+rel);
  assert.ok(sitemap.includes("<loc>"+url+"</loc>"),"sitemap URL missing: "+url);
  for(const other of languages){
   const alternate=site+(other==="en"?"":other+"/")+suffix;
   assert.ok(html.includes('hreflang="'+langTags[other]+'" href="'+alternate+'"'),"missing "+other+" alternate in "+rel);
   assert.ok(sitemap.includes('hreflang="'+langTags[other]+'" href="'+alternate+'"'),"missing sitemap hreflang: "+alternate);
  }
  assert.ok(html.includes("Google Play"),"app link missing: "+rel);
  assert.ok(html.includes('class="language-switch"'),"language switch missing: "+rel);
  if(guide){
   assert.ok(html.includes('class="historical-timeline"'),"timeline missing "+rel);
   assert.ok(html.includes('class="signal-stage"'),"signal diagram missing "+rel);
   assert.ok(html.includes('id="sources"'),"sources missing "+rel);
   assert.ok(html.includes('id="future"'),"roadmap missing "+rel);
   assert.ok(html.includes("bluetooth.com")||html.includes("ieee")||html.includes("internetsociety"),"first-party references missing "+rel);
  }
  checked++;
 }
}
assert.equal(checked,70,"Expected 7 libraries and 63 articles");
assert.ok(fs.readFileSync(path.join(root,"index.html"),"utf8").includes('href="/guides/"'));
for(const lang of languages.filter(l=>l!=="en")){
 assert.ok(fs.readFileSync(path.join(root,lang,"index.html"),"utf8").includes('href="/'+lang+'/guides/"'),"localized home link missing: "+lang);
}
assert.ok(fs.readFileSync(path.join(root,"portfolio.html"),"utf8").includes('href="/guides/"'));
assert.ok(fs.readFileSync(path.join(root,"fm.html"),"utf8").includes('href="/guides/"'));
assert.ok(fs.readFileSync(path.join(root,"robots.txt"),"utf8").includes("sitemap.xml"));
console.log("SEO SCIENCE PASS: "+checked+" pages, 7 languages, 9 unique topics, timelines, sources, hreflang and sitemap.");
