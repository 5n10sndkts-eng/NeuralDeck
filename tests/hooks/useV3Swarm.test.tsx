/**
 * V3 Swarm Hook Tests
 *
 * Test suite for the useV3Swarm React hook.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useV3Swarm } from '../../src/hooks/useV3Swarm';
import * as useSocketModule from '../../src/hooks/useSocket';

// Mock the socket hook
jest.mock('../../src/hooks/useSocket');
jest.mock('../../src/services/swarmIntegration', () => ({
  getSwarmIntegrationService: jest.fn(() => ({
    initialize: jest.fn(),
    executeSwarm: jest.fn().mockResolvedValue({ success: true, errors: [] }),
    executeDeveloperSwarm: jest.fn().mockResolvedValue([]),
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
      },
    }),
    subscribeToUpdates: jest.fn().mockReturnValue(jest.fn()),
    reset: jest.fn(),
    rebalanceWorkload: jest.fn(),
    getEfficiencyMetrics: jest.fn().mockResolvedValue({
      efficiency: 0.85,
      bottlenecks: [],
      recommendations: [],
    }),
    broadcastToDomain: jest.fn(),
  })),
  resetSwarmIntegrationService: jest.fn(),
}));

describe('useV3Swarm', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSocketModule.useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      logs: [],
      activeAgents: [],
      phase: 'idle',
    });
  });

  it('[P0] should initialize with default state', () => {
    const { result } = renderHook(() => useV3Swarm());

    expect(result.current.v3State.isRunning).toBe(false);
    expect(result.current.v3State.currentPhase).toBe(0);
    expect(result.current.v3State.metrics.idleAgents).toBe(15);
    expect(result.current.swarmNodes).toEqual([]);
  });

  it('[P0] should initialize service when connected', async () => {
    const { result } = renderHook(() => useV3Swarm());

    await waitFor(() => {
      expect(result.current.service).toBeDefined();
    });
  });

  it('[P0] should not initialize when not connected', () => {
    (useSocketModule.useSocket as jest.Mock).mockReturnValue({
      socket: null,
      isConnected: false,
      logs: [],
      activeAgents: [],
      phase: 'idle',
    });

    const { result } = renderHook(() => useV3Swarm());

    expect(result.current.service).toBeNull();
  });

  it('[P1] should start V3 swarm', async () => {
    const { result } = renderHook(() => useV3Swarm());

    // Flush async service initialization (dynamic import + initialize)
    await act(async () => {
      await Promise.resolve();
    });

    let startResult;
    await act(async () => {
      startResult = await result.current.startV3Swarm();
    });

    expect(startResult).toEqual({ success: true });
  });

  it('[P1] should handle swarm start failure', async () => {
    const { getSwarmIntegrationService } = require('../../src/services/swarmIntegration');
    getSwarmIntegrationService.mockReturnValueOnce({
      initialize: jest.fn(),
      executeSwarm: jest.fn().mockRejectedValue(new Error('Execution failed')),
      subscribeToUpdates: jest.fn().mockReturnValue(jest.fn()),
    });

    const { result } = renderHook(() => useV3Swarm());

    // Flush async service initialization
    await act(async () => {
      await Promise.resolve();
    });

    let startResult;
    await act(async () => {
      startResult = await result.current.startV3Swarm();
    });

    expect(startResult.success).toBe(false);
    expect(startResult.error).toBe('Execution failed');
  });

  it('[P1] should reset swarm', async () => {
    const { result } = renderHook(() => useV3Swarm());

    await act(async () => {
      result.current.resetSwarm();
    });

    expect(result.current.v3State.isRunning).toBe(false);
    expect(result.current.v3State.currentPhase).toBe(0);
  });

  it('[P1] should rebalance workload', async () => {
    const { result } = renderHook(() => useV3Swarm());

    await act(async () => {
      await result.current.rebalanceWorkload();
    });

    // Should not throw
    expect(result.current).toBeDefined();
  });

  it('[P1] should get efficiency metrics', async () => {
    const { result } = renderHook(() => useV3Swarm());

    // Flush async service initialization
    await act(async () => {
      await Promise.resolve();
    });

    let metrics;
    await act(async () => {
      metrics = await result.current.getEfficiencyMetrics();
    });

    expect(metrics).toEqual({
      efficiency: 0.85,
      bottlenecks: [],
      recommendations: [],
    });
  });

  it('[P1] should execute developer swarm', async () => {
    const { result } = renderHook(() => useV3Swarm());

    // Flush async service initialization
    await act(async () => {
      await Promise.resolve();
    });

    const stories = [
      { id: 'story-1', title: 'Test Story 1', taskCount: 3, path: '/test1.md', status: 'pending' as const, acceptanceCriteriaCount: 3, lastModified: Date.now() },
      { id: 'story-2', title: 'Test Story 2', taskCount: 2, path: '/test2.md', status: 'pending' as const, acceptanceCriteriaCount: 2, lastModified: Date.now() },
    ];
    const llmConfig = { provider: 'anthropic' as any, model: 'claude-3.5-sonnet' };

    let execResult;
    await act(async () => {
      execResult = await result.current.executeDeveloperSwarm(stories, llmConfig);
    });

    expect(execResult).toBeDefined();
    expect(result.current.devState.totalStories).toBe(2);
  });

  it('[P1] should update state on status updates', async () => {
    const mockSubscribe = jest.fn((callback) => {
      // Simulate status update
      setTimeout(() => {
        callback({
          timestamp: Date.now(),
          metrics: {
            activeAgents: 5,
            idleAgents: 10,
            completedAgents: 0,
            failedAgents: 0,
            efficiency: 0.75,
            queueDepth: 0,
            avgTaskDuration: 0,
            successRate: 0,
          },
          activePhase: 1,
          phaseStatus: 'active',
          agentUpdates: [
            { agentId: 1, status: 'working', progress: 50 },
            { agentId: 2, status: 'idle', progress: 0 },
          ],
        });
      }, 100);

      return jest.fn();
    });

    const { getSwarmIntegrationService } = require('../../src/services/swarmIntegration');
    getSwarmIntegrationService.mockReturnValueOnce({
      initialize: jest.fn(),
      subscribeToUpdates: mockSubscribe,
      getStatus: jest.fn(),
    });

    const { result } = renderHook(() => useV3Swarm());

    await waitFor(() => {
      expect(result.current.metrics.activeAgents).toBe(5);
    }, { timeout: 200 });
  });
});

describe('useV3Swarm - Developer Swarm', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSocketModule.useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      logs: [],
      activeAgents: [],
      phase: 'idle',
    });
  });

  it('[P1] should track developer swarm execution state', async () => {
    const { result } = renderHook(() => useV3Swarm());

    // Flush async service initialization
    await act(async () => {
      await Promise.resolve();
    });

    const stories = [{ id: 'story-1', title: 'Test', taskCount: 1, path: '/test.md', status: 'pending' as const, acceptanceCriteriaCount: 1, lastModified: Date.now() }];
    const llmConfig = { provider: 'anthropic' as any, model: 'claude-3.5-sonnet' };

    expect(result.current.devState.isExecuting).toBe(false);

    act(() => {
      result.current.executeDeveloperSwarm(stories, llmConfig);
    });

    expect(result.current.devState.isExecuting).toBe(true);
    expect(result.current.devState.totalStories).toBe(1);
  });

  it('[P1] should handle execution completion', async () => {
    const { getSwarmIntegrationService } = require('../../src/services/swarmIntegration');
    getSwarmIntegrationService.mockReturnValueOnce({
      initialize: jest.fn(),
      executeDeveloperSwarm: jest.fn().mockResolvedValue([
        { status: 'success', storyId: 'story-1' },
        { status: 'success', storyId: 'story-2' },
      ]),
      subscribeToUpdates: jest.fn().mockReturnValue(jest.fn()),
    });

    const { result } = renderHook(() => useV3Swarm());

    // Flush async service initialization
    await act(async () => {
      await Promise.resolve();
    });

    const stories = [
      { id: 'story-1', title: 'Test 1', taskCount: 1, path: '/test1.md', status: 'pending' as const, acceptanceCriteriaCount: 1, lastModified: Date.now() },
      { id: 'story-2', title: 'Test 2', taskCount: 1, path: '/test2.md', status: 'pending' as const, acceptanceCriteriaCount: 1, lastModified: Date.now() },
    ];
    const llmConfig = { provider: 'anthropic' as any, model: 'claude-3.5-sonnet' };

    await act(async () => {
      await result.current.executeDeveloperSwarm(stories, llmConfig);
    });

    expect(result.current.devState.isExecuting).toBe(false);
    expect(result.current.devState.storiesCompleted).toBe(2);
    expect(result.current.devState.storiesFailed).toBe(0);
  });
});

describe('useV3Swarm - Error Handling', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSocketModule.useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      logs: [],
      activeAgents: [],
      phase: 'idle',
    });
  });

  it('[P1] should handle service initialization failure', async () => {
    const { getSwarmIntegrationService } = require('../../src/services/swarmIntegration');
    getSwarmIntegrationService.mockImplementationOnce(() => {
      throw new Error('Service initialization failed');
    });

    // Should not throw - hook catches init errors gracefully
    const { result } = renderHook(() => useV3Swarm());

    // Flush the async init (which will fail and be caught)
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBeDefined();
    expect(result.current.v3State.isRunning).toBe(false);
  });

  it('[P1] should handle missing service in actions', async () => {
    const { result } = renderHook(() => useV3Swarm());

    // Reset to simulate missing service
    act(() => {
      result.current.resetSwarm();
    });

    // Actions should not throw
    await act(async () => {
      await result.current.rebalanceWorkload();
      await result.current.getEfficiencyMetrics();
    });

    expect(result.current).toBeDefined();
  });
});
