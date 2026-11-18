/* PROMETEI FM private live DJ deck. Access token only in current tab. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id), token=()=>($('dj-token')?.value||'').trim();
 const box=$('fm-deck'),notice=$('deck-notice');
 if(!box)return;
 const randomButton=document.createElement('button');
 randomButton.type='button';
 randomButton.textContent='⤨ СЛУЧАЙНЫЙ ТРЕК';
 $('deck-next').after(randomButton);
 const ftime=sec=>{
   const x=Math.max(0,Math.floor(Number(sec)||0));
   return Math.floor(x/3600)>0?`${Math.floor(x/3600)}:${String(Math.floor(x%3600/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`:
     `${Math.floor(x/60)}:${String(x%60).padStart(2,'0')}`;
 };
 let tracks=[],current=null,serverAt=0,receivedAt=0,session='',lastCatalog='',pending='',pendingAt=0,
     search='',shown=80,seekPreview=null,refreshing=false;
 const show=(s)=>{notice.textContent=s;};
 const buttons=()=>[$('deck-next'),$('deck-previous'),$('deck-pause'),$('deck-seek')];
 function enabled(value){
   for(const b of buttons()) b.disabled=!value;
   randomButton.disabled=!value||!tracks.some(track=>track.id!==current?.trackId);
   $('deck-pause').textContent=current?.state==='paused'?'▶ ПРОДОЛЖИТЬ':'Ⅱ ПАУЗА';
 }
 function elapsed(){
   if(!current)return 0;
   const advance=current.state==='playing'?(Date.now()-receivedAt)/1000:0;
   return Math.min(Math.max(0,current.durationSec||0),Math.max(0,current.elapsedSec||0)+advance);
 }
 function paintClock(){
   const duration=current?.durationSec||0,sec=elapsed();
   $('deck-elapsed').textContent=ftime(seekPreview===null?sec:seekPreview);
   $('deck-duration').textContent=ftime(duration);
   $('deck-progress').style.width=(duration?Math.min(100,100*sec/duration):0)+'%';
   const seeking=duration>1&&current?.state!=='idle';
   $('deck-seek').disabled=!seeking||!!pending;
   if(seekPreview===null){
     $('deck-seek').value=String(Math.min(Math.max(0,Math.round(sec)),duration||0));
   }
   $('deck-seek').max=String(Math.max(1,Math.round(duration)-1));
 }
 function drawTracks(){
   const list=$('deck-library');
   list.replaceChildren();
   const q=search.toLocaleLowerCase();
   const filtered=tracks.filter(t=>(t.title+' '+t.artist).toLocaleLowerCase().includes(q));
   $('deck-count').textContent=filtered.length+' / '+tracks.length+' треков';
   const subset=filtered.slice(0,shown);
   for(const t of subset){
     const row=document.createElement('li');row.className='deck-track'+(t.id===current?.trackId?' deck-active':'');
     const title=document.createElement('div');title.className='deck-track-info';
     const strong=document.createElement('strong');strong.textContent=t.title;
     const small=document.createElement('small');small.textContent=(t.artist||'Исполнитель не указан')+' · '+ftime(t.durationSec);
     title.append(strong,small);
     const play=document.createElement('button');
     play.type='button';play.className='deck-track-play';
     play.textContent=t.id===current?.trackId?'● В ЭФИРЕ':'▶ В ЭФИР';
     play.disabled=!!pending||t.id===current?.trackId||!current;
     play.addEventListener('click',()=>command('play',{trackId:t.id}));
     row.append(title,play);list.append(row);
   }
   $('deck-more').hidden=filtered.length<=shown;
   if(!filtered.length){
     const empty=document.createElement('li');empty.className='deck-empty';
     empty.textContent=tracks.length?'Нет песен по запросу.':'Медиатека ПК ещё не передана в пульт.';
     list.append(empty);
   }
 }
 async function get(){
   if(refreshing)return;
   const key=token();
   if(key.length<24){
     current=null;enabled(false);show('Введи DJ-токен выше, чтобы увидеть каталог и управлять общим эфиром.');
     return;
   }
   refreshing=true;
   try{
     const r=await fetch('/api/fm/control',{headers:{authorization:'Bearer '+key},cache:'no-store'});
     const data=await r.json();
     if(!r.ok)throw Error(data.error||'Ошибка связи с пультом');
     const live=!!data.online;
     current=live?data.status:null;
     serverAt=Number(data.serverAt)||Date.now();receivedAt=Date.now();
     $('deck-health').textContent=live?'● ПК В ЭФИРЕ':'○ ПК НЕ ПОДКЛЮЧЁН';
     $('deck-health').dataset.online=live?'yes':'no';
     $('deck-title').textContent=live?(current.title||'Готово к воспроизведению'):'Ожидаем сигнал с ПК';
     $('deck-artist').textContent=live?(current.artist||'Исполнитель не указан'):'Для управления музыкой нужен обновлённый DJ-движок на ПК';
     $('deck-state').textContent=live?(current.state==='paused'?'ПАУЗА':current.state==='playing'?'ИГРАЕТ':'ГОТОВ'):'OFFLINE';
     const newSession=live?current.runId:'';
     const newTracks=Array.isArray(data.tracks)?data.tracks:[];
     const fingerprint=newSession+'/'+newTracks.length+'/'+(newTracks[0]?.id||'')+'/'+(newTracks.at(-1)?.id||'');
     if(fingerprint!==lastCatalog){
       session=newSession;lastCatalog=fingerprint;tracks=newTracks;drawTracks();
     }else{
       const active=$('deck-library').querySelector('.deck-active');
       const expected=tracks.find(t=>t.id===current?.trackId);
       if((active?active.querySelector('strong')?.textContent:'')!==(expected?.title||''))drawTracks();
     }
     if(pending){
       if(current?.commandAck===pending){
         show(current.commandResult==='ok'?'✓ Команда выполнена на ПК.':'ПК ответил: '+(current.commandResult||'команда обработана'));
         pending='';
       }else if(Date.now()-pendingAt>55000){
         show('Нет подтверждения от ПК. Проверь эфир; команда могла не дойти.');pending='';
       }else show('⌛ Команда в очереди; ждём подтверждения ПК…');
     }else{
       show(live?'Управление общим эфиром включено. Изменения могут дойти до слушателей с задержкой сети.':
         'Каталог и управление появятся, когда PC DJ подключится к защищённому каналу.');
     }
     enabled(live&&!pending);paintClock();
   }catch(e){
     current=null;enabled(false);
     $('deck-health').textContent='○ НЕТ СВЯЗИ';
     show(String(e.message||e).slice(0,180));
   }finally{refreshing=false;}
 }
 async function command(action,fields={}){
   if(!current||pending)return;
   const key=token();
   if(key.length<24)return show('Нужен DJ-токен.');
   pending='sending';pendingAt=Date.now();enabled(false);drawTracks();
   show('Передаю команду компьютеру…');
   try{
     const r=await fetch('/api/fm/control',{
       method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},
       body:JSON.stringify({type:'command',action,...fields})
     });
     const data=await r.json();
     if(!r.ok)throw Error(data.error||'Команда отклонена');
     pending=data.commandId;
     show('⌛ Команда отправлена. Ожидание исполнения на ПК…');
   }catch(e){
     pending='';enabled(!!current);
     show('Не выполнено: '+String(e.message||e).slice(0,150));
   }finally{drawTracks();}
 }
 randomButton.addEventListener('click',()=>{
   const choices=tracks.filter(track=>track.id!==current?.trackId);
   if(choices.length){
     const track=choices[Math.floor(Math.random()*choices.length)];
     command('play',{trackId:track.id});
   }
 });
 $('deck-next').addEventListener('click',()=>command('next'));
 $('deck-previous').addEventListener('click',()=>command('previous'));
 $('deck-pause').addEventListener('click',()=>command(current?.state==='paused'?'resume':'pause'));
 $('deck-seek').addEventListener('input',e=>{seekPreview=Number(e.target.value);paintClock();});
 $('deck-seek').addEventListener('change',e=>{
   const time=Number(e.target.value);seekPreview=null;
   if(current?.durationSec>time&&time>=0)command('seek',{offsetSec:time});
 });
 $('deck-search').addEventListener('input',e=>{search=e.target.value.trim();shown=80;drawTracks();});
 $('deck-more').addEventListener('click',()=>{shown+=80;drawTracks();});
 $('load-station').addEventListener('click',get);
 $('dj-token').addEventListener('change',get);
 $('clear-token').addEventListener('click',()=>{
   tracks=[];current=null;pending='';lastCatalog='';
   drawTracks();enabled(false);show('DJ-токен удалён из этой вкладки.');
 });
 enabled(false);drawTracks();paintClock();
 setInterval(()=>{paintClock();},500);
 setInterval(get,3500);
 get();
})();