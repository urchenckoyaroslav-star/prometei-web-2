/* PROMETEI Lunar Lab mirrors MoonPhaseCalculator + PrometeiMoonEconomy V1.
 * Source rule: fixed epoch 2024-01-11T11:57Z, 29.53058867 days, 20 UTC milestones.
 * This static preview neither claims points nor reads Crypto ID, ROOT policies or wallets. */
(()=>{
"use strict";
const config=document.getElementById("lp-config");
if(!config)return;
const cfg=JSON.parse(config.textContent);
const $=id=>document.getElementById(id);
const syn=cfg.synodicDays,dayMs=86400000,epoch=cfg.epochMs;
const locale={en:"en-US",uk:"uk-UA",ru:"ru-RU",de:"de-DE",es:"es-ES",zh:"zh-CN",ja:"ja-JP"}[cfg.lang]||"en-US";
const one=new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1});
const three=new Intl.NumberFormat(locale,{minimumFractionDigits:3,maximumFractionDigits:3});
const dec=new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2});
const dateText=new Intl.DateTimeFormat(locale,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"});
const utcText=new Intl.DateTimeFormat(locale,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"UTC"});
const monthText=new Intl.DateTimeFormat(locale,{year:"numeric",month:"long",timeZone:"UTC"});
const normalize=n=>((n%syn)+syn)%syn;
const cycleAt=ms=>(ms-epoch)/dayMs/syn;
const lunationIndex=ms=>Math.floor(cycleAt(ms));
const phaseAt=ms=>((cycleAt(ms)%1)+1)%1;
const ageAt=date=>normalize((date.getTime()-epoch)/dayMs);
const illumination=p=>(1-Math.cos(2*Math.PI*p))/2;
const phaseIndex=p=>Math.floor(p*8+0.5)%8;
const momentFor=(lunation,p)=>epoch+Math.trunc((lunation+p)*syn*dayMs);
const waxingPhase=percent=>Math.acos(Math.max(-1,Math.min(1,1-2*percent/100)))/(2*Math.PI);
const milestones=[
 ...Array.from({length:10},(_,i)=>({p:waxingPhase((i+1)*10),threshold:(i+1)*10,waxing:true,milli:cfg.waxingRewardMilli})),
 ...Array.from({length:10},(_,i)=>{const threshold=90-i*10;return {p:threshold===0?1:1-waxingPhase(threshold),threshold,waxing:false,milli:cfg.waningRewardMilli};})
].sort((a,b)=>a.p-b.p);
const totalMilli=milestones.reduce((sum,m)=>sum+m.milli,0);
const slider=$("lp-slider");
const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
const dateNow=new Date();
const utcToday=new Date(Date.UTC(dateNow.getUTCFullYear(),dateNow.getUTCMonth(),dateNow.getUTCDate(),12));
let visibleMonth=new Date(Date.UTC(utcToday.getUTCFullYear(),utcToday.getUTCMonth(),1,12));
let selectedDate=null,lastDay=null,animationFrame=0,currentPhase=phaseAt(utcToday.getTime());
const phaseButtons=[...document.querySelectorAll("[data-phase-index]")];
const rail=$("lp-milestones");
const railButtons=[];
const valueOutput=$("lp-issuance-number");
const cycleOutput=$("lp-cycle-number");
let previouslyDisplayedMilli=null;
function showPotentialReward(earnedMilli){
 const formatted=one.format(earnedMilli/1000);
 // Split markup keeps the value gold and the PROI symbol green while screen readers
 // continue receiving a single natural text value inside the parent <output>.
 if(valueOutput)valueOutput.textContent=formatted;
 if(previouslyDisplayedMilli!==null && earnedMilli!==previouslyDisplayedMilli &&
    !reduced && valueOutput?.animate){
   valueOutput.animate([
     {transform:"translateY(5px) scale(.985)",opacity:.65},
     {transform:"translateY(0) scale(1)",opacity:1}
   ],{duration:220,easing:"ease-out"});
 }
 previouslyDisplayedMilli=earnedMilli;
}
const chartTrace=$("lp-chart-trace"),chartArea=$("lp-chart-area");
const chartCursor=$("lp-chart-cursor"),chartPoint=$("lp-chart-point");
function renderRewardChart(){
 if(!chartTrace||!chartArea)return;
 const left=20,right=620,top=24,bottom=144,height=bottom-top;
 let previous=bottom,cumulative=0;
 let data="M"+left+" "+bottom;
 for(const m of milestones){
  const x=left+(right-left)*m.p;
  cumulative+=m.milli;
  const y=bottom-(cumulative/totalMilli)*height;
  data+=" H"+x.toFixed(2)+" V"+y.toFixed(2);
  previous=y;
 }
 data+=" H"+right;
 chartTrace.setAttribute("d",data);
 chartArea.setAttribute("d",data+" V"+bottom+" H"+left+" Z");
}
function updateChartCursor(p,earnedMilli){
 if(!chartCursor||!chartPoint)return;
 const x=20+600*p,y=144-(earnedMilli/totalMilli)*120;
 chartCursor.setAttribute("x1",x.toFixed(2));
 chartCursor.setAttribute("x2",x.toFixed(2));
 chartPoint.setAttribute("cx",x.toFixed(2));
 chartPoint.setAttribute("cy",y.toFixed(2));
}

const safeInput=(id,fallback,min,max)=>{
 const n=Number($(id).value);
 return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
function moonPath(p){
 const cos=Math.cos(p*2*Math.PI);
 if(p<0.5)return "M 180 44 A 136 136 0 0 1 180 316 Q "+(180+272*cos).toFixed(3)+" 180 180 44 Z";
 return "M 180 44 A 136 136 0 0 0 180 316 Q "+(180-272*cos).toFixed(3)+" 180 180 44 Z";
}
function dueAt(p){return milestones.filter(m=>m.p<=p+1e-10)}
function nextAfter(lunation,p){
 const next=milestones.find(m=>m.p>p+1e-10);
 return next?{...next,at:momentFor(lunation,next.p)}:{...milestones[0],at:momentFor(lunation+1,milestones[0].p)};
}
function eventDayData(year,month){
 const start=Date.UTC(year,month,1),end=Date.UTC(year,month+1,1),daily=new Map();
 const first=lunationIndex(start)-1,last=lunationIndex(end)+1;
 for(let lun=first;lun<=last;lun++){
  for(const m of milestones){
   const at=momentFor(lun,m.p);
   if(at<start||at>=end)continue;
   const iso=new Date(at).toISOString().slice(0,10);
   const list=daily.get(iso)||[];
   list.push({...m,at,id:"moon:"+lun+":"+(m.waxing?"W":"D")+":"+m.threshold});
   daily.set(iso,list);
  }
 }
 return daily;
}
function calculateFee(){
 const amount=safeInput("lp-transfer",0,0,1000000);
 const principalMilli=Math.round(amount*1000);
 const waxingBps=Math.round(safeInput("lp-fee-waxing",10,0,100)*100);
 const waningBps=Math.round(safeInput("lp-fee-waning",15,0,100)*100);
 const rate=currentPhase<=.5?waxingBps:waningBps;
 // Mirrors Kotlin feeQuote(): ceil to milliPROI, floor half into burn, residual Vault.
 const feeMilli=rate===0||principalMilli===0?0:Math.max(1,Math.ceil(principalMilli*rate/10000));
 const burnMilli=Math.floor(feeMilli/2),vaultMilli=feeMilli-burnMilli;
 $("lp-fee-rate").textContent=dec.format(rate/100)+"%";
 $("lp-fee-total").textContent=three.format(feeMilli/1000);
 $("lp-fee-burn").textContent=three.format(burnMilli/1000);
 $("lp-fee-network").textContent=three.format(vaultMilli/1000);
 $("lp-fee-debit").textContent=three.format((principalMilli+feeMilli)/1000);
}
function paint(age,date=null){
 const safeAge=Math.max(0,Math.min(syn,Number(age)||0));
 const p=safeAge/syn,view=p>=1?0:p,lit=illumination(p);
 const index=phaseIndex(view);
 currentPhase=p;
 slider.value=safeAge.toFixed(3);
 slider.style.setProperty("--lp-cycle-progress",(Math.max(0,Math.min(1,p))*100).toFixed(2)+"%");
 $("lp-moon-light-path").setAttribute("d",moonPath(view));
 $("lp-phase-name").textContent=cfg.phases[index];
 $("lp-lit-percent").textContent=Math.floor(lit*100)+"%";
 $("lp-age").textContent=dec.format(safeAge);
 const due=dueAt(p),earnedMilli=due.reduce((sum,m)=>sum+m.milli,0);
 showPotentialReward(earnedMilli);
 updateChartCursor(p,earnedMilli);
 if(cycleOutput)cycleOutput.textContent=one.format(totalMilli/1000);
 $("lp-selected-date").textContent=date?dateText.format(date):cfg.labels.manual;
 const baseLunation=lunationIndex(date?date.getTime():utcToday.getTime());
 const next=nextAfter(baseLunation,p);
 $("lp-next-threshold").textContent=(next.waxing?"↗ ":"↘ ")+next.threshold+"% · +"+one.format(next.milli/1000)+" PROI";
 $("lp-next-utc").textContent=utcText.format(next.at)+" UTC";
 const svg=document.querySelector(".lp-moon-svg");
 if(svg)svg.setAttribute("aria-label",cfg.phases[index]+", "+Math.floor(lit*100)+"%");
 const halo=document.querySelector(".lp-halo");
 if(halo)halo.style.opacity=String(.25+.65*lit);
 const scene=document.querySelector(".lp-moon-scene");
 if(scene)scene.style.setProperty("--illumination",lit.toFixed(3));
 phaseButtons.forEach((button,i)=>button.setAttribute("aria-pressed",String(i===index)));
 railButtons.forEach((button,i)=>{
  const m=milestones[i];
  button.classList.toggle("is-earned",m.p<=p+1e-10);
  button.setAttribute("aria-pressed",String(Math.abs(m.p-p)<0.00002));
 });
 selectedDate=date;
 lastDay=date?date.toISOString().slice(0,10):null;
 document.querySelectorAll(".lp-date-button").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.day===lastDay)));
 calculateFee();
}
function animate(target,date){
 cancelAnimationFrame(animationFrame);
 if(reduced){paint(target,date);return;}
 const start=Number(slider.value),begin=performance.now(),duration=560;
 function frame(time){
  const t=Math.min(1,(time-begin)/duration),ease=1-Math.pow(1-t,3);
  paint(start+(target-start)*ease,t===1?date:null);
  if(t<1)animationFrame=requestAnimationFrame(frame);
 }
 animationFrame=requestAnimationFrame(frame);
}
function renderRail(){
 rail.replaceChildren();
 for(const m of milestones){
  const b=document.createElement("button");
  b.type="button";b.className="lp-milestone"+(m.waxing?" is-waxing":" is-waning");
  b.setAttribute("aria-pressed","false");
  b.setAttribute("aria-label",(m.waxing?"↗ ":"↘ ")+m.threshold+"%, +"+one.format(m.milli/1000)+" PROI");
  const mark=document.createElement("span");mark.textContent=(m.waxing?"↗ ":"↘ ")+m.threshold+"%";
  const reward=document.createElement("small");reward.className="lp-milestone-pay";
  const number=document.createElement("span");number.className="lp-milestone-number";
  number.textContent="+"+one.format(m.milli/1000);
  const token=document.createElement("span");token.className="lp-milestone-unit";token.textContent="P";
  token.setAttribute("aria-hidden","true");
  reward.append(number,token);
  b.append(mark,reward);
  b.addEventListener("click",()=>animate(m.p*syn,null));
  rail.append(b);railButtons.push(b);
 }
}
function makeUTC(year,month,day){return new Date(Date.UTC(year,month,day,12));}
function renderCalendar(){
 const container=$("lp-calendar-days");
 container.replaceChildren();
 const year=visibleMonth.getUTCFullYear(),month=visibleMonth.getUTCMonth();
 $("lp-month-label").textContent=monthText.format(visibleMonth);
 const first=makeUTC(year,month,1).getUTCDay(),total=new Date(Date.UTC(year,month+1,0,12)).getUTCDate();
 const events=eventDayData(year,month);
 for(let i=0;i<first;i++){
  const blank=document.createElement("span");blank.className="lp-calendar-empty";
  blank.setAttribute("aria-hidden","true");container.append(blank);
 }
 for(let day=1;day<=total;day++){
  const date=makeUTC(year,month,day),p=phaseAt(date.getTime()),iso=date.toISOString().slice(0,10);
  const items=events.get(iso)||[],sum=items.reduce((s,m)=>s+m.milli,0);
  const b=document.createElement("button");
  b.type="button";b.className="lp-date-button";b.dataset.day=iso;
  b.setAttribute("aria-pressed",String(iso===lastDay));
  b.setAttribute("aria-label",dateText.format(date)+", "+cfg.phases[phaseIndex(p)]+", "+Math.floor(illumination(p)*100)+"%, "+(items.length?"+"+one.format(sum/1000)+" PROI":cfg.labels.none));
  if(items.length)b.classList.add("has-event");
  if(iso===utcToday.toISOString().slice(0,10))b.classList.add("is-today");
  const numeral=document.createElement("span");numeral.className="lp-day-number";numeral.textContent=String(day);
  const moon=document.createElement("span");moon.className="lp-day-moon";moon.setAttribute("aria-hidden","true");
  const ns="http://www.w3.org/2000/svg",icon=document.createElementNS(ns,"svg");
  icon.setAttribute("viewBox","0 0 360 360");icon.setAttribute("focusable","false");
  const disk=document.createElementNS(ns,"circle");disk.setAttribute("cx","180");disk.setAttribute("cy","180");disk.setAttribute("r","136");disk.setAttribute("fill","#162c3c");disk.setAttribute("stroke","#729fae");disk.setAttribute("stroke-width","9");
  const light=document.createElementNS(ns,"path");light.setAttribute("d",moonPath(p));light.setAttribute("fill","#d9e4e6");
  icon.append(disk,light);moon.append(icon);
  const count=document.createElement("small");count.className="lp-day-count";count.textContent=items.length?"+"+one.format(sum/1000):"—";
  b.append(numeral,moon,count);b.addEventListener("click",()=>animate(ageAt(date),date));
  container.append(b);
 }
}
let pendingInput=0;
slider.addEventListener("input",()=>{
 cancelAnimationFrame(animationFrame);
 if(reduced){paint(Number(slider.value));return;}
 if(pendingInput)return;
 pendingInput=requestAnimationFrame(()=>{pendingInput=0;paint(Number(slider.value));});
});
phaseButtons.forEach(button=>button.addEventListener("click",()=>{
 animate(((Number(button.dataset.phaseIndex)/8)*syn),null);
}));
$("lp-month-prev").addEventListener("click",()=>{visibleMonth=makeUTC(visibleMonth.getUTCFullYear(),visibleMonth.getUTCMonth()-1,1);renderCalendar()});
$("lp-month-next").addEventListener("click",()=>{visibleMonth=makeUTC(visibleMonth.getUTCFullYear(),visibleMonth.getUTCMonth()+1,1);renderCalendar()});
$("lp-month-today").addEventListener("click",()=>{visibleMonth=makeUTC(utcToday.getUTCFullYear(),utcToday.getUTCMonth(),1);renderCalendar();animate(ageAt(utcToday),utcToday)});
["lp-transfer","lp-fee-waxing","lp-fee-waning"].forEach(id=>$(id).addEventListener("input",calculateFee));
renderRail();renderRewardChart();renderCalendar();paint(ageAt(utcToday),utcToday);
const progress=$("lp-progress");
if(progress){
 let busy=false;
 const update=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);progress.style.width=(Math.max(0,Math.min(1,scrollY/max))*100).toFixed(2)+"%";busy=false;};
 addEventListener("scroll",()=>{if(!busy){busy=true;requestAnimationFrame(update)}},{passive:true});
 update();
}
})();
