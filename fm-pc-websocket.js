/* PROMETEI FM: temporary PC radio using WebSocket + MediaSource.
 * A browser gesture is required to enable audio. No file uploads.
 */
(() => {
  'use strict';
  let socket=null, media=null, source=null, objectURL='', audioNode=null, started=false;
  let pending=[];
  function stop(){
    if(socket){const old=socket;socket=null;try{old.close()}catch(_){}}
    pending=[];media=null;source=null;started=false;
    if(audioNode){try{audioNode.pause()}catch(_){}audioNode=null;}
    if(objectURL){try{URL.revokeObjectURL(objectURL)}catch(_){}objectURL='';}
  }
  function pump(){
    if(!source||source.updating||!pending.length||!media||media.readyState!=='open')return;
    const chunk=pending.shift();
    try{source.appendBuffer(chunk)}
    catch(err){
      if(err.name==='QuotaExceededError'&&source.buffered.length){
        const begin=source.buffered.start(0),end=source.buffered.end(source.buffered.length-1);
        if(end-begin>30){
          try{source.remove(begin,Math.min(end-12,Math.max(begin+1,audioNode.currentTime-3)))}catch(_){}
        }
      }else{pending=[]}
    }
  }
  function fallbackHttpMp3(audio,streamUrl,message){
    stop();
    audioNode=audio;
    // A plain streaming MP3 URL is the compatibility path for Safari and
    // mobile browsers where MSE or WebSockets may not play MP3 reliably.
    audio.src=streamUrl;
    audio.load();
    audio.play().catch(()=>message('Tap LISTEN to start the PC radio in this browser.'));
    message('Connecting to the owner PC using the compatible MP3 stream...');
    return true;
  }
  function start(audio,streamUrl,message){
    stop();
    let endpoint;
    try{
      const url=new URL(streamUrl);
      if(url.protocol!=='https:'||url.pathname!=='/live.mp3')throw Error('bad URL');
      endpoint='wss://'+url.host+'/live.ws';
    }catch(_){message('Temporary PC stream address is invalid.');return false;}
    if(typeof MediaSource==='undefined' || !MediaSource.isTypeSupported('audio/mpeg')){
      return fallbackHttpMp3(audio,streamUrl,message);
    }
    audioNode=audio;
    media=new MediaSource();
    objectURL=URL.createObjectURL(media);
    audio.src=objectURL;
    media.addEventListener('sourceopen',()=>{
      try{
        source=media.addSourceBuffer('audio/mpeg');
        source.mode='sequence';
      }catch(_){fallbackHttpMp3(audio,streamUrl,message);return;}
      source.addEventListener('updateend',()=>{
        if(source.buffered.length){
          const end=source.buffered.end(source.buffered.length-1);
          if(!started&&end>0){
            started=true;
            audio.play().catch(()=>message('Tap LISTEN to enable audio.'));
          }
          if(end-audio.currentTime>24){try{audio.currentTime=Math.max(0,end-3)}catch(_){}}
        }
        pump();
      });
      socket=new WebSocket(endpoint);
      socket.binaryType='arraybuffer';
      socket.onopen=()=>message('Connected to the owner PC. Buffering live radio...');
      socket.onmessage=e=>{
        if(!(e.data instanceof ArrayBuffer))return;
        if(pending.length>96)pending.splice(0,pending.length-48);
        pending.push(e.data);pump();
      };
      const currentSocket=socket;
      socket.onerror=()=>{
        if(socket!==currentSocket)return;
        message('Radio WebSocket unavailable; trying compatible HTTPS MP3.');
        fallbackHttpMp3(audio,streamUrl,message);
      };
      socket.onclose=()=>{
        if(socket!==currentSocket)return;
        message('Radio WebSocket closed; trying compatible HTTPS MP3.');
        fallbackHttpMp3(audio,streamUrl,message);
      };
    },{once:true});
    audio.play().catch(()=>{});
    return true;
  }
  window.PrometeiPcPreview={start,stop};
})();
