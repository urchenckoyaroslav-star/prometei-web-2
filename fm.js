/* PROMETEI FM — listener-only station client (v2).
 * Programming is published by station operators through fm-config.json.
 * YouTube remains a visible, official embedded player; no audio extraction.
 * The present playlist experience is curated but NOT a synchronized radio stream.
 * A licensed PC stream can be configured later; paid requests are NOT charged here.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = {
    play: $('play-btn'), message: $('message'), title: $('track-title'),
    artist: $('track-artist'), source: $('track-source'), status: $('play-state'),
    art: $('record-art'), time: $('track-counter'), video: $('video-stage'),
    audioStage: $('audio-stage'), audio: $('station-audio'),
    playlists: $('playlist-list'), playlistCount: $('playlist-count'),
    history: $('history-list'), historyCount: $('history-count'),
    request: $('request-form'), requestStatus: $('request-status'), fallback: $('youtube-fallback')
  };
  const HISTORY_KEY = 'prometei-fm-listener-history-v2';
  const PC_BACKUP_PLAYLIST_ID = 'PLFS8aAbOL3x5wZaXGyuSy9Hl-LLI_KhUX';
  const PC_BACKUP_PLAYLIST_NAME = 'PROMETEI FM · Automatic YouTube backup';
  const globalHistory={items:[],count:0,live:false,current:null,ready:false,error:''};
  let globalVisible=120;
  // Keep displaying the shared 36-hour PC history while the backup player
  // is active; YouTube's independent playback must never be mislabelled as a
  // station-wide synchronized broadcast.
  const globalMode=()=>state.config &&
    (state.config.mode==='pc'||state.config.mode==='youtube_live'||state.config.fallbackActive);
  const state = {
    config: null, playlists: [], current: null, lastPlaylists: [],
    yt: null, ytPromise: null, playing: false, loading: false,
    source: null, videoId: '', recent: [], errors: 0, intent: false, reconnects: 0, reconnectTimer: null
  };
  const clean = (val, max = 180) => String(val ?? '').trim().slice(0, max);
  const playlistIdValid = id => typeof id === 'string' && /^[A-Za-z0-9_-]{10,120}$/.test(id);
  // A temporary, shareable PC-radio preview link works even when DJ KV has
  // not yet been configured. This never changes the globally published station.
  const previewStream = (() => {
    const raw = new URLSearchParams(location.search).get('listen');
    if (!raw || raw.length > 320) return '';
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password || url.port ||
          url.search || url.hash || url.pathname !== '/live.mp3') return '';
      if (!/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname)) return '';
      return url.href;
    } catch (_) { return ''; }
  })();
  // A listener's temporary local preview is a different PC source from the
  // centrally managed station. Do not apply its server fallback to previews.
  const maybePreview = value => previewStream
    ? {...value, mode:'pc', pcStreamUrl:previewStream, enabled:true,
        previewMode:true, fallbackActive:false}
    : value;
  const duration = value => {
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const s = Math.floor(value);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  const t = value => window.PrometeiFM?.translate?.(value) || value;
  const notify = value => { el.message.textContent = t(value); };
  const update = () => {
    el.play.innerHTML = state.playing ? 'Ⅱ <span>'+t('PAUSE')+'</span>' : '▶ <span>'+t('LISTEN')+'</span>';
    el.play.setAttribute('aria-label', state.playing ? t('Pause listening') : t('Start listening'));
    el.status.textContent = t(state.loading ? 'CONNECTING' : state.playing ? 'PLAYING' : 'READY');
    el.status.classList.toggle('is-live', state.playing);
    el.art.classList.toggle('playing', state.playing);
    el.video.hidden = state.source !== 'youtube';
    el.audioStage.hidden = state.source === 'youtube';
    el.audioStage.classList.toggle('active', state.source === 'pc' && state.playing);
    if (el.fallback) el.fallback.hidden = state.source !== 'youtube' || !state.current;
  };
  let history = [];
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (Array.isArray(h)) history = h.slice(0, 60).filter(x => x && x.title && Number.isFinite(x.at));
  } catch (_) { /* private mode */ }
  function renderHistory() {
    const broadcast=globalMode();
    const items=broadcast?globalHistory.items:history;
    el.history.replaceChildren();
    if(!items.length){
      const li=document.createElement('li');
      li.className='history-empty';
      li.textContent=broadcast?
        (globalHistory.error||'No tracks have been registered in the last 36 hours. The DJ controls the station play log.'):
        'Songs you hear in the YouTube player appear here. This is only your personal listening history.';
      el.history.append(li);
    }
    const rows=broadcast?items.slice(0,globalVisible):items.slice(0,40);
    for(const h of rows){
      const row=document.createElement('li');
      const time=document.createElement('div');
      time.className='history-time';
      const playedAt=h.startedAt||h.at;
      time.textContent=new Date(playedAt).toLocaleString([],{
        day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'
      });
      const small=document.createElement('small');
      small.textContent=broadcast?'PROMETEI FM / ON AIR':'YOUTUBE / YOU';
      time.append(small);
      const title=document.createElement('div');title.className='history-track';
      title.textContent=h.title;
      const artist=document.createElement('small');
      artist.textContent=h.artist||'Artist not specified in file metadata';
      title.append(artist);
      const collection=document.createElement('div');collection.className='history-collection';
      collection.textContent=broadcast?
        (h.album||'PC DJ / SHUFFLE'):(h.collection||'PROMETEI selection');
      row.append(time,title,collection);
      el.history.append(row);
    }
    if(broadcast&&items.length>globalVisible){
      const more=document.createElement('li');
      more.className='history-show-more';
      const button=document.createElement('button');
      button.className='form-action';button.type='button';
      button.textContent='SHOW MORE TRACKS ('+(items.length-globalVisible)+' LEFT)';
      button.addEventListener('click',()=>{globalVisible+=120;renderHistory();});
      more.append(button);el.history.append(more);
    }
    el.historyCount.textContent=String(broadcast?globalHistory.count:history.length);
  }
  async function refreshGlobalHistory(){
    if(!globalMode())return;
    try{
      let data;
      if(state.config.previewMode){
        // Owner-PC status includes only song metadata, never local file paths.
        const target=new URL(state.config.stream).origin+'/status.json';
        const res=await fetch(target,{cache:'no-store'});
        if(!res.ok)throw Error('The temporary PC radio is currently offline.');
        const live=await res.json();
        data={configured:true, tracks:Array.isArray(live.recent)?live.recent:[],
          live:live.onAir===true, current:live.current||null};
      }else{
        const res=await fetch('/api/fm/history',{cache:'no-store'});
        if(!res.ok)throw Error('The DJ station history has not been connected to the server yet.');
        data=await res.json();
      }
      if(data.configured!==true || !Array.isArray(data.tracks))throw Error('Station log unavailable.');
      const now=Date.now(),floor=now-36*3600*1000;
      globalHistory.items=data.tracks.filter(entry=>entry&&
        typeof entry.title==='string'&&Number(entry.startedAt)>=floor&&
        Number(entry.startedAt)<=now+30000);
      globalHistory.count=globalHistory.items.length;
      globalHistory.live=data.live===true;
      globalHistory.current=data.current||null;
      globalHistory.ready=true;globalHistory.error='';
      if(globalHistory.live&&globalHistory.current&&state.config?.enabled){
        el.title.textContent=globalHistory.current.title;
        el.artist.textContent=globalHistory.current.artist||
          'Artist not specified in music tags';
        el.source.textContent=t('♫ PROMETEI PC DJ / SHARED LIVE RADIO');
      }else if(state.config?.mode==='pc'){
        el.title.textContent='PROMETEI FM / Station standby';
        el.artist.textContent='The DJ is not currently transmitting audio.';
      }
      renderHistory();
    }catch(error){
      globalHistory.error=state.config?.previewMode?'The owner PC is offline or this temporary radio link expired.':'36-hour public play log unavailable until the DJ station backend is connected.';
      globalHistory.ready=false;
      renderHistory();
    }
  }
  function remember(entry) {
    if (!entry?.title || globalMode()) return;
    history.unshift({...entry, at:Date.now()});
    history = history.slice(0, 60);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (_) {}
    renderHistory();
  }
  function renderPlaylists() {
    el.playlists.replaceChildren();
    for (const p of state.playlists) {
      const row = document.createElement('li');
      const left = document.createElement('span');
      left.className = 'collection-main';
      const title = document.createElement('strong');
      title.textContent = p.name;
      const subtitle = document.createElement('small');
      subtitle.textContent = 'SELECTED BY PROMETEI FM';
      left.append(title, subtitle);
      const a = document.createElement('a');
      a.className = 'collection-action';
      a.href = 'https://www.youtube.com/playlist?list=' + encodeURIComponent(p.id);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'VIEW ↗';
      row.append(left, a);
      el.playlists.append(row);
    }
    el.playlistCount.textContent = String(state.playlists.length);
    if (!state.playlists.length) {
      const row = document.createElement('li');
      row.className = 'empty-text';
      row.textContent = 'The station is being programmed.';
      el.playlists.append(row);
    }
  }
  async function fetchStation() {
    try {
      const remote=await fetch('/api/fm/station',{cache:'no-store'});
      if(remote.ok){
        const data=await remote.json();
        if(data?.managed===true)return maybePreview(data);
      }
    }catch(_) { /* offline API or no Cloudflare binding; static fallback */ }
    const response=await fetch('/fm-config.json',{cache:'no-store'});
    if(!response.ok)throw Error('Station configuration unavailable');
    return maybePreview(await response.json());
  }
  function cancelReconnect() {
    if(state.reconnectTimer!==null) clearTimeout(state.reconnectTimer);
    state.reconnectTimer=null;
  }
  function stopIntent() {
    state.intent=false;
    state.reconnects=0;
    cancelReconnect();
  }
  function reconnectStream() {
    if (!state.intent || !state.config?.enabled || state.config.mode!=='pc' || state.config.previewMode || state.reconnects>=4) {
      if(state.intent && state.reconnects>=4) notify('The PC stream is unavailable. Press LISTEN to try again.');
      return;
    }
    cancelReconnect();
    const wait=Math.min(15000,1500*2**state.reconnects++);
    notify('Signal interrupted. Reconnecting to the radio stream...');
    state.reconnectTimer=setTimeout(async()=>{
      state.reconnectTimer=null;
      if(!state.intent || state.config?.mode!=='pc') return;
      try{
        el.audio.load();
        await el.audio.play();
      } catch(_) {
        reconnectStream();
      }
    },wait);
  }
    function applyStation(c) {
    // The API reports this read-only state after 20 minutes without a valid
    // PC DJ heartbeat. The operator's original PC settings stay untouched.
    const backupActive=c.managed===true && c.fallbackActive===true &&
      c.mode==='pc' && c.previewMode!==true;
    const playlists=(Array.isArray(c.playlists)?c.playlists:[])
      .filter(p=>p && playlistIdValid(p.id)).slice(0,backupActive?23:24)
      .map(p=>({id:p.id,name:clean(p.name,70)||'PROMETEI playlist'}));
    if(backupActive && !playlists.some(p=>p.id===PC_BACKUP_PLAYLIST_ID))
      playlists.push({id:PC_BACKUP_PLAYLIST_ID,name:PC_BACKUP_PLAYLIST_NAME});
    const url=typeof c.pcStreamUrl==='string' && /^https:\/\//.test(c.pcStreamUrl)?c.pcStreamUrl:'';
    const liveVideoId=/^[A-Za-z0-9_-]{11}$/.test(c.liveVideoId||'')?c.liveVideoId:'';
    const mode=backupActive?'youtube':c.mode==='pc'&&url?'pc':
      c.mode==='youtube_live'&&liveVideoId?'youtube_live':'youtube';
    const enabled=c.enabled!==false;
    const playlistId=backupActive?PC_BACKUP_PLAYLIST_ID:
      playlists.some(p=>p.id===c.playlistId)?c.playlistId:'';
    const was=state.config;
    const previousPlaying=state.playing;
    const previousListening=previousPlaying||state.intent;
    if(was && was.enabled!==enabled && !enabled)stopIntent();
    const sourceChanged=!!was && (
      was.mode!==mode || was.stream!==url || was.liveVideoId!==liveVideoId ||
      was.playlistId!==playlistId || was.enabled!==enabled || was.fallbackActive!==backupActive
    );
    state.playlists=playlists;
    const isTemporaryPcStream=mode==='pc' && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/live\.mp3$/.test(url);
    state.config={mode,stream:url,liveVideoId,playlistId,enabled,managed:c.managed===true,
      previewMode:c.previewMode===true||isTemporaryPcStream,
      fallbackActive:backupActive};
    renderPlaylists();
    renderHistory();
    if(globalMode())refreshGlobalHistory();
    if(!enabled){
      if(state.playing||state.source){
        window.PrometeiPcPreview?.stop();
        el.audio.pause();
        try{state.yt?.pauseVideo();}catch(_){}
      }
      state.playing=false;state.loading=false;state.source=null;
      el.title.textContent='PROMETEI FM / OFF AIR';
      el.artist.textContent='Our DJs will return with more music.';
      el.source.textContent='◌ BROADCAST PAUSED';
      notify('Our station is off air. Check back soon.');
      update();
      return;
    }
    if(mode==='pc'){
      if(!was || sourceChanged){
        cancelReconnect();
        el.audio.pause();
        try{state.yt?.pauseVideo();}catch(_){}
        state.source='pc';state.playing=false;state.loading=false;
        window.PrometeiPcPreview?.stop();
        if(state.config.previewMode){el.audio.removeAttribute('src');el.audio.load();}
        else el.audio.src=url;
        el.title.textContent=t('PROMETEI FM / Live stream');
        el.artist.textContent=t('Broadcast selected by our DJ');
        el.source.textContent=t('♫ AUTHORIZED PC STREAM');
        notify(state.config.previewMode?'Temporary owner-PC broadcast preview. Press LISTEN; the owner must keep their PC on.':'Our live PC radio source is available. Press LISTEN to connect.');
        update();
        if(previousListening){
          state.intent=true;state.loading=true;update();
          if(state.config.previewMode){
            const ok=window.PrometeiPcPreview?.start(el.audio,url,notify);
            if(!ok){state.loading=false;update();notify('PC stream returned. Tap LISTEN to reconnect.');}
          }else{
            el.audio.play().catch(()=>{
              state.loading=false;update();
              notify('PC stream returned. Tap LISTEN to reconnect.');
            });
          }
        }
      }
    }else if(!was || sourceChanged){
      window.PrometeiPcPreview?.stop();
      cancelReconnect();
      el.audio.pause();
      state.source=null;state.playing=false;state.loading=false;
      el.title.textContent=t(backupActive?'PROMETEI FM / Backup music':'PROMETEI FM / Our music');
      el.artist.textContent=t(backupActive?
        'No PC DJ signal for 20 minutes. Official YouTube playlist is selected.':
        'Station-selected YouTube playlists');
      el.source.textContent=t(backupActive?'↪ PC OFFLINE / YOUTUBE BACKUP':
        mode==='youtube_live'?'● OFFICIAL YOUTUBE LIVE':'▶ OFFICIAL YOUTUBE PLAYER');
      notify(backupActive?
        'The PC was silent for 20 minutes. YouTube backup is ready. Press LISTEN.':
        mode==='youtube_live'?'PROMETEI YouTube Live is selected. Press LISTEN.':
          'Station-curated YouTube music is ready. Press LISTEN.');
      update();
      if(previousListening){state.intent=true;startYoutube();}
    }
    if(!playlists.length && mode==='youtube'){
      notify('The station team is choosing the next playlist.');
    }
  }
  async function loadConfig() {
    try {
      const config=await fetchStation();
      applyStation(config);
    } catch(error){
      if(!state.config)notify('Station is temporarily unavailable. Try again shortly.');
    }
  }
  function selectPlaylist() {
    const pin=state.config?.playlistId;
    if(pin){
      const selected=state.playlists.find(p=>p.id===pin);
      if(selected)return selected;
    }
    const options = state.playlists.filter(p => !state.lastPlaylists.includes(p.id));
    const candidates = options.length ? options : state.playlists;
    if (!candidates.length) return null;
    const p = candidates[Math.floor(Math.random() * candidates.length)];
    state.lastPlaylists.unshift(p.id);
    state.lastPlaylists.length = Math.min(state.lastPlaylists.length, Math.max(1, state.playlists.length - 1), 3);
    return p;
  }
  async function ensureYoutube() {
    if (state.yt) return state.yt;
    if (state.ytPromise) return state.ytPromise;
    state.ytPromise = new Promise((resolve,reject) => {
      let done = false;
      const timeout = setTimeout(() => {
        if (!done) { done = true; state.ytPromise = null; reject(Error('YouTube player timed out')); }
      }, 15000);
      const boot = () => {
        if (done) return;
        try {
          new window.YT.Player('yt-player', {
            width:'640', height:'360',
            playerVars:{playsinline:1, controls:1, rel:0, origin:location.origin},
            events:{
              onReady:evt => {
                if (done) return;
                done = true; clearTimeout(timeout);
                state.yt = evt.target; resolve(evt.target);
              },
              onStateChange:onYoutubeState,
              onError:onYoutubeError,
              onAutoplayBlocked:() => {
                state.playing = false; state.loading = false; update();
                notify('Autoplay was blocked. Press play inside the visible YouTube player.');
              }
            }
          });
        } catch (error) { done = true; clearTimeout(timeout); state.ytPromise = null; reject(error); }
      };
      if (window.YT?.Player) { boot(); return; }
      window.onYouTubeIframeAPIReady = boot;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        if (done) return;
        done = true; clearTimeout(timeout); state.ytPromise = null; reject(Error('YouTube is unavailable'));
      };
      document.head.append(script);
    });
    return state.ytPromise;
  }
  function recordYouTube() {
    if (!state.playing || state.source !== 'youtube' || !state.yt) return;
    try {
      const data = state.yt.getVideoData() || {};
      const id = clean(data.video_id, 25);
      if (!id || id === state.videoId) return;
      state.videoId = id;
      const title = clean(data.title) || 'YouTube video';
      const artist = clean(data.author, 150) || 'YouTube channel';
      el.title.textContent = title;
      el.artist.textContent = artist;
      el.source.textContent = '▶ YOUTUBE / ' + (state.current?.name || 'PROMETEI');
      remember({title, artist, source:'youtube', collection:state.current?.name || 'PROMETEI'});
    } catch (_) { /* metadata can arrive later */ }
  }
  function onYoutubeState(evt) {
    if (state.source !== 'youtube') return;
    const Y = window.YT?.PlayerState;
    if (!Y) return;
    if (evt.data === Y.PLAYING) {
      state.playing = true; state.loading = false; state.errors = 0;
      state.intent=true;
      update(); recordYouTube();
      notify('Playing in the official YouTube player. Availability and ads depend on YouTube.');
    } else if (evt.data === Y.ENDED) {
      state.playing = false; update();
      if(state.config?.mode==='youtube_live')notify('The YouTube Live broadcast has ended.');
      else startYoutube();
    } else if (evt.data === Y.PAUSED) {
      state.playing = false; state.loading = false; stopIntent();update();
    } else if (evt.data === Y.BUFFERING) {
      state.loading = true; update();
    }
  }
  function onYoutubeError(evt) {
    state.playing = false; state.loading = false; state.errors++;
    update();
    notify('YouTube cannot play this item (code ' + evt.data + '). Some videos restrict embedding.');
    if (state.errors <= 2) startYoutube();
  }
  async function startYoutube() {
    if(!state.config?.enabled) {notify('Our station is currently off air.');return;}
    const liveMode=state.config.mode==='youtube_live';
    const p=liveMode?{id:state.config.liveVideoId,name:'PROMETEI LIVE'}:selectPlaylist();
    if (!p) { notify('Station music is not configured.'); return; }
    state.source = 'youtube'; state.loading = true; state.playing = false;
    state.current = p; state.videoId = '';
    if(el.fallback) el.fallback.href=liveMode?'https://www.youtube.com/watch?v='+encodeURIComponent(p.id):'https://www.youtube.com/playlist?list='+encodeURIComponent(p.id);
    el.title.textContent = 'Tuning to ' + p.name;
    el.artist.textContent = 'Connecting to the official YouTube player...';
    el.source.textContent = '▶ YOUTUBE / ' + p.name;
    update();
    try {
      const player = await ensureYoutube();
      if(liveMode)player.loadVideoById({videoId:p.id});
      else{
        player.loadPlaylist({listType:'playlist', list:p.id, index:0, startSeconds:0});
        if(typeof player.setShuffle==='function')player.setShuffle(true);
      }
      notify('Connecting to station selection...');
    } catch (error) {
      state.playing = false; state.loading = false; update();
      notify(clean(error?.message) || 'Could not load YouTube player.');
    }
  }
  async function toggleListening() {
    if (!state.config) { notify('Station is loading.'); return; }
    if (!state.config.enabled) { notify('PROMETEI FM is off air.'); return; }
    if (state.source === 'pc' && state.config.previewMode){
      if(state.playing){window.PrometeiPcPreview?.stop();stopIntent();el.audio.pause();update();return;}
      state.intent=true;state.loading=true;update();
      const ok=window.PrometeiPcPreview?.start(el.audio,state.config.stream,notify);
      if(!ok){state.loading=false;update();}
      return;
    }
    if (state.source === 'pc') {
      if (state.playing) { stopIntent(); el.audio.pause(); return; }
      state.intent=true;
      state.reconnects=0;
      cancelReconnect();
      try { await el.audio.play(); }
      catch (_) { notify('Browser blocked audio. Tap play on the station player.'); }
      return;
    }
    if (state.playing) {
      stopIntent();state.yt?.pauseVideo();
      return;
    }
    state.intent=true;
    // A previously loaded YouTube player may still point at an old source.
    if (state.yt) {
      if(state.source!=='youtube'||!state.current)startYoutube();
      else state.yt.playVideo();
      return;
    }
    startYoutube();
  }
  el.play.addEventListener('click', toggleListening);
  el.audio.addEventListener('playing', () => {
    state.playing = true; state.loading = false; state.reconnects=0;
    cancelReconnect();update();
    notify('Connected to PROMETEI FM stream.');
  });
  el.audio.addEventListener('pause', () => { state.playing = false; update(); });
  el.audio.addEventListener('error', () => {
    if (state.source !== 'pc') return;
    state.playing = false; update();
    if(state.config?.previewMode){notify('PC WebSocket audio stopped. Press LISTEN to reconnect.');return;}
    reconnectStream();
  });
  el.request.addEventListener('submit', e => {
    e.preventDefault();
    const artist = clean($('request-artist').value, 100);
    const song = clean($('request-song').value, 100);
    const dedication = clean($('request-dedication').value, 240);
    if (!artist || !song) { el.requestStatus.textContent = 'Enter the artist and song title.'; return; }
    const body = ['Hello PROMETEI FM!', '', 'I would like to request:', artist + ' — ' + song,
      dedication ? 'Dedication: ' + dedication : '', '',
      'I understand that this is a request, not an automatic broadcast or payment.'].join('\n');
    const mailto = 'mailto:prometeimes@gmail.com?subject=' +
      encodeURIComponent('PROMETEI FM song request') + '&body=' + encodeURIComponent(body);
    el.requestStatus.textContent = 'Your email application will open. Send the message there to complete the request. No payment is taken.';
    window.location.href = mailto;
  });
  function counter() {
    if (state.source === 'pc') {
      el.time.textContent = '● STREAM';
    } else if (state.yt) {
      recordYouTube();
      try { el.time.textContent = duration(state.yt.getCurrentTime()) + ' / ' + duration(state.yt.getDuration()); }
      catch (_) {}
    }
  }
  renderHistory();
  update();
  $('year').textContent = String(new Date().getFullYear());
  document.addEventListener('prometei-fm:language',()=>{
    update();
    if(!state.playing && state.config?.mode==='pc')notify('Our live PC radio source is available. Press LISTEN to connect.');
  });
  window.addEventListener('pagehide',cancelReconnect);
  setInterval(counter, 1000);
  loadConfig();
  setInterval(loadConfig, 20000);
  setInterval(refreshGlobalHistory, 30000);
})();
