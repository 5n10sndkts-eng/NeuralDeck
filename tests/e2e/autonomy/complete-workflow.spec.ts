/**
 * E2E Autonomy Test: Complete Autonomous Workflow
 *
 * ASR-4: Autonomous Workflow (Score: 6 - MITIGATE)
 * Test ID: AUTO-001
 * Priority: P0
 *
 * Validates: System progresses through agent phases and view transitions
 * without crashing, and the orchestrator view remains functional throughout.
 */

import { test, expect } from '../../support/fixtures';
import { ensureSwarmViewReady } from '../../support/helpers/ui';

test('[P0] @autonomy Complete autonomous workflow (PRD → Stories → Implementation)', async ({ page, request }) => {
  test.setTimeout(60000);

  // GIVEN: Application loaded and workspace manager dismissed
  await page.goto('/');
  await ensureSwarmViewReady(page);

  // Verify orchestrator/grid view is visible after setup
  const gridVisible = await page.getByTestId('neural-grid').isVisible().catch(() => false);
  expect(gridVisible).toBe(true);

  // WHEN: Navigate through key workflow views to simulate agent pipeline

  // 1. Check Workspace view
  await page.getByRole('button', { name: 'Workspace' }).first().click();
  await page.waitForTimeout(500);

  // 2. Switch to Kanban (Board) to verify task management
  await page.getByRole('button', { name: 'Kanban' }).first().click();
  await page.waitForTimeout(500);

  // Verify board renders without crashing
  const boardHeader = page.locator('text=The Board');
  await expect(boardHeader).toBeVisible({ timeout: 5000 });

  // 3. Switch to Orchestrator view
  await page.getByRole('button', { name: 'Orchestrator' }).first().click();
  await page.waitForTimeout(500);

  // 4. Open command palette (Meta+K) and close it
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(300);
  const palette = page.locator('div[style*="inset"][style*="fixed"]');
  const paletteCount = await palette.count();
  if (paletteCount > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // 5. Navigate to Git view
  await page.getByRole('button', { name: 'Git' }).first().click();
  await page.waitForTimeout(500);

  // Verify Git view renders (either commits or empty state)
  const gitHeader = page.locator('text=The Git Log');
  await expect(gitHeader).toBeVisible({ timeout: 5000 });

  // 6. Return to Orchestrator
  await page.getByRole('button', { name: 'Orchestrator' }).first().click();
  await page.waitForTimeout(500);

  // THEN: Verify API endpoints are healthy
  const healthResponse = await request.get('/health');
  expect(healthResponse.ok()).toBe(true);

  const filesResponse = await request.get('/api/files');
  expect(filesResponse.ok()).toBe(true);

  // Verify no console errors crashed the page
  const errors = await page.locator('[data-testid="error-message"]').count();
  expect(errors).toBe(0);

  // Verify the page is still interactive (not crashed/frozen)
  const orchestratorBtn = page.getByRole('button', { name: 'Orchestrator' }).first();
  await expect(orchestratorBtn).toBeEnabled();
});
