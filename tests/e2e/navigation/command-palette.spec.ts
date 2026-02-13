/**
 * E2E Test: Command Palette (Cmd+K)
 *
 * Validates keyboard shortcut opens/closes command palette.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

// The command palette renders as a full-screen overlay with position:fixed and inset:0.
// When closed, the component returns null and is removed from the DOM.
const paletteOverlay = 'div[style*="inset"][style*="fixed"]';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('[P0] should open command palette with Cmd+K', async ({ page }) => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+k`);

    // The palette overlay should appear
    await expect(page.locator(paletteOverlay).first()).toBeVisible({ timeout: 5_000 });
  });

  test('[P0] should close command palette with Escape', async ({ page }) => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+k`);
    await expect(page.locator(paletteOverlay).first()).toBeVisible({ timeout: 5_000 });

    // WHEN pressing Escape
    await page.keyboard.press('Escape');

    // THEN the overlay should be removed from DOM (component returns null)
    await expect(page.locator(paletteOverlay)).toHaveCount(0, { timeout: 3_000 });
  });

  test('[P0] should toggle command palette on repeated Cmd+K', async ({ page }) => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Open
    await page.keyboard.press(`${modifier}+k`);
    await expect(page.locator(paletteOverlay).first()).toBeVisible({ timeout: 5_000 });

    // Close with same shortcut
    await page.keyboard.press(`${modifier}+k`);
    await expect(page.locator(paletteOverlay)).toHaveCount(0, { timeout: 3_000 });
  });
});
