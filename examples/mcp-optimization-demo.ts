/**
 * MCP Optimization Example
 * 
 * This example demonstrates how to use the optimized MCP server
 * with connection pooling, fast tool registry, and load balancing.
 */

import {
  OptimizedMCPServer,
  createOptimizedServer,
  validatePerformanceTargets,
  benchmarkTool,
} from '../src/core/mcp';

// Example tool implementations
const tools = [
  {
    name: 'shell_exec',
    handler: async (args: { command: string }) => {
      // Simulate shell execution
      return {
        stdout: `Executed: ${args.command}`,
        stderr: '',
        exitCode: 0,
      };
    },
    metadata: {
      name: 'shell_exec',
      description: 'Execute shell commands',
      category: 'system',
      parameters: {
        command: { type: 'string', required: true },
      },
    },
  },
  {
    name: 'git_log',
    handler: async (args: { count?: number }) => {
      // Simulate git log
      return {
        commits: [
          { hash: 'abc123', message: 'Initial commit' },
          { hash: 'def456', message: 'Add feature' },
        ].slice(0, args.count || 10),
      };
    },
    metadata: {
      name: 'git_log',
      description: 'Get git commit history',
      category: 'git',
      parameters: {
        count: { type: 'number', required: false },
      },
    },
  },
  {
    name: 'file_read',
    handler: async (args: { path: string }) => {
      // Simulate file read
      return {
        content: `Contents of ${args.path}`,
        size: 1024,
      };
    },
    metadata: {
      name: 'file_read',
      description: 'Read file contents',
      category: 'files',
      parameters: {
        path: { type: 'string', required: true },
      },
    },
  },
];

async function main() {
  console.log('=== MCP Optimization Demo ===\n');

  // Create optimized server
  const server = createOptimizedServer({
    name: 'neuraldeck-demo',
    version: '2.0.0',
    enableCompression: true,
    enableBatching: true,
    maxConnections: 10,
    toolCacheSize: 100,
  });

  // Register tools
  console.log('Registering tools...');
  for (const tool of tools) {
    server.registerTool(tool.name, tool.handler, tool.metadata);
  }

  // Start server
  console.log('Starting server...\n');
  await server.start();

  // Get server info
  const snapshot = server.getSnapshot();
  console.log('Server Status:', {
    isRunning: snapshot.isRunning,
    uptime: snapshot.uptime,
    toolCount: snapshot.tools.length,
  });

  console.log('\nRegistered Tools:');
  for (const tool of snapshot.tools) {
    console.log(`  - ${tool.name} (${tool.metadata.category})`);
  }

  // Execute some tools
  console.log('\n=== Tool Execution Demo ===\n');

  const testCalls = [
    { tool: 'shell_exec', args: { command: 'ls -la' } },
    { tool: 'git_log', args: { count: 5 } },
    { tool: 'file_read', args: { path: '/etc/config' } },
  ];

  for (const call of testCalls) {
    console.log(`Executing: ${call.tool}`);
    const result = await server.executeTool(call.tool, call.args);
    console.log(`  Success: ${result.success}`);
    console.log(`  Time: ${result.executionTime.toFixed(2)}ms`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log();
  }

  // Get metrics
  console.log('=== Metrics ===\n');
  const metrics = server.getMetrics();
  console.log('Server Metrics:', {
    requests: metrics.server.requestCount,
    errors: metrics.server.errorCount,
    avgResponseTime: metrics.server.avgResponseTime.toFixed(2) + 'ms',
    p95ResponseTime: metrics.server.p95ResponseTime.toFixed(2) + 'ms',
  });

  console.log('Tool Registry:', metrics.toolRegistry);
  console.log('Connection Pool:', metrics.connectionPool);

  // Validate performance targets
  console.log('\n=== Performance Validation ===\n');
  const validation = validatePerformanceTargets({
    startupTime: metrics.server.startupTime,
    avgResponseTime: metrics.server.avgResponseTime,
    p95ResponseTime: metrics.server.p95ResponseTime,
    poolHitRate: metrics.connectionPool.poolHits / 
      (metrics.connectionPool.poolHits + metrics.connectionPool.poolMisses || 1),
    toolLookupTime: metrics.server.toolLookupTime,
  });

  if (validation.passed) {
    console.log('✅ All performance targets met!');
  } else {
    console.log('⚠️  Performance targets not met:');
    for (const failure of validation.failures) {
      console.log(`  - ${failure}`);
    }
  }

  // Get health status
  console.log('\n=== Health Status ===\n');
  const health = server.getHealthStatus();
  console.log(`Status: ${health.status.toUpperCase()}`);
  console.log(`Error Rate: ${(health.errorRate * 100).toFixed(2)}%`);
  console.log(`Pool Hit Rate: ${(health.poolHitRate * 100).toFixed(2)}%`);

  // Shutdown
  console.log('\nShutting down...');
  await server.stop();
  console.log('Done!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
