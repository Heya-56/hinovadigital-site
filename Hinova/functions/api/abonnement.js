// POST /api/abonnement — inscription newsletter du Journal (D1 : hinova-journal, binding JOURNAL_DB)
export async function onRequestPost({ request, env }) {
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, erreur: 'Requête invalide' }, 400); }
  const email = String(data.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, erreur: 'E-mail invalide' }, 400);
  if (!data.consentement) return json({ ok: false, erreur: 'Consentement requis' }, 400);
  await env.JOURNAL_DB.prepare(
    "INSERT INTO abonnes (email, prenom, source, consentement) VALUES (?1, ?2, ?3, 1) ON CONFLICT(email) DO UPDATE SET statut='actif'"
  ).bind(email, String(data.prenom || '').slice(0, 80), String(data.source || 'journal').slice(0, 80)).run();
  return json({ ok: true });
}
