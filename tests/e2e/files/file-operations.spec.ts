/**
 * E2E Test: File Operations
 *
 * Validates file CRUD operations through the API.
 * Uses isolated workspaces for test isolation.
 * Priority: P0
 */

import fs from 'fs';
import path from 'path';
import { test, expect } from '../../support/fixtures';
import { createIsolatedWorkspace, cleanupIsolatedWorkspace, type E2EWorkspace } from '../../support/helpers/workspace';

test.describe('File Operations', () => {
  let workspace: E2EWorkspace | null = null;

  test('[P0] should list files in workspace via API', async ({ request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-files-list`);

      fs.writeFileSync(path.join(workspace.path, 'test-file.ts'), 'export const x = 1;\n', 'utf-8');

      const response = await request.get('/api/files');
      expect(response.ok()).toBe(true);

      const data = await response.json();
      expect(Array.isArray(data) || Array.isArray(data.files)).toBe(true);
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should read a file via API', async ({ request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-files-read`);

      const testContent = 'console.log("hello world");\n';
      fs.writeFileSync(path.join(workspace.path, 'hello.js'), testContent, 'utf-8');

      const response = await request.post('/api/read', {
        data: { filePath: 'hello.js', workspaceId: workspace.id },
      });
      expect(response.ok()).toBe(true);

      const body = await response.text();
      expect(body).toContain('hello world');
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should write a file via API', async ({ request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-files-write`);

      const content = '# New File\nCreated by E2E test\n';

      // /api/write uses filePath (not path)
      const response = await request.post('/api/write', {
        data: { filePath: 'new-file.md', content, workspaceId: workspace.id },
      });
      expect(response.ok()).toBe(true);

      const filePath = path.join(workspace.path, 'new-file.md');
      await expect
        .poll(() => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null), { timeout: 5_000 })
        .toBe(content);
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should create a file via API', async ({ request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-files-create`);

      // /api/files/create requires type: 'file' or 'directory'
      const response = await request.post('/api/files/create', {
        data: { path: 'created-file.txt', type: 'file', workspaceId: workspace.id },
      });

      expect([200, 201]).toContain(response.status());
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should rename a file via API', async ({ request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-files-rename`);

      fs.writeFileSync(path.join(workspace.path, 'old-name.txt'), 'rename me\n', 'utf-8');

      const response = await request.post('/api/files/rename', {
        data: { oldPath: 'old-name.txt', newPath: 'new-name.txt', workspaceId: workspace.id },
      });
      expect(response.ok()).toBe(true);

      const newFilePath = path.join(workspace.path, 'new-name.txt');
      await expect
        .poll(() => fs.existsSync(newFilePath), { timeout: 5_000 })
        .toBe(true);
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should delete a file via API', async ({ request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-files-delete`);

      fs.writeFileSync(path.join(workspace.path, 'delete-me.txt'), 'goodbye\n', 'utf-8');

      const response = await request.delete('/api/files', {
        data: { path: 'delete-me.txt', workspaceId: workspace.id },
      });
      expect(response.ok()).toBe(true);

      const filePath = path.join(workspace.path, 'delete-me.txt');
      await expect
        .poll(() => fs.existsSync(filePath), { timeout: 5_000 })
        .toBe(false);
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should require path param for file check', async ({ request }) => {
    // WHEN checking without path param
    const response = await request.get('/api/files/check');
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('path');
  });

  test('[P0] should block path traversal in file check', async ({ request }) => {
    const response = await request.get('/api/files/check?path=../../etc/passwd');
    // safePath should reject traversal
    expect(response.status()).toBe(500);
  });
});
