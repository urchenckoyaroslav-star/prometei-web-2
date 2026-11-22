#!/usr/bin/env node
/**
 * PROMETEI live search-engine accessibility health check.
 * No credentials or private user data. Requests the publicly deployed site only.
 * Spoofed Googlebot UA is a compatibility probe, NOT verified Googlebot IP access.
 * Google Search Console is the only authority for actual indexing.
 */
import fs from "node:fs";
import assert from "node:assert/strict";

const base=new URL((process.env.SITE_URL||"https://prometei-web-2.pages.dev/").replace(/\/?$/,"/"));
const now=new Date().toISOString();
const agent="Googlebot/2.1 (+http://www.google.com/bot.html)";
const results=[];
let failures=0;

async function retrieve(resource,expected,kind="html"){
  const url=new URL(resource,base);
  let last;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(url,{
        method:"GET",
        redirect:"follow",
        headers:{"User-Agent":agent,"Accept":kind==="xml"?"application/xml,text/xml;q=0.9,*/*;q=0.8":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"},
        signal:AbortSignal.timeout(16000)
      });
      const contentType=response.headers.get("content-type")||"";
      const robotsTag=response.headers.get("x-robots-tag")||"";
      const content=await response.text();
      const entry={resource,url:url.href,status:response.status,contentType,robotsTag,finalUrl:response.url,bytes:content.length};
      const issues=[];
      if(response.status!==200)issues.push("HTTP "+response.status);
      if(new URL(response.url).origin!==base.origin)issues.push("Redirected off expected origin");
      if(/(?:^|[,\s])noindex(?:[,\s]|$)/i.test(robotsTag))issues.push("X-Robots-Tag noindex");
      if(/cloudflare.+(?:checking your browser|attention required)|cf-browser-verification|just a moment|enable javascript and cookies/i.test(content.slice(0,1600)))issues.push("Potential bot/challenge HTML");
      if(kind==="xml"){
        if(!/(?:xml|text\/plain)/i.test(contentType))issues.push("Sitemap Content-Type is not XML");
        if(!/<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(content))issues.push("Invalid XML sitemap root");
        if(!/<loc>https:\/\//.test(content))issues.push("No absolute URLs in sitemap");
        entry.urls=[...content.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll("&amp;","&"));
        if(entry.urls.length<expected)issues.push("Expected at least "+expected+" sitemap URLs, got "+entry.urls.length);
        if(new Set(entry.urls).size!==entry.urls.length)issues.push("Duplicate XML sitemap URL");
        entry.sampleURLs=entry.urls.slice(0,3);
      }else if(kind==="robots"){
        if(!/User-agent:\s*\*/i.test(content)||!/Allow:\s*\//i.test(content))issues.push("Missing open crawl instructions");
        for(const loc of [new URL("sitemap.xml",base).href,new URL("sitemap-fm.xml",base).href])
          if(!content.includes("Sitemap: "+loc))issues.push("Missing sitemap declaration "+loc);
        if(/Disallow:\s*\/\s*$/im.test(content))issues.push("Root crawl blocked by robots.txt");
      }else{
        if(!/text\/html/i.test(contentType))issues.push("HTML Content-Type mismatch");
        if(!/<title>[\s\S]*?<\/title>/i.test(content))issues.push("No HTML title");
        if(!/<h1\b/i.test(content))issues.push("No H1");
        if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(content))issues.push("HTML noindex");
        const canonical=content.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)["']/i)?.[1];
        if(!canonical)issues.push("Missing canonical");
        else if(new URL(canonical,base).origin!==base.origin)issues.push("Canonical points off-domain");
        if(expected&&typeof expected==="string"&&canonical&&canonical!==expected)issues.push("Unexpected canonical "+canonical);
      }
      entry.issues=issues;
      results.push(entry);
      if(issues.length)failures++;
      process.stdout.write((issues.length?"FAIL":"PASS")+" "+resource+" "+entry.status+" "+entry.contentType+(issues.length?" :: "+issues.join(" | "):"")+"\n");
      return {content,entry};
    }catch(error){
      last=error;
      if(attempt===0)continue;
    }
  }
  const entry={resource,url:url.href,issues:["Fetch failed: "+String(last)]};
  results.push(entry);failures++;process.stdout.write("FAIL "+resource+": "+entry.issues[0]+"\n");
  return {content:"",entry};
}

await retrieve("/robots.txt",0,"robots");
const main=await retrieve("/sitemap.xml",190,"xml");
await retrieve("/sitemap-fm.xml",7,"xml");
const samples=["/","/ru/","/uk/","/de/","/es/","/zh/","/ja/","/crypto-atlas/proi/","/ru/crypto-atlas/proi/","/guides/","/crypto-atlas/","/news/","/site-map/","/fm"];
for(const route of samples){
 const expected=new URL(route,base).href;
 await retrieve(route,expected,"html");
}
if(main.entry.urls){
 for(const route of samples){
  const url=new URL(route,base).href;
  if(!main.entry.urls.includes(url)){
    failures++;
    results.push({resource:route,issues:["Key URL missing from XML sitemap: "+url]});
  }
 }
}
const report={date:now,origin:base.origin,checks:results.length,failed:failures,results,
  disclaimer:"Googlebot user-agent request is not proof of real Googlebot IP access or Search Console indexing. Check Search Console URL Inspection for the source of truth."};
fs.writeFileSync("seo-health-report.json",JSON.stringify(report,null,2)+"\n");
console.log("PROMETEI SEARCH ACCESS HEALTH: "+results.length+" checks, "+failures+" failures");
if(failures)process.exitCode=1;
