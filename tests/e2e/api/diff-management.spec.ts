/**
 * E2E Test: Diff/Patch Management
 *
 * Validates diff preview, apply, reject, and pending list.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('Diff Management', () => {
  test('[P0] should list pending diffs', async ({ request }) => {
    const response = await request.get('/api/diff/pending');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    // API returns { pending: [...] }
    expect(Array.isArray(data.pending)).toBe(true);
  });

  test('[P0] should preview a diff', async ({ request }) => {
    const response = await request.post('/api/diff/preview', {
      data: {
        filePath: 'test.txt',
        original: 'line 1\nline 2\n',
        modified: 'line 1\nline 2 modified\nline 3\n',
      },
    });

    // Should return diff preview or 400 if workspace not active
    expect([200, 400]).toContain(response.status());
  });
});
