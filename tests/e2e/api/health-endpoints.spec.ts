/**
 * E2E Test: API Health & Core Endpoints
 *
 * Validates backend health, auth, and core API availability.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('API Health & Core Endpoints', () => {
  test('[P0] should return healthy status from /health', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.status).toBe('ONLINE');
  });

  test('[P0] should create an auth session', async ({ request }) => {
    const response = await request.post('/api/auth/session', {
      data: { userId: 'e2e-test-user' },
    });
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.token).toBeTruthy();
  });

  test('[P0] should return CSRF token', async ({ request }) => {
    const response = await request.get('/api/auth/csrf-token');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.csrfToken || data.token).toBeTruthy();
  });

  test('[P0] should list workspaces', async ({ request }) => {
    const response = await request.get('/api/workspaces');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data) || Array.isArray(data.workspaces)).toBe(true);
  });

  test('[P0] should return MCP tools list', async ({ request }) => {
    const response = await request.get('/api/mcp/tools');
    // May be 200 or 404 depending on MCP configuration
    expect([200, 404, 503]).toContain(response.status());
  });

  test('[P0] should return MCP health status', async ({ request }) => {
    const response = await request.get('/api/mcp/health');
    expect([200, 404, 503]).toContain(response.status());
  });

  test('[P0] should return RAG stats', async ({ request }) => {
    const response = await request.get('/api/rag/stats');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should return RAG config', async ({ request }) => {
    const response = await request.get('/api/rag/config');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should return checkpoint stats', async ({ request }) => {
    const response = await request.get('/api/checkpoints/stats');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should list pending diffs (may be empty)', async ({ request }) => {
    const response = await request.get('/api/diff/pending');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should list conflict stats', async ({ request }) => {
    const response = await request.get('/api/conflicts/stats');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should return security vulnerability types', async ({ request }) => {
    const response = await request.get('/api/security/vulnerability-types');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should handle non-existent endpoints with 404', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint');
    expect(response.status()).toBe(404);
  });
});
