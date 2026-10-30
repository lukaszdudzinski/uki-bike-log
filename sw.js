const CACHE_NAME = 'ukis-bikelog-v2026.10.30.1';
const CACHE_PREFIX = 'ukis-bikelog-';
// Tylko cache Bike Log. Domena lukaszdudzinski.github.io jest wspólna dla rodziny UKIS (R1).
function isOwnCache(key) {
    return key.indexOf(CACHE_PREFIX) === 0 ||
        (key.indexOf('workbox-') === 0 && key.endsWith('-' + self.registration.scope));
}

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
                if (key !== CACHE_NAME && isOwnCache(key)) {
                    return caches.delete(key);
                }
            }));
        })
    );
    // NIE wywołujemy self.clients.claim() - nowy SW ma czekać na sygnał
    // od użytkownika (przycisk Zaktualizuj), a nie przejmować kontrolę samoczynnie!
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

// Dotknięcie powiadomienia Bike Log: pokaż otwarty Bike Log albo otwórz go na właściwym pojeździe
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL((event.notification.data && event.notification.data.url) || '/uki-bike-log/', self.location.origin).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const own = windows.find((w) => w.url.indexOf(self.registration.scope) === 0);
            if (own) {
                return own.navigate(target).then((w) => (w || own).focus()).catch(() => own.focus());
            }
            return self.clients.openWindow(target);
        })
    );
});

// ---- Powiadomienia w tle (Web Push) ----
// Serwer wysyła tylko `{ v, appId, id }`; treść przypomnienia leży w IndexedDB na telefonie.
// WAŻNE: schemat bazy musi być zgodny z src/utils/pushStore.ts (SW nie może importować modułów):
//   baza ukis.bike-log.push, wersja 1;
//   outbox: keyPath 'id'  -> { id, reminderId, stage, bikeId, sendAt, title, body };
//   sent:   keyPath 'key' -> { key: reminderId + '|' + stage, reminderId, stage }.
const PUSH_DB_NAME = 'ukis.bike-log.push';
const PUSH_DB_VERSION = 1;
const PUSH_ICON = '/uki-bike-log/pwa-192x192.png';
const PUSH_GENERIC_TAG = 'ukis-bikelog-push';

function openPushDb() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(PUSH_DB_NAME, PUSH_DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('sent')) db.createObjectStore('sent', { keyPath: 'key' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
            request.onblocked = () => reject(new Error('IndexedDB open blocked'));
        } catch (err) {
            reject(err);
        }
    });
}

// Czyta wpis skrzynki nadawczej i informację, czy jego para jest już w rejestrze `sent`.
function readPushEntry(id) {
    return openPushDb().then((db) => new Promise((resolve, reject) => {
        let entry;
        let alreadySent = false;
        const tx = db.transaction(['outbox', 'sent'], 'readonly');
        const get = tx.objectStore('outbox').get(id);
        get.onsuccess = () => {
            entry = get.result;
            if (entry) {
                const check = tx.objectStore('sent').get(entry.reminderId + '|' + entry.stage);
                check.onsuccess = () => { alreadySent = !!check.result; };
            }
        };
        tx.oncomplete = () => { db.close(); resolve({ entry, alreadySent }); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB read failed')); };
    }));
}

function markPushSent(entry) {
    return openPushDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(['sent'], 'readwrite');
        tx.objectStore('sent').put({ key: entry.reminderId + '|' + entry.stage, reminderId: entry.reminderId, stage: entry.stage });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB write failed')); };
    }));
}

function showGenericPush() {
    return self.registration.showNotification('Bike Log', {
        body: 'Masz przypomnienie w Bike Log',
        tag: PUSH_GENERIC_TAG,
        icon: PUSH_ICON,
        badge: PUSH_ICON,
        data: { url: '/uki-bike-log/#/' }
    });
}

function handlePush(id) {
    // Błąd IndexedDB nie może zostawić pusha bez powiadomienia (iOS wymaga powiadomienia na każdy push)
    const lookup = typeof id === 'string' ? readPushEntry(id).catch(() => null) : Promise.resolve(null);
    return lookup.then((found) => {
        if (!found || !found.entry) return showGenericPush();
        const entry = found.entry;
        const data = { url: '/uki-bike-log/?bike=' + encodeURIComponent(entry.bikeId) + '#/' };
        // Ten sam tag co lokalne powiadomienie: system podmienia duplikat zamiast pokazywać drugi raz
        if (found.alreadySent) {
            return self.registration.showNotification(entry.title, {
                tag: entry.reminderId, silent: true, renotify: false, body: entry.body, icon: PUSH_ICON, badge: PUSH_ICON, data: data
            });
        }
        return self.registration.showNotification(entry.title, {
            body: entry.body, icon: PUSH_ICON, badge: PUSH_ICON, tag: entry.reminderId, data: data
        }).then(() => markPushSent(entry).catch(() => undefined));
    });
}

self.addEventListener('push', (event) => {
    let payload = null;
    try {
        payload = event.data ? event.data.json() : null;
    } catch (err) {
        payload = null;
    }
    // Brak danych, zły JSON albo cudzy appId: bez powiadomienia
    if (!payload || typeof payload !== 'object' || payload.appId !== 'bike-log') return;
    event.waitUntil(handlePush(payload.id));
});
