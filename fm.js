/* PROMETEI FM / Personal station engine v1.
 * YouTube playback uses the official, VISIBLE IFrame Player API.
 * Local audio is read by the user's own browser; audio files are never uploaded.
 * All playback/history is per-browser, not a synchronized public broadcast.
 */
(() => {
  'use strict';
  const KEY = 'prometei-fm-station-v1';
  const byId = id => document.getElementById(id);
  const els = {
    modeButtons: [...document.querySelectorAll('[data-mode]')],
    ytWeight: byId('yt-weight'), weightLabel: byId('weight-label'),
    playBtn: byId('play-btn'), nextBtn: byId('next-btn'), message: byId('message'),
    title: byId('track-title'), artist: byId('track-artist'), source: byId('track-source'),
    playState: byId('play-state'), recordArt: byId('record-art'), counter: byId('track-counter'),
    audio: byId('local-audio'), audioStage: byId('audio-stage'), videoStage: byId('video-stage'),
    listForm: byId('playlist-form'), listName: byId('playlist-name'), listUrl: byId('playlist-url'),
    listEl: byId('playlist-list'), listCount: byId('playlist-count'), listLabel: byId('playlist-label'),
    fileInput: byId('file-input'), drop: byId('file-drop'), fileEl: byId('file-list'),
    fileCount: byId('file-count'), fileLabel: byId('file-label'), clearFiles: byId('clear-files'),
    history: byId('history-list'), historyCount: byId('history-count'), clearHistory: byId('clear-history')
  };
  const state = {
    mode: 'hybrid', weight: 65, playlists: [], presets: [], files: [], history: [],
    source: null, isPlaying: false, isLoading: false, activeLocal: null, activeLocalLogged: false,
    activeVideoId: '', activePlaylist: null, playlistVideos: new Map(),
    recentFileKeys: [], recentPlaylistKeys: [], recentVideoKeys: [],
    yt: null, ytPromise: null, startedOnce: false, pendingPlayback: false, consecutiveErrors: 0
  };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const choose = arr => arr[Math.floor(Math.random() * arr.length)];
  const storage = {
    read() {
      try {
        const obj = JSON.parse(localStorage.getItem(KEY) || '{}');
        if (['hybrid','youtube','local'].includes(obj.mode)) state.mode = obj.mode;
        if (Number.isFinite(obj.weight)) state.weight = clamp(obj.weight, 0, 100);
        if (Array.isArray(obj.playlists)) state.playlists = obj.playlists.slice(0, 24)
          .filter(p => p && validId(p.id))
          .map(p => ({id: p.id, name: cleanText(p.name, 70) || 'YouTube playlist', preset: false}));
        if (Array.isArray(obj.history)) state.history = obj.history.slice(0, 60)
          .filter(e => e && typeof e.title === 'string' && typeof e.at === 'number')
          .map(e => ({at:e.at,title:cleanText(e.title,220),artist:cleanText(e.artist,160),source:cleanText(e.source,30),collection:cleanText(e.collection,120)}));
      } catch (_) { /* private browsing, storage disabled or older format */ }
    },
    write() {
      try { localStorage.setItem(KEY, JSON.stringify({
        mode:state.mode,weight:state.weight,playlists:state.playlists,history:state.history
      })); } catch (_) { /* player remains usable without storage */ }
    }
  };
  function cleanText(value, max) { return String(value || '').trim().slice(0, max); }
  function validId(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{10,120}$/.test(value); }
  function playlistIdFrom(raw) {
    const s = String(raw || '').trim();
    if (validId(s)) return s;
    let url;
    try { url = new URL(s); } catch (_) { return null; }
    const host = url.hostname.toLowerCase().replace(/^www\./,'');
    if (!['youtube.com','m.youtube.com','music.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)) return null;
    const id = url.searchParams.get('list');
    return validId(id) ? id : null;
  }
  function notify(message) { els.message.textContent = message; }
  function safeTime(n) {
    if (!Number.isFinite(n) || n < 0) return '00:00';
    const whole = Math.floor(n);
    return String(Math.floor(whole / 60)).padStart(2,'0') + ':' + String(whole % 60).padStart(2,'0');
  }
  function showSource(type) {
    els.videoStage.hidden = type !== 'youtube';
    els.audioStage.hidden = type === 'youtube';
    els.audioStage.classList.toggle('active', type === 'local' && state.isPlaying);
  }
  function updateNow({title,artist,source} = {}) {
    if (title !== undefined) els.title.textContent = title;
    if (artist !== undefined) els.artist.textContent = artist;
    if (source !== undefined) els.source.textContent = source;
  }
  function updateControls() {
    els.playBtn.innerHTML = state.isPlaying ? 'Ⅱ <span>PAUSE</span>' : (state.source ? '▶ <span>RESUME</span>' : '▶ <span>START LISTENING</span>');
    els.playBtn.setAttribute('aria-label',state.isPlaying?'Pause playback':'Start or resume playback');
    els.playState.textContent = state.isLoading ? 'CONNECTING' : state.isPlaying ? 'PLAYING' : state.source ? 'PAUSED' : 'STANDBY';
    els.playState.classList.toggle('is-live',state.isPlaying);
    els.recordArt.classList.toggle('playing',state.isPlaying);
    showSource(state.source);
  }
  function allPlaylists() {
    const merged = [...state.presets, ...state.playlists];
    return merged.filter((p, i) => merged.findIndex(other => other.id === p.id) === i);
  }
  function renderPlaylists() {
    const list = allPlaylists();
    els.listEl.replaceChildren();
    if (!list.length) {
      const li = document.createElement('li'); li.className='empty-text'; li.textContent='No playlists yet. Add one above.'; els.listEl.append(li);
    }
    for (const p of list) {
      const li = document.createElement('li');
      const left = document.createElement('span'); left.className='collection-main';
      const title = document.createElement('strong'); title.textContent = p.name || 'YouTube playlist';
      const kind = document.createElement('small'); kind.textContent = p.preset ? 'SITE COLLECTION' : 'YOUR PLAYLIST';
      left.append(title,kind);
      const action = document.createElement(p.preset ? 'a' : 'button');
      action.className='collection-action';
      if (p.preset) {
        action.href='https://www.youtube.com/playlist?list='+encodeURIComponent(p.id);
        action.target='_blank'; action.rel='noopener noreferrer'; action.textContent='VIEW ↗';
      } else {
        action.type='button'; action.textContent='REMOVE'; action.dataset.removePlaylist=p.id;
        action.setAttribute('aria-label','Remove '+p.name);
      }
      li.append(left,action); els.listEl.append(li);
    }
    els.listCount.textContent=String(list.length);
    els.listLabel.textContent=list.length + (list.length===1?' playlist':' playlists');
  }
  function fileTitle(file) {
    const stem = file.name.replace(/\.[^.]+$/,'').replace(/_/g,' ').trim();
    const split = stem.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    return split ? {artist:cleanText(split[1],150),title:cleanText(split[2],200)} : {artist:'Local audio file',title:cleanText(stem,200)};
  }
  function renderFiles() {
    els.fileEl.replaceChildren();
    if (!state.files.length) {
      const li=document.createElement('li');li.className='empty-text';li.textContent='Your selected tracks will appear here.';els.fileEl.append(li);
    }
    for (const f of state.files.slice(0,45)) {
      const li=document.createElement('li'), info=document.createElement('span');info.className='collection-main';
      const name=document.createElement('strong');name.textContent=fileTitle(f.file).title;
      const subtitle=document.createElement('small');subtitle.textContent=fileTitle(f.file).artist;
      info.append(name,subtitle);
      const action=document.createElement('button');action.type='button';action.className='collection-action';action.textContent='PLAY';
      action.dataset.playFile=f.id;action.setAttribute('aria-label','Play '+f.file.name);
      li.append(info,action);els.fileEl.append(li);
    }
    if (state.files.length>45) {
      const li=document.createElement('li');li.className='empty-text';li.textContent='+'+(state.files.length-45)+' more tracks ready for shuffle';els.fileEl.append(li);
    }
    els.fileCount.textContent=String(state.files.length);
    els.fileLabel.textContent=state.files.length+' tracks loaded';
  }
  function renderHistory() {
    els.history.replaceChildren();
    if (!state.history.length) {
      const li=document.createElement('li');li.className='history-empty';li.textContent='Your listening history will appear here once a track starts.';els.history.append(li);
    }
    for (const h of state.history.slice(0,40)) {
      const li=document.createElement('li');
      const at=document.createElement('div');at.className='history-time';
      const date=new Date(h.at);
      at.textContent=date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      const small=document.createElement('small');small.textContent=h.source==='youtube'?'YOUTUBE':'MY PC';at.append(small);
      const track=document.createElement('div');track.className='history-track';track.textContent=h.title;
      const author=document.createElement('small');author.textContent=h.artist || 'Unknown artist/channel';track.append(author);
      const collection=document.createElement('div');collection.className='history-collection';collection.textContent=h.collection || 'Personal rotation';
      li.append(at,track,collection);els.history.append(li);
    }
    els.historyCount.textContent=String(state.history.length);
  }
  function record(entry) {
    if (!entry || !entry.title) return;
    const e={at:Date.now(),title:cleanText(entry.title,220),artist:cleanText(entry.artist,160),source:entry.source,collection:cleanText(entry.collection,120)};
    state.history.unshift(e);state.history=state.history.slice(0,60);
    renderHistory();storage.write();
  }
  function syncMixer() {
    els.modeButtons.forEach(b => { const yes=b.dataset.mode===state.mode; b.classList.toggle('chosen',yes);b.setAttribute('aria-pressed',String(yes)); });
    els.ytWeight.value=String(state.weight);els.weightLabel.value=state.weight+'%';els.weightLabel.textContent=state.weight+'%';
    els.ytWeight.disabled=state.mode!=='hybrid';
  }
  function pickAvoiding(items, recent, keyFn) {
    if (!items.length) return null;
    const filtered=items.filter(i=>!recent.includes(keyFn(i)));
    return choose(filtered.length?filtered:items);
  }
  function remember(recent,value,max=3) {
    recent.unshift(value);recent.splice(max);
  }
  function nextSource() {
    const yt=allPlaylists().length>0,pc=state.files.length>0;
    if (state.mode==='youtube') return yt?'youtube':null;
    if (state.mode==='local') return pc?'local':null;
    if (!yt&&!pc) return null;
    if (!yt) return 'local';
    if (!pc) return 'youtube';
    return Math.random()*100 < state.weight ? 'youtube' : 'local';
  }
  function pauseCurrent() {
    els.audio.pause();
    if (state.yt && typeof state.yt.pauseVideo==='function') {
      try {state.yt.pauseVideo();} catch (_) {}
    }
  }
  async function ensurePlayer() {
    if (state.yt) return state.yt;
    if (state.ytPromise) return state.ytPromise;
    state.ytPromise=new Promise((resolve,reject)=>{
      let finished=false;
      const timeout=setTimeout(()=>{if(!finished){finished=true;state.ytPromise=null;reject(Error('YouTube player did not load. Check network and privacy settings.'));}},14000);
      function boot() {
        if (finished) return;
        try {
          const player=new window.YT.Player('yt-player',{
            width:'640',height:'360',
            playerVars:{playsinline:1,controls:1,rel:0,origin:window.location.origin},
            events:{
              onReady:event=>{if(finished)return;finished=true;clearTimeout(timeout);state.yt=event.target;resolve(event.target);},
              onStateChange:onYouTubeState,
              onError:onYouTubeError,
              onAutoplayBlocked:()=>{state.isPlaying=false;state.isLoading=false;updateControls();notify('Browser blocked automatic playback. Press PLAY in the YouTube player or try again.');}
            }
          });
        } catch (err) {if(!finished){finished=true;clearTimeout(timeout);state.ytPromise=null;reject(err);}}
      }
      if (window.YT&&window.YT.Player) return boot();
      const old=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{if(typeof old==='function')try{old();}catch(_){}boot();};
      if (!document.querySelector('script[data-fm-youtube]')) {
        const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.fmYoutube='';
        script.onerror=()=>{if(!finished){finished=true;clearTimeout(timeout);state.ytPromise=null;reject(Error('YouTube is unavailable or blocked by a browser extension.'));}};
        document.head.append(script);
      }
    });
    return state.ytPromise;
  }
  function maybeRecordYouTube() {
    if(state.source!=='youtube' || !state.yt || !state.isPlaying) return;
    try {
      const data=state.yt.getVideoData()||{};
      const id=cleanText(data.video_id,20);
      if (!id || id===state.activeVideoId) return;
      state.activeVideoId=id;
      const title=cleanText(data.title,200)||'YouTube video';
      const author=cleanText(data.author,150)||'YouTube channel';
      updateNow({title,artist:author,source:'▶ YOUTUBE / '+(state.activePlaylist?.name||'PLAYLIST')});
      remember(state.recentVideoKeys,id,8);
      record({source:'youtube',title,artist:author,collection:state.activePlaylist?.name||'YouTube'});
    }catch(_) { /* YouTube metadata is unavailable until the player reports it */ }
  }
  function onYouTubeState(evt) {
    if (state.source!=='youtube') return;
    const YT=window.YT?.PlayerState;
    if (!YT) return;
    if (evt.data===YT.PLAYING) {
      state.isLoading=false;state.isPlaying=true;state.consecutiveErrors=0;
      updateControls();
      try {
        const vids=state.yt.getPlaylist()||[];
        if (vids.length&&state.activePlaylist) state.playlistVideos.set(state.activePlaylist.id,[...vids]);
        maybeRecordYouTube();
      } catch (_) { /* metadata can arrive after play starts */ }
      notify('Now playing through the official YouTube player.');
    } else if (evt.data===YT.ENDED) {
      state.isPlaying=false;updateControls();nextTrack();
    } else if (evt.data===YT.PAUSED) {
      state.isPlaying=false;state.isLoading=false;updateControls();
    } else if (evt.data===YT.BUFFERING) {
      state.isLoading=true;updateControls();
    }
  }
  function onYouTubeError(evt) {
    if(state.source!=='youtube')return;
    state.isLoading=false;state.isPlaying=false;state.consecutiveErrors++;
    updateControls();
    notify('YouTube could not play this video (code '+String(evt.data)+'). Try a public embeddable playlist.');
    if(state.consecutiveErrors<=2) nextTrack();
  }
  async function playLocal(item) {
    if (!item) return;
    pauseCurrent();
    state.source='local';state.activeLocal=item;state.activeLocalLogged=false;state.activePlaylist=null;state.activeVideoId='';
    state.isLoading=true;state.isPlaying=false;
    showSource('local');updateControls();
    const meta=fileTitle(item.file);
    updateNow({title:meta.title,artist:meta.artist,source:'♫ MY PC / PRIVATE AUDIO FILE'});
    els.audio.src=item.url;
    try {
      await els.audio.play();
      state.isLoading=false;state.isPlaying=true;state.consecutiveErrors=0;
      updateControls();notify('Playing from your computer. This file stays on your device.');
    } catch (err) {
      state.isLoading=false;state.isPlaying=false;updateControls();
      notify('Could not play this file. Check its format or press PLAY again.');
    }
  }
  async function playYouTube(playlist) {
    if (!playlist)return;
    pauseCurrent();
    state.source='youtube';state.activePlaylist=playlist;state.activeVideoId='';state.activeLocal=null;
    state.isLoading=true;state.isPlaying=false;
    showSource('youtube');updateControls();
    updateNow({title:'Tuning into '+playlist.name,artist:'Loading a YouTube playlist…',source:'▶ YOUTUBE / '+playlist.name});
    notify('Connecting to the official YouTube player…');
    try {
      const player=await ensurePlayer();
      // YouTube only: no extraction of media, background/audio-only embedding or hidden player.
      const known=state.playlistVideos.get(playlist.id)||[];
      let index=0;
      if (known.length) {
        const options=known.map((id,i)=>({id,i})).filter(x=>!state.recentVideoKeys.includes(x.id));
        index=choose(options.length?options:known.map((id,i)=>({id,i}))).i;
      }
      player.loadPlaylist({listType:'playlist',list:playlist.id,index,startSeconds:0});
      if (typeof player.setShuffle==='function') player.setShuffle(true);
      // PLAYING event is the only evidence that a YouTube track really started.
    } catch (error) {
      state.isLoading=false;state.isPlaying=false;
      updateControls();notify(cleanText(error?.message,180)||'YouTube could not initialize.');
    }
  }
  async function nextTrack() {
    const source=nextSource();
    if (!source) {
      pauseCurrent();state.source=null;state.isPlaying=false;state.isLoading=false;updateControls();
      if (state.mode==='youtube') notify('Add a YouTube playlist to use YouTube mode.');
      else if(state.mode==='local')notify('Choose audio files to use My PC mode.');
      else notify('Add a YouTube playlist or select local audio files to begin.');
      updateNow({title:'The frequency is yours.',artist:'Connect a source below to start mixing.',source:'◌ WAITING FOR SOURCES'});
      return;
    }
    state.startedOnce=true;
    if (source==='local') {
      const f=pickAvoiding(state.files,state.recentFileKeys,item=>item.id);
      if(f){remember(state.recentFileKeys,f.id,Math.min(4,Math.max(1,state.files.length-1)));await playLocal(f);}
    } else {
      const p=pickAvoiding(allPlaylists(),state.recentPlaylistKeys,item=>item.id);
      if(p){remember(state.recentPlaylistKeys,p.id,Math.min(3,Math.max(1,allPlaylists().length-1)));await playYouTube(p);}
    }
  }
  async function togglePlay() {
    if (!state.source) return nextTrack();
    if (state.isPlaying) {
      if(state.source==='local')els.audio.pause();
      else if(state.yt)state.yt.pauseVideo();
      state.isPlaying=false;state.isLoading=false;updateControls();notify('Paused. Press play to resume.');return;
    }
    if (state.source==='local') {
      try{await els.audio.play();state.isPlaying=true;updateControls();notify('Playback resumed.');}
      catch(_){notify('Could not resume this audio file.');}
    } else if(state.yt) {
      try{state.yt.playVideo();notify('Requesting YouTube playback…');}catch(_){notify('YouTube player is not ready.');}
    } else nextTrack();
  }
  function addFiles(fileList) {
    const files=[...fileList].filter(f=>f && (f.type.startsWith('audio/')||/\.(mp3|m4a|aac|ogg|oga|wav|flac|opus)$/i.test(f.name)));
    if(!files.length){notify('No supported audio files were selected.');return;}
    const existing=new Set(state.files.map(f=>f.file.name+'|'+f.file.size+'|'+f.file.lastModified));
    let added=0;
    for(const file of files.slice(0,500)) {
      const key=file.name+'|'+file.size+'|'+file.lastModified;
      if(existing.has(key))continue;
      existing.add(key);
      const url=URL.createObjectURL(file);
      state.files.push({id:'f-'+Date.now()+'-'+state.files.length,url,file});added++;
    }
    renderFiles();notify('Loaded '+added+' local audio file(s). These files were not uploaded.');
    if(state.mode==='youtube' && !allPlaylists().length) {state.mode='hybrid';syncMixer();}
  }
  function clearFiles() {
    if(state.source==='local') {
      pauseCurrent();els.audio.removeAttribute('src');els.audio.load();
      state.source=null;state.isPlaying=false;state.isLoading=false;
      updateControls();updateNow({title:'The frequency is yours.',artist:'Select a music source to begin.',source:'◌ WAITING FOR SOURCES'});
    }
    state.files.forEach(f=>URL.revokeObjectURL(f.url));state.files=[];state.recentFileKeys=[];
    els.fileInput.value='';renderFiles();notify('Local files cleared from this browser session.');
  }
  async function loadPresets() {
    try{
      const resp=await fetch('fm-config.json',{cache:'no-store'});
      if(!resp.ok) return;
      const config=await resp.json();
      if(!Array.isArray(config.playlists))return;
      state.presets=config.playlists.slice(0,24)
        .filter(p=>p&&validId(p.id))
        .map(p=>({id:p.id,name:cleanText(p.name,70)||'FM playlist',preset:true}));
      renderPlaylists();
    }catch(_){ /* connection issues do not disable personal source management */ }
  }
  els.listForm.addEventListener('submit', e=>{
    e.preventDefault();
    const id=playlistIdFrom(els.listUrl.value);
    if(!id){notify('Enter a valid YouTube playlist URL with ?list=… or a playlist ID.');els.listUrl.focus();return;}
    if(allPlaylists().some(p=>p.id===id)){notify('This playlist is already in the rotation.');return;}
    if(state.playlists.length>=24){notify('You can add up to 24 personal playlists.');return;}
    const name=cleanText(els.listName.value,70)||'Playlist '+(allPlaylists().length+1);
    state.playlists.push({id,name,preset:false});storage.write();renderPlaylists();
    els.listForm.reset();notify('Added '+name+' to your personal rotation.');
  });
  els.listEl.addEventListener('click', e=>{
    const btn=e.target.closest('[data-remove-playlist]');if(!btn)return;
    state.playlists=state.playlists.filter(p=>p.id!==btn.dataset.removePlaylist);
    storage.write();renderPlaylists();notify('Playlist removed from your personal rotation.');
  });
  els.fileInput.addEventListener('change',e=>addFiles(e.target.files));
  for(const name of ['dragenter','dragover']) els.drop.addEventListener(name,e=>{e.preventDefault();els.drop.classList.add('dragging');});
  for(const name of ['dragleave','drop']) els.drop.addEventListener(name,e=>{e.preventDefault();els.drop.classList.remove('dragging');});
  els.drop.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
  els.fileEl.addEventListener('click',e=>{
    const btn=e.target.closest('[data-play-file]');if(!btn)return;
    const item=state.files.find(f=>f.id===btn.dataset.playFile);
    if(item)playLocal(item);
  });
  els.clearFiles.addEventListener('click',clearFiles);
  els.clearHistory.addEventListener('click',()=>{
    state.history=[];storage.write();renderHistory();notify('Your listening history was cleared.');
  });
  els.modeButtons.forEach(b=>b.addEventListener('click',()=>{
    const mode=b.dataset.mode;if(!['youtube','local','hybrid'].includes(mode))return;
    state.mode=mode;syncMixer();storage.write();
    notify(mode==='hybrid'?'Hybrid rotation enabled. New selections can alternate sources.':mode==='youtube'?'YouTube rotation selected.':'Local audio rotation selected.');
  }));
  els.ytWeight.addEventListener('input',()=>{state.weight=clamp(Number(els.ytWeight.value),0,100);syncMixer();storage.write();});
  els.playBtn.addEventListener('click',togglePlay);
  els.nextBtn.addEventListener('click',nextTrack);
  els.audio.addEventListener('playing',()=>{
    if(state.source!=='local')return;
    state.isLoading=false;state.isPlaying=true;updateControls();
    if(state.activeLocal && !state.activeLocalLogged) {
      state.activeLocalLogged=true;
      const meta=fileTitle(state.activeLocal.file);
      record({source:'local',title:meta.title,artist:meta.artist,collection:'Local collection'});
    }
  });
  els.audio.addEventListener('pause',()=>{if(state.source==='local'){state.isPlaying=false;updateControls();}});
  els.audio.addEventListener('ended',()=>{if(state.source==='local')nextTrack();});
  els.audio.addEventListener('error',()=>{
    if(state.source!=='local')return;
    state.isPlaying=false;state.consecutiveErrors++;updateControls();
    notify('This local file could not be decoded. Try another supported format.');
    if(state.consecutiveErrors<=2)nextTrack();
  });
  function updateCounter() {
    if(state.source==='local') {
      els.counter.textContent=safeTime(els.audio.currentTime)+' / '+safeTime(els.audio.duration);
    } else if(state.source==='youtube'&&state.yt) {
      maybeRecordYouTube();
      try{els.counter.textContent=safeTime(state.yt.getCurrentTime())+' / '+safeTime(state.yt.getDuration());}catch(_){}
    } else els.counter.textContent='00 : 00';
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCounter();});
  window.addEventListener('pagehide',()=>{state.files.forEach(f=>URL.revokeObjectURL(f.url));});
  storage.read();syncMixer();renderPlaylists();renderFiles();renderHistory();updateControls();
  byId('year').textContent=String(new Date().getFullYear());
  setInterval(updateCounter,1000);
  loadPresets();
})();