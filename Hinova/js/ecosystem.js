const API = "https://hinova-site.hinovadigital.workers.dev";

async function get(path) {
  const response = await fetch(`${API}${path}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

const fields = record => record?.fields || record || {};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function linkedIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => typeof item === "string" ? item : item?.id).filter(Boolean);
  }
  return [typeof value === "string" ? value : value?.id].filter(Boolean);
}

function optionList(value) {
  return String(value ?? "")
    .split(/\s*\|\s*|\n+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function money(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return `${number.toLocaleString("fr-FR")} F CFP`;
}

async function renderOffers() {
  const el = document.querySelector("#offers-grid");
  if (!el) return;

  try {
    const data = await get("/offres");
    const records = (data.records || [])
      .filter(record => fields(record).Active !== false)
      .sort((a, b) => (Number(fields(a).Ordre) || 0) - (Number(fields(b).Ordre) || 0));

    if (!records.length) {
      el.innerHTML = '<div class="loading">Aucune solution active à afficher.</div>';
      return;
    }

    el.innerHTML = records.map((record, index) => {
      const x = fields(record);
      const price = x["Prix création XPF"];
      const name = x.Nom || "Solution HINOVA";

      return `
        <article class="card offer-card">
          <small>${String(index + 1).padStart(2, "0")} · ${escapeHtml(x.Type || "SOLUTION")}</small>
          <h3>${escapeHtml(name)}</h3>
          ${price !== undefined ? `<div class="price">${money(price)}</div>` : ""}
          <p>Solution digitale HINOVA adaptée à votre trajectoire.</p>
          <a href="parcours.html">ÉVALUER MON BESOIN →</a>
        </article>
      `;
    }).join("");

  } catch (error) {
    console.error(error);
    el.innerHTML = `
      <div class="loading">
        Impossible de charger les solutions pour le moment.
      </div>
    `;
  }
}

async function renderEcosystem() {
  const el = document.querySelector("#ecosystem-grid");
  if (!el) return;

  try {
    const data = await get("/ecosystem");
    const records = (data.records || [])
      .filter(record => fields(record).Actif !== false && fields(record).Visible !== false)
      .sort((a, b) => (Number(fields(a).Ordre) || 0) - (Number(fields(b).Ordre) || 0));

    if (!records.length) return;

    el.innerHTML = records.map((record, index) => {
      const x = fields(record);
      const name = x.Nom || "";
      const slug = normalize(x.Slug);
      const target = slug.includes("academie") || slug.includes("ru-fau")
        ? "academie.html"
        : slug.includes("app") || slug.includes("parcours")
          ? "parcours.html"
          : "solutions.html";

      return `
        <article class="card ${target === "academie.html" ? "goldcard" : ""}">
          <small>${String(index + 1).padStart(2, "0")} · ${escapeHtml(x.Type || "UNIVERS")}</small>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(x.Titre || x["Sous-titre"] || "")}</p>
          <a href="${target}">${target === "academie.html" ? "ENTRER DANS L’ACADÉMIE →" : target === "parcours.html" ? "COMMENCER →" : "DÉCOUVRIR →"}</a>
        </article>
      `;
    }).join("");

  } catch (error) {
    console.error(error);
  }
}

async function renderJourney() {
  const area = document.querySelector("#question-area");
  if (!area) return;

  const progress = document.querySelector("#progress");

  try {
    const [questionsData, rulesData, offersData] = await Promise.all([
      get("/questions"),
      get("/trajectoires"),
      get("/offres")
    ]);

    const questions = (questionsData.records || [])
      .filter(record => fields(record).Active !== false)
      .sort((a, b) => (Number(fields(a).Ordre) || 0) - (Number(fields(b).Ordre) || 0));

    const rules = rulesData.records || [];
    const offers = offersData.records || [];

    if (!questions.length) {
      area.innerHTML = '<div class="loading">Aucune question active.</div>';
      return;
    }

    const answers = [];

    function renderQuestion(index) {
      const questionRecord = questions[index];
      const q = fields(questionRecord);
      const options = optionList(q.Options);

      if (progress) {
        progress.style.width = `${(index / questions.length) * 100}%`;
      }

      area.innerHTML = `
        <div class="qnum">QUESTION ${index + 1} / ${questions.length}</div>
        <div class="qtitle">${escapeHtml(q.Question || "Votre situation")}</div>
        <div class="answers">
          ${options.map(option => `
            <button type="button" class="answer" data-answer="${escapeHtml(option)}">
              ${escapeHtml(option)}
            </button>
          `).join("")}
        </div>
      `;

      area.querySelectorAll(".answer").forEach(button => {
        button.addEventListener("click", () => {
          answers[index] = {
            questionId: questionRecord.id,
            question: q.Question || "",
            field: q["Champ métier"] || "",
            answer: button.dataset.answer
          };

          if (index + 1 < questions.length) {
            renderQuestion(index + 1);
          } else {
            renderResult();
          }
        });
      });
    }

    function findMatchingRules() {
      return answers.flatMap(answer => {
        return rules.filter(ruleRecord => {
          const rule = fields(ruleRecord);

          const ruleQuestionIds = linkedIds(
            rule.Question || rule.question || rule["Question liée"]
          );

          const questionMatches =
            ruleQuestionIds.length === 0 ||
            ruleQuestionIds.includes(answer.questionId);

          const responseMatches =
            normalize(rule.Réponse || rule.Reponse || rule.Response) === normalize(answer.answer);

          return questionMatches && responseMatches && rule.Active !== false;
        }).map(ruleRecord => ({
          record: ruleRecord,
          fields: fields(ruleRecord),
          answer
        }));
      });
    }

    function renderResult() {
      if (progress) progress.style.width = "100%";

      const matches = findMatchingRules();

      const scores = new Map();

      matches.forEach(match => {
        const rule = match.fields;
        const offerIds = linkedIds(
          rule["Offre recommandée"] ||
          rule["Offre recommandee"] ||
          rule.Offre
        );

        const score = Number(rule.Score) || 0;
        const priority = Number(rule.Priorité || rule.Priorite) || 0;

        offerIds.forEach(id => {
          const current = scores.get(id) || { score: 0, priority: 0, explanations: [] };
          current.score += score;
          current.priority += priority;

          const explanation = rule["Explication client"];
          if (explanation) current.explanations.push(explanation);

          scores.set(id, current);
        });
      });

      let rankedOffers = offers
        .map(record => {
          const meta = scores.get(record.id) || { score: 0, priority: 0, explanations: [] };
          return { record, meta };
        })
        .filter(item => item.meta.score > 0)
        .sort((a, b) =>
          b.meta.score - a.meta.score ||
          b.meta.priority - a.meta.priority ||
          (Number(fields(a.record).Ordre) || 999) - (Number(fields(b.record).Ordre) || 999)
        );

      // Fallback: if no rule matched, show the first active offer rather than breaking the journey.
      if (!rankedOffers.length) {
        rankedOffers = offers
          .filter(record => fields(record).Active !== false)
          .sort((a, b) => (Number(fields(a).Ordre) || 999) - (Number(fields(b).Ordre) || 999))
          .slice(0, 1)
          .map(record => ({
            record,
            meta: { score: 0, priority: 0, explanations: [] }
          }));
      }

      const best = rankedOffers[0];

      if (!best) {
        area.innerHTML = `
          <div class="result">
            <div class="result-label">PARCOURS TERMINÉ</div>
            <h3>Votre trajectoire nécessite un échange.</h3>
            <p>Présentez-nous votre projet pour construire la suite avec HINOVA.</p>
            <div class="result-actions">
              <a class="btn" href="contact.html">PARLER DE MON PROJET</a>
              <a class="btn ghost" href="solutions.html">VOIR LES SOLUTIONS</a>
            </div>
          </div>
        `;
        return;
      }

      const offer = fields(best.record);
      const explanation = best.meta.explanations.find(Boolean) ||
        "Cette solution correspond aux éléments renseignés dans votre parcours.";

      area.innerHTML = `
        <div class="result">
          <div class="result-label">TRAJECTOIRE RECOMMANDÉE</div>
          <h3>${escapeHtml(offer.Nom || "Solution HINOVA")}</h3>
          ${offer["Prix création XPF"] !== undefined
            ? `<div class="result-price">${money(offer["Prix création XPF"])}</div>`
            : ""}
          <p>${escapeHtml(explanation)}</p>
          <div class="result-actions">
            <a class="btn" href="contact.html">PARLER DE MON PROJET</a>
            <a class="btn ghost" href="solutions.html">VOIR LES SOLUTIONS</a>
          </div>
        </div>
      `;
    }

    renderQuestion(0);

  } catch (error) {
    console.error(error);
    area.innerHTML = `
      <div class="loading">
        Le moteur HINOVA n'a pas pu charger les données. Vérifiez la connexion au Worker.
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderEcosystem();
  renderOffers();
  renderJourney();
});
