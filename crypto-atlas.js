document.documentElement.classList.add("js");
const cards=[...document.querySelectorAll(".asset-card[data-name]")];
const search=document.getElementById("coin-search");
const filters=[...document.querySelectorAll("[data-kind-filter]")];
const count=document.getElementById("result-count");
const empty=document.getElementById("empty-results");
let kind="All";
function update(){
 const q=(search?.value||"").trim().toLocaleLowerCase("en");
 let shown=0;
 for(const card of cards){
  const pass=(kind==="All"||card.dataset.kind===kind)&&(!q||card.dataset.name.includes(q)||card.dataset.kind.toLowerCase().includes(q));
  card.hidden=!pass;
  if(pass)shown++;
 }
 if(count)count.textContent=shown+" of 50 stories shown";
 if(empty)empty.hidden=shown!==0;
}
search?.addEventListener("input",update);
for(const b of filters){b.addEventListener("click",()=>{kind=b.dataset.kindFilter;filters.forEach(x=>x.setAttribute("aria-pressed",String(x===b)));update()})}
if(search&&cards.length)document.addEventListener("keydown",event=>{if(event.key==="/"&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!["INPUT","TEXTAREA"].includes(document.activeElement?.tagName||"")){event.preventDefault();search.focus()}});
const progress=document.getElementById("ca-progress");
if(progress){let queued=false;const draw=()=>{const d=document.documentElement;const range=Math.max(1,d.scrollHeight-innerHeight);progress.style.width=(Math.max(0,Math.min(1,scrollY/range))*100).toFixed(2)+"%";queued=false};addEventListener("scroll",()=>{if(!queued){queued=true;requestAnimationFrame(draw)}},{passive:true});draw()}
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveal=[...document.querySelectorAll(".ca-reveal")];
if(!reduced&&"IntersectionObserver" in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add("ca-visible");observer.unobserve(entry.target)}}},{rootMargin:"0px 0px -15px 0px",threshold:.06});for(const item of reveal)observer.observe(item)}else for(const item of reveal)item.classList.add("ca-visible");
const phases={
 "New Moon":"The proposed calendar could mark a new cycle here, subject to a published auditable formula.",
 "Waxing Crescent":"A future design might assign a gradually changing issuance share to this phase.",
 "First Quarter":"A quarter-phase checkpoint could provide a simple public audit point.",
 "Waxing Gibbous":"This is an astronomical phase, not evidence of active token creation.",
 "Full Moon":"A bright full Moon could symbolize a key checkpoint without promising bonus value.",
 "Waning Gibbous":"A declining phase could reduce proposed issuance under an explicitly defined algorithm.",
 "Last Quarter":"A second checkpoint could help compare published calculations with the schedule.",
 "Waning Crescent":"The cycle could close and repeat, if developers ever implemented such rules."
};
const selector=[...document.querySelectorAll("[data-phase-select]")];
const explanation=document.getElementById("phase-explanation");
for(const button of selector){button.addEventListener("click",()=>{selector.forEach(b=>b.setAttribute("aria-pressed",String(b===button)));const name=button.dataset.phaseSelect||"New Moon";if(explanation)explanation.textContent=name+": "+phases[name]})}
