/**
 * E2E Test: View Navigation & Switching
 *
 * Validates all ViewMode transitions via CyberDock sidebar.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('View Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('[P0] should load with workspace as default view', async ({ page }) => {
    // GIVEN the app loads
    // THEN default view should be workspace
    await expect(page.getByText('NEURAL DECK')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();
  });

  test('[P0] should display CyberDock sidebar with all navigation items', async ({ page }) => {
    // GIVEN the app is loaded
    // THEN all dock items should be present
    const dockLabels = [
      'Workspace', 'Orchestrator', 'Kanban', 'Synapse',
      'Laboratory', 'Roundtable', 'Construct', 'Immerse',
      'Grid', 'Git',
    ];

    for (const label of dockLabels) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeAttached();
    }
  });

  const viewTests: Array<{ label: string; view: string; marker: string | RegExp }> = [
    { label: 'Orchestrator', view: 'orchestrator', marker: 'neural-grid' },
    { label: 'Kanban', view: 'board', marker: /KANBAN|BOARD/i },
    { label: 'Laboratory', view: 'laboratory', marker: /LAB/i },
    { label: 'Git', view: 'git', marker: /GIT/i },
    { label: 'Grid', view: 'grid', marker: /GRID/i },
  ];

  for (const { label, view, marker } of viewTests) {
    test(`[P0] should navigate to ${label} view`, async ({ page }) => {
      // WHEN clicking the dock item
      await page.getByRole('button', { name: label, exact: true }).click();

      // THEN the view title in HoloPanel should reflect the switch
      await expect(page.locator(`text=SYSTEM_VIEW: ${view.toUpperCase()}`)).toBeVisible({ timeout: 15_000 });
    });
  }

  test('[P0] should switch between views without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate through multiple views rapidly
    const views = ['Orchestrator', 'Kanban', 'Laboratory', 'Workspace'];
    for (const v of views) {
      await page.getByRole('button', { name: v, exact: true }).click();
      await page.waitForTimeout(500);
    }

    // No uncaught exceptions should occur
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('net::ERR') && !e.includes('favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('[P0] should return to workspace from any view', async ({ page }) => {
    // Navigate away from workspace
    await page.getByRole('button', { name: 'Orchestrator' }).click();
    await expect(page.locator('text=SYSTEM_VIEW: ORCHESTRATOR')).toBeVisible({ timeout: 10_000 });

    // Navigate back to workspace
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await expect(page.locator('text=SYSTEM_VIEW: WORKSPACE')).toBeVisible({ timeout: 10_000 });
  });
});
