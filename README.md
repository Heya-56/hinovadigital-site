# hinovadigital-site
Code source of Hinova Digital website

## Formulaire diagnostic → CRM
`functions/api/diagnostic.js` (copie identique dans `Hinova/functions/` selon le dossier racine Cloudflare Pages) relaie chaque demande vers l'automatisation Airtable « Site — Réception diagnostic ». Variable requise côté Cloudflare Pages : `AIRTABLE_DIAG_WEBHOOK`.
