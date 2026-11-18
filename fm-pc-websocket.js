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
  function start(audio,streamUrl,message){
    stop();
    if(typeof MediaSource==='undefined'||!MediaSource.isTypeSupported('audio/mpeg')){
      message('Live MP3 WebSocket is unsupported. Try Opera or Chrome for this temporary PC station.');
      return false;
    }
    let endpoint;
    try{
      const url=new URL(streamUrl);
      if(url.protocol!=='https:'||url.pathname!=='/live.mp3')throw Error('bad URL');
      endpoint='wss://'+url.host+'/live.ws';
    }catch(_){message('Temporary PC stream address is invalid.');return false;}
    audioNode=audio;
    media=new MediaSource();
    objectURL=URL.createObjectURL(media);
    audio.src=objectURL;
    media.addEventListener('sourceopen',()=>{
      try{
        source=media.addSourceBuffer('audio/mpeg');
        source.mode='sequence';
      }catch(_){message('This browser cannot open a live MP3 buffer.');return;}
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
      socket.onerror=()=>message('Temporary PC radio connection failed.');
      socket.onclose=()=>message('The PC stream has ended. Press LISTEN to reconnect.');
    },{once:true});
    audio.play().catch(()=>{});
    return true;
  }
  window.PrometeiPcPreview={start,stop};
})();
