import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentNodeData, ToolHistoryEntry } from '../types';

interface AgentDetailsPanelProps {
    agent: (AgentNodeData & { toolHistory?: ToolHistoryEntry[] }) | null;
    onClose: () => void;
}

const AgentDetailsPanel: React.FC<AgentDetailsPanelProps> = ({ agent, onClose }) => {
    if (!agent) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative bg-void-black border-2 border-cyber-cyan rounded-lg p-6 max-w-md w-full mx-4"
                    style={{
                        boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
                        backdropFilter: 'blur(10px)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-display text-white tracking-wider uppercase">
                                {agent.label}
                            </h2>
                            <p className="text-sm text-gray-400 font-mono mt-1">{agent.role}</p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-cyber-cyan transition-colors p-2"
                            aria-label="Close"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* State Badge */}
                    <div className="mb-4">
                        <span
                            className={`
                inline-block px-3 py-1 rounded text-xs font-mono uppercase
                ${agent.state === 'THINKING' ? 'bg-cyber-cyan/20 text-cyber-cyan' : ''}
                ${agent.state === 'WORKING' ? 'bg-cyber-cyan/30 text-cyber-cyan' : ''}
                ${agent.state === 'DONE' ? 'bg-green-500/20 text-green-400' : ''}
                ${agent.state === 'IDLE' ? 'bg-gray-700/20 text-gray-500' : ''}
              `}
                        >
                            Status: {agent.state}
                        </span>
                    </div>

                    {/* Details Section */}
                    <div className="space-y-3">
                        <div className="border-t border-gray-700 pt-3">
                            <h3 className="text-sm font-mono text-gray-400 uppercase mb-2">Agent ID</h3>
                            <p className="text-white font-mono text-sm">{agent.agentId}</p>
                        </div>

                        <div className="border-t border-gray-700 pt-3">
                            <h3 className="text-sm font-mono text-gray-400 uppercase mb-2">Capabilities</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {getAgentCapabilities(agent.agentId).map((capability, idx) => (
                                    <div
                                        key={idx}
                                        className="text-xs font-mono text-cyber-cyan bg-cyber-cyan/10 px-2 py-1 rounded"
                                    >
                                        • {capability}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-700 pt-3">
                            <h3 className="text-sm font-mono text-gray-400 uppercase mb-2">Description</h3>
                            <p className="text-sm text-gray-300 font-mono leading-relaxed">
                                {getAgentDescription(agent.agentId)}
                            </p>
                        </div>

                        {/* Tool History Section (Story 2-3) */}
                        {agent.toolHistory && agent.toolHistory.length > 0 && (
                            <div className="border-t border-gray-700 pt-3">
                                <h3 className="text-sm font-mono text-gray-400 uppercase mb-2">
                                    Recent Tool Executions
                                </h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {agent.toolHistory.map((entry) => (
                                        <ToolHistoryItem key={entry.id} entry={entry} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Glassmorphism overlay */}
                    <div
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                        }}
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
};

// Helper functions
function getAgentCapabilities(agentId: string): string[] {
    const capabilities: Record<string, string[]> = {
        user_input: ['User Interaction', 'Input Processing'],
        analyst: ['Code Analysis', 'Pattern Detection', 'Problem Decomposition'],
        product_manager: ['Requirements', 'Prioritization', 'User Stories'],
        architect: ['System Design', 'Tech Stack', 'Architecture Patterns'],
        scrum_master: ['Sprint Planning', 'Story Management', 'Team Coordination'],
        swarm: ['Parallel Execution', 'Code Generation', 'Multi-Agent Collaboration'],
        qa: ['Testing', 'Quality Assurance', 'Bug Detection'],
        security: ['Security Analysis', 'Vulnerability Scanning', 'Threat Assessment'],
    };
    return capabilities[agentId] || ['General AI Capabilities'];
}

function getAgentDescription(agentId: string): string {
    const descriptions: Record<string, string> = {
        user_input: 'Processes and interprets user requests, routing them to the appropriate agents in the Neural Circuit.',
        analyst: 'Analyzes codebases, identifies patterns, and breaks down complex problems into actionable tasks.',
        product_manager: 'Defines requirements, creates user stories, and ensures alignment with business goals.',
        architect: 'Designs system architecture, selects appropriate technologies, and defines integration patterns.',
        scrum_master: 'Manages sprint planning, coordinates agent workflows, and tracks development progress.',
        swarm: 'Coordinates multiple developer agents working in parallel to implement features efficiently.',
        qa: 'Performs testing, validates implementations, and ensures code quality standards are met.',
        security: 'Conducts security audits, identifies vulnerabilities, and recommends security best practices.',
    };
    return descriptions[agentId] || 'Multi-purpose AI agent in the Neural Circuit workflow.';
}

// Tool History Item Component (Story 2-3)
const ToolHistoryItem: React.FC<{ entry: ToolHistoryEntry }> = ({ entry }) => {
    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatTimestamp = (ts: number) => {
        const date = new Date(ts);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const statusStyles = {
        success: 'bg-green-500/20 text-green-400 border-green-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
        executing: 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30',
        idle: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
        <div
            className={`p-2 rounded border ${statusStyles[entry.status] || statusStyles.idle}`}
        >
            <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold">{entry.toolName}</span>
                <span className="text-[10px] opacity-70">{formatTimestamp(entry.timestamp)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] uppercase">{entry.status}</span>
                <span className="text-[10px] opacity-70">{formatDuration(entry.duration)}</span>
            </div>
            {entry.outputPreview && (
                <div className="mt-1 text-[10px] opacity-60 truncate font-mono">
                    {entry.outputPreview.slice(0, 50)}...
                </div>
            )}
        </div>
    );
};

export default AgentDetailsPanel;
