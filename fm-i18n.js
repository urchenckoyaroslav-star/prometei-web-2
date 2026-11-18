/* PROMETEI FM — seven-language, no-framework language switcher.
 * Existing Cloudflare Pages language routes: /fm, /uk/fm, /ru/fm,
 * /de/fm, /es/fm, /zh/fm, /ja/fm.
 * A static English page remains readable even if translation JSON fails.
 */
(() => {
  'use strict';
  const supported=['en','uk','ru','de','es','zh','ja'];
  const match=location.pathname.match(/^\/(uk|ru|de|es|zh|ja)\/fm(?:\/|\.html)?$/);
  const requested=new URLSearchParams(location.search).get('lang');
  const locale=match?.[1] || (supported.includes(requested)?requested:'en');
  const state={locale,strings:null};
  const clean=x=>String(x??'').trim();
  const tr=text=>{
    const value=clean(text);
    return (state.strings && state.strings[value]) || text;
  };
  window.PrometeiFM={locale,translate:tr,ready:null};
  document.documentElement.lang=locale;
  const picker=document.getElementById('fm-lang');
  if(picker){
    picker.value=locale;
    picker.addEventListener('change',()=>{
      const next=supported.includes(picker.value)?picker.value:'en';
      // Deliberately discard a one-person ?listen= preview URL: language
      // switching should continue to use the global station for everyone.
      location.assign((next==='en'?'/fm':'/'+next+'/fm')+(location.hash||''));
    });
  }
  const textNodes=()=>{
    const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walk.nextNode()){
      const node=walk.currentNode;
      const parent=node.parentElement;
      if(parent && !['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(parent.tagName))nodes.push(node);
    }
    return nodes;
  };
  const apply=()=>{
    if(!state.strings)return;
    for(const node of textNodes()){
      const raw=node.nodeValue||'';
      const value=raw.trim();
      const replacement=state.strings[value];
      if(!replacement||replacement===value)continue;
      const before=(raw.match(/^\s*/)||[''])[0];
      const after=(raw.match(/\s*$/)||[''])[0];
      node.nodeValue=before+replacement+after;
    }
    for(const e of document.querySelectorAll('input[placeholder], textarea[placeholder], [data-fm-translate-label]')){
      if(e.hasAttribute('placeholder')){
        const raw=e.getAttribute('placeholder'),newValue=state.strings[raw];
        if(newValue)e.setAttribute('placeholder',newValue);
      }
      if(e.hasAttribute('data-fm-translate-label')){
        const raw=e.getAttribute('aria-label'),newValue=state.strings[raw];
        if(newValue)e.setAttribute('aria-label',newValue);
      }
    }
  };
  const ready=fetch('/fm-translations.json',{cache:'force-cache'})
    .then(r=>{if(!r.ok)throw Error('Translations unavailable');return r.json();})
    .then(all=>{
      state.strings=all?.[locale]||all?.en||{};
      // Render text on load and also translate labels updated by the player.
      apply();
      document.dispatchEvent(new CustomEvent('prometei-fm:language',{detail:{locale}}));
    }).catch(()=>{/* English static fallback remains usable */});
  window.PrometeiFM.ready=ready;
})();