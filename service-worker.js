// Bump version to invalidate old cached assets (JS/HTML changes)
const CACHE_NAME = 'learnop-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './cross.html',
  './f2l_entry.html',
  './f2l.html',
  './oll.html',
  './pll.html',
  './scanner.html',
  './solver_demo.html',
  './solver.html',
  './test_solver.html',
  './timer.html',
  './css/styles.css',
  './css/loader.css',
  './js/site.js',
  './js/cross.js',
  './js/f2l_entry.js',
  './js/f2l-animation.js',
  './js/f2l.js',
  './js/min2phase.js',
  './js/oll.js',
  './js/pll.js',
  './js/rubiks-cube-solver.js',
  './js/scanner.js',
  './js/solver.js',
  './js/timer.js',
  './data/f2l_cases.json',
  './data/oll_cases.json',
  './data/pll_cases.json',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
