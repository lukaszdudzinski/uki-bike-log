// Reguły izolacji Bike Log w domenie współdzielonej z innymi aplikacjami UKIS (R2/R3).
// Muszą być zgodne z public/sw.js oraz public/pwa-updater.js (ta sama reguła isOwnCache).

/** Zgodne z `base` w vite.config.ts i BASE w public/pwa-updater.js. */
export const APP_BASE_PATH = '/uki-bike-log/';

/** Prefiks własnych cache; patrz CACHE_NAME w public/sw.js. */
export const OWN_CACHE_PREFIX = 'ukis-bikelog-';

// Lista jawna (R3), nie wzorzec. Celowo NIE zawiera i nigdy nie usuwamy:
// - `uki_error_logs`, `userNick`, `uki-avatar`, `uki-custom-wallpaper`, `theme`
//   (współdzielone w rodzinie UKIS),
// - `kvvfs-*` oraz `UkiBikeLog/*` (dane bazy w trybie awaryjnym localforage),
// - starych kluczy migracji z `storage.ts` (dane użytkownika).
export const APP_LOCAL_STORAGE_KEYS: readonly string[] = [
  'weatherLastLat',
  'weatherLastLon',
  'lastNotificationCheck',
];

/** Zakres service workera Bike Log, np. https://host/uki-bike-log/. */
export function getOwnScope(): string {
  return new URL(APP_BASE_PATH, window.location.href).href;
}

/** Własne to: `ukis-bikelog-*` oraz stare cache Workboxa z sufiksem `-<zakres>`. */
export function isOwnCache(cacheName: string, scope: string = getOwnScope()): boolean {
  return (
    cacheName.startsWith(OWN_CACHE_PREFIX) ||
    (cacheName.startsWith('workbox-') && cacheName.endsWith(`-${scope}`))
  );
}

/** Usuwa wyłącznie własne cache; zwraca nazwy faktycznie usuniętych. */
export async function clearOwnCaches(): Promise<string[]> {
  if (typeof caches === 'undefined') return [];
  const scope = getOwnScope();
  const own = (await caches.keys()).filter(key => isOwnCache(key, scope));
  const results = await Promise.all(own.map(async key => ((await caches.delete(key)) ? key : null)));
  return results.filter((key): key is string => key !== null);
}

/** Wyrejestrowuje SW tylko gdy jego zakres jest dokładnie własny; nigdy `getRegistrations()`. */
export async function unregisterOwnServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const scope = getOwnScope();
  // getRegistration(url) zwraca rejestrację o najdłuższym pasującym zakresie, także krótszym niż nasz.
  const reg = await navigator.serviceWorker.getRegistration(scope);
  if (!reg || reg.scope !== scope) return false;
  return reg.unregister();
}

/** Usuwa tylko klucze z APP_LOCAL_STORAGE_KEYS; zwraca te, które istniały. */
export function clearAppLocalStorage(store: Storage = localStorage): string[] {
  const removed: string[] = [];
  for (const key of APP_LOCAL_STORAGE_KEYS) {
    if (store.getItem(key) !== null) {
      store.removeItem(key);
      removed.push(key);
    }
  }
  return removed;
}
