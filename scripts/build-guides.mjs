/** Build crawlable bilingual educational guides without runtime dependencies. */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const catalog=JSON.parse(fs.readFileSync(path.join(root,"guides-data.json"),"utf8"));
const guides=catalog.guides;
const groups=["bluetooth","wifi","internet"];
const labels={
  en:{guides:"Connection guides",home:"Home",fm:"PROMETEI FM",portfolio:"Portfolio",all:"All articles",bluetooth:"Bluetooth",wifi:"Local Wi-Fi",internet:"Internet & Mixed",back:"All guides",play:"Get PROMETEI for Android",more:"Read guide",toc:"On this page",related:"Related articles",note:"Important",notice:"Availability depends on devices, permissions and the installed release. PROMETEI is not an emergency communications service.",updated:"Updated 22 November 2026",language:"Русская версия",indexTitle:"How Messaging Works: Bluetooth, Wi-Fi and Internet",indexDesc:"Nine practical PROMETEI guides: Bluetooth messages without Internet, local Wi-Fi and LAN, Mixed transport, SIM-free use and messenger comparisons.",indexIntro:"Learn what really happens between Android phones. Three explainers per connection family, practical checks and honest limits—without myths about unlimited offline range.",how:"Two-phone testing guide"},
  ru:{guides:"Энциклопедия связи",home:"Главная",fm:"Прометей ФМ",portfolio:"Портфолио",all:"Все статьи",bluetooth:"Bluetooth",wifi:"Локальный Wi-Fi",internet:"Интернет и Mixed",back:"Все статьи",play:"Установить PROMETEI",more:"Читать",toc:"Содержание",related:"Читайте также",note:"Важно",notice:"Работа зависит от устройств, разрешений и установленной версии. PROMETEI не заменяет экстренную связь.",updated:"Обновлено 22 ноября 2026",language:"Read in English",indexTitle:"Как работают мессенджеры: Bluetooth, Wi-Fi и интернет",indexDesc:"Девять статей о PROMETEI: мессенджер без SIM, Bluetooth, локальный Wi-Fi без интернета, смешанная связь, звонки и сравнение с Telegram.",indexIntro:"Разбираем технологии связи простыми словами. По три статьи про Bluetooth, локальный Wi-Fi и интернет: что реально работает, как проверить и какие есть ограничения.",how:"Проверка на двух телефонах"}
};
function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function jsonLd(data){return JSON.stringify(data).replace(/</g,"\\u003c")}

const locales=["en","uk","ru","de","es","zh","ja"];
const languageNames={en:"English",uk:"Українська",ru:"Русский",de:"Deutsch",es:"Español",zh:"简体中文",ja:"日本語"};
const languageCodes={en:"en",uk:"uk",ru:"ru",de:"de",es:"es",zh:"zh-CN",ja:"ja"};
const scienceTitles={
 en:{history:"How it began",science:"The science behind the signal",today:"From laboratories to today's phones",future:"PROMETEI: next research goals",focus:"Inside this use case",sources:"Primary sources & further reading",timeline:"Milestones",diagram:"Conceptual transport diagram — not a live connection",readTime:"Science & engineering",what:"Verified history versus product plans"},
 ru:{history:"Как всё начиналось",science:"Физика и устройство связи",today:"От лабораторий к современным телефонам",future:"Планы исследований PROMETEI",focus:"Разбираем этот сценарий",sources:"Первоисточники и материалы",timeline:"Ключевые даты",diagram:"Схема принципа связи — не работающий канал",readTime:"Наука и инженерия",what:"История, действительность и планы"},
 uk:{history:"З чого все почалося",science:"Фізика та принцип зв’язку",today:"Від лабораторій до смартфонів",future:"Напрямки досліджень PROMETEI",focus:"Докладніше про сценарій",sources:"Першоджерела",timeline:"Важливі дати",diagram:"Умовна схема зв’язку, не активне підключення",readTime:"Наука та інженерія",what:"Історія і плани розвитку"},
 de:{history:"Wie alles begann",science:"Die Physik hinter dem Signal",today:"Vom Labor zum Smartphone",future:"PROMETEI: Forschungsziele",focus:"Der konkrete Anwendungsfall",sources:"Originalquellen",timeline:"Meilensteine",diagram:"Konzeptionelle Verbindung, keine Live-Verbindung",readTime:"Wissenschaft und Technik",what:"Geschichte und Entwicklungspläne"},
 es:{history:"Cómo empezó todo",science:"La ciencia de la señal",today:"Del laboratorio al móvil",future:"PROMETEI: objetivos futuros",focus:"Este caso en detalle",sources:"Fuentes originales",timeline:"Hitos históricos",diagram:"Diagrama conceptual, no conexión en vivo",readTime:"Ciencia e ingeniería",what:"Hechos históricos y proyectos"},
 zh:{history:"技术的起点",science:"信号背后的科学",today:"从实验室到智能手机",future:"PROMETEI 的未来研究方向",focus:"具体场景解析",sources:"原始资料与参考文献",timeline:"历史时间线",diagram:"原理示意图，并非实时连接",readTime:"科学与工程",what:"历史事实与未来计划"},
 ja:{history:"技術の始まり",science:"通信を支える科学",today:"研究室からスマートフォンへ",future:"PROMETEIの今後の研究目標",focus:"利用場面を詳しく",sources:"一次資料と参考文献",timeline:"主な出来事",diagram:"通信の概念図。実際の接続ではありません",readTime:"科学と技術",what:"歴史と開発計画"}
};
const supplemental=Object.fromEntries(locales.filter(l=>!["en","ru"].includes(l)).map(l=>[l,JSON.parse(fs.readFileSync(path.join(root,"guides-"+l+".json"),"utf8"))]));
for(const lang of Object.keys(supplemental))labels[lang]=supplemental[lang].labels;
const histories=Object.fromEntries(groups.map(group=>[group,JSON.parse(fs.readFileSync(path.join(root,"guides-history-"+group+".json"),"utf8"))]));
const timelineI18n=JSON.parse(fs.readFileSync(path.join(root,"guides-timeline-i18n.json"),"utf8"));
function groupGuides(group){return guides.filter(g=>g.group===group)}
function topicIndex(g){return guides.indexOf(g)}
function topic(g,lang){if(g[lang])return {title:g[lang][0],description:g[lang][1],intro:g[lang][2],sections:g[lang][3]};
 const d=supplemental[lang],i=topicIndex(g);
 if(!d||i<0)throw Error("Missing translation for "+g.slug+" "+lang);
 return {title:d.titles[i],description:d.intros[i].slice(0,210),intro:d.intros[i],sections:[[scienceTitles[lang].focus,d.focus[i]]]};
}
function slugURL(base,lang,slug){return base+(lang==="en"?"":lang+"/")+"guides/"+(slug?slug+"/":"")}
function langSwitch(base,lang,active){let items=locales.map(l=>'<a '+(l===lang?'aria-current="true"':'')+' lang="'+languageCodes[l]+'" hreflang="'+languageCodes[l]+'" href="'+esc(slugURL(base,l,active==="guides"?"":active))+'">'+languageNames[l]+'</a>').join("");
 return '<details class="language-switch"><summary aria-label="Choose language">'+languageNames[lang]+' <span aria-hidden="true">⌄</span></summary><div class="language-options">'+items+'</div></details>'
}
function tagHeader(base,lang,active){const t=labels[lang];const home=base+(lang==="en"?"":lang+"/");
 return '<header class="header"><div class="header-inner container"><a class="brand" href="'+esc(home)+'"><img src="'+esc(base)+'assets/mark.svg" width="36" height="36" alt=""><span>PROMETEI<small>MESSENGER · SCIENCE ATLAS</small></span></a><nav class="nav" aria-label="Main"><a href="'+esc(home)+'">'+t.home+'</a><a href="'+esc(slugURL(base,lang))+'" aria-current="'+(active==="guides"?"page":"false")+'">'+t.guides+'</a><a href="'+esc(base)+'portfolio">'+t.portfolio+'</a><a href="'+esc(base+(lang==="en"?"fm":lang+"/fm"))+'">'+t.fm+'</a>'+langSwitch(base,lang,active)+'</nav></div></header>'
}
function fontURL(lang){const family=lang==="zh"?"Noto+Sans+SC:wght@400;500;700":lang==="ja"?"Noto+Sans+JP:wght@400;500;700":"Manrope:wght@400;500;600;700;800";
 return "https://fonts.googleapis.com/css2?family="+family+"&display=swap";
}
function frame({base,lang,url,title,desc,body,active,article}){const t=labels[lang],others=locales.map(l=>'<link rel="alternate" hreflang="'+languageCodes[l]+'" href="'+esc(slugURL(base,l,active==="guides"?"":active))+'">').join("");
 const canonicalEnglish=slugURL(base,"en",active==="guides"?"":active);
 const history=article?histories[article.group]:null;
 const metadata={"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":base+"#organization","name":"PROMETEI","url":base,"sameAs":["https://play.google.com/store/apps/details?id=com.meshnetwork.app"]},{"@type":article?"TechArticle":"CollectionPage","headline":title,"name":title,"description":desc,"inLanguage":languageCodes[lang],"url":url,"datePublished":catalog.updated,"dateModified":catalog.updated,"author":{"@id":base+"#organization"},"publisher":{"@id":base+"#organization"},...(article?{citation:history.sources.map(s=>s[1])}:{})},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":t.home,"item":base},{"@type":"ListItem","position":2,"name":t.guides,"item":slugURL(base,lang)}].concat(article?[{"@type":"ListItem","position":3,"name":title,"item":url}]:[])}]};
 return '<!doctype html><html lang="'+languageCodes[lang]+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080d18"><meta name="robots" content="index,follow,max-image-preview:large"><title>'+esc(title)+' | PROMETEI</title><meta name="description" content="'+esc(desc.slice(0,220))+'"><link rel="canonical" href="'+esc(url)+'">'+others+'<link rel="alternate" hreflang="x-default" href="'+esc(canonicalEnglish)+'"><meta property="og:type" content="'+(article?"article":"website")+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(url)+'"><meta property="og:image" content="'+esc(base)+'assets/og-cover.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="'+esc(base)+'assets/mark.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="'+esc(fontURL(lang))+'"><link rel="stylesheet" href="'+esc(base)+'guides.css"><script type="application/ld+json">'+jsonLd(metadata)+'</script><script defer src="'+esc(base)+'guides.js"></script></head><body><a class="skip" href="#main">Skip to content</a><div class="stars" aria-hidden="true"></div><div id="read-progress" aria-hidden="true"></div>'+tagHeader(base,lang,active)+body+'<footer class="footer"><div class="footer-inner container"><div><strong>PROMETEI · BEYOND THE SIGNAL</strong><p>'+esc(t.notice)+'</p></div><nav class="footer-links" aria-label="Footer"><a href="'+esc(base)+'how-it-works">'+esc(t.how)+'</a><a href="'+esc(base)+'portfolio">'+esc(t.portfolio)+'</a><a href="'+esc(base)+'fm">'+esc(t.fm)+'</a><a href="https://play.google.com/store/apps/details?id=com.meshnetwork.app" target="_blank" rel="noopener noreferrer">Google Play ↗</a></nav></div></footer></body></html>'
}
function articleCard(base,lang,g){const a=topic(g,lang),t=labels[lang],url=slugURL(base,lang,g.slug);
 return '<a class="article-card reveal" data-group="'+g.group+'" href="'+esc(url)+'"><span class="tag">'+esc(t[g.group])+' · PROMETEI</span><h2>'+esc(a.title)+'</h2><p>'+esc(a.description)+'</p><span class="arrow">'+t.more+' ↗</span></a>'
}
function indexPage(base,lang){const t=labels[lang],url=slugURL(base,lang),count=guides.length;
 const buttons=['all',...groups].map((group,i)=>'<button type="button" class="filter" data-filter="'+group+'" aria-pressed="'+(i===0?'true':'false')+'">'+esc(t[group])+'</button>').join("");
 const body='<main id="main"><div class="hero container"><div class="reveal"><span class="kicker">PROMETEI / SIGNAL LAB · 1969—2026</span><h1 class="gradient">'+esc(t.indexTitle)+'</h1><p class="lede">'+esc(t.indexIntro)+'</p><div class="cta-group"><a class="button button-primary" href="https://play.google.com/store/apps/details?id=com.meshnetwork.app" target="_blank" rel="noopener noreferrer">'+t.play+' ↗</a><a class="button button-ghost" href="'+esc(base)+'how-it-works">'+t.how+' ↗</a></div></div><div class="diagram" aria-hidden="true"><span class="orb a"></span><span class="orb b"></span><span class="orb c"></span><div class="hub">✦<span>BT · LAN · NET</span></div></div></div><section class="container" aria-label="'+esc(t.guides)+'"><div class="divider"></div><span class="kicker">'+count+' ARTICLES / 03 MODES / 07 LANGUAGES</span><h2 class="section-title">'+esc(t.guides)+'</h2><div class="filters" role="group" aria-label="'+esc(t.guides)+'">'+buttons+'</div><div class="grid">'+guides.map(g=>articleCard(base,lang,g)).join("")+'</div></section></main>';
 return frame({base,lang,url,title:t.indexTitle,desc:t.indexDesc,body,active:"guides"});
}
function playStoreLink(lang, campaign) {
 const url = new URL('https://play.google.com/store/apps/details?id=com.meshnetwork.app');
 const referrer = new URLSearchParams({
  utm_source: 'prometei_web',
  utm_medium: 'organic_web',
  utm_campaign: campaign,
  utm_content: lang
 });
 url.searchParams.set('referrer', referrer.toString());
 return esc(url.href);
}
function articlePage(base,lang,g){const a=topic(g,lang),t=labels[lang],j=scienceTitles[lang],url=slugURL(base,lang,g.slug),history=histories[g.group],h=history.languages[lang];
 const sourceLinks=history.sources.map(([name,href])=>'<li><a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+' ↗</a></li>').join("");
 const milestones=history.timeline.map(([year,event],i)=>'<li><span class="milestone-date">'+year+'</span><span class="milestone-dot" aria-hidden="true"></span><span class="milestone-label">'+esc(timelineI18n[g.group][lang][i]||event)+'</span></li>').join("");
 const sec=[
 {id:"story",title:j.history,content:'<p>'+esc(h.history)+'</p><div class="historical-timeline" aria-label="'+esc(j.timeline)+'"><ol>'+milestones+'</ol></div>'},
 {id:"physics",title:j.science,content:'<p>'+esc(h.science)+'</p>'},
 ...a.sections.map((s,i)=>({id:"section-"+i,title:s[0],content:'<p>'+esc(s[1])+'</p>'})),
 {id:"current",title:j.today,content:'<p>'+esc(h.today)+'</p>'},
 {id:"future",title:j.future,content:'<p>'+esc(h.future)+'</p><div class="future-label">'+esc(j.what)+'</div>'}
 ];
 const toc=sec.map(x=>'<a href="#'+x.id+'">'+esc(x.title)+'</a>').join("");
 const sections=sec.map((x,i)=>'<section id="'+x.id+'" class="science-section reveal"><div class="section-index">'+String(i+1).padStart(2,"0")+' / '+String(sec.length).padStart(2,"0")+'</div><h2>'+esc(x.title)+'</h2>'+x.content+'</section>').join("");
 const related=groupGuides(g.group).filter(x=>x.slug!==g.slug).map(x=>'<a href="'+esc(slugURL(base,lang,x.slug))+'">'+esc(topic(x,lang).title)+' ↗</a>').join("");
 const visual='<figure class="signal-figure reveal"><div class="signal-stage" aria-hidden="true"><div class="signal-phone"><span>▥</span><small>ANDROID A</small></div><div class="signal-tracks"><i></i><i></i><i></i><b>✦</b></div><div class="signal-phone"><span>▥</span><small>ANDROID B</small></div></div><figcaption>'+esc(j.diagram)+'</figcaption></figure>';
 const body='<main id="main" class="container"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="'+esc(base+(lang==="en"?"":lang+"/"))+'">'+esc(t.home)+'</a> / <a href="'+esc(slugURL(base,lang))+'">'+esc(t.guides)+'</a> / '+esc(t[g.group])+'</nav><div class="article-layout"><article class="article-main"><span class="kicker">'+esc(t[g.group])+' / PROMETEI SCIENCE ATLAS</span><h1>'+esc(a.title)+'</h1><div class="meta">'+esc(t.updated)+' · '+esc(j.readTime)+'</div><p class="intro">'+esc(a.intro)+'</p>'+visual+'<div class="notice"><strong>'+esc(t.note)+'.</strong> '+esc(t.notice)+'</div>'+sections+'<section id="sources" class="source-section"><h2>'+esc(j.sources)+'</h2><ol>'+sourceLinks+'</ol></section><div class="related"><h2>'+esc(t.related)+'</h2>'+related+'</div><div class="cta-group"><a class="button button-primary" href="'+playStoreLink(lang,g.slug)+'" target="_blank" rel="noopener noreferrer">'+esc(t.play)+' ↗</a><a class="button button-ghost" href="'+esc(slugURL(base,lang))+'">'+esc(t.back)+' ↗</a></div></article><aside class="side"><strong>'+esc(t.toc)+'</strong>'+toc+'<a href="#sources">'+esc(j.sources)+'</a><hr style="border:0;border-top:1px solid #31405c;margin:18px 0"><a href="'+esc(base)+'how-it-works">'+esc(t.how)+' ↗</a></aside></div></main>';
 return frame({base,lang,url,title:a.title,desc:a.description,body,active:g.slug,article:g});
}

export function generateGuides(output,base){
 if(guides.length!==9||new Set(guides.map(g=>g.slug)).size!==9)throw Error("Expected nine unique guides");
 const urls=[];
 for(const lang of locales){
   const prefix=lang==="en"?"":lang+"/";
   const guideRoot=path.join(output,prefix,"guides");
   fs.mkdirSync(guideRoot,{recursive:true});
   fs.writeFileSync(path.join(guideRoot,"index.html"),indexPage(base,lang),"utf8");
   urls.push(prefix+"guides/");
   for(const g of guides){
     if(!groups.includes(g.group))throw Error("Invalid guide "+g.slug);
     const dir=path.join(guideRoot,g.slug);
     fs.mkdirSync(dir,{recursive:true});
     fs.writeFileSync(path.join(dir,"index.html"),articlePage(base,lang,g),"utf8");
     urls.push(prefix+"guides/"+g.slug+"/");
   }
 }
 return urls;
}
