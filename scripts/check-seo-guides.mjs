/** Sanity checks for the multilingual search knowledge hub. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=path.resolve("dist");
const data=JSON.parse(fs.readFileSync("guides-data.json","utf8"));
assert.equal(data.guides.length,9,"there must be nine original guides");
assert.equal(new Set(data.guides.map(x=>x.slug)).size,9,"guide slugs must be unique");
for(const group of ["bluetooth","wifi","internet"])assert.equal(data.guides.filter(x=>x.group===group).length,3,"each transport must have three guides");
const xml=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const base=process.env.SITE_URL||"https://prometei-web-2.pages.dev/";
let checked=0;
for(const lang of ["en","ru"]){
  const prefix=lang==="ru"?"ru/":"";
  for(const g of [null,...data.guides]){
    const url=base+prefix+"guides/"+(g?g.slug+"/":"");
    const rel=prefix+"guides/"+(g?g.slug+"/":"")+"index.html";
    const file=path.join(root,rel);
    assert.ok(fs.existsSync(file),"missing generated page: "+rel);
    const html=fs.readFileSync(file,"utf8");
    assert.ok(html.includes('<html lang="'+lang+'">'),"incorrect HTML language: "+rel);
    assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),"incorrect canonical: "+rel);
    assert.ok(html.includes('name="description"'),"missing metadata: "+rel);
    assert.ok(html.includes('application/ld+json'),"missing structured data: "+rel);
    const other=base+(lang==="en"?"ru/":"")+"guides/"+(g?g.slug+"/":"");
    assert.ok(html.includes('hreflang="'+(lang==="en"?"ru":"en")+'" href="'+other+'"'),"missing reciprocal alternate: "+rel);
    assert.ok(xml.includes("<loc>"+url+"</loc>"),"URL absent from generated sitemap: "+rel);
    assert.ok(html.includes("Google Play"),"missing cross-link to app: "+rel);
    if(g){assert.ok(html.includes(g[lang][0]),"article H1 content missing: "+rel);assert.ok(html.includes('href="'+base+'fm"'),"missing FM ecosystem link: "+rel)}
    checked++;
  }
}
const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
const russian=fs.readFileSync(path.join(root,"ru/index.html"),"utf8");
assert.ok(home.includes('href="/guides/"'),"home page does not link to guide hub");
assert.ok(russian.includes('href="/ru/guides/"'),"Russian home does not link to Russian guide hub");
assert.ok(fs.readFileSync(path.join(root,"portfolio.html"),"utf8").includes('href="/guides/"'),"portfolio cross-link missing");
assert.ok(fs.readFileSync(path.join(root,"fm.html"),"utf8").includes('href="/guides/"'),"radio cross-link missing");
assert.ok(fs.readFileSync(path.join(root,"robots.txt"),"utf8").includes("sitemap.xml"),"robots sitemap missing");
console.log("SEO PASS: "+checked+" bilingual guide URLs, structured metadata, internal links and sitemap.");
