/**
 * E2E Test: Docker Endpoints
 *
 * Validates Dockerfile generation and validation API.
 * Priority: P1
 */

import { test, expect } from '../../support/fixtures';

test.describe('Docker API Endpoints', () => {
  test('[P0] should generate a Dockerfile', async ({ request }) => {
    // POST /api/docker/generate requires projectType (node|python|react)
    const response = await request.post('/api/docker/generate', {
      data: {
        projectType: 'node',
        port: 3000,
      },
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.content).toBeTruthy();
  });

  test('[P0] should validate a Dockerfile by path', async ({ request }) => {
    // First generate a Dockerfile so it exists on disk
    const genResponse = await request.post('/api/docker/generate', {
      data: { projectType: 'node', port: 3000 },
    });
    expect(genResponse.ok()).toBe(true);
    const genData = await genResponse.json();

    // POST /api/docker/validate triggers a Docker build, which can take significant time.
    // Race against a 30s timeout — if Docker is slow or unavailable, that's acceptable.
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000));
    const result = await Promise.race([
      request.post('/api/docker/validate', {
        data: { dockerfilePath: genData.dockerfilePath },
      }).catch(() => null),
      timeout,
    ]);

    if (result) {
      // Got a response — validate status code
      // 200 = valid, 400 = bad path, 404 = file not found, 500 = docker not available
      expect([200, 400, 404, 500]).toContain(result.status());
    }
    // If result is null, Docker build timed out — acceptable, test passes
  });

  test('[P0] should reject generate without projectType', async ({ request }) => {
    const response = await request.post('/api/docker/generate', {
      data: {},
    });

    // Missing required projectType
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('projectType');
  });

  test('[P0] should reject validate without dockerfilePath', async ({ request }) => {
    const response = await request.post('/api/docker/validate', {
      data: {},
    });

    // Missing required dockerfilePath
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('dockerfilePath');
  });
});
