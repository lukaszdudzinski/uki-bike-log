import { test, expect } from '@playwright/test';

test('manifest PWA jest podlinkowany, poprawny i zgodny z dotychczasowymi instalacjami', async ({ page }) => {
  await page.goto('/uki-bike-log/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/uki-bike-log/manifest.webmanifest');
  const manifestUrl = new URL(href!, page.url()).href;
  const res = await page.request.get(manifestUrl);
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({
    name: "Uki's Bike Log",
    short_name: 'Bike Log',
    start_url: './',
    scope: '/uki-bike-log/',
    display: 'standalone',
    theme_color: '#050505',
    background_color: '#050505',
    lang: 'pl',
  });
  expect(m.id).toBeUndefined();
  expect(new URL(m.start_url, manifestUrl).pathname).toBe('/uki-bike-log/');
  expect(m.icons).toEqual([
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ]);
  for (const i of m.icons) {
    expect((await page.request.get(new URL(i.src, manifestUrl).href)).status()).toBe(200);
  }
  const cdp = await page.context().newCDPSession(page);
  const parsed = await cdp.send('Page.getAppManifest');
  expect(parsed.url).toBe(manifestUrl);
  expect(parsed.errors).toEqual([]);
});
