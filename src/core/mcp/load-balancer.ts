/**
 * MCP Load Balancer
 * 
 * Intelligent load distribution across MCP server instances with
 * multiple routing strategies and health-aware selection.
 */

import { logger } from '@/services/logger';

type RoutingStrategy = 'round-robin' | 'least-connections' | 'response-time' | 'weighted';

interface ServerInstance {
  id: string;
  endpoint: string;
  load: number;
  responseTime: number;
  isHealthy: boolean;
  maxConnections: number;
  currentConnections: number;
  weight: number;
  categories: string[];
  lastHealthCheck: number;
}

interface LoadBalancerConfig {
  strategy: RoutingStrategy;
  healthCheckIntervalMs: number;
  unhealthyThreshold: number;
}

interface LoadBalancerMetrics {
  totalRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  activeServers: number;
  unhealthyServers: number;
}

const DEFAULT_CONFIG: LoadBalancerConfig = {
  strategy: 'least-connections',
  healthCheckIntervalMs: 30000,
  unhealthyThreshold: 3,
};

export class MCPLoadBalancer {
  private servers: Map<string, ServerInstance> = new Map();
  private config: LoadBalancerConfig;
  private roundRobinIndex: number = 0;
  private metrics: LoadBalancerMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      activeServers: 0,
      unhealthyServers: 0,
    };
  }

  /**
   * Initialize the load balancer with health checks
   */
  initialize(): void {
    this.startHealthChecks();
    this.updateMetrics();
  }

  /**
   * Add a server to the pool
   */
  addServer(server: Omit<ServerInstance, 'lastHealthCheck'>): void {
    const fullServer: ServerInstance = {
      ...server,
      lastHealthCheck: Date.now(),
    };
    this.servers.set(server.id, fullServer);
    this.updateMetrics();
  }

  /**
   * Remove a server from the pool
   */
  removeServer(serverId: string): boolean {
    const removed = this.servers.delete(serverId);
    if (removed) {
      this.updateMetrics();
    }
    return removed;
  }

  /**
   * Select the best server for a request
   */
  selectServer(toolCategory?: string): ServerInstance | null {
    const healthyServers = Array.from(this.servers.values()).filter(
      server => server.isHealthy
    );

    if (healthyServers.length === 0) {
      logger.warn('[MCPLoadBalancer] No healthy servers available');
      return null;
    }

    this.metrics.totalRequests++;

    let selected: ServerInstance;

    switch (this.config.strategy) {
      case 'round-robin':
        selected = this.roundRobinSelection(healthyServers);
        break;
      case 'least-connections':
        selected = this.leastConnectionsSelection(healthyServers, toolCategory);
        break;
      case 'response-time':
        selected = this.responseTimeSelection(healthyServers, toolCategory);
        break;
      case 'weighted':
        selected = this.weightedSelection(healthyServers, toolCategory);
        break;
      default:
        selected = healthyServers[0];
    }

    // Increment connection count
    selected.currentConnections++;

    return selected;
  }

  /**
   * Release a server connection
   */
  releaseServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server && server.currentConnections > 0) {
      server.currentConnections--;
    }
  }

  /**
   * Update server metrics after a request
   */
  updateServerMetrics(
    serverId: string,
    metrics: Partial<Pick<ServerInstance, 'responseTime' | 'load'>>,
    success: boolean
  ): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    // Decrement connection count
    if (server.currentConnections > 0) {
      server.currentConnections--;
    }

    // Update metrics
    if (metrics.responseTime !== undefined) {
      server.responseTime = server.responseTime === 0
        ? metrics.responseTime
        : (server.responseTime * 0.8) + (metrics.responseTime * 0.2);
    }

    if (metrics.load !== undefined) {
      server.load = metrics.load;
    }

    // Track failures
    if (!success) {
      this.metrics.failedRequests++;
    }

    // Update moving average response time
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * 0.9) + (server.responseTime * 0.1);
  }

  /**
   * Get current load balancer metrics
   */
  getMetrics(): LoadBalancerMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get all servers status
   */
  getServersStatus(): Array<{
    id: string;
    isHealthy: boolean;
    currentConnections: number;
    utilization: number;
  }> {
    return Array.from(this.servers.values()).map(server => ({
      id: server.id,
      isHealthy: server.isHealthy,
      currentConnections: server.currentConnections,
      utilization: server.currentConnections / server.maxConnections,
    }));
  }

  /**
   * Shutdown the load balancer
   */
  shutdown(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private roundRobinSelection(servers: ServerInstance[]): ServerInstance {
    const index = this.roundRobinIndex % servers.length;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % servers.length;
    return servers[index];
  }

  private leastConnectionsSelection(
    servers: ServerInstance[],
    category?: string
  ): ServerInstance {
    const candidates = category
      ? servers.filter(s => s.categories.includes(category))
      : servers;

    if (candidates.length === 0) {
      return servers[0];
    }

    return candidates.reduce((least, current) =>
      current.currentConnections < least.currentConnections ? current : least
    );
  }

  private responseTimeSelection(
    servers: ServerInstance[],
    category?: string
  ): ServerInstance {
    const candidates = category
      ? servers.filter(s => s.categories.includes(category))
      : servers;

    if (candidates.length === 0) {
      return servers[0];
    }

    return candidates.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest
    );
  }

  private weightedSelection(
    servers: ServerInstance[],
    category?: string
  ): ServerInstance {
    const candidates = category
      ? servers.filter(s => s.categories.includes(category))
      : servers;

    if (candidates.length === 0) {
      return servers[0];
    }

    // Calculate scores for each server
    const scored = candidates.map(server => ({
      server,
      score: this.calculateServerScore(server, category),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].server;
  }

  private calculateServerScore(server: ServerInstance, category?: string): number {
    const loadFactor = 1 - (server.currentConnections / server.maxConnections);
    const responseFactor = 1 / (server.responseTime + 1);
    const weightFactor = server.weight / 10;
    const categoryBonus = category && server.categories.includes(category) ? 0.3 : 0;

    return (loadFactor * 0.35) + (responseFactor * 0.35) + (weightFactor * 0.2) + categoryBonus;
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);
  }

  private async performHealthChecks(): Promise<void> {
    const serverEntries = Array.from(this.servers.entries());
    for (const [id, server] of serverEntries) {
      try {
        const isHealthy = await this.checkServerHealth(server);
        
        if (!isHealthy && server.isHealthy) {
          // Server became unhealthy
          server.isHealthy = false;
          logger.warn(`[MCPLoadBalancer] Server ${id} marked as unhealthy`);
        } else if (isHealthy && !server.isHealthy) {
          // Server recovered
          server.isHealthy = true;
          logger.info(`[MCPLoadBalancer] Server ${id} recovered`);
        }

        server.lastHealthCheck = Date.now();
      } catch (err) {
        logger.warn(`[MCPLoadBalancer] Health check failed for ${id}:`, err);
        server.isHealthy = false;
      }
    }

    this.updateMetrics();
  }

  private async checkServerHealth(server: ServerInstance): Promise<boolean> {
    // Implement actual health check logic
    // For now, use timestamp-based heuristic
    const timeSinceLastCheck = Date.now() - server.lastHealthCheck;
    return timeSinceLastCheck < this.config.healthCheckIntervalMs * 2;
  }

  private updateMetrics(): void {
    const allServers = Array.from(this.servers.values());
    this.metrics.activeServers = allServers.filter(s => s.isHealthy).length;
    this.metrics.unhealthyServers = allServers.filter(s => !s.isHealthy).length;
  }
}

export type { RoutingStrategy, ServerInstance, LoadBalancerConfig, LoadBalancerMetrics };
