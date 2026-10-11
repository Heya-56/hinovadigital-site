/**
 * POST /api/temoignage — avis envoyés depuis le site, écrits dans la table Airtable « Témoignages ».
 * Variables Cloudflare Pages requises : AIRTABLE_API_KEY + AIRTABLE_BASE_ID.
 */
export async function onRequestPost(ctx) {
  try { return await handle(ctx); }
  catch (e) { return new Response(JSON.stringify({ ok: false, error: 'exception', detail: String(e && e.message || e).slice(0, 300) }), { status: 200, headers: { 'content-type': 'application/json' } }); }
}
async function handle({ request, env }) {
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) return json({ ok: false, error: 'not_configured' }, 503);
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  if (d.botcheck) return json({ ok: true });
  const email = String(d.email || '').trim();
  const avis = String(d.avis || '').trim();
  if (!String(d.prenom || '').trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !avis || !d.consentement) return json({ ok: false, error: 'invalid' }, 422);
  const note = Math.min(5, Math.max(1, parseInt(d.note, 10) || 5));
  const r = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent('Témoignages')}`, {
    method: 'POST', headers: { authorization: `Bearer ${String(env.AIRTABLE_API_KEY).trim()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ records: [{ fields: {
      'Prénom': String(d.prenom).slice(0, 80).trim(), 'Email': email, 'Note': note, 'Avis': avis.slice(0, 3000),
      'Source': String(d.source || 'Académie').slice(0, 80), 'Consentement publication': true,
      'Reçu le': new Date().toISOString().slice(0, 10) } }] }),
  });
  const detail = r.ok ? '' : 'airtable_' + r.status + ':' + (await r.text()).slice(0, 200);
  return json({ ok: r.ok, detail }, 200);
}
export const onRequest = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
