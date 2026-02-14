/**
 * V3 Swarm Integration Service
 *
 * Bridges the new V3 Swarm Coordinator with existing NeuralDeck infrastructure.
 * Integrates with useSwarm hook, swarmEngine, and WebSocket for real-time updates.
 */

import SwarmCoordinator, {
  SwarmExecutionConfig,
  SwarmExecutionResult,
  SwarmMetrics,
} from '../core/swarm/swarm-coordinator';
import AgentRegistry, { Agent, AgentTask, AgentStatus } from '../core/swarm/agent-registry';
import { CommunicationBus, SwarmMessage } from '../core/swarm/communication-bus';
import EfficiencyMonitor, { type EfficiencyReport } from '../core/swarm/efficiency-monitor';
import { LoadBalancer } from '../core/swarm/load-balancer';
import {
  type TopologyConfig,
  type SwarmTopology,
  type ExecutionBatch,
  createTopologyStrategy,
  recommendTopology,
} from '../core/swarm/topology';
import {
  executeSwarm,
  DeveloperTaskResult,
  SwarmExecutionConfig as LegacySwarmConfig,
} from './swarmEngine';
import { StoryMetadata } from '../hooks/useStoryWatcher';
import { LlmConfig, AgentAction, LlmProvider } from '../types';
import { sendChat } from './api';
import { executeAgentTask } from './agentTaskHandlers';
import { logger } from '@/services/logger';

export interface SwarmIntegrationConfig {
  enableRealtimeUpdates: boolean;
  enableLegacyIntegration: boolean;
  enableEfficiencyMonitoring: boolean;
  maxParallelAgents: number;
  taskTimeoutMs: number;
  retryAttempts: number;
  /** Topology to use for swarm execution. Defaults to hierarchical. */
  topology: TopologyConfig;
}

export const DEFAULT_INTEGRATION_CONFIG: SwarmIntegrationConfig = {
  enableRealtimeUpdates: true,
  enableLegacyIntegration: true,
  enableEfficiencyMonitoring: true,
  maxParallelAgents: 5,
  taskTimeoutMs: 300000,
  retryAttempts: 2,
  topology: { type: 'hierarchical', coordinatorId: 1 },
};

export interface AgentExecutionContext {
  agentId: number;
  task: AgentTask;
  llmConfig: LlmConfig;
  onProgress?: (progress: number, message: string) => void;
  onAction?: (action: AgentAction) => void;
}

export interface SwarmStatusUpdate {
  timestamp: number;
  metrics: SwarmMetrics;
  activePhase: number;
  phaseStatus: 'pending' | 'active' | 'completed' | 'failed';
  agentUpdates: Array<{
    agentId: number;
    status: AgentStatus;
    currentTask?: AgentTask;
    progress: number;
  }>;
}

/**
 * V3 Swarm Integration Service
 *
 * Provides unified interface between V3 swarm coordination and NeuralDeck.
 */
export class SwarmIntegrationService {
  private coordinator: SwarmCoordinator;
  private commBus: CommunicationBus;
  private loadBalancer: LoadBalancer;
  private efficiencyMonitor?: EfficiencyMonitor;
  private config: SwarmIntegrationConfig;
  private topologyConfig: TopologyConfig;
  private socket?: any; // Socket.IO instance
  private statusListeners: Set<(update: SwarmStatusUpdate) => void> = new Set();
  private isInitialized: boolean = false;
  private llmConfig: LlmConfig = { provider: 'anthropic' as LlmProvider, model: 'claude-3.5-sonnet' };

  constructor(config: Partial<SwarmIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };
    this.topologyConfig = this.config.topology;

    // Initialize V3 swarm components
    this.coordinator = new SwarmCoordinator({
      maxParallelAgents: this.config.maxParallelAgents,
      taskTimeoutMs: this.config.taskTimeoutMs,
      retryAttempts: this.config.retryAttempts,
      topology: this.topologyConfig,
      enableMonitoring: this.config.enableEfficiencyMonitoring,
      monitoringIntervalMs: 5000,
    });

    this.commBus = new CommunicationBus();
    this.loadBalancer = new LoadBalancer({
      maxTasksPerAgent: 3,
      enableDynamicBalancing: true,
      balancingThreshold: 0.8,
      checkIntervalMs: 5000,
    });

    if (this.config.enableEfficiencyMonitoring) {
      this.efficiencyMonitor = new EfficiencyMonitor();
    }
  }

  /**
   * Switch swarm topology at runtime.
   * Takes effect on the next executeSwarm() call.
   */
  setTopology(topology: SwarmTopology | TopologyConfig): void {
    this.topologyConfig =
      typeof topology === 'string' ? { type: topology } : topology;
    this.config.topology = this.topologyConfig;
    logger.info(`[SwarmIntegration] Topology changed to: ${this.topologyConfig.type}`);
  }

  /**
   * Get available topologies with descriptions.
   */
  getAvailableTopologies(): Array<{ type: SwarmTopology; description: string }> {
    return [
      { type: 'mesh', description: 'All agents communicate directly — maximum parallelism, best for independent tasks' },
      { type: 'hierarchical', description: 'Coordinator delegates to domain leads — structured phases, best for complex workflows' },
      { type: 'star', description: 'Central hub dispatches all work — centralized control, best for tightly coupled tasks' },
      { type: 'ring', description: 'Sequential pipeline — each agent feeds the next, best for linear workflows' },
    ];
  }

  /**
   * Generate execution batches based on current topology.
   * Returns the planned execution order without actually running anything.
   */
  getExecutionPlan(): ExecutionBatch[] {
    const registry = (this.coordinator as any).registry as AgentRegistry;
    const agents = registry.getAllAgents();
    const strategy = createTopologyStrategy(this.topologyConfig, agents);
    return strategy.getExecutionPlan(agents);
  }

  /**
   * Initialize the integration service
   */
  async initialize(socket?: any): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.socket = socket;

    // Set up real-time updates
    if (this.config.enableRealtimeUpdates && socket) {
      this.setupRealtimeUpdates();
    }

    // Set up communication bus listeners
    this.setupCommunicationBus();

    // Set up coordinator callbacks
    this.setupCoordinatorCallbacks();

    this.isInitialized = true;
    logger.info('[SwarmIntegration] Service initialized');
  }

  /**
   * Execute a V3 swarm run
   */
  async executeSwarm(options?: {
    llmConfig?: LlmConfig;
    stories?: StoryMetadata[];
  }): Promise<SwarmExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('SwarmIntegrationService not initialized. Call initialize() first.');
    }

    if (options?.llmConfig) {
      this.llmConfig = options.llmConfig;
    }

    logger.info('[SwarmIntegration] Starting V3 swarm execution');

    // Register actual agent task handlers
    this.registerAgentTaskHandlers();

    // Start efficiency monitoring
    if (this.efficiencyMonitor) {
      const snapshotInterval = setInterval(() => {
        const status = this.coordinator.getStatus();
        const phaseProgress = new Map<number, number>();
        status.phases.forEach(phase => {
          const progress = phase.status === 'completed' ? 100 : phase.status === 'active' ? 50 : 0;
          phaseProgress.set(phase.id, progress);
        });
        this.efficiencyMonitor?.recordSnapshot(status.agents, status.metrics, phaseProgress);
      }, 5000);
      
      // Store interval for cleanup
      (this.efficiencyMonitor as any)._snapshotInterval = snapshotInterval;
    }

    try {
      // Execute the swarm
      const result = await this.coordinator.execute();

      // Generate efficiency report
      if (this.efficiencyMonitor) {
        const report = this.efficiencyMonitor.generateReport();
        logger.info('[SwarmIntegration] Efficiency report:', report);
      }

      return result;
    } finally {
      // Stop efficiency monitoring
      if (this.efficiencyMonitor && (this.efficiencyMonitor as any)._snapshotInterval) {
        clearInterval((this.efficiencyMonitor as any)._snapshotInterval);
      }
    }
  }

  /**
   * Execute developer swarm for stories (legacy integration)
   */
  async executeDeveloperSwarm(
    stories: StoryMetadata[],
    llmConfig: LlmConfig,
    callbacks?: {
      onNodeProgress?: (nodeId: string, state: string, progress: number) => void;
      onNodeLog?: (nodeId: string, message: string) => void;
      onSwarmProgress?: (completed: number, total: number) => void;
    }
  ): Promise<DeveloperTaskResult[]> {
    if (!this.config.enableLegacyIntegration) {
      throw new Error('Legacy integration is disabled');
    }

    logger.info(`[SwarmIntegration] Executing developer swarm for ${stories.length} stories`);

    // Use legacy swarm engine with V3 optimizations
    const legacyConfig: LegacySwarmConfig = {
      maxConcurrency: this.config.maxParallelAgents,
      retryAttempts: this.config.retryAttempts,
      retryDelayMs: 5000,
      timeoutMs: this.config.taskTimeoutMs,
      checkFileLocks: true,
    };

    const result = await executeSwarm(
      stories,
      llmConfig,
      legacyConfig,
      callbacks?.onNodeProgress,
      callbacks?.onNodeLog,
      callbacks?.onSwarmProgress
    );

    return result.nodeResults;
  }

  /**
   * Get current swarm status
   */
  getStatus(): SwarmStatusUpdate {
    const coordinatorStatus = this.coordinator.getStatus();
    const currentPhase = this.coordinator.getPhase(coordinatorStatus.currentPhase);

    return {
      timestamp: Date.now(),
      metrics: coordinatorStatus.metrics,
      activePhase: coordinatorStatus.currentPhase,
      phaseStatus: currentPhase?.status || 'pending',
      agentUpdates: coordinatorStatus.agents.map((agent) => ({
        agentId: agent.id,
        status: agent.status,
        currentTask: this.getAgentCurrentTask(agent.id),
        progress: this.getAgentProgress(agent.id),
      })),
    };
  }

  /**
   * Subscribe to status updates
   */
  subscribeToUpdates(callback: (update: SwarmStatusUpdate) => void): () => void {
    this.statusListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Broadcast message to swarm domain
   */
  async broadcastToDomain(
    domain: 'security' | 'core' | 'integration' | 'quality' | 'performance' | 'deployment',
    message: Partial<SwarmMessage>
  ): Promise<void> {
    const domainAgents: Record<string, number[]> = {
      security: [2, 3, 4],
      core: [5, 6, 7, 8, 9],
      integration: [10, 11, 12],
      quality: [13],
      performance: [14],
      deployment: [15],
    };

    const targetAgents = domainAgents[domain] || [];

    for (const agentId of targetAgents) {
      this.commBus.send({
        type: (message.type as any) || 'coordination',
        priority: (message.priority as any) || 'medium',
        from: 1, // Queen coordinator
        to: agentId,
        payload: message.payload || {},
      });
    }
  }

  /**
   * Balance workload across agents
   */
  async rebalanceWorkload(): Promise<void> {
    // Start load balancer if not already running
    this.loadBalancer.start();
    logger.info('[SwarmIntegration] Load balancer started for dynamic rebalancing');
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics(): Promise<{
    efficiency: number;
    bottlenecks: Array<{ type: string; description: string; severity: string; affectedAgents: number[]; estimatedImpact: number }>;
    recommendations: string[];
  } | null> {
    if (!this.efficiencyMonitor) {
      return null;
    }

    const report = this.efficiencyMonitor.generateReport();
    return {
      efficiency: report.totalEfficiency,
      bottlenecks: report.bottlenecks,
      recommendations: report.recommendations,
    };
  }

  /**
   * Reset the swarm
   */
  reset(): void {
    this.coordinator.reset();
    // CommunicationBus doesn't have a clear method, just stop and restart
    this.commBus.stop();
    this.efficiencyMonitor?.reset();
    logger.info('[SwarmIntegration] Swarm reset');
  }

  // Private methods

  private setupRealtimeUpdates(): void {
    if (!this.socket) return;

    // Listen for swarm status requests from clients
    this.socket.on('swarm:status:request', () => {
      this.broadcastStatus();
    });

    // Listen for swarm commands
    this.socket.on('swarm:command', (command: { type: string; payload: any }) => {
      this.handleSwarmCommand(command);
    });
  }

  private setupCommunicationBus(): void {
    // Listen for messages from all agents (using agent ID 0 as wildcard)
    for (let i = 1; i <= 15; i++) {
      this.commBus.subscribe(i, (message: SwarmMessage) => {
        this.broadcastToSocket('swarm:message', message);
      });
    }
  }

  private setupCoordinatorCallbacks(): void {
    // Override the coordinator's callbacks to integrate with our system
    (this.coordinator as any).onProgress = (metrics: SwarmMetrics) => {
      this.broadcastStatus();
    };

    (this.coordinator as any).onAgentComplete = (agent: Agent, task: AgentTask) => {
      this.broadcastStatus();
      // Update load balancer to reflect completed task
      this.loadBalancer.updateAgentLoad(agent.id, -1);
    };
  }

  private registerAgentTaskHandlers(): void {
    // Replace simulated execution with actual task handlers
    // This would connect to actual agent implementations
    const registry = (this.coordinator as any).registry as AgentRegistry;

    // Register handlers for each agent
    for (let i = 1; i <= 15; i++) {
      this.registerAgentHandler(i, registry);
    }
  }

  private registerAgentHandler(agentId: number, registry: AgentRegistry): void {
    const agent = registry.getAgent(agentId);
    if (!agent) return;

    // Store reference for task execution
    (agent as any).executeTask = async (task: AgentTask) => {
      return this.executeAgentTask(agentId, task);
    };
  }

  private async executeAgentTask(agentId: number, task: AgentTask): Promise<void> {
    const agent = (this.coordinator as any).registry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    logger.info(`[SwarmIntegration] Executing task for agent #${agentId}: ${agent.name}`);

    try {
      // Build context for the agent
      const context = this.buildAgentContext(agent, task);

      // Execute the task based on agent domain
      switch (agent.domain) {
        case 'security':
          await this.executeSecurityAgent(context);
          break;
        case 'core':
          await this.executeCoreAgent(context);
          break;
        case 'integration':
          await this.executeIntegrationAgent(context);
          break;
        case 'quality':
          await this.executeQualityAgent(context);
          break;
        case 'performance':
          await this.executePerformanceAgent(context);
          break;
        case 'deployment':
          await this.executeDeploymentAgent(context);
          break;
        case 'orchestration':
          await this.executeOrchestrationAgent(context);
          break;
        default:
          // Generic task execution
          await this.executeGenericAgent(context);
      }
    } catch (error) {
      logger.error(`[SwarmIntegration] Agent #${agentId} task execution failed:`, error);
      throw error;
    }
  }

  private buildAgentContext(agent: Agent, task: AgentTask): AgentExecutionContext {
    return {
      agentId: agent.id,
      task,
      llmConfig: this.llmConfig,
    };
  }

  // Agent-specific execution handlers

  private async executeSecurityAgent(context: AgentExecutionContext): Promise<void> {
    // Security agents handle: threat modeling, CVE remediation, secure patterns
    const prompt = `You are a security-focused AI agent. Task: ${context.task.description}
    
Analyze the codebase for security issues and provide recommendations.
Focus on: dependency vulnerabilities, insecure patterns, credential exposure, and access control.

Return a JSON object with:
- findings: array of security issues found
- recommendations: array of fixes
- severity: 'low' | 'medium' | 'high' | 'critical'`;

    await this.executeLLMTask(context, prompt);
  }

  private async executeCoreAgent(context: AgentExecutionContext): Promise<void> {
    // Core agents handle: architecture, implementation, memory, swarm, MCP
    const prompt = `You are a core systems AI agent. Task: ${context.task.description}
    
Focus on system architecture, DDD patterns, and core functionality implementation.

Return a JSON object with:
- design: description of the approach
- implementation: code or configuration changes
- tests: test cases to validate`;

    await this.executeLLMTask(context, prompt);
  }

  private async executeIntegrationAgent(context: AgentExecutionContext): Promise<void> {
    // Integration agents handle: agentic-flow integration, CLI, SONA
    const prompt = `You are an integration AI agent. Task: ${context.task.description}
    
Focus on integrating external systems and ensuring compatibility.

Return a JSON object with:
- integration_plan: steps to integrate
- compatibility_notes: any compatibility issues
- configuration: required configuration changes`;

    await this.executeLLMTask(context, prompt);
  }

  private async executeQualityAgent(context: AgentExecutionContext): Promise<void> {
    // Quality agent handles: TDD, testing frameworks
    const prompt = `You are a quality assurance AI agent. Task: ${context.task.description}
    
Focus on test-driven development and comprehensive test coverage.

Return a JSON object with:
- test_plan: testing approach
- test_cases: specific test scenarios
- coverage_targets: expected coverage metrics`;

    await this.executeLLMTask(context, prompt);
  }

  private async executePerformanceAgent(context: AgentExecutionContext): Promise<void> {
    // Performance agent handles: benchmarking, optimization
    const prompt = `You are a performance engineering AI agent. Task: ${context.task.description}
    
Focus on performance optimization and benchmarking.

Return a JSON object with:
- benchmarks: performance measurements
- optimizations: suggested improvements
- targets: performance targets to achieve`;

    await this.executeLLMTask(context, prompt);
  }

  private async executeDeploymentAgent(context: AgentExecutionContext): Promise<void> {
    // Deployment agent handles: CI/CD, release management
    const prompt = `You are a deployment AI agent. Task: ${context.task.description}
    
Focus on CI/CD pipelines and release management.

Return a JSON object with:
- deployment_steps: steps for deployment
- rollback_plan: rollback procedures
- verification: verification checks`;

    await this.executeLLMTask(context, prompt);
  }

  private async executeOrchestrationAgent(context: AgentExecutionContext): Promise<void> {
    // Queen coordinator manages overall coordination
    const prompt = `You are the swarm orchestrator. Task: ${context.task.description}
    
Focus on coordinating the 15-agent swarm and ensuring timeline adherence.

Return a JSON object with:
- coordination_plan: how to coordinate agents
- dependencies: dependency management approach
- timeline: projected timeline`;

    await this.executeLLMTask(context, prompt);
  }

  private async executeGenericAgent(context: AgentExecutionContext): Promise<void> {
    // Generic execution for undefined domains
    const prompt = `You are an AI agent. Task: ${context.task.description}
    
Provide a comprehensive response with actionable insights.

Return a JSON object with:
- analysis: your analysis of the task
- recommendations: actionable recommendations
- next_steps: suggested next steps`;

    await this.executeLLMTask(context, prompt);
  }

  private async executeLLMTask(context: AgentExecutionContext, prompt: string): Promise<void> {
    // Execute LLM call with progress tracking
    if (context.onProgress) {
      context.onProgress(10, 'Sending request to LLM...');
    }

    try {
      // Use the chat API to execute the task
      const response = await sendChat(
        [
          {
            role: 'system',
            content: prompt,
            timestamp: Date.now(),
          },
          {
            role: 'user',
            content: context.task.description,
            timestamp: Date.now(),
          },
        ],
        context.llmConfig
      );

      if (context.onProgress) {
        context.onProgress(100, 'Task completed');
      }

      // Parse and handle any actions
      const action = this.parseAgentAction(response.content);
      if (action && context.onAction) {
        context.onAction(action);
      }
    } catch (error) {
      logger.error('[SwarmIntegration] LLM task execution failed:', error);
      throw error;
    }
  }

  private parseAgentAction(content: string): AgentAction | null {
    try {
      const cleanText = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
      }
    } catch {
      // Not valid JSON
    }
    return null;
  }

  private broadcastStatus(): void {
    const status = this.getStatus();

    // Notify local listeners
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        logger.error('[SwarmIntegration] Status listener error:', error);
      }
    });

    // Broadcast to WebSocket
    this.broadcastToSocket('swarm:status:update', status);
  }

  private broadcastToSocket(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  private handleSwarmCommand(command: { type: string; payload: any }): void {
    switch (command.type) {
      case 'reset':
        this.reset();
        break;
      case 'rebalance':
        this.rebalanceWorkload();
        break;
      case 'getStatus':
        this.broadcastStatus();
        break;
      default:
        logger.warn(`[SwarmIntegration] Unknown command: ${command.type}`);
    }
  }

  private getAgentCurrentTask(agentId: number): AgentTask | undefined {
    const registry = (this.coordinator as any).registry as AgentRegistry;
    const tasks = registry.getTasksByAgent(agentId);
    return tasks.find((t) => t.status === 'working');
  }

  private getAgentProgress(agentId: number): number {
    const currentTask = this.getAgentCurrentTask(agentId);
    if (!currentTask) {
      const agent = (this.coordinator as any).registry.getAgent(agentId);
      return agent?.status === 'completed' ? 100 : 0;
    }
    // Estimate progress based on task age vs expected duration
    // This is a simple heuristic
    return 50; // Default to 50% for in-progress tasks
  }
}

// Singleton instance
let swarmIntegrationService: SwarmIntegrationService | null = null;

export const getSwarmIntegrationService = (
  config?: Partial<SwarmIntegrationConfig>
): SwarmIntegrationService => {
  if (!swarmIntegrationService) {
    swarmIntegrationService = new SwarmIntegrationService(config);
  }
  return swarmIntegrationService;
};

export const resetSwarmIntegrationService = (): void => {
  swarmIntegrationService = null;
};

export default SwarmIntegrationService;
