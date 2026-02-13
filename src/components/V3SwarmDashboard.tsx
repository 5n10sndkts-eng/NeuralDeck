import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useV3Swarm } from '../hooks/useV3Swarm';
import { AgentProfile } from '../types';

interface V3SwarmDashboardProps {
  className?: string;
}

/**
 * V3 Swarm Dashboard
 *
 * Visual representation of the 15-agent hierarchical mesh swarm.
 * Shows real-time status, metrics, and agent coordination.
 */
export const V3SwarmDashboard: React.FC<V3SwarmDashboardProps> = ({ className = '' }) => {
  const {
    v3State,
    devState,
    isRunning,
    currentPhase,
    phaseName,
    metrics,
    swarmNodes,
    startV3Swarm,
    resetSwarm,
    rebalanceWorkload,
    getEfficiencyMetrics,
  } = useV3Swarm();

  const [efficiencyData, setEfficiencyData] = useState<any>(null);
  const [showEfficiency, setShowEfficiency] = useState(false);

  useEffect(() => {
    if (showEfficiency) {
      getEfficiencyMetrics().then(data => setEfficiencyData(data));
    }
  }, [showEfficiency, getEfficiencyMetrics]);

  const handleStartSwarm = async () => {
    const result = await startV3Swarm();
    if (!result.success) {
      console.error('Failed to start swarm:', result.error);
    }
  };

  const handleReset = () => {
    resetSwarm();
    setEfficiencyData(null);
  };

  const handleRebalance = async () => {
    await rebalanceWorkload();
  };

  // Domain colors
  const domainColors: Record<string, string> = {
    orchestration: 'from-yellow-500 to-orange-500',
    security: 'from-red-500 to-pink-500',
    core: 'from-blue-500 to-cyan-500',
    integration: 'from-purple-500 to-violet-500',
    quality: 'from-green-500 to-emerald-500',
    performance: 'from-amber-500 to-yellow-500',
    deployment: 'from-teal-500 to-cyan-500',
  };

  return (
    <div className={`cyber-panel p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold neon-text-cyan">V3 Swarm Coordination</h2>
          <p className="text-sm text-gray-400 mt-1">15-Agent Hierarchical Mesh</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleStartSwarm}
            disabled={isRunning}
            className="cyber-button-small bg-green-600 hover:bg-green-500 disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Start Swarm'}
          </button>
          <button
            onClick={handleReset}
            className="cyber-button-small bg-red-600 hover:bg-red-500"
          >
            Reset
          </button>
          <button
            onClick={handleRebalance}
            className="cyber-button-small bg-blue-600 hover:bg-blue-500"
          >
            Rebalance
          </button>
          <button
            onClick={() => setShowEfficiency(!showEfficiency)}
            className="cyber-button-small bg-purple-600 hover:bg-purple-500"
          >
            {showEfficiency ? 'Hide Metrics' : 'Show Metrics'}
          </button>
        </div>
      </div>

      {/* Phase Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Current Phase</span>
          <span className="text-sm font-mono text-cyan-400">{phaseName || 'Not Started'}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${(currentPhase / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Foundation</span>
          <span>Core</span>
          <span>Integration</span>
          <span>Release</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <MetricCard
          label="Active Agents"
          value={metrics.activeAgents}
          color="cyan"
        />
        <MetricCard
          label="Idle Agents"
          value={metrics.idleAgents}
          color="gray"
        />
        <MetricCard
          label="Completed"
          value={metrics.completedAgents}
          color="green"
        />
        <MetricCard
          label="Failed"
          value={metrics.failedAgents}
          color="red"
        />
        <MetricCard
          label="Efficiency"
          value={`${Math.round(metrics.efficiency * 100)}%`}
          color="purple"
        />
      </div>

      {/* Efficiency Metrics Panel */}
      <AnimatePresence>
        {showEfficiency && efficiencyData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-black/50 rounded-lg border border-purple-500/30"
          >
            <h3 className="text-lg font-bold mb-4 text-purple-400">Efficiency Report</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-400">Total Efficiency</span>
                <p className="text-2xl font-mono text-purple-400">
                  {Math.round(efficiencyData.efficiency * 100)}%
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Target</span>
                <p className="text-2xl font-mono text-gray-400">85%</p>
              </div>
            </div>

            {efficiencyData.bottlenecks?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-bold mb-2 text-red-400">Bottlenecks Detected</h4>
                <div className="space-y-2">
                  {efficiencyData.bottlenecks.map((bottleneck: any, idx: number) => (
                    <div key={idx} className="p-2 bg-red-900/20 rounded border border-red-500/30">
                      <p className="text-sm text-red-300">{bottleneck.description}</p>
                      <p className="text-xs text-red-400/60 mt-1">
                        Severity: {bottleneck.severity} | Impact: {Math.round(bottleneck.estimatedImpact)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {efficiencyData.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold mb-2 text-green-400">Recommendations</h4>
                <ul className="space-y-1">
                  {efficiencyData.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-green-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-4 neon-text-cyan">Agent Status</h3>
        <div className="grid grid-cols-5 gap-3">
          {swarmNodes.length === 0 ? (
            // Show placeholder grid when no nodes
            Array.from({ length: 15 }, (_, i) => (
              <AgentCard
                key={i}
                agentId={i + 1}
                agentName={getAgentName(i + 1)}
                domain={getAgentDomain(i + 1)}
                status="idle"
                progress={0}
                domainColors={domainColors}
              />
            ))
          ) : (
            swarmNodes.map((node) => (
              <AgentCard
                key={node.agentId}
                agentId={node.agentId}
                agentName={node.agentName}
                domain={node.domain}
                status={node.status}
                progress={node.progress}
                currentTask={node.currentTask}
                domainColors={domainColors}
              />
            ))
          )}
        </div>
      </div>

      {/* Developer Swarm Status */}
      {devState.totalStories > 0 && (
        <div className="p-4 bg-black/50 rounded-lg border border-cyan-500/30">
          <h3 className="text-lg font-bold mb-4 text-cyan-400">Developer Swarm</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-400">Total Stories</span>
              <p className="text-2xl font-mono text-cyan-400">{devState.totalStories}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Completed</span>
              <p className="text-2xl font-mono text-green-400">{devState.storiesCompleted}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Failed</span>
              <p className="text-2xl font-mono text-red-400">{devState.storiesFailed}</p>
            </div>
          </div>
          {devState.isExecuting && (
            <div className="mt-4">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
                  animate={{
                    width: `${((devState.storiesCompleted + devState.storiesFailed) / devState.totalStories) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-center text-sm text-gray-400 mt-2">
                Processing stories...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Sub-components

interface MetricCardProps {
  label: string;
  value: string | number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color }) => {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400 border-cyan-500/30',
    gray: 'text-gray-400 border-gray-500/30',
    green: 'text-green-400 border-green-500/30',
    red: 'text-red-400 border-red-500/30',
    purple: 'text-purple-400 border-purple-500/30',
  };

  return (
    <div className={`p-3 bg-black/50 rounded-lg border ${colorClasses[color]}`}>
      <span className="text-xs text-gray-500 block mb-1">{label}</span>
      <span className="text-xl font-mono font-bold">{value}</span>
    </div>
  );
};

interface AgentCardProps {
  agentId: number;
  agentName: string;
  domain: string;
  status: 'idle' | 'working' | 'completed' | 'failed' | 'blocked';
  progress: number;
  currentTask?: string;
  domainColors: Record<string, string>;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agentId,
  agentName,
  domain,
  status,
  progress,
  currentTask,
  domainColors,
}) => {
  const statusColors: Record<string, string> = {
    idle: 'bg-gray-700',
    working: 'bg-blue-600',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
    blocked: 'bg-yellow-600',
  };

  return (
    <motion.div
      layout
      className={`p-3 rounded-lg border ${
        status === 'working' ? 'border-cyan-500/50' : 'border-gray-700'
      } bg-black/50 relative overflow-hidden`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Progress bar */}
      {status === 'working' && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-xs font-mono text-gray-500">#{agentId}</span>
      </div>

      {/* Agent name */}
      <p className="text-sm font-medium truncate" title={agentName}>
        {agentName}
      </p>

      {/* Domain badge */}
      <div
        className={`inline-block mt-2 px-2 py-0.5 rounded text-xs bg-gradient-to-r ${
          domainColors[domain] || 'from-gray-500 to-gray-600'
        }`}
      >
        {domain}
      </div>

      {/* Current task */}
      {currentTask && (
        <p className="text-xs text-gray-400 mt-2 truncate" title={currentTask}>
          {currentTask}
        </p>
      )}
    </motion.div>
  );
};

// Helper functions
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

export default V3SwarmDashboard;
