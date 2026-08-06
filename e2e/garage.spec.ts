import { test, expect } from '@playwright/test';

test.describe('Garage & Bike Management', () => {
  test('should allow adding a new bike, switching, and deleting it', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

    // Navigate to Settings
    await page.click('nav >> text=Opcje');

    // Click "Dodaj pojazd"
    // In Settings we use prompt() for adding and editing bikes, so we need to handle dialogs
    
    // Handle the prompt for new bike name
    page.once('dialog', dialog => dialog.accept('E2E Test Bike'));
    await page.click('button:has-text("Dodaj pojazd")');

    // Wait for it to appear in the select dropdown in settings
    const select = page.locator('select').first();
    await expect(select).toContainText('E2E Test Bike');

    // Select the new bike
    await select.selectOption({ label: 'E2E Test Bike' });

    // The header select should also update, but since we are in Settings, we can just delete it now
    // Delete the bike
    
    // Handle the confirmation dialog
    page.once('dialog', dialog => dialog.accept());
    
    await page.click('button[title="Usuń pojazd"]');

    // Verify it was deleted (select shouldn't contain it)
    await expect(select).not.toContainText('E2E Test Bike');
  });
});
