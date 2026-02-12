import fs from 'fs';
import path from 'path';
import { test, expect } from '../../support/fixtures';
import { cleanupIsolatedWorkspace, createIsolatedWorkspace, type E2EWorkspace } from '../../support/helpers/workspace';

test('[P0] Workspace menu supports importing a file into the active workspace', async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  let workspace: E2EWorkspace | null = null;

  try {
    workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-import`);
    await page.goto('/');

    // Menu renders
    await expect(page.getByTestId('workspace-menu-button')).toBeVisible();
    await page.getByTestId('workspace-menu-button').click();
    await expect(page.getByTestId('workspace-menu-import-file')).toBeVisible();
    await expect(page.getByTestId('workspace-menu-import-file')).toBeEnabled({ timeout: 15_000 });

    // Import a small text file via hidden input (stable cross-browser).
    await page.setInputFiles('[data-testid="workspace-import-files-input"]', {
      name: 'imported-hello.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello from import\n', 'utf-8'),
    });

    const destPath = path.join(workspace.path, 'imported-hello.txt');
    await expect
      .poll(() => (fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf-8') : null), { timeout: 15_000 })
      .toBe('hello from import\n');
  } finally {
    await cleanupIsolatedWorkspace(request, workspace);
  }
});
