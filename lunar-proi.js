/* PROMETEI LUNAR LAB: astronomical approximation + a transparent, non-operational PROI scenario.
   No wallet, blockchain, transfer, sale, registration, or data collection. */
(()=>{
"use strict";
const configNode=document.getElementById("lp-config");
if(!configNode)return;
const cfg=JSON.parse(configNode.textContent);
const $=id=>document.getElementById(id);
const syn=cfg.synodicDays;
const epoch=Date.parse(cfg.epochUTC);
const dayMs=86400000;
const locale={en:"en-US",uk:"uk-UA",ru:"ru-RU",de:"de-DE",es:"es-ES",zh:"zh-CN",ja:"ja-JP"}[cfg.lang]||"en-US";
const number=new Intl.NumberFormat(locale,{maximumFractionDigits:0});
const decimal=new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=new Intl.DateTimeFormat(locale,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"});
const monthLabel=new Intl.DateTimeFormat(locale,{year:"numeric",month:"long",timeZone:"UTC"});
const normalize=n=>((n%syn)+syn)%syn;
const ageAt=(date)=>normalize((date.getTime()-epoch)/dayMs);
const illumination=age=>(1-Math.cos((2*Math.PI*age)/syn))/2;
const unitPerDay=age=>cfg.illustrativeDailyBase*(1+cfg.illustrativeIlluminationBoost*illumination(age));
const phaseIndex=age=>Math.floor(normalize(age)/syn*8+.5)%8;
const moonPath=(age)=>{
 const angle=2*Math.PI*normalize(age)/syn,cos=Math.cos(angle);
 if(normalize(age)<syn/2){
  return "M 180 44 A 136 136 0 0 1 180 316 Q "+(180+272*cos).toFixed(3)+" 180 180 44 Z";
 }
 return "M 180 44 A 136 136 0 0 0 180 316 Q "+(180-272*cos).toFixed(3)+" 180 180 44 Z";
};
let selectedDate=null;
const now=new Date();
const utcToday=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12));
let visibleMonth=new Date(Date.UTC(utcToday.getUTCFullYear(),utcToday.getUTCMonth(),1,12));
const slider=$("lp-slider");
const phaseButtons=[...document.querySelectorAll("[data-phase-index]")];
let lastDay=null;
const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
let animationFrame=0;
function paint(age,selected=null){
 const safeAge=normalize(Number(age)||0);
 const ratio=illumination(safeAge),index=phaseIndex(safeAge);
 slider.value=safeAge.toFixed(2);
 $("lp-moon-light-path").setAttribute("d",moonPath(safeAge));
 $("lp-phase-name").textContent=cfg.phases[index];
 $("lp-lit-percent").textContent=number.format(Math.round(ratio*100))+"%";
 $("lp-age").textContent=decimal.format(safeAge);
 $("lp-issuance").textContent=number.format(unitPerDay(safeAge));
 const cycle=cfg.illustrativeDailyBase*(1+cfg.illustrativeIlluminationBoost/2)*syn;
 $("lp-cycle-total").textContent=number.format(cycle);
 $("lp-selected-date").textContent=selected?dateLabel.format(selected):cfg.labels.manual;
 const svg=document.querySelector(".lp-moon-svg");
 if(svg)svg.setAttribute("aria-label",cfg.phases[index]+", "+Math.round(ratio*100)+"%");
 const halo=document.querySelector(".lp-halo");
 if(halo)halo.style.opacity=String(.25+.65*ratio);
 const scene=document.querySelector(".lp-moon-scene");
 if(scene)scene.style.setProperty("--illumination",ratio.toFixed(3));
 phaseButtons.forEach((button,i)=>button.setAttribute("aria-pressed",String(i===index)));
 selectedDate=selected;
 if(selected){
   lastDay=selected.toISOString().slice(0,10);
   document.querySelectorAll(".lp-date-button").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.day===lastDay)));
 }else{
   lastDay=null;
   document.querySelectorAll(".lp-date-button").forEach(el=>el.setAttribute("aria-pressed","false"));
 }
}
function animate(target,date){
 cancelAnimationFrame(animationFrame);
 if(reduced){paint(target,date);return;}
 const start=Number(slider.value),begin=performance.now(),duration=650;
 const move=time=>{
  const t=Math.min(1,(time-begin)/duration),ease=1-Math.pow(1-t,3);
  paint(start+(target-start)*ease,t===1?date:null);
  if(t<1)animationFrame=requestAnimationFrame(move);
 };
 animationFrame=requestAnimationFrame(move);
}
slider.addEventListener("input",()=>{cancelAnimationFrame(animationFrame);paint(Number(slider.value));});
phaseButtons.forEach(button=>button.addEventListener("click",()=>{
 const i=Number(button.dataset.phaseIndex);
 animate((i/8)*syn,null);
}));
function makeUTC(year,month,day){return new Date(Date.UTC(year,month,day,12,0,0));}
function renderCalendar(){
 const container=$("lp-calendar-days");
 container.replaceChildren();
 const year=visibleMonth.getUTCFullYear(),month=visibleMonth.getUTCMonth();
 $("lp-month-label").textContent=monthLabel.format(visibleMonth);
 const first=makeUTC(year,month,1).getUTCDay();
 const total=new Date(Date.UTC(year,month+1,0,12)).getUTCDate();
 for(let i=0;i<first;i++){
  const blank=document.createElement("span");
  blank.className="lp-calendar-empty";
  blank.setAttribute("aria-hidden","true");
  container.append(blank);
 }
 for(let day=1;day<=total;day++){
  const date=makeUTC(year,month,day),age=ageAt(date);
  const pct=Math.round(100*illumination(age)),amount=Math.round(unitPerDay(age));
  const index=phaseIndex(age),iso=date.toISOString().slice(0,10);
  const button=document.createElement("button");
  button.type="button";
  button.className="lp-date-button";
  button.dataset.day=iso;
  button.setAttribute("aria-pressed",String(iso===lastDay));
  button.setAttribute("aria-label",dateLabel.format(date)+", "+cfg.phases[index]+", "+pct+"%, "+number.format(amount)+", "+cfg.labels.estimate);
  if(iso===utcToday.toISOString().slice(0,10))button.classList.add("is-today");
  const numeral=document.createElement("span");numeral.className="lp-day-number";numeral.textContent=String(day);
  const moon=document.createElement("span");moon.className="lp-day-moon";moon.setAttribute("aria-hidden","true");moon.textContent=["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"][index];
  const count=document.createElement("small");count.className="lp-day-count";count.textContent=number.format(amount);
  button.append(numeral,moon,count);
  button.addEventListener("click",()=>{animate(age,date);});
  container.append(button);
 }
}
$("lp-month-prev").addEventListener("click",()=>{visibleMonth=makeUTC(visibleMonth.getUTCFullYear(),visibleMonth.getUTCMonth()-1,1);renderCalendar()});
$("lp-month-next").addEventListener("click",()=>{visibleMonth=makeUTC(visibleMonth.getUTCFullYear(),visibleMonth.getUTCMonth()+1,1);renderCalendar()});
$("lp-month-today").addEventListener("click",()=>{visibleMonth=makeUTC(utcToday.getUTCFullYear(),utcToday.getUTCMonth(),1);renderCalendar();animate(ageAt(utcToday),utcToday)});
function calculateFee(){
 const value=Number($("lp-transfer").value);
 const amount=Number.isFinite(value)?Math.max(0,Math.min(1000000,value)):0;
 const fee=amount*cfg.exampleFeePercent/100;
 const burned=amount*cfg.exampleBurnPercent/100;
 const network=amount*cfg.exampleNetworkPercent/100;
 $("lp-fee-total").textContent=decimal.format(fee);
 $("lp-fee-burn").textContent=decimal.format(burned);
 $("lp-fee-network").textContent=decimal.format(network);
}
$("lp-transfer").addEventListener("input",calculateFee);
calculateFee();
renderCalendar();
paint(ageAt(utcToday),utcToday);
// The progress bar is decorative; no user interactions or network calls depend on it.
const progress=$("lp-progress");
if(progress){
 let busy=false;
 const update=()=>{const doc=document.documentElement,max=Math.max(1,doc.scrollHeight-innerHeight);progress.style.width=(Math.max(0,Math.min(1,scrollY/max))*100).toFixed(2)+"%";busy=false;};
 addEventListener("scroll",()=>{if(!busy){busy=true;requestAnimationFrame(update)}},{passive:true});
 update();
}
})();