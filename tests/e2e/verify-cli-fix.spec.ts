import { test, expect } from '../support/fixtures';

test('[VERIFY] CLI config with fresh browser', async ({ context, page }) => {
  await context.clearCookies();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=NEURAL DECK', { timeout: 10000 });
  
  let configSent: any = null;
  await page.route('**/api/chat', async (route) => {
    configSent = route.request().postDataJSON()?.config;
    console.log('Config:', JSON.stringify(configSent, null, 2));
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] })
    });
  });
  
  await page.waitForTimeout(2000);
  const input = page.locator('input[placeholder*="COMMAND"], input[placeholder*="ENTER"]').first();
  await input.fill('test');
  await input.press('Enter');
  await page.waitForTimeout(2000);
  
  expect(configSent).toHaveProperty('cliCommand');
  console.log('✅ cliCommand present:', configSent.cliCommand);
});
