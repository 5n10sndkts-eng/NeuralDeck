import React, { useState } from 'react';
import { useSwarm } from '../hooks/useSwarm';
import { AgentCard } from './AgentCard';
import { NeuralGraph } from './NeuralGraph';
import { RAGStatusPanel } from './RAGStatusPanel';
import { AgentProfile } from '../types';

export const TheOrchestrator: React.FC = () => {
    const { nodes, edges, activeAgents } = useSwarm();
    const [showRAGPanel, setShowRAGPanel] = useState(false);

    const AGENTS: AgentProfile[] = ['analyst', 'architect', 'developer', 'qa_engineer'];

    return (
        <div className="flex w-full h-full p-5 gap-5" style={{ backgroundColor: 'var(--color-void)' }}>
            {/* Ambient background glow */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 20% 30%, rgba(0, 240, 255, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(188, 19, 254, 0.05) 0%, transparent 50%)'
            }} />

            {/* Left Column: Agent Cluster */}
            <div className="flex flex-col overflow-hidden w-[300px] min-w-[280px] max-w-[360px] flex-shrink-0 relative z-10" style={{
                background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.9) 0%, rgba(5, 5, 12, 0.95) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(20px)'
            }}>
                {/* Premium HUD Header */}
                <div className="h-14 px-5 flex items-center gap-3 relative" style={{
                    background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
                    borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
                }}>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.5) 50%, transparent 100%)'
                    }} />
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#00f0ff',
                        boxShadow: '0 0 8px #00f0ff, 0 0 16px rgba(0, 240, 255, 0.5)'
                    }} />
                    <h3 style={{
                        color: '#00f0ff',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
                    }}>
                        SWARM CLUSTER
                    </h3>
                </div>

                {/* Agent Cards */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {AGENTS.map(agentId => (
                        <AgentCard
                            key={agentId}
                            agentId={agentId}
                            status={activeAgents.includes(agentId) ? 'thinking' : 'idle'}
                            currentTask={activeAgents.includes(agentId) ? nodes.find(n => n.agent === agentId && n.status === 'active')?.content : undefined}
                        />
                    ))}
                </div>

                {/* RAG Status Section */}
                <div className="p-4" style={{
                    borderTop: '1px solid rgba(0, 240, 255, 0.15)',
                    background: 'rgba(0, 0, 0, 0.2)'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <h4 style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: '#6b7280'
                        }}>
                            Codebase RAG
                        </h4>
                        <button
                            onClick={() => setShowRAGPanel(!showRAGPanel)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '9px',
                                fontWeight: 600,
                                letterSpacing: '0.1em',
                                color: '#00f0ff',
                                background: 'rgba(0, 240, 255, 0.1)',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {showRAGPanel ? 'HIDE' : 'SHOW'}
                        </button>
                    </div>
                    <RAGStatusPanel compact={!showRAGPanel} className={showRAGPanel ? 'mt-2' : ''} />
                </div>
            </div>

            {/* Right Column: Neural Graph */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10" style={{
                background: 'linear-gradient(135deg, rgba(15, 5, 25, 0.9) 0%, rgba(8, 3, 15, 0.95) 100%)',
                border: '1px solid rgba(188, 19, 254, 0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(20px)'
            }}>
                {/* Premium HUD Header - Purple accent */}
                <div className="h-14 px-5 flex items-center justify-between relative" style={{
                    background: 'linear-gradient(180deg, rgba(15, 5, 20, 0.98) 0%, rgba(8, 3, 12, 0.95) 100%)',
                    borderBottom: '1px solid rgba(188, 19, 254, 0.2)'
                }}>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(188, 19, 254, 0.5) 50%, transparent 100%)'
                    }} />
                    <div className="flex items-center gap-3">
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#bc13fe',
                            boxShadow: '0 0 8px #bc13fe, 0 0 16px rgba(188, 19, 254, 0.5)'
                        }} />
                        <h3 style={{
                            color: '#bc13fe',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            textShadow: '0 0 10px rgba(188, 19, 254, 0.5)'
                        }}>
                            NEURAL PATHWAY
                        </h3>
                    </div>
                    <div className="flex gap-4" style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        color: '#00f0ff'
                    }}>
                        <span>NODES: {nodes.length}</span>
                        <span style={{ color: '#4ade80' }}>LATENCY: 12ms</span>
                    </div>
                </div>

                {/* Graph Area */}
                <div className="flex-1 p-4 overflow-hidden">
                    <NeuralGraph nodes={nodes} edges={edges} />
                </div>
            </div>
        </div>
    );
};
