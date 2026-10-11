/* Hinova Digital — UI commune : pied de page, mode jour/nuit/système, lisibilité, installation PWA.
   Chargé en defer sur toutes les pages. Aucune dépendance. */
(function () {
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var root = document.documentElement;
  var EN = (root.lang || '').indexOf('en') === 0 || LS.get('lang') === 'en';
  var T = EN ? {
    tagline: 'Digital architecture & AI for Pacific businesses. We digitalize the entrepreneur journey.',
    sol: 'Solutions', quote: 'Online estimate', journey: 'Entrepreneur journey', lab: 'Our work', acad: 'Academy',
    hin: 'Hinova', vision: 'Vision', journal: 'Journal', diag: 'Free diagnosis', partner: 'Become a partner',
    legal: 'Legal', mentions: 'Legal notice', privacy: 'Privacy',
    reo: 'Māuruuru roa · Thank you for your trust.',
    view: 'Display', light: 'Day', dark: 'Night', system: 'System', text: 'Text size', contrast: 'High contrast',
    install: 'Install the app', installHint: 'On iPhone: tap Share, then “Add to Home Screen”.'
  } : {
    tagline: 'Architecture numérique & IA pour les entreprises du Pacifique. Nous digitalisons le parcours de l’entrepreneur.',
    sol: 'Solutions', quote: 'Devis en ligne', journey: 'Parcours entrepreneur', lab: 'Nos réalisations', acad: 'Académie',
    hin: 'Hinova', vision: 'Vision', journal: 'Journal', diag: 'Diagnostic offert', partner: 'Devenir partenaire',
    legal: 'Légal', mentions: 'Mentions légales', privacy: 'Confidentialité',
    reo: 'Māuruuru roa · Merci de votre confiance.',
    view: 'Affichage', light: 'Jour', dark: 'Nuit', system: 'Système', text: 'Taille du texte', contrast: 'Contraste renforcé',
    install: 'Installer l’application', installHint: 'Sur iPhone : touchez Partager, puis « Sur l’écran d’accueil ».'
  };

  /* ---------- styles ---------- */
  var css = [
    'html[data-hv-theme="dark"]{background:#121414;color-scheme:dark}html[data-hv-theme="dark"] body{filter:invert(.9) hue-rotate(180deg)}',
    'html[data-hv-theme="dark"] :is(.hv-foot,.dv-sum,.pv-doc,.hero-bg,.hv-keep){filter:invert(1) hue-rotate(180deg)}html[data-hv-theme="dark"] :is(.hv-foot,.dv-sum,.pv-doc,.hero-bg,.hv-keep) :is(img,video,picture,[style*="background-image"]){filter:none}',
    'html[data-hv-theme="dark"] img,html[data-hv-theme="dark"] video,html[data-hv-theme="dark"] picture,html[data-hv-theme="dark"] [style*="background-image"]{filter:invert(1) hue-rotate(180deg)}',
    'html[data-hv-contrast="1"] body{--hv-muted:#0B2F35}html[data-hv-contrast="1"] p,html[data-hv-contrast="1"] li,html[data-hv-contrast="1"] span{color:inherit!important}html[data-hv-contrast="1"] a{text-decoration:underline}',
    'html[data-hv-size="1"]{font-size:112.5%}html[data-hv-size="2"]{font-size:125%}',
    '.hv-foot{background:#08343A;color:#D7E7E8;padding:3.5rem 1.5rem 2rem;font-family:Inter,system-ui,sans-serif;margin-top:3rem}',
    '.hv-foot a{color:#D7E7E8;text-decoration:none}.hv-foot a:hover{color:#D9B370}',
    '.hv-foot a:focus-visible,.hv-foot button:focus-visible{outline:3px solid #D9B370;outline-offset:2px}',
    '.hv-in{max-width:72rem;margin:0 auto;display:grid;gap:2rem}',
    '.hv-top{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:2rem}',
    '@media(max-width:820px){.hv-top{grid-template-columns:1fr 1fr}}@media(max-width:480px){.hv-top{grid-template-columns:1fr}}',
    '.hv-brand img{width:52px;height:52px;border-radius:50%}.hv-brand p{font-size:.92rem;line-height:1.6;margin:.75rem 0 0;max-width:34ch}',
    '.hv-brand .hv-mail{display:inline-block;margin-top:.8rem;color:#D9B370;font-weight:600;user-select:all}',
    '.hv-col h4{font-family:Montserrat,sans-serif;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#D9B370;margin:0 0 .8rem}',
    '.hv-col ul{list-style:none;margin:0;padding:0;display:grid;gap:.55rem;font-size:.92rem}',
    '.hv-reo{font-style:italic;color:#8FD3DA;margin:0}',
    '.hv-ctrl{display:flex;flex-wrap:wrap;gap:1rem 1.5rem;align-items:center;border-top:1px solid rgba(255,255,255,.12);padding-top:1.5rem;font-size:.85rem}',
    '.hv-seg{display:inline-flex;border:1px solid rgba(255,255,255,.25);border-radius:999px;overflow:hidden}',
    '.hv-seg button{background:transparent;border:0;color:#D7E7E8;padding:.45rem .8rem;min-height:40px;cursor:pointer;font:inherit}',
    '.hv-seg button[aria-pressed="true"]{background:#1B64C8;color:#fff}',
    '.hv-btn{background:#D9B370;color:#08343A;border:0;border-radius:999px;padding:.55rem 1rem;min-height:40px;font-weight:700;cursor:pointer;font:inherit;font-weight:700}',
    '.hv-legal{font-size:.78rem;color:#9DB8BB;display:flex;flex-wrap:wrap;gap:.5rem 1rem;justify-content:space-between}',
    '.hv-hint{font-size:.8rem;color:#9DB8BB;width:100%}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- préférences ---------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var t = LS.get('hv-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && mq && mq.matches);
    if (dark) root.setAttribute('data-hv-theme', 'dark'); else root.removeAttribute('data-hv-theme');
  }
  function applyA11y() {
    var s = LS.get('hv-size') || '0'; if (s === '0') root.removeAttribute('data-hv-size'); else root.setAttribute('data-hv-size', s);
    if (LS.get('hv-contrast') === '1') root.setAttribute('data-hv-contrast', '1'); else root.removeAttribute('data-hv-contrast');
  }
  applyTheme(); applyA11y();
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);

  /* ---------- PWA ---------- */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; var b = document.getElementById('hvInstall'); if (b) b.hidden = false; });
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
  var iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  /* ---------- pied de page ---------- */
  function seg(name, items, cur) {
    return '<div class="hv-seg" role="group" aria-label="' + name + '">' + items.map(function (it) {
      return '<button type="button" data-k="' + it[0] + '" data-v="' + it[1] + '" aria-pressed="' + (cur === it[1]) + '" title="' + it[3] + '">' + it[2] + '</button>';
    }).join('') + '</div>';
  }
  function footer() {
    var f = document.createElement('footer'); f.className = 'hv-foot';
    f.innerHTML =
      '<div class="hv-in"><div class="hv-top">' +
        '<div class="hv-brand"><a href="/"><img src="/logo-hinova.webp" alt="Hinova Digital"></a>' +
          '<p>' + T.tagline + '</p><span class="hv-mail">contact@hinovadigitalcorp.com</span></div>' +
        '<div class="hv-col"><h4>' + T.sol + '</h4><ul><li><a href="/devis/">' + T.quote + '</a></li><li><a href="/solutions/#diagnostic">' + T.journey + '</a></li><li><a href="/lab/">' + T.lab + '</a></li><li><a href="/academie.html">' + T.acad + '</a></li></ul></div>' +
        '<div class="hv-col"><h4>' + T.hin + '</h4><ul><li><a href="/vision.html">' + T.vision + '</a></li><li><a href="/blog.html">' + T.journal + '</a></li><li><a href="/diagnostic.html">' + T.diag + '</a></li><li><a href="/partenaire/">' + T.partner + '</a></li></ul></div>' +
        '<div class="hv-col"><h4>' + T.legal + '</h4><ul><li><a href="/mentions.html">' + T.mentions + '</a></li><li><a href="/politique-de-confidentialite.html">' + T.privacy + '</a></li></ul></div>' +
      '</div>' +
      '<p class="hv-reo">' + T.reo + '</p>' +
      '<div class="hv-ctrl"><span>' + T.view + '</span>' +
        seg(T.view, [['hv-theme', 'light', '☀️', T.light], ['hv-theme', 'dark', '🌙', T.dark], ['hv-theme', 'system', '🖥️', T.system]], LS.get('hv-theme') || 'system') +
        seg(T.text, [['hv-size', '0', 'A', T.text], ['hv-size', '1', 'A+', T.text], ['hv-size', '2', 'A++', T.text]], LS.get('hv-size') || '0') +
        seg(T.contrast, [['hv-contrast', '1', '◐ ' + T.contrast, T.contrast]], LS.get('hv-contrast') === '1' ? '1' : '') +
        '<button type="button" id="hvInstall" class="hv-btn" hidden>⬇ ' + T.install + '</button>' +
        (iOS && !standalone ? '<span class="hv-hint">📱 ' + T.installHint + '</span>' : '') +
      '</div>' +
      '<div class="hv-legal"><span>© ' + new Date().getFullYear() + ' HINOVA DIGITAL, représentée par Heianui TAPARE · EI · SIREN 978 221 281 · TVA non applicable</span><span>Polynésie française · France</span></div>' +
      '</div>';
    f.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'hvInstall' && deferred) { deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; b.hidden = true; }); return; }
      var k = b.getAttribute('data-k'); if (!k) return;
      var v = b.getAttribute('data-v');
      if (k === 'hv-contrast') v = LS.get('hv-contrast') === '1' ? '0' : '1';
      LS.set(k, v);
      b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(k === 'hv-contrast' ? v === '1' : x === b)); });
      applyTheme(); applyA11y();
    });
    return f;
  }
  function mount() {
    var old = document.querySelector('body > footer, footer');
    var f = footer();
    if (old) old.replaceWith(f); else document.body.appendChild(f);
    if (deferred) document.getElementById('hvInstall').hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
