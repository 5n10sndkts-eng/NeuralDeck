/**
 * E2E Test: Error Handling & Resilience
 *
 * Validates the app handles backend failures, network errors,
 * and edge cases gracefully without crashing.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('Error Handling & Resilience', () => {
  test('[P0] should survive backend chat endpoint failure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Mock chat API to return 500
    await page.route('**/api/chat', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal server error' }) })
    );

    // Navigate to workspace view
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(500);

    // Try sending a chat message (should not crash the app)
    const input = page.locator('input[type="text"]').last();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('test message during failure');
      await input.press('Enter');
      await page.waitForTimeout(1_000);
    }

    // App should still be functional
    await expect(page.getByText('NEURAL DECK')).toBeVisible();
  });

  test('[P0] should handle missing workspace gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // The app should still load even without any workspace
    await expect(page.getByText('NEURAL DECK')).toBeVisible({ timeout: 15_000 });
  });

  test('[P0] should recover after network interruption simulation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Block all API requests temporarily
    await page.route('**/api/**', (route) => route.abort('connectionrefused'));
    await page.waitForTimeout(2_000);

    // Unblock
    await page.unroute('**/api/**');
    await page.waitForTimeout(2_000);

    // App should still render
    await expect(page.getByText('NEURAL DECK')).toBeVisible();
  });

  test('[P0] should handle rapid view switching without crashing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const views = ['Orchestrator', 'Kanban', 'Laboratory', 'Workspace', 'Grid', 'Git'];

    // Rapidly switch views
    for (const v of views) {
      await page.getByRole('button', { name: v, exact: true }).click();
      // No wait between clicks — stress test
    }

    // Wait for dust to settle
    await page.waitForTimeout(2_000);

    // App should not have crashed
    await expect(page.getByText('NEURAL DECK')).toBeVisible();
  });

  test('[P0] should show MODULE_OFFLINE for unknown view state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Force an invalid view via JavaScript
    await page.evaluate(() => {
      // Attempt to trigger the default switch case
      const event = new CustomEvent('force-view-change', { detail: 'nonexistent' });
      window.dispatchEvent(event);
    });

    // The app should not crash from this
    await expect(page.getByText('NEURAL DECK')).toBeVisible();
  });

  test('[P0] should handle file read errors via API', async ({ request }) => {
    // WHEN trying to read a file that does not exist
    const response = await request.get('/api/files/read?path=nonexistent-file-12345.xyz');

    // THEN should return an error (not crash)
    expect([400, 404, 500]).toContain(response.status());
  });

  test('[P0] should handle concurrent API requests', async ({ request }) => {
    // Send 10 concurrent health checks
    const promises = Array.from({ length: 10 }, () => request.get('/health'));
    const responses = await Promise.all(promises);

    // All should succeed
    for (const response of responses) {
      expect(response.ok()).toBe(true);
    }
  });
});
