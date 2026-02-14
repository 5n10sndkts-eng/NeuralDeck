/**
 * Bug Reproduction Suite — validates each identified issue
 * from the browser E2E audit with detailed diagnostics.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { test, expect } from '../support/fixtures';
import { createIsolatedWorkspace, cleanupIsolatedWorkspace, type E2EWorkspace } from '../support/helpers/workspace';

const SCREENSHOT_DIR = path.join(os.tmpdir(), 'neuraldeck-bug-repro');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const snap = async (page: any, name: string) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
};

// ─── BUG 1: /api/read 404 during rapid view switching ────────────────────────
test.describe('BUG-1: /api/read 404 on rapid switching', () => {
  test('reproduces 404 on /api/read during fast view transitions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const notFoundRequests: { url: string; method: string }[] = [];
    const allReadRequests: { url: string; status: number; body: string }[] = [];

    page.on('response', async (resp: any) => {
      const url = resp.url();
      if (url.includes('/api/read')) {
        const status = resp.status();
        let body = '';
        try { body = await resp.text(); } catch {}
        allReadRequests.push({ url, status, body: body.substring(0, 200) });
        if (status === 403 || status === 404) {
          notFoundRequests.push({ url, method: resp.request().method() });
        }
      }
    });

    const views = ['Orchestrator', 'Kanban', 'Synapse', 'Laboratory', 'Roundtable',
      'Construct', 'Immerse', 'Grid', 'Git', 'Workspace'];

    // Rapid switching — 5 rounds, 50ms between clicks
    for (let round = 0; round < 5; round++) {
      for (const view of views) {
        const btn = page.getByRole('button', { name: view, exact: true });
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(50);
        }
      }
    }
    await page.waitForTimeout(2000);

    console.log('=== BUG-1 DIAGNOSTICS ===');
    console.log(`Total /api/read requests: ${allReadRequests.length}`);
    console.log(`404 responses: ${notFoundRequests.length}`);
    allReadRequests.forEach((r, i) => {
      console.log(`  [${i}] ${r.status} ${r.url}`);
      if (r.status !== 200) console.log(`      body: ${r.body}`);
    });

    // Confirm the bug exists
    if (notFoundRequests.length > 0) {
      console.log('BUG-1 CONFIRMED: /api/read returns 404 during rapid switching');
    } else {
      console.log('BUG-1 NOT REPRODUCED in this run');
    }
  });
});

// ─── BUG 2: Git view no empty-state message ──────────────────────────────────
test.describe('BUG-2: Git view empty state', () => {
  test('shows no helpful message when no git repo exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Git', exact: true }).click();
    await page.waitForTimeout(1500);
    await snap(page, 'bug2-git-empty');

    // Check what IS visible
    const header = page.locator('text=THE GIT LOG');
    await expect(header.first()).toBeVisible();

    // Check for any kind of empty-state message
    const emptyMsg = page.locator('text=/no.*repo|not.*init|empty|no commits|no data/i');
    const hasEmptyMsg = await emptyMsg.count();

    // Inspect full content area
    const mainContent = await page.locator('main, [class*="content"], [class*="view"]').first().textContent().catch(() => '');
    console.log('=== BUG-2 DIAGNOSTICS ===');
    console.log(`Empty state messages found: ${hasEmptyMsg}`);
    console.log(`Main area text: "${mainContent?.substring(0, 300)}"`);

    if (hasEmptyMsg === 0) {
      console.log('BUG-2 CONFIRMED: Git view shows no empty-state guidance');
    }
  });
});

// ─── BUG 3: Kanban intermittent empty render ──────────────────────────────────
test.describe('BUG-3: Kanban intermittent empty', () => {
  test('reproduces empty Kanban board on repeated navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let emptyRenders = 0;
    const totalAttempts = 10;

    for (let i = 0; i < totalAttempts; i++) {
      // Navigate away
      await page.getByRole('button', { name: 'Orchestrator', exact: true }).click();
      await page.waitForTimeout(200);

      // Navigate to Kanban
      await page.getByRole('button', { name: 'Kanban', exact: true }).click();
      await page.waitForTimeout(300);

      // Check if column headers are present
      const backlog = await page.locator('text=BACKLOG').count();
      const development = await page.locator('text=DEVELOPMENT').count();
      const deployed = await page.locator('text=DEPLOYED').count();

      if (backlog === 0 && development === 0 && deployed === 0) {
        emptyRenders++;
        await snap(page, `bug3-kanban-empty-${i}`);
      }
    }

    console.log('=== BUG-3 DIAGNOSTICS ===');
    console.log(`Empty renders: ${emptyRenders}/${totalAttempts}`);

    // Check right-edge clipping of DEPLOYED
    await page.getByRole('button', { name: 'Kanban', exact: true }).click();
    await page.waitForTimeout(500);
    const deployed = page.locator('text=DEPLOYED').first();
    if (await deployed.isVisible()) {
      const box = await deployed.boundingBox();
      const vp = page.viewportSize();
      console.log(`DEPLOYED position: x=${box?.x} right=${(box?.x || 0) + (box?.width || 0)} viewport=${vp?.width}`);
      if (box && vp && (box.x + box.width) > vp.width) {
        console.log('BUG-3 CONFIRMED: DEPLOYED column clipped at viewport edge');
      }
    }
    await snap(page, 'bug3-kanban-final');
  });
});

// ─── BUG 4: Mobile header clipping ───────────────────────────────────────────
test.describe('BUG-4: Mobile header clipping', () => {
  test('header elements overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to workspace to see all header buttons
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(500);

    const elements = ['SEC_AUDIT', 'HISTORY', 'SAVE'];
    console.log('=== BUG-4 DIAGNOSTICS ===');

    for (const label of elements) {
      const el = page.locator(`text=${label}`).first();
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        const box = await el.boundingBox();
        const clipped = box && (box.x + box.width > 375 || box.x < 0);
        console.log(`${label}: visible=${visible} x=${box?.x} w=${box?.width} right=${(box?.x || 0) + (box?.width || 0)} clipped=${clipped}`);
        if (clipped) console.log(`  BUG-4 CONFIRMED: ${label} extends beyond 375px viewport`);
      } else {
        console.log(`${label}: NOT visible (may be hidden at mobile width)`);
      }
    }

    // Check header total width
    const header = page.locator('.hud-header, header').first();
    if (await header.isVisible()) {
      const scrollWidth = await header.evaluate((el: Element) => el.scrollWidth);
      const clientWidth = await header.evaluate((el: Element) => el.clientWidth);
      console.log(`Header scroll=${scrollWidth} client=${clientWidth}`);
      if (scrollWidth > clientWidth) {
        console.log('BUG-4 CONFIRMED: Header has horizontal overflow');
      }
    }

    await snap(page, 'bug4-mobile-header');
  });
});

// ─── BUG 5: Mobile sidebar accessibility ──────────────────────────────────────
test.describe('BUG-5: Mobile sidebar accessibility', () => {
  test('sidebar buttons lack proper roles at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log('=== BUG-5 DIAGNOSTICS ===');

    // Check buttons by role
    const allButtons = await page.getByRole('button').all();
    const buttonLabels = [];
    for (const btn of allButtons) {
      const label = await btn.getAttribute('aria-label') || await btn.textContent() || '';
      const visible = await btn.isVisible();
      if (visible) buttonLabels.push(label.trim().substring(0, 30));
    }
    console.log(`Visible buttons by role: ${buttonLabels.length}`);
    console.log(`Labels: ${buttonLabels.join(', ')}`);

    // Check dock buttons specifically
    const dockBtns = page.locator('.dock-btn, .cyber-dock button');
    const dockCount = await dockBtns.count();
    console.log(`Dock buttons by CSS class: ${dockCount}`);

    // Check if sidebar icons are visually present but not accessible
    const sidebarIcons = page.locator('.cyber-dock svg, .cyber-dock [class*="icon"]');
    const iconCount = await sidebarIcons.count();
    console.log(`Sidebar SVG icons found: ${iconCount}`);

    // Try clicking by position where sidebar buttons should be
    const dockNav = ['Workspace', 'Orchestrator', 'Kanban', 'Synapse', 'Laboratory'];
    for (const name of dockNav) {
      const btn = page.getByRole('button', { name, exact: true });
      const visible = await btn.isVisible().catch(() => false);
      console.log(`  ${name}: accessible=${visible}`);
    }

    await snap(page, 'bug5-mobile-sidebar');
  });
});

// ─── BUG 6: Purple border artifacts ──────────────────────────────────────────
test.describe('BUG-6: Purple border artifacts', () => {
  test('Immerse and Roundtable views show purple edge artifacts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log('=== BUG-6 DIAGNOSTICS ===');

    // Immerse view
    await page.getByRole('button', { name: 'Immerse', exact: true }).click();
    await page.waitForTimeout(1000);
    await snap(page, 'bug6-immerse');

    // Check for purple/magenta colored elements outside main content
    const purpleElements = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      const purples: string[] = [];
      els.forEach(el => {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        const border = style.borderColor;
        // Check for purple-ish colors (high red + high blue, low green)
        const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          if (r > 100 && b > 100 && g < 50 && (r + b) > 200) {
            purples.push(`${el.tagName}.${el.className.substring(0, 30)} bg=${bg}`);
          }
        }
      });
      return purples;
    });
    console.log(`Immerse purple elements: ${purpleElements.length}`);
    purpleElements.slice(0, 5).forEach(p => console.log(`  ${p}`));

    // Roundtable view
    await page.getByRole('button', { name: 'Roundtable', exact: true }).click();
    await page.waitForTimeout(1000);
    await snap(page, 'bug6-roundtable');

    if (purpleElements.length > 0) {
      console.log('BUG-6 CONFIRMED: Purple elements found in view');
    }
  });
});

// ─── BUG 7: SEC_AUDIT without workspace ──────────────────────────────────────
test.describe('BUG-7: SEC_AUDIT without workspace', () => {
  test('SEC_AUDIT button activates scan with no workspace', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Make sure we're on workspace view with NO workspace active
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(500);

    console.log('=== BUG-7 DIAGNOSTICS ===');

    // Check for NO WORKSPACE indicator
    const noWs = page.locator('text=NO WORKSPACE');
    const noWsVisible = await noWs.isVisible().catch(() => false);
    console.log(`"NO WORKSPACE" shown: ${noWsVisible}`);

    // Find and click SEC_AUDIT
    const secAudit = page.locator('text=SEC_AUDIT').first();
    if (await secAudit.isVisible()) {
      console.log('SEC_AUDIT button: visible');
      const beforeText = await secAudit.textContent();

      await secAudit.click();
      await page.waitForTimeout(1000);

      // Check if it changed to SCANNING
      const scanningText = page.locator('text=SCANNING');
      const isScanning = await scanningText.isVisible().catch(() => false);
      console.log(`After click - shows SCANNING: ${isScanning}`);

      // Check if button was disabled or showed error
      const disabled = await secAudit.isDisabled().catch(() => false);
      console.log(`Button disabled: ${disabled}`);

      // Check for any error toast or message
      const errorToast = page.locator('[class*="toast"], [class*="error"], [class*="alert"]');
      const hasError = await errorToast.count();
      console.log(`Error messages shown: ${hasError}`);

      if (isScanning && !disabled && hasError === 0) {
        console.log('BUG-7 CONFIRMED: SEC_AUDIT scans without workspace, no error shown');
      }

      await snap(page, 'bug7-sec-audit-no-workspace');
    }
  });
});

// ─── BUG 8: Checkpoint API safePath ──────────────────────────────────────────
test.describe('BUG-8: Checkpoint API safePath', () => {
  test('checkpoint endpoints fail when WORKSPACE_PATH is project dir', async ({ request }, testInfo) => {
    console.log('=== BUG-8 DIAGNOSTICS ===');

    // Test 1: GET /api/checkpoints with a relative path (no workspace)
    const r1 = await request.get('/api/checkpoints?filePath=package.json');
    console.log(`GET /api/checkpoints?filePath=package.json → ${r1.status()}`);
    const body1 = await r1.json();
    console.log(`  body: ${JSON.stringify(body1).substring(0, 200)}`);

    // Test 2: POST /api/checkpoints for project file
    const r2 = await request.post('/api/checkpoints', {
      data: { filePath: 'README.md', summary: 'test' },
    });
    console.log(`POST /api/checkpoints (README.md) → ${r2.status()}`);
    const body2 = await r2.json();
    console.log(`  body: ${JSON.stringify(body2).substring(0, 200)}`);

    // Test 3: With isolated workspace
    let workspace: E2EWorkspace | null = null;
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-cp-bug8`);
      fs.writeFileSync(path.join(workspace.path, 'test-cp.txt'), 'checkpoint test\n');

      // Even with workspace active, checkpoint resolves against WORKSPACE_PATH not workspace
      const r3 = await request.post('/api/checkpoints', {
        data: { filePath: 'test-cp.txt', summary: 'test' },
      });
      console.log(`POST /api/checkpoints (test-cp.txt in workspace) → ${r3.status()}`);
      const body3 = await r3.json();
      console.log(`  body: ${JSON.stringify(body3).substring(0, 200)}`);

      if (r3.status() === 500 && JSON.stringify(body3).includes('Access Denied')) {
        console.log('BUG-8 CONFIRMED: Checkpoint API blocked by safePath even with active workspace');
      } else if (r3.ok()) {
        console.log('BUG-8 NOT REPRODUCED: Checkpoint succeeded (server CWD may differ)');
      }
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });
});
