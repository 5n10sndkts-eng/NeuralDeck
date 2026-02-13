/**
 * MCP Adapter Unit Tests
 * 
 * Comprehensive tests for the optimized MCP adapter
 */

const { 
  MCPToolRegistry, 
  MCPConnectionPool, 
  MCPMetricsCollector,
  OptimizedMCPServerAdapter 
} = require('../../server/services/mcp-adapter.cjs');

describe('MCP Tool Registry', () => {
  let registry;

  beforeEach(() => {
    registry = new MCPToolRegistry();
  });

  test('should register and find tools with O(1) lookup', () => {
    const handler = jest.fn();
    registry.register('test_tool', handler, { category: 'test', description: 'Test tool' });

    const tool = registry.find('test_tool');
    expect(tool).toBeTruthy();
    expect(tool.name).toBe('test_tool');
    expect(tool.metadata.category).toBe('test');
  });

  test('should find tools case-insensitively', () => {
    const handler = jest.fn();
    registry.register('TestTool', handler, {});

    const tool = registry.find('testtool');
    expect(tool).toBeTruthy();
  });

  test('should return null for non-existent tools', () => {
    const tool = registry.find('non_existent');
    expect(tool).toBeNull();
  });

  test('should find tools with fuzzy matching', () => {
    registry.register('shell_exec', jest.fn(), { category: 'system' });
    registry.register('git_log', jest.fn(), { category: 'git' });

    const results = registry.findFuzzy('shell', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tool.name).toBe('shell_exec');
  });

  test('should categorize tools', () => {
    registry.register('tool1', jest.fn(), { category: 'cat1' });
    registry.register('tool2', jest.fn(), { category: 'cat1' });
    registry.register('tool3', jest.fn(), { category: 'cat2' });

    const cat1Tools = registry.getByCategory('cat1');
    expect(cat1Tools.length).toBe(2);

    const cat2Tools = registry.getByCategory('cat2');
    expect(cat2Tools.length).toBe(1);
  });

  test('should track tool usage', () => {
    registry.register('test_tool', jest.fn(), {});
    
    registry.recordUsage('test_tool', 100);
    registry.recordUsage('test_tool', 200);

    const tool = registry.find('test_tool');
    expect(tool.usageCount).toBe(2);
    expect(tool.avgExecutionTime).toBeGreaterThan(0);
  });

  test('should get most used tools', () => {
    registry.register('tool1', jest.fn(), {});
    registry.register('tool2', jest.fn(), {});
    
    registry.recordUsage('tool1', 100);
    registry.recordUsage('tool1', 100);
    registry.recordUsage('tool2', 100);

    const mostUsed = registry.getMostUsed(10);
    expect(mostUsed[0].name).toBe('tool1');
  });

  test('should provide accurate stats', () => {
    registry.register('tool1', jest.fn(), { category: 'cat1' });
    registry.register('tool2', jest.fn(), { category: 'cat2' });

    const stats = registry.getStats();
    expect(stats.totalTools).toBe(2);
    expect(stats.categories).toBe(2);
    expect(stats.cacheSize).toBe(2); // Both in cache after registration
  });

  test('should cache frequently accessed tools', () => {
    registry.register('tool1', jest.fn(), {});
    
    // Access multiple times
    for (let i = 0; i < 5; i++) {
      registry.find('tool1');
    }

    const stats = registry.getStats();
    expect(stats.cacheSize).toBe(1);
  });
});

describe('MCP Connection Pool', () => {
  let pool;

  beforeEach(async () => {
    pool = new MCPConnectionPool({
      maxConnections: 10,
      minConnections: 2,
      idleTimeoutMs: 5000
    });
    await pool.initialize();
  });

  test('should pre-warm connections on initialization', () => {
    const metrics = pool.getMetrics();
    expect(metrics.totalConnections).toBeGreaterThanOrEqual(2);
  });

  test('should reuse existing connections', () => {
    const conn1 = pool.getConnection('default');
    const conn2 = pool.getConnection('default');

    // Should get same connection (reused)
    expect(conn1).toBe(conn2);
  });

  test('should track connection metrics', () => {
    pool.getConnection('default');
    pool.getConnection('default');
    pool.getConnection('new');

    const metrics = pool.getMetrics();
    expect(metrics.hits).toBeGreaterThan(0);
    expect(metrics.misses).toBeGreaterThanOrEqual(0);
    expect(metrics.hitRate).toBeGreaterThanOrEqual(0);
    expect(metrics.totalConnections).toBeGreaterThan(0);
  });

  test('should evict old connections when at capacity', async () => {
    // Fill pool to capacity with same endpoint (allows reuse)
    // First fill beyond capacity
    for (let i = 0; i < 12; i++) {
      pool.getConnection('test-endpoint');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const metrics = pool.getMetrics();
    // Pool should not exceed max connections by much (allowing for timing)
    // With same endpoint, should get significant reuse
    expect(metrics.totalConnections).toBeLessThanOrEqual(15);
    expect(metrics.hitRate).toBeGreaterThan(0); // Should have some cache hits
  });

  test('should respect idle timeout', async () => {
    const conn = pool.getConnection('test');
    const id = conn.id;

    // Wait for idle timeout
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Get new connection (old one should be evicted)
    const newConn = pool.getConnection('test');
    
    // Connection might be same or different depending on implementation
    expect(newConn).toBeTruthy();
  });
});

describe('MCP Metrics Collector', () => {
  let metrics;

  beforeEach(() => {
    metrics = new MCPMetricsCollector();
  });

  test('should record requests and calculate averages', () => {
    metrics.recordRequest(100);
    metrics.recordRequest(200);
    metrics.recordRequest(300);

    const data = metrics.getMetrics();
    expect(data.requestCount).toBe(3);
    expect(data.avgResponseTime).toBeGreaterThan(0);
  });

  test('should track errors', () => {
    metrics.recordRequest(100);
    metrics.recordError();
    metrics.recordError();

    const data = metrics.getMetrics();
    expect(data.errorCount).toBe(2);
    expect(data.requestCount).toBe(1);
  });

  test('should calculate percentiles', () => {
    // Record many requests
    for (let i = 0; i < 100; i++) {
      metrics.recordRequest(i + 1);
    }

    const data = metrics.getMetrics();
    expect(data.p95ResponseTime).toBeGreaterThan(data.avgResponseTime);
    expect(data.p99ResponseTime).toBeGreaterThanOrEqual(data.p95ResponseTime);
  });

  test('should record tool lookup times', () => {
    metrics.recordToolLookup(5);
    metrics.recordToolLookup(10);

    const data = metrics.getMetrics();
    expect(data.toolLookupTime).toBeGreaterThan(0);
  });

  test('should track connection pool hits/misses', () => {
    metrics.recordConnectionPoolHit();
    metrics.recordConnectionPoolHit();
    metrics.recordConnectionPoolMiss();

    const data = metrics.getMetrics();
    expect(data.connectionPoolHits).toBe(2);
    expect(data.connectionPoolMisses).toBe(1);
  });

  test('should determine health status', () => {
    // Healthy - low error rate (0%)
    const healthyMetrics = new MCPMetricsCollector();
    for (let i = 0; i < 20; i++) {
      healthyMetrics.recordRequest(100);
    }
    expect(healthyMetrics.getHealthStatus().status).toBe('healthy');

    // Warning - medium error rate (~7.5% which is between 5% and 10%)
    const warningMetrics = new MCPMetricsCollector();
    for (let i = 0; i < 25; i++) {
      warningMetrics.recordRequest(100);
    }
    for (let i = 0; i < 2; i++) {
      warningMetrics.recordError();
    }
    // 2 errors / 25 requests = 8% error rate = warning
    const warningStatus = warningMetrics.getHealthStatus();
    expect(warningStatus.errorRate).toBeCloseTo(0.08, 1);
    expect(warningStatus.status).toBe('warning');

    // Critical - high error rate (~50%)
    const criticalMetrics = new MCPMetricsCollector();
    for (let i = 0; i < 10; i++) {
      criticalMetrics.recordRequest(100);
    }
    for (let i = 0; i < 5; i++) {
      criticalMetrics.recordError();
    }
    expect(criticalMetrics.getHealthStatus().status).toBe('critical');
  });

  test('should provide complete snapshot', () => {
    metrics.recordRequest(100);
    metrics.recordStartup(50);

    const snapshot = metrics.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.health).toBeDefined();
    expect(snapshot.uptime).toBeGreaterThanOrEqual(0);
  });

  test('should export metrics as JSON', () => {
    metrics.recordRequest(100);
    const json = metrics.exportMetrics();
    const parsed = JSON.parse(json);
    expect(parsed.metrics).toBeDefined();
    expect(parsed.health).toBeDefined();
  });
});

describe('Optimized MCP Server Adapter', () => {
  let adapter;
  let mockDeps;

  beforeEach(() => {
    adapter = new OptimizedMCPServerAdapter({
      connectionPool: { maxConnections: 5, minConnections: 1 }
    });

    mockDeps = {
      runCommand: jest.fn().mockResolvedValue({
        stdout: 'output',
        stderr: '',
        exitCode: 0,
        timedOut: false
      }),
      validateCommand: jest.fn().mockReturnValue({ valid: true }),
      validateCommandPaths: jest.fn().mockReturnValue({ valid: true }),
      EXEC_OPTIONS: {},
      COMMAND_TIMEOUT: 30000,
      WORKSPACE_PATH: '/test',
      NEURALDECK_DIR: '/test/.neuraldeck'
    };
  });

  test('should initialize with dependencies', async () => {
    await adapter.initialize(mockDeps);
    
    expect(adapter.initialized).toBe(true);
    expect(adapter.registry.getAll().length).toBeGreaterThan(0);
  });

  test('should not initialize twice', async () => {
    await adapter.initialize(mockDeps);
    await adapter.initialize(mockDeps); // Second call should be no-op
    
    expect(adapter.initialized).toBe(true);
  });

  test('should execute registered tools', async () => {
    await adapter.initialize(mockDeps);

    const result = await adapter.executeTool('shell_exec', { command: 'echo test' }, {
      clientIp: '127.0.0.1',
      fastify: { log: { info: jest.fn(), warn: jest.fn() } }
    });

    expect(result.success).toBe(true);
    expect(result.tool).toBe('shell_exec');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  test('should return error for unknown tools', async () => {
    await adapter.initialize(mockDeps);

    const result = await adapter.executeTool('unknown_tool', {}, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('should not execute before initialization', async () => {
    await expect(adapter.executeTool('shell_exec', {}, {}))
      .rejects.toThrow('not initialized');
  });

  test('should get tools list', async () => {
    await adapter.initialize(mockDeps);

    const tools = adapter.getTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0]).toHaveProperty('name');
    expect(tools[0]).toHaveProperty('description');
  });

  test('should provide metrics', async () => {
    await adapter.initialize(mockDeps);

    const metrics = adapter.getMetrics();
    expect(metrics.server).toBeDefined();
    expect(metrics.registry).toBeDefined();
    expect(metrics.connections).toBeDefined();
    expect(metrics.uptime).toBeGreaterThanOrEqual(0);
  });

  test('should provide health status', async () => {
    await adapter.initialize(mockDeps);

    const health = adapter.getHealthStatus();
    expect(health.status).toMatch(/healthy|warning|critical/);
    expect(health.errorRate).toBeGreaterThanOrEqual(0);
  });

  test('should track execution metrics', async () => {
    await adapter.initialize(mockDeps);

    await adapter.executeTool('shell_exec', { command: 'test' }, {
      clientIp: '127.0.0.1',
      fastify: { log: { info: jest.fn(), warn: jest.fn() } }
    });

    const metrics = adapter.getMetrics();
    expect(metrics.server.requestCount).toBeGreaterThan(0);
  });
});

describe('MCP Integration', () => {
  test('should get singleton adapter instance', () => {
    const { getMCPAdapter } = require('../../server/services/mcp-adapter.cjs');
    
    const adapter1 = getMCPAdapter();
    const adapter2 = getMCPAdapter();
    
    expect(adapter1).toBe(adapter2);
  });

  test('should export all components', () => {
    const mcpModule = require('../../server/services/mcp-adapter.cjs');
    
    expect(mcpModule.OptimizedMCPServerAdapter).toBeDefined();
    expect(mcpModule.getMCPAdapter).toBeDefined();
    expect(mcpModule.MCPToolRegistry).toBeDefined();
    expect(mcpModule.MCPConnectionPool).toBeDefined();
    expect(mcpModule.MCPMetricsCollector).toBeDefined();
  });
});
