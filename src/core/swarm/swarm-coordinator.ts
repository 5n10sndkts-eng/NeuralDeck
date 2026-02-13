/**
 * V3 Swarm Coordination - Swarm Coordinator
 *
 * Main orchestrator for the 15-agent hierarchical mesh swarm.
 * Manages execution phases, dependency resolution, and load balancing.
 */

import AgentRegistry, {
  Agent,
  AgentTask,
  AgentStatus,
  AgentDomain,
  SWARM_AGENTS,
} from './agent-registry';

export interface SwarmPhase {
  id: number;
  name: string;
  description: string;
  agentIds: number[];
  dependencies: number[]; // Phase IDs that must complete first
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
}

export interface SwarmExecutionConfig {
  maxParallelAgents: number;
  taskTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  enableLoadBalancing: boolean;
  enableDependencyTracking: boolean;
}

export interface SwarmExecutionResult {
  success: boolean;
  phasesCompleted: number;
  phasesFailed: number;
  totalDuration: number;
  agentResults: Map<number, AgentTask[]>;
  errors: string[];
}

export interface SwarmMetrics {
  activeAgents: number;
  idleAgents: number;
  completedAgents: number;
  failedAgents: number;
  queueDepth: number;
  avgTaskDuration: number;
  successRate: number;
  efficiency: number; // Agent utilization percentage
}

export const DEFAULT_SWARM_CONFIG: SwarmExecutionConfig = {
  maxParallelAgents: 5,
  taskTimeoutMs: 300000, // 5 minutes
  retryAttempts: 2,
  retryDelayMs: 5000,
  enableLoadBalancing: true,
  enableDependencyTracking: true,
};

// V3 Implementation Phases
export const SWARM_PHASES: Omit<SwarmPhase, 'status' | 'startTime' | 'endTime'>[] = [
  {
    id: 1,
    name: 'Foundation',
    description: 'Security-first foundation and core architecture',
    agentIds: [1, 2, 3, 4, 5, 6],
    dependencies: [],
  },
  {
    id: 2,
    name: 'Core Systems',
    description: 'Parallel core system implementation',
    agentIds: [5, 6, 7, 8, 9, 13],
    dependencies: [1],
  },
  {
    id: 3,
    name: 'Integration',
    description: 'Integration and optimization',
    agentIds: [10, 11, 12, 13, 14],
    dependencies: [2],
  },
  {
    id: 4,
    name: 'Release',
    description: 'Release preparation and deployment',
    agentIds: [13, 14, 15],
    dependencies: [3],
  },
];

export class SwarmCoordinator {
  private registry: AgentRegistry;
  private phases: Map<number, SwarmPhase> = new Map();
  private config: SwarmExecutionConfig;
  private isRunning: boolean = false;
  private currentPhase: number = 0;
  private executionStartTime: number = 0;
  private onProgress?: (progress: SwarmMetrics) => void;
  private onPhaseComplete?: (phase: SwarmPhase) => void;
  private onAgentComplete?: (agent: Agent, task: AgentTask) => void;

  constructor(
    config: Partial<SwarmExecutionConfig> = {},
    callbacks?: {
      onProgress?: (progress: SwarmMetrics) => void;
      onPhaseComplete?: (phase: SwarmPhase) => void;
      onAgentComplete?: (agent: Agent, task: AgentTask) => void;
    }
  ) {
    this.registry = new AgentRegistry();
    this.config = { ...DEFAULT_SWARM_CONFIG, ...config };
    this.initializePhases();

    if (callbacks) {
      this.onProgress = callbacks.onProgress;
      this.onPhaseComplete = callbacks.onPhaseComplete;
      this.onAgentComplete = callbacks.onAgentComplete;
    }
  }

  private initializePhases(): void {
    for (const phaseDef of SWARM_PHASES) {
      const phase: SwarmPhase = {
        ...phaseDef,
        status: 'pending',
      };
      this.phases.set(phase.id, phase);
    }
  }

  /**
   * Start swarm execution
   */
  async execute(): Promise<SwarmExecutionResult> {
    if (this.isRunning) {
      throw new Error('Swarm is already running');
    }

    this.isRunning = true;
    this.executionStartTime = Date.now();

    const result: SwarmExecutionResult = {
      success: true,
      phasesCompleted: 0,
      phasesFailed: 0,
      totalDuration: 0,
      agentResults: new Map(),
      errors: [],
    };

    try {
      // Execute phases sequentially
      for (const phase of this.getPhasesInOrder()) {
        this.currentPhase = phase.id;
        const phaseResult = await this.executePhase(phase);

        if (phaseResult) {
          result.phasesCompleted++;
          this.onPhaseComplete?.(phase);
        } else {
          result.phasesFailed++;
          result.success = false;
          result.errors.push(`Phase ${phase.id} (${phase.name}) failed`);

          if (this.config.enableDependencyTracking) {
            // Stop execution if a phase fails
            break;
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      this.isRunning = false;
      result.totalDuration = Date.now() - this.executionStartTime;
    }

    return result;
  }

  /**
   * Execute a single phase
   */
  private async executePhase(phase: SwarmPhase): Promise<boolean> {
    phase.status = 'active';
    phase.startTime = Date.now();

    console.log(`[SwarmCoordinator] Starting phase ${phase.id}: ${phase.name}`);
    console.log(
      `[SwarmCoordinator] Agents: ${phase.agentIds.map((id) => `#${id}`).join(', ')}`
    );

    // Get agents for this phase
    const agents = phase.agentIds
      .map((id) => this.registry.getAgent(id))
      .filter((agent): agent is Agent => agent !== undefined);

    // Check dependencies
    if (this.config.enableDependencyTracking) {
      for (const agent of agents) {
        const deps = this.registry.getDependencyChain(agent.id);
        const incompleteDeps = deps.filter((depId) => {
          const dep = this.registry.getAgent(depId);
          return dep?.status !== 'completed';
        });

        if (incompleteDeps.length > 0) {
          console.warn(
            `[SwarmCoordinator] Agent #${agent.id} has incomplete dependencies: ${incompleteDeps.join(', ')}`
          );
          this.registry.updateAgentStatus(agent.id, 'blocked');
        }
      }
    }

    // Execute agents in parallel with concurrency limit
    const readyAgents = agents.filter((a) => a.status !== 'blocked');
    const batches = this.createBatches(
      readyAgents,
      this.config.maxParallelAgents
    );

    let phaseSuccess = true;

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map((agent) => this.executeAgent(agent))
      );

      // Check batch results
      const failures = batchResults.filter(
        (r) => r.status === 'rejected'
      ).length;
      if (failures > 0) {
        phaseSuccess = false;
      }

      // Report progress
      this.reportProgress();
    }

    phase.status = phaseSuccess ? 'completed' : 'failed';
    phase.endTime = Date.now();

    const duration = phase.endTime - (phase.startTime || 0);
    console.log(
      `[SwarmCoordinator] Phase ${phase.id} ${phase.status} in ${duration}ms`
    );

    return phaseSuccess;
  }

  /**
   * Execute a single agent
   */
  private async executeAgent(agent: Agent): Promise<void> {
    console.log(`[SwarmCoordinator] Executing agent #${agent.id}: ${agent.name}`);

    this.registry.updateAgentStatus(agent.id, 'working');

    // Create a task for this agent
    const task = this.registry.createTask(
      agent.id,
      `Execute ${agent.name} capabilities`,
      'high',
      this.getTaskDependencies(agent)
    );

    this.registry.updateTaskStatus(task.id, 'working');

    try {
      // Simulate agent execution
      // In real implementation, this would call the actual agent logic
      await this.simulateAgentExecution(agent, task);

      // Mark as completed
      this.registry.updateTaskStatus(task.id, 'completed', {
        agent: agent.name,
        capabilities: agent.capabilities,
      });
      this.registry.updateAgentStatus(agent.id, 'completed');

      console.log(`[SwarmCoordinator] Agent #${agent.id} completed successfully`);

      this.onAgentComplete?.(agent, task);
    } catch (error) {
      // Mark as failed
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.registry.updateTaskStatus(task.id, 'failed', undefined, errorMsg);
      this.registry.updateAgentStatus(agent.id, 'failed');

      console.error(`[SwarmCoordinator] Agent #${agent.id} failed: ${errorMsg}`);

      // Retry if configured
      if (this.shouldRetryAgent(agent)) {
        console.log(`[SwarmCoordinator] Retrying agent #${agent.id}`);
        await this.delay(this.config.retryDelayMs);
        return this.executeAgent(agent);
      }

      throw error;
    }
  }

  /**
   * Simulate agent execution (placeholder for actual implementation)
   */
  private async simulateAgentExecution(
    agent: Agent,
    task: AgentTask
  ): Promise<void> {
    // Simulate work duration based on agent domain
    const durationMap: Record<AgentDomain, number> = {
      orchestration: 1000,
      security: 2000,
      core: 3000,
      integration: 2500,
      quality: 1500,
      performance: 2000,
      deployment: 1000,
    };

    const duration = durationMap[agent.domain] || 2000;
    await this.delay(duration);

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error(`Simulated failure for agent ${agent.id}`);
    }
  }

  private shouldRetryAgent(agent: Agent): boolean {
    // Check if agent has retry attempts left
    const tasks = this.registry.getTasksByAgent(agent.id);
    const failedTasks = tasks.filter((t) => t.status === 'failed');
    return failedTasks.length < this.config.retryAttempts;
  }

  private getTaskDependencies(agent: Agent): string[] {
    // Get tasks from dependencies that must complete first
    const deps: string[] = [];
    for (const depId of agent.dependencies) {
      const depTasks = this.registry.getTasksByAgent(depId);
      const latestTask = depTasks[depTasks.length - 1];
      if (latestTask) {
        deps.push(latestTask.id);
      }
    }
    return deps;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private getPhasesInOrder(): SwarmPhase[] {
    const phases = Array.from(this.phases.values());
    return phases.sort((a, b) => a.id - b.id);
  }

  private reportProgress(): void {
    const stats = this.registry.getSwarmStats();
    const readyTasks = this.registry.getReadyTasks();

    const metrics: SwarmMetrics = {
      activeAgents: stats.activeAgents,
      idleAgents: stats.idleAgents,
      completedAgents: stats.completedAgents,
      failedAgents: stats.failedAgents,
      queueDepth: readyTasks.length,
      avgTaskDuration: stats.avgSuccessRate * 1000, // Approximate
      successRate: stats.avgSuccessRate,
      efficiency: stats.avgUtilization,
    };

    this.onProgress?.(metrics);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current swarm status
   */
  getStatus(): {
    isRunning: boolean;
    currentPhase: number;
    phases: SwarmPhase[];
    agents: Agent[];
    metrics: SwarmMetrics;
  } {
    const stats = this.registry.getSwarmStats();
    const readyTasks = this.registry.getReadyTasks();

    return {
      isRunning: this.isRunning,
      currentPhase: this.currentPhase,
      phases: this.getPhasesInOrder(),
      agents: this.registry.getAllAgents(),
      metrics: {
        activeAgents: stats.activeAgents,
        idleAgents: stats.idleAgents,
        completedAgents: stats.completedAgents,
        failedAgents: stats.failedAgents,
        queueDepth: readyTasks.length,
        avgTaskDuration: 0,
        successRate: stats.avgSuccessRate,
        efficiency: stats.avgUtilization,
      },
    };
  }

  /**
   * Get phase by ID
   */
  getPhase(id: number): SwarmPhase | undefined {
    return this.phases.get(id);
  }

  /**
   * Reset swarm state
   */
  reset(): void {
    this.isRunning = false;
    this.currentPhase = 0;
    this.executionStartTime = 0;
    this.registry.reset();
    this.phases.clear();
    this.initializePhases();
  }

  /**
   * Check if all dependencies are satisfied for an agent
   */
  areDependenciesSatisfied(agentId: number): boolean {
    const agent = this.registry.getAgent(agentId);
    if (!agent) return false;

    return agent.dependencies.every((depId) => {
      const dep = this.registry.getAgent(depId);
      return dep?.status === 'completed';
    });
  }

  /**
   * Get agents ready for execution
   */
  getReadyAgents(): Agent[] {
    return this.registry
      .getAllAgents()
      .filter(
        (agent) =>
          agent.status === 'idle' && this.areDependenciesSatisfied(agent.id)
      );
  }
}

export default SwarmCoordinator;
