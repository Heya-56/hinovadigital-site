# hinovadigital-site
Code source of Hinova Digital website

## Formulaire diagnostic → CRM
`functions/api/diagnostic.js` (copie identique dans `Hinova/functions/` selon le dossier racine Cloudflare Pages) relaie chaque demande vers l'automatisation Airtable « Site — Réception diagnostic ». Variable requise côté Cloudflare Pages : `AIRTABLE_DIAG_WEBHOOK`.

## Formulaire devis → Brevo
`functions/api/devis.js` (copie identique dans `Hinova/functions/`) envoie aussi chaque demande à Brevo si `BREVO_API_KEY` est défini dans Cloudflare Pages : contact créé/mis à jour, e-mail de notification à `contact@hinovadigitalcorp.com`, accusé de réception au prospect. Optionnels : `BREVO_LIST_ID`, `BREVO_SENDER_EMAIL`, `BREVO_NOTIFY_EMAIL`.
