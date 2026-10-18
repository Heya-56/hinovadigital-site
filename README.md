# hinovadigital-site
Code source of Hinova Digital website

## Formulaire diagnostic → CRM
`functions/api/diagnostic.js` (copie identique dans `Hinova/functions/` selon le dossier racine Cloudflare Pages) relaie chaque demande vers l'automatisation Airtable « Site — Réception diagnostic ». Variable requise côté Cloudflare Pages : `AIRTABLE_DIAG_WEBHOOK`.

## Formulaire devis → e-mails (Resend)
`functions/api/devis.js` (copie identique dans `Hinova/functions/`) envoie, si `RESEND_API_KEY` est défini dans Cloudflare Pages, une notification à `contact@hinovadigitalcorp.com` et un accusé de réception au prospect. Domaine `hinovadigitalcorp.com` à vérifier dans Resend. Optionnels : `MAIL_FROM`, `MAIL_NOTIFY`.
