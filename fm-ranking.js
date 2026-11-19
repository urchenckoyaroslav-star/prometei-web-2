const lists=[...document.querySelectorAll('[data-region]')];
const message=document.querySelector('#vote-message');
let week='',choice='',pending=false;
function paint(scores){
  for(const list of lists){
    const rows=[...list.children];
    for(const row of rows){
      const id=list.dataset.region+'/'+row.dataset.id;
      const votes=scores[id]||0;
      row.querySelector('output').value=String(votes);
      const button=row.querySelector('button');
      button.disabled=pending||!!choice||!week;
      button.textContent=choice===id?'Ваш голос':'Голосовать';
    }
    rows.sort((a,b)=>Number(b.querySelector('output').value)-Number(a.querySelector('output').value)||Number(a.dataset.seed)-Number(b.dataset.seed));
    list.append(...rows);
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
  }catch(e){message.textContent=e.message;}
}
document.addEventListener('click',async e=>{
  const button=e.target.closest('button[data-vote]');
  if(!button||pending||choice)return;
  pending=true;generation++;paint(scores);
  const id=button.closest('li').dataset.id,region=button.closest('ol').dataset.region;
  try{
    const r=await fetch('/api/fm/votes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,region,week})});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'Попробуйте позже');
    choice=d.choice;scores[choice]=(scores[choice]||0)+1;message.textContent='Голос принят';
  }catch(e){message.textContent=e.message;}
  finally{pending=false;paint(scores);}
});
refresh();setInterval(refresh,30000);
