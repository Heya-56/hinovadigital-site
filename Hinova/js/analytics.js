/* Hinova Digital — Google Analytics chargé uniquement après consentement (RGPD) */
(function () {
  var ID = 'G-J0409XKY53', loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', ID, { anonymize_ip: true });
  }
  window.hdLoadAnalytics = load;
  var c = null; try { c = localStorage.getItem('hd_cookie_consent'); } catch (e) {}
  if (c === 'accepted') load();
  /* Bandeau de consentement sur les pages qui n'en ont pas */
  if (!c) document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cookieConsent')) return;
    var d = document.createElement('div');
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Cookies');
    d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:16px 20px;background:rgba(8,52,58,.97);color:#D9EBEB;font:14px Inter,sans-serif;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center';
    d.innerHTML = '<span style="flex:1;min-width:240px;max-width:760px">Nous utilisons des cookies pour mesurer notre audience. Vous pouvez refuser. <a href="/politique-de-confidentialite.html" style="color:#7FD6E8">En savoir plus</a></span>' +
      '<button data-c="refused" style="background:transparent;color:#D9EBEB;border:1px solid rgba(217,235,235,.4);padding:10px 16px;border-radius:10px;cursor:pointer">Refuser</button>' +
      '<button data-c="accepted" style="background:#0AB8C4;color:#001419;border:0;padding:10px 16px;border-radius:10px;font-weight:700;cursor:pointer">Accepter</button>';
    d.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-c'); if (!v) return;
      try { localStorage.setItem('hd_cookie_consent', v); } catch (x) {}
      d.remove(); if (v === 'accepted') load();
    });
    document.body.appendChild(d);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#cookieAcceptBtn');
    if (b) load();
  });
  /* Événements de conversion : soumission de formulaire */
  document.addEventListener('submit', function (e) {
    if (window.gtag) gtag('event', 'generate_lead', { form: (e.target.querySelector('[name=subject]') || {}).value || location.pathname });
  });
})();
