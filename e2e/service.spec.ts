import { test, expect } from '@playwright/test';

test.describe('Service Log', () => {
  test('should allow adding a service entry and display it', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('text=Całkowity przebieg')).toBeVisible({ timeout: 10000 });

    // Navigate to Service tab
    await page.click('nav >> text=Serwis');
    
    // Add Service Entry
    await page.selectOption('select', 'service'); // Serwis (Olej, klocki itp.)
    await page.fill('input[placeholder="np. Wymiana oleju Motul 15W50"]', 'Wymiana klocków');
    await page.fill('input[placeholder="0"]', '20000'); // ODO, placeholder uses currentOdo so it might not be exactly "0" 
    // Actually the placeholder is `${currentOdo}`, so we select by label or type
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('20000'); // ODO
    await inputs.nth(1).fill('150.00'); // Cost
    
    // Playwright dismisses alerts automatically by default. 
    // Just in case, let's catch it.
    page.on('dialog', dialog => dialog.accept());
    
    await page.click('button:has-text("Zapisz wpis")');

    // Verify entry is added in history
    await expect(page.locator('h4:has-text("Wymiana klocków")')).toBeVisible();
    await expect(page.locator('h4:has-text("150.00")')).toBeVisible();
  });
});
