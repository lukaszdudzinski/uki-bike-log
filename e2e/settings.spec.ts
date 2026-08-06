import { test, expect } from '@playwright/test';

test.describe('Settings & SOS Panel', () => {
  test('should save insurance data and display SOS panel on Dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

    // Navigate to Settings
    await page.click('nav >> text=Opcje');

    // Fill Insurance Details
    await page.fill('input#settings-ins-cost', '450.50');
    await page.fill('input#settings-ins-name', 'PZU E2E');
    await page.fill('input#settings-ins-policy', 'POL-123456');
    await page.fill('input#settings-ins-hotline', '112233445');
    
    // Save Settings
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Zapisz Ustawienia")');

    // Navigate back to Dashboard
    await page.click('nav >> text=Pulpit');

    // Check if SOS Panel exists and is visible
    await expect(page.locator('h3:has-text("AWARIA / ASSISTANCE")')).toBeVisible();
    await expect(page.locator('text=PZU E2E')).toBeVisible();
    await expect(page.locator('text=POL-123456')).toBeVisible();
    await expect(page.locator('text=112233445')).toBeVisible();
    
    // Check TCO on Stats page
    await page.click('nav >> text=Statystyki');
    
    // Insurance cost is 450.50, so TCO should display it
    await expect(page.locator('text=450.50 PLN')).toBeVisible();
  });
});
