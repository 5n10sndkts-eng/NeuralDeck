/**
 * V3 Swarm Coordination - Topology Strategies
 *
 * Defines 4 swarm topologies that control agent communication,
 * execution order, and task routing patterns:
 *
 *   Mesh         - All agents communicate directly; max parallelism
 *   Hierarchical - Coordinator delegates to domain leads; structured phases
 *   Star         - Central hub dispatches all work; centralized control
 *   Ring         - Sequential pipeline; each agent feeds the next
 */

import { Agent, AgentDomain } from './agent-registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SwarmTopology = 'mesh' | 'hierarchical' | 'star' | 'ring';

/** A batch of agent IDs that can execute concurrently. */
export interface ExecutionBatch {
  /** Monotonically increasing step number (0-based). */
  step: number;
  /** Agent IDs to run in parallel within this step. */
  agentIds: number[];
  /** Human-readable label for logging / UI. */
  label: string;
}

/** Configuration supplied when selecting a topology. */
export interface TopologyConfig {
  type: SwarmTopology;
  /** Agent ID that acts as coordinator (star / hierarchical). Defaults to 1. */
  coordinatorId?: number;
  /** Explicit agent ordering for ring topology. */
  pipelineOrder?: number[];
  /** Max agents to run concurrently within one batch. 0 = unlimited. */
  maxConcurrency?: number;
}

/** Topology health / validation result. */
export interface TopologyValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

export interface TopologyStrategy {
  readonly type: SwarmTopology;

  /**
   * Given all agents and the set of already-completed agent IDs, return
   * which agents are eligible to execute *right now*.
   */
  getExecutableAgents(agents: Agent[], completedIds: Set<number>): Agent[];

  /**
   * Produce a full execution plan: an ordered array of batches.
   * Batches are executed sequentially; agents within a batch run in parallel.
   */
  getExecutionPlan(agents: Agent[]): ExecutionBatch[];

  /**
   * Return the ordered list of agent IDs a message must traverse to go
   * from `fromId` to `toId`.  For mesh this is direct; for star it
   * always routes through the hub; for ring it follows the pipeline.
   */
  getMessageRoute(fromId: number, toId: number, agents: Agent[]): number[];

  /** Validate that the current agent set is compatible with this topology. */
  validate(agents: Agent[]): TopologyValidation;
}

// ---------------------------------------------------------------------------
// Mesh topology
// ---------------------------------------------------------------------------

class MeshStrategy implements TopologyStrategy {
  readonly type: SwarmTopology = 'mesh';

  constructor(private maxConcurrency: number) {}

  getExecutableAgents(agents: Agent[], completedIds: Set<number>): Agent[] {
    return agents.filter((a) => {
      if (a.status !== 'idle') return false;
      return a.dependencies.every((depId) => completedIds.has(depId));
    });
  }

  getExecutionPlan(agents: Agent[]): ExecutionBatch[] {
    const plan: ExecutionBatch[] = [];
    const completed = new Set<number>();
    const remaining = new Set(agents.map((a) => a.id));
    let step = 0;

    while (remaining.size > 0) {
      const eligible = agents.filter(
        (a) =>
          remaining.has(a.id) &&
          a.dependencies.every((d) => completed.has(d)),
      );

      if (eligible.length === 0) {
        // Deadlock — remaining agents have unsatisfiable deps.
        break;
      }

      const batchIds =
        this.maxConcurrency > 0
          ? eligible.slice(0, this.maxConcurrency).map((a) => a.id)
          : eligible.map((a) => a.id);

      plan.push({
        step,
        agentIds: batchIds,
        label: `Mesh batch ${step} (${batchIds.length} agents)`,
      });

      for (const id of batchIds) {
        completed.add(id);
        remaining.delete(id);
      }
      step++;
    }

    return plan;
  }

  getMessageRoute(fromId: number, toId: number): number[] {
    // Direct peer-to-peer
    return [fromId, toId];
  }

  validate(agents: Agent[]): TopologyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (agents.length === 0) {
      errors.push('No agents registered');
    }

    // Detect unreachable agents (dependency on non-existent agent)
    const ids = new Set(agents.map((a) => a.id));
    for (const a of agents) {
      for (const depId of a.dependencies) {
        if (!ids.has(depId)) {
          errors.push(
            `Agent #${a.id} depends on non-existent agent #${depId}`,
          );
        }
      }
    }

    if (agents.length > 12) {
      warnings.push(
        'Mesh topology with >12 agents may cause high communication overhead',
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ---------------------------------------------------------------------------
// Hierarchical topology
// ---------------------------------------------------------------------------

/** Domain ordering for hierarchical phases. */
const DOMAIN_PHASE_ORDER: AgentDomain[] = [
  'orchestration',
  'security',
  'core',
  'integration',
  'quality',
  'performance',
  'deployment',
];

class HierarchicalStrategy implements TopologyStrategy {
  readonly type: SwarmTopology = 'hierarchical';

  constructor(
    private coordinatorId: number,
    private maxConcurrency: number,
  ) {}

  getExecutableAgents(agents: Agent[], completedIds: Set<number>): Agent[] {
    // Coordinator must complete first.
    if (!completedIds.has(this.coordinatorId)) {
      const coord = agents.find((a) => a.id === this.coordinatorId);
      return coord && coord.status === 'idle' ? [coord] : [];
    }

    return agents.filter((a) => {
      if (a.id === this.coordinatorId) return false;
      if (a.status !== 'idle') return false;
      return a.dependencies.every((d) => completedIds.has(d));
    });
  }

  getExecutionPlan(agents: Agent[]): ExecutionBatch[] {
    const plan: ExecutionBatch[] = [];
    const coordinator = agents.find((a) => a.id === this.coordinatorId);

    // Step 0: coordinator
    if (coordinator) {
      plan.push({
        step: 0,
        agentIds: [coordinator.id],
        label: `Coordinator: ${coordinator.name}`,
      });
    }

    // Remaining steps: group by domain in phase order
    let step = 1;
    for (const domain of DOMAIN_PHASE_ORDER) {
      const domainAgents = agents.filter(
        (a) => a.domain === domain && a.id !== this.coordinatorId,
      );
      if (domainAgents.length === 0) continue;

      const ids = domainAgents.map((a) => a.id);
      const batchIds =
        this.maxConcurrency > 0 ? ids.slice(0, this.maxConcurrency) : ids;

      plan.push({
        step,
        agentIds: batchIds,
        label: `${domain} domain (${batchIds.length} agents)`,
      });

      // If concurrency limited, add overflow batches
      if (this.maxConcurrency > 0 && ids.length > this.maxConcurrency) {
        for (let i = this.maxConcurrency; i < ids.length; i += this.maxConcurrency) {
          step++;
          const overflow = ids.slice(i, i + this.maxConcurrency);
          plan.push({
            step,
            agentIds: overflow,
            label: `${domain} domain overflow (${overflow.length} agents)`,
          });
        }
      }

      step++;
    }

    return plan;
  }

  getMessageRoute(fromId: number, toId: number, agents: Agent[]): number[] {
    const from = agents.find((a) => a.id === fromId);
    const to = agents.find((a) => a.id === toId);

    // Same domain = direct; cross-domain routes through coordinator
    if (from && to && from.domain === to.domain) {
      return [fromId, toId];
    }
    return [fromId, this.coordinatorId, toId];
  }

  validate(agents: Agent[]): TopologyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    const coord = agents.find((a) => a.id === this.coordinatorId);
    if (!coord) {
      errors.push(
        `Coordinator agent #${this.coordinatorId} not found in registry`,
      );
    }

    // Every non-coordinator must depend on coordinator
    for (const a of agents) {
      if (a.id === this.coordinatorId) continue;
      if (!a.dependencies.includes(this.coordinatorId)) {
        warnings.push(
          `Agent #${a.id} does not depend on coordinator #${this.coordinatorId}`,
        );
      }
    }

    // Check for domains with no agents
    const domainSet = new Set(agents.map((a) => a.domain));
    for (const domain of DOMAIN_PHASE_ORDER) {
      if (!domainSet.has(domain)) {
        warnings.push(`No agents assigned to domain: ${domain}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ---------------------------------------------------------------------------
// Star topology
// ---------------------------------------------------------------------------

class StarStrategy implements TopologyStrategy {
  readonly type: SwarmTopology = 'star';

  constructor(
    private hubId: number,
    private maxConcurrency: number,
  ) {}

  getExecutableAgents(agents: Agent[], completedIds: Set<number>): Agent[] {
    // Hub must complete first
    if (!completedIds.has(this.hubId)) {
      const hub = agents.find((a) => a.id === this.hubId);
      return hub && hub.status === 'idle' ? [hub] : [];
    }

    // All remaining agents (spokes) can run in parallel once hub is done,
    // subject only to their own inter-spoke dependencies.
    return agents.filter((a) => {
      if (a.id === this.hubId) return false;
      if (a.status !== 'idle') return false;
      return a.dependencies.every((d) => completedIds.has(d));
    });
  }

  getExecutionPlan(agents: Agent[]): ExecutionBatch[] {
    const plan: ExecutionBatch[] = [];
    const hub = agents.find((a) => a.id === this.hubId);

    // Step 0: hub
    if (hub) {
      plan.push({
        step: 0,
        agentIds: [hub.id],
        label: `Hub: ${hub.name}`,
      });
    }

    // Step 1+: all spokes in parallel (respecting concurrency limit)
    const spokes = agents
      .filter((a) => a.id !== this.hubId)
      .map((a) => a.id);

    if (spokes.length === 0) return plan;

    if (this.maxConcurrency > 0) {
      let step = 1;
      for (let i = 0; i < spokes.length; i += this.maxConcurrency) {
        const batch = spokes.slice(i, i + this.maxConcurrency);
        plan.push({
          step,
          agentIds: batch,
          label: `Spoke batch ${step} (${batch.length} agents)`,
        });
        step++;
      }
    } else {
      plan.push({
        step: 1,
        agentIds: spokes,
        label: `All spokes (${spokes.length} agents)`,
      });
    }

    return plan;
  }

  getMessageRoute(fromId: number, toId: number): number[] {
    // All messages route through hub
    if (fromId === this.hubId) return [fromId, toId];
    if (toId === this.hubId) return [fromId, toId];
    return [fromId, this.hubId, toId];
  }

  validate(agents: Agent[]): TopologyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hub = agents.find((a) => a.id === this.hubId);
    if (!hub) {
      errors.push(`Hub agent #${this.hubId} not found in registry`);
    }

    if (agents.length > 15) {
      warnings.push(
        'Star topology with >15 agents creates a bottleneck at the hub',
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ---------------------------------------------------------------------------
// Ring topology
// ---------------------------------------------------------------------------

class RingStrategy implements TopologyStrategy {
  readonly type: SwarmTopology = 'ring';
  private order: number[];

  constructor(pipelineOrder: number[] | undefined, agents: Agent[]) {
    // Use explicit order or fall back to dependency-sorted order.
    this.order = pipelineOrder ?? this.defaultOrder(agents);
  }

  private defaultOrder(agents: Agent[]): number[] {
    // Topological sort by dependencies
    const sorted: number[] = [];
    const visited = new Set<number>();
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    const visit = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      const agent = agentMap.get(id);
      if (!agent) return;
      for (const dep of agent.dependencies) {
        visit(dep);
      }
      sorted.push(id);
    };

    for (const a of agents) {
      visit(a.id);
    }

    return sorted;
  }

  getExecutableAgents(agents: Agent[], completedIds: Set<number>): Agent[] {
    // Only the next agent in the pipeline that hasn't completed
    for (const id of this.order) {
      if (completedIds.has(id)) continue;
      const agent = agents.find((a) => a.id === id);
      if (agent && agent.status === 'idle') return [agent];
      return []; // Next agent exists but isn't idle — wait
    }
    return []; // All done
  }

  getExecutionPlan(agents: Agent[]): ExecutionBatch[] {
    return this.order.map((id, step) => {
      const agent = agents.find((a) => a.id === id);
      return {
        step,
        agentIds: [id],
        label: `Pipeline step ${step}: ${agent?.name ?? `Agent #${id}`}`,
      };
    });
  }

  getMessageRoute(fromId: number, toId: number): number[] {
    const fromIdx = this.order.indexOf(fromId);
    const toIdx = this.order.indexOf(toId);

    if (fromIdx === -1 || toIdx === -1) return [fromId, toId];

    // Forward along the ring
    const route: number[] = [];
    if (fromIdx <= toIdx) {
      for (let i = fromIdx; i <= toIdx; i++) {
        route.push(this.order[i]);
      }
    } else {
      // Wrap around
      for (let i = fromIdx; i < this.order.length; i++) {
        route.push(this.order[i]);
      }
      for (let i = 0; i <= toIdx; i++) {
        route.push(this.order[i]);
      }
    }

    return route;
  }

  validate(agents: Agent[]): TopologyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    const agentIds = new Set(agents.map((a) => a.id));

    // All agents in order must exist
    for (const id of this.order) {
      if (!agentIds.has(id)) {
        errors.push(`Pipeline references non-existent agent #${id}`);
      }
    }

    // All agents should be in the pipeline
    for (const a of agents) {
      if (!this.order.includes(a.id)) {
        warnings.push(`Agent #${a.id} (${a.name}) is not in the pipeline`);
      }
    }

    if (this.order.length < 2) {
      warnings.push('Ring topology with <2 agents provides no pipeline benefit');
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a topology strategy from configuration.
 *
 * @param config  Topology configuration (type + optional parameters)
 * @param agents  Current agent set (needed for ring default ordering)
 */
export function createTopologyStrategy(
  config: TopologyConfig,
  agents: Agent[],
): TopologyStrategy {
  const concurrency = config.maxConcurrency ?? 0;
  const coordinatorId = config.coordinatorId ?? 1;

  switch (config.type) {
    case 'mesh':
      return new MeshStrategy(concurrency);

    case 'hierarchical':
      return new HierarchicalStrategy(coordinatorId, concurrency);

    case 'star':
      return new StarStrategy(coordinatorId, concurrency);

    case 'ring':
      return new RingStrategy(config.pipelineOrder, agents);

    default: {
      const _exhaustive: never = config.type;
      throw new Error(`Unknown topology: ${_exhaustive}`);
    }
  }
}

/**
 * Recommend a topology based on the task characteristics.
 */
export function recommendTopology(opts: {
  taskCount: number;
  hasDependencyChains: boolean;
  needsCentralControl: boolean;
  isPipeline: boolean;
}): SwarmTopology {
  if (opts.isPipeline) return 'ring';
  if (opts.needsCentralControl) return 'star';
  if (opts.hasDependencyChains) return 'hierarchical';
  return 'mesh';
}
