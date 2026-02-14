/**
 * V3 Swarm Coordination - Swarm Coordinator
 *
 * Main orchestrator for the 15-agent hierarchical mesh swarm.
 * Manages execution phases, dependency resolution, load balancing,
 * and topology-aware task dispatch.
 *
 * Best-practice integration:
 *   1. Topology selection  — choose mesh/hierarchical/star/ring per workflow
 *   2. Agent specialization — capability-based routing via AgentRegistry
 *   3. Parallel execution  — topology-driven batching with concurrency control
 *   4. Monitoring          — EfficiencyMonitor wired into every phase transition
 */

import AgentRegistry, {
  Agent,
  AgentTask,
  AgentStatus,
  AgentDomain,
  SWARM_AGENTS,
} from './agent-registry';

import {
  type TopologyConfig,
  type TopologyStrategy,
  type ExecutionBatch,
  type TopologyValidation,
  type SwarmTopology,
  createTopologyStrategy,
} from './topology';

import { EfficiencyMonitor, type EfficiencyReport } from './efficiency-monitor';
import { logger } from '@/services/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  /** Topology selection. Defaults to hierarchical for backward compat. */
  topology: TopologyConfig;
  /** Enable periodic efficiency snapshots during execution. */
  enableMonitoring: boolean;
  /** Interval (ms) between monitoring snapshots. */
  monitoringIntervalMs: number;
}

export interface SwarmExecutionResult {
  success: boolean;
  phasesCompleted: number;
  phasesFailed: number;
  totalDuration: number;
  agentResults: Map<number, AgentTask[]>;
  errors: string[];
  topology: SwarmTopology;
  efficiencyReport?: EfficiencyReport;
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

/**
 * Pluggable executor: given an agent and its task, perform the actual work.
 * Return the result payload or throw on failure.
 *
 * Implementations can call LLMs, run scripts, or anything else.
 * The coordinator never touches real execution logic itself.
 */
export type AgentExecutor = (
  agent: Agent,
  task: AgentTask,
) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SWARM_CONFIG: SwarmExecutionConfig = {
  maxParallelAgents: 5,
  taskTimeoutMs: 300000, // 5 minutes
  retryAttempts: 2,
  retryDelayMs: 5000,
  enableLoadBalancing: true,
  enableDependencyTracking: true,
  topology: { type: 'hierarchical', coordinatorId: 1 },
  enableMonitoring: true,
  monitoringIntervalMs: 3000,
};

// Legacy phase definitions (used as fallback when no topology plan is set)
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

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export class SwarmCoordinator {
  private registry: AgentRegistry;
  private config: SwarmExecutionConfig;
  private topologyStrategy: TopologyStrategy;
  private efficiencyMonitor: EfficiencyMonitor;

  // Legacy phase tracking (kept for backward compat / UI)
  private phases: Map<number, SwarmPhase> = new Map();

  private isRunning = false;
  private currentPhase = 0;
  private executionStartTime = 0;
  private completedAgentIds = new Set<number>();
  private monitorInterval: ReturnType<typeof setInterval> | null = null;

  // Pluggable executor (default: simulated)
  private executor: AgentExecutor;

  // Callbacks
  private onProgress?: (progress: SwarmMetrics) => void;
  private onPhaseComplete?: (phase: SwarmPhase) => void;
  private onAgentComplete?: (agent: Agent, task: AgentTask) => void;

  constructor(
    config: Partial<SwarmExecutionConfig> = {},
    callbacks?: {
      onProgress?: (progress: SwarmMetrics) => void;
      onPhaseComplete?: (phase: SwarmPhase) => void;
      onAgentComplete?: (agent: Agent, task: AgentTask) => void;
    },
    executor?: AgentExecutor,
  ) {
    this.registry = new AgentRegistry();
    this.config = { ...DEFAULT_SWARM_CONFIG, ...config };

    // Propagate maxParallelAgents into topology config
    if (!this.config.topology.maxConcurrency) {
      this.config.topology.maxConcurrency = this.config.maxParallelAgents;
    }

    this.topologyStrategy = createTopologyStrategy(
      this.config.topology,
      this.registry.getAllAgents(),
    );

    this.efficiencyMonitor = new EfficiencyMonitor();
    this.executor = executor ?? this.defaultExecutor.bind(this);

    this.initializePhases();

    if (callbacks) {
      this.onProgress = callbacks.onProgress;
      this.onPhaseComplete = callbacks.onPhaseComplete;
      this.onAgentComplete = callbacks.onAgentComplete;
    }
  }

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  /** Replace the current topology at runtime (resets execution state). */
  setTopology(config: TopologyConfig): TopologyValidation {
    const agents = this.registry.getAllAgents();
    const strategy = createTopologyStrategy(config, agents);
    const validation = strategy.validate(agents);

    if (validation.valid) {
      this.topologyStrategy = strategy;
      this.config.topology = config;
    }

    return validation;
  }

  /** Get the active topology type. */
  getTopology(): SwarmTopology {
    return this.topologyStrategy.type;
  }

  /** Replace the agent executor at runtime. */
  setExecutor(executor: AgentExecutor): void {
    this.executor = executor;
  }

  // -------------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------------

  /**
   * Start swarm execution using the selected topology.
   *
   * The topology strategy produces an execution plan (ordered batches).
   * Batches run sequentially; agents within a batch run in parallel.
   */
  async execute(): Promise<SwarmExecutionResult> {
    if (this.isRunning) {
      throw new Error('Swarm is already running');
    }

    this.isRunning = true;
    this.executionStartTime = Date.now();
    this.completedAgentIds.clear();

    const result: SwarmExecutionResult = {
      success: true,
      phasesCompleted: 0,
      phasesFailed: 0,
      totalDuration: 0,
      agentResults: new Map(),
      errors: [],
      topology: this.topologyStrategy.type,
    };

    // Start monitoring
    this.startMonitoring();

    try {
      const plan = this.topologyStrategy.getExecutionPlan(
        this.registry.getAllAgents(),
      );

      logger.info(
        `[SwarmCoordinator] Topology: ${this.topologyStrategy.type} | ` +
          `${plan.length} batches planned`,
      );

      for (const batch of plan) {
        this.currentPhase = batch.step;
        logger.info(
          `[SwarmCoordinator] Batch ${batch.step}: ${batch.label}`,
        );

        const batchSuccess = await this.executeBatch(batch, result);

        // Map batch to legacy phase for UI compatibility
        const legacyPhase = this.findLegacyPhase(batch);
        if (legacyPhase) {
          legacyPhase.status = batchSuccess ? 'completed' : 'failed';
          legacyPhase.endTime = Date.now();
          if (batchSuccess) {
            result.phasesCompleted++;
            this.onPhaseComplete?.(legacyPhase);
          } else {
            result.phasesFailed++;
          }
        } else {
          if (batchSuccess) result.phasesCompleted++;
          else result.phasesFailed++;
        }

        if (!batchSuccess) {
          result.success = false;
          result.errors.push(`Batch ${batch.step} (${batch.label}) failed`);

          if (this.config.enableDependencyTracking) {
            break; // Stop on failure when dependency tracking is on
          }
        }

        this.reportProgress();
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      this.stopMonitoring();
      this.isRunning = false;
      result.totalDuration = Date.now() - this.executionStartTime;
      result.efficiencyReport = this.efficiencyMonitor.generateReport();
    }

    return result;
  }

  /**
   * Execute a single batch of agents in parallel.
   */
  private async executeBatch(
    batch: ExecutionBatch,
    result: SwarmExecutionResult,
  ): Promise<boolean> {
    const agents = batch.agentIds
      .map((id) => this.registry.getAgent(id))
      .filter((a): a is Agent => a !== undefined);

    if (agents.length === 0) return true;

    // Check per-agent dependencies (topology may allow parallel but
    // individual agents might still have unmet deps)
    if (this.config.enableDependencyTracking) {
      for (const agent of agents) {
        const unmet = agent.dependencies.filter(
          (d) => !this.completedAgentIds.has(d),
        );
        if (unmet.length > 0) {
          logger.warn(
            `[SwarmCoordinator] Agent #${agent.id} blocked: deps ${unmet.join(', ')} not met`,
          );
          this.registry.updateAgentStatus(agent.id, 'blocked');
        }
      }
    }

    const ready = agents.filter((a) => a.status !== 'blocked');

    const batchResults = await Promise.allSettled(
      ready.map((agent) => this.executeAgentWithTimeout(agent)),
    );

    let allOk = true;
    for (let i = 0; i < batchResults.length; i++) {
      const agent = ready[i];
      const br = batchResults[i];

      if (br.status === 'fulfilled') {
        this.completedAgentIds.add(agent.id);
        // Collect task results
        const tasks = this.registry.getTasksByAgent(agent.id);
        result.agentResults.set(agent.id, tasks);
      } else {
        allOk = false;
        result.errors.push(
          `Agent #${agent.id} (${agent.name}): ${br.reason}`,
        );
      }
    }

    return allOk;
  }

  /**
   * Execute a single agent with timeout wrapper.
   */
  private async executeAgentWithTimeout(agent: Agent): Promise<void> {
    const timeout = this.config.taskTimeoutMs;

    const run = async () => {
      this.registry.updateAgentStatus(agent.id, 'working');

      const task = this.registry.createTask(
        agent.id,
        `Execute ${agent.name} [${agent.capabilities.join(', ')}]`,
        'high',
        this.getTaskDependencies(agent),
      );
      this.registry.updateTaskStatus(task.id, 'working');

      try {
        const taskResult = await this.executor(agent, task);

        this.registry.updateTaskStatus(task.id, 'completed', taskResult);
        this.registry.updateAgentStatus(agent.id, 'completed');
        logger.info(
          `[SwarmCoordinator] Agent #${agent.id} (${agent.name}) completed`,
        );
        this.onAgentComplete?.(agent, task);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.registry.updateTaskStatus(task.id, 'failed', undefined, msg);
        this.registry.updateAgentStatus(agent.id, 'failed');
        logger.error(
          `[SwarmCoordinator] Agent #${agent.id} (${agent.name}) failed: ${msg}`,
        );

        // Retry
        if (this.shouldRetryAgent(agent)) {
          logger.info(`[SwarmCoordinator] Retrying agent #${agent.id}`);
          this.registry.updateAgentStatus(agent.id, 'idle');
          await this.delay(this.config.retryDelayMs);
          return run();
        }

        throw error;
      }
    };

    // Race execution against timeout
    await Promise.race([
      run(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Agent #${agent.id} timed out after ${timeout}ms`)),
          timeout,
        ),
      ),
    ]);
  }

  // -------------------------------------------------------------------------
  // Default (simulated) executor — replaced by real executors via setExecutor
  // -------------------------------------------------------------------------

  private async defaultExecutor(agent: Agent, _task: AgentTask): Promise<unknown> {
    const durationMap: Record<AgentDomain, number> = {
      orchestration: 1000,
      security: 2000,
      core: 3000,
      integration: 2500,
      quality: 1500,
      performance: 2000,
      deployment: 1000,
    };

    await this.delay(durationMap[agent.domain] ?? 2000);

    // 5% simulated failure
    if (Math.random() < 0.05) {
      throw new Error(`Simulated failure for agent #${agent.id}`);
    }

    return { simulated: true, agent: agent.name };
  }

  // -------------------------------------------------------------------------
  // Monitoring integration
  // -------------------------------------------------------------------------

  private startMonitoring(): void {
    if (!this.config.enableMonitoring) return;

    // Capture initial snapshot
    this.captureSnapshot();

    this.monitorInterval = setInterval(() => {
      this.captureSnapshot();
    }, this.config.monitoringIntervalMs);
  }

  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    // Final snapshot
    this.captureSnapshot();
  }

  private captureSnapshot(): void {
    const agents = this.registry.getAllAgents();
    const metrics = this.getMetrics();
    const phaseProgress = new Map<number, number>();

    for (const [id, phase] of this.phases) {
      if (phase.status === 'completed') {
        phaseProgress.set(id, 100);
      } else if (phase.status === 'active') {
        const total = phase.agentIds.length;
        const done = phase.agentIds.filter((aid) =>
          this.completedAgentIds.has(aid),
        ).length;
        phaseProgress.set(id, total > 0 ? (done / total) * 100 : 0);
      } else {
        phaseProgress.set(id, 0);
      }
    }

    this.efficiencyMonitor.recordSnapshot(agents, metrics, phaseProgress);
  }

  /** Get an on-demand efficiency report. */
  getEfficiencyReport(): EfficiencyReport {
    return this.efficiencyMonitor.generateReport();
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private initializePhases(): void {
    for (const phaseDef of SWARM_PHASES) {
      const phase: SwarmPhase = { ...phaseDef, status: 'pending' };
      this.phases.set(phase.id, phase);
    }
  }

  /** Try to map a topology batch back to a legacy phase for UI compat. */
  private findLegacyPhase(batch: ExecutionBatch): SwarmPhase | undefined {
    for (const phase of this.phases.values()) {
      const overlap = batch.agentIds.filter((id) =>
        phase.agentIds.includes(id),
      );
      if (overlap.length > 0 && phase.status === 'pending') {
        phase.status = 'active';
        phase.startTime = Date.now();
        return phase;
      }
    }
    return undefined;
  }

  private shouldRetryAgent(agent: Agent): boolean {
    const tasks = this.registry.getTasksByAgent(agent.id);
    const failed = tasks.filter((t) => t.status === 'failed');
    return failed.length < this.config.retryAttempts;
  }

  private getTaskDependencies(agent: Agent): string[] {
    const deps: string[] = [];
    for (const depId of agent.dependencies) {
      const depTasks = this.registry.getTasksByAgent(depId);
      const latest = depTasks[depTasks.length - 1];
      if (latest) deps.push(latest.id);
    }
    return deps;
  }

  private getMetrics(): SwarmMetrics {
    const stats = this.registry.getSwarmStats();
    const readyTasks = this.registry.getReadyTasks();

    return {
      activeAgents: stats.activeAgents,
      idleAgents: stats.idleAgents,
      completedAgents: stats.completedAgents,
      failedAgents: stats.failedAgents,
      queueDepth: readyTasks.length,
      avgTaskDuration: stats.avgSuccessRate * 1000,
      successRate: stats.avgSuccessRate,
      efficiency: stats.avgUtilization,
    };
  }

  private reportProgress(): void {
    this.onProgress?.(this.getMetrics());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // -------------------------------------------------------------------------
  // Public queries
  // -------------------------------------------------------------------------

  getStatus(): {
    isRunning: boolean;
    currentPhase: number;
    topology: SwarmTopology;
    phases: SwarmPhase[];
    agents: Agent[];
    metrics: SwarmMetrics;
  } {
    return {
      isRunning: this.isRunning,
      currentPhase: this.currentPhase,
      topology: this.topologyStrategy.type,
      phases: Array.from(this.phases.values()).sort((a, b) => a.id - b.id),
      agents: this.registry.getAllAgents(),
      metrics: this.getMetrics(),
    };
  }

  getPhase(id: number): SwarmPhase | undefined {
    return this.phases.get(id);
  }

  /** Validate the current topology against the agent set. */
  validateTopology(): TopologyValidation {
    return this.topologyStrategy.validate(this.registry.getAllAgents());
  }

  /** Get the full execution plan without running it. */
  getExecutionPlan(): ExecutionBatch[] {
    return this.topologyStrategy.getExecutionPlan(
      this.registry.getAllAgents(),
    );
  }

  /** Get agents currently eligible for execution. */
  getReadyAgents(): Agent[] {
    return this.topologyStrategy.getExecutableAgents(
      this.registry.getAllAgents(),
      this.completedAgentIds,
    );
  }

  /** Get message route between two agents (topology-aware). */
  getMessageRoute(fromId: number, toId: number): number[] {
    return this.topologyStrategy.getMessageRoute(
      fromId,
      toId,
      this.registry.getAllAgents(),
    );
  }

  /** Check if all dependencies are satisfied for an agent. */
  areDependenciesSatisfied(agentId: number): boolean {
    const agent = this.registry.getAgent(agentId);
    if (!agent) return false;
    return agent.dependencies.every((d) => this.completedAgentIds.has(d));
  }

  /** Reset swarm to initial state. */
  reset(): void {
    this.stopMonitoring();
    this.isRunning = false;
    this.currentPhase = 0;
    this.executionStartTime = 0;
    this.completedAgentIds.clear();
    this.registry.reset();
    this.efficiencyMonitor.reset();
    this.phases.clear();
    this.initializePhases();

    // Rebuild topology strategy with fresh agents
    this.topologyStrategy = createTopologyStrategy(
      this.config.topology,
      this.registry.getAllAgents(),
    );
  }
}

export default SwarmCoordinator;
