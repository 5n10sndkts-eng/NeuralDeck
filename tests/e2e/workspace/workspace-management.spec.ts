/**
 * E2E Test: Workspace Management
 *
 * Validates workspace CRUD, switching, and validation.
 * Priority: P0
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { test, expect } from '../../support/fixtures';

test.describe('Workspace Management', () => {
  test('[P0] should create and activate a workspace', async ({ request }) => {
    const workspacePath = path.join(os.tmpdir(), `neuraldeck-e2e-create-${Date.now()}`);
    fs.mkdirSync(workspacePath, { recursive: true });
    fs.writeFileSync(path.join(workspacePath, 'README.md'), '# Test Workspace\n', 'utf-8');

    let workspaceId: string | null = null;

    try {
      // WHEN creating a workspace
      const createResponse = await request.post('/api/workspaces', {
        data: { path: workspacePath, name: 'E2E Test Workspace' },
      });
      expect(createResponse.ok()).toBe(true);

      const createData = await createResponse.json();
      workspaceId = createData?.workspace?.id;
      expect(workspaceId).toBeTruthy();

      // WHEN activating the workspace
      const activateResponse = await request.post(`/api/workspaces/${workspaceId}/activate`);
      expect(activateResponse.ok()).toBe(true);
    } finally {
      // Cleanup
      if (workspaceId) {
        await request.delete(`/api/workspaces/${workspaceId}`).catch(() => {});
      }
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  });

  test('[P0] should list all workspaces', async ({ request }) => {
    // WHEN listing workspaces
    const response = await request.get('/api/workspaces');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    const workspaces = Array.isArray(data) ? data : data.workspaces;
    expect(Array.isArray(workspaces)).toBe(true);
  });

  test('[P0] should validate workspace path', async ({ request }) => {
    // WHEN validating a valid path
    const validResponse = await request.post('/api/workspaces/validate', {
      data: { path: os.tmpdir() },
    });
    expect(validResponse.ok()).toBe(true);

    // WHEN validating a nonexistent path
    const invalidResponse = await request.post('/api/workspaces/validate', {
      data: { path: '/nonexistent/path/does/not/exist' },
    });
    // Should indicate invalid
    const invalidData = await invalidResponse.json();
    expect(invalidData.valid).toBeFalsy();
  });

  test('[P0] should delete a workspace', async ({ request }) => {
    const workspacePath = path.join(os.tmpdir(), `neuraldeck-e2e-delete-${Date.now()}`);
    fs.mkdirSync(workspacePath, { recursive: true });
    fs.writeFileSync(path.join(workspacePath, 'README.md'), '# Delete Me\n', 'utf-8');

    // Create workspace first
    const createResponse = await request.post('/api/workspaces', {
      data: { path: workspacePath, name: 'E2E Delete Test' },
    });
    const createData = await createResponse.json();
    const workspaceId = createData?.workspace?.id;

    try {
      // WHEN deleting
      const deleteResponse = await request.delete(`/api/workspaces/${workspaceId}`);
      expect(deleteResponse.ok()).toBe(true);

      // THEN it should no longer appear in the list
      const listResponse = await request.get('/api/workspaces');
      const listData = await listResponse.json();
      const workspaces = Array.isArray(listData) ? listData : listData.workspaces;
      const found = workspaces.find((w: any) => w.id === workspaceId);
      expect(found).toBeFalsy();
    } finally {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  });

  test('[P0] should show workspace menu button in UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Ensure we're in workspace view
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(500);

    // THEN the workspace menu button should be visible
    await expect(page.getByTestId('workspace-menu-button')).toBeVisible({ timeout: 10_000 });
  });

  test('[P0] should open workspace menu dropdown', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(500);

    // WHEN clicking the workspace menu button
    await page.getByTestId('workspace-menu-button').click();

    // THEN the dropdown menu should appear with options
    await expect(page.getByTestId('workspace-menu-open')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('workspace-menu-import-file')).toBeVisible();
    await expect(page.getByTestId('workspace-menu-import-folder')).toBeVisible();
  });

  test('[P0] should close workspace menu on Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Workspace', exact: true }).click();
    await page.waitForTimeout(500);

    // Open the menu
    await page.getByTestId('workspace-menu-button').click();
    await expect(page.getByTestId('workspace-menu-open')).toBeVisible({ timeout: 5_000 });

    // WHEN pressing Escape
    await page.keyboard.press('Escape');

    // THEN menu should close
    await expect(page.getByTestId('workspace-menu-open')).toBeHidden({ timeout: 3_000 });
  });
});
