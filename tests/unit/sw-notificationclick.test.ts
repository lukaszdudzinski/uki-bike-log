// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://lukaszdudzinski.github.io';
const OWN_SCOPE = `${ORIGIN}/uki-bike-log/`;
const swSource = readFileSync('public/sw.js', 'utf8');

type Win = { url: string; focus: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> };

function clickNotification(windows: Win[], data: unknown) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const clients = {
    matchAll: vi.fn(async () => windows),
    openWindow: vi.fn(async () => ({})),
    claim: vi.fn(),
  };
  const self = {
    registration: { scope: OWN_SCOPE },
    location: { origin: ORIGIN },
    clients,
    addEventListener: (type: string, h: (e: unknown) => void) => { handlers[type] = h; },
    skipWaiting: vi.fn(),
  };
  runInContext(swSource, createContext({ self, caches: {}, clients, fetch: vi.fn(), Request, URL, console }));
  let done: Promise<unknown> = Promise.resolve();
  const close = vi.fn();
  handlers.notificationclick({ notification: { data, close }, waitUntil: (p: Promise<unknown>) => { done = p; } });
  return { done, clients, close };
}

const win = (url: string): Win => {
  const w: Win = { url, focus: vi.fn(async () => w), navigate: vi.fn(async () => w) };
  return w;
};

describe('public/sw.js: notificationclick', () => {
  it('bez otwartego Bike Log otwiera nowe okno na adresie z powiadomienia', async () => {
    const neighbour = win(`${ORIGIN}/Ukis-BodyBuild/`);
    const { done, clients, close } = clickNotification([neighbour], { url: '/uki-bike-log/?bike=bike_1#/' });
    await done;
    expect(close).toHaveBeenCalled();
    expect(clients.openWindow).toHaveBeenCalledWith(`${OWN_SCOPE}?bike=bike_1#/`);
    expect(neighbour.navigate).not.toHaveBeenCalled(); // nigdy nie przejmuje okna innej aplikacji UKIS
  });

  it('otwarty Bike Log: przechodzi na adres i ustawia go na wierzchu', async () => {
    const own = win(`${OWN_SCOPE}#/stats`);
    const { done, clients } = clickNotification([own], { url: '/uki-bike-log/?bike=default#/' });
    await done;
    expect(own.navigate).toHaveBeenCalledWith(`${OWN_SCOPE}?bike=default#/`);
    expect(own.focus).toHaveBeenCalled();
    expect(clients.openWindow).not.toHaveBeenCalled();
  });

  it('bez danych w powiadomieniu otwiera stronę główną Bike Log', async () => {
    const { done, clients } = clickNotification([], undefined);
    await done;
    expect(clients.openWindow).toHaveBeenCalledWith(OWN_SCOPE);
  });
});
