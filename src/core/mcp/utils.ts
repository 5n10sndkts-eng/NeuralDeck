/**
 * MCP Optimization Utilities
 * 
 * Helper functions for creating and configuring optimized MCP servers.
 */

import { OptimizedMCPServer, OptimizedMCPConfig } from './mcp-server';

interface ServerOptions {
  name?: string;
  version?: string;
  enableCompression?: boolean;
  enableBatching?: boolean;
  maxConnections?: number;
  toolCacheSize?: number;
  onHealthChange?: (status: { status: 'healthy' | 'warning' | 'critical' }) => void;
}

/**
 * Create a pre-configured optimized MCP server
 */
export function createOptimizedServer(options: ServerOptions = {}): OptimizedMCPServer {
  const config: Partial<OptimizedMCPConfig> = {
    serverName: options.name || 'neuraldeck-mcp',
    serverVersion: options.version || '2.0.0',
    compressionEnabled: options.enableCompression !== false,
    batchingEnabled: options.enableBatching !== false,
    maxConnections: options.maxConnections || 50,
    toolCacheSize: options.toolCacheSize || 1000,
    metricsEnabled: true,
  };

  const server = new OptimizedMCPServer(config);

  return server;
}

/**
 * Performance target validation
 */
export function validatePerformanceTargets(metrics: {
  startupTime: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  poolHitRate: number;
  toolLookupTime: number;
}): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  // Target: Startup < 400ms
  if (metrics.startupTime > 400) {
    failures.push(`Startup time ${metrics.startupTime.toFixed(2)}ms exceeds target of 400ms`);
  }

  // Target: Avg response < 100ms
  if (metrics.avgResponseTime > 100) {
    failures.push(`Avg response time ${metrics.avgResponseTime.toFixed(2)}ms exceeds target of 100ms`);
  }

  // Target: P95 response < 200ms
  if (metrics.p95ResponseTime > 200) {
    failures.push(`P95 response time ${metrics.p95ResponseTime.toFixed(2)}ms exceeds target of 200ms`);
  }

  // Target: Pool hit rate > 90%
  if (metrics.poolHitRate < 0.9) {
    failures.push(`Pool hit rate ${(metrics.poolHitRate * 100).toFixed(1)}% below target of 90%`);
  }

  // Target: Tool lookup < 5ms
  if (metrics.toolLookupTime > 5) {
    failures.push(`Tool lookup time ${metrics.toolLookupTime.toFixed(2)}ms exceeds target of 5ms`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Benchmark tool execution
 */
export async function benchmarkTool(
  server: OptimizedMCPServer,
  toolName: string,
  args: any,
  iterations: number = 100
): Promise<{
  avgTime: number;
  p95Time: number;
  p99Time: number;
  minTime: number;
  maxTime: number;
  successRate: number;
}> {
  const times: number[] = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = await server.executeTool(toolName, args);
    const time = performance.now() - start;

    times.push(time);
    if (result.success) {
      successCount++;
    }
  }

  times.sort((a, b) => a - b);

  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const p95Index = Math.floor(times.length * 0.95);
  const p99Index = Math.floor(times.length * 0.99);

  return {
    avgTime: avg,
    p95Time: times[p95Index],
    p99Time: times[p99Index],
    minTime: times[0],
    maxTime: times[times.length - 1],
    successRate: successCount / iterations,
  };
}

export type { ServerOptions };
