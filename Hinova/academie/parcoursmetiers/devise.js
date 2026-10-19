/* Parcours Métiers — pays, devises et prix affichés.
   Prix fixes par devise. Les devises à parité fixe avec l'euro (XPF, XOF, XAF)
   sont converties ; les autres pays sont facturés en euros. */
(function () {
  var PRIX = { EUR: 1250, XPF: 149000, XOF: 820000, XAF: 820000 };
  var NOMS = { EUR: '€', XPF: 'XPF', XOF: 'FCFA', XAF: 'FCFA' };

  var PAYS = [
    { g: 'Pacifique', l: [['pf', 'Polynésie française', 'XPF'], ['nc', 'Nouvelle-Calédonie', 'XPF'], ['wf', 'Wallis-et-Futuna', 'XPF']] },
    { g: 'Afrique de l\'Ouest', l: [['sn', 'Sénégal', 'XOF'], ['ci', 'Côte d\'Ivoire', 'XOF'], ['ml', 'Mali', 'XOF'], ['bf', 'Burkina Faso', 'XOF'], ['bj', 'Bénin', 'XOF'], ['tg', 'Togo', 'XOF'], ['ne', 'Niger', 'XOF'], ['gw', 'Guinée-Bissau', 'XOF']] },
    { g: 'Afrique centrale', l: [['cm', 'Cameroun', 'XAF'], ['ga', 'Gabon', 'XAF'], ['cg', 'Congo', 'XAF'], ['td', 'Tchad', 'XAF'], ['cf', 'Centrafrique', 'XAF'], ['gq', 'Guinée équatoriale', 'XAF']] },
    { g: 'Europe', l: [['fr', 'France', 'EUR'], ['be', 'Belgique', 'EUR'], ['lu', 'Luxembourg', 'EUR'], ['ch', 'Suisse', 'EUR'], ['re', 'La Réunion', 'EUR'], ['gp', 'Guadeloupe', 'EUR'], ['mq', 'Martinique', 'EUR'], ['gf', 'Guyane', 'EUR']] },
    { g: 'Autres', l: [['ma', 'Maroc', 'EUR'], ['tn', 'Tunisie', 'EUR'], ['ca', 'Canada', 'EUR'], ['autre', 'Autre pays', 'EUR']] }
  ];

  var PROFILS = [['entrepreneur', 'Entrepreneur·e', 'Entrepreneur'], ['particulier', 'Particulier', 'Individual'], ['entreprise', 'Entreprise ou établissement', 'Company or institution']];
  var GROUPES_EN = { 'Pacifique': 'Pacific', 'Afrique de l\'Ouest': 'West Africa', 'Afrique centrale': 'Central Africa', 'Europe': 'Europe', 'Autres': 'Other' };
  function en() { return (document.documentElement.lang || 'fr').slice(0, 2) === 'en'; }

  function trouverPays(code) {
    for (var i = 0; i < PAYS.length; i++) for (var j = 0; j < PAYS[i].l.length; j++) if (PAYS[i].l[j][0] === code) return PAYS[i].l[j];
    return null;
  }
  function devisePour(code) { var p = trouverPays(code); return p ? p[2] : 'EUR'; }
  function formatPrix(devise) {
    var n = PRIX[devise] || PRIX.EUR, s = NOMS[devise] || '€';
    return n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' ' + s;
  }
  function remplirPays(select, choisi) {
    select.innerHTML = '<option value="">' + (en() ? 'Choose a country' : 'Choisir un pays') + '</option>';
    PAYS.forEach(function (gr) {
      var og = document.createElement('optgroup'); og.label = en() ? (GROUPES_EN[gr.g] || gr.g) : gr.g;
      gr.l.forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === choisi) o.selected = true; og.appendChild(o); });
      select.appendChild(og);
    });
  }
  function remplirProfils(select, choisi) {
    select.innerHTML = '<option value="">' + (en() ? 'Choose a profile' : 'Choisir un profil') + '</option>';
    PROFILS.forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = en() ? p[2] : p[1]; if (p[0] === choisi) o.selected = true; select.appendChild(o); });
  }
  function lireChoix() {
    var q = new URLSearchParams(location.search), c = {};
    try { c = JSON.parse(localStorage.getItem('pm_choix') || '{}'); } catch (e) {}
    return { profil: q.get('profil') || c.profil || '', pays: q.get('pays') || c.pays || '' };
  }
  function garderChoix(profil, pays) {
    try { localStorage.setItem('pm_choix', JSON.stringify({ profil: profil, pays: pays })); } catch (e) {}
  }

  window.ParcoursMetiers = { PAYS: PAYS, PROFILS: PROFILS, trouverPays: trouverPays, devisePour: devisePour, formatPrix: formatPrix, remplirPays: remplirPays, remplirProfils: remplirProfils, lireChoix: lireChoix, garderChoix: garderChoix };
})();
