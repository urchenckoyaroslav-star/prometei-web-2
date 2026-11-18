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
    request: $('request-form'), requestStatus: $('request-status')
  };
  const HISTORY_KEY = 'prometei-fm-listener-history-v2';
  const state = {
    config: null, playlists: [], current: null, lastPlaylists: [],
    yt: null, ytPromise: null, playing: false, loading: false,
    source: null, videoId: '', recent: [], errors: 0
  };
  const clean = (val, max = 180) => String(val ?? '').trim().slice(0, max);
  const playlistIdValid = id => typeof id === 'string' && /^[A-Za-z0-9_-]{10,120}$/.test(id);
  const duration = value => {
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const s = Math.floor(value);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  const notify = value => { el.message.textContent = value; };
  const update = () => {
    el.play.innerHTML = state.playing ? 'Ⅱ <span>PAUSE</span>' : '▶ <span>LISTEN</span>';
    el.play.setAttribute('aria-label', state.playing ? 'Pause listening' : 'Start listening');
    el.status.textContent = state.loading ? 'CONNECTING' : state.playing ? 'PLAYING' : 'READY';
    el.status.classList.toggle('is-live', state.playing);
    el.art.classList.toggle('playing', state.playing);
    el.video.hidden = state.source !== 'youtube';
    el.audioStage.hidden = state.source === 'youtube';
    el.audioStage.classList.toggle('active', state.source === 'pc' && state.playing);
  };
  let history = [];
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (Array.isArray(h)) history = h.slice(0, 60).filter(x => x && x.title && Number.isFinite(x.at));
  } catch (_) { /* private mode */ }
  function renderHistory() {
    el.history.replaceChildren();
    if (!history.length) {
      const li = document.createElement('li');
      li.className = 'history-empty';
      li.textContent = 'Songs you listen to will appear here. This is your listening history, not a station-wide play log.';
      el.history.append(li);
    }
    for (const h of history.slice(0, 40)) {
      const row = document.createElement('li');
      const time = document.createElement('div');
      time.className = 'history-time';
      time.textContent = new Date(h.at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      const small = document.createElement('small');
      small.textContent = h.source === 'pc' ? 'RADIO STREAM' : 'YOUTUBE';
      time.append(small);
      const title = document.createElement('div');
      title.className = 'history-track';
      title.textContent = h.title;
      const artist = document.createElement('small');
      artist.textContent = h.artist || 'Artist / channel';
      title.append(artist);
      const collection = document.createElement('div');
      collection.className = 'history-collection';
      collection.textContent = h.collection || 'PROMETEI selection';
      row.append(time, title, collection);
      el.history.append(row);
    }
    el.historyCount.textContent = String(history.length);
  }
  function remember(entry) {
    if (!entry?.title) return;
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
  async function loadConfig() {
    const response = await fetch('fm-config.json', {cache:'no-store'});
    if (!response.ok) throw Error('Station configuration unavailable');
    const c = await response.json();
    state.playlists = (Array.isArray(c.playlists) ? c.playlists : [])
      .filter(x => x && playlistIdValid(x.id))
      .slice(0, 24)
      .map(x => ({id:x.id, name:clean(x.name,70) || 'PROMETEI playlist'}));
    const stream = typeof c.pcStreamUrl === 'string' && /^https:\/\//.test(c.pcStreamUrl)
      ? c.pcStreamUrl : '';
    state.config = {mode:c.mode === 'pc' && stream ? 'pc' : 'youtube', stream};
    renderPlaylists();
    if (state.config.mode === 'pc') {
      el.audio.src = stream;
      state.source = 'pc';
      el.title.textContent = 'PROMETEI FM / Live Stream';
      el.artist.textContent = 'Broadcast chosen by our DJ';
      el.source.textContent = '♫ AUTHORIZED PC STREAM';
      notify('A station stream is available. Press LISTEN to connect.');
    } else if (state.playlists.length) {
      el.title.textContent = 'PROMETEI FM / On Air Selection';
      el.artist.textContent = 'Music selected by our station';
      el.source.textContent = '▶ OFFICIAL YOUTUBE PLAYER';
      notify('Station-curated playlists are ready. Press LISTEN to play.');
    } else notify('No station music is configured at the moment.');
    update();
  }
  function selectPlaylist() {
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
      update(); recordYouTube();
      notify('Playing in the official YouTube player. Availability and ads depend on YouTube.');
    } else if (evt.data === Y.ENDED) {
      state.playing = false; update(); startYoutube();
    } else if (evt.data === Y.PAUSED) {
      state.playing = false; state.loading = false; update();
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
    const p = selectPlaylist();
    if (!p) { notify('Station music is not configured.'); return; }
    state.source = 'youtube'; state.loading = true; state.playing = false;
    state.current = p; state.videoId = '';
    el.title.textContent = 'Tuning to ' + p.name;
    el.artist.textContent = 'Connecting to the official YouTube player...';
    el.source.textContent = '▶ YOUTUBE / ' + p.name;
    update();
    try {
      const player = await ensureYoutube();
      player.loadPlaylist({listType:'playlist', list:p.id, index:0, startSeconds:0});
      if (typeof player.setShuffle === 'function') player.setShuffle(true);
      notify('Connecting to station selection...');
    } catch (error) {
      state.playing = false; state.loading = false; update();
      notify(clean(error?.message) || 'Could not load YouTube player.');
    }
  }
  async function toggleListening() {
    if (!state.config) { notify('Station is loading.'); return; }
    if (state.source === 'pc') {
      if (state.playing) { el.audio.pause(); return; }
      try { await el.audio.play(); }
      catch (_) { notify('Browser blocked audio. Tap play on the station player.'); }
      return;
    }
    if (state.playing) {
      state.yt?.pauseVideo();
      return;
    }
    if (state.yt) { state.yt.playVideo(); return; }
    startYoutube();
  }
  el.play.addEventListener('click', toggleListening);
  el.audio.addEventListener('playing', () => {
    state.playing = true; state.loading = false; update();
    notify('Connected to PROMETEI FM stream.');
  });
  el.audio.addEventListener('pause', () => { state.playing = false; update(); });
  el.audio.addEventListener('error', () => {
    if (state.source !== 'pc') return;
    state.playing = false; update(); notify('Station stream is temporarily unavailable.');
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
  setInterval(counter, 1000);
  loadConfig().catch(() => notify('Station could not load. Try again later.'));
})();
