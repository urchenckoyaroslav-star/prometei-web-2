const message=document.querySelector('#vote-message');
let week='',choice='',pending=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function paint(scores){
  const list=document.querySelector('#chart');
  const rows=[...list.children];
  const counts=new Map();
  for(const [key,count] of Object.entries(scores)){
    const id=key.split('/').pop();
    counts.set(id,(counts.get(id)||0)+count);
  }
  const votes=row=>counts.get(row.dataset.id)||0;
  const total=rows.reduce((sum,row)=>sum+votes(row),0);
  const percent=new Intl.NumberFormat(document.documentElement.lang,{style:'percent',maximumFractionDigits:1});
  for(const row of rows){
    row.querySelector('output').value=percent.format(total?votes(row)/total:0);
    const button=row.querySelector('button');
    row.style.setProperty('--vote-share',(total?100*votes(row)/total:0)+'%');
    row.classList.toggle('selected',choice.split('/').pop()===row.dataset.id);
    button.disabled=pending||!!choice||!week;
    button.textContent=choice.split('/').pop()===row.dataset.id?message.dataset.yours:message.dataset.vote;
  }
  const previous=rows.slice();
  rows.sort((a,b)=>votes(b)-votes(a)||Number(a.dataset.seed)-Number(b.dataset.seed));
  if(rows.some((row,i)=>row!==previous[i])){
    const tops=new Map(previous.map(row=>[row,row.getBoundingClientRect().top]));
    const focus=document.activeElement;
    list.append(...rows);
    if(list.contains(focus))focus.focus({preventScroll:true});
    if(!reduced.matches)for(const row of rows){
      const offset=tops.get(row)-row.getBoundingClientRect().top;
      if(offset)row.animate([{transform:'translateY('+offset+'px)'},{transform:'none'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
  }
}
let scores={},generation=0;
async function refresh(){
  const token=++generation;
  try{
    const r=await fetch('/api/fm/votes',{cache:'no-store'}),d=await r.json();
    if(!r.ok)throw Error(d.error||'Рейтинг временно недоступен');
    if(token!==generation||pending)return;
    if(week!==d.week)choice='';
    week=d.week;choice=d.choice||choice;scores=d.scores;paint(scores);
  }catch(e){message.textContent=document.documentElement.lang==='ru'?e.message:message.dataset.retry;}
}
document.addEventListener('click',async e=>{
  const button=e.target.closest('button[data-vote]');
  if(!button||pending||choice)return;
  button.classList.add('sending');
  pending=true;generation++;paint(scores);
  const id=button.closest('li').dataset.id,region=button.closest('li').dataset.origin;
  try{
    const r=await fetch('/api/fm/votes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,region,week})});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'Попробуйте позже');
    choice=d.choice;scores[choice]=(scores[choice]||0)+1;message.textContent=message.dataset.saved;
    button.closest('li').classList.add('celebrate');
    message.classList.add('confirmed');
    setTimeout(()=>{button.closest('li').classList.remove('celebrate');message.classList.remove('confirmed');},2400);
  }catch(e){message.textContent=document.documentElement.lang==='ru'?e.message:message.dataset.retry;}
  finally{button.classList.remove('sending');pending=false;paint(scores);}
});
refresh();setInterval(refresh,30000);

const playChart=document.querySelector('#play-chart');
const playerPanel=document.querySelector('#chart-player');
const screen=document.querySelector('#chart-screen');
const jump=document.querySelector('#chart-jump');
let sessionTracks=[];
function playFrom(index){
  const ids=sessionTracks.slice(index).map(track=>track.id);
  const url=new URL('https://www.youtube-nocookie.com/embed/'+ids[0]);
  url.searchParams.set('autoplay','1');
  url.searchParams.set('playsinline','1');
  if(ids.length>1)url.searchParams.set('playlist',ids.slice(1).join(','));
  const frame=document.createElement('iframe');
  frame.title='PROMETEI FM · '+sessionTracks[index].title;
  frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
  frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.src=url.href;
  screen.replaceChildren(frame);
}
playChart.addEventListener('click',()=>{
  sessionTracks=[...document.querySelectorAll('#chart > li')].map(row=>({id:row.dataset.id,title:row.querySelector('a').textContent}));
  if(!sessionTracks.length)return;
  jump.length=1;
  sessionTracks.forEach((track,i)=>jump.add(new Option((i+1)+'. '+track.title,String(i))));
  playerPanel.hidden=false;
  playChart.hidden=true;
  playChart.setAttribute('aria-expanded','true');
  playFrom(0);
  jump.focus({preventScroll:true});
});
jump.addEventListener('change',()=>{
  if(jump.value==='')return;
  playFrom(Number(jump.value));
  jump.selectedIndex=0;
});
document.querySelector('#close-chart').addEventListener('click',()=>{
  screen.replaceChildren();
  sessionTracks=[];
  playerPanel.hidden=true;
  playChart.hidden=false;
  playChart.setAttribute('aria-expanded','false');
  playChart.focus({preventScroll:true});
});
