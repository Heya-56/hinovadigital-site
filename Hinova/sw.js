/* Hinova Digital — service worker (PWA)
   Pages : réseau d'abord (contenu toujours à jour), cache en secours hors ligne.
   Images, polices, CSS, JS : cache d'abord (chargement instantané). */
const VERSION = 'hinova-v2026-10-08h';
const CORE = ['/', '/index.html', '/vision.html', '/academie.html', '/diagnostic.html',
  '/css/tailwind.css', '/css/theme.css', '/logo-hinova.webp', '/icon-192.png', '/icon-512.png', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // formulaires : jamais mis en cache
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.includes('fonts.g');

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  if ((sameOrigin && /\.(css|js|webp|png|jpg|jpeg|svg|woff2?|json)$/i.test(url.pathname)) || isFont) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
