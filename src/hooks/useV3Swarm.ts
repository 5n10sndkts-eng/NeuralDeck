/**
 * V3 Swarm Hook - Enhanced React hook for V3 swarm coordination
 *
 * Integrates the legacy useSwarm with the new V3 SwarmCoordinator
 * Provides real-time updates and enhanced developer swarm capabilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { AgentProfile, AgentNodeState, LlmConfig } from '../types';
import { StoryMetadata } from './useStoryWatcher';
import { SwarmIntegrationService, SwarmStatusUpdate } from '@/src/services/swarmIntegration';
import { DeveloperTaskResult } from '../services/swarmEngine';

export interface V3SwarmNode {
  id: string;
  agentId: number;
  agentName: string;
  domain: string;
  status: 'idle' | 'working' | 'completed' | 'failed' | 'blocked';
  progress: number;
  currentTask?: string;
  timestamp: number;
}

export interface V3SwarmState {
  isRunning: boolean;
  currentPhase: number;
  phaseName: string;
  metrics: {
    activeAgents: number;
    idleAgents: number;
    completedAgents: number;
    failedAgents: number;
    efficiency: number;
  };
  nodes: V3SwarmNode[];
}

export interface DeveloperSwarmState {
  isExecuting: boolean;
  storiesCompleted: number;
  storiesFailed: number;
  totalStories: number;
  results: DeveloperTaskResult[];
}

/**
 * Enhanced V3 Swarm Hook
 * 
 * Combines legacy useSwarm functionality with V3 swarm coordination
 */
export const useV3Swarm = () => {
  const { socket, isConnected } = useSocket();
  
  // V3 swarm state
  const [v3State, setV3State] = useState<V3SwarmState>({
    isRunning: false,
    currentPhase: 0,
    phaseName: '',
    metrics: {
      activeAgents: 0,
      idleAgents: 15,
      completedAgents: 0,
      failedAgents: 0,
      efficiency: 0,
    },
    nodes: [],
  });

  // Developer swarm state
  const [devState, setDevState] = useState<DeveloperSwarmState>({
    isExecuting: false,
    storiesCompleted: 0,
    storiesFailed: 0,
    totalStories: 0,
    results: [],
  });

  // Integration service reference
  const serviceRef = useRef<SwarmIntegrationService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize V3 swarm integration
  useEffect(() => {
    if (!isConnected || !socket) return;

    // Initialize service
    const initService = async () => {
      try {
        if (!serviceRef.current) {
          const { getSwarmIntegrationService } = await import('../services/swarmIntegration');
          serviceRef.current = getSwarmIntegrationService({
            enableRealtimeUpdates: true,
            enableLegacyIntegration: true,
            enableEfficiencyMonitoring: true,
          });

          await serviceRef.current.initialize(socket);

          // Subscribe to updates
          unsubscribeRef.current = serviceRef.current.subscribeToUpdates((update: SwarmStatusUpdate) => {
            setV3State(prev => ({
              isRunning: update.phaseStatus === 'active',
              currentPhase: update.activePhase,
              phaseName: getPhaseName(update.activePhase),
              metrics: {
                activeAgents: update.metrics.activeAgents,
                idleAgents: update.metrics.idleAgents,
                completedAgents: update.metrics.completedAgents,
                failedAgents: update.metrics.failedAgents,
                efficiency: update.metrics.efficiency,
              },
              nodes: update.agentUpdates.map(au => ({
                id: `agent-${au.agentId}`,
                agentId: au.agentId,
                agentName: getAgentName(au.agentId),
                domain: getAgentDomain(au.agentId),
                status: mapAgentStatus(au.status),
                progress: au.progress,
                currentTask: au.currentTask?.description,
                timestamp: update.timestamp,
              })),
            }));
          });
        }
      } catch {
        // Initialization failed - service remains null, actions will gracefully degrade
        serviceRef.current = null;
      }
    };

    initService();

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [socket, isConnected]);

  /**
   * Start V3 swarm execution
   */
  const startV3Swarm = useCallback(async (
    llmConfig?: LlmConfig
  ): Promise<{ success: boolean; error?: string }> => {
    if (!serviceRef.current) {
      return { success: false, error: 'Swarm service not initialized' };
    }

    try {
      const result = await serviceRef.current.executeSwarm({ llmConfig });
      return { 
        success: result.success,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, []);

  /**
   * Execute developer swarm for stories
   */
  const executeDeveloperSwarm = useCallback(async (
    stories: StoryMetadata[],
    llmConfig: LlmConfig,
    callbacks?: {
      onNodeProgress?: (nodeId: string, state: AgentNodeState, progress: number) => void;
      onNodeLog?: (nodeId: string, message: string) => void;
      onSwarmProgress?: (completed: number, total: number) => void;
    }
  ): Promise<{ success: boolean; results: DeveloperTaskResult[] }> => {
    if (!serviceRef.current) {
      return { success: false, results: [] };
    }

    setDevState(prev => ({
      ...prev,
      isExecuting: true,
      totalStories: stories.length,
    }));

    try {
      const results = await serviceRef.current.executeDeveloperSwarm(
        stories,
        llmConfig,
        callbacks
      );

      const successCount = results.filter(r => r.status === 'success').length;
      const failureCount = results.length - successCount;

      setDevState({
        isExecuting: false,
        storiesCompleted: successCount,
        storiesFailed: failureCount,
        totalStories: stories.length,
        results,
      });

      return { 
        success: failureCount === 0,
        results 
      };
    } catch (error) {
      setDevState(prev => ({
        ...prev,
        isExecuting: false,
      }));
      
      return { 
        success: false, 
        results: [] 
      };
    }
  }, []);

  /**
   * Get efficiency metrics
   */
  const getEfficiencyMetrics = useCallback(async () => {
    if (!serviceRef.current) return null;
    return serviceRef.current.getEfficiencyMetrics();
  }, []);

  /**
   * Reset swarm
   */
  const resetSwarm = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.reset();
    }
    setV3State({
      isRunning: false,
      currentPhase: 0,
      phaseName: '',
      metrics: {
        activeAgents: 0,
        idleAgents: 15,
        completedAgents: 0,
        failedAgents: 0,
        efficiency: 0,
      },
      nodes: [],
    });
    setDevState({
      isExecuting: false,
      storiesCompleted: 0,
      storiesFailed: 0,
      totalStories: 0,
      results: [],
    });
  }, []);

  /**
   * Rebalance workload
   */
  const rebalanceWorkload = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.rebalanceWorkload();
    }
  }, []);

  return {
    // V3 swarm state
    v3State,
    isRunning: v3State.isRunning,
    currentPhase: v3State.currentPhase,
    phaseName: v3State.phaseName,
    swarmNodes: v3State.nodes,
    metrics: v3State.metrics,

    // Developer swarm state
    devState,
    isExecuting: devState.isExecuting,
    storiesCompleted: devState.storiesCompleted,
    storiesFailed: devState.storiesFailed,

    // Actions
    startV3Swarm,
    executeDeveloperSwarm,
    getEfficiencyMetrics,
    resetSwarm,
    rebalanceWorkload,

    // Service reference for advanced usage
    service: serviceRef.current,
  };
};

// Helper functions
function getPhaseName(phaseId: number): string {
  const phases: Record<number, string> = {
    1: 'Foundation',
    2: 'Core Systems',
    3: 'Integration',
    4: 'Release',
  };
  return phases[phaseId] || 'Unknown';
}

function getAgentName(agentId: number): string {
  const agents: Record<number, string> = {
    1: 'Queen Coordinator',
    2: 'Security Architect',
    3: 'Security Implementer',
    4: 'Security Tester',
    5: 'Core Architect',
    6: 'Core Implementer',
    7: 'Memory Specialist',
    8: 'Swarm Specialist',
    9: 'MCP Specialist',
    10: 'Integration Architect',
    11: 'CLI/Hooks Developer',
    12: 'Neural/Learning Dev',
    13: 'TDD Test Engineer',
    14: 'Performance Engineer',
    15: 'Release Engineer',
  };
  return agents[agentId] || `Agent ${agentId}`;
}

function getAgentDomain(agentId: number): string {
  const domains: Record<number, string> = {
    1: 'orchestration',
    2: 'security',
    3: 'security',
    4: 'security',
    5: 'core',
    6: 'core',
    7: 'core',
    8: 'core',
    9: 'core',
    10: 'integration',
    11: 'integration',
    12: 'integration',
    13: 'quality',
    14: 'performance',
    15: 'deployment',
  };
  return domains[agentId] || 'unknown';
}

function mapAgentStatus(status: string): 'idle' | 'working' | 'completed' | 'failed' | 'blocked' {
  switch (status) {
    case 'idle':
      return 'idle';
    case 'working':
      return 'working';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'blocked':
      return 'blocked';
    default:
      return 'idle';
  }
}

export default useV3Swarm;
