/**
 * MCP Metrics Collector
 * 
 * Real-time performance monitoring with response time tracking,
 * error rate calculation, and health status determination.
 */

import { logger } from '@/services/logger';

interface MCPMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  connectionPoolHits: number;
  connectionPoolMisses: number;
  toolLookupTime: number;
  startupTime: number;
  lastUpdated: number;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  errorRate: number;
  poolHitRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  timestamp: number;
}

interface MetricsSnapshot {
  metrics: MCPMetrics;
  health: HealthStatus;
  uptime: number;
}

export class MCPMetricsCollector {
  private metrics: MCPMetrics;
  private responseTimeBuffer: number[] = [];
  private readonly bufferSize = 10000;
  private startTime: number;
  private onHealthChange?: (status: HealthStatus) => void;

  constructor(onHealthChange?: (status: HealthStatus) => void) {
    this.startTime = Date.now();
    this.onHealthChange = onHealthChange;
    this.metrics = this.createInitialMetrics();
  }

  /**
   * Record a successful request with latency
   */
  recordRequest(latencyMs: number): void {
    this.metrics.requestCount++;
    this.updateResponseTimes(latencyMs);
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Record a request error
   */
  recordError(): void {
    this.metrics.errorCount++;
    this.metrics.lastUpdated = Date.now();
    this.checkHealthStatus();
  }

  /**
   * Record connection pool hit
   */
  recordConnectionPoolHit(): void {
    this.metrics.connectionPoolHits++;
  }

  /**
   * Record connection pool miss
   */
  recordConnectionPoolMiss(): void {
    this.metrics.connectionPoolMisses++;
  }

  /**
   * Record tool lookup latency
   */
  recordToolLookup(latencyMs: number): void {
    this.metrics.toolLookupTime = this.updateMovingAverage(
      this.metrics.toolLookupTime,
      latencyMs
    );
  }

  /**
   * Record server startup time
   */
  recordStartup(latencyMs: number): void {
    this.metrics.startupTime = latencyMs;
    logger.info(`[MCPMetrics] Server started in ${latencyMs.toFixed(2)}ms`);
  }

  /**
   * Get current metrics
   */
  getMetrics(): MCPMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealthStatus(): HealthStatus {
    const errorRate = this.calculateErrorRate();
    const poolHitRate = this.calculatePoolHitRate();

    return {
      status: this.determineHealthStatus(errorRate, poolHitRate),
      errorRate,
      poolHitRate,
      avgResponseTime: this.metrics.avgResponseTime,
      p95ResponseTime: this.metrics.p95ResponseTime,
      timestamp: Date.now(),
    };
  }

  /**
   * Get complete snapshot
   */
  getSnapshot(): MetricsSnapshot {
    return {
      metrics: this.getMetrics(),
      health: this.getHealthStatus(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get response time distribution
   */
  getResponseTimeDistribution(): {
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    avg: number;
  } {
    if (this.responseTimeBuffer.length === 0) {
      return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
    }

    const sorted = [...this.responseTimeBuffer].sort((a, b) => a - b);
    
    return {
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: this.calculateAverage(sorted),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.createInitialMetrics();
    this.responseTimeBuffer = [];
    this.startTime = Date.now();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.getSnapshot(), null, 2);
  }

  private createInitialMetrics(): MCPMetrics {
    return {
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      connectionPoolHits: 0,
      connectionPoolMisses: 0,
      toolLookupTime: 0,
      startupTime: 0,
      lastUpdated: Date.now(),
    };
  }

  private updateResponseTimes(latency: number): void {
    this.responseTimeBuffer.push(latency);

    if (this.responseTimeBuffer.length > this.bufferSize) {
      this.responseTimeBuffer.shift();
    }

    // Update average
    this.metrics.avgResponseTime = this.calculateAverage(this.responseTimeBuffer);

    // Update percentiles
    const sorted = [...this.responseTimeBuffer].sort((a, b) => a - b);
    this.metrics.p95ResponseTime = this.calculatePercentile(sorted, 95);
    this.metrics.p99ResponseTime = this.calculatePercentile(sorted, 99);
  }

  private updateMovingAverage(current: number, newValue: number): number {
    if (current === 0) return newValue;
    return (current * 0.9) + (newValue * 0.1);
  }

  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private calculatePercentile(sortedArr: number[], percentile: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }

  private calculateErrorRate(): number {
    if (this.metrics.requestCount === 0) return 0;
    return this.metrics.errorCount / this.metrics.requestCount;
  }

  private calculatePoolHitRate(): number {
    const total = this.metrics.connectionPoolHits + this.metrics.connectionPoolMisses;
    if (total === 0) return 0;
    return this.metrics.connectionPoolHits / total;
  }

  private determineHealthStatus(errorRate: number, poolHitRate: number): 'healthy' | 'warning' | 'critical' {
    if (errorRate > 0.1 || poolHitRate < 0.5) return 'critical';
    if (errorRate > 0.05 || poolHitRate < 0.7) return 'warning';
    return 'healthy';
  }

  private checkHealthStatus(): void {
    if (!this.onHealthChange) return;

    const health = this.getHealthStatus();
    if (health.status !== 'healthy') {
      this.onHealthChange(health);
    }
  }
}

export type { MCPMetrics, HealthStatus, MetricsSnapshot };
