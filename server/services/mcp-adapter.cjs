/**
 * Optimized MCP Server Adapter for NeuralDeck Backend
 * 
 * Bridges the TypeScript MCP optimization module with the CommonJS backend.
 * Provides optimized tool execution with connection pooling, caching, and metrics.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Import existing utilities from server.cjs context
// These will be injected when the adapter is initialized
let runCommand, validateCommand, validateCommandPaths, EXEC_OPTIONS, COMMAND_TIMEOUT;
let WORKSPACE_PATH, NEURALDECK_DIR;

/**
 * MCP Tool Registry with optimized lookup
 */
class MCPToolRegistry {
  constructor() {
    this.tools = new Map();
    this.categories = new Map();
    this.cache = new Map(); // LRU cache for tool metadata
    this.maxCacheSize = 1000;
  }

  register(name, handler, metadata = {}) {
    const tool = {
      name,
      handler,
      metadata: {
        category: 'general',
        description: '',
        parameters: {},
        ...metadata
      },
      usageCount: 0,
      avgExecutionTime: 0,
      lastUsed: 0
    };

    const lowerName = name.toLowerCase();
    this.tools.set(lowerName, tool);

    // Add to cache immediately
    this.addToCache(lowerName, tool);

    // Index by category
    const category = tool.metadata.category;
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(lowerName);
  }

  find(name) {
    const lowerName = name.toLowerCase();
    
    // Check cache first
    if (this.cache.has(lowerName)) {
      const tool = this.cache.get(lowerName);
      this.cache.delete(lowerName);
      this.cache.set(lowerName, tool); // Move to end (most recent)
      return tool;
    }

    // Exact match
    const tool = this.tools.get(lowerName);
    if (tool) {
      this.addToCache(lowerName, tool);
      return tool;
    }

    return null;
  }

  findFuzzy(name, limit = 5) {
    const results = [];
    const lowerName = name.toLowerCase();

    // Exact match first
    const exact = this.find(name);
    if (exact) {
      results.push({ tool: exact, score: 1.0 });
    }

    // Partial matches
    for (const [toolName, tool] of this.tools) {
      if (toolName.includes(lowerName) || lowerName.includes(toolName)) {
        const score = this.calculateSimilarity(lowerName, toolName);
        if (!results.find(r => r.tool.name === tool.name)) {
          results.push({ tool, score });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  getAll() {
    return Array.from(this.tools.values());
  }

  getByCategory(category) {
    const toolNames = this.categories.get(category) || [];
    return toolNames.map(name => this.tools.get(name)).filter(Boolean);
  }

  recordUsage(name, executionTime) {
    const tool = this.tools.get(name.toLowerCase());
    if (tool) {
      tool.usageCount++;
      tool.lastUsed = Date.now();
      tool.avgExecutionTime = tool.avgExecutionTime === 0
        ? executionTime
        : (tool.avgExecutionTime * 0.9) + (executionTime * 0.1);
    }
  }

  getMostUsed(limit = 10) {
    return this.getAll()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  getStats() {
    const tools = this.getAll();
    return {
      totalTools: tools.length,
      categories: this.categories.size,
      cacheSize: this.cache.size,
      mostUsed: tools
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10)
        .map(t => ({ name: t.name, usageCount: t.usageCount }))
    };
  }

  addToCache(key, tool) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, tool);
  }

  calculateSimilarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    const distance = this.levenshteinDistance(a, b);
    return 1 - (distance / maxLen);
  }

  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

/**
 * Connection Pool for MCP operations
 */
class MCPConnectionPool {
  constructor(config = {}) {
    this.config = {
      maxConnections: config.maxConnections || 50,
      minConnections: config.minConnections || 5,
      idleTimeoutMs: config.idleTimeoutMs || 300000,
      maxUsageCount: config.maxUsageCount || 1000,
      ...config
    };
    
    this.connections = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      total: 0
    };
  }

  async initialize() {
    // Pre-warm connections
    for (let i = 0; i < this.config.minConnections; i++) {
      this.createConnection(`default-${i}`);
    }
  }

  createConnection(endpoint) {
    const conn = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      endpoint,
      created: Date.now(),
      lastUsed: Date.now(),
      usageCount: 0,
      isHealthy: true
    };
    
    this.connections.set(conn.id, conn);
    return conn;
  }

  getConnection(endpoint = 'default') {
    // Find available connection
    for (const conn of this.connections.values()) {
      if (conn.endpoint === endpoint && 
          conn.isHealthy && 
          Date.now() - conn.lastUsed < this.config.idleTimeoutMs &&
          conn.usageCount < this.config.maxUsageCount) {
        conn.lastUsed = Date.now();
        conn.usageCount++;
        this.metrics.hits++;
        return conn;
      }
    }

    // Evict oldest if at capacity
    if (this.connections.size >= this.config.maxConnections) {
      this.evictOldest();
    }

    // Create new connection
    this.metrics.misses++;
    return this.createConnection(endpoint);
  }

  evictOldest() {
    let oldest = null;
    let oldestTime = Date.now();

    for (const conn of this.connections.values()) {
      if (conn.lastUsed < oldestTime) {
        oldestTime = conn.lastUsed;
        oldest = conn;
      }
    }

    if (oldest) {
      this.connections.delete(oldest.id);
    }
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      totalConnections: this.connections.size
    };
  }
}

/**
 * MCP Metrics Collector
 */
class MCPMetricsCollector {
  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      toolLookupTime: 0,
      startupTime: 0,
      connectionPoolHits: 0,
      connectionPoolMisses: 0
    };
    this.responseTimes = [];
    this.maxBufferSize = 10000;
    this.startTime = Date.now();
  }

  recordRequest(latencyMs) {
    this.metrics.requestCount++;
    this.updateResponseTimes(latencyMs);
  }

  recordError() {
    this.metrics.errorCount++;
  }

  recordToolLookup(latencyMs) {
    this.metrics.toolLookupTime = this.metrics.toolLookupTime === 0
      ? latencyMs
      : (this.metrics.toolLookupTime * 0.9) + (latencyMs * 0.1);
  }

  recordStartup(latencyMs) {
    this.metrics.startupTime = latencyMs;
  }

  recordConnectionPoolHit() {
    this.metrics.connectionPoolHits++;
  }

  recordConnectionPoolMiss() {
    this.metrics.connectionPoolMisses++;
  }

  updateResponseTimes(latency) {
    this.responseTimes.push(latency);
    if (this.responseTimes.length > this.maxBufferSize) {
      this.responseTimes.shift();
    }

    // Update statistics
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    this.metrics.avgResponseTime = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    this.metrics.p95ResponseTime = sorted[p95Index] || 0;
    const p99Index = Math.floor(sorted.length * 0.99);
    this.metrics.p99ResponseTime = sorted[p99Index] || 0;
  }

  getHealthStatus() {
    const errorRate = this.metrics.requestCount > 0 
      ? this.metrics.errorCount / this.metrics.requestCount 
      : 0;

    let status = 'healthy';
    if (errorRate > 0.1) status = 'critical';
    else if (errorRate > 0.05) status = 'warning';

    return {
      status,
      errorRate,
      avgResponseTime: this.metrics.avgResponseTime,
      p95ResponseTime: this.metrics.p95ResponseTime,
      uptime: Date.now() - this.startTime
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      health: this.getHealthStatus(),
      uptime: Date.now() - this.startTime
    };
  }

  getSnapshot() {
    return {
      metrics: this.getMetrics(),
      health: this.getHealthStatus(),
      uptime: Date.now() - this.startTime
    };
  }

  exportMetrics() {
    return JSON.stringify(this.getSnapshot(), null, 2);
  }
}

/**
 * Optimized MCP Server
 */
class OptimizedMCPServerAdapter {
  constructor(config = {}) {
    this.registry = new MCPToolRegistry();
    this.connectionPool = new MCPConnectionPool(config.connectionPool);
    this.metrics = new MCPMetricsCollector();
    this.initialized = false;
    this.startTime = 0;
  }

  async initialize(deps) {
    if (this.initialized) return;

    const start = Date.now();
    
    // Inject dependencies from server.cjs
    runCommand = deps.runCommand;
    validateCommand = deps.validateCommand;
    validateCommandPaths = deps.validateCommandPaths;
    EXEC_OPTIONS = deps.EXEC_OPTIONS;
    COMMAND_TIMEOUT = deps.COMMAND_TIMEOUT;
    WORKSPACE_PATH = deps.WORKSPACE_PATH;
    NEURALDECK_DIR = deps.NEURALDECK_DIR;

    // Initialize connection pool
    await this.connectionPool.initialize();

    // Register built-in tools
    this.registerBuiltinTools();

    this.initialized = true;
    this.startTime = Date.now();
    
    const startupTime = Date.now() - start;
    this.metrics.recordStartup(startupTime);
    
    console.log(`[OptimizedMCP] Initialized in ${startupTime}ms with ${this.registry.getAll().length} tools`);
  }

  registerBuiltinTools() {
    // Shell execution tool
    this.registry.register('shell_exec', async (args, context) => {
      const cmd = args?.command || args;
      const { clientIp, fastify } = context;

      // Validate
      const cmdValidation = validateCommand(cmd, clientIp);
      if (!cmdValidation.valid) {
        throw new Error(cmdValidation.reason);
      }

      const pathValidation = validateCommandPaths(cmd, clientIp);
      if (!pathValidation.valid) {
        throw new Error(pathValidation.reason);
      }

      // Execute
      const startTime = Date.now();
      const result = await runCommand(cmd, EXEC_OPTIONS, COMMAND_TIMEOUT);
      const executionTime = Date.now() - startTime;

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: typeof result.exitCode === 'number' ? result.exitCode : 1,
        executionTime,
        timedOut: !!result.timedOut
      };
    }, {
      category: 'system',
      description: 'Execute shell commands with validation',
      parameters: {
        command: { type: 'string', required: true }
      }
    });

    // Git log tool
    this.registry.register('git_log', async (args) => {
      const count = typeof args?.count === 'number' ? Math.min(Math.max(1, args.count), 100) : 10;
      const skip = typeof args?.skip === 'number' ? Math.max(0, args.skip) : 0;

      const cmd = `git log --pretty=format:'%h|||%an|||%ad|||%s' --date=short -n ${count} --skip ${skip}`;

      return new Promise((resolve, reject) => {
        exec(cmd, EXEC_OPTIONS, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }
          
          const lines = stdout.split('\n').filter(l => l.trim()).map(l => {
            const [hash, author, date, message] = l.split('|||');
            return { hash, author, date, message };
          });
          
          resolve({ commits: lines });
        });
      });
    }, {
      category: 'git',
      description: 'Get git commit history',
      parameters: {
        count: { type: 'number', required: false },
        skip: { type: 'number', required: false }
      }
    });

    // File read tool
    this.registry.register('file_read', async (args) => {
      const filePath = args?.path || args;
      if (!filePath) {
        throw new Error('Path is required');
      }

      const fullPath = path.join(WORKSPACE_PATH, filePath);
      
      // Security check
      if (!fullPath.startsWith(WORKSPACE_PATH)) {
        throw new Error('Path traversal detected');
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        return { content, size: content.length };
      } catch (err) {
        throw new Error(`Failed to read file: ${err.message}`);
      }
    }, {
      category: 'files',
      description: 'Read file contents',
      parameters: {
        path: { type: 'string', required: true }
      }
    });

    // File write tool
    this.registry.register('file_write', async (args) => {
      const { path: filePath, content } = args || {};
      if (!filePath || content === undefined) {
        throw new Error('Path and content are required');
      }

      const fullPath = path.join(WORKSPACE_PATH, filePath);
      
      // Security check
      if (!fullPath.startsWith(WORKSPACE_PATH)) {
        throw new Error('Path traversal detected');
      }

      try {
        fs.writeFileSync(fullPath, content, 'utf-8');
        return { success: true, size: content.length };
      } catch (err) {
        throw new Error(`Failed to write file: ${err.message}`);
      }
    }, {
      category: 'files',
      description: 'Write file contents',
      parameters: {
        path: { type: 'string', required: true },
        content: { type: 'string', required: true }
      }
    });

    // NPM install tool
    this.registry.register('npm_install', async (args) => {
      const pkg = args?.package || args;
      if (!pkg) {
        throw new Error('Package name is required');
      }

      const cmd = `npm install ${pkg}`;
      const result = await runCommand(cmd, EXEC_OPTIONS, COMMAND_TIMEOUT);

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }, {
      category: 'npm',
      description: 'Install npm package',
      parameters: {
        package: { type: 'string', required: true }
      }
    });

    // NPM uninstall tool
    this.registry.register('npm_uninstall', async (args) => {
      const pkg = args?.package || args;
      if (!pkg) {
        throw new Error('Package name is required');
      }

      const cmd = `npm uninstall ${pkg}`;
      const result = await runCommand(cmd, EXEC_OPTIONS, COMMAND_TIMEOUT);

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }, {
      category: 'npm',
      description: 'Uninstall npm package',
      parameters: {
        package: { type: 'string', required: true }
      }
    });
  }

  async executeTool(toolName, args, context) {
    if (!this.initialized) {
      throw new Error('MCP server not initialized');
    }

    const startTime = Date.now();
    
    // Get connection from pool
    const conn = this.connectionPool.getConnection();

    // Find tool
    const lookupStart = performance.now();
    const tool = this.registry.find(toolName);
    const lookupTime = performance.now() - lookupStart;
    this.metrics.recordToolLookup(lookupTime);

    if (!tool) {
      this.metrics.recordError();
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        executionTime: Date.now() - startTime,
        tool: toolName
      };
    }

    try {
      // Execute tool
      const result = await tool.handler(args, context);
      
      const executionTime = Date.now() - startTime;
      this.metrics.recordRequest(executionTime);
      this.registry.recordUsage(toolName, executionTime);

      return {
        success: true,
        result,
        executionTime,
        tool: toolName
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.metrics.recordError();

      return {
        success: false,
        error: error.message,
        executionTime,
        tool: toolName
      };
    }
  }

  getTools() {
    return this.registry.getAll().map(t => ({
      name: t.name,
      description: t.metadata.description,
      category: t.metadata.category,
      parameters: t.metadata.parameters
    }));
  }

  getMetrics() {
    return {
      server: this.metrics.getMetrics(),
      registry: this.registry.getStats(),
      connections: this.connectionPool.getMetrics(),
      uptime: Date.now() - this.startTime
    };
  }

  getHealthStatus() {
    return this.metrics.getHealthStatus();
  }
}

// Singleton instance
let mcpAdapter = null;

function getMCPAdapter() {
  if (!mcpAdapter) {
    mcpAdapter = new OptimizedMCPServerAdapter();
  }
  return mcpAdapter;
}

module.exports = {
  OptimizedMCPServerAdapter,
  getMCPAdapter,
  MCPToolRegistry,
  MCPConnectionPool,
  MCPMetricsCollector
};
