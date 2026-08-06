import { test, expect } from '@playwright/test';

test.describe('Fuel Log', () => {
  test('should allow adding, editing and deleting a fuel entry', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

    // Navigate to Fuel tab
    await page.click('nav >> text=Paliwo');
    
    // Add Fuel Entry
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('15000'); // ODO
    await numberInputs.nth(1).fill('12.5'); // Liters
    await numberInputs.nth(2).fill('6.50'); // Price/liter
    await numberInputs.nth(3).fill('85.50'); // Cost
    
    // Handle dialog
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Zapisz tankowanie")');

    // Verify entry is added in history
    await expect(page.locator('p:has-text("12.5 L")')).toBeVisible();
    await expect(page.locator('h4:has-text("85.50 PLN")')).toBeVisible();
    
    // Edit Fuel Entry
    await page.click('button >> text=Edytuj');
    
    // Edit form appears, modify liters
    await numberInputs.nth(1).fill('13.0');
    
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Zapisz zmiany")');
    
    // Verify changes
    await expect(page.locator('p:has-text("13 L")')).toBeVisible();

    // Delete Fuel Entry
    page.once('dialog', dialog => dialog.accept()); // handle confirmation
    await page.click('button >> text=Usuń');

    // Verify deletion
    await expect(page.locator('p:has-text("13 L")')).not.toBeVisible();
  });
});
