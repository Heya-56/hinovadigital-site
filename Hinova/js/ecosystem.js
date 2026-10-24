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
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 8000);
  const r = await fetch(API + path, { signal: ctl.signal }).finally(() => clearTimeout(tm));
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
  "hinovadigital-app": "/solutions/#diagnostic"
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
      const mois = f["Abonnement Hinova XPF/mois"];
      const plan = f["Mensualisations disponibles"];
      return `<article class="glass p-10 card-hover reveal visible">
        <p class="gold-label">${esc(f.Type || "SOLUTION")}</p>
        <h3 class="font-montserrat font-bold text-xl mt-4" style="color:#1B64C8">${esc(f.Nom)}</h3>
        <p class="solution-price mt-5">${f["Prix création XPF"] ? xpf(f["Prix création XPF"]) : "Sur devis"}</p>
        ${mois ? `<p class="font-inter text-sm mt-1" style="color:#4E6A6E">+ ${mois === 4200 && f["Prix création XPF"] > 20000 ? "à partir de " : ""}${xpf(mois)} / mois</p>` : ""}
        ${plan && !/^\d/.test(plan) ? `<p class="font-inter text-xs mt-2" style="color:#B5823A">${esc(plan)}</p>` : ""}
        <a href="/devis/?offre=${encodeURIComponent(f.Code || "")}" class="btn-cyan mt-6">ESTIMER MON DEVIS</a>
      </article>`;
    }).join("") + `<article class="glass p-10 card-hover reveal visible">
        <p class="gold-label">GRANDS COMPTES</p>
        <h3 class="font-montserrat font-bold text-xl mt-4" style="color:#1B64C8">Plus de 500 salariés</h3>
        <p class="solution-price mt-5">Sur devis</p>
        <p class="font-inter text-xs mt-2" style="color:#B5823A">Domaine offert la 1re année · paiement annuel : 2 mois offerts</p>
        <a href="/diagnostic.html" class="btn-cyan mt-6">PARLER DE MON PROJET</a>
      </article>`;
  } catch (e) { /* on garde le contenu de secours */ }
}

/* ---------- Page Solutions : table Offres Hinova ---------- */

async function loadOffres() {
  const g = document.getElementById("solutions-grid");
  if (g.dataset.static) { highlightStatic(); return; } /* grille écrite dans la page : on n'écrase pas */
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
        <h3 class="font-montserrat font-bold text-xl mt-4" style="color:#1B64C8">${esc(f.Nom)}</h3>
        <p class="solution-price mt-5">${f["Prix création XPF"] ? xpf(f["Prix création XPF"]) : "Sur devis"}</p>
        ${mois ? `<p class="font-inter text-sm mt-1" style="color:#4E6A6E">+ ${xpf(mois)} / mois</p>` : ""}
        <a href="/solutions/#diagnostic" class="btn-cyan mt-6">IDENTIFIER MA TRAJECTOIRE</a>
      </article>`;
    }).join("");
    highlightEtape(g, rs);
  } catch (e) { /* on garde le contenu de secours */ }
}

/* ---------- Lien depuis le parcours Leapfrogging (?etape=…) ----------
   Met en avant les offres correspondant à l'étape choisie sur l'accueil.
   Repère par mots-clés dans Type + Nom (Airtable "Offres Hinova"). */
const ETAPES = {
  "creer":   { label: "Créer",    re: /sur.?mesure|cr[ée]ation|soci[ée]t[ée]|grand/i },
  "etre-vu": { label: "Être vu",  re: /vitrine|site|page|petite/i },
  "vendre":  { label: "Vendre",   re: /boutique|e-?commerce|pro|business/i },
  "gerer":   { label: "Gérer",    re: /orchestr|appli|commerce|pme|gestion/i }
};
function highlightEtape(g, rs) {
  const k = new URLSearchParams(location.search).get("etape");
  const e = ETAPES[k]; if (!e) return;
  const cards = [...g.children];
  let hit = 0;
  cards.forEach((c, i) => {
    const f = rs[i].fields;
    if (e.re.test((f.Type || "") + " " + f.Nom)) { c.style.outline = "3px solid #0AB8C4"; c.style.order = -1; hit++; }
  });
  if (!hit) return;
  g.style.display = g.style.display || "";
  const note = document.createElement("p");
  note.className = "font-inter text-center mb-8";
  note.style.color = "#0B2F35";
  note.innerHTML = `Étape <strong>${esc(e.label)}</strong> : les offres adaptées sont en tête. <a href="/solutions/#toutes" style="color:#1B64C8;text-decoration:underline">Voir toutes les offres</a>`;
  g.parentNode.insertBefore(note, g);
  document.getElementById("toutes").scrollIntoView({ behavior: "smooth" });
}

function highlightStatic() {
  const k = new URLSearchParams(location.search).get("etape");
  const e = ETAPES[k]; if (!e) return;
  const hits = [...document.querySelectorAll("[data-etapes]")].filter(c => c.dataset.etapes.split(" ").includes(k));
  if (!hits.length) return;
  hits.forEach(c => c.classList.add("of-hit"));
  const g = document.getElementById("solutions-grid");
  const note = document.createElement("p");
  note.className = "font-inter text-center mb-6";
  note.style.color = "#0B2F35";
  note.innerHTML = `Étape <strong>${esc(e.label)}</strong> : les offres adaptées sont encadrées.`;
  g.parentNode.insertBefore(note, document.querySelector(".of-cur"));
  document.getElementById("toutes").scrollIntoView({ behavior: "smooth" });
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
    box.innerHTML = '<p style="color:#0B2F35">Choisissez directement votre offre ci-dessous, ou laissez-nous vous orienter :</p><div class="flex flex-wrap gap-3 mt-5"><a href="#toutes" class="btn-cyan">Voir les offres et les prix</a><a href="/diagnostic.html" class="font-montserrat font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg border">Diagnostic offert</a></div>';
    const res = document.getElementById("resultat"); if (res) res.hidden = true;
    return;
  }
  if (!questions.length) { box.innerHTML = ""; return; }

  let i = 0;
  let picks = [];

  function render() {
    const q = questions[i];
    box.innerHTML = `<p class="gold-label">QUESTION ${i + 1} / ${questions.length}</p>
      <h3 class="font-montserrat font-bold text-xl mt-3" style="color:#0B2F35">${esc(q.text)}</h3>
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
      <p class="font-inter mt-3" style="color:#4E6A6E">Merci ! Votre trajectoire est prête ci-dessous.</p>
      <button class="question-option mt-6" id="restartParcours">Recommencer le parcours</button>`;
    document.getElementById("restartParcours").onclick = () => { i = 0; picks = []; out.innerHTML = '<p style="color:#4E6A6E">Votre recommandation apparaîtra ici.</p>'; render(); };

    if (!winner) {
      out.innerHTML = `<p class="gold-label">TRAJECTOIRE</p>
        <h3 class="font-montserrat font-black text-2xl mt-4" style="color:#0B2F35">Parlons de votre projet.</h3>
        <a href="/diagnostic.html" class="btn-cyan mt-6">PARLER DE MON PROJET</a>`;
    } else {
      const f = offres[winner];
      const mois = f["Abonnement Hinova XPF/mois"];
      const why = best[winner] && best[winner]["Explication client"];
      out.innerHTML = `<p class="gold-label">VOTRE TRAJECTOIRE</p>
        <h3 class="font-montserrat font-black text-3xl mt-4" style="color:#0B2F35">${esc(f.Nom)}</h3>
        ${why ? `<p class="font-inter mt-4 max-w-2xl mx-auto" style="color:#33555B">${esc(why)}</p>` : ""}
        <p class="solution-price mt-6">${f["Prix création XPF"] ? xpf(f["Prix création XPF"]) : "Sur devis"}</p>
        ${mois ? `<p class="font-inter text-sm mt-1" style="color:#4E6A6E">+ ${xpf(mois)} / mois${f["Mensualisations disponibles"] && !/^\d/.test(f["Mensualisations disponibles"]) ? " · " + esc(f["Mensualisations disponibles"]) : " · création payable en 4 fois"}</p>` : ""}
        <div class="flex flex-wrap gap-3 justify-center mt-8">
          <a href="/devis/?offre=${encodeURIComponent(f.Code || "")}" class="btn-cyan">ESTIMER MON DEVIS</a>
          <a href="#toutes" class="btn-cyan">VOIR TOUTES LES OFFRES</a>
        </div>`;
    }
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  render();
}
