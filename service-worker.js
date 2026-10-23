/* SmartFrota PWA — cache somente da interface estática; nunca armazena respostas de API ou dados pessoais. */
const CACHE_PREFIX = 'smartfrota-pwa-';
const CACHE_VERSION = 'v2';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok && response.type !== 'opaque') await cache.put(path, response);
      } catch (_) {
        // Uma falha de rede durante a instalação não deve bloquear a instalação do worker.
      }
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
  // Não interceptar Supabase, autenticação, endpoints REST, nem conteúdo de outras origens.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') || url.pathname.includes('/functions/v1/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) ||
          (await cache.match('./index.html')) ||
          (await cache.match('./')) ||
          new Response('SmartFrota está sem conexão. Conecte-se à internet para continuar.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  // Cache-first apenas para os arquivos estáticos do app; atualiza em segundo plano quando online.
  if (APP_SHELL.some(path => new URL(path, self.registration.scope).href === url.href)) {
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
