import { test, expect } from '@playwright/test';

test.describe('Navigation & Driving Mode', () => {
  test('has title, can navigate to routes and start driving mode', async ({ page }) => {
    await page.goto('/');

    // Expect title
    await expect(page).toHaveTitle(/Uki Bike Log/);

    // App is loading garage data... wait for main UI
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

    // Navigate to routes (Ulubione Trasy)
    // Actually the button says "Ulubione Trasy" inside Dashboard QuickActions
    await page.click('button:has-text("Ulubione Trasy")');

    // Verify map header is visible
    await expect(page.locator('h2:has-text("Radar Pogodowy")')).toBeVisible();

    // Navigate back to Dashboard
    await page.click('nav >> text=Pulpit');
    
    // Check if app version is visible
    await expect(page.locator('text=Uki Bike Log v')).toBeVisible();

    // Enter Driving Mode
    await page.click('button:has-text("Uruchom Tryb Jazdy")');

    // Verify Driving Mode UI
    await expect(page.locator('text=TRYB JAZDY')).toBeVisible();
    await expect(page.locator('text=Zakończ jazdę')).toBeVisible();

    // Exit Driving Mode
    await page.click('button:has-text("Zakończ jazdę")');
    await expect(page.locator('text=TRYB JAZDY')).not.toBeVisible();
  });
});
