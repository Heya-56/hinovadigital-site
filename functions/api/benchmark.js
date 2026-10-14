/**
 * POST /api/benchmark — securely records Smart Polynesia regional benchmark
 * answers in Airtable. Requires AIRTABLE_API_KEY in Cloudflare Pages settings.
 */
const BASE_ID='appaLidpXabSqNST1',TABLE_ID='tbl6lxkEgX2bfTKKS';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const s=(v,n=2000)=>String(v??'').trim().slice(0,n);
export async function onRequestPost({request,env}){
 if(!env.AIRTABLE_API_KEY)return json({ok:false,error:'not_configured'},503);
 let d;try{d=await request.json()}catch{return json({ok:false,error:'bad_request'},400)}
 if(!d||typeof d!=='object'||Array.isArray(d))return json({ok:false,error:'bad_request'},400);
 if(s(d.website,300))return json({ok:true});
 if(d.consent!=='yes')return json({ok:false,error:'consent_required'},422);
 if(!s(d.territory,120)||!s(d.creation_time,120))return json({ok:false,error:'required_fields'},422);
 const email=s(d.email,254);if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json({ok:false,error:'invalid_email'},422);
 const arr=v=>Array.isArray(v)?v.slice(0,12).map(x=>s(x,180)).filter(Boolean).join('; '):'';
 const v={
 'Submission':'Smart Polynesia benchmark '+crypto.randomUUID(),'Received at':new Date().toISOString(),
 'Country / territory':s(d.territory,120),'Territory':s(d.territory,120),
 'Role':s(d.role,180),'Respondent role':s(d.role,180),'Contact function':s(d.contact_role,180),
 'Reform / system name':s(d.system,180),'System scope':s(d.system_scope,1200),'Reform year':s(d.reform_year,120),
 'Current creation time':s(d.creation_time,120),'Online journey percentage':s(d.online_pct,120),
 'Physical visit required':s(d.visit,120),'Single application':s(d.single_application,120),
 'Journey features':arr(d.journey_features),'Repeated steps / data':s(d.journey_notes,1800),
 'Digital identity':s(d.digital_identity,160),'Unique business number':s(d.business_number,160),
 'Update data once':s(d.update_once,180),'Shared data register':s(d.shared_register,160),
 'Automatic administration exchange':s(d.auto_exchange,180),'API / interoperability':s(d.interoperability,160),
 'Evidence / source':s(d.evidence,1800),'Current barriers':s(d.barriers,2000),
 'Reform lessons':s(d.lessons,2000),'Key recommendation':s(d.advice,2000),'Data confidence':s(d.confidence,120),
 'Creation time before reform':s(d.before_creation,120),'Creation time after reform':s(d.after_creation,120),
 'Current modification time':s(d.after_modification,120),'Modification time before reform':s(d.before_modification,120),
 'Modification time after reform':s(d.after_modification,120),'Forms eliminated':s(d.forms_removed,120),
 'User satisfaction':s(d.satisfaction,180),'Success metrics':s(d.other_kpis,1500),
 'Contact name':s(d.contact_name,120),'Organisation':s(d.organisation,180),
 'Suggested contact / context':s(d.architecture_notes,1800),'Consent':true
 };
 if(email)v.Email=email;
 const fields={};for(const [k,val] of Object.entries(v))if(val!==''&&val!==undefined&&val!==null)fields[k]=val;
 let res;try{res=await fetch('https://api.airtable.com/v0/'+BASE_ID+'/'+TABLE_ID,{method:'POST',headers:{authorization:'Bearer '+String(env.AIRTABLE_API_KEY).trim(),'content-type':'application/json'},body:JSON.stringify({records:[{fields}]})})}catch{return json({ok:false,error:'upstream_unavailable'},502)}
 if(!res.ok)return json({ok:false,error:'upstream_rejected'},502);return json({ok:true});
}
export const onRequest=()=>new Response('Method Not Allowed',{status:405,headers:{allow:'POST'}});
