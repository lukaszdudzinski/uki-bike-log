import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APP_LOCAL_STORAGE_KEYS,
  clearAppLocalStorage,
  clearOwnCaches,
  getOwnScope,
  isOwnCache,
  unregisterOwnServiceWorker,
} from './appIsolation';

const SCOPE = 'http://localhost:3000/uki-bike-log/';

// Klucze sąsiadów z rodziny UKIS oraz dane Bike Log, których nie wolno usuwać.
const NEIGHBOUR_KEYS: Record<string, string> = {
  ssi_stats_history: '[1,2,3]',
  'uki-pro-unlocked': 'true',
  'kvvfs-local-x': 'db',
  userNick: 'Uki',
  'uki-avatar': 'data:image/png;base64,AAAA',
  'uki-custom-wallpaper': 'data:image/png;base64,BBBB',
  theme: 'dark',
  uki_error_logs: '[]',
  'UkiBikeLog/logs/uki_bikes_list': '[]',
  uki_fuel_logs: '[]',
};

interface FakeRegistration {
  scope: string;
  unregister: ReturnType<typeof vi.fn>;
}

function stubCaches(initial: string[]) {
  const store = new Set(initial);
  const fake = {
    keys: vi.fn(async () => [...store]),
    delete: vi.fn(async (name: string) => store.delete(name)),
  };
  vi.stubGlobal('caches', fake);
  return { store, fake };
}

function stubServiceWorker(reg: FakeRegistration | undefined) {
  const fakeSw = {
    getRegistration: vi.fn(async () => reg),
    getRegistrations: vi.fn(async () => (reg ? [reg] : [])),
  };
  Object.defineProperty(window.navigator, 'serviceWorker', { value: fakeSw, configurable: true });
  return fakeSw;
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  vi.unstubAllGlobals();
  // To atrapa jsdom, a nie przeglądarka: sprzątamy ręcznie.
  localStorage.clear();
  Reflect.deleteProperty(window.navigator, 'serviceWorker');
});

describe('appIsolation', () => {
  it('getOwnScope zwraca katalog aplikacji niezależnie od bieżącej ścieżki', () => {
    window.history.pushState({}, '', '/uki-bike-log/index.html#/diagnostics');
    expect(getOwnScope()).toBe(SCOPE);
  });

  it('isOwnCache rozpoznaje tylko cache Bike Log', () => {
    for (const n of ['ukis-bikelog-v2026.10.2.1', `workbox-precache-v2-${SCOPE}`, `workbox-runtime-${SCOPE}`]) {
      expect(isOwnCache(n, SCOPE)).toBe(true);
    }
    for (const n of [
      'ukis-bodybuild-v1',
      'ukis-dive-tools-v1',
      'ssi-standards-trainer-v1',
      'ukis-bikelog',
      'workbox-precache-v2-http://localhost:3000/Ukis-BodyBuild/',
    ]) {
      expect(isOwnCache(n, SCOPE)).toBe(false);
    }
  });

  it('clearOwnCaches usuwa tylko własne cache', async () => {
    const { store } = stubCaches([
      'ukis-bikelog-v1',
      `workbox-precache-v2-${SCOPE}`,
      'ssi-standards-trainer-v1',
      'ukis-bodybuild-v1',
      'ukis-dive-tools-v1',
    ]);
    expect((await clearOwnCaches()).sort()).toEqual(['ukis-bikelog-v1', `workbox-precache-v2-${SCOPE}`].sort());
    expect([...store].sort()).toEqual(['ssi-standards-trainer-v1', 'ukis-bodybuild-v1', 'ukis-dive-tools-v1']);
  });

  it('clearOwnCaches zwraca [] gdy brak Cache API', async () => {
    vi.stubGlobal('caches', undefined);
    expect(await clearOwnCaches()).toEqual([]);
  });

  it('unregisterOwnServiceWorker wyrejestrowuje rejestrację o własnym zakresie', async () => {
    const ownReg: FakeRegistration = { scope: SCOPE, unregister: vi.fn(async () => true) };
    const fakeSw = stubServiceWorker(ownReg);
    expect(await unregisterOwnServiceWorker()).toBe(true);
    expect(fakeSw.getRegistration).toHaveBeenCalledWith(SCOPE);
    expect(ownReg.unregister).toHaveBeenCalledTimes(1);
  });

  it('unregisterOwnServiceWorker nie rusza rejestracji o innym zakresie (np. "/")', async () => {
    const foreignReg: FakeRegistration = { scope: 'http://localhost:3000/', unregister: vi.fn(async () => true) };
    const fakeSw = stubServiceWorker(foreignReg);
    expect(await unregisterOwnServiceWorker()).toBe(false);
    expect(foreignReg.unregister).not.toHaveBeenCalled();
    expect(fakeSw.getRegistrations).not.toHaveBeenCalled();
  });

  it('unregisterOwnServiceWorker zwraca false gdy brak rejestracji lub brak SW', async () => {
    stubServiceWorker(undefined);
    expect(await unregisterOwnServiceWorker()).toBe(false);
    Reflect.deleteProperty(window.navigator, 'serviceWorker');
    expect(await unregisterOwnServiceWorker()).toBe(false);
  });

  it('clearAppLocalStorage usuwa wyłącznie klucze Bike Log', () => {
    for (const k of ['weatherLastLat', 'weatherLastLon', 'lastNotificationCheck']) localStorage.setItem(k, '1');
    for (const [k, v] of Object.entries(NEIGHBOUR_KEYS)) localStorage.setItem(k, v);
    expect(clearAppLocalStorage().sort()).toEqual(['lastNotificationCheck', 'weatherLastLat', 'weatherLastLon']);
    for (const [k, v] of Object.entries(NEIGHBOUR_KEYS)) expect(localStorage.getItem(k)).toBe(v);
    expect(localStorage.length).toBe(Object.keys(NEIGHBOUR_KEYS).length);
  });

  it('APP_LOCAL_STORAGE_KEYS nie zawiera kluczy współdzielonych, uprawnień, danych bazy ani starych danych', () => {
    for (const k of [
      'uki_error_logs',
      'userNick',
      'uki-avatar',
      'uki-custom-wallpaper',
      'theme',
      'uki_fuel_logs',
      'uki_service_logs',
      'uki_bike_settings',
      'uki_favorite_routes',
    ]) {
      expect(APP_LOCAL_STORAGE_KEYS).not.toContain(k);
    }
    expect(APP_LOCAL_STORAGE_KEYS.filter(k => /^(kvvfs-|UkiBikeLog\/)|pro|unlock|install|trial/i.test(k))).toEqual([]);
  });
});
