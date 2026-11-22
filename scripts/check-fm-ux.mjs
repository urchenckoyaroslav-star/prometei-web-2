// Offline smoke check for seven SEO-rendered PROMETEI FM pages and controls.
// Does not fetch websites, publish music or touch Cloudflare credentials.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('dist');
const locales=['en','uk','ru','de','es','zh','ja'];
const codes={en:'en',uk:'uk',ru:'ru',de:'de',es:'es',zh:'zh-CN',ja:'ja'};
const catalog=JSON.parse(fs.readFileSync('fm-translations.json','utf8'));
const pcSignalCopy="The owner DJ broadcasts one shared PC radio stream when available. Press LISTEN to tune in. After 20 minutes without a PC signal, the official YouTube backup is selected.";
assert.ok(catalog.uk[pcSignalCopy]?.includes('сигнал'), 'missing Ukrainian PC signal explanation');
assert.doesNotMatch(catalog.uk[pcSignalCopy], /[\u3040-\u30ff\u3400-\u9fff]/, 'Ukrainian explanation must not contain Japanese/Chinese script');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
function assertLinks(doc,source){
  const ids=new Set([...doc.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  const links=[...doc.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)];
  assert.ok(links.length>=12,source+' must expose useful navigation links');
  for(const [,href] of links){
    if(href.startsWith('#')) assert.ok(ids.has(href.slice(1)),source+' missing anchor '+href);
    else {
      const url=new URL(href,'https://prometei-web-2.pages.dev/fm');
      assert.ok(['https:','mailto:'].includes(url.protocol),source+' unsafe link '+href);
      // A normal Play Store URI legitimately carries a ?id= query parameter.
      assert.ok(!href.startsWith('javascript:'),source+' invalid link '+href);
    }
  }
  const unsafeTarget=/<a\b(?=[^>]*target="_blank")(?![^>]*rel="[^"]*noopener)[^>]*>/g;
  assert.doesNotMatch(doc,unsafeTarget,source+' should use noopener for new-tab links');
}
for(const lang of locales){
  const rel=lang==='en'?'fm.html':lang+'/fm.html';
  assert.ok(exists(rel),'missing '+rel);
  const html=read(rel);
  assert.match(html,new RegExp('<html lang="'+codes[lang]+'"'),'incorrect lang for '+lang);
  const url='https://prometei-web-2.pages.dev/'+(lang==='en'?'fm':lang+'/fm');
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),'bad canonical '+lang);
  assert.ok(html.includes('hreflang="x-default"'),'missing hreflang '+lang);
  assert.ok(html.includes('id="fm-lang"'),'missing language picker '+lang);
  for(const option of locales)assert.ok(html.includes('value="'+option+'"'),'missing '+option+' option');
  assert.ok(html.includes('id="play-btn"'),'missing Listen button');
  assert.ok(html.includes('id="request-form"'),'missing song request form');
  // The current FM UI shows live source, track details and recent history, not a separate playlist list.
  // Verify real working controls instead of requiring a removed, non-interactive placeholder.
  assert.ok(html.includes('id="listen-heading"'),'missing live radio heading');
  assert.ok(html.includes('id="track-title"'),'missing current-track display');
  assert.ok(html.includes('id="history-list"'),'missing history list');
  assert.ok(html.includes('href="/fm.css"'),'missing FM CSS');
  assert.ok(html.includes('src="/fm-i18n.js"'),'missing client i18n');
  assert.ok(html.includes('src="/fm.js"'),'missing radio player');
  for(const id of ['listen','sources','requests','support','history']){
    assert.ok(html.includes('id="'+id+'"'),'missing destination '+id);
  }
  assertLinks(html,rel);
  assert.ok(Object.keys(catalog[lang]||{}).length>=130,'incomplete '+lang+' catalog');
  if(lang!=='en'){
    const translatedHero=catalog[lang]['YOUR MUSIC.'];
    assert.ok(html.includes(translatedHero),'hero unlocalized '+lang);
    assert.ok(html.includes(catalog[lang]['ARTIST']),'request form unlocalized '+lang);
    assert.ok(html.includes(catalog[lang]['YOUR SONG.']),'requests section unlocalized '+lang);
  }
}
for(const file of ['fm.js','fm.css','fm-pc-websocket.js','fm-donate.js','fm-i18n.js','fm-translations.json','fm-config.json','portfolio.html','portfolio.js']){
 assert.ok(exists(file),'missing static '+file);
}
const css=read('fm.css');
for(const breakpoint of ['max-width:340px','max-width:460px','max-width:760px','pointer:coarse','prefers-reduced-motion:reduce']){
 assert.ok(css.includes(breakpoint),'missing responsive/accessibility rule: '+breakpoint);
}
const portfolio=read('portfolio.html');
assert.match(portfolio,/PROMETEI FM/);
assert.match(portfolio,/https:\/\/prometei-web-2\.pages\.dev\/fm/);
const sitemap=read('sitemap.xml');
for(const lang of locales){
 const uri='https://prometei-web-2.pages.dev/'+(lang==='en'?'fm':lang+'/fm');
 assert.ok(sitemap.includes(uri),'missing sitemap FM route '+lang);
}
console.log('FM UX/SEO/link smoke PASS: 7 locales, responsive controls, assets, anchors and portfolio.');
