import { test, expect } from '@playwright/test';

test('has title and can navigate', async ({ page }) => {
  await page.goto('/');

  // Expect title
  await expect(page).toHaveTitle(/Uki Bike Log/);

  // App is loading garage data... wait for main UI
  await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

  // Navigate to routes
  await page.click('button:has-text("Ulubione Trasy")');

  // Verify map header is visible
  await expect(page.locator('h2:has-text("Radar Pogodowy")')).toBeVisible();
});
