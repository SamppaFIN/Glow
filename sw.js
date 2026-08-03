// Glow — Service Worker (offline-first)
const CACHE = 'glow-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/js/main.js',
  '/js/engine/game.js',
  '/js/engine/geometry.js',
  '/js/engine/particles.js',
  '/js/engine/input.js',
  '/js/engine/shapes.js',
  '/js/engine/meter.js',
  '/js/engine/patterns.js',
  '/js/engine/taboo.js',
  '/js/engine/index.js',
  '/js/audio/audio.js',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
