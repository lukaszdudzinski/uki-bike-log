import { test, expect } from '@playwright/test';

test.describe('Fuel Log', () => {
  test('should allow adding, editing and deleting a fuel entry', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

    // Navigate to Fuel tab
    await page.click('nav >> text=Paliwo');
    
    // Add Fuel Entry
    await page.fill('input[placeholder="np. 15000"]', '15000');
    await page.fill('input[placeholder="np. 12.5"]', '12.5');
    await page.fill('input[placeholder="0.00"]', '75.50');
    await page.click('button:has-text("Zapisz tankowanie")');

    // Wait for alert and close it (browser native alert)
    // Actually Playwright auto-dismisses dialogs, but it's good to handle it if needed
    // In our app it uses window.alert, which Playwright auto-dismisses by default

    // Verify entry is added in history
    await expect(page.locator('h4:has-text("12.5")')).toBeVisible();
    await expect(page.locator('p:has-text("75.50 PLN")')).toBeVisible();
    
    // Edit Fuel Entry
    await page.click('button[title="Edytuj"]');
    
    // Edit form appears, modify liters
    const litersInput = page.locator('input[placeholder="np. 12.5"]').last();
    await litersInput.fill('13.0');
    
    await page.click('button:has-text("Zapisz zmiany")');
    
    // Verify changes
    await expect(page.locator('h4:has-text("13")')).toBeVisible();

    // Delete Fuel Entry
    page.once('dialog', dialog => dialog.accept()); // handle confirmation
    await page.click('button[title="Usuń"]');

    // Verify deletion
    await expect(page.locator('h4:has-text("13")')).not.toBeVisible();
  });
});
