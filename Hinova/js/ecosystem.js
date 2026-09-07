
const API="https://hinova-site.hinovadigital.workers.dev";

document.addEventListener("DOMContentLoaded",()=>{
  setupNavigation(); setupBackToTop(); setupReveal(); registerPWA();
  if(document.getElementById("ecosystem-grid")) loadEcosystem();
  if(document.getElementById("solutions-grid")) loadSolutions();
  if(document.getElementById("questions-container")) loadJourney();
});

function setupNavigation(){
  const b=document.getElementById("navBurgerBtn"),m=document.getElementById("navDropdown");
  if(!b||!m)return;
  b.addEventListener("click",e=>{e.stopPropagation();const open=m.classList.toggle("open");b.setAttribute("aria-expanded",String(open));});
  document.addEventListener("click",e=>{if(!m.contains(e.target)&&e.target!==b){m.classList.remove("open");b.setAttribute("aria-expanded","false");}});
}
function setupBackToTop(){
  const t=document.getElementById("backToTop");if(!t)return;
  addEventListener("scroll",()=>t.classList.toggle("visible",scrollY>400),{passive:true});
  t.onclick=()=>scrollTo({top:0,behavior:"smooth"});
}
function setupReveal(){
  const items=document.querySelectorAll(".reveal");if(!items.length)return;
  if(!("IntersectionObserver"in window)){items.forEach(x=>x.classList.add("visible"));return;}
  const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");o.unobserve(e.target)}}),{threshold:.1});
  items.forEach(x=>o.observe(x));
}
function registerPWA(){if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});}
async function api(path){const r=await fetch(API+path,{headers:{Accept:"application/json"}});if(!r.ok)throw Error("API "+r.status);return r.json();}
function rows(d){return Array.isArray(d?.records)?d.records:[];}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function ids(v){if(Array.isArray(v))return v.map(x=>typeof x==="object"?x.id:x).filter(Boolean);return v?[v]:[];}
function norm(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");}
function options(v){
  if(Array.isArray(v))return v;
  if(typeof v==="string"){try{const p=JSON.parse(v);if(Array.isArray(p))return p;}catch{}return v.split(/[,;|]/).map(x=>x.trim()).filter(Boolean);}
  return [];
}

async function loadEcosystem(){
  const g=document.getElementById("ecosystem-grid");
  try{
    const data=await api("/ecosystem");
    const rs=rows(data).filter(r=>r.fields).filter(r=>r.fields.Nom||r.fields.Titre).slice(0,3);
    if(!rs.length)throw Error("Aucun univers");
    g.innerHTML=rs.map((r,i)=>{
      const f=r.fields,title=f.Titre||f.Nom||"HINOVA",text=f["Sous-titre"]||f.Description||"",type=f.Type||"UNIVERS";
      const upper=(title+" "+type).toUpperCase();
      const href=upper.includes("RŪ-FAU")||upper.includes("ACADEM")?"/academie.html":upper.includes("PARCOURS")?"/parcours":"/solutions";
      const gold=href==="/academie.html";
      return `<article class="${gold?"glass-gold":"glass"} p-10 card-hover eco-card reveal"><p class="gold-label">${esc(type)}</p><h3 class="font-montserrat font-bold text-xl mt-4 ${gold?"gold-title small":""}" ${gold?'':'style="color:#0AB8C4"'}>${esc(title)}</h3><p class="font-inter text-sm leading-relaxed mt-3" style="color:#81A1A8">${esc(text)}</p><a href="${href}" class="${gold?"btn-ghost":"btn-cyan"} card-action">${gold?"ENTRER DANS L’ACADÉMIE":href==="/parcours"?"COMMENCER":"DÉCOUVRIR"}</a></article>`;
    }).join("");
    setupReveal();
  }catch{g.innerHTML='<div class="glass p-10"><p class="engine-status engine-error">L’écosystème est momentanément indisponible.</p></div>';}
}

async function loadSolutions(){
  const g=document.getElementById("solutions-grid");
  try{
    const data=await api("/offres");
    const rs=rows(data).filter(r=>r.fields?.Nom).sort((a,b)=>Number(a.fields.Ordre||999)-Number(b.fields.Ordre||999));
    if(!rs.length)throw Error("Aucune offre");
    g.innerHTML=rs.map(r=>{
      const f=r.fields,price=f["Prix création XPF"];
      const priceText=price!==undefined&&price!==null&&price!==""?Number(price).toLocaleString("fr-FR")+" F CFP":"Sur devis";
      const desc=f.Notes||f.Description||"";
      return `<article class="glass p-10 card-hover reveal"><p class="gold-label">${esc(f.Code||f.Type||"SOLUTION")}</p><h3 class="font-montserrat font-bold text-xl mt-4" style="color:#0AB8C4">${esc(f.Nom)}</h3><p class="solution-price mt-5">${esc(priceText)}</p><p class="font-inter text-sm leading-relaxed mt-3" style="color:#81A1A8">${esc(desc)}</p><a href="/parcours" class="btn-cyan card-action">IDENTIFIER MA TRAJECTOIRE</a></article>`;
    }).join("");
    setupReveal();
  }catch{g.innerHTML='<div class="glass p-10"><p class="engine-status engine-error">Les solutions sont momentanément indisponibles.</p></div>';}
}

async function loadJourney(){
  const box=document.getElementById("questions-container"),result=document.getElementById("recommendation");
  try{
    const [qd,rd,od]=await Promise.all([api("/questions"),api("/trajectoires"),api("/offres")]);
    const qs=rows(qd).filter(r=>r.fields?.Question).sort((a,b)=>Number(a.fields.Ordre||999)-Number(b.fields.Ordre||999));
    const rules=rows(rd).filter(r=>r.fields?.Active!==false);
    const offers=rows(od).filter(r=>r.fields?.Nom);
    if(!qs.length)throw Error("Aucune question");
    const answers={};let i=0;
    function render(){
      const r=qs[i],f=r.fields,opts=options(f.Options);
      box.innerHTML=`<div class="text-center"><p class="gold-label">QUESTION ${i+1} / ${qs.length}</p><h3 class="font-montserrat font-bold text-xl md:text-2xl mt-4" style="color:#E0F7FA">${esc(f.Question)}</h3><div class="grid gap-3 mt-8">${opts.map(o=>`<button type="button" class="question-option" data-value="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`;
      box.querySelectorAll(".question-option").forEach(b=>b.onclick=()=>{
        answers[r.id]={questionId:r.id,value:b.dataset.value};
        i++; if(i<qs.length){render();scrollTo({top:box.getBoundingClientRect().top+scrollY-100,behavior:"smooth"});}else{calculate();}
      });
    }
    function calculate(){
      const scores=new Map();
      Object.values(answers).forEach(a=>{
        rules.filter(rule=>{
          const f=rule.fields,q=ids(f.Question),response=f.Réponse??f.Reponse??"";
          return (!q.length||q.includes(a.questionId))&&norm(response)===norm(a.value);
        }).forEach(rule=>{
          const f=rule.fields,os=ids(f["Offre recommandée"]),score=Number(f.Score||0),priority=Number(f.Priorité||0);
          os.forEach(id=>{const x=scores.get(id)||{score:0,priority:0,explanation:""};x.score+=score;x.priority=Math.max(x.priority,priority);x.explanation=x.explanation||f["Explication client"]||"";scores.set(id,x);});
        });
      });
      const ranked=[...scores.entries()].sort((a,b)=>b[1].score-a[1].score||b[1].priority-a[1].priority);
      let offer=ranked.length?offers.find(o=>o.id===ranked[0][0]):null;
      if(!offer)offer=offers[0]||null;
      renderResult(offer,ranked.length?scores.get(ranked[0][0]):null);
    }
    function renderResult(o,info){
      if(!o){result.innerHTML='<p class="engine-status engine-error">Aucune recommandation disponible pour le moment.</p>';document.getElementById("resultat").scrollIntoView({behavior:"smooth"});return;}
      const f=o.fields,price=f["Prix création XPF"],priceText=price!==undefined&&price!==null&&price!==""?Number(price).toLocaleString("fr-FR")+" F CFP":"Sur devis";
      result.innerHTML=`<p class="gold-label">TRAJECTOIRE RECOMMANDÉE</p><h3 class="font-montserrat font-black text-2xl md:text-3xl mt-4" style="color:#E0F7FA">${esc(f.Nom)}</h3><p class="solution-price mt-4">${esc(priceText)}</p>${f.Notes?`<p class="font-inter max-w-2xl mx-auto mt-4" style="color:#81A1A8">${esc(f.Notes)}</p>`:""}${info?.explanation?`<p class="font-inter max-w-2xl mx-auto mt-5 text-sm" style="color:#B0D8DF">${esc(info.explanation)}</p>`:""}<div class="flex flex-wrap justify-center gap-4 mt-7"><a href="/contact.html" class="btn-cyan">PARLER DE MON PROJET</a><a href="/solutions" class="btn-ghost">VOIR LES SOLUTIONS</a></div>`;
      document.getElementById("resultat").scrollIntoView({behavior:"smooth"});
    }
    render();
  }catch(e){console.error(e);box.innerHTML='<p class="engine-status engine-error">Le moteur de parcours est momentanément indisponible.</p>';}
}
