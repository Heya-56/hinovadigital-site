// Cloudflare Pages Function — POST /api/trading
// Pré-commande Trading Lab → Airtable (table « Leads Trading ») + e-mails Resend.
// Variables Cloudflare Pages (optionnelles, chaque canal s'active s'il est configuré) :
//   AIRTABLE_TOKEN, AIRTABLE_BASE  → enregistrement CRM
//   RESEND_API_KEY (+ MAIL_FROM, MAIL_NOTIFY) → notification interne + accusé de réception
const TABLE = "Leads Trading";
const REQUIRED = ["nom", "email", "telephone", "pays", "plateforme", "broker", "strategie"];

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "JSON invalide" }, 400); }
  for (const k of REQUIRED) if (!d[k] || !String(d[k]).trim()) return json({ error: `Champ manquant : ${k}` }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return json({ error: "Email invalide" }, 400);
  for (const k in d) if (String(d[k]).length > 5000) return json({ error: "Champ trop long" }, 400);

  const score = scoreLead(d);
  let saved = false;

  if (env.AIRTABLE_TOKEN && env.AIRTABLE_BASE) {
    const r = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${encodeURIComponent(TABLE)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ typecast: true, records: [{ fields: {
        "Nom": d.nom, "Email": d.email, "Téléphone": d.telephone, "Pays": d.pays,
        "Plateforme": d.plateforme, "Broker": d.broker, "Actifs": d.actifs || "",
        "Expérience": d.experience || "", "Stratégie": d.strategie, "Intérêt": d.interet || "",
        "Devise": String(d.devise || "xpf").toUpperCase(), "Score": score.points, "Segment": score.segment,
        "Étape": "1 · Pré-commande reçue", "CGV acceptées": true, "Source": "Page /trading",
      } }] }),
    });
    saved = r.ok;
  }

  let mailed = false;
  if (env.RESEND_API_KEY) {
    const from = env.MAIL_FROM || "Hinova Digital <contact@hinovadigitalcorp.com>";
    const notify = env.MAIL_NOTIFY || "heianui.tapare@hinovadigitalcorp.com";
    const send = (to, subject, html) => fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const res = await Promise.allSettled([
      send(notify, `[Trading Lab] ${score.segment} — ${d.nom} (${d.plateforme})`,
        `<p><b>${esc(d.nom)}</b> · ${esc(d.email)} · ${esc(d.telephone)} · ${esc(d.pays)}</p>
         <p>${esc(d.plateforme)} chez ${esc(d.broker)} · ${esc(d.experience)} · Actifs : ${esc(d.actifs)} · Intérêt : ${esc(d.interet)} · Score ${score.points}</p>
         <p><b>Stratégie :</b><br>${esc(d.strategie).replace(/\n/g, "<br>")}</p>`),
      send(d.email, "Votre pré-commande Hinova Digital — Trading Lab",
        `<p>Bonjour ${esc(d.nom)},</p>
         <p>Nous avons bien reçu votre projet de bot (${esc(d.plateforme)} / ${esc(d.broker)}).
         Notre équipe revient vers vous sous 48 h ouvrées pour planifier l'appel de cadrage.</p>
         <p>Rappel : Hinova Digital est un lab de construction logicielle, ni conseiller financier ni éducateur.
         Le trading comporte un risque élevé de perte en capital.</p>
         <p>HINOVA DIGITAL, représentée par Heianui TAPARE</p>`),
    ]);
    mailed = res[0].status === "fulfilled" && res[0].value.ok;
  }

  if (!saved && !mailed) return json({ error: "Enregistrement indisponible" }, 503);
  return json({ ok: true, saved, mailed });
}

export const onRequest = () => json({ error: "Method not allowed" }, 405);

function scoreLead(d) {
  let p = 0; const s = String(d.strategie).toLowerCase();
  if (s.length > 300) p += 20;
  if (/(stop|\bsl\b)/.test(s)) p += 15;
  if (/(take|\btp\b|objectif|sortie)/.test(s)) p += 10;
  if (/\b(m1|m5|m15|h1|h4|d1)\b|unité de temps|timeframe/.test(s)) p += 10;
  if (/(rsi|macd|ema|sma|moyenne|fibo|support|résistance|stoch)/.test(s)) p += 10;
  if (/mt5|metatrader 5|ctrader/i.test(d.plateforme)) p += 10;
  if (["Confirmé", "Professionnel"].includes(d.experience)) p += 15;
  if (/webmastering|trois/i.test(d.interet || "")) p += 10;
  return { points: p, segment: p >= 60 ? "🔥 Chaud" : p >= 35 ? "🟡 Tiède" : "🔵 À éduquer" };
}
function esc(v) { return String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } }); }
