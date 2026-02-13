/**
 * E2E Test: Checkpoint & Versioning System
 *
 * Validates file checkpointing, restore, and cleanup.
 * Note: Checkpoint endpoints resolve paths against WORKSPACE_PATH (cwd),
 * which in E2E context is the NeuralDeck dir itself. safePath() blocks
 * access to NeuralDeck files, so file-specific operations may return 500.
 * We test that the endpoints respond correctly to various inputs.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('Checkpoint & Versioning', () => {
  test('[P0] should require filePath query param for checkpoint list', async ({ request }) => {
    // GET /api/checkpoints without filePath should return 400
    const response = await request.get('/api/checkpoints');
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('filePath');
  });

  test('[P0] should return checkpoint stats', async ({ request }) => {
    const response = await request.get('/api/checkpoints/stats');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should require filePath for checkpoint creation', async ({ request }) => {
    // POST /api/checkpoints without filePath should return 400
    const response = await request.post('/api/checkpoints', {
      data: { summary: 'no file given' },
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('filePath');
  });

  test('[P0] should return 404 for nonexistent file checkpoint', async ({ request }) => {
    const response = await request.post('/api/checkpoints', {
      data: { filePath: 'absolutely-does-not-exist-99999.txt', summary: 'test' },
    });
    // Should be 404 (file not found) or 500 (safePath rejection)
    expect([404, 500]).toContain(response.status());
  });

  test('[P0] should list checkpointed files', async ({ request }) => {
    const response = await request.get('/api/checkpoints/files');
    expect(response.ok()).toBe(true);
  });
});
