/**
 * Browser-based E2E audit with screenshots at every step.
 * This test navigates the entire app and captures visual state
 * to identify layout, rendering, and functional issues.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { test, expect } from '../support/fixtures';
import { createIsolatedWorkspace, cleanupIsolatedWorkspace, type E2EWorkspace } from '../support/helpers/workspace';

const SCREENSHOT_DIR = path.join(os.tmpdir(), 'neuraldeck-audit-screenshots');

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

const snap = async (page: any, name: string) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
};

test.describe('Visual Browser Audit', () => {
  let workspace: E2EWorkspace | null = null;

  test('1. Initial load & layout', async ({ page, request }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, '01-initial-load');

    // Check console errors
    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(2000);
    await snap(page, '02-after-settle');

    // Check branding
    const branding = page.locator('text=NEURAL DECK');
    await expect(branding.first()).toBeVisible();

    // Check sidebar
    const sidebar = page.locator('.cyber-dock, [class*="dock"]').first();
    await expect(sidebar).toBeVisible();
    await snap(page, '03-sidebar-visible');

    // Report console errors
    if (errors.length > 0) {
      console.log('=== CONSOLE ERRORS ON LOAD ===');
      errors.forEach(e => console.log(`  ❌ ${e}`));
    }
  });

  test('2. CyberDock navigation - all views', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const views = [
      'Workspace', 'Orchestrator', 'Kanban', 'Synapse',
      'Laboratory', 'Roundtable', 'Construct', 'Immerse',
      'Grid', 'Git',
    ];

    for (const view of views) {
      const btn = page.getByRole('button', { name: view, exact: true });
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
        await snap(page, `04-view-${view.toLowerCase()}`);
      } else {
        console.log(`  ⚠️ Button "${view}" not visible`);
      }
    }
  });

  test('3. Command Palette', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open with Cmd+K
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    await snap(page, '05-command-palette-open');

    // Type something
    const input = page.locator('input[type="text"]').last();
    if (await input.isVisible()) {
      await input.fill('workspace');
      await page.waitForTimeout(300);
      await snap(page, '06-command-palette-search');
    }

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await snap(page, '07-command-palette-closed');
  });

  test('4. Workspace management', async ({ page, request }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create workspace for testing
    workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-audit`);

    // Navigate to workspace view
    await page.reload();
    await page.waitForLoadState('networkidle');
    await snap(page, '08-workspace-with-active');

    // Click workspace button
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(500);
    await snap(page, '09-workspace-view');

    // Try the workspace menu button
    const menuBtn = page.locator('[data-testid="workspace-menu-button"], button[aria-label*="workspace" i]').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(500);
      await snap(page, '10-workspace-menu-open');

      // Close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Cleanup
    await cleanupIsolatedWorkspace(request, workspace);
    workspace = null;
  });

  test('5. Terminal/Chat', async ({ page, request }, testInfo) => {
    workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-chat-audit`);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to workspace view
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(1000);
    await snap(page, '11-workspace-for-chat');

    // Find terminal input
    const input = page.locator('input[placeholder*="INSTRUCTION" i], input[placeholder*="COMMAND" i], .cyber-input').first();
    if (await input.isVisible()) {
      await snap(page, '12-terminal-input-visible');

      // Mock the chat endpoint to return a response
      await page.route('**/api/chat', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            choices: [{ message: { role: 'assistant', content: 'Hello from audit test!' } }],
          }),
        });
      });

      // Type and send
      await input.fill('hello');
      await page.waitForTimeout(200);
      await snap(page, '13-terminal-typed');

      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      await snap(page, '14-terminal-after-send');
    } else {
      console.log('  ⚠️ Terminal input not found');
      await snap(page, '12-terminal-input-missing');
    }

    await cleanupIsolatedWorkspace(request, workspace);
    workspace = null;
  });

  test('6. Responsive layout check', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);
    await snap(page, '15-responsive-1920');

    // Laptop
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(300);
    await snap(page, '16-responsive-1366');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await snap(page, '17-responsive-768');

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);
    await snap(page, '18-responsive-375');
  });

  test('7. Rapid view switching stress test', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const views = ['Orchestrator', 'Kanban', 'Laboratory', 'Grid', 'Git', 'Workspace'];
    for (let round = 0; round < 3; round++) {
      for (const view of views) {
        const btn = page.getByRole('button', { name: view, exact: true });
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(100);
        }
      }
    }

    await page.waitForTimeout(1000);
    await snap(page, '19-after-rapid-switching');

    if (errors.length > 0) {
      console.log('=== CONSOLE ERRORS DURING RAPID SWITCHING ===');
      errors.forEach(e => console.log(`  ❌ ${e}`));
    }
  });

  test('8. API health verification', async ({ request }) => {
    const endpoints = [
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/api/files' },
      { method: 'GET', path: '/api/workspaces' },
      { method: 'GET', path: '/api/config/keys' },
      { method: 'GET', path: '/api/diff/pending' },
      { method: 'GET', path: '/api/checkpoints/stats' },
      { method: 'GET', path: '/api/checkpoints/files' },
      { method: 'GET', path: '/api/swarm/executions' },
      { method: 'GET', path: '/api/stories' },
      { method: 'GET', path: '/api/conflicts/stats' },
      { method: 'GET', path: '/api/security/vulnerability-types' },
    ];

    const issues: string[] = [];

    for (const ep of endpoints) {
      try {
        const response = await request.get(ep.path);
        if (!response.ok()) {
          issues.push(`${ep.method} ${ep.path} → ${response.status()}`);
        }
      } catch (e: any) {
        issues.push(`${ep.method} ${ep.path} → ERROR: ${e.message}`);
      }
    }

    if (issues.length > 0) {
      console.log('=== API HEALTH ISSUES ===');
      issues.forEach(i => console.log(`  ❌ ${i}`));
    }

    // All endpoints should work
    expect(issues.length).toBe(0);
  });

  test('9. Keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test Cmd+K (command palette)
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    const palette = page.locator('div[style*="inset"][style*="fixed"]');
    const paletteVisible = await palette.count() > 0;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Test ? or other help shortcuts
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    await snap(page, '20-keyboard-help');

    console.log(`Command Palette (Cmd+K): ${paletteVisible ? '✅' : '❌'}`);
  });

  test('10. Error boundary check - bad routes', async ({ page }) => {
    // Navigate to non-existent route
    await page.goto('/#/nonexistent-route');
    await page.waitForTimeout(1000);
    await snap(page, '21-bad-route');

    // Check that app doesn't crash
    const branding = page.locator('text=NEURAL DECK');
    await expect(branding.first()).toBeVisible();
  });
});
