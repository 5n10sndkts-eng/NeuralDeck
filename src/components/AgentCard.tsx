import React from 'react';
import { motion } from 'framer-motion';
import { AgentProfile } from '../types';
import { Activity, Code, Brain, Shield, PenTool, Layout, Cpu, Zap } from 'lucide-react';

interface Props {
    agentId: AgentProfile;
    status: 'idle' | 'thinking' | 'working' | 'waiting';
    currentTask?: string;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
    analyst: <Brain size={18} strokeWidth={1.5} />,
    product_manager: <Layout size={18} strokeWidth={1.5} />,
    architect: <Cpu size={18} strokeWidth={1.5} />,
    developer: <Code size={18} strokeWidth={1.5} />,
    qa_engineer: <Shield size={18} strokeWidth={1.5} />,
    tech_writer: <PenTool size={18} strokeWidth={1.5} />
};

const AGENT_COLORS: Record<string, { primary: string; glow: string }> = {
    analyst: { primary: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)' },
    product_manager: { primary: '#bc13fe', glow: 'rgba(188, 19, 254, 0.4)' },
    architect: { primary: '#ffd000', glow: 'rgba(255, 208, 0, 0.4)' },
    developer: { primary: '#0aff0a', glow: 'rgba(10, 255, 10, 0.4)' },
    qa_engineer: { primary: '#ff003c', glow: 'rgba(255, 0, 60, 0.4)' },
    tech_writer: { primary: '#d946ef', glow: 'rgba(217, 70, 239, 0.4)' }
};

export const AgentCard: React.FC<Props> = ({ agentId, status, currentTask }) => {
    const colors = AGENT_COLORS[agentId] || { primary: '#ffffff', glow: 'rgba(255, 255, 255, 0.4)' };
    const icon = AGENT_ICONS[agentId] || <Brain size={18} strokeWidth={1.5} />;
    const isActive = status === 'thinking' || status === 'working';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, x: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="agent-card relative overflow-hidden group"
            style={{
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                border: isActive
                    ? `1px solid ${colors.primary}`
                    : '1px solid rgba(0, 240, 255, 0.15)',
                background: isActive
                    ? `linear-gradient(135deg, rgba(10, 10, 20, 0.9) 0%, ${colors.primary}15 100%)`
                    : 'linear-gradient(135deg, rgba(10, 10, 20, 0.85) 0%, rgba(5, 5, 15, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isActive
                    ? `0 0 5px ${colors.primary}, 0 0 15px ${colors.glow}, 0 0 30px ${colors.glow}, 0 4px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.07)`
                    : '0 0 1px rgba(0, 240, 255, 0.4), 0 4px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                width: '100%'
            }}
        >
            {/* HUD Corner Brackets */}
            <svg className="absolute top-0 left-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M0 10 L0 0 L10 0" fill="none" stroke={isActive ? colors.primary : 'rgba(0, 240, 255, 0.4)'} strokeWidth="1" />
            </svg>
            <svg className="absolute top-0 right-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M2 0 L12 0 L12 10" fill="none" stroke={isActive ? colors.primary : 'rgba(0, 240, 255, 0.4)'} strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M0 2 L0 12 L10 12" fill="none" stroke={isActive ? colors.primary : 'rgba(0, 240, 255, 0.4)'} strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M2 12 L12 12 L12 2" fill="none" stroke={isActive ? colors.primary : 'rgba(0, 240, 255, 0.4)'} strokeWidth="1" />
            </svg>

            {/* Status Indicator - Enhanced */}
            <div
                className={`absolute top-3 right-3 hud-status-indicator ${
                    status === 'thinking' ? 'warning' :
                    status === 'working' ? 'active' :
                    status === 'waiting' ? 'active' : ''
                }`}
                style={{
                    backgroundColor: status === 'thinking' ? '#ffd000'
                        : status === 'working' ? '#0aff0a'
                        : status === 'waiting' ? '#00f0ff'
                        : 'rgba(255, 255, 255, 0.2)',
                    boxShadow: status !== 'idle'
                        ? `0 0 5px ${status === 'thinking' ? '#ffd000' : status === 'working' ? '#0aff0a' : '#00f0ff'}, 0 0 15px ${status === 'thinking' ? 'rgba(255, 208, 0, 0.5)' : status === 'working' ? 'rgba(10, 255, 10, 0.5)' : 'rgba(0, 240, 255, 0.5)'}`
                        : 'none'
                }}
            />

            <div className="flex items-start gap-3">
                {/* Avatar/Icon - Enhanced Neon */}
                <div
                    className="relative flex items-center justify-center transition-all duration-300"
                    style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.5rem',
                        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}08 100%)`,
                        border: `1px solid ${colors.primary}`,
                        color: colors.primary,
                        boxShadow: isActive
                            ? `0 0 10px ${colors.glow}, 0 0 25px ${colors.glow}, inset 0 0 15px ${colors.primary}15`
                            : `0 0 5px ${colors.glow}, inset 0 0 10px ${colors.primary}10`,
                        textShadow: isActive
                            ? `0 0 10px ${colors.primary}, 0 0 20px ${colors.primary}`
                            : `0 0 5px ${colors.primary}`
                    }}
                >
                    {icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="text-xs font-bold uppercase tracking-[0.15em]"
                            style={{
                                fontFamily: 'var(--font-display)',
                                color: isActive ? colors.primary : 'rgba(255, 255, 255, 0.9)',
                                textShadow: isActive
                                    ? `0 0 10px ${colors.primary}, 0 0 20px ${colors.glow}`
                                    : 'none'
                            }}
                        >
                            {agentId.replace('_', ' ')}
                        </span>
                    </div>

                    <div
                        className="text-[10px] truncate font-mono"
                    >
                        {status === 'thinking' ? (
                            <span className="flex items-center gap-1.5 text-glow-yellow" style={{ color: '#ffd000' }}>
                                <Zap size={10} className="animate-pulse" />
                                <span>Processing...</span>
                            </span>
                        ) : status === 'working' ? (
                            <span className="flex items-center gap-1.5 text-glow-green" style={{ color: '#0aff0a' }}>
                                <Activity size={10} />
                                <span>{currentTask || 'Executing...'}</span>
                            </span>
                        ) : (
                            <span className="text-gray-500">
                                {currentTask || 'Standing By'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Active State Bottom Border Glow */}
            {isActive && (
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{
                        background: `linear-gradient(90deg, transparent 0%, ${colors.primary} 50%, transparent 100%)`,
                        boxShadow: `0 0 10px ${colors.primary}`
                    }}
                />
            )}

            {/* Subtle Noise Texture */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-lg"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'
                }}
            />

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `}</style>
        </motion.div>
    );
};
