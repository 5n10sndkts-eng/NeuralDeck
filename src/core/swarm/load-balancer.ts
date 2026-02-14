/**
 * V3 Swarm Coordination - Load Balancer
 *
 * Distributes workload across agents to maximize parallel efficiency.
 * Monitors agent capacity and redistributes tasks dynamically.
 */

import { Agent, AgentTask } from './agent-registry';
import { logger } from '@/services/logger';

export interface LoadDistribution {
  agentId: number;
  assignedTasks: number;
  capacity: number;
  utilization: number;
}

export interface LoadBalancerConfig {
  maxTasksPerAgent: number;
  enableDynamicBalancing: boolean;
  balancingThreshold: number; // Utilization threshold to trigger rebalancing
  checkIntervalMs: number;
}

export const DEFAULT_LB_CONFIG: LoadBalancerConfig = {
  maxTasksPerAgent: 3,
  enableDynamicBalancing: true,
  balancingThreshold: 0.8,
  checkIntervalMs: 5000,
};

export class LoadBalancer {
  private config: LoadBalancerConfig;
  private agentLoads: Map<number, LoadDistribution> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    this.config = { ...DEFAULT_LB_CONFIG, ...config };
  }

  /**
   * Start load balancer monitoring
   */
  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkAndRebalance();
    }, this.config.checkIntervalMs);

    logger.info('[LoadBalancer] Started');
  }

  /**
   * Stop load balancer
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('[LoadBalancer] Stopped');
  }

  /**
   * Register agent with load balancer
   */
  registerAgent(agentId: number, capacity: number = 1): void {
    this.agentLoads.set(agentId, {
      agentId,
      assignedTasks: 0,
      capacity: Math.min(capacity, this.config.maxTasksPerAgent),
      utilization: 0,
    });
  }

  /**
   * Update agent load
   */
  updateAgentLoad(agentId: number, taskDelta: number): void {
    const load = this.agentLoads.get(agentId);
    if (!load) return;

    load.assignedTasks += taskDelta;
    load.assignedTasks = Math.max(0, load.assignedTasks);
    load.utilization = load.capacity > 0 
      ? load.assignedTasks / load.capacity 
      : 0;
  }

  /**
   * Select best agent for a task
   */
  selectAgent(availableAgents: Agent[]): Agent | null {
    if (availableAgents.length === 0) return null;

    // Score each agent based on load and capacity
    const scoredAgents = availableAgents.map(agent => {
      const load = this.agentLoads.get(agent.id);
      const score = this.calculateAgentScore(agent, load);
      return { agent, score };
    });

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    return scoredAgents[0]?.agent || null;
  }

  private calculateAgentScore(agent: Agent, load?: LoadDistribution): number {
    let score = 0;

    // Prefer agents with lower utilization
    if (load) {
      score += (1 - load.utilization) * 50;
      score += (load.capacity - load.assignedTasks) * 20;
    } else {
      score += 50; // Unknown load, assume available
    }

    // Prefer agents with higher success rates
    score += agent.metrics.successRate * 30;

    return score;
  }

  /**
   * Check and rebalance load if needed
   */
  private checkAndRebalance(): void {
    if (!this.config.enableDynamicBalancing) return;

    const loads = Array.from(this.agentLoads.values());
    
    // Find overloaded agents
    const overloaded = loads.filter(
      l => l.utilization > this.config.balancingThreshold
    );

    // Find underloaded agents
    const underloaded = loads.filter(
      l => l.utilization < 0.5 && l.assignedTasks < l.capacity
    );

    if (overloaded.length > 0 && underloaded.length > 0) {
      logger.info(`[LoadBalancer] Rebalancing: ${overloaded.length} overloaded, ${underloaded.length} underloaded`);
    }
  }

  /**
   * Get load distribution
   */
  getDistribution(): LoadDistribution[] {
    return Array.from(this.agentLoads.values());
  }

  /**
   * Get overall swarm utilization
   */
  getSwarmUtilization(): number {
    const loads = this.getDistribution();
    if (loads.length === 0) return 0;

    const totalUtilization = loads.reduce((sum, l) => sum + l.utilization, 0);
    return totalUtilization / loads.length;
  }

  /**
   * Find optimal task distribution
   */
  optimizeDistribution(tasks: AgentTask[], agents: Agent[]): Map<number, string[]> {
    const distribution = new Map<number, string[]>();
    
    // Initialize distribution
    for (const agent of agents) {
      distribution.set(agent.id, []);
    }

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Distribute tasks
    for (const task of sortedTasks) {
      const availableAgents = agents.filter(a => 
        a.status === 'idle' || a.status === 'working'
      );
      
      const bestAgent = this.selectAgent(availableAgents);
      if (bestAgent) {
        const agentTasks = distribution.get(bestAgent.id) || [];
        agentTasks.push(task.id);
        distribution.set(bestAgent.id, agentTasks);
        this.updateAgentLoad(bestAgent.id, 1);
      }
    }

    return distribution;
  }

  /**
   * Reset load balancer
   */
  reset(): void {
    this.agentLoads.clear();
  }
}

export default LoadBalancer;
