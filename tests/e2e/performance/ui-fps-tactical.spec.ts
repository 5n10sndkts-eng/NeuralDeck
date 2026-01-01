/**
 * E2E Performance Test: UI FPS with Tactical Mode (10 agents)
 * 
 * ASR-2: UI Performance at Scale (Score: 9 - BLOCK)
 * Test ID: PERF-001
 * Priority: P0
 * 
 * Validates: UI maintains 60fps with 10 agent tasks (Tactical Mode)
 */

import { test, expect } from '../../support/fixtures';

test('[P0] @perf UI maintains 60fps with 10 agent tasks (Tactical Mode)', async ({ page, request }) => {
  // GIVEN: Application loaded with 10 active agents
  await page.goto('/');
  
  // Create 10 agent tasks via API (fast setup)
  const agentPromises = Array.from({ length: 10 }, (_, i) =>
    request.post('/api/agents/create', {
      data: { storyId: `story-${i}`, agentType: 'developer' }
    })
  );
  await Promise.all(agentPromises);

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
  
  const avgFPS = fpsMetrics.reduce((a: number, b: number) => a + b, 0) / fpsMetrics.length;
  const minFPS = Math.min(...fpsMetrics);
  
  expect(avgFPS).toBeGreaterThanOrEqual(60);
  expect(minFPS).toBeGreaterThanOrEqual(55); // Allow 5fps tolerance for measurement variance
  
  // Verify ReactFlow remains responsive
  await page.getByTestId('neural-grid').click({ position: { x: 100, y: 100 } });
  await expect(page.getByTestId('neural-grid')).toBeVisible();
});
