/**
 * MCP Optimization Module
 * 
 * High-performance MCP server implementation with:
 * - Connection pooling and reuse
 * - O(1) tool lookup with caching
 * - Intelligent load balancing
 * - Optimized transport layer
 * - Comprehensive metrics
 */

// Main server
export { OptimizedMCPServer } from './mcp-server';
export type {
  OptimizedMCPConfig,
  MCPServerCapabilities,
  ToolCallResult,
} from './mcp-server';

// Components
export { ConnectionPool } from './connection-pool';
export type {
  MCPConnection,
  ConnectionPoolConfig,
  PoolMetrics,
} from './connection-pool';

export { FastToolRegistry } from './fast-tool-registry';
export type {
  ToolIndexEntry,
  ToolRegistryConfig,
} from './fast-tool-registry';

export { MCPLoadBalancer } from './load-balancer';
export type {
  RoutingStrategy,
  ServerInstance,
  LoadBalancerConfig,
  LoadBalancerMetrics,
} from './load-balancer';

export { MCPMetricsCollector } from './metrics';
export type {
  MCPMetrics,
  HealthStatus,
  MetricsSnapshot,
} from './metrics';

export { OptimizedTransport } from './optimized-transport';
export type {
  MCPMessage,
  TransportConfig,
  TransportStats,
} from './optimized-transport';

// Utility functions
export { createOptimizedServer, validatePerformanceTargets, benchmarkTool } from './utils';
export type { ServerOptions } from './utils';
