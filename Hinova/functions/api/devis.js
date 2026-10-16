/**
 * POST /api/devis — devis en ligne et candidatures « Devenir partenaire ».
 * Deux voies (au moins une doit être configurée dans Cloudflare Pages > Variables d'environnement) :
 *  1. AIRTABLE_API_KEY + AIRTABLE_BASE_ID : écrit directement dans la table « Leads » (recommandé).
 *  2. AIRTABLE_DIAG_WEBHOOK : relais vers l'automatisation Airtable (comme le diagnostic).
 *  3. BREVO_API_KEY : contact créé/mis à jour dans Brevo + e-mail de notification interne
 *     + accusé de réception au prospect. Options : BREVO_LIST_ID (ex. "5", plusieurs : "5,6"),
 *     BREVO_SENDER_EMAIL (défaut heianui.tapare@hinovadigitalcorp.com, expéditeur vérifié),
 *     BREVO_NOTIFY_EMAIL (défaut contact@hinovadigitalcorp.com).
 * Les deux peuvent coexister : le lead est écrit puis l'automatisation est prévenue.
 */
export async function onRequestPost(ctx) {
  try { return await handle(ctx); }
  catch (e) { return new Response(JSON.stringify({ ok: false, error: 'exception', detail: String(e && e.message || e).slice(0, 300) }), { status: 200, headers: { 'content-type': 'application/json' } }); }
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
  if (env.BREVO_API_KEY) try {
    const b = await brevo(env, { kind, source, email, name: cut(d.name), entreprise: cut(d.entreprise), phone: cut(d.phone),
      offre: cut(d.offre), resume: cut(d.resume), message: cut(d.message), recontact, news });
    done = done || b.ok; if (b.detail) detail += ' | ' + b.detail;
  } catch (e) { detail += ' | brevo:' + String(e.message || e).slice(0, 120); }
  if (!env.AIRTABLE_DIAG_WEBHOOK && !(env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID) && !env.BREVO_API_KEY) return json({ ok: false, error: 'not_configured' }, 503);
  return json({ ok: done, detail, keys: { api: !!env.AIRTABLE_API_KEY, base: !!env.AIRTABLE_BASE_ID, hook: !!env.AIRTABLE_DIAG_WEBHOOK, brevo: !!env.BREVO_API_KEY } }, 200);
}
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function brevo(env, L) {
  const hdr = { 'api-key': String(env.BREVO_API_KEY).trim(), 'content-type': 'application/json', accept: 'application/json' };
  const sender = { name: 'Hinova Digital', email: env.BREVO_SENDER_EMAIL || 'heianui.tapare@hinovadigitalcorp.com' };
  const notify = env.BREVO_NOTIFY_EMAIL || 'contact@hinovadigitalcorp.com';
  const [first, ...rest] = L.name.split(/\s+/);
  const listIds = String(env.BREVO_LIST_ID || '').split(',').map((x) => parseInt(x, 10)).filter(Boolean);
  let detail = '', ok = false;
  // 1. Contact (créé ou mis à jour)
  const contact = { email: L.email, updateEnabled: true, attributes: { FIRSTNAME: first || '', LASTNAME: rest.join(' '), OPT_IN: L.news } };
  if (listIds.length) contact.listIds = listIds;
  let r = await fetch('https://api.brevo.com/v3/contacts', { method: 'POST', headers: hdr, body: JSON.stringify(contact) });
  if (r.ok || r.status === 204) ok = true; else detail += 'brevo_contact_' + r.status + ':' + (await r.text()).slice(0, 150);
  // 2. Notification interne
  const rows = [['Source', L.source], ['Nom', L.name], ['Entreprise', L.entreprise], ['E-mail', L.email], ['Téléphone', L.phone],
    ['Offre', L.offre], ['Estimation', L.resume], ['Message', L.message], ['Accord recontact', L.recontact ? 'oui' : 'non'], ['Newsletter', L.news ? 'oui' : 'non']]
    .filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#4E6A6E"><b>${k}</b></td><td style="padding:4px 0">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: hdr, body: JSON.stringify({
    sender, to: [{ email: notify }], replyTo: { email: L.email, name: L.name },
    subject: `Nouveau ${L.kind === 'partenaire' ? 'partenaire' : 'devis'} — ${L.name}${L.offre ? ' · ' + L.offre : ''}`,
    htmlContent: `<div style="font-family:Arial,sans-serif;color:#0B2F35"><h2>${esc(L.source)}</h2><table>${rows}</table></div>` }) });
  if (r.ok) ok = true; else detail += ' brevo_notify_' + r.status + ':' + (await r.text()).slice(0, 150);
  // 3. Accusé de réception au prospect
  if (L.kind === 'devis') {
    r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: hdr, body: JSON.stringify({
      sender, to: [{ email: L.email, name: L.name }], replyTo: { email: notify, name: 'Hinova Digital' },
      subject: 'Māuruuru — votre demande de devis est bien reçue',
      htmlContent: `<div style="font-family:Arial,sans-serif;color:#0B2F35;line-height:1.6"><p>Ia ora na ${esc(first || L.name)},</p>
<p>Nous avons bien reçu votre demande${L.offre ? ' pour <b>' + esc(L.offre) + '</b>' : ''}${L.resume ? ' (' + esc(L.resume) + ')' : ''}.</p>
<p>Nous revenons vers vous sous 48 h ouvrées avec votre devis détaillé.</p>
<p>Māuruuru,<br><b>Hinova Digital</b><br><a href="https://hinovadigitalcorp.com">hinovadigitalcorp.com</a></p></div>` }) });
    if (!r.ok) detail += ' brevo_ack_' + r.status;
  }
  return { ok, detail: detail.trim() };
}
export const onRequest = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
