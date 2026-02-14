/**
 * MCP Connection Pool
 * 
 * Advanced connection pooling with health monitoring, pre-warming,
 * and intelligent connection reuse for optimal performance.
 */

import { logger } from '@/services/logger';

interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  maxUsageCount: number;
  healthCheckIntervalMs: number;
}

interface MCPConnection {
  id: string;
  endpoint: string;
  isHealthy: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface PooledConnection {
  id: string;
  connection: MCPConnection;
  lastUsed: number;
  usageCount: number;
  isHealthy: boolean;
}

interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  poolHits: number;
  poolMisses: number;
  avgAcquireTime: number;
}

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  maxConnections: 50,
  minConnections: 5,
  idleTimeoutMs: 300000, // 5 minutes
  maxUsageCount: 1000,
  healthCheckIntervalMs: 30000,
};

export class ConnectionPool {
  private pool: Map<string, PooledConnection> = new Map();
  private config: ConnectionPoolConfig;
  private metrics: PoolMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private connectionFactory: (endpoint: string) => Promise<MCPConnection>;

  constructor(
    connectionFactory: (endpoint: string) => Promise<MCPConnection>,
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.connectionFactory = connectionFactory;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      poolHits: 0,
      poolMisses: 0,
      avgAcquireTime: 0,
    };
  }

  /**
   * Initialize the pool with pre-warmed connections
   */
  async initialize(): Promise<void> {
    await this.preWarm();
    this.startHealthChecks();
  }

  /**
   * Get a connection from the pool or create a new one
   */
  async getConnection(endpoint: string): Promise<MCPConnection> {
    const startTime = performance.now();

    // Try to find an available connection
    const pooled = this.findAvailableConnection(endpoint);
    
    if (pooled) {
      pooled.lastUsed = Date.now();
      pooled.usageCount++;
      this.metrics.poolHits++;
      this.recordAcquireTime(performance.now() - startTime);
      return pooled.connection;
    }

    // Check pool capacity
    if (this.pool.size >= this.config.maxConnections) {
      await this.evictLeastUsedConnection();
    }

    // Create new connection
    const connection = await this.createConnection(endpoint);
    const pooledConn: PooledConnection = {
      id: this.generateConnectionId(),
      connection,
      lastUsed: Date.now(),
      usageCount: 1,
      isHealthy: true,
    };

    this.pool.set(pooledConn.id, pooledConn);
    this.metrics.poolMisses++;
    this.metrics.totalConnections = this.pool.size;
    this.recordAcquireTime(performance.now() - startTime);

    return connection;
  }

  /**
   * Release a connection back to the pool
   */
  async releaseConnection(connection: MCPConnection): Promise<void> {
    const pooled = this.findConnectionById(connection.id);
    if (!pooled) return;

    // Check if connection should be retired
    if (pooled.usageCount >= this.config.maxUsageCount || !pooled.isHealthy) {
      await this.removeConnection(pooled.id);
    }
  }

  /**
   * Pre-warm the pool with minimum connections
   */
  async preWarm(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(
        this.createConnection('default').then(conn => {
          const pooledConn: PooledConnection = {
            id: this.generateConnectionId(),
            connection: conn,
            lastUsed: Date.now(),
            usageCount: 0,
            isHealthy: true,
          };
          this.pool.set(pooledConn.id, pooledConn);
        }).catch(err => {
          logger.warn(`[ConnectionPool] Failed to pre-warm connection ${i}:`, err);
        })
      );
    }

    await Promise.all(promises);
    this.metrics.totalConnections = this.pool.size;
    logger.info(`[ConnectionPool] Pre-warmed ${this.pool.size} connections`);
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): PoolMetrics {
    const activeCount = Array.from(this.pool.values()).filter(
      c => Date.now() - c.lastUsed < 60000
    ).length;
    
    const idleCount = this.pool.size - activeCount;
    
    return {
      ...this.metrics,
      activeConnections: activeCount,
      idleConnections: idleCount,
    };
  }

  /**
   * Shutdown the pool and close all connections
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    const closePromises = Array.from(this.pool.values()).map(pooled =>
      pooled.connection.disconnect().catch(() => {})
    );

    await Promise.all(closePromises);
    this.pool.clear();
    this.metrics.totalConnections = 0;
  }

  private async createConnection(endpoint: string): Promise<MCPConnection> {
    return this.connectionFactory(endpoint);
  }

  private findAvailableConnection(endpoint: string): PooledConnection | null {
    const now = Date.now();
    const connections = Array.from(this.pool.values());
    
    for (const conn of connections) {
      if (
        conn.isHealthy &&
        conn.connection.endpoint === endpoint &&
        now - conn.lastUsed < this.config.idleTimeoutMs &&
        conn.usageCount < this.config.maxUsageCount
      ) {
        return conn;
      }
    }
    return null;
  }

  private findConnectionById(id: string): PooledConnection | null {
    const connections = Array.from(this.pool.values());
    for (const conn of connections) {
      if (conn.connection.id === id) {
        return conn;
      }
    }
    return null;
  }

  private async evictLeastUsedConnection(): Promise<void> {
    let oldestConn: PooledConnection | null = null;
    let oldestTime = Date.now();
    const connections = Array.from(this.pool.values());

    for (const conn of connections) {
      if (conn.lastUsed < oldestTime) {
        oldestTime = conn.lastUsed;
        oldestConn = conn;
      }
    }

    if (oldestConn) {
      await this.removeConnection(oldestConn.id);
    }
  }

  private async removeConnection(id: string): Promise<void> {
    const pooled = this.pool.get(id);
    if (!pooled) return;

    try {
      await pooled.connection.disconnect();
    } catch (err) {
      logger.warn(`[ConnectionPool] Error disconnecting connection ${id}:`, err);
    }

    this.pool.delete(id);
    this.metrics.totalConnections = this.pool.size;
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);
  }

  private async performHealthChecks(): Promise<void> {
    const entries = Array.from(this.pool.entries());
    for (const [id, pooled] of entries) {
      try {
        // Simple health check - verify connection is responsive
        const isHealthy = await this.checkConnectionHealth(pooled.connection);
        pooled.isHealthy = isHealthy;

        if (!isHealthy) {
          logger.warn(`[ConnectionPool] Unhealthy connection ${id}, removing`);
          await this.removeConnection(id);
        }
      } catch (err) {
        logger.warn(`[ConnectionPool] Health check failed for ${id}:`, err);
        pooled.isHealthy = false;
      }
    }
  }

  private async checkConnectionHealth(connection: MCPConnection): Promise<boolean> {
    // Implement actual health check logic
    return connection.isHealthy;
  }

  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private recordAcquireTime(duration: number): void {
    // Moving average
    this.metrics.avgAcquireTime = 
      (this.metrics.avgAcquireTime * 0.9) + (duration * 0.1);
  }
}

export type { ConnectionPoolConfig, MCPConnection, PoolMetrics };
