/* ==========================================================================
   HINOVA DIGITAL — ecosystem.js
   Pages : /ecosystem/ · /solutions/ · /parcours/
   Données : Worker Cloudflare "hinova-site" → base Airtable "Moteur Solutions"
   Tables lues (par leur NOM — ne pas renommer dans Airtable) :
     ECOSYSTEM · Offres Hinova · Questions · Règles Trajectoire
   ========================================================================== */

const API = "https://hinova-site.hinovadigital.workers.dev";

/* ---------- Utilitaires ---------- */

async function get(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function esc(v = "") {
  return String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function xpf(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " F CFP";
}

function byOrdre(a, b) {
  return (a.fields.Ordre || 0) - (b.fields.Ordre || 0);
}

/* ---------- Interface commune (menu, retour en haut, apparition) ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const b = document.getElementById("navBurgerBtn");
  const m = document.getElementById("navDropdown");
  if (b && m) {
    b.onclick = e => {
      e.stopPropagation();
      const o = m.classList.toggle("open");
      b.setAttribute("aria-expanded", o);
    };
    document.addEventListener("click", e => {
      if (!m.contains(e.target) && e.target !== b) m.classList.remove("open");
    });
  }

  const top = document.getElementById("backToTop");
  if (top) {
    addEventListener("scroll", () => top.classList.toggle("visible", scrollY > 400), { passive: true });
    top.onclick = () => scrollTo({ top: 0, behavior: "smooth" });
  }

  const ob = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("visible")), { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach(x => ob.observe(x));

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

  if (document.getElementById("ecosystem-grid")) loadEcosystem();
  if (document.getElementById("solutions-grid")) loadOffres();
  if (document.getElementById("questions-container")) loadParcours();
});

/* ---------- Page Écosystème : table ECOSYSTEM ---------- */

const ECOSYSTEM_LINKS = {
  "hinova-digital": "/solutions/",
  "ru-fau-tumu": "/academie.html",
  "hinovadigital-app": "/parcours/"
};

async function loadEcosystem() {
  const g = document.getElementById("ecosystem-grid");
  try {
    const d = await get("/ecosystem");
    const rs = (d.records || [])
      .filter(r => r.fields && r.fields.Nom && r.fields.Visible && r.fields.Actif)
      .sort(byOrdre);
    if (!rs.length) return;

    g.innerHTML = rs.map(r => {
      const f = r.fields;
      const href = f["URL CTA"] || ECOSYSTEM_LINKS[f.Slug] || "/parcours/";
      return `<article class="glass p-10 card-hover reveal visible">
        <p class="gold-label">${esc(f.Nom)}</p>
        <h3 class="font-montserrat font-bold text-xl mt-4" style="color:#0AB8C4">${esc(f.Titre || f.Nom)}</h3>
        <p class="font-inter text-sm leading-relaxed mt-3" style="color:#81A1A8">${esc(f["Sous-titre"] || f.Description || "")}</p>
        <a href="${esc(href)}" class="btn-cyan mt-6">${esc(f["CTA principal"] || "DÉCOUVRIR")}</a>
      </article>`;
    }).join("");
  } catch (e) { /* on garde le contenu de secours */ }
}

/* ---------- Page Solutions : table Offres Hinova ---------- */

async function loadOffres() {
  const g = document.getElementById("solutions-grid");
  try {
    const d = await get("/offres");
    const rs = (d.records || [])
      .filter(r => r.fields && r.fields.Nom && r.fields.Active === true)
      .sort(byOrdre);
    if (!rs.length) return;

    g.innerHTML = rs.map(r => {
      const f = r.fields;
      const mois = f["Abonnement Hinova XPF/mois"];
      return `<article class="glass p-10 card-hover reveal visible">
        <p class="gold-label">${esc(f.Type || "SOLUTION")}</p>
        <h3 class="font-montserrat font-bold text-xl mt-4" style="color:#0AB8C4">${esc(f.Nom)}</h3>
        <p class="solution-price mt-5">${f["Prix création XPF"] ? xpf(f["Prix création XPF"]) : "Sur devis"}</p>
        ${mois ? `<p class="font-inter text-sm mt-1" style="color:#81A1A8">+ ${xpf(mois)} / mois</p>` : ""}
        <a href="/parcours/" class="btn-cyan mt-6">IDENTIFIER MA TRAJECTOIRE</a>
      </article>`;
    }).join("");
  } catch (e) { /* on garde le contenu de secours */ }
}

/* ---------- Page Parcours : Questions + Règles Trajectoire + Offres ----------
   Chaque clic ajoute le Score de sa règle (ID "Q01-2" = question Q01, option 2)
   à l'offre recommandée. L'offre au total le plus haut l'emporte ;
   en cas d'égalité, la Priorité la plus haute l'emporte.
   ------------------------------------------------------------------------- */

async function loadParcours() {
  const box = document.getElementById("questions-container");
  const out = document.getElementById("recommendation");

  let questions, rules, offres;
  try {
    const [q, t, o] = await Promise.all([get("/questions"), get("/trajectoires"), get("/offres")]);
    questions = (q.records || [])
      .filter(r => r.fields && r.fields.Question && r.fields.Active)
      .sort(byOrdre)
      .map(r => ({
        id: r.fields.ID,
        text: r.fields.Question,
        options: [1, 2, 3, 4].map(n => r.fields["Option " + n]).filter(Boolean)
      }))
      .filter(q => q.options.length);
    rules = {};
    (t.records || []).forEach(r => { if (r.fields && r.fields.ID && r.fields.Active) rules[r.fields.ID] = r.fields; });
    offres = {};
    (o.records || []).forEach(r => { if (r.fields && r.fields.Active === true) offres[r.id] = r.fields; });
  } catch (e) {
    box.innerHTML = '<p style="color:#81A1A8">Le moteur de parcours est momentanément indisponible.</p>';
    return;
  }
  if (!questions.length) { box.innerHTML = ""; return; }

  let i = 0;
  let picks = [];

  function render() {
    const q = questions[i];
    box.innerHTML = `<p class="gold-label">QUESTION ${i + 1} / ${questions.length}</p>
      <h3 class="font-montserrat font-bold text-xl mt-3" style="color:#E0F7FA">${esc(q.text)}</h3>
      <div class="grid gap-3 mt-6">${q.options.map((x, n) =>
        `<button class="question-option" data-rule="${esc(q.id + "-" + (n + 1))}">${esc(x)}</button>`).join("")}</div>`;
    box.querySelectorAll("button").forEach(btn => btn.onclick = () => {
      picks.push(btn.dataset.rule);
      i++;
      i < questions.length ? render() : finish();
    });
  }

  function finish() {
    const totals = {};
    const best = {}; // règle au plus fort score par offre (pour l'explication)
    picks.forEach(id => {
      const r = rules[id];
      if (!r || !Array.isArray(r["Offre recommandée"])) return;
      const offreId = r["Offre recommandée"][0];
      if (!offres[offreId]) return;
      const t = totals[offreId] || (totals[offreId] = { score: 0, prio: 0 });
      t.score += Number(r.Score || 0);
      t.prio = Math.max(t.prio, Number(r["Priorité"] || 0));
      if (!best[offreId] || Number(r.Score || 0) >= Number(best[offreId].Score || 0)) best[offreId] = r;
    });

    const winner = Object.keys(totals).sort((a, b) =>
      totals[b].score - totals[a].score || totals[b].prio - totals[a].prio)[0];

    box.innerHTML = `<p class="gold-label">PARCOURS TERMINÉ</p>
      <p class="font-inter mt-3" style="color:#81A1A8">Merci ! Votre trajectoire est prête ci-dessous.</p>
      <button class="question-option mt-6" id="restartParcours">Recommencer le parcours</button>`;
    document.getElementById("restartParcours").onclick = () => { i = 0; picks = []; out.innerHTML = '<p style="color:#81A1A8">Votre recommandation apparaîtra ici.</p>'; render(); };

    if (!winner) {
      out.innerHTML = `<p class="gold-label">TRAJECTOIRE</p>
        <h3 class="font-montserrat font-black text-2xl mt-4" style="color:#E0F7FA">Parlons de votre projet.</h3>
        <a href="/diagnostic.html" class="btn-cyan mt-6">PARLER DE MON PROJET</a>`;
    } else {
      const f = offres[winner];
      const mois = f["Abonnement Hinova XPF/mois"];
      const why = best[winner] && best[winner]["Explication client"];
      out.innerHTML = `<p class="gold-label">VOTRE TRAJECTOIRE</p>
        <h3 class="font-montserrat font-black text-3xl mt-4" style="color:#E0F7FA">${esc(f.Nom)}</h3>
        ${why ? `<p class="font-inter mt-4 max-w-2xl mx-auto" style="color:#B0D8DF">${esc(why)}</p>` : ""}
        <p class="solution-price mt-6">${f["Prix création XPF"] ? xpf(f["Prix création XPF"]) : "Sur devis"}</p>
        ${mois ? `<p class="font-inter text-sm mt-1" style="color:#81A1A8">+ ${xpf(mois)} / mois · paiement en 4 fois (35 / 35 / 15 / 15)</p>` : ""}
        <div class="flex flex-wrap gap-3 justify-center mt-8">
          <a href="/diagnostic.html" class="btn-cyan">PARLER DE MON PROJET</a>
          <a href="/solutions/" class="btn-cyan">VOIR TOUTES LES SOLUTIONS</a>
        </div>`;
    }
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  render();
}
