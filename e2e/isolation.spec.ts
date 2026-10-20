import { test, expect } from '@playwright/test';

// Aplikacja żyje w domenie współdzielonej z innymi aplikacjami UKIS: czyszczenie
// w Diagnostyce nie może ruszać ich service workerów, cache ani localStorage.
const OWN_KEYS = { weatherLastLat: '52.23', weatherLastLon: '21.01', lastNotificationCheck: '2026-10-19' };
const NEIGHBOUR_KEYS = {
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
const NEIGHBOUR_CACHES = [
  'ukis-bodybuild-v1',
  'ukis-dive-tools-v1',
  'ssi-standards-trainer-v1',
  'workbox-precache-v2-https://lukaszdudzinski.github.io/Ukis-BodyBuild/',
];

test.describe('Izolacja danych Bike Log w Diagnostyce', () => {
  test('Twardy reset wyrejestrowuje tylko własny SW i czyści tylko własne cache', async ({ page }) => {
    await page.goto('/uki-bike-log/#/diagnostics');
    await expect(page.getByRole('heading', { name: 'Diagnostyka Systemu' })).toBeVisible({ timeout: 10000 });

    // page.evaluate, a nie addInitScript: ten zasiałby dane ponownie po przeładowaniu.
    await page.evaluate(
      async ({ own, neighbour, neighbourCaches }) => {
        const activated = async (reg: ServiceWorkerRegistration) => {
          const sw = reg.installing ?? reg.waiting ?? reg.active;
          if (!sw || sw.state === 'activated') return;
          await new Promise<void>(resolve => {
            sw.addEventListener('statechange', () => {
              if (sw.state === 'activated') resolve();
            });
          });
        };
        const ownReg = await navigator.serviceWorker.register('/uki-bike-log/sw.js');
        const neighbourReg = await navigator.serviceWorker.register('/uki-bike-log/sw.js', {
          scope: '/uki-bike-log/neighbor-test/',
        });
        await activated(ownReg);
        await activated(neighbourReg);
        for (const name of [...neighbourCaches, 'ukis-bikelog-v2026.1.1.1']) await caches.open(name);
        for (const [k, v] of Object.entries({ ...own, ...neighbour })) localStorage.setItem(k, v);
      },
      { own: OWN_KEYS, neighbour: NEIGHBOUR_KEYS, neighbourCaches: NEIGHBOUR_CACHES },
    );

    const dialogs: string[] = [];
    page.on('dialog', d => {
      dialogs.push(d.message());
      void d.accept();
    });
    const reloaded = page.waitForEvent('load');
    await page.getByRole('button', { name: /WYKONAJ TWARDY RESET/ }).click();
    await reloaded;

    const state = await page.evaluate(async () => ({
      scopes: (await navigator.serviceWorker.getRegistrations()).map(r => r.scope),
      caches: (await caches.keys()).sort(),
      ls: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])),
    }));
    expect(state.scopes).toEqual([new URL('/uki-bike-log/neighbor-test/', page.url()).href]);
    expect(state.caches).toEqual([...NEIGHBOUR_CACHES].sort());
    expect(state.ls).toMatchObject({ ...OWN_KEYS, ...NEIGHBOUR_KEYS }); // twardy reset nie dotyka localStorage
    expect(dialogs[0]).toContain('Twardy Reset');
    expect(dialogs[0]).not.toContain('\\n'); // napis „\n” w dawnym confirm
  });

  test('Wyczyść tylko LocalStorage usuwa wyłącznie klucze Bike Log', async ({ page }) => {
    await page.route('https://api.open-meteo.com/**', r => r.abort()); // pogoda z zasianych współrzędnych
    await page.goto('/uki-bike-log/#/diagnostics');
    await expect(page.getByRole('heading', { name: 'Diagnostyka Systemu' })).toBeVisible({ timeout: 10000 });

    await page.evaluate(
      async ({ own, neighbour, neighbourCaches }) => {
        for (const [k, v] of Object.entries({ ...own, ...neighbour })) localStorage.setItem(k, v);
        for (const name of neighbourCaches) await caches.open(name);
      },
      { own: OWN_KEYS, neighbour: NEIGHBOUR_KEYS, neighbourCaches: NEIGHBOUR_CACHES },
    );

    const dialogs: string[] = [];
    page.on('dialog', d => {
      dialogs.push(d.message());
      void d.accept();
    });
    const reloaded = page.waitForEvent('load');
    await page.getByRole('button', { name: 'Wyczyść tylko LocalStorage' }).click();
    await reloaded;

    const ls = await page.evaluate(() =>
      Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])),
    );
    for (const k of Object.keys(OWN_KEYS)) expect(ls[k]).toBeUndefined();
    expect(ls).toMatchObject(NEIGHBOUR_KEYS);
    expect((await page.evaluate(() => caches.keys())).sort()).toEqual([...NEIGHBOUR_CACHES].sort());
    expect(dialogs[0]).toContain('lokalizację pogody');
    expect(dialogs[0]).toContain('innych aplikacji UKIS');
  });
});
