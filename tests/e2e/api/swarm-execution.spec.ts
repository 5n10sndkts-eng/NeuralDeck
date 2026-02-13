/**
 * E2E Test: Swarm/Agent Execution
 *
 * Validates agent creation, swarm execution API, and status polling.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';

test.describe('Swarm & Agent Execution', () => {
  test('[P0] should list swarm executions', async ({ request }) => {
    const response = await request.get('/api/swarm/executions');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should list stories', async ({ request }) => {
    const response = await request.get('/api/stories');
    expect(response.ok()).toBe(true);
  });

  test('[P0] should reject swarm execution with empty stories', async ({ request }) => {
    const response = await request.post('/api/swarm/execute', {
      data: { storyIds: [] },
    });

    // Should reject empty execution
    expect([400, 422]).toContain(response.status());
  });

  test('[P0] should return 404 for nonexistent execution status', async ({ request }) => {
    const response = await request.get('/api/swarm/status/nonexistent-id-12345');
    expect([404, 400]).toContain(response.status());
  });

  test('[P0] should handle cancel of nonexistent execution', async ({ request }) => {
    const response = await request.post('/api/swarm/cancel/nonexistent-id-12345');
    expect([404, 400]).toContain(response.status());
  });
});
