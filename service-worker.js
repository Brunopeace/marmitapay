const CACHE_NAME = 'marmitapay-v8';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './javascript/scrip.js'
];

// Instala o service worker e faz o cache dos arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Intercepta requisições para servir os arquivos do cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
