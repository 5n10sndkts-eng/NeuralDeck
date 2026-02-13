/**
 * E2E Test: App Layout & Core UI Elements
 *
 * Validates the main layout structure, header, sidebar, and responsive behavior.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('App Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('[P0] should display the Neural Deck branding', async ({ page }) => {
    await expect(page.getByText('NEURAL DECK')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('SYSTEM_ONLINE')).toBeVisible();
  });

  test('[P0] should display sidebar navigation dock', async ({ page }) => {
    // CyberDock should be visible with navigation buttons
    await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Orchestrator' })).toBeVisible();
  });

  test('[P0] should display the HoloPanel with view title', async ({ page }) => {
    // Default view is workspace
    await expect(page.locator('text=SYSTEM_VIEW: WORKSPACE')).toBeVisible({ timeout: 10_000 });
  });

  test('[P0] should not show workspace manager modal on automated browser', async ({ page }) => {
    // App skips workspace manager popup when navigator.webdriver is true (Playwright)
    // So the workspace manager should NOT auto-open
    await page.waitForTimeout(2_000);

    // The heading "WORKSPACE MANAGER" should not be visible automatically
    const managerHeading = page.getByRole('heading', { name: 'WORKSPACE MANAGER' });
    const isVisible = await managerHeading.isVisible().catch(() => false);
    // In automated browsers, the workspace manager should be suppressed
    expect(isVisible).toBe(false);
  });

  test('[P0] should have no JavaScript errors on initial load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    // Filter out known benign errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('AudioContext')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('[P0] should have correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/NeuralDeck/i);
  });
});
