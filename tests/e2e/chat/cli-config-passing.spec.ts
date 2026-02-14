/**
 * E2E Test: CLI Config Passing
 * Verifies that CLI provider config (including cliCommand) is sent to backend
 */

import { test, expect } from '../../support/fixtures';

test.describe('Chat CLI Configuration', () => {
  test('[P0] should pass cliCommand to backend API', async ({ request, page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Intercept the /api/chat request to verify config is sent
    let capturedConfig: any = null;
    await page.route('**/api/chat', async (route) => {
      const postData = route.request().postDataJSON();
      capturedConfig = postData?.config;
      
      // Return a mock response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: 'Test response' } }]
        })
      });
    });
    
    // Wait for app to load
    await page.waitForSelector('text=NEURAL DECK', { timeout: 10000 });
    
    // Type a message in the terminal
    const input = await page.locator('input[placeholder*="COMMAND"]').first();
    await input.fill('test message');
    await input.press('Enter');
    
    // Wait for the API call
    await page.waitForTimeout(1000);
    
    // Verify the config was captured and has required fields
    expect(capturedConfig).toBeTruthy();
    expect(capturedConfig).toHaveProperty('provider');
    expect(capturedConfig).toHaveProperty('model');
    expect(capturedConfig).toHaveProperty('baseUrl');
    
    // If provider is a CLI type, verify cliCommand is included
    const cliProviders = ['cli', 'claude-cli', 'gemini-cli', 'codex-cli', 'ollama-cli', 'copilot-cli', 'cursor-cli'];
    if (cliProviders.includes(capturedConfig.provider)) {
      expect(capturedConfig).toHaveProperty('cliCommand');
      expect(typeof capturedConfig.cliCommand).toBe('string');
    }
    
    console.log('Captured config:', JSON.stringify(capturedConfig, null, 2));
  });
});
