/**
 * Performance Monitoring Helper
 * 
 * Provides utilities for FPS monitoring, memory tracking, and performance metrics
 * in E2E tests.
 */

export interface FPSMetrics {
  average: number;
  minimum: number;
  maximum: number;
  samples: number[];
}

export interface MemoryMetrics {
  used: number;
  total: number;
  limit: number;
}

/**
 * Start FPS monitoring in the browser
 * Returns a function to stop monitoring and get results
 */
export function startFPSMonitoring(page: any): () => Promise<FPSMetrics> {
  return page.evaluate(() => {
    (window as any).__fpsMetrics = [];
    let lastTime = performance.now();
    let frameCount = 0;
    let isRunning = true;
    
    const measureFPS = () => {
      if (!isRunning) return;
      
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
    
    // Return stop function
    (window as any).__stopFPSMonitoring = () => {
      isRunning = false;
      const metrics = (window as any).__fpsMetrics || [];
      const samples = metrics;
      const average = samples.reduce((a: number, b: number) => a + b, 0) / samples.length;
      const minimum = Math.min(...samples);
      const maximum = Math.max(...samples);
      
      return { average, minimum, maximum, samples };
    };
  }).then(() => {
    return async () => {
      return await page.evaluate(() => {
        if ((window as any).__stopFPSMonitoring) {
          return (window as any).__stopFPSMonitoring();
        }
        return { average: 0, minimum: 0, maximum: 0, samples: [] };
      });
    };
  });
}

/**
 * Get current memory usage
 */
export async function getMemoryMetrics(page: any): Promise<MemoryMetrics | null> {
  return await page.evaluate(() => {
    const memory = (performance as any).memory;
    if (!memory) return null;
    
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
    };
  });
}

/**
 * Wait for stable FPS (no major drops for specified duration)
 */
export async function waitForStableFPS(
  page: any,
  targetFPS: number = 60,
  duration: number = 5000,
  tolerance: number = 5
): Promise<boolean> {
  const stopMonitoring = await startFPSMonitoring(page);
  
  await page.waitForTimeout(duration);
  
  const metrics = await stopMonitoring();
  
  // Check if average FPS meets target and minimum is within tolerance
  return metrics.average >= targetFPS && metrics.minimum >= (targetFPS - tolerance);
}
