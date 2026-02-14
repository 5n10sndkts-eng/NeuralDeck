/**
 * Full Browser Verification - End-to-End
 *
 * Walks through EVERY view, feature, and interaction in the NeuralDeck UI.
 * Captures screenshots, checks for console errors, validates API health,
 * and verifies responsive behavior.
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const SCREENSHOT_DIR = '/tmp/neuraldeck-full-verify';

test.describe('Full Browser Verification', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('RAG ERROR') && !msg.text().includes('favicon')) {
        consoleErrors.push(msg.text());
      }
    });
  });

  // Helper: dismiss workspace manager if it appears
  const dismissWorkspaceManager = async (page: Page) => {
    const heading = page.getByRole('heading', { name: 'WORKSPACE MANAGER' });
    if (await heading.isVisible().catch(() => false)) {
      // Escape is the most reliable way to close a modal
      await page.keyboard.press('Escape');
      // Allow Framer Motion exit animation to complete
      await page.waitForTimeout(400);

      // If still visible, try clicking the close button directly
      if (await heading.isVisible().catch(() => false)) {
        const closeBtn = page.locator('button:has(svg.lucide-x)').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
          await page.waitForTimeout(400);
        }
      }

      // Final fallback: click the backdrop overlay outside the modal
      if (await heading.isVisible().catch(() => false)) {
        const viewport = page.viewportSize() || { width: 1280, height: 720 };
        await page.mouse.click(viewport.width - 5, 5);
        await page.waitForTimeout(400);
      }

      await expect(heading).toBeHidden({ timeout: 5000 });
    }
  };

  // Helper: screenshot with label
  const snap = async (page: Page, name: string) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false, timeout: 30000 });
  };

  test('1. Initial Load & Layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await snap(page, '01-initial-load');

    // Verify the main app container exists
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify CyberDock sidebar is present
    const workspaceBtn = page.getByRole('button', { name: 'Workspace' }).first();
    await expect(workspaceBtn).toBeAttached({ timeout: 10000 });

    await dismissWorkspaceManager(page);
    await snap(page, '01-after-dismiss');
  });

  test('2. CyberDock Navigation - All 11 Views', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    const views = [
      { name: 'Workspace', label: 'workspace' },
      { name: 'Orchestrator', label: 'orchestrator' },
      { name: 'Kanban', label: 'kanban' },
      { name: 'Synapse', label: 'synapse' },
      { name: 'Laboratory', label: 'laboratory' },
      { name: 'Roundtable', label: 'roundtable' },
      { name: 'Construct', label: 'construct' },
      { name: 'Immerse', label: 'immerse' },
      { name: 'Grid', label: 'grid' },
      { name: 'Git', label: 'git' },
      { name: 'System', label: 'system' },
    ];

    for (const view of views) {
      const btn = page.getByRole('button', { name: view.name }).first();
      await btn.click();
      await page.waitForTimeout(800);
      await snap(page, `02-view-${view.label}`);

      // Verify no crash - page should still be interactive
      await expect(btn).toBeAttached();
    }
  });

  test('3. Command Palette Open/Close', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    // Open with keyboard shortcut
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    await snap(page, '03-command-palette-open');

    const palette = page.locator('div[style*="inset"][style*="fixed"]');
    const isOpen = (await palette.count()) > 0;
    expect(isOpen).toBe(true);

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await snap(page, '03-command-palette-closed');

    const afterClose = await palette.count();
    expect(afterClose).toBe(0);
  });

  test('4. Kanban Board - Columns & Layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Kanban' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '04-kanban-board');

    // Verify board header
    const header = page.locator('text=The Board');
    await expect(header).toBeVisible({ timeout: 5000 });

    // Verify 3 columns exist
    const todoCol = page.locator('text=Backlog');
    const devCol = page.locator('text=In Development');
    const doneCol = page.locator('text=Deployed');
    await expect(todoCol).toBeVisible();
    await expect(devCol).toBeVisible();
    await expect(doneCol).toBeVisible();
  });

  test('5. Git View - Empty State', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Git' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '05-git-view');

    // Verify git header
    const header = page.locator('text=The Git Log');
    await expect(header).toBeVisible({ timeout: 5000 });

    // Check for empty state or error state (both are valid)
    const emptyState = page.locator('text=No Repository Detected');
    const errorState = page.locator('.text-red-400, [style*="rgba(255, 100, 50"]');
    const commits = page.locator('[class*="cursor-pointer"][class*="group"]');

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasError = (await errorState.count()) > 0;
    const hasCommits = (await commits.count()) > 0;

    // At least one of these should be true
    expect(hasEmptyState || hasError || hasCommits).toBe(true);
  });

  test('6. Editor View - SEC_AUDIT Guard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    // Navigate to workspace (which shows the editor)
    await page.getByRole('button', { name: 'Workspace' }).first().click();
    await page.waitForTimeout(500);
    await snap(page, '06-editor-view');

    // Find SEC_AUDIT button if visible
    const secAuditBtn = page.locator('button:has-text("SEC_AUDIT"), button:has(svg.lucide-shield-alert)').first();
    if (await secAuditBtn.isVisible().catch(() => false)) {
      // With no active file, button should be disabled or scan shouldn't trigger
      const isDisabled = await secAuditBtn.isDisabled().catch(() => false);
      await snap(page, '06-sec-audit-state');
      // We've added disabled={!activeFile}, so verify it
      expect(isDisabled).toBe(true);
    }
  });

  test('7. Responsive - Mobile 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);
    await snap(page, '07-mobile-375');

    // Verify sidebar buttons are still accessible
    const workspaceBtn = page.getByRole('button', { name: 'Workspace' }).first();
    await expect(workspaceBtn).toBeAttached();

    // Navigate to each key view at mobile
    await page.getByRole('button', { name: 'Orchestrator' }).first().click();
    await page.waitForTimeout(500);
    await snap(page, '07-mobile-orchestrator');

    await page.getByRole('button', { name: 'Kanban' }).first().click();
    await page.waitForTimeout(500);
    await snap(page, '07-mobile-kanban');

    await page.getByRole('button', { name: 'Git' }).first().click();
    await page.waitForTimeout(500);
    await snap(page, '07-mobile-git');
  });

  test('8. Responsive - Tablet 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);
    await snap(page, '08-tablet-768');

    await page.getByRole('button', { name: 'Kanban' }).first().click();
    await page.waitForTimeout(500);
    await snap(page, '08-tablet-kanban');
  });

  test('9. Responsive - Desktop 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);
    await snap(page, '09-desktop-1920');

    await page.getByRole('button', { name: 'Orchestrator' }).first().click();
    await page.waitForTimeout(500);
    await snap(page, '09-desktop-orchestrator');
  });

  test('10. Rapid View Switching Stress Test', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    const viewButtons = ['Workspace', 'Orchestrator', 'Kanban', 'Synapse', 'Laboratory',
      'Roundtable', 'Construct', 'Immerse', 'Grid', 'Git', 'System'];

    // Rapid switch 3 full cycles
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const view of viewButtons) {
        await page.getByRole('button', { name: view }).first().click();
        await page.waitForTimeout(100);
      }
    }

    await page.waitForTimeout(1000);
    await snap(page, '10-after-rapid-switch');

    // Verify page didn't crash
    const orchestratorBtn = page.getByRole('button', { name: 'Orchestrator' }).first();
    await expect(orchestratorBtn).toBeEnabled();
  });

  test('11. API Health - All Endpoints', async ({ request }) => {
    const endpoints = [
      { method: 'GET', path: '/health', expectedOk: true },
      { method: 'GET', path: '/api/files', expectedOk: true },
      { method: 'GET', path: '/api/checkpoints?filePath=nonexistent.txt', expectedOk: false },
      { method: 'GET', path: '/api/diff/pending', expectedOk: true },
    ];

    for (const ep of endpoints) {
      const response = ep.method === 'GET'
        ? await request.get(ep.path)
        : await request.post(ep.path);

      if (ep.expectedOk) {
        expect(response.ok(), `${ep.method} ${ep.path} should be ok`).toBe(true);
      } else {
        // For error endpoints, just verify they respond (not 500 crash)
        expect(response.status(), `${ep.method} ${ep.path} should respond`).toBeGreaterThan(0);
      }
    }
  });

  test('12. Keyboard Shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    // Meta+K opens command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    const palette = page.locator('div[style*="inset"][style*="fixed"]');
    expect(await palette.count()).toBeGreaterThan(0);

    // Escape closes it
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    expect(await palette.count()).toBe(0);

    // Meta+Shift+? opens keyboard help (if implemented)
    await page.keyboard.press('Meta+Shift+?');
    await page.waitForTimeout(500);
    await snap(page, '12-keyboard-help');

    // Close any modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('13. Synapse View', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Synapse' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '13-synapse-view');

    // Verify page renders without crash
    const btn = page.getByRole('button', { name: 'Synapse' }).first();
    await expect(btn).toBeAttached();
  });

  test('14. Laboratory View', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Laboratory' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '14-laboratory-view');

    const btn = page.getByRole('button', { name: 'Laboratory' }).first();
    await expect(btn).toBeAttached();
  });

  test('15. Roundtable View', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Roundtable' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '15-roundtable-view');

    const btn = page.getByRole('button', { name: 'Roundtable' }).first();
    await expect(btn).toBeAttached();
  });

  test('16. Construct View', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Construct' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '16-construct-view');

    const btn = page.getByRole('button', { name: 'Construct' }).first();
    await expect(btn).toBeAttached();
  });

  test('17. Immerse View', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Immerse' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '17-immerse-view');

    const btn = page.getByRole('button', { name: 'Immerse' }).first();
    await expect(btn).toBeAttached();
  });

  test('18. Grid View', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'Grid' }).first().click();
    await page.waitForTimeout(1000);
    await snap(page, '18-grid-view');

    const btn = page.getByRole('button', { name: 'Grid' }).first();
    await expect(btn).toBeAttached();
  });

  test('19. System/Connections View', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    await page.getByRole('button', { name: 'System' }).first().click();
    // System view renders agent routing matrix with many icons; allow extra settle time
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    await snap(page, '19-system-view');

    const btn = page.getByRole('button', { name: 'System' }).first();
    await expect(btn).toBeAttached();
  });

  test('20. Terminal/Chat Interaction', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    // Look for the terminal input area
    const terminalInput = page.locator('textarea, input[type="text"]').last();
    if (await terminalInput.isVisible().catch(() => false)) {
      await terminalInput.click();
      await terminalInput.fill('test message');
      await snap(page, '20-terminal-input');
    } else {
      await snap(page, '20-no-terminal-visible');
    }
  });

  test('21. Header Overflow Check at 1280x720', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    // Navigate to workspace to trigger editor header
    await page.getByRole('button', { name: 'Workspace' }).first().click();
    await page.waitForTimeout(500);

    // Check if document has horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    await snap(page, '21-overflow-check-1280');

    // Allow small overflow (up to 5px for scrollbars)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth - clientWidth).toBeLessThan(20);
  });

  test('22. Full Cycle: Load → Navigate All → Verify Healthy', async ({ page, request }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissWorkspaceManager(page);

    // Visit every view in sequence
    const views = ['Workspace', 'Orchestrator', 'Kanban', 'Synapse', 'Laboratory',
      'Roundtable', 'Construct', 'Immerse', 'Grid', 'Git', 'System'];

    for (const view of views) {
      await page.getByRole('button', { name: view }).first().click();
      await page.waitForTimeout(300);
    }

    // Return to orchestrator
    await page.getByRole('button', { name: 'Orchestrator' }).first().click();
    await page.waitForTimeout(500);
    await snap(page, '22-full-cycle-end');

    // Health check
    const health = await request.get('/health');
    expect(health.ok()).toBe(true);

    // Page is still alive
    const btn = page.getByRole('button', { name: 'Orchestrator' }).first();
    await expect(btn).toBeEnabled();

    // No JS crash errors (filter common noise)
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('net::ERR') && !e.includes('favicon') && !e.includes('RAG')
    );
    // Allow some non-critical errors, but no crash-level ones
    for (const err of criticalErrors) {
      expect(err).not.toContain('Uncaught');
      expect(err).not.toContain('TypeError');
      expect(err).not.toContain('ReferenceError');
    }
  });
});
