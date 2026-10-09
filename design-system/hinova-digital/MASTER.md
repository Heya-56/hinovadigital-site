# Hinova Digital — Design System (MASTER)

Source de vérité visuelle du site hinovadigitalcorp.com. Établi avec le skill UI/UX Pro Max
(pattern « Trust & Authority + Conversion », style « Accessible & Ethical »), adapté à l'identité Hinova.

## Palette « Lagon numérique »
| Rôle | Hex | Variable | Usage |
|---|---|---|---|
| Teal sombre | `#08343A` | `--hv-teal-900` | Héros, footer, menus |
| Surface douce | `#EEF5F5` | `--hv-teal-050` | Sections alternées |
| Bleu numérique | `#1B64C8` | `--hv-blue` | Lignes, liens, focus, CTA principal |
| Doré | `#B5823A` | `--hv-gold` | Accents, labels, CTA secondaire |
| Doré clair | `#D9B370` | `--hv-gold-lt` | Doré sur fond sombre |
| Encre | `#0B2F35` | `--hv-ink` | Texte principal |
| Texte secondaire | `#4E6A6E` | `--hv-muted` | Paragraphes secondaires |
| Fond | `#FFFFFF` | `--hv-white` | Lecture |

Ancienne palette remappée : `#061A22`→blanc (fond) / teal sombre (overlays), `#0AB8C4`→`#1B64C8`,
`#E0F7FA`→`#0B2F35`, `#C09552`→`#B5823A`.

## Typographie
Montserrat (titres) + Inter (texte), base 16px, interligne 1.6, `text-wrap: balance` sur les titres.

## Règles
- Contraste texte ≥ 4.5:1 ; focus visible bleu 3px (doré sur fond sombre) ; cibles tactiles 44px.
- Cartes blanches, liseré bleu numérique, ombre douce ; carte dorée = liseré supérieur doré.
- Signature : trait dégradé bleu → doré sous chaque H2 de section.
- `prefers-reduced-motion` respecté globalement.
- Copy : pas de jargon technique en page marketing ; H.E.Y.A. et R.I.V.A.G.E. réservés à l'Académie.
- Marque : « Hinova Digital » (le domaine seul garde « corp »).

Implémentation : `Hinova/css/theme.css`, chargé en dernier sur chaque page.

## Build CSS (après tout ajout de classes Tailwind dans le HTML)
```bash
npx tailwindcss@3 -c tailwind.config.js -i tailwind.input.css -o Hinova/css/tailwind.css --minify
```
Puis incrémenter `VERSION` dans `Hinova/sw.js` pour que les visiteurs reçoivent la nouvelle version.
