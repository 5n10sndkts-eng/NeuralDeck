/**
 * Optimized MCP Server
 * 
 * High-performance MCP server implementation with connection pooling,
 * fast tool registry, load balancing, and comprehensive metrics.
 */

import { ConnectionPool, MCPConnection } from './connection-pool';
import { FastToolRegistry, ToolMetadata, ToolHandler } from './fast-tool-registry';
import { MCPLoadBalancer, RoutingStrategy, ServerInstance } from './load-balancer';
import { MCPMetricsCollector, HealthStatus } from './metrics';
import { OptimizedTransport, MCPMessage } from './optimized-transport';

interface OptimizedMCPConfig {
  // Connection pooling
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  connectionReuseEnabled: boolean;

  // Tool registry
  toolCacheSize: number;
  enableFuzzyMatching: boolean;

  // Load balancing
  routingStrategy: RoutingStrategy;
  healthCheckIntervalMs: number;

  // Transport
  compressionEnabled: boolean;
  batchingEnabled: boolean;
  batchTimeoutMs: number;

  // Performance
  requestTimeoutMs: number;

  // Monitoring
  metricsEnabled: boolean;

  // Server identification
  serverName: string;
  serverVersion: string;
}

interface MCPServerCapabilities {
  tools: { listChanged: boolean };
  resources?: { subscribe: boolean; listChanged: boolean };
  prompts?: { listChanged: boolean };
}

interface ToolCallResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

const DEFAULT_CONFIG: Partial<OptimizedMCPConfig> = {
  maxConnections: 50,
  minConnections: 5,
  idleTimeoutMs: 300000,
  connectionReuseEnabled: true,
  toolCacheSize: 1000,
  enableFuzzyMatching: true,
  routingStrategy: 'least-connections',
  healthCheckIntervalMs: 30000,
  compressionEnabled: true,
  batchingEnabled: true,
  batchTimeoutMs: 10,
  requestTimeoutMs: 30000,
  metricsEnabled: true,
  serverName: 'neuraldeck-mcp',
  serverVersion: '2.0.0',
};

export class OptimizedMCPServer {
  private config: OptimizedMCPConfig;
  private connectionPool: ConnectionPool;
  private toolRegistry: FastToolRegistry;
  private loadBalancer: MCPLoadBalancer;
  private metrics: MCPMetricsCollector;
  private transport: OptimizedTransport | null = null;
  private tools: Map<string, { handler: ToolHandler; metadata: ToolMetadata }> = new Map();
  private isRunning: boolean = false;
  private startTime: number = 0;

  constructor(config: Partial<OptimizedMCPConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as OptimizedMCPConfig;
    
    // Initialize components
    this.connectionPool = new ConnectionPool(
      this.createConnection.bind(this),
      {
        maxConnections: this.config.maxConnections,
        minConnections: this.config.minConnections,
        idleTimeoutMs: this.config.idleTimeoutMs,
        maxUsageCount: 1000,
        healthCheckIntervalMs: this.config.healthCheckIntervalMs,
      }
    );

    this.toolRegistry = new FastToolRegistry({
      cacheSize: this.config.toolCacheSize,
      enableFuzzyMatching: this.config.enableFuzzyMatching,
    });

    this.loadBalancer = new MCPLoadBalancer({
      strategy: this.config.routingStrategy,
      healthCheckIntervalMs: this.config.healthCheckIntervalMs,
      unhealthyThreshold: 3,
    });

    this.metrics = new MCPMetricsCollector((health) => {
      this.onHealthStatusChange(health);
    });
  }

  /**
   * Register a tool with the server
   */
  registerTool(name: string, handler: ToolHandler, metadata: ToolMetadata): void {
    this.tools.set(name, { handler, metadata });
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: Array<{ name: string; handler: ToolHandler; metadata: ToolMetadata }>): void {
    for (const tool of tools) {
      this.registerTool(tool.name, tool.handler, tool.metadata);
    }
  }

  /**
   * Start the optimized MCP server
   */
  async start(transport?: OptimizedTransport): Promise<void> {
    if (this.isRunning) {
      console.warn('[OptimizedMCPServer] Server already running');
      return;
    }

    const startupStart = performance.now();
    console.log(`[OptimizedMCPServer] Starting ${this.config.serverName} v${this.config.serverVersion}`);

    try {
      // Build tool index
      await this.buildToolIndex();

      // Initialize connection pool
      await this.connectionPool.initialize();

      // Initialize load balancer
      this.loadBalancer.initialize();

      // Setup transport
      if (transport) {
        this.transport = transport;
        this.transport.onMessage(this.handleMessage.bind(this));
      }

      this.isRunning = true;
      this.startTime = Date.now();

      // Record startup metrics
      const startupTime = performance.now() - startupStart;
      this.metrics.recordStartup(startupTime);

      console.log(`[OptimizedMCPServer] Started successfully in ${startupTime.toFixed(2)}ms`);
      console.log(`[OptimizedMCPServer] Registered ${this.tools.size} tools`);
      
    } catch (err) {
      console.error('[OptimizedMCPServer] Failed to start:', err);
      throw err;
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[OptimizedMCPServer] Stopping...');

    // Flush transport
    if (this.transport) {
      await this.transport.flush();
    }

    // Shutdown components
    await this.connectionPool.shutdown();
    this.loadBalancer.shutdown();

    this.isRunning = false;
    console.log('[OptimizedMCPServer] Stopped');
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, args: any): Promise<ToolCallResult> {
    const startTime = performance.now();

    // Find tool
    const toolEntry = this.toolRegistry.findToolFuzzy(toolName);
    if (!toolEntry) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        executionTime: performance.now() - startTime,
      };
    }

    // Record tool lookup time
    const lookupTime = performance.now() - startTime;
    this.metrics.recordToolLookup(lookupTime);

    try {
      // Execute tool
      const result = await toolEntry.handler(args);
      
      const executionTime = performance.now() - startTime;
      
      // Record metrics
      this.metrics.recordRequest(executionTime);
      this.toolRegistry.recordToolUsage(toolName, executionTime);

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (err) {
      const executionTime = performance.now() - startTime;
      this.metrics.recordError();

      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        executionTime,
      };
    }
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): MCPServerCapabilities {
    return {
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
      prompts: { listChanged: true },
    };
  }

  /**
   * Get all registered tools
   */
  getTools(): Array<{ name: string; metadata: ToolMetadata }> {
    return this.toolRegistry.getAllTools().map(entry => ({
      name: entry.name,
      metadata: entry.metadata,
    }));
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      server: this.metrics.getMetrics(),
      connectionPool: this.connectionPool.getMetrics(),
      loadBalancer: this.loadBalancer.getMetrics(),
      transport: this.transport?.getStats(),
      toolRegistry: this.toolRegistry.getStats(),
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): HealthStatus {
    return this.metrics.getHealthStatus();
  }

  /**
   * Get complete server snapshot
   */
  getSnapshot() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      metrics: this.getMetrics(),
      health: this.getHealthStatus(),
      tools: this.getTools(),
      capabilities: this.getCapabilities(),
    };
  }

  private async buildToolIndex(): Promise<void> {
    const toolArray = Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      handler: tool.handler,
      metadata: tool.metadata,
    }));

    await this.toolRegistry.buildIndex(toolArray);
  }

  private async createConnection(endpoint: string): Promise<MCPConnection> {
    // Simulate connection creation
    // In production, this would create actual MCP connections
    const connection: MCPConnection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      endpoint,
      isHealthy: true,
      async connect() {
        console.log(`[MCPConnection] Connected to ${endpoint}`);
      },
      async disconnect() {
        console.log(`[MCPConnection] Disconnected from ${endpoint}`);
      },
    };

    await connection.connect();
    return connection;
  }

  private async handleMessage(message: MCPMessage): Promise<void> {
    if (message.type === 'request' && message.payload.method === 'tools/call') {
      const { name, arguments: args } = message.payload.params;
      const result = await this.executeTool(name, args);

      // Send response
      if (this.transport) {
        await this.transport.send({
          id: `resp-${message.id}`,
          type: 'response',
          payload: {
            requestId: message.id,
            result: result.success ? result.result : null,
            error: result.error,
          },
          timestamp: Date.now(),
        });
      }
    }
  }

  private onHealthStatusChange(health: HealthStatus): void {
    console.warn(`[OptimizedMCPServer] Health status changed: ${health.status}`);
    
    if (health.status === 'critical') {
      console.error('[OptimizedMCPServer] CRITICAL: Error rate or pool hit rate unacceptable');
    }
  }
}

export type {
  OptimizedMCPConfig,
  MCPServerCapabilities,
  ToolCallResult,
};

// Re-export components for convenience
export { ConnectionPool } from './connection-pool';
export type { MCPConnection, ConnectionPoolConfig, PoolMetrics } from './connection-pool';
export { FastToolRegistry } from './fast-tool-registry';
export type { ToolIndexEntry, ToolRegistryConfig } from './fast-tool-registry';
export { MCPLoadBalancer } from './load-balancer';
export type { RoutingStrategy, ServerInstance, LoadBalancerConfig, LoadBalancerMetrics } from './load-balancer';
export { MCPMetricsCollector } from './metrics';
export type { MCPMetrics, HealthStatus, MetricsSnapshot } from './metrics';
export { OptimizedTransport } from './optimized-transport';
export type { MCPMessage, TransportConfig, TransportStats } from './optimized-transport';
