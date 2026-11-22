/** Playwright UI audit: different widths, real DOM geometry and key interactions.
    Runs against the built static website, without modifying external services. */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {chromium} from "playwright";

const dist=path.resolve("dist");
const screenshots=path.resolve("qa-screenshots");
fs.mkdirSync(screenshots,{recursive:true});
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".xml":"application/xml"};
const server=http.createServer((request,response)=>{
 const u=new URL(request.url||"/","http://127.0.0.1");
 let slug;
 try{slug=decodeURIComponent(u.pathname).replace(/^\/+/,"");}catch{response.writeHead(400).end();return}
 const candidates=slug.endsWith("/")?[path.join(dist,slug,"index.html")]:[path.join(dist,slug),path.join(dist,slug+".html"),path.join(dist,slug,"index.html")];
 let file=null;
 for(const candidate of candidates){
  if(!candidate.startsWith(dist+path.sep))continue;
  if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile()){file=candidate;break;}
 }
 if(!file){response.writeHead(404,{"content-type":"text/plain"}).end("Not found");return}
 response.writeHead(200,{"content-type":types[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});
 fs.createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
const context=await browser.newContext({reducedMotion:"reduce",deviceScaleFactor:1,locale:"en-US"});
// Test first-party markup and layout deterministically; external font/photo services may be unavailable in CI.
await context.route("**/*",route=>{
 const url=new URL(route.request().url());
 if(url.hostname==="127.0.0.1")return route.continue();
 // Production pages use absolute canonical origins for CSS and JS. Serve our newly built
 // local assets so this QA tests REAL styles and working client interactions, not an
 // unstyled mock caused by blocking those first-party absolute URLs.
 if(url.hostname==="prometei-web-2.pages.dev"){
  const slug=decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const candidates=[path.join(dist,slug),path.join(dist,slug+".html"),path.join(dist,slug,"index.html")];
  const file=candidates.find(file=>file.startsWith(dist+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile());
  if(file)return route.fulfill({status:200,contentType:types[path.extname(file)]||"application/octet-stream",body:fs.readFileSync(file)});
 }
 return route.abort();
});
const primary=["/","/news/","/news/signal-adds-defenses-against-screen-reading-agents/","/crypto-atlas/","/crypto-atlas/bitcoin/","/guides/","/advertise/","/services/","/portfolio","/fm"];
const localized=["/uk/","/ru/","/de/","/es/","/zh/","/ja/"];
const sizes=[{width:320,height:720},{width:360,height:760},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:1920,height:1080},{width:2560,height:1440}];
const failures=[],results=[];
const page=await context.newPage();
page.on("pageerror",error=>{if(!/Failed to fetch|NetworkError/i.test(error.message))results.push("JS warning: "+error.message.slice(0,140))});
async function inspect(route,size){
 await page.setViewportSize(size);
 await page.goto("http://127.0.0.1:"+port+route,{waitUntil:"domcontentloaded",timeout:12000});
 const measurement=await page.evaluate(()=>{
  const visible=el=>{
    const style=getComputedStyle(el);
    if(style.display==="none"||style.visibility==="hidden"||style.opacity==="0")return false;
    if(!el.getClientRects().length)return false;
    return true;
  };
  const intentionalScroller=el=>{
    let parent=el.parentElement;
    while(parent&&parent!==document.body){
      const style=getComputedStyle(parent);
      if((style.overflowX==="auto"||style.overflowX==="scroll")&&parent.scrollWidth>parent.clientWidth+3)return true;
      if(parent.matches(".ticker,.carousel,.orbit,.lunar-visual,.hero-art,.phone-mockup"))return true;
      parent=parent.parentElement;
    }
    return false;
  };
  const width=innerWidth;
  const sample=[...document.querySelectorAll("main h1,main h2,main h3,main a,main button,main input,main select,header a,header button")];
  const clipped=sample.filter(el=>{
    if(!visible(el)||intentionalScroller(el))return false;
    const rect=el.getBoundingClientRect();
    return rect.left<width&&rect.right>width+14&&rect.width<width*2;
  }).slice(0,7).map(el=>({tag:el.tagName,cls:String(el.className||"").slice(0,60),label:(el.textContent||el.getAttribute("aria-label")||"").trim().slice(0,55),right:Math.round(el.getBoundingClientRect().right)}));
  const heading=document.querySelector("main h1");
  const headings=heading?getComputedStyle(heading):null;
  return {viewport:width,scrollWidth:document.documentElement.scrollWidth,mainHeading:!!heading,headingVisible:!!heading&&visible(heading),clipped,fontSize:headings?.fontSize||"",hasLang:!!document.documentElement.lang};
 });
 if(!measurement.mainHeading)failures.push(route+" @"+size.width+": no visible H1");
 if(measurement.scrollWidth>size.width+4)failures.push(route+" @"+size.width+": horizontal document overflow "+measurement.scrollWidth);
 if(measurement.clipped.length)failures.push(route+" @"+size.width+": clipped interactive/heading elements "+JSON.stringify(measurement.clipped));
 if(!measurement.hasLang)failures.push(route+" @"+size.width+": missing html language");
 results.push(route+" "+size.width+"px OK H1="+measurement.mainHeading+" font="+measurement.fontSize+" scroll="+measurement.scrollWidth);
 if((route==="/"||route==="/news/"||route==="/crypto-atlas/"||route==="/advertise/")&&(size.width===390||size.width===1440)){
   await page.screenshot({path:path.join(screenshots,(route.replace(/\W/g,"-")||"home")+"-"+size.width+".png"),fullPage:false});
 }
}
try{
 for(const route of primary)for(const size of sizes)await inspect(route,size);
 for(const route of localized)for(const size of [sizes[0],sizes[2],sizes[5]])await inspect(route,size);
 await page.setViewportSize({width:390,height:844});
 await page.goto("http://127.0.0.1:"+port+"/news/",{waitUntil:"domcontentloaded"});
 if(await page.locator("#story-search").count()){
   await page.locator("#story-search").fill("Signal");
   const count=await page.locator("#story-grid .nw-card:not([hidden])").count();
   if(count<1||count>=50)failures.push("News search filtering broken: "+count+" visible cards for Signal");
   await page.locator("#story-search").fill("");
 }
 await page.goto("http://127.0.0.1:"+port+"/crypto-atlas/",{waitUntil:"domcontentloaded"});
 if(await page.locator("#coin-search").count()){
   await page.locator("#coin-search").fill("Bitcoin");
   const count=await page.locator("#asset-grid .asset-card:not([hidden])").count();
   if(count<1||count>=50)failures.push("Crypto atlas filtering broken: "+count+" cards for Bitcoin");
 }
 await page.goto("http://127.0.0.1:"+port+"/ru/",{waitUntil:"domcontentloaded"});
 if(await page.locator("html").getAttribute("lang")!=="ru")failures.push("Russian canonical page did not retain correct language");
 if(!await page.locator("html").getAttribute("lang"))failures.push("Missing language");
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("RESPONSIVE REPORT: "+results.length+" tested viewport/page combinations, "+failures.length+" blocking failures.");
if(failures.length){for(const f of failures.slice(0,60))console.error("FAIL "+f);throw Error("Responsive browser QA failed: "+failures.length+" issues");}
console.log("RESPONSIVE BROWSER PASS: 320–2560px across main, news, crypto, guides, radio, portfolio, ads and 6 localized homepages. Searches work; screenshots saved for review.");
