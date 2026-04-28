// DIPDoc Service Worker — Enables offline support & installability
const CACHE_NAME = 'dipdoc-v2.0';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/simulator.js',
  '/js/ambient-glow.js',
  '/js/navigation.js',
  '/js/dashboard.js',
  '/js/shap-chart.js',
  '/js/gemini-advisor.js',
  '/js/cloud-sync.js',
  '/js/notifications.js',
  '/js/chatbot.js',
  '/js/risks.js',
  '/js/trends.js',
  '/js/medications.js',
  '/js/profile.js',
  '/js/app.js',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install — cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline — serve from cache
        return caches.match(event.request).then(cached => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});
