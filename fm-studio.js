/* PROMETEI FM operator studio — no secrets in source; bearer token from input only. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const f=$('studio-form');
  const state={playlists:[],configured:false};
  const hint=message=>{$('studio-status').textContent=message;};
  const clean=(x,max)=>String(x||'').trim().slice(0,max);
  const valid=id=>/^[A-Za-z0-9_-]{10,120}$/.test(id);
  const parseId=raw=>{
    const s=clean(raw,400);if(valid(s))return s;
    try{
      const u=new URL(s);
      const h=u.hostname.toLowerCase().replace(/^www\./,'');
      if(!['youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(h))return '';
      return valid(u.searchParams.get('list')||'')?u.searchParams.get('list'):'';
    }catch(_){return '';}
  };
  function render(){
    const sel=$('station-playlist'), list=$('studio-playlists');
    const selected=sel.value;
    sel.replaceChildren(new Option('Automatic rotation',''));
    list.replaceChildren();
    for(const p of state.playlists){
      sel.add(new Option(p.name,p.id));
      const li=document.createElement('li');
      const content=document.createElement('span');
      content.className='collection-main';
      const heading=document.createElement('strong');heading.textContent=p.name;
      const caption=document.createElement('small');caption.textContent=p.id;
      content.append(heading,caption);
      const remove=document.createElement('button');
      remove.type='button';remove.className='collection-action';remove.textContent='REMOVE';
      remove.addEventListener('click',()=>{
        state.playlists=state.playlists.filter(x=>x.id!==p.id);
        render();hint('Removed from draft. Save to publish.');
      });
      li.append(content,remove);list.append(li);
    }
    if([...sel.options].some(o=>o.value===selected))sel.value=selected;
    if(state.playlists.length===0){
      const li=document.createElement('li');li.className='empty-text';
      li.textContent='No playlists configured';list.append(li);
    }
  }
  async function getCurrent(){
    try{
      const response=await fetch('/api/fm/station',{cache:'no-store'});
      let source=null;
      if(response.ok) {
        source=await response.json();
        state.configured=true;
      } else if(response.status===404 || response.status===503) {
        const fallback=await fetch('/fm-config.json',{cache:'no-store'});
        if(fallback.ok) source=await fallback.json();
      }
      if(!source)throw Error('Cannot read the station data');
      state.playlists=(source.playlists||[]).slice(0,24);
      f.elements.mode.value=source.mode==='pc'?'pc':'youtube';
      $('stream-url').value=source.pcStreamUrl||'';
      render();
      $('station-playlist').value=source.playlistId||'';
      hint(source.managed?'Connected to Cloudflare station storage. '+(source.enabled?'ON AIR':'OFF AIR')+' · Last updated '+new Date(source.updatedAt||0).toLocaleString():'Reading static fallback. DJ writes require Cloudflare KV + secret.');
    }catch(e){hint(clean(e.message,140));}
  }
  async function saveStation(enabled){
    const token=$('dj-token').value.trim();
    if(token.length<24){hint('Enter your Cloudflare DJ access token (at least 24 characters).');return;}
    const payload={
      mode:f.elements.mode.value,
      enabled,
      pcStreamUrl:$('stream-url').value.trim(),
      playlistId:$('station-playlist').value,
      playlists:state.playlists
    };
    if(enabled&&payload.mode==='pc'&&!payload.pcStreamUrl){
      hint('Enter the HTTPS public stream URL before going on air from the PC.');return;
    }
    try{
      hint('Submitting changes to Cloudflare station control...');
      const response=await fetch('/api/fm/station',{
        method:'POST',
        headers:{'content-type':'application/json','authorization':'Bearer '+token},
        body:JSON.stringify(payload)
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Save failed');
      state.configured=true;
      hint(enabled?'Broadcast selection published. Listeners will pick it up shortly.':'Station switched off. Listeners will update shortly.');
    }catch(e){hint('Not saved: '+clean(e.message,180));}
  }
  $('playlist-editor').addEventListener('submit',e=>{
    e.preventDefault();
    const id=parseId($('new-playlist-url').value);
    const name=clean($('new-playlist-name').value,70);
    if(!id||!name){hint('Enter a valid playlist name and YouTube playlist URL or ID.');return;}
    if(state.playlists.some(p=>p.id===id)){hint('This playlist is already present.');return;}
    if(state.playlists.length>=24){hint('Maximum 24 playlists.');return;}
    state.playlists.push({id,name});
    $('playlist-editor').reset();render();hint('Playlist added to draft. Press GO ON AIR / SAVE to publish.');
  });
  $('go-live').addEventListener('click',()=>saveStation(true));
  $('go-offline').addEventListener('click',()=>saveStation(false));
  $('load-station').addEventListener('click',getCurrent);
  $('clear-token').addEventListener('click',()=>{$('dj-token').value='';hint('Access token cleared from this tab.');});
  getCurrent();
})();