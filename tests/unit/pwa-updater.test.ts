// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const OWN = 'https://lukaszdudzinski.github.io/uki-bike-log/';
const NEIGHBOURS = [
  'ukis-bodybuild-v1',
  'ukis-dive-tools-v1',
  'ssi-standards-trainer-v1',
  'workbox-precache-v2-https://lukaszdudzinski.github.io/Ukis-BodyBuild/',
];

const source = readFileSync('public/pwa-updater.js', 'utf8');

type Registration = { scope: string; unregister: () => Promise<boolean> };
type PendingWorker = { postMessage: (msg: string) => void };
type PwaApi = {
  OWN_SCOPE: string;
  isOwnCache(key: string): boolean;
  clearOwnCaches(): Promise<void>;
  unregisterOwnServiceWorker(): Promise<boolean>;
  PWAUpdater: {
    _pendingWorker: PendingWorker | null;
    doUpdate(): void;
  };
};

let store: Set<string>;
let registration: Registration | null;

function load() {
  const location = { href: OWN, reload: vi.fn() };
  const navigator = {
    serviceWorker: {
      getRegistration: vi.fn<(scope: string) => Promise<Registration | null>>(async () => registration),
      getRegistrations: vi.fn(),
    },
  };
  const caches = {
    keys: async () => [...store],
    delete: async (name: string) => store.delete(name),
    open: async () => ({ put: vi.fn(), addAll: vi.fn() }),
  };
  const document = {
    readyState: 'loading',
    addEventListener: vi.fn(),
    getElementById: () => null,
    querySelector: () => null,
  };
  const ctx: Record<string, unknown> = {
    location,
    navigator,
    caches,
    document,
    setTimeout: (fn: () => void) => {
      fn();
      return 0;
    },
    URL,
    console,
  };
  ctx.window = ctx;
  runInContext(source, createContext(ctx));
  return {
    ctx: { location, navigator },
    api: ctx.__ukisBikeLogPwa as PwaApi,
  };
}

describe('public/pwa-updater.js', () => {
  beforeEach(() => {
    store = new Set([
      ...NEIGHBOURS,
      'ukis-bikelog-v2026.10.2.1',
      `workbox-precache-v2-${OWN}`,
    ]);
    registration = null;
  });

  it('isOwnCache: ukis-bikelog-* i workbox-* z własnym zakresem są własne, cudze nie', () => {
    const { api } = load();
    expect(
      ['ukis-bikelog-v2026.10.2.1', `workbox-precache-v2-${OWN}`].every((k) => api.isOwnCache(k)),
    ).toBe(true);
    expect(
      [
        'ukis-bodybuild-v1',
        'ukis-dive-tools-v1',
        'ssi-standards-trainer-v1',
        'workbox-precache-v2-https://lukaszdudzinski.github.io/Ukis-BodyBuild/',
      ].some((k) => api.isOwnCache(k)),
    ).toBe(false);
  });

  it('doUpdate bez czekającego SW: wyrejestrowuje tylko własną rejestrację i kasuje tylko własne cache', async () => {
    const reg = { scope: OWN, unregister: vi.fn(async () => true) };
    registration = reg;
    const { ctx, api } = load();
    api.PWAUpdater.doUpdate();
    await vi.waitFor(() => expect(ctx.location.reload).toHaveBeenCalled());
    expect(ctx.navigator.serviceWorker.getRegistration).toHaveBeenCalledWith(OWN);
    expect(reg.unregister).toHaveBeenCalledTimes(1);
    expect(ctx.navigator.serviceWorker.getRegistrations).not.toHaveBeenCalled();
    expect([...store].sort()).toEqual(NEIGHBOURS.slice().sort());
  });

  it('doUpdate: rejestracja o krótszym zakresie zwrócona przez getRegistration zostaje', async () => {
    const reg = { scope: 'https://lukaszdudzinski.github.io/', unregister: vi.fn(async () => true) };
    registration = reg;
    const { ctx, api } = load();
    api.PWAUpdater.doUpdate();
    await vi.waitFor(() => expect(ctx.location.reload).toHaveBeenCalled());
    expect(reg.unregister).not.toHaveBeenCalled();
  });

  it('doUpdate z czekającym SW: SKIP_WAITING, tylko własne cache, bez wyrejestrowania', async () => {
    const { ctx, api } = load();
    const worker = { postMessage: vi.fn() };
    api.PWAUpdater._pendingWorker = worker;
    api.PWAUpdater.doUpdate();
    await vi.waitFor(() => expect(ctx.location.reload).toHaveBeenCalled());
    expect(worker.postMessage).toHaveBeenCalledWith('SKIP_WAITING');
    expect(ctx.navigator.serviceWorker.getRegistration).not.toHaveBeenCalled();
    expect([...store].sort()).toEqual(NEIGHBOURS.slice().sort());
  });
});
