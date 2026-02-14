/**
 * DIAGNOSTIC: Full end-to-end verification of all NeuralDeck features.
 * This test opens a REAL browser, interacts with the UI, and reports exactly what works and what doesn't.
 */
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:3001/api';

// Helper: Get auth token
async function getAuthToken(): Promise<string> {
  const res = await fetch(`${API}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'diagnostic-test' }),
  });
  const data = await res.json();
  return data.token;
}

// Helper: dismiss workspace manager if it appears
async function dismissWorkspaceManager(page: Page) {
  try {
    const wsManager = page.getByText('WORKSPACE MANAGER');
    if (await wsManager.isVisible({ timeout: 2000 })) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch {
    // Not visible, continue
  }
}

test.describe('DIAGNOSTIC: Full Feature Verification', () => {
  test.setTimeout(120_000);

  test('1. Backend health check', async () => {
    const res = await fetch('http://localhost:3001/health');
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data.status).toBe('ONLINE');
    console.log('✅ Backend is ONLINE, uptime:', data.uptime);
  });

  test('2. Auth system works', async () => {
    const res = await fetch(`${API}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user' }),
    });
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data.token).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    console.log('✅ Auth session creation works, token received');
  });

  test('3. Workspace API works with auth', async () => {
    const token = await getAuthToken();
    const res = await fetch(`${API}/workspaces`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data.workspaces).toBeDefined();
    console.log(`✅ Workspace API works, ${data.workspaces.length} workspaces found`);
    console.log('   Active workspace:', data.active?.name || 'NONE');
  });

  test('4. Frontend loads and renders', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check main app elements
    const title = page.getByText('NEURAL DECK');
    await expect(title).toBeVisible({ timeout: 10000 });
    console.log('✅ Frontend renders successfully');
  });

  test('5. Console errors check', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Filter out expected errors (like LLM connection)
    const criticalErrors = errors.filter(e =>
      !e.includes('localhost:8000') &&
      !e.includes('LLM') &&
      !e.includes('AI Provider') &&
      !e.includes('favicon') &&
      !e.includes('WebSocket') &&
      !e.includes('Socket')
    );

    if (criticalErrors.length > 0) {
      console.log('⚠️ Console errors found:');
      criticalErrors.forEach(e => console.log('   ', e));
    } else {
      console.log('✅ No critical console errors');
    }
  });

  test('6. Auth flow in browser - no excessive sessions', async ({ page }) => {
    const authRequests: string[] = [];

    page.on('response', async (res) => {
      if (res.url().includes('/api/auth/session') && res.request().method() === 'POST') {
        authRequests.push(res.url());
      }
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log(`Auth session creation calls: ${authRequests.length}`);
    if (authRequests.length <= 2) {
      console.log('✅ Auth deduplication working (≤2 session calls)');
    } else {
      console.log(`⚠️ ${authRequests.length} auth sessions created (expected ≤2)`);
    }
  });

  test('7. Workspace Manager opens and lists workspaces', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissWorkspaceManager(page);
    await page.waitForTimeout(500);

    // Click workspace button to open dropdown
    const wsButton = page.locator('[data-testid="workspace-menu-button"]');
    await expect(wsButton).toBeVisible({ timeout: 5000 });
    await wsButton.click();
    await page.waitForTimeout(500);

    // Click "Open Workspace..."
    const openWsBtn = page.locator('[data-testid="workspace-menu-open"]');
    await expect(openWsBtn).toBeVisible({ timeout: 2000 });
    await openWsBtn.click();
    await page.waitForTimeout(1000);

    // Check workspace manager is visible
    const wsTitle = page.getByText('WORKSPACE MANAGER');
    await expect(wsTitle).toBeVisible({ timeout: 3000 });
    console.log('✅ Workspace Manager opens');

    // Check workspace list
    const recentLabel = page.getByText('RECENT WORKSPACES');
    await expect(recentLabel).toBeVisible({ timeout: 2000 });
    console.log('✅ RECENT WORKSPACES section visible');

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/diagnostic-workspace-manager.png' });
  });

  test('8. Clicking a workspace activates it', async ({ page }) => {
    const apiResponses: { url: string; status: number; method: string }[] = [];

    page.on('response', async (res) => {
      if (res.url().includes('/api/workspaces') || res.url().includes('/api/files')) {
        apiResponses.push({ url: res.url(), status: res.status(), method: res.request().method() });
      }
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissWorkspaceManager(page);
    await page.waitForTimeout(500);

    // Open workspace manager
    const wsButton = page.locator('[data-testid="workspace-menu-button"]');
    await wsButton.click();
    await page.waitForTimeout(500);
    const openWsBtn = page.locator('[data-testid="workspace-menu-open"]');
    await openWsBtn.click();
    await page.waitForTimeout(1000);

    // Wait for workspace manager to be fully rendered
    await expect(page.getByText('WORKSPACE MANAGER')).toBeVisible({ timeout: 3000 });

    // Find workspace items by looking for path-like text (contains /)
    const workspaceItems = page.locator('.cursor-pointer').filter({ hasText: /\// });
    const count = await workspaceItems.count();
    console.log(`Found ${count} workspace items`);

    if (count > 0) {
      // Click the first workspace item - use force to bypass viewport issues
      const firstItem = workspaceItems.first();
      await firstItem.scrollIntoViewIfNeeded();
      await firstItem.click({ force: true });
      await page.waitForTimeout(2000);

      // Check if workspace manager closed (meaning activation succeeded)
      const stillOpen = await page.getByText('WORKSPACE MANAGER').isVisible({ timeout: 1000 }).catch(() => false);

      if (!stillOpen) {
        console.log('✅ Workspace activated and manager closed');
      } else {
        // Check for error in the manager
        const errorEl = page.locator('[style*="ff4466"]');
        const errorText = await errorEl.textContent().catch(() => null);
        if (errorText) {
          console.log(`❌ Workspace activation error: ${errorText}`);
        } else {
          console.log('⚠️ Workspace manager still open after clicking');
        }
      }
    } else {
      console.log('⚠️ No workspace items found to click');
    }

    // Report API calls
    const failures = apiResponses.filter(r => r.status >= 400);
    if (failures.length > 0) {
      console.log('❌ API failures:');
      failures.forEach(f => console.log(`   ${f.method} ${f.status} ${f.url}`));
    } else if (apiResponses.length > 0) {
      console.log(`✅ ${apiResponses.length} workspace/files API calls all succeeded`);
    }
  });

  test('9. Chat sends message and handles LLM error gracefully', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissWorkspaceManager(page);

    // Find the terminal input - it uses a specific pattern
    const chatInput = page.locator('input[type="text"]').last();
    const hasInput = await chatInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInput) {
      await chatInput.fill('hello');
      await chatInput.press('Enter');
      await page.waitForTimeout(5000);

      // Check for a response (even if error)
      const messages = page.locator('[class*="AGENT"], [class*="agent"]');
      const msgCount = await messages.count().catch(() => 0);

      // Check if the error message is user-friendly (not raw "Method Not Allowed")
      const pageContent = await page.textContent('body');
      if (pageContent?.includes('System > Connections') || pageContent?.includes('System (⚙️)')) {
        console.log('✅ Chat error provides actionable guidance (mentions System > Connections)');
      } else if (pageContent?.includes('Method Not Allowed')) {
        console.log('❌ Chat shows raw "Method Not Allowed" error (should be user-friendly)');
      } else if (pageContent?.includes('SYSTEM ALERT')) {
        console.log('⚠️ Chat shows SYSTEM ALERT (LLM not available, but handled)');
      } else {
        console.log('⚠️ Chat message sent, response state unclear');
      }
    } else {
      console.log('❌ Chat input not found');
    }
  });

  test('10. LLM server diagnostics', async () => {
    // Check what's at port 8000
    try {
      const rootRes = await fetch('http://localhost:8000/');
      const contentType = rootRes.headers.get('content-type') || '';
      const server = rootRes.headers.get('server') || 'unknown';
      console.log(`Port 8000: ${rootRes.status} ${rootRes.statusText} (${contentType}, server: ${server})`);

      if (contentType.includes('text/html')) {
        console.log('⚠️ Port 8000 is serving HTML (not an OpenAI-compatible LLM server)');
      }
    } catch (e: any) {
      console.log(`Port 8000: Not reachable (${e.message})`);
    }

    // Test chat/completions
    try {
      const chatRes = await fetch('http://localhost:8000/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'hi' }] }),
      });
      console.log(`/v1/chat/completions: ${chatRes.status} ${chatRes.statusText}`);
      if (chatRes.status === 405) {
        console.log('⚠️ Server at port 8000 does NOT support OpenAI chat completions');
        console.log('   → User needs to configure a real LLM in System > Connections');
      }
    } catch (e: any) {
      console.log(`/v1/chat/completions: Unreachable (${e.message})`);
    }
  });

  test('11. All sidebar views navigate correctly', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissWorkspaceManager(page);

    // CyberDock uses aria-label for view buttons
    const views = [
      { label: 'Workspace', mode: 'workspace' },
      { label: 'Orchestrator', mode: 'orchestrator' },
      { label: 'Kanban', mode: 'board' },
      { label: 'Synapse', mode: 'synapse' },
      { label: 'Laboratory', mode: 'laboratory' },
      { label: 'Roundtable', mode: 'roundtable' },
      { label: 'Construct', mode: 'construct' },
      { label: 'Immerse', mode: 'construct-3d' },
      { label: 'Grid', mode: 'grid' },
      { label: 'Git', mode: 'git' },
      { label: 'System', mode: 'connections' },
    ];

    for (const { label, mode } of views) {
      try {
        const viewBtn = page.locator(`button[aria-label="${label}"]`);
        const isVisible = await viewBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (isVisible) {
          await viewBtn.click();
          await page.waitForTimeout(1500);

          // Check for crashes
          const hasError = await page.locator('text=Something went wrong').isVisible({ timeout: 500 }).catch(() => false);
          const hasModuleOffline = await page.locator('text=MODULE_OFFLINE').isVisible({ timeout: 500 }).catch(() => false);

          if (hasError) {
            console.log(`   ❌ ${label}: CRASH`);
          } else if (hasModuleOffline) {
            console.log(`   ❌ ${label}: MODULE_OFFLINE`);
          } else {
            console.log(`   ✅ ${label}: renders`);
          }
        } else {
          console.log(`   ⚠️ ${label}: button not found (aria-label="${label}")`);
        }
      } catch (e: any) {
        console.log(`   ❌ ${label}: Error - ${e.message?.substring(0, 80)}`);
      }
    }
  });

  test('12. Keyboard shortcuts work', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissWorkspaceManager(page);

    // Test Cmd+K opens command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    const cmdPaletteInput = page.locator('input[placeholder*="search"], input[placeholder*="command"], [role="combobox"]');
    const hasCmdPalette = await cmdPaletteInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasCmdPalette) {
      // Check for palette container
      const paletteText = page.getByText('Command Palette').first();
      const hasPaletteText = await paletteText.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(hasPaletteText ? '✅ Cmd+K opens command palette' : '❌ Cmd+K does NOT open command palette');
    } else {
      console.log('✅ Cmd+K opens command palette');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Test ? shows keyboard help
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    const keyHelp = page.getByText('Keyboard Shortcuts').first();
    const hasKeyHelp = await keyHelp.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(hasKeyHelp ? '✅ ? shows keyboard shortcuts help' : '⚠️ ? does NOT show keyboard help');
    if (hasKeyHelp) await page.keyboard.press('Escape');
  });

  test('13. Performance check', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const fpsText = page.getByText(/FPS:\d+/);
    const hasFps = await fpsText.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasFps) {
      const fpsValue = await fpsText.textContent();
      console.log(`✅ FPS indicator: ${fpsValue}`);
    } else {
      console.log('⚠️ FPS indicator not found');
    }
  });

  test('14. Socket.IO connection check', async ({ page }) => {
    const socketEvents: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Socket]')) {
        socketEvents.push(text);
      }
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('Socket events:');
    socketEvents.forEach(e => console.log(`   ${e}`));

    const connected = socketEvents.some(e => e.includes('Connected successfully'));
    const authError = socketEvents.some(e => e.includes('Authentication required'));

    if (connected) {
      console.log('✅ Socket.IO connected successfully');
    } else if (authError) {
      console.log('❌ Socket.IO auth failed - "Authentication required"');
    } else {
      console.log('⚠️ Socket.IO connection state unclear');
    }
  });

  test('15. Screenshots of all key states', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/diagnostic-initial-load.png' });
    console.log('📸 Initial load screenshot saved');

    // Navigate to System/Connections view
    const systemBtn = page.locator('button[aria-label="System"]');
    if (await systemBtn.isVisible({ timeout: 3000 })) {
      await systemBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/e2e/screenshots/diagnostic-system-view.png' });
      console.log('📸 System/Connections view screenshot saved');
    }
  });
});
