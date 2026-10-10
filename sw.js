/* Mirel Map Service Worker - 2026.10.10-46 */
const MIREL_SW_VERSION = '2026.10.10-46';
const MIREL_CACHE = 'mirel-map-' + MIREL_SW_VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest?v=20261010-45',
  './icon-192.png?v=20261010-45',
  './icon-192-maskable.png?v=20261010-45',
  './icon-512.png?v=20261010-45',
  './icon-512-maskable.png?v=20261010-45',
  './apple-touch-icon.png?v=20261010-45',
  './splash-828x1792.png',
  './loading-screen.png',
  './style.css?v=20261009-39',
  './config.js?v=20261010-45',
  './app.js?v=20261010-46',
  './app-enhancements.js?v=20261009-39'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(MIREL_CACHE);
    await Promise.allSettled(CORE.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('mirel-map-') && key !== MIREL_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  /* HTML/画面遷移は常にネットを先に見て、最新版を優先 */
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(MIREL_CACHE);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match(event.request)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  /* JS/CSS/manifestはネット優先。失敗時だけキャッシュ */
  event.respondWith((async () => {
    try {
      const fresh = await fetch(event.request, { cache: 'no-store' });
      const cache = await caches.open(MIREL_CACHE);
      cache.put(event.request, fresh.clone());
      return fresh;
    } catch (e) {
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});

