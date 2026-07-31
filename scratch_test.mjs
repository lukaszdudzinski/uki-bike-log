import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
  
  // Wait for loading to finish (initDB)
  await page.waitForTimeout(2000);
  
  // Click Ulubione Trasy to go to Routes tab
  console.log('Looking for Ulubione Trasy button...');
  const trasyButton = await page.locator('text=Ulubione Trasy');
  if (await trasyButton.count() > 0) {
    console.log('Clicking Ulubione Trasy...');
    await trasyButton.click();
    await page.waitForTimeout(1000);
    
    // Now look for Dodaj
    console.log('Looking for Dodaj button...');
    const dodajButton = await page.locator('button:has-text("Dodaj")').first();
    if (await dodajButton.count() > 0) {
      console.log('Clicking Dodaj...');
      await dodajButton.click();
      await page.waitForTimeout(1000);
      
      console.log('Looking for Zapisz trasę button...');
      const zapiszButton = await page.locator('text=Zapisz trasę');
      if (await zapiszButton.count() > 0) {
        console.log('Clicking Zapisz trasę...');
        // Fill out form first to prevent alert
        await page.fill('input[placeholder="Wpisz nazwę"]', 'Testowa');
        await page.fill('input[placeholder="Miasto, ulica lub GPS"]', 'Warszawa');
        await zapiszButton.click();
        await page.waitForTimeout(1000);
      } else {
        console.log('Zapisz trasę button not found');
      }
    } else {
      console.log('Dodaj button not found');
    }
  } else {
    console.log('Ulubione Trasy button not found');
  }

  await browser.close();
  console.log('Done.');
})();
