const message=document.querySelector('#vote-message');
let week='',choice='',pending=false;
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
    button.disabled=pending||!!choice||!week;
    button.textContent=choice.split('/').pop()===row.dataset.id?message.dataset.yours:message.dataset.vote;
  }
  rows.sort((a,b)=>votes(b)-votes(a)||Number(a.dataset.seed)-Number(b.dataset.seed));
  list.append(...rows);
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
  pending=true;generation++;paint(scores);
  const id=button.closest('li').dataset.id,region=button.closest('li').dataset.origin;
  try{
    const r=await fetch('/api/fm/votes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,region,week})});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'Попробуйте позже');
    choice=d.choice;scores[choice]=(scores[choice]||0)+1;message.textContent=message.dataset.saved;
  }catch(e){message.textContent=document.documentElement.lang==='ru'?e.message:message.dataset.retry;}
  finally{pending=false;paint(scores);}
});
refresh();setInterval(refresh,30000);
