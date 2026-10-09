/**
 * POST /api/diagnostic — relais serveur vers l'automatisation Airtable « Diagnostics ».
 * L'URL du webhook reste côté serveur (variable d'environnement Cloudflare Pages
 * AIRTABLE_DIAG_WEBHOOK), jamais dans le HTML.
 */
// champ du formulaire → clé envoyée à Airtable
const FIELDS = { name: 'name', entreprise: 'entreprise', email: 'email', phone: 'telephone', secteur: 'secteur', frein_principal: 'frein_principal', message: 'contexte' };

export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  if (!env.AIRTABLE_DIAG_WEBHOOK) return json({ ok: false, error: 'not_configured' }, 503);

  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    data = ct.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  if (data.botcheck) return json({ ok: true });                      // piège anti-robot
  const email = String(data.email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !String(data.name || '').trim())
    return json({ ok: false, error: 'invalid' }, 422);

  const payload = { source: 'Site — diagnostic', recu_le: new Date().toISOString() };
  for (const [src, dst] of Object.entries(FIELDS)) payload[dst] = String(data[src] ?? '').slice(0, 4000).trim();

  const res = await fetch(env.AIRTABLE_DIAG_WEBHOOK, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  return json({ ok: res.ok }, res.ok ? 200 : 502);
}

export const onRequest = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
