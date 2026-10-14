/**
 * POST /api/benchmark — forwards one-stop-shop benchmark responses to a private
 * automation endpoint configured in Cloudflare Pages as AIRTABLE_BENCHMARK_WEBHOOK.
 * Do not put webhook URLs or credentials in browser code.
 */
const ALLOWED = [
  'role','entry','actors','actors_details','referral','services','integration',
  'challenges','challenge_details','metrics','recommendations','recommendation_details',
  'name','organisation','email','country','referral_contact','consent'
];
const MULTI = new Set(['role','entry','actors','services','challenges','metrics','recommendations']);
const LIMITS = {
  role: 1000, entry: 1000, actors: 1200, actors_details: 1000, referral: 200,
  services: 1200, integration: 2000, challenges: 1200, challenge_details: 2000,
  metrics: 1200, recommendations: 1200, recommendation_details: 2500,
  name: 120, organisation: 180, email: 254, country: 120, referral_contact: 1500
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
export async function onRequestPost({ request, env }) {
  if (!env.AIRTABLE_BENCHMARK_WEBHOOK) return json({ ok: false, error: 'not_configured' }, 503);
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ ok: false, error: 'bad_request' }, 400);
  if (String(data.website || '').trim()) return json({ ok: true }); // honeypot
  if (data.consent !== 'yes') return json({ ok: false, error: 'consent_required' }, 422);
  const clean = {};
  for (const key of ALLOWED) {
    if (MULTI.has(key)) {
      const values = Array.isArray(data[key]) ? data[key] : [];
      clean[key] = values.slice(0, 12).map(v => String(v).slice(0, 180).trim()).filter(Boolean);
    } else {
      clean[key] = String(data[key] ?? '').slice(0, LIMITS[key] || 1000).trim();
    }
  }
  if (clean.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean.email)) return json({ ok: false, error: 'invalid_email' }, 422);
  const payload = { source: 'Hinova Digital — One-Stop Shop Benchmark', received_at: new Date().toISOString(), ...clean };
  let response;
  try {
    response = await fetch(env.AIRTABLE_BENCHMARK_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch { return json({ ok: false, error: 'upstream_unavailable' }, 502); }
  if (!response.ok) return json({ ok: false, error: 'upstream_rejected' }, 502);
  return json({ ok: true });
}
export const onRequest = () => new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
