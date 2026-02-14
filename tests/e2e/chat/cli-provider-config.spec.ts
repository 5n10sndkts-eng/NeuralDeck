/**
 * E2E Test: CLI Provider Configuration
 * Verifies CLI providers send cliCommand field
 */

import { test, expect } from '../../support/fixtures';

test.describe('CLI Provider Configuration', () => {
  test('[P0] should include cliCommand for claude-cli provider', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    let capturedConfig: any = null;
    await page.route('**/api/chat', async (route) => {
      const postData = route.request().postDataJSON();
      capturedConfig = postData?.config;
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] })
      });
    });
    
    // Wait for app
    await page.waitForSelector('text=NEURAL DECK', { timeout: 10000 });
    
    // Navigate to Connections
    await page.click('text=Connections');
    await page.waitForTimeout(500);
    
    // Create a CLI profile via localStorage injection
    await page.evaluate(() => {
      const profiles = [{
        id: 'test-claude-cli',
        name: 'Test Claude CLI',
        provider: 'claude-cli',
        model: 'claude-sonnet-4',
        cliCommand: 'claude -p "{{prompt}}"'
      }];
      localStorage.setItem('neural_profiles', JSON.stringify(profiles));
      localStorage.setItem('neural_active_profile', 'test-claude-cli');
    });
    
    // Reload to apply config
    await page.reload();
    await page.waitForSelector('text=NEURAL DECK', { timeout: 10000 });
    
    // Send a chat message
    const input = await page.locator('input[placeholder*="COMMAND"]').first();
    await input.fill('test');
    await input.press('Enter');
    await page.waitForTimeout(1000);
    
    // Verify config includes cliCommand
    expect(capturedConfig).toBeTruthy();
    expect(capturedConfig.provider).toBe('claude-cli');
    expect(capturedConfig.cliCommand).toBe('claude -p "{{prompt}}"');
    
    console.log('✅ CLI config verified:', JSON.stringify(capturedConfig, null, 2));
  });
});
