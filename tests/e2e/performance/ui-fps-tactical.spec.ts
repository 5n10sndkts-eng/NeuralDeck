/**
 * E2E Performance Test: UI FPS with Tactical Mode (10 agents)
 * 
 * ASR-2: UI Performance at Scale (Score: 9 - BLOCK)
 * Test ID: PERF-001
 * Priority: P0
 * 
 * Validates: UI maintains stable FPS with 10 agent tasks (Tactical Mode)
 */

import { test, expect } from '../../support/fixtures';
import { ensureSwarmViewReady } from '../../support/helpers/ui';
import { cleanupIsolatedWorkspace, createIsolatedWorkspace, type E2EWorkspace } from '../../support/helpers/workspace';

test('[P0] @perf UI maintains stable FPS with 10 agent tasks (Tactical Mode)', async ({ page, request }, testInfo) => {
  test.setTimeout(120000);
  let workspace: E2EWorkspace | null = null;
  try {
    workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-tactical`);
    const runPrefix = `${testInfo.project.name}-tactical`;

    // Seed 10 stories before UI load so the grid can fetch a complete initial state.
    const storyWrites = Array.from({ length: 10 }, (_, i) =>
      request.post('/api/files/write', {
        data: {
          path: `stories/${runPrefix}-story-${i}.md`,
          content: `# ${runPrefix}-story-${i}\n\n## Acceptance Criteria\n- AC-1\n\n- [ ] Implement\n`,
        },
      })
    );
    await Promise.all(storyWrites);

    // GIVEN: Application loaded with 10 active agents
    await page.goto('/');
    await ensureSwarmViewReady(page);
    await page.waitForSelector(`[data-agent-id="${runPrefix}-story-0"]`, { timeout: 20000 });

    // Capture environment baseline (headless browsers can be throttled by host/CI constraints)
    const baselineFPS = await page.evaluate(async () => {
      const samples: number[] = [];
      let lastTime = performance.now();
      let frameCount = 0;

      return await new Promise<number>((resolve) => {
        const measureFPS = () => {
          frameCount++;
          const currentTime = performance.now();

          if (currentTime >= lastTime + 1000) {
            const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
            samples.push(fps);
            frameCount = 0;
            lastTime = currentTime;

            if (samples.length >= 3) {
              const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
              resolve(avg);
              return;
            }
          }

          requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
      });
    });

    // WHEN: Monitor frame rate during state transitions
    await page.evaluate(() => {
      (window as any).__fpsMetrics = [];
      let lastTime = performance.now();
      let frameCount = 0;
      
      const measureFPS = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime >= lastTime + 1000) {
          const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
          (window as any).__fpsMetrics.push(fps);
          
          frameCount = 0;
          lastTime = currentTime;
        }
        
        requestAnimationFrame(measureFPS);
      };
      
      requestAnimationFrame(measureFPS);
    });

    // Trigger agent state transitions
    await page.click('[data-testid="trigger-swarm-execution"]');
    
    // Wait for state transitions (30 seconds of monitoring)
    await page.waitForTimeout(30000);

    // THEN: Validate FPS metrics
    const fpsMetrics = await page.evaluate(() => (window as any).__fpsMetrics);
    expect(fpsMetrics.length).toBeGreaterThan(0);
    
    const avgFPS = fpsMetrics.reduce((a: number, b: number) => a + b, 0) / fpsMetrics.length;

    const avgFloor = Math.max(7, baselineFPS * 0.45);

    expect(avgFPS).toBeGreaterThanOrEqual(avgFloor);
    
    // Verify ReactFlow remains responsive
    await page.getByTestId('neural-grid').click({ position: { x: 100, y: 100 } });
    await expect(page.getByTestId('neural-grid')).toBeVisible();
  } finally {
    await cleanupIsolatedWorkspace(request, workspace);
  }
});
