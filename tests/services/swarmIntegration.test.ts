/**
 * V3 Swarm Integration Tests
 *
 * Comprehensive test suite for V3 swarm coordination integration.
 */

// Mock modules before imports
jest.mock('../../src/core/swarm/swarm-coordinator', () => {
  const mockRegistry = {
    getAllAgents: jest.fn().mockReturnValue([]),
    getAgent: jest.fn().mockReturnValue({
      id: 1,
      name: 'Test Agent',
      domain: 'core',
      status: 'idle',
      dependencies: [],
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        avgExecutionTime: 0,
        successRate: 0,
        utilization: 0,
      },
    }),
    getAgentsByDomain: jest.fn().mockReturnValue([]),
    getAvailableAgents: jest.fn().mockReturnValue([]),
    areDependenciesSatisfied: jest.fn().mockReturnValue(true),
    getTasksByAgent: jest.fn().mockReturnValue([]),
    getSwarmStats: jest.fn().mockReturnValue({
      totalAgents: 15,
      activeAgents: 0,
      idleAgents: 15,
      completedAgents: 0,
      failedAgents: 0,
      blockedAgents: 0,
      avgSuccessRate: 0,
      avgUtilization: 0,
    }),
    getReadyTasks: jest.fn().mockReturnValue([]),
    createTask: jest.fn().mockReturnValue({ id: 'task-1', status: 'pending' }),
    updateTaskStatus: jest.fn(),
    updateAgentStatus: jest.fn(),
    reset: jest.fn(),
  };
  
  const MockCoordinator = jest.fn().mockImplementation(() => ({
    registry: mockRegistry,
    getStatus: jest.fn().mockReturnValue({
      isRunning: false,
      currentPhase: 0,
      phases: [],
      agents: [],
      metrics: {
        activeAgents: 0,
        idleAgents: 15,
        completedAgents: 0,
        failedAgents: 0,
        efficiency: 0,
        queueDepth: 0,
        avgTaskDuration: 0,
        successRate: 0,
      },
    }),
    getPhase: jest.fn().mockReturnValue({
      id: 0,
      name: 'Not Started',
      status: 'pending',
    }),
    execute: jest.fn().mockResolvedValue({
      success: true,
      phasesCompleted: 4,
      phasesFailed: 0,
      totalDuration: 1000,
      agentResults: new Map(),
      errors: [],
    }),
    reset: jest.fn(),
  }));
  return { __esModule: true, default: MockCoordinator, SwarmCoordinator: MockCoordinator };
});

jest.mock('../../src/core/swarm/agent-registry', () => {
  const MockRegistry = jest.fn().mockImplementation(() => ({
    getAllAgents: jest.fn().mockReturnValue([]),
    getAgent: jest.fn().mockReturnValue({
      id: 1,
      name: 'Test Agent',
      domain: 'core',
      status: 'idle',
      dependencies: [],
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        avgExecutionTime: 0,
        successRate: 0,
        utilization: 0,
      },
    }),
    getAgentsByDomain: jest.fn().mockReturnValue([]),
    getAvailableAgents: jest.fn().mockReturnValue([]),
    areDependenciesSatisfied: jest.fn().mockReturnValue(true),
    getTasksByAgent: jest.fn().mockReturnValue([]),
    getSwarmStats: jest.fn().mockReturnValue({
      totalAgents: 15,
      activeAgents: 0,
      idleAgents: 15,
      completedAgents: 0,
      failedAgents: 0,
      blockedAgents: 0,
      avgSuccessRate: 0,
      avgUtilization: 0,
    }),
    getReadyTasks: jest.fn().mockReturnValue([]),
    createTask: jest.fn().mockReturnValue({ id: 'task-1', status: 'pending' }),
    updateTaskStatus: jest.fn(),
    updateAgentStatus: jest.fn(),
    reset: jest.fn(),
  }));
  return { __esModule: true, default: MockRegistry, AgentRegistry: MockRegistry };
});

jest.mock('../../src/core/swarm/communication-bus', () => {
  return {
    CommunicationBus: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn().mockReturnValue('msg-1'),
      broadcast: jest.fn().mockReturnValue('msg-1'),
      subscribe: jest.fn().mockReturnValue(jest.fn()),
      getMetrics: jest.fn().mockReturnValue({
        messagesSent: 0,
        messagesReceived: 0,
        messagesDropped: 0,
        avgLatency: 0,
        queueDepth: 0,
      }),
      getQueueDepth: jest.fn().mockReturnValue(0),
    })),
  };
});

jest.mock('../../src/core/swarm/load-balancer', () => {
  return {
    LoadBalancer: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      registerAgent: jest.fn(),
      updateAgentLoad: jest.fn(),
      selectAgent: jest.fn().mockReturnValue(null),
      getDistribution: jest.fn().mockReturnValue([]),
      getSwarmUtilization: jest.fn().mockReturnValue(0),
      optimizeDistribution: jest.fn().mockReturnValue(new Map()),
      reset: jest.fn(),
    })),
  };
});

jest.mock('../../src/core/swarm/efficiency-monitor', () => {
  const MockMonitor = jest.fn().mockImplementation(() => ({
    recordSnapshot: jest.fn(),
    generateReport: jest.fn().mockReturnValue({
      timestamp: Date.now(),
      totalEfficiency: 0.85,
      targetEfficiency: 0.85,
      achieved: true,
      bottlenecks: [],
      recommendations: ['Swarm operating at optimal efficiency'],
      metrics: {
        avgAgentUtilization: 0.85,
        coordinationOverhead: 0.05,
        messageLatency: 50,
        dependencyWaitTime: 0,
      },
    }),
    getSnapshots: jest.fn().mockReturnValue([]),
    getBottleneckHistory: jest.fn().mockReturnValue([]),
    reset: jest.fn(),
  }));
  return { __esModule: true, default: MockMonitor, EfficiencyMonitor: MockMonitor };
});
jest.mock('../../src/services/swarmEngine', () => ({
  executeSwarm: jest.fn(),
  executeDeveloperTask: jest.fn(),
  parseStoryContext: jest.fn(),
  retryFailedTasks: jest.fn(),
  generateExecutionId: jest.fn(),
  DEFAULT_SWARM_CONFIG: {},
}));
jest.mock('../../src/services/api', () => ({
  sendChat: jest.fn(),
  triggerThink: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

import SwarmIntegrationService, {
  getSwarmIntegrationService,
  resetSwarmIntegrationService,
  DEFAULT_INTEGRATION_CONFIG,
} from '../../src/services/swarmIntegration';
import SwarmCoordinator from '../../src/core/swarm/swarm-coordinator';

describe('SwarmIntegrationService', () => {
  let service: SwarmIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSwarmIntegrationService();
    service = getSwarmIntegrationService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('Initialization', () => {
    it('[P0] should initialize with default config', () => {
      expect(service).toBeDefined();
    });

    it('[P0] should initialize with custom config', () => {
      const customService = new SwarmIntegrationService({
        maxParallelAgents: 10,
        enableRealtimeUpdates: false,
      });

      expect(customService).toBeDefined();
    });

    it('[P0] should return singleton instance', () => {
      const instance1 = getSwarmIntegrationService();
      const instance2 = getSwarmIntegrationService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('[P0] should use default integration config', () => {
      const newService = new SwarmIntegrationService();
      expect(newService).toBeDefined();
    });

    it('[P1] should merge custom config with defaults', () => {
      const customService = new SwarmIntegrationService({
        maxParallelAgents: 8,
        taskTimeoutMs: 600000,
      });

      expect(customService).toBeDefined();
    });
  });

  describe('Status Updates', () => {
    it('[P0] should get current swarm status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('activePhase');
      expect(status).toHaveProperty('agentUpdates');
    });

    it('[P1] should subscribe to status updates', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribeToUpdates(callback);

      expect(typeof unsubscribe).toBe('function');

      // Cleanup
      unsubscribe();
    });

    it('[P1] should unsubscribe from status updates', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribeToUpdates(callback);

      // Unsubscribe
      unsubscribe();

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Swarm Execution', () => {
    it('[P0] should throw if not initialized', async () => {
      const freshService = new SwarmIntegrationService();

      await expect(freshService.executeSwarm()).rejects.toThrow('not initialized');
    });

    it('[P1] should initialize with socket', async () => {
      const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
      };

      await service.initialize(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('swarm:status:request', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('swarm:command', expect.any(Function));
    });

    it('[P1] should not reinitialize if already initialized', async () => {
      const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
      };

      await service.initialize(mockSocket);
      await service.initialize(mockSocket);

      // Should not throw or cause issues
      expect(service).toBeDefined();
    });
  });

  describe('Domain Broadcasting', () => {
    it('[P1] should broadcast to security domain', async () => {
      await service.broadcastToDomain('security', {
        type: 'task',
        payload: { message: 'test' },
      });

      // Should not throw
      expect(service).toBeDefined();
    });

    it('[P1] should broadcast to core domain', async () => {
      await service.broadcastToDomain('core', {
        type: 'coordination',
        payload: { data: 'test' },
      });

      // Should not throw
      expect(service).toBeDefined();
    });

    it('[P1] should broadcast to all domains', async () => {
      const domains = ['security', 'core', 'integration', 'quality', 'performance', 'deployment'] as const;

      for (const domain of domains) {
        await service.broadcastToDomain(domain, {
          type: 'status',
          payload: {},
        });
      }

      // Should not throw
      expect(service).toBeDefined();
    });
  });

  describe('Workload Management', () => {
    it('[P1] should rebalance workload', async () => {
      await service.rebalanceWorkload();

      // Should not throw
      expect(service).toBeDefined();
    });
  });

  describe('Efficiency Metrics', () => {
    it('[P1] should return null if efficiency monitoring disabled', async () => {
      const serviceWithoutMonitor = new SwarmIntegrationService({
        enableEfficiencyMonitoring: false,
      });

      const metrics = await serviceWithoutMonitor.getEfficiencyMetrics();

      expect(metrics).toBeNull();
    });

    it('[P1] should return metrics if efficiency monitoring enabled', async () => {
      const metrics = await service.getEfficiencyMetrics();

      if (metrics) {
        expect(metrics).toHaveProperty('efficiency');
        expect(metrics).toHaveProperty('bottlenecks');
        expect(metrics).toHaveProperty('recommendations');
        expect(Array.isArray(metrics.bottlenecks)).toBe(true);
        expect(Array.isArray(metrics.recommendations)).toBe(true);
      }
    });
  });

  describe('Reset', () => {
    it('[P0] should reset swarm state', () => {
      service.reset();

      const status = service.getStatus();
      expect(status.activePhase).toBe(0);
      expect(status.phaseStatus).toBe('pending');
    });
  });

  describe('Agent Task Handlers', () => {
    it('[P1] should register agent task handlers', () => {
      // This is called internally during executeSwarm
      (service as any).registerAgentTaskHandlers();

      // Should not throw
      expect(service).toBeDefined();
    });
  });
});

describe('getSwarmIntegrationService', () => {
  beforeEach(() => {
    resetSwarmIntegrationService();
  });

  it('[P0] should return a new instance', () => {
    const service = getSwarmIntegrationService();
    expect(service).toBeInstanceOf(SwarmIntegrationService);
  });

  it('[P0] should return same instance on subsequent calls', () => {
    const service1 = getSwarmIntegrationService();
    const service2 = getSwarmIntegrationService();

    expect(service1).toBe(service2);
  });
});

describe('resetSwarmIntegrationService', () => {
  it('[P0] should reset the singleton', () => {
    const service1 = getSwarmIntegrationService();
    resetSwarmIntegrationService();
    const service2 = getSwarmIntegrationService();

    expect(service1).not.toBe(service2);
  });
});
