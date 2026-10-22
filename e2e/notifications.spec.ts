import { test, expect, type Page } from '@playwright/test';

// Podstawiony systemowy Notification (bez service workera w testach Bike Log używa `new Notification`).
// Nowa instalacja ma domyślnie OC za 14 dni, więc przy domyślnych ustawieniach wypada etap „lead”.
const stubNotifications = (page: Page, visibility: 'visible' | 'hidden' = 'visible') =>
  page.addInitScript((vis) => {
    const shown: Array<{ title: string; body?: string; tag?: string; icon?: string }> = [];
    (window as unknown as { __shown: typeof shown }).__shown = shown;
    class FakeNotification {
      static permission = 'granted';
      static requestPermission = async () => 'granted';
      constructor(title: string, options: { body?: string; tag?: string; icon?: string } = {}) {
        shown.push({ title, ...options });
      }
    }
    Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
    if (vis === 'hidden') {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    }
  }, visibility);

const shown = (page: Page) =>
  page.evaluate(() => (window as unknown as { __shown: Array<{ title: string; body?: string; tag?: string; icon?: string }> }).__shown);

const openApp = async (page: Page) => {
  await page.goto('/uki-bike-log/');
  await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });
};

const reopen = async (page: Page) => {
  await page.reload();
  await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);
};

const isoInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Zapisuje datę OC (za 14 dni) i ubezpieczyciela przez ekran ustawień pojazdu
const saveOcIn14Days = async (page: Page) => {
  await page.click('nav >> text=Opcje');
  const field = (label: RegExp) =>
    page.locator('.input-group', { has: page.locator('label', { hasText: label }) }).locator('input');
  await field(/^Wygasa ubezpieczenie OC$/).fill(isoInDays(14));
  await field(/^Ubezpieczyciel$/).fill('PZU');
  page.once('dialog', dialog => dialog.accept());
  await page.click('button:has-text("Zapisz Ustawienia")');
  await page.click('nav >> text=Pulpit');
};

test.describe('Powiadomienia Bike Log', () => {
  test('Bike Log w tle (np. przeładowany przy otwarciu innej aplikacji UKIS) nie wysyła powiadomień', async ({ page }) => {
    await stubNotifications(page, 'hidden');
    await openApp(page);
    await saveOcIn14Days(page);
    await reopen(page);
    expect(await shown(page)).toEqual([]);
  });

  test('pierwsze otwarcie: jedno powiadomienie z treścią; ponowne otwarcie tego samego dnia: żadnego', async ({ page }) => {
    await stubNotifications(page);
    await openApp(page);
    await saveOcIn14Days(page);
    await page.reload();
    await expect.poll(async () => (await shown(page)).length).toBe(1);
    const [n] = await shown(page);
    expect(n.title).toBe('🛡️ OC wygasa za 14 dni');
    expect(n.body).toMatch(/^Royal Enfield Bullet 350: polisa OC \(PZU\) jest ważna do \d{1,2}\.\d{1,2}\.\d{4}\. Odnów ją na czas, żeby jeździć legalnie\.$/);
    expect(n.icon).toBe('/uki-bike-log/pwa-192x192.png');
    expect(n.tag).toMatch(/^default:oc:\d{4}-\d{2}-\d{2}$/);

    await reopen(page);
    expect(await shown(page)).toEqual([]);
  });

  test('krótsze wyprzedzenie wstrzymuje przypomnienie; ustawienia i interwał łańcucha zapisują się po przeładowaniu', async ({ page }) => {
    await stubNotifications(page);
    await page.addInitScript(() => {
      if (!localStorage.getItem('ukis.bike-log.notifications.prefs')) {
        localStorage.setItem('ukis.bike-log.notifications.prefs', JSON.stringify({ leadDays: 7, enabled: { oc: true, ac: true, inspection: true, chain: true } }));
      }
    });
    await openApp(page);
    await saveOcIn14Days(page);
    await reopen(page);
    expect(await shown(page)).toEqual([]); // OC za 14 dni, a przypominamy 7 dni wcześniej

    await page.click('nav >> text=Opcje');
    const lead = page.getByLabel('Przypomnij o OC, AC i przeglądzie');
    await expect(lead).toHaveValue('7');
    await lead.selectOption('30');
    await page.getByLabel('Ubezpieczenie AC').uncheck();
    await page.getByLabel('Smarowanie łańcucha co (km)').fill('800');
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Zapisz Ustawienia")');
    await page.click('nav >> text=Pulpit');
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible();

    await page.reload();
    await page.click('nav >> text=Opcje');
    await expect(page.getByLabel('Przypomnij o OC, AC i przeglądzie')).toHaveValue('30');
    await expect(page.getByLabel('Ubezpieczenie AC')).not.toBeChecked();
    await expect(page.getByLabel('Ubezpieczenie OC')).toBeChecked();
    await expect(page.getByLabel('Smarowanie łańcucha co (km)')).toHaveValue('800');
  });
});
