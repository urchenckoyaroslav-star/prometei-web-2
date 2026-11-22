document.documentElement.classList.add("js");
const progress=document.getElementById("read-progress");
if(progress){let scheduled=false;const update=()=>{const doc=document.documentElement;const total=Math.max(1,doc.scrollHeight-innerHeight);progress.style.width=(Math.min(100,Math.max(0,scrollY/total*100)))+"%";scheduled=false};addEventListener("scroll",()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});update()}
const filterButtons=[...document.querySelectorAll("[data-filter]")];const cards=[...document.querySelectorAll("[data-group]")];
filterButtons.forEach(button=>button.addEventListener("click",()=>{const filter=button.dataset.filter;filterButtons.forEach(b=>b.setAttribute("aria-pressed",String(b===button)));cards.forEach(card=>{card.hidden=filter!=="all"&&card.dataset.group!==filter})}));
const observed=[...document.querySelectorAll(".reveal")];
if("IntersectionObserver" in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}})},{threshold:.08});observed.forEach(el=>observer.observe(el))}else observed.forEach(el=>el.classList.add("is-visible"));
