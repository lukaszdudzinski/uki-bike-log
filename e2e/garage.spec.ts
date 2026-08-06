import { test, expect } from '@playwright/test';

test.describe('Garage & Bike Management', () => {
  test('should allow adding a new bike, switching, and deleting it', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

    // Open Garage Options / Settings
    // The "Opcje" tab is in the nav bar at the bottom
    await page.click('nav >> text=Opcje');
    
    // Click "Garaż" tab inside Settings
    await page.click('button:has-text("Garaż")');

    // Click "Dodaj Motocykl"
    await page.click('button:has-text("Dodaj Motocykl")');

    // Fill form
    await page.fill('input[placeholder="np. Yamaha MT-07"]', 'E2E Test Bike');
    await page.fill('input[placeholder="np. 2024"]', '2024');
    
    // Save
    await page.click('button:has-text("Zapisz")');

    // Wait for it to appear in the list
    await expect(page.locator('h3:has-text("E2E Test Bike")')).toBeVisible();

    // The header select should now contain the new bike
    const select = page.locator('header select');
    // We cannot select by exact label if it is dynamic, but we can select by matching text
    // E2E Test Bike (2024)
    await select.selectOption({ label: 'E2E Test Bike (2024)' });

    // Delete the bike
    const bikeRow = page.locator('div.glass-panel', { hasText: 'E2E Test Bike' });
    
    // Setup dialog handler for the confirmation
    page.once('dialog', dialog => dialog.accept());
    
    await bikeRow.locator('button', { hasText: 'Usuń' }).click();

    // Verify it was deleted
    await expect(page.locator('h3:has-text("E2E Test Bike")')).not.toBeVisible();
  });
});
