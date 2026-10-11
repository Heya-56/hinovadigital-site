/**
 * POST /api/devis — devis en ligne et candidatures « Devenir partenaire ».
 * Deux voies (au moins une doit être configurée dans Cloudflare Pages > Variables d'environnement) :
 *  1. AIRTABLE_API_KEY + AIRTABLE_BASE_ID : écrit directement dans la table « Leads » (recommandé).
 *  2. AIRTABLE_DIAG_WEBHOOK : relais vers l'automatisation Airtable (comme le diagnostic).
 * Les deux peuvent coexister : le lead est écrit puis l'automatisation est prévenue.
 */
export async function onRequestPost(ctx) {
  try { return await handle(ctx); }
  catch (e) { return new Response(JSON.stringify({ ok: false, error: 'exception', detail: String(e && e.message || e).slice(0, 300) }), { status: 500, headers: { 'content-type': 'application/json' } }); }
}
async function handle({ request, env }) {
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  let d;
  try {
    const ct = request.headers.get('content-type') || '';
    d = ct.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  if (d.botcheck) return json({ ok: true });
  const email = String(d.email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !String(d.name || '').trim()) return json({ ok: false, error: 'invalid' }, 422);
  if (!d.consent_contact) return json({ ok: false, error: 'consent_required' }, 422);

  const cut = (v) => String(v ?? '').slice(0, 4000).trim();
  const kind = d.kind === 'partenaire' ? 'partenaire' : 'devis';
  const source = kind === 'partenaire' ? 'Site — partenaire' : 'Site — devis';
  const recontact = !!d.consent_contact, news = !!d.consent_news;
  let done = false, detail = '';

  if (env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID) {
    const fields = {
      'Nom Prénom': cut(d.name), "Nom de l'entreprise/activité": cut(d.entreprise), 'Adresse e-mail': email,
      'Téléphone': cut(d.phone), 'Date': new Date().toISOString().slice(0, 10), 'Source': source,
      'Commentaires': [cut(d.offre), cut(d.resume), cut(d.message)].filter(Boolean).join('\n'),
      'Accord recontact': recontact, 'Newsletter & offres': news,
    };
    const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Leads`;
    const hdr = { authorization: `Bearer ${String(env.AIRTABLE_API_KEY).trim()}`, 'content-type': 'application/json' };
    let r = await fetch(url, { method: 'POST', headers: hdr, body: JSON.stringify({ records: [{ fields }] }) });
    if (!r.ok) {
      detail = 'airtable_' + r.status + ':' + (await r.text()).slice(0, 200);
      const minimal = { 'Nom Prénom': fields['Nom Prénom'], 'Adresse e-mail': email, 'Commentaires': source + '\n' + fields['Commentaires'] };
      r = await fetch(url, { method: 'POST', headers: hdr, body: JSON.stringify({ records: [{ fields: minimal }] }) });
      if (!r.ok) detail += ' | retry_' + r.status + ':' + (await r.text()).slice(0, 200);
    }
    done = r.ok;
  }
  if (env.AIRTABLE_DIAG_WEBHOOK) try {
    const r = await fetch(env.AIRTABLE_DIAG_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      source, recu_le: new Date().toISOString(), name: cut(d.name), entreprise: cut(d.entreprise), email, telephone: cut(d.phone),
      secteur: cut(d.offre), frein_principal: cut(d.resume), contexte: cut(d.message),
      accord_recontact: recontact, newsletter: news, destinataire: 'contact@hinovadigitalcorp.com' }) });
    done = done || r.ok;
  } catch (e) { detail += ' | webhook:' + String(e.message || e).slice(0, 120); }
  if (!env.AIRTABLE_DIAG_WEBHOOK && !(env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID)) return json({ ok: false, error: 'not_configured' }, 503);
  return json({ ok: done, detail, keys: { api: !!env.AIRTABLE_API_KEY, base: !!env.AIRTABLE_BASE_ID, hook: !!env.AIRTABLE_DIAG_WEBHOOK } }, done ? 200 : 502);
}
export const onRequest = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
