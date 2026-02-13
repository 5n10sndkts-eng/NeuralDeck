/**
 * E2E Test: Configuration & API Key Management
 *
 * Validates key listing, saving, and deletion endpoints.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('Config & API Key Management', () => {
  test('[P0] should list API keys', async ({ request }) => {
    const response = await request.get('/api/config/keys');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(typeof data).toBe('object');
  });

  test('[P0] should get a specific provider key (may be empty)', async ({ request }) => {
    const response = await request.get('/api/config/keys/openai');
    // Should return 200 (with key or empty) or 404 (not configured)
    expect([200, 404]).toContain(response.status());
  });

  test('[P0] should save and delete a test API key', async ({ request }) => {
    const testProvider = 'e2e-test-provider';

    // WHEN saving a key — API expects { apiKey: '...' } not { key: '...' }
    const saveResponse = await request.post(`/api/config/keys/${testProvider}`, {
      data: { apiKey: 'test-key-12345' },
    });
    expect(saveResponse.ok()).toBe(true);

    // THEN we should be able to retrieve it
    const getResponse = await request.get(`/api/config/keys/${testProvider}`);
    expect(getResponse.ok()).toBe(true);

    // Cleanup: delete the test key
    const deleteResponse = await request.delete(`/api/config/keys/${testProvider}`);
    expect(deleteResponse.ok()).toBe(true);
  });
});
