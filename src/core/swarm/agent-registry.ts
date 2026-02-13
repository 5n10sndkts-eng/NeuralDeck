/**
 * V3 Swarm Coordination - Agent Registry
 * 
 * Manages the 15-agent hierarchical mesh swarm for NeuralDeck.
 * Tracks agent states, capabilities, and assignments.
 */

export type AgentDomain = 
  | 'orchestration' 
  | 'security' 
  | 'core' 
  | 'integration' 
  | 'quality' 
  | 'performance' 
  | 'deployment';

export type AgentStatus = 
  | 'idle' 
  | 'assigned' 
  | 'working' 
  | 'completed' 
  | 'failed' 
  | 'blocked';

export interface Agent {
  id: number;
  name: string;
  domain: AgentDomain;
  status: AgentStatus;
  currentTask?: string;
  completedTasks: number;
  failedTasks: number;
  capabilities: string[];
  dependencies: number[];  // IDs of agents this agent depends on
  dependents: number[];    // IDs of agents that depend on this agent
  metrics: {
    avgTaskDuration: number;
    successRate: number;
    utilization: number;
  };
  assignedAt?: number;
  completedAt?: number;
}

export interface AgentTask {
  id: string;
  agentId: number;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];  // Task IDs that must complete first
  status: AgentStatus;
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
}

// 15-Agent Swarm Definition
export const SWARM_AGENTS: Omit<Agent, 'completedTasks' | 'failedTasks' | 'metrics'>[] = [
  {
    id: 1,
    name: 'Queen Coordinator',
    domain: 'orchestration',
    status: 'idle',
    capabilities: ['coordination', 'github', 'timeline', 'dependency-management'],
    dependencies: [],
    dependents: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  },
  {
    id: 2,
    name: 'Security Architect',
    domain: 'security',
    status: 'idle',
    capabilities: ['threat-modeling', 'security-boundaries', 'cve-planning'],
    dependencies: [1],
    dependents: [3, 4]
  },
  {
    id: 3,
    name: 'Security Implementer',
    domain: 'security',
    status: 'idle',
    capabilities: ['cve-fixes', 'secure-patterns', 'dependency-updates'],
    dependencies: [1, 2],
    dependents: []
  },
  {
    id: 4,
    name: 'Security Tester',
    domain: 'security',
    status: 'idle',
    capabilities: ['tdd-security', 'penetration-testing', 'vulnerability-scanning'],
    dependencies: [1, 2],
    dependents: []
  },
  {
    id: 5,
    name: 'Core Architect',
    domain: 'core',
    status: 'idle',
    capabilities: ['ddd-architecture', 'domain-boundaries', 'coordination'],
    dependencies: [1],
    dependents: [6, 7, 8, 9]
  },
  {
    id: 6,
    name: 'Core Implementer',
    domain: 'core',
    status: 'idle',
    capabilities: ['core-modules', 'type-modernization', 'implementation'],
    dependencies: [1, 5],
    dependents: []
  },
  {
    id: 7,
    name: 'Memory Specialist',
    domain: 'core',
    status: 'idle',
    capabilities: ['agentdb', 'memory-unification', 'hnsw-indexing'],
    dependencies: [1, 5],
    dependents: [8, 12]
  },
  {
    id: 8,
    name: 'Swarm Specialist',
    domain: 'core',
    status: 'idle',
    capabilities: ['swarm-coordination', 'unified-engine', 'mesh-topology'],
    dependencies: [1, 5, 7],
    dependents: []
  },
  {
    id: 9,
    name: 'MCP Specialist',
    domain: 'core',
    status: 'idle',
    capabilities: ['mcp-optimization', 'connection-pooling', 'fast-tool-registry'],
    dependencies: [1, 5],
    dependents: []
  },
  {
    id: 10,
    name: 'Integration Architect',
    domain: 'integration',
    status: 'idle',
    capabilities: ['agentic-flow-integration', 'deep-integration', 'api-design'],
    dependencies: [1, 5, 7, 8],
    dependents: [11, 12]
  },
  {
    id: 11,
    name: 'CLI/Hooks Developer',
    domain: 'integration',
    status: 'idle',
    capabilities: ['cli-modernization', 'hooks-system', 'automation'],
    dependencies: [1, 5, 10],
    dependents: []
  },
  {
    id: 12,
    name: 'Neural/Learning Developer',
    domain: 'integration',
    status: 'idle',
    capabilities: ['sona-integration', 'learning-adaptation', 'neural-patterns'],
    dependencies: [1, 7, 10],
    dependents: []
  },
  {
    id: 13,
    name: 'TDD Test Engineer',
    domain: 'quality',
    status: 'idle',
    capabilities: ['tdd-framework', 'london-school', 'test-coverage'],
    dependencies: [1, 2, 5],
    dependents: [15]
  },
  {
    id: 14,
    name: 'Performance Engineer',
    domain: 'performance',
    status: 'idle',
    capabilities: ['performance-benchmarking', 'optimization', 'validation'],
    dependencies: [1, 5, 7, 8, 10],
    dependents: [15]
  },
  {
    id: 15,
    name: 'Release Engineer',
    domain: 'deployment',
    status: 'idle',
    capabilities: ['ci-cd', 'release-management', 'deployment'],
    dependencies: [1, 13, 14],
    dependents: []
  }
];

export class AgentRegistry {
  private agents: Map<number, Agent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private taskQueue: string[] = [];

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    for (const agentDef of SWARM_AGENTS) {
      const agent: Agent = {
        ...agentDef,
        completedTasks: 0,
        failedTasks: 0,
        metrics: {
          avgTaskDuration: 0,
          successRate: 1.0,
          utilization: 0
        }
      };
      this.agents.set(agent.id, agent);
    }
  }

  getAgent(id: number): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByDomain(domain: AgentDomain): Agent[] {
    return this.getAllAgents().filter(agent => agent.domain === domain);
  }

  getAgentsByStatus(status: AgentStatus): Agent[] {
    return this.getAllAgents().filter(agent => agent.status === status);
  }

  getAvailableAgents(): Agent[] {
    return this.getAllAgents().filter(agent => agent.status === 'idle');
  }

  getAgentsByCapability(capability: string): Agent[] {
    return this.getAllAgents().filter(agent => 
      agent.capabilities.includes(capability)
    );
  }

  updateAgentStatus(id: number, status: AgentStatus, taskId?: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.status = status;
    
    if (status === 'assigned' && taskId) {
      agent.currentTask = taskId;
      agent.assignedAt = Date.now();
    } else if (status === 'completed' || status === 'failed') {
      agent.completedAt = Date.now();
      if (agent.currentTask) {
        const task = this.tasks.get(agent.currentTask);
        if (task) {
          if (status === 'completed') {
            agent.completedTasks++;
          } else {
            agent.failedTasks++;
          }
          this.updateAgentMetrics(agent, task);
        }
      }
      agent.currentTask = undefined;
    }
  }

  private updateAgentMetrics(agent: Agent, task: AgentTask): void {
    if (task.startTime && task.endTime) {
      const duration = task.endTime - task.startTime;
      
      // Update average task duration (moving average)
      if (agent.metrics.avgTaskDuration === 0) {
        agent.metrics.avgTaskDuration = duration;
      } else {
        agent.metrics.avgTaskDuration = 
          (agent.metrics.avgTaskDuration * 0.9) + (duration * 0.1);
      }
    }

    // Update success rate
    const totalTasks = agent.completedTasks + agent.failedTasks;
    if (totalTasks > 0) {
      agent.metrics.successRate = agent.completedTasks / totalTasks;
    }

    // Update utilization
    const activeTime = agent.assignedAt 
      ? (agent.completedAt || Date.now()) - agent.assignedAt 
      : 0;
    const totalTime = Date.now() - (agent.assignedAt || Date.now());
    agent.metrics.utilization = totalTime > 0 
      ? activeTime / totalTime 
      : 0;
  }

  createTask(
    agentId: number, 
    description: string, 
    priority: AgentTask['priority'],
    dependencies: string[] = []
  ): AgentTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: AgentTask = {
      id,
      agentId,
      description,
      priority,
      dependencies,
      status: 'idle'
    };

    this.tasks.set(id, task);
    this.taskQueue.push(id);
    this.sortTaskQueue();

    return task;
  }

  getTask(id: string): AgentTask | undefined {
    return this.tasks.get(id);
  }

  getTasksByAgent(agentId: number): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.agentId === agentId);
  }

  getTasksByStatus(status: AgentStatus): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status);
  }

  updateTaskStatus(
    id: string, 
    status: AgentStatus, 
    result?: any, 
    error?: string
  ): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = status;

    if (status === 'working' && !task.startTime) {
      task.startTime = Date.now();
    } else if (status === 'completed' || status === 'failed') {
      task.endTime = Date.now();
      task.result = result;
      task.error = error;
    }
  }

  getReadyTasks(): AgentTask[] {
    return this.taskQueue
      .map(id => this.tasks.get(id)!)
      .filter(task => {
        if (task.status !== 'idle') return false;
        
        // Check if all dependencies are completed
        return task.dependencies.every(depId => {
          const dep = this.tasks.get(depId);
          return dep?.status === 'completed';
        });
      });
  }

  getDependencyChain(agentId: number): number[] {
    const chain: number[] = [];
    const visited = new Set<number>();
    
    const addDependencies = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const agent = this.agents.get(id);
      if (!agent) return;
      
      for (const depId of agent.dependencies) {
        chain.push(depId);
        addDependencies(depId);
      }
    };
    
    addDependencies(agentId);
    return chain;
  }

  getSwarmStats(): {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    completedAgents: number;
    failedAgents: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgSuccessRate: number;
    avgUtilization: number;
  } {
    const agents = this.getAllAgents();
    const tasks = Array.from(this.tasks.values());
    
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'working').length,
      idleAgents: agents.filter(a => a.status === 'idle').length,
      completedAgents: agents.filter(a => a.status === 'completed').length,
      failedAgents: agents.filter(a => a.status === 'failed').length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      avgSuccessRate: agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length,
      avgUtilization: agents.reduce((sum, a) => sum + a.metrics.utilization, 0) / agents.length
    };
  }

  private sortTaskQueue(): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    this.taskQueue.sort((aId, bId) => {
      const a = this.tasks.get(aId)!;
      const b = this.tasks.get(bId)!;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  reset(): void {
    this.agents.clear();
    this.tasks.clear();
    this.taskQueue = [];
    this.initializeAgents();
  }
}

export default AgentRegistry;
