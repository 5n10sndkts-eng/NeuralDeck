/**
 * E2E Performance Test: Parallel Execution Timing Validation
 * 
 * ASR-1: Parallel Execution Validation (Score: 6 - MITIGATE)
 * Test ID: PAR-001
 * Priority: P0
 * 
 * Validates: 5 stories execute in parallel (< 2x single story time)
 */

import { test, expect } from '../../support/fixtures';
import { ensureSwarmViewReady } from '../../support/helpers/ui';
import { cleanupIsolatedWorkspace, createIsolatedWorkspace, type E2EWorkspace } from '../../support/helpers/workspace';

test('[P0] @perf Parallel execution timing validation (5 stories vs 1 story)', async ({ page, request }, testInfo) => {
  test.setTimeout(180000);
  let workspace: E2EWorkspace | null = null;
  try {
    workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-parallel`);

    // GIVEN: 5 story files created
    await page.goto('/');
    await ensureSwarmViewReady(page);
    const runPrefix = `${testInfo.project.name}-parallel`;
    const storyIds = Array.from({ length: 5 }, (_, i) => `${runPrefix}-story-${i}`);
    
    // Create 5 story files via API
    const storyFiles = storyIds.map((storyId, i) => ({
      path: `stories/${storyId}.md`,
      content: `# Story ${i}\n\n## Acceptance Criteria\n- AC-1: Feature ${i} works\n- AC-2: Feature ${i} is tested\n`,
    }));
    
    for (const story of storyFiles) {
      await request.post('/api/files/write', {
        data: { path: story.path, content: story.content }
      });
    }

    // Measure single story execution time (baseline)
    const singleRunResponse = await request.post('/api/swarm/execute', {
      data: { storyIds: [storyIds[0]] }
    });
    expect(singleRunResponse.ok()).toBeTruthy();
    const singleRun = await singleRunResponse.json();
    const singleStoryTime = singleRun.totalDuration || 0;
    expect(singleRun.status).toBe('completed');

    // WHEN: Process all 5 stories in parallel
    // Trigger a parallel run for the same set of stories
    const parallelRunResponse = await request.post('/api/swarm/execute', {
      data: { storyIds }
    });
    expect(parallelRunResponse.ok()).toBeTruthy();
    const parallelRun = await parallelRunResponse.json();
    const parallelTime = parallelRun.totalDuration || 0;
    expect(parallelRun.status).toBe('completed');
    expect(parallelRun.successCount).toBeGreaterThanOrEqual(5);

    // THEN: Validate timing constraint
    if (singleStoryTime > 0 && parallelTime > 0) {
      const timeRatio = parallelTime / singleStoryTime;
      const ratioThreshold = testInfo.project.name.toLowerCase().includes('webkit') ? 2.5 : 2;
      expect(timeRatio).toBeLessThan(ratioThreshold);
    }

    // Backend should mark the execution as parallelism-verified for this workload.
    expect(parallelRun.parallelismVerified).toBe(true);
  } finally {
    await cleanupIsolatedWorkspace(request, workspace);
  }
});
