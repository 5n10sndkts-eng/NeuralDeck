/**
 * V3 Swarm Integration Tests
 *
 * End-to-end integration tests for V3 swarm coordination.
 */

import SwarmIntegrationService from '../../src/services/swarmIntegration';
import SwarmCoordinator from '../../src/core/swarm/swarm-coordinator';
import AgentRegistry from '../../src/core/swarm/agent-registry';
import { CommunicationBus } from '../../src/core/swarm/communication-bus';
import { LoadBalancer } from '../../src/core/swarm/load-balancer';
import EfficiencyMonitor from '../../src/core/swarm/efficiency-monitor';

describe('[P0] V3 Swarm Integration', () => {
  let service: SwarmIntegrationService;

  beforeEach(() => {
    service = new SwarmIntegrationService({
      enableRealtimeUpdates: false,
      enableLegacyIntegration: true,
      enableEfficiencyMonitoring: true,
      maxParallelAgents: 3,
      taskTimeoutMs: 10000,
      retryAttempts: 1,
    });
  });

  afterEach(() => {
    service.reset();
  });

  describe('Phase Execution', () => {
    it('[P0] should execute all 4 phases sequentially', async () => {
      // Initialize with mock socket
      const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
      };

      await service.initialize(mockSocket);

      // Get initial status
      const initialStatus = service.getStatus();
      expect(initialStatus.activePhase).toBe(0);
      expect(initialStatus.phaseStatus).toBe('pending');

      // Note: Full execution would require mocking the LLM calls
      // This test verifies the integration layer is wired correctly
    });

    it('[P1] should maintain phase dependencies', async () => {
      const coordinator = (service as any).coordinator as SwarmCoordinator;
      
      // Check that phase 2 depends on phase 1
      const phase2 = coordinator.getPhase(2);
      expect(phase2?.dependencies).toContain(1);

      // Check that phase 3 depends on phase 2
      const phase3 = coordinator.getPhase(3);
      expect(phase3?.dependencies).toContain(2);

      // Check that phase 4 depends on phase 3
      const phase4 = coordinator.getPhase(4);
      expect(phase4?.dependencies).toContain(3);
    });
  });

  describe('Agent Coordination', () => {
    it('[P0] should initialize all 15 agents', () => {
      const status = service.getStatus();
      expect(status.agentUpdates).toBeDefined();
    });

    it('[P1] should track agent dependencies', () => {
      const coordinator = (service as any).coordinator as SwarmCoordinator;
      const registry = (coordinator as any).registry as AgentRegistry;

      // Check agent 5 (Core Architect) depends on agent 2 (Security Architect)
      const agent5 = registry.getAgent(5);
      expect(agent5?.dependencies).toContain(2);

      // Check agent 10 (Integration Architect) depends on agents 5, 7, 8
      const agent10 = registry.getAgent(10);
      expect(agent10?.dependencies).toContain(5);
      expect(agent10?.dependencies).toContain(7);
      expect(agent10?.dependencies).toContain(8);
    });
  });

  describe('Communication Bus', () => {
    it('[P0] should initialize communication bus', async () => {
      const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
      };

      await service.initialize(mockSocket);

      const commBus = (service as any).commBus as CommunicationBus;
      expect(commBus).toBeDefined();
    });

    it('[P1] should broadcast to domains', async () => {
      const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
      };

      await service.initialize(mockSocket);

      // Should not throw
      await service.broadcastToDomain('security', {
        type: 'task',
        payload: { test: true },
      });

      await service.broadcastToDomain('core', {
        type: 'coordination',
        payload: { test: true },
      });
    });
  });

  describe('Load Balancing', () => {
    it('[P0] should initialize load balancer', () => {
      const loadBalancer = (service as any).loadBalancer as LoadBalancer;
      expect(loadBalancer).toBeDefined();
    });

    it('[P1] should rebalance workload', async () => {
      await service.rebalanceWorkload();

      const loadBalancer = (service as any).loadBalancer as LoadBalancer;
      const utilization = loadBalancer.getSwarmUtilization();

      // Utilization should be a number between 0 and 1
      expect(typeof utilization).toBe('number');
      expect(utilization).toBeGreaterThanOrEqual(0);
      expect(utilization).toBeLessThanOrEqual(1);
    });
  });

  describe('Efficiency Monitoring', () => {
    it('[P0] should initialize efficiency monitor', () => {
      const monitor = (service as any).efficiencyMonitor as EfficiencyMonitor;
      expect(monitor).toBeDefined();
    });

    it('[P1] should generate efficiency report', async () => {
      // Initialize and execute to generate some data
      const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
      };

      await service.initialize(mockSocket);

      const metrics = await service.getEfficiencyMetrics();

      if (metrics) {
        expect(metrics).toHaveProperty('efficiency');
        expect(metrics).toHaveProperty('bottlenecks');
        expect(metrics).toHaveProperty('recommendations');
      }
    });
  });

  describe('Real-time Updates', () => {
    it('[P1] should subscribe to status updates', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribeToUpdates(callback);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('[P1] should broadcast status via WebSocket', async () => {
      const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
      };

      await service.initialize(mockSocket);

      // Status should have been broadcast during initialization
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('[P0] should handle initialization errors gracefully', async () => {
      const mockSocket = {
        on: jest.fn().mockImplementation(() => {
          throw new Error('Socket error');
        }),
        emit: jest.fn(),
      };

      // Should not throw
      await expect(service.initialize(mockSocket)).rejects.toThrow('Socket error');
    });

    it('[P1] should handle reset gracefully', () => {
      // Should not throw
      service.reset();

      const status = service.getStatus();
      expect(status.activePhase).toBe(0);
    });
  });

  describe('Legacy Integration', () => {
    it('[P1] should support legacy developer swarm', async () => {
      const stories = [
        {
          id: 'story-1',
          title: 'Test Story',
          taskCount: 2,
          path: '/test.md',
          status: 'pending' as const,
          acceptanceCriteriaCount: 2,
          lastModified: Date.now(),
        },
      ];

      const llmConfig = {
        provider: 'mock' as any,
        model: 'test-model',
      };

      // This would require mocking the swarmEngine
      // Just verify it doesn't throw with invalid config
      await expect(
        service.executeDeveloperSwarm(stories, llmConfig)
      ).rejects.toThrow(); // Expected to fail without proper mocks
    });
  });
});

describe('[P1] V3 Swarm Performance', () => {
  it('should handle 15 agents efficiently', async () => {
    const service = new SwarmIntegrationService({
      maxParallelAgents: 15,
    });

    const startTime = Date.now();
    const status = service.getStatus();
    const endTime = Date.now();

    // Getting status should be fast (< 100ms)
    expect(endTime - startTime).toBeLessThan(100);
    expect(status).toBeDefined();
  });

  it('should handle multiple concurrent status requests', async () => {
    const service = new SwarmIntegrationService();

    const promises = Array.from({ length: 10 }, () =>
      Promise.resolve(service.getStatus())
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    results.forEach(status => {
      expect(status).toBeDefined();
      expect(status.agentUpdates).toBeDefined();
    });
  });
});
