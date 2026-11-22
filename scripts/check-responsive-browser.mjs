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
const primary=["/","/news/","/news/signal-adds-defenses-against-screen-reading-agents/","/crypto-atlas/","/crypto-atlas/bitcoin/","/crypto-atlas/proi/","/guides/","/advertise/","/services/","/portfolio","/fm"];
const localized=["/uk/","/ru/","/de/","/es/","/zh/","/ja/","/uk/crypto-atlas/proi/","/ru/crypto-atlas/proi/","/de/crypto-atlas/proi/","/es/crypto-atlas/proi/","/zh/crypto-atlas/proi/","/ja/crypto-atlas/proi/"];
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
  const installBand=document.querySelector(".prometei-install-band");
  const installButton=document.querySelector(".prometei-install-button");
  const installRect=installButton?.getBoundingClientRect();
  return {viewport:width,scrollWidth:document.documentElement.scrollWidth,mainHeading:!!heading,headingVisible:!!heading&&visible(heading),clipped,fontSize:headings?.fontSize||"",hasLang:!!document.documentElement.lang,installVisible:!!installBand&&visible(installBand)&&!!installButton&&visible(installButton),installClip:!!installRect&&(installRect.left<-2||installRect.right>width+2)};
 });
 if(!measurement.mainHeading)failures.push(route+" @"+size.width+": no visible H1");
 if(measurement.scrollWidth>size.width+4)failures.push(route+" @"+size.width+": horizontal document overflow "+measurement.scrollWidth);
 if(measurement.clipped.length)failures.push(route+" @"+size.width+": clipped interactive/heading elements "+JSON.stringify(measurement.clipped));
 if(!measurement.hasLang)failures.push(route+" @"+size.width+": missing html language");
 if(!measurement.installVisible)failures.push(route+" @"+size.width+": universal Google Play install CTA is not visible");
 if(measurement.installClip)failures.push(route+" @"+size.width+": install button is horizontally clipped");
 results.push(route+" "+size.width+"px OK H1="+measurement.mainHeading+" font="+measurement.fontSize+" scroll="+measurement.scrollWidth);
 if((route==="/"||route==="/news/"||route==="/crypto-atlas/"||route==="/crypto-atlas/proi/"||route==="/advertise/")&&(size.width===390||size.width===1440)){
   await page.screenshot({path:path.join(screenshots,(route.replace(/\W/g,"-")||"home")+"-"+size.width+".png"),fullPage:false});
 }
}
try{
 for(const route of primary)for(const size of sizes)await inspect(route,size);
 for(const route of localized)for(const size of [sizes[0],sizes[2],sizes[5]])await inspect(route,size);
 // All about PROI must be findable from main navigation, not buried in Crypto Atlas.
 for(const [lang,home] of [["en","/"],["ru","/ru/"]]){
  await page.setViewportSize({width:390,height:844});
  await page.goto("http://127.0.0.1:"+port+home,{waitUntil:"domcontentloaded"});
  const menu=page.locator("#menu-toggle");
  if(!(await menu.isVisible()))failures.push("Mobile menu toggle missing on "+home);
  else {
   await menu.click();
   const proiLink=page.locator("#mobile-menu .prometei-proi-nav");
   if(!(await proiLink.isVisible()))failures.push("Primary PROI link not visible when mobile menu opens: "+home);
   const href=await proiLink.getAttribute("href");
   const expected="https://prometei-web-2.pages.dev/"+(lang==="en"?"":lang+"/")+"crypto-atlas/proi/";
   if(href!==expected)failures.push("Mobile PROI destination incorrect "+home+": "+href);
  }
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
 if(!(await page.locator(".desktop-nav .prometei-proi-nav").isVisible()))failures.push("Desktop All about PROI link must be visible");
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
 await page.goto("http://127.0.0.1:"+port+"/crypto-atlas/proi/",{waitUntil:"domcontentloaded"});
 const lunarSlider=page.locator("#lp-slider");
 if(await lunarSlider.count()){
  const palette=await page.evaluate(()=>{
   const gold=document.getElementById("lp-issuance-number");
   const green=document.querySelector("#lp-issuance .lp-coin-unit");
   if(!gold||!green)return null;
   const toRgb=el=>(getComputedStyle(el).color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
   return {gold:toRgb(gold),green:toRgb(green),font:getComputedStyle(gold).fontFamily,chartWidth:document.getElementById("lp-emission-chart")?.getBoundingClientRect().width||0};
  });
  if(!palette)failures.push("PROI financial display has no distinct numeral/unit markup");
  else {
   if(!(palette.gold[0]>palette.gold[1] && palette.gold[1]>palette.gold[2]))failures.push("PROI amount must display in a warm gold color: "+palette.gold);
   if(!(palette.green[1]>palette.green[0] && palette.green[1]>palette.green[2]))failures.push("PROI currency symbol must display in green: "+palette.green);
   if(palette.chartWidth<180)failures.push("Cumulative chart collapsed inside stat grid");
  }
  // Avoid dependence on today's lunar phase: select known positions explicitly.
  await lunarSlider.evaluate(el=>{el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}))});
  const first=(await page.locator("#lp-issuance").innerText()).trim();
  await lunarSlider.evaluate(el=>{el.value="14.76";el.dispatchEvent(new Event("input",{bubbles:true}))});
  const second=(await page.locator("#lp-issuance").innerText()).trim();
  if(!first.startsWith("0")||!second.includes("4")&&!second.includes("5"))failures.push("Lunar Pulse threshold totals incorrect: "+first+" -> "+second);
  if(await page.locator(".lp-milestone").count()!==20)failures.push("Expected twenty official lunar milestone buttons");
  const trace=await page.locator("#lp-chart-trace").getAttribute("d");
  if(!trace||trace.split("V").length<19)failures.push("Cumulative PROI chart missing twenty stepped reward changes");
  const cursorStart=await page.locator("#lp-chart-point").getAttribute("cx");
  await lunarSlider.evaluate(el=>{el.value="22.14";el.dispatchEvent(new Event("input",{bubbles:true}))});
  await page.waitForTimeout(100);
  const cursorNext=await page.locator("#lp-chart-point").getAttribute("cx");
  if(!(Number(cursorNext)>Number(cursorStart)))failures.push("Chart crosshair not following lunar slider: "+cursorStart+" -> "+cursorNext);
  await page.locator(".lp-milestone").last().click();
  const full=(await page.locator("#lp-issuance").innerText()).trim();
  if(!full.includes("6"))failures.push("Expected six possible PROI per completed lunar cycle: "+full);
  const lunarGrid=await page.locator(".lp-date-button").count();
  if(lunarGrid<28||lunarGrid>31)failures.push("Moon calendar did not render valid month: "+lunarGrid);
  await page.locator("#lp-month-next").click();
  const nextCount=await page.locator(".lp-date-button").count();
  if(nextCount<28||nextCount>31)failures.push("Next-month calendar button failed: "+nextCount);
  // Waxing Android default is 10%, waning default 15%, both 50% burn / 50% Vault.
  await lunarSlider.evaluate(el=>{el.value="7.38";el.dispatchEvent(new Event("input",{bubbles:true}))});
  await page.locator("#lp-transfer").fill("2000");
  let fee=(await page.locator("#lp-fee-total").innerText()).replace(/[^0-9.]/g,"");
  if(Math.abs(Number(fee)-200)>0.001)failures.push("PROI waxing ROOT source-default fee mismatch: "+fee);
  await lunarSlider.evaluate(el=>{el.value="22.14";el.dispatchEvent(new Event("input",{bubbles:true}))});
  fee=(await page.locator("#lp-fee-total").innerText()).replace(/[^0-9.]/g,"");
  const burn=(await page.locator("#lp-fee-burn").innerText()).replace(/[^0-9.]/g,"");
  const vault=(await page.locator("#lp-fee-network").innerText()).replace(/[^0-9.]/g,"");
  if(Math.abs(Number(fee)-300)>0.001||Math.abs(Number(burn)-150)>0.001||Math.abs(Number(vault)-150)>0.001)failures.push("PROI waning fee/burn/Vault mismatch: "+fee+"/"+burn+"/"+vault);
  await page.locator(".lp-date-button").first().click();
  if(!(await page.locator("#lp-selected-date").innerText()).trim())failures.push("Moon calendar selection did not update date");
 }else failures.push("Moon slider absent on actual page");
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
