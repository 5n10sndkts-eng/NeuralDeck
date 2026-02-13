/**
 * Deep browser audit: finds specific bugs and edge cases.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { test, expect } from '../support/fixtures';
import { createIsolatedWorkspace, cleanupIsolatedWorkspace, type E2EWorkspace } from '../support/helpers/workspace';

const SCREENSHOT_DIR = path.join(os.tmpdir(), 'neuraldeck-audit-screenshots');

const snap = async (page: any, name: string) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
};

test.describe('Deep Audit', () => {

  test('A. Console errors during rapid view switching', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const errors: string[] = [];
    const warnings: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });

    // Track network 404s
    const notFoundUrls: string[] = [];
    page.on('response', (resp: any) => {
      if (resp.status() === 404) notFoundUrls.push(resp.url());
    });

    const views = ['Orchestrator', 'Kanban', 'Synapse', 'Laboratory', 'Roundtable',
      'Construct', 'Immerse', 'Grid', 'Git', 'Workspace'];

    for (let round = 0; round < 5; round++) {
      for (const view of views) {
        const btn = page.getByRole('button', { name: view, exact: true });
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(50); // Very fast switching
        }
      }
    }
    await page.waitForTimeout(2000);

    console.log('=== RAPID SWITCHING: 404 URLs ===');
    const unique404s = [...new Set(notFoundUrls)];
    unique404s.forEach(u => console.log(`  404: ${u}`));
    console.log(`Total unique 404s: ${unique404s.length}`);

    console.log('=== RAPID SWITCHING: JS Errors ===');
    const uniqueErrors = [...new Set(errors)];
    uniqueErrors.forEach(e => console.log(`  ERR: ${e}`));
    console.log(`Total unique errors: ${uniqueErrors.length}`);

    // Page should still be functional
    const branding = page.locator('text=NEURAL DECK');
    await expect(branding.first()).toBeVisible();
  });

  test('B. Overflow and clipping at 1280x720', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check header bar doesn't overflow
    const header = page.locator('.hud-header, header').first();
    if (await header.isVisible()) {
      const box = await header.boundingBox();
      if (box) {
        console.log(`Header: w=${box.width}, h=${box.height}, x=${box.x}`);
        if (box.width > 1280) console.log('  ⚠️ ISSUE: Header overflows viewport width');
      }
    }

    // Check sidebar doesn't overflow
    const sidebar = page.locator('.cyber-dock').first();
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox();
      if (box) {
        console.log(`Sidebar: w=${box.width}, h=${box.height}`);
        if (box.height > 720) console.log('  ⚠️ ISSUE: Sidebar overflows viewport height');
      }
    }

    await snap(page, '30-overflow-check-1280');
  });

  test('C. Mobile viewport usability', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if sidebar is still usable
    const sidebarBtns = page.locator('.cyber-dock button, .dock-btn');
    const count = await sidebarBtns.count();
    console.log(`Mobile: sidebar buttons visible: ${count}`);

    // Check header overflow
    const header = page.locator('.hud-header, header').first();
    if (await header.isVisible()) {
      const box = await header.boundingBox();
      if (box) {
        console.log(`Mobile header: w=${box.width}, x=${box.x}`);
        if (box.width > 375) console.log('  ⚠️ ISSUE: Header overflows mobile width');
      }
    }

    // Try clicking a navigation item
    const orchBtn = page.getByRole('button', { name: 'Orchestrator', exact: true });
    if (await orchBtn.isVisible()) {
      await orchBtn.click();
      await page.waitForTimeout(500);
      await snap(page, '31-mobile-orchestrator');
    }

    // Check if workspace dropdown is clipped
    const wsBtn = page.getByRole('button', { name: 'Workspace', exact: true });
    if (await wsBtn.isVisible()) {
      await wsBtn.click();
      await page.waitForTimeout(500);
    }
    await snap(page, '32-mobile-workspace');
  });

  test('D. Agent bar icons visibility at various widths', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The agent bar (top row of hexagonal agent icons) may truncate
    for (const width of [1920, 1440, 1280, 1024, 800]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(200);

      // Check if agent icons are visible/clipped
      const agentIcons = page.locator('.agent-hex, [class*="agent-icon"]');
      const visibleCount = await agentIcons.count();
      console.log(`Width ${width}: agent icons visible: ${visibleCount}`);
    }
  });

  test('E. Socket connection status', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const wsMessages: string[] = [];
    page.on('console', (msg: any) => {
      const text = msg.text();
      if (text.includes('socket') || text.includes('Socket') || text.includes('WebSocket') || text.includes('ESTABLISHED')) {
        wsMessages.push(text);
      }
    });

    await page.waitForTimeout(3000);
    console.log('=== SOCKET STATUS ===');
    wsMessages.forEach(m => console.log(`  ${m}`));
    if (wsMessages.length === 0) console.log('  No socket messages detected in console');

    // The terminal shows "ESTABLISHED TO LOCALHOST:8000" - check it's there
    await snap(page, '33-socket-status');
  });

  test('F. Double-click and multi-click edge cases', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Double-click a dock button
    const wsBtn = page.getByRole('button', { name: 'Orchestrator', exact: true });
    await wsBtn.dblclick();
    await page.waitForTimeout(500);

    // Triple-click same button
    await wsBtn.click({ clickCount: 3 });
    await page.waitForTimeout(500);

    // Click rapidly between two views
    const kanban = page.getByRole('button', { name: 'Kanban', exact: true });
    for (let i = 0; i < 10; i++) {
      await wsBtn.click();
      await kanban.click();
    }
    await page.waitForTimeout(500);

    if (errors.length > 0) {
      console.log('=== MULTI-CLICK ERRORS ===');
      [...new Set(errors)].forEach(e => console.log(`  ❌ ${e}`));
    } else {
      console.log('Multi-click: No errors');
    }

    // App should still be functional
    await expect(page.locator('text=NEURAL DECK').first()).toBeVisible();
  });

  test('G. Performance: page load timing', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const domReady = Date.now() - startTime;

    await page.waitForLoadState('networkidle');
    const networkIdle = Date.now() - startTime;

    console.log(`=== PERFORMANCE ===`);
    console.log(`  DOM ready: ${domReady}ms`);
    console.log(`  Network idle: ${networkIdle}ms`);

    if (domReady > 3000) console.log('  ⚠️ ISSUE: DOM ready > 3s');
    if (networkIdle > 10000) console.log('  ⚠️ ISSUE: Network idle > 10s');

    // Measure FPS via performance observer
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        function count() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(count);
          } else {
            resolve(frames);
          }
        }
        requestAnimationFrame(count);
      });
    });
    console.log(`  FPS (1s sample): ${fps}`);
    if (fps < 30) console.log('  ⚠️ ISSUE: FPS below 30');
  });

  test('H. Text truncation and overflow in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check the "OPENCODE ONLINE" status in header
    const opencode = page.locator('text=OPENCODE').first();
    if (await opencode.isVisible()) {
      const box = await opencode.boundingBox();
      console.log(`OPENCODE label: w=${box?.width}, h=${box?.height}`);
    }

    // Check CTX LOAD button visibility
    const ctxLoad = page.locator('text=CTX LOAD').first();
    if (await ctxLoad.isVisible()) {
      console.log('CTX LOAD: visible ✅');
    } else {
      console.log('CTX LOAD: NOT visible ⚠️ (may be clipped)');
    }

    // Check SESSIONS counter
    const sessions = page.locator('text=SESSIONS').first();
    if (await sessions.isVisible()) {
      console.log('SESSIONS: visible ✅');
    } else {
      console.log('SESSIONS: NOT visible ⚠️');
    }

    await snap(page, '34-header-elements');
  });

  test('I. Workspace without active workspace - error states', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The initial state shows "NO WORKSPACE"
    const noWs = page.locator('text=NO WORKSPACE').first();
    if (await noWs.isVisible()) {
      console.log('No workspace message: visible ✅');
    }

    // Try clicking SEC_AUDIT button without workspace
    const secAudit = page.locator('text=SEC_AUDIT').first();
    if (await secAudit.isVisible()) {
      await secAudit.click();
      await page.waitForTimeout(500);
      await snap(page, '35-sec-audit-no-workspace');
    }

    // Try clicking SAVE button without workspace
    const save = page.locator('text=SAVE').first();
    if (await save.isVisible()) {
      await save.click();
      await page.waitForTimeout(500);
      await snap(page, '36-save-no-workspace');
    }

    // Try clicking HISTORY button
    const history = page.locator('text=HISTORY').first();
    if (await history.isVisible()) {
      await history.click();
      await page.waitForTimeout(500);
      await snap(page, '37-history-no-workspace');
    }
  });

  test('J. CSS z-index layering check', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open command palette while workspace menu is visible
    // First navigate to workspace
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(300);

    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    await snap(page, '38-palette-over-workspace');

    // The palette should be on top (z-index 100)
    const overlay = page.locator('div[style*="inset"][style*="fixed"]').first();
    await expect(overlay).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('K. Kanban board column spacing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Kanban', exact: true }).click();
    await page.waitForTimeout(500);

    // Check if "DEPLOYED" column header is clipped on right edge
    const deployed = page.locator('text=DEPLOYED').first();
    if (await deployed.isVisible()) {
      const box = await deployed.boundingBox();
      const viewport = page.viewportSize();
      console.log(`DEPLOYED column: x=${box?.x}, right=${(box?.x || 0) + (box?.width || 0)}, viewport=${viewport?.width}`);
      if (box && viewport && box.x + box.width > viewport.width) {
        console.log('  ⚠️ ISSUE: DEPLOYED column extends beyond viewport');
      }
    }

    // Check if there's a 4th column (e.g., "0 TASKS" label clipped)
    await snap(page, '39-kanban-columns');
  });

  test('L. Git view when no git repo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Git', exact: true }).click();
    await page.waitForTimeout(1000);
    await snap(page, '40-git-no-repo');

    // Check for error state or empty state
    const noRepo = page.locator('text=/no.*repo|not.*initialized|git.*init/i').first();
    const hasContent = await noRepo.isVisible().catch(() => false);
    console.log(`Git view empty state: ${hasContent ? 'shows message ✅' : 'no message shown ⚠️'}`);
  });
});
