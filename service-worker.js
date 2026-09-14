// Bump this version string every time you deploy meaningful changes.
// Changing this file's bytes is what makes the browser notice there's an update at all —
// if this file is byte-identical to what's already installed, the browser will keep
// running the OLD service worker forever, no matter what else you change.
const CACHE_NAME = 'alloy-costing-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isNavigation = event.request.mode === 'navigate';
  const isHtmlShell = isNavigation || url.endsWith('/') || url.endsWith('index.html');
  const isStaticAsset = ASSETS.some((a) => a !== './' && a !== './index.html' && url.endsWith(a.replace('./', '')));

  if (isHtmlShell) {
    // Network-first: always try to get the latest app code. Only fall back to the
    // cached copy if the network request fails (e.g. offline).
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  if (isStaticAsset) {
    // Cache-first is fine for icons/manifest — they rarely change.
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Everything else (CDN scripts, etc.): network-first, cache as a fallback for offline use.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
