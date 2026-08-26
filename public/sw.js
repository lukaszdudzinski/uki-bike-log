const CACHE_NAME = 'ukis-bikelog-v2026.8.26.5';

// Core assets to pre-cache
const CORE_ASSETS = [
    '/uki-bike-log/',
    '/uki-bike-log/index.html',
    '/uki-bike-log/favicon-32x32.png',
    '/uki-bike-log/logo.png',
    '/uki-bike-log/pwa-updater.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(CORE_ASSETS.map(url => fetch(new Request(url + '?_t=' + Date.now(), { cache: 'no-store' })).then(r => { if(!r.ok) throw new Error('Fetch failed'); return cache.put(new Request(url), r); })));
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Take control of all clients immediately
});

self.addEventListener('fetch', (e) => {
    // Only cache http/https requests
    if (!e.request.url.startsWith('http')) {
        return;
    }
    
    // Nie cache'uj zapytań o changelog
    if (e.request.url.includes('changelog.json')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((response) => {
            if (response) {
                return response; // Hit cache
            }
            return fetch(e.request).then((fetchResponse) => {
                // Return if not valid
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                    return fetchResponse;
                }

                // Clone response to cache it dynamically
                const responseToCache = fetchResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });

                return fetchResponse;
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
        self.skipWaiting();
    }
});
