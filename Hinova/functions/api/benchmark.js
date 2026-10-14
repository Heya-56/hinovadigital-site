/**
 * POST /api/benchmark — stores one-stop-shop benchmark responses in the
 * dedicated Airtable table. The Airtable API key stays server-side in Cloudflare.
 */
const BASE_ID = 'appaLidpXabSqNST1';
const TABLE_ID = 'tbl6lxkEgX2bfTKKS';
const MULTI = new Set(['role','entry','actors','services','challenges','metrics','recommendations']);
const LIMITS = {
  actors_details:1000, integration:2000, challenge_details:2000, recommendation_details:2500,
  name:120, organisation:180, email:254, country:120, referral_contact:1500
};
const json = (body,status=200) => new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
export async function onRequestPost({request,env}) {
  if(!env.AIRTABLE_API_KEY) return json({ok:false,error:'not_configured'},503);
  let data;
  try { data=await request.json(); } catch { return json({ok:false,error:'bad_request'},400); }
  if(!data||typeof data!=='object'||Array.isArray(data)) return json({ok:false,error:'bad_request'},400);
  if(String(data.website||'').trim()) return json({ok:true});
  if(data.consent!=='yes') return json({ok:false,error:'consent_required'},422);
  const clean={};
  const allowed=['role','entry','actors','actors_details','referral','services','integration','challenges','challenge_details','metrics','recommendations','recommendation_details','name','organisation','email','country','referral_contact'];
  for(const key of allowed) {
    if(MULTI.has(key)) clean[key]=(Array.isArray(data[key])?data[key]:[]).slice(0,12).map(v=>String(v).slice(0,180).trim()).filter(Boolean);
    else clean[key]=String(data[key]??'').slice(0,LIMITS[key]||1000).trim();
  }
  if(clean.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean.email)) return json({ok:false,error:'invalid_email'},422);
  const fields={
    'Submission':'Benchmark '+crypto.randomUUID(),
    'Received at':new Date().toISOString(),
    'Role':(clean.role||[]).join('; '),
    'Entry points':(clean.entry||[]).join('; '),
    'Organisations involved':(clean.actors||[]).join('; '),
    'Key partners detail':clean.actors_details,
    'Referral process':String(data.referral||'').slice(0,200),
    'Integrated services':(clean.services||[]).join('; '),
    'Repeated steps / data':clean.integration,
    'Implementation challenges':(clean.challenges||[]).join('; '),
    'Challenge lessons':clean.challenge_details,
    'Success metrics':(clean.metrics||[]).join('; '),
    'Recommendations selected':(clean.recommendations||[]).join('; '),
    'Key recommendation':clean.recommendation_details,
    'Contact name':clean.name,
    'Organisation':clean.organisation,
    'Country / territory':clean.country,
    'Suggested contact / context':clean.referral_contact,
    'Consent':true
  };
  if(clean.email) fields.Email=clean.email;
  for(const key of Object.keys(fields)) if(fields[key]==='') delete fields[key];
  let response;
  try {
    response=await fetch('https://api.airtable.com/v0/'+BASE_ID+'/'+TABLE_ID,{
      method:'POST',
      headers:{authorization:'Bearer '+String(env.AIRTABLE_API_KEY).trim(),'content-type':'application/json'},
      body:JSON.stringify({records:[{fields}]})
    });
  } catch { return json({ok:false,error:'upstream_unavailable'},502); }
  if(!response.ok) return json({ok:false,error:'upstream_rejected'},502);
  return json({ok:true});
}
export const onRequest=()=>new Response('Method Not Allowed',{status:405,headers:{allow:'POST'}});
