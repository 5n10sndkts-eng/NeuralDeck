import fs from 'fs';
import os from 'os';
import path from 'path';
import type { APIRequestContext } from '@playwright/test';

export interface E2EWorkspace {
  id: string;
  path: string;
}

export async function createIsolatedWorkspace(
  request: APIRequestContext,
  name: string
): Promise<E2EWorkspace> {
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const workspacePath = path.join(os.tmpdir(), `neuraldeck-e2e-${safeName}-${Date.now()}`);
  fs.mkdirSync(workspacePath, { recursive: true });
  fs.writeFileSync(path.join(workspacePath, 'README.md'), '# E2E Workspace\n', 'utf-8');

  const addResponse = await request.post('/api/workspaces', {
    data: {
      path: workspacePath,
      name: `E2E ${name}`,
    },
  });

  if (!addResponse.ok()) {
    throw new Error(`Failed to create workspace: ${addResponse.status()} ${await addResponse.text()}`);
  }

  const addData = await addResponse.json();
  const workspaceId = addData?.workspace?.id;
  if (!workspaceId) {
    throw new Error('Workspace API did not return an id');
  }

  const activateResponse = await request.post(`/api/workspaces/${workspaceId}/activate`);
  if (!activateResponse.ok()) {
    throw new Error(`Failed to activate workspace ${workspaceId}: ${activateResponse.status()}`);
  }

  return { id: workspaceId, path: workspacePath };
}

export async function cleanupIsolatedWorkspace(
  request: APIRequestContext,
  workspace?: E2EWorkspace | null
): Promise<void> {
  if (!workspace) return;

  await request.delete(`/api/workspaces/${workspace.id}`).catch(() => {});
  fs.rmSync(workspace.path, { recursive: true, force: true });
}
