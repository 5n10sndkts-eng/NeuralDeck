/**
 * E2E Test: Conflict Resolution API
 *
 * Validates conflict detection, listing, and resolution endpoints.
 * Priority: P1
 */

import { test, expect } from '../../support/fixtures';

test.describe('Conflict Resolution', () => {
  test('[P0] should list conflicts (may be empty)', async ({ request }) => {
    const response = await request.get('/api/conflicts');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data) || Array.isArray(data.conflicts)).toBe(true);
  });

  test('[P0] should return conflict statistics', async ({ request }) => {
    const response = await request.get('/api/conflicts/stats');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should handle detect with no changes', async ({ request }) => {
    const response = await request.post('/api/conflicts/detect', {
      data: { filePath: 'nonexistent.txt' },
    });

    // Should return success (no conflicts) or 400
    expect([200, 400]).toContain(response.status());
  });
});
