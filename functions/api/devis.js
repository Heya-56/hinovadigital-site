/**
 * POST /api/devis — devis en ligne et candidatures « Devenir partenaire ».
 * Relais vers la même automatisation Airtable que le diagnostic (AIRTABLE_DIAG_WEBHOOK),
 * avec source = « Site — devis » ou « Site — partenaire ».
 */
export async function onRequestPost({ request, env }) {
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  if (!env.AIRTABLE_DIAG_WEBHOOK) return json({ ok: false, error: 'not_configured' }, 503);
  let d;
  try {
    const ct = request.headers.get('content-type') || '';
    d = ct.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  if (d.botcheck) return json({ ok: true });
  const email = String(d.email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !String(d.name || '').trim()) return json({ ok: false, error: 'invalid' }, 422);
  const cut = (v) => String(v ?? '').slice(0, 4000).trim();
  const kind = d.kind === 'partenaire' ? 'partenaire' : 'devis';
  const payload = {
    source: kind === 'partenaire' ? 'Site — partenaire' : 'Site — devis',
    recu_le: new Date().toISOString(),
    name: cut(d.name), entreprise: cut(d.entreprise), email, telephone: cut(d.phone),
    secteur: cut(d.offre), frein_principal: cut(d.resume), contexte: cut(d.message),
    destinataire: 'contact@hinovadigitalcorp.com',
  };
  const res = await fetch(env.AIRTABLE_DIAG_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  return json({ ok: res.ok }, res.ok ? 200 : 502);
}
export const onRequest = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
