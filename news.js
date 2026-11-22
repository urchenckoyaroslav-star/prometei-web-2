document.documentElement.classList.add("js");
const search=document.getElementById("story-search");
const cards=[...document.querySelectorAll("#story-grid .nw-card")];
const categoryButtons=[...document.querySelectorAll("[data-category-filter]")];
const resultCount=document.getElementById("story-count");
const empty=document.getElementById("empty-stories");
let selected="All";
const requested=new URLSearchParams(location.search).get("category");
if(categoryButtons.some(b=>b.dataset.categoryFilter===requested))selected=requested;
categoryButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.categoryFilter===selected)));
function updateNews(){
 const query=(search?.value||"").trim().toLocaleLowerCase("en");
 let count=0;
 for(const card of cards){
  const visible=(selected==="All"||card.dataset.category===selected)&&(!query||card.dataset.text.includes(query));
  card.hidden=!visible;
  if(visible)count++;
 }
 if(resultCount)resultCount.textContent=count+" of "+cards.length+" stories shown";
 if(empty)empty.hidden=count!==0;
 for(const unit of document.querySelectorAll("#story-grid .site-ad-placement"))unit.hidden=count===0;
}
search?.addEventListener("input",updateNews);
categoryButtons.forEach(button=>button.addEventListener("click",()=>{selected=button.dataset.categoryFilter;categoryButtons.forEach(b=>b.setAttribute("aria-pressed",String(b===button)));updateNews()}));
updateNews();
if(search)document.addEventListener("keydown",event=>{if(event.key==="/"&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!["INPUT","TEXTAREA"].includes(document.activeElement?.tagName||"")){event.preventDefault();search.focus()}});
const bar=document.getElementById("reading-progress");
if(bar){let busy=false;const draw=()=>{const doc=document.documentElement;const max=Math.max(1,doc.scrollHeight-innerHeight);bar.style.width=(Math.max(0,Math.min(1,scrollY/max))*100).toFixed(2)+"%";busy=false};window.addEventListener("scroll",()=>{if(!busy){busy=true;requestAnimationFrame(draw)}},{passive:true});draw()}
const reveals=[...document.querySelectorAll(".nw-reveal")];
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!reduced&&"IntersectionObserver" in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("nw-visible");observer.unobserve(entry.target)}})},{rootMargin:"0px 0px -20px 0px",threshold:.05});reveals.forEach(el=>observer.observe(el))}else reveals.forEach(el=>el.classList.add("nw-visible"));
