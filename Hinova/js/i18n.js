/* Hinova Digital — traduction FR/EN des pages sans dictionnaire propre.
   Chargé dans <head> sans defer. Le français est écrit dans le HTML ;
   l'anglais vient de /js/i18n-en.json (texte français exact → texte anglais). */
(function () {
  var KEY = 'hd_lang', DICT_URL = '/js/i18n-en.json?v=20261019b';
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, TEXTAREA: 1 };
  var ATTRS = ['alt', 'placeholder', 'aria-label', 'title'];
  var root = document.documentElement;

  function initialLang() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'fr' || q === 'en') return q;
    if (saved === 'fr' || saved === 'en') return saved;
    return (navigator.language || 'fr').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  }

  var lang = initialLang(), dict = null, dictPromise = null, observer = null;
  var originals = new Map();      // text node -> texte français d'origine
  var attrOriginals = new Map();  // element -> {attr: valeur}
  var titleFr = null, descFr = null;

  root.lang = lang;
  if (lang === 'en') {
    root.classList.add('i18n-pending');
    var st = document.createElement('style');
    st.textContent = 'html.i18n-pending body{visibility:hidden}';
    document.head.appendChild(st);
    setTimeout(function () { root.classList.remove('i18n-pending'); }, 2500);
  }

  function loadDict() {
    if (!dictPromise) {
      dictPromise = fetch(DICT_URL).then(function (r) { return r.json(); })
        .then(function (d) { dict = d; return d; })
        .catch(function () { dict = {}; return dict; });
    }
    return dictPromise;
  }
  if (lang === 'en') loadDict();

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  // Textes composés par les scripts des pages : « A · B », montants « / mois », échéances.
  var RULES = [
    [/^Échéance (\d+)$/, 'Instalment $1'],
    [/^(.*?)\s*\/\s*mois$/, function (m, a) { return a + ' / month'; }],
    [/^à partir de (.*)$/, 'from $1'],
    [/^Création (.*)$/, 'Build $1']
  ];
  function lookup(key) {
    if (dict.hasOwnProperty(key)) return dict[key];
    if (key.indexOf(' · ') > 0) {
      var parts = key.split(' · '), hit = false;
      var tr = parts.map(function (p) { if (dict.hasOwnProperty(p)) { hit = true; return dict[p]; } return p; });
      if (hit) return tr.join(' · ');
    }
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(key)) return key.replace(RULES[i][0], RULES[i][1]);
    return null;
  }

  function translateText(node) {
    if (!dict) return;
    var fr = originals.has(node) ? originals.get(node) : node.nodeValue;
    var key = norm(fr);
    var out = key ? lookup(key) : null;
    if (out === null) return;
    if (!originals.has(node)) originals.set(node, fr);
    var lead = fr.match(/^\s*/)[0], trail = fr.match(/\s*$/)[0];
    var en = lead + out + trail;
    if (node.nodeValue !== en) node.nodeValue = en;
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (!v) continue;
      var store = attrOriginals.get(el) || {};
      var fr = store.hasOwnProperty(a) ? store[a] : v, key = norm(fr);
      if (dict.hasOwnProperty(key)) {
        store[a] = fr; attrOriginals.set(el, store);
        if (v !== dict[key]) el.setAttribute(a, dict[key]);
      }
    }
  }

  function walk(rootNode) {
    if (rootNode.nodeType === 3) { if (!inSkip(rootNode)) translateText(rootNode); return; }
    if (rootNode.nodeType !== 1 || SKIP[rootNode.nodeName]) return;
    translateAttrs(rootNode);
    var tw = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) return SKIP[n.nodeName] ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) translateText(n); else translateAttrs(n); }
  }
  function inSkip(node) {
    for (var p = node.parentNode; p && p !== document; p = p.parentNode) if (SKIP[p.nodeName]) return true;
    return false;
  }

  function applyEn() {
    walk(document.body);
    if (titleFr === null) titleFr = document.title;
    if (dict[norm(titleFr)]) document.title = dict[norm(titleFr)];
    var md = document.querySelector('meta[name="description"]');
    if (md) { if (descFr === null) descFr = md.content; if (dict[norm(descFr)]) md.content = dict[norm(descFr)]; }
    if (!observer) {
      observer = new MutationObserver(function (muts) {
        if (lang !== 'en') return;
        muts.forEach(function (m) {
          if (m.type === 'characterData') {
            if (originals.has(m.target) && norm(m.target.nodeValue) !== norm(dict[norm(originals.get(m.target))] || '')) originals.delete(m.target);
            translateText(m.target);
          } else if (m.type === 'attributes') { translateAttrs(m.target); }
          else m.addedNodes.forEach(walk);
        });
      });
    }
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function applyFr() {
    if (observer) observer.disconnect();
    originals.forEach(function (fr, node) { node.nodeValue = fr; });
    originals.clear();
    attrOriginals.forEach(function (store, el) { for (var a in store) el.setAttribute(a, store[a]); });
    attrOriginals.clear();
    if (titleFr !== null) document.title = titleFr;
    var md = document.querySelector('meta[name="description"]');
    if (md && descFr !== null) md.content = descFr;
  }

  function setLang(next) {
    lang = next; root.lang = next;
    try { localStorage.setItem(KEY, next); } catch (e) {}
    var done = function () {
      if (next === 'en') applyEn(); else applyFr();
      updateButton();
      root.classList.remove('i18n-pending');
      document.dispatchEvent(new CustomEvent('hd:lang', { detail: next }));
    };
    if (next === 'en') loadDict().then(done); else done();
  }

  var btn = null;
  function updateButton() { if (btn) { btn.textContent = lang === 'fr' ? 'EN' : 'FR'; btn.setAttribute('aria-label', lang === 'fr' ? 'Switch to English' : 'Passer en français'); } }
  function addButton() {
    if (document.getElementById('lang-btn')) return;
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'hd-lang-toggle';
    btn.style.cssText = 'position:fixed;left:calc(16px + env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9000;min-width:48px;min-height:44px;padding:.5rem .8rem;border-radius:999px;border:1px solid rgba(181,130,58,.6);background:rgba(8,52,58,.92);color:#F4FAFA;font:700 .8rem Montserrat,Inter,system-ui,sans-serif;letter-spacing:.1em;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25)';
    btn.addEventListener('click', function () { setLang(lang === 'fr' ? 'en' : 'fr'); });
    document.body.appendChild(btn);
    updateButton();
  }

  window.HDi18n = { setLang: setLang, get lang() { return lang; } };

  document.addEventListener('DOMContentLoaded', function () {
    addButton();
    if (lang === 'en') setLang('en');
  });
})();
