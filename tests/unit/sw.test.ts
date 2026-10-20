// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const OWN_SCOPE = 'https://lukaszdudzinski.github.io/uki-bike-log/';
const NEIGHBOURS = [
  'ukis-bodybuild-v1',
  'ukis-dive-tools-v1',
  'ssi-standards-trainer-v1',
  'workbox-precache-v2-https://lukaszdudzinski.github.io/Ukis-BodyBuild/',
];

const swSource = readFileSync('public/sw.js', 'utf8');
const CACHE_NAME = /const CACHE_NAME = '([^']+)'/.exec(swSource)?.[1] ?? '';

type ExtendableEvent = { waitUntil(p: Promise<unknown>): void };
type Handlers = Record<string, (e: ExtendableEvent) => void>;

let store: Set<string>;
let handlers: Handlers;

function loadServiceWorker() {
  handlers = {};
  const self = {
    registration: { scope: OWN_SCOPE },
    addEventListener: (type: string, h: (e: ExtendableEvent) => void) => {
      handlers[type] = h;
    },
    skipWaiting: vi.fn(),
  };
  const caches = {
    keys: async () => [...store],
    delete: async (name: string) => store.delete(name),
    open: async () => ({ put: vi.fn(), addAll: vi.fn() }),
  };
  const context = createContext({
    self,
    caches,
    clients: {},
    fetch: vi.fn(),
    Request,
    console,
  });
  runInContext(swSource, context);
}

describe('public/sw.js', () => {
  beforeEach(() => {
    store = new Set([
      ...NEIGHBOURS,
      CACHE_NAME,
      'ukis-bikelog-v2026.9.28.5',
      `workbox-precache-v2-${OWN_SCOPE}`,
      `workbox-runtime-${OWN_SCOPE}`,
    ]);
    loadServiceWorker();
  });

  it('activate: usuwa stare własne cache (ukis-bikelog-*, workbox-* z własnym zakresem), zostawia cudze i bieżący', async () => {
    let done!: Promise<unknown>;
    handlers.activate({
      waitUntil: (p: Promise<unknown>) => {
        done = p;
      },
    });
    await done;
    expect([...store].sort()).toEqual([...NEIGHBOURS, CACHE_NAME].sort());
  });

  it('CACHE_NAME jest literałem z własnym prefiksem (wymóg scripts/version.mjs)', () => {
    expect(CACHE_NAME).toMatch(/^ukis-bikelog-v[\d.]+$/);
    expect(swSource).toMatch(/^const CACHE_NAME = 'ukis-bikelog-v[\d.]+';$/m);
    expect(swSource).toContain("const CACHE_PREFIX = 'ukis-bikelog-';");
  });
});
