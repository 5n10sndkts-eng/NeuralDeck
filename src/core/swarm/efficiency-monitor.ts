/**
 * V3 Swarm Coordination - Efficiency Monitor
 *
 * Tracks swarm coordination efficiency, identifies bottlenecks,
 * and provides recommendations for optimization.
 */

import { Agent } from './agent-registry';
import { SwarmMetrics } from './swarm-coordinator';

export interface EfficiencyReport {
  timestamp: number;
  totalEfficiency: number;
  targetEfficiency: number;
  achieved: boolean;
  bottlenecks: Bottleneck[];
  recommendations: string[];
  metrics: {
    avgAgentUtilization: number;
    coordinationOverhead: number;
    messageLatency: number;
    dependencyWaitTime: number;
  };
}

export interface Bottleneck {
  type: 'agent' | 'dependency' | 'communication' | 'resource';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAgents: number[];
  estimatedImpact: number; // Percentage impact on overall efficiency
}

export interface EfficiencySnapshot {
  timestamp: number;
  agentUtilization: Map<number, number>;
  phaseProgress: Map<number, number>; // Phase ID -> completion percentage
  blockedAgents: number[];
  idleAgents: number[];
  activeAgents: number[];
  overallEfficiency: number;
}

export class EfficiencyMonitor {
  private snapshots: EfficiencySnapshot[] = [];
  private maxSnapshots = 100;
  private bottleneckHistory: Bottleneck[] = [];
  private lastReport: EfficiencyReport | null = null;

  /**
   * Record efficiency snapshot
   */
  recordSnapshot(
    agents: Agent[],
    metrics: SwarmMetrics,
    phaseProgress: Map<number, number>
  ): void {
    const snapshot: EfficiencySnapshot = {
      timestamp: Date.now(),
      agentUtilization: new Map(
        agents.map(a => [a.id, a.metrics.utilization])
      ),
      phaseProgress: new Map(phaseProgress),
      blockedAgents: agents.filter(a => a.status === 'blocked').map(a => a.id),
      idleAgents: agents.filter(a => a.status === 'idle').map(a => a.id),
      activeAgents: agents.filter(a => a.status === 'working').map(a => a.id),
      overallEfficiency: metrics.efficiency,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Generate efficiency report
   */
  generateReport(): EfficiencyReport {
    if (this.snapshots.length === 0) {
      return this.createEmptyReport();
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    const bottlenecks = this.identifyBottlenecks(latest);
    const recommendations = this.generateRecommendations(bottlenecks);

    const report: EfficiencyReport = {
      timestamp: Date.now(),
      totalEfficiency: latest.overallEfficiency,
      targetEfficiency: 0.85, // Target: 85% efficiency
      achieved: latest.overallEfficiency >= 0.85,
      bottlenecks,
      recommendations,
      metrics: {
        avgAgentUtilization: this.calculateAvgUtilization(latest),
        coordinationOverhead: this.calculateCoordinationOverhead(),
        messageLatency: this.estimateMessageLatency(),
        dependencyWaitTime: this.calculateDependencyWaitTime(),
      },
    };

    this.lastReport = report;
    return report;
  }

  /**
   * Identify bottlenecks in the swarm
   */
  private identifyBottlenecks(snapshot: EfficiencySnapshot): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Check for blocked agents
    if (snapshot.blockedAgents.length > 0) {
      bottlenecks.push({
        type: 'dependency',
        description: `${snapshot.blockedAgents.length} agents blocked by dependencies`,
        severity: snapshot.blockedAgents.length > 3 ? 'high' : 'medium',
        affectedAgents: snapshot.blockedAgents,
        estimatedImpact: (snapshot.blockedAgents.length / 15) * 100,
      });
    }

    // Check for idle agents
    if (snapshot.idleAgents.length > 5) {
      bottlenecks.push({
        type: 'resource',
        description: `${snapshot.idleAgents.length} agents idle`,
        severity: snapshot.idleAgents.length > 8 ? 'high' : 'low',
        affectedAgents: snapshot.idleAgents,
        estimatedImpact: (snapshot.idleAgents.length / 15) * 50,
      });
    }

    // Check utilization distribution
    const utilizations = Array.from(snapshot.agentUtilization.values());
    const avgUtil = utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
    const variance = this.calculateVariance(utilizations, avgUtil);

    if (variance > 0.25) {
      bottlenecks.push({
        type: 'agent',
        description: 'Uneven workload distribution detected',
        severity: 'medium',
        affectedAgents: snapshot.activeAgents,
        estimatedImpact: variance * 100,
      });
    }

    // Store in history
    this.bottleneckHistory.push(...bottlenecks);

    return bottlenecks;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(bottlenecks: Bottleneck[]): string[] {
    const recommendations: string[] = [];

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'dependency':
          recommendations.push(
            'Consider parallelizing independent dependency chains',
            'Review dependency graph for circular dependencies'
          );
          break;
        case 'resource':
          recommendations.push(
            'Reassign idle agents to critical path tasks',
            'Enable dynamic load balancing'
          );
          break;
        case 'agent':
          recommendations.push(
            'Redistribute tasks from overloaded agents',
            'Enable work stealing for idle agents'
          );
          break;
        case 'communication':
          recommendations.push(
            'Optimize message batching',
            'Review communication patterns'
          );
          break;
      }
    }

    // Add general recommendations
    if (bottlenecks.length === 0) {
      recommendations.push(
        'Swarm operating at optimal efficiency',
        'Consider increasing task complexity'
      );
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  private calculateAvgUtilization(snapshot: EfficiencySnapshot): number {
    const values = Array.from(snapshot.agentUtilization.values());
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateCoordinationOverhead(): number {
    if (this.snapshots.length < 2) return 0;

    const recent = this.snapshots.slice(-10);
    let overhead = 0;

    for (let i = 1; i < recent.length; i++) {
      const timeDiff = recent[i].timestamp - recent[i - 1].timestamp;
      const efficiencyDiff = recent[i].overallEfficiency - recent[i - 1].overallEfficiency;
      
      if (timeDiff > 1000 && efficiencyDiff < 0) {
        overhead += Math.abs(efficiencyDiff);
      }
    }

    return overhead;
  }

  private estimateMessageLatency(): number {
    // Placeholder for actual latency measurement
    return 50; // 50ms average
  }

  private calculateDependencyWaitTime(): number {
    if (this.snapshots.length === 0) return 0;

    let totalWaitTime = 0;
    for (const snapshot of this.snapshots) {
      if (snapshot.blockedAgents.length > 0) {
        totalWaitTime += snapshot.blockedAgents.length * 1000; // Assume 1s per blocked agent
      }
    }

    return totalWaitTime / this.snapshots.length;
  }

  private calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private createEmptyReport(): EfficiencyReport {
    return {
      timestamp: Date.now(),
      totalEfficiency: 0,
      targetEfficiency: 0.85,
      achieved: false,
      bottlenecks: [],
      recommendations: ['No data available yet'],
      metrics: {
        avgAgentUtilization: 0,
        coordinationOverhead: 0,
        messageLatency: 0,
        dependencyWaitTime: 0,
      },
    };
  }

  /**
   * Get historical snapshots
   */
  getSnapshots(): EfficiencySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get bottleneck history
   */
  getBottleneckHistory(): Bottleneck[] {
    return [...this.bottleneckHistory];
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.snapshots = [];
    this.bottleneckHistory = [];
    this.lastReport = null;
  }
}

export default EfficiencyMonitor;
