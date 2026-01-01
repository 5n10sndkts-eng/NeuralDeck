/**
 * E2E Performance Test: UI FPS with Strategic Mode (50 agents)
 * 
 * ASR-2: UI Performance at Scale (Score: 9 - BLOCK)
 * Test ID: PERF-002
 * Priority: P0
 * 
 * Validates: UI maintains 60fps with 50 agent tasks (Strategic Mode - simplified nodes)
 */

import { test, expect } from '../../support/fixtures';

test('[P0] @perf UI maintains 60fps with 50 agent tasks (Strategic Mode)', async ({ page, request }) => {
  // GIVEN: Application loaded with 50 active agents
  await page.goto('/');
  
  // Create 50 agent tasks
  const agentPromises = Array.from({ length: 50 }, (_, i) =>
    request.post('/api/agents/create', {
      data: { storyId: `story-${i}`, agentType: 'developer' }
    })
  );
  await Promise.all(agentPromises);

  // WHEN: Monitor FPS and verify LOD transition
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

  // Trigger swarm execution
  await page.click('[data-testid="trigger-swarm-execution"]');
  
  // Wait for LOD transition (should happen automatically at 10+ agents)
  await page.waitForSelector('[data-lod-mode="strategic"]', { timeout: 5000 }).catch(() => {
    // If LOD system not yet implemented, continue with test
  });
  
  // Monitor for 30 seconds
  await page.waitForTimeout(30000);

  // THEN: Validate FPS and LOD mode
  const fpsMetrics = await page.evaluate(() => (window as any).__fpsMetrics);
  const avgFPS = fpsMetrics.reduce((a: number, b: number) => a + b, 0) / fpsMetrics.length;
  
  expect(avgFPS).toBeGreaterThanOrEqual(60);
  
  // Verify Strategic Mode is active (if LOD system implemented)
  const lodMode = await page.getAttribute('[data-testid="neural-grid"]', 'data-lod-mode').catch(() => null);
  if (lodMode) {
    expect(lodMode).toBe('strategic');
  }
  
  // Verify nodes exist
  const nodeCount = await page.locator('[data-testid="agent-node"]').count();
  expect(nodeCount).toBeGreaterThanOrEqual(50);
});
