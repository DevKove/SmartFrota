/* SmartFrota PWA — cache apenas da interface estática; nunca armazena respostas de API ou dados pessoais. */
const CACHE_PREFIX = 'smartfrota-pwa-';
const CACHE_VERSION = 'v13';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const BASE_PATH = new URL('/SmartFrota/', self.location.origin);
const APP_SHELL = [
  BASE_PATH.href,
  new URL('index.html', BASE_PATH).href,
  new URL('manifest.webmanifest', BASE_PATH).href,
  new URL('icons/icon-192.png', BASE_PATH).href,
  new URL('icons/icon-512.png', BASE_PATH).href
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok && response.type !== 'opaque') await cache.put(url, response);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') || url.pathname.includes('/functions/v1/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new URL('index.html', BASE_PATH).href, response.clone());
        }
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request.url)) ||
          (await cache.match(new URL('index.html', BASE_PATH).href)) ||
          (await cache.match(BASE_PATH.href)) ||
          new Response('SmartFrota está sem conexão. Conecte-se à internet para continuar.', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  if (APP_SHELL.includes(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request).then(response => {
        if (response.ok && response.type !== 'opaque') cache.put(request, response.clone());
        return response;
      }).catch(() => null);
      return cached || await network || new Response('', { status: 503 });
    })());
  }
});
