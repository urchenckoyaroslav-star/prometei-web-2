/* PROMETEI FM — shared owner-PC radio and station history. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = {
    play: $('play-btn'), message: $('message'), title: $('track-title'),
    artist: $('track-artist'), source: $('track-source'), status: $('play-state'),
    art: $('record-art'), time: $('track-counter'),
    audioStage: $('audio-stage'), audio: $('station-audio'),
    history: $('history-list'), historyCount: $('history-count'),
    request: $('request-form'), requestStatus: $('request-status')
  };
  const globalHistory={items:[],count:0,live:false,current:null,ready:false,error:''};
  let globalVisible=120;
  const globalMode=()=>Boolean(state.config);
  const state = {
    config: null, playing: false, loading: false,
    source: null, intent: false, reconnects: 0, reconnectTimer: null
  };
  const clean = (val, max = 180) => String(val ?? '').trim().slice(0, max);
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
  // A stale ?listen= Quick Tunnel cannot override the live station's new URL.
  const maybePreview = value => {
    if (!previewStream || value?.managed===true) return value;
    return {...value, mode:'pc', pcStreamUrl:previewStream, enabled:true,
      previewMode:true, fallbackActive:false};
  };
  const t = value => window.PrometeiFM?.translate?.(value) || value;
  const notify = value => { el.message.textContent = t(value); };
  const update = () => {
    el.play.innerHTML = state.playing ? 'Ⅱ <span>'+t('PAUSE')+'</span>' : '▶ <span>'+t('LISTEN')+'</span>';
    el.play.setAttribute('aria-label', state.playing ? t('Pause listening') : t('Start listening'));
    el.status.textContent = t(state.loading ? 'CONNECTING' : state.playing ? 'PLAYING' : 'READY');
    el.status.classList.toggle('is-live', state.playing);
    el.art.classList.toggle('playing', state.playing);
    el.audioStage.classList.toggle('active', state.source === 'pc' && state.playing);
  };
  function renderHistory() {
    const items=globalHistory.items;
    el.history.replaceChildren();
    if(!items.length){
      const li=document.createElement('li');
      li.className='history-empty';
      li.textContent=globalHistory.error||'No tracks have been registered in the last 36 hours.';
      el.history.append(li);
    }
    const rows=items.slice(0,globalVisible);
    for(const h of rows){
      const row=document.createElement('li');
      const time=document.createElement('div');
      time.className='history-time';
      const playedAt=h.startedAt||h.at;
      time.textContent=new Date(playedAt).toLocaleString([],{
        day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'
      });
      const small=document.createElement('small');
      small.textContent='PROMETEI FM / ON AIR';
      time.append(small);
      const title=document.createElement('div');title.className='history-track';
      title.textContent=h.title;
      const artist=document.createElement('small');
      artist.textContent=h.artist||'Artist not specified in file metadata';
      title.append(artist);
      const collection=document.createElement('div');collection.className='history-collection';
      collection.textContent=h.album||'PC DJ / SHUFFLE';
      row.append(time,title,collection);
      el.history.append(row);
    }
    if(items.length>globalVisible){
      const more=document.createElement('li');
      more.className='history-show-more';
      const button=document.createElement('button');
      button.className='form-action';button.type='button';
      button.textContent='SHOW MORE TRACKS ('+(items.length-globalVisible)+' LEFT)';
      button.addEventListener('click',()=>{globalVisible+=120;renderHistory();});
      more.append(button);el.history.append(more);
    }
    el.historyCount.textContent=String(globalHistory.count);
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
        if(state.config.pcWebSocket){
          const started=window.PrometeiPcPreview?.start(el.audio,state.config.stream,notify);
          if(!started) reconnectStream();
        } else {
          el.audio.load();
          await el.audio.play();
        }
      } catch(_) {
        reconnectStream();
      }
    },wait);
  }
    function applyStation(c) {
    const url=typeof c.pcStreamUrl==='string' && /^https:\/\//.test(c.pcStreamUrl)?c.pcStreamUrl:'';
    const mode='pc';
    const enabled=c.mode==='pc' && c.enabled===true && Boolean(url) &&
      c.broadcastEnded!==true && c.fallbackActive!==true;
    const was=state.config;
    const previousPlaying=state.playing;
    const previousListening=previousPlaying||state.intent;
    if(was && was.enabled!==enabled && !enabled)stopIntent();
    const sourceChanged=!!was && (
      was.mode!==mode || was.stream!==url ||
      was.enabled!==enabled
    );
    const isTemporaryPcStream=mode==='pc' && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/live\.mp3$/.test(url);
    state.config={mode,stream:url,enabled,managed:c.managed===true,
      previewMode:c.previewMode===true, pcWebSocket:isTemporaryPcStream};
    renderHistory();
    if(globalMode())refreshGlobalHistory();
    if(!enabled){
      if(state.playing||state.source){
        window.PrometeiPcPreview?.stop();
        el.audio.pause();
        el.audio.removeAttribute('src');
        el.audio.load();
      }
      state.playing=false;state.loading=false;state.source=null;
      el.time.textContent='—';
      el.title.textContent=t('Broadcast ended');
      el.artist.textContent='';
      el.source.textContent=t('PROMETEI FM is off air.');
      notify('Our station is currently off air.');
      update();
      return;
    }
    if(mode==='pc'){
      if(!was || sourceChanged){
        cancelReconnect();
        el.audio.pause();
        state.source='pc';state.playing=false;state.loading=false;
        window.PrometeiPcPreview?.stop();
        if(state.config.pcWebSocket){el.audio.removeAttribute('src');el.audio.load();}
        else el.audio.src=url;
        el.title.textContent=t('PROMETEI FM / Live stream');
        el.artist.textContent=t('Broadcast selected by our DJ');
        el.source.textContent=t('♫ AUTHORIZED PC STREAM');
        notify(state.config.previewMode?'Temporary owner-PC broadcast preview. Press LISTEN; the owner must keep their PC on.':'Our live PC radio source is available. Press LISTEN to connect.');
        update();
        if(previousListening){
          state.intent=true;state.loading=true;update();
          if(state.config.pcWebSocket){
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
  async function toggleListening() {
    if (!state.config) { notify('Station is loading.'); return; }
    if (!state.config.enabled) { notify('PROMETEI FM is off air.'); return; }
    if (state.source === 'pc' && state.config.pcWebSocket){
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
  }
  el.play.addEventListener('click', toggleListening);
  el.audio.addEventListener('playing', () => {
    if(!state.config?.enabled || state.source!=='pc')return;
    state.playing = true; state.loading = false; state.reconnects=0;
    cancelReconnect();update();
    notify('Connected to PROMETEI FM stream.');
  });
  el.audio.addEventListener('pause', () => { state.playing = false; update(); });
  el.audio.addEventListener('error', () => {
    if (state.source !== 'pc') return;
    state.playing = false; update();
    if(state.config?.pcWebSocket){notify('PC audio interrupted. Reconnecting to the live stream…');reconnectStream();return;}
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
    }
  }
  renderHistory();
  update();
  $('year').textContent = String(new Date().getFullYear());
  document.addEventListener('prometei-fm:language',()=>{
    update();
    if(state.config && !state.config.enabled) {
      el.title.textContent=t('Broadcast ended');
      el.source.textContent=t('PROMETEI FM is off air.');
      notify('Our station is currently off air.');
      return;
    }
    if(!state.playing && state.config?.mode==='pc')notify('Our live PC radio source is available. Press LISTEN to connect.');
  });
  window.addEventListener('pagehide',cancelReconnect);
  setInterval(counter, 1000);
  loadConfig();
  setInterval(loadConfig, 20000);
  setInterval(refreshGlobalHistory, 30000);
})();
