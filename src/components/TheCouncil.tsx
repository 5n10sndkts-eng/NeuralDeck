import React from 'react';
import { Cpu, Zap, ShieldAlert, ShieldCheck, Volume2, VolumeX, Crosshair, BookOpen, TestTube, Lock, Eye, EyeOff, HardHat, PartyPopper, Hexagon, ThumbsUp, ThumbsDown, Layers, PenTool, Search, Rocket, FileText, LayoutTemplate, Workflow, BrainCircuit, Palette, Bug, Box, Feather } from 'lucide-react';
import { AgentProfile, VoteResult, NeuralPhase } from '../types';
import { AGENT_DEFINITIONS } from '../services/agent';
import { SoundEffects } from '../services/sound';

interface Props {
    isThinking: boolean;
    godMode: boolean;
    isListening?: boolean;
    isMuted: boolean;
    isSupervised: boolean;
    partyMode?: boolean;
    activeAgent: AgentProfile;
    councilVotes?: VoteResult[];
    currentPhase?: NeuralPhase;
    autoRun?: boolean;
    tokenUsage?: number;
    onToggleGodMode: () => void;
    onToggleSupervision: () => void;
    onTogglePartyMode?: () => void;
    onToggleMute: () => void;
    onSelectAgent: (agent: AgentProfile) => void;
    onToggleAutoRun?: () => void;
}

const TheCouncil: React.FC<Props> = ({
    isThinking, godMode, isMuted, isSupervised, partyMode, activeAgent, councilVotes = [], currentPhase = 'idle', autoRun, tokenUsage = 0,
    onToggleGodMode, onToggleSupervision, onTogglePartyMode, onToggleMute, onSelectAgent, onToggleAutoRun
}) => {

    const agents = [
        { id: 'analyst', Icon: Search, name: 'Analyst', color: '#60a5fa' },
        { id: 'product_manager', Icon: BookOpen, name: 'PM', color: '#c084fc' },
        { id: 'ux_designer', Icon: Palette, name: 'UX', color: '#f472b6' },
        { id: 'architect', Icon: Layers, name: 'Arch', color: '#fb923c' },
        { id: 'scrum_master', Icon: Workflow, name: 'Scrum', color: '#4ade80' },
        { id: 'developer', Icon: HardHat, name: 'Dev', color: 'var(--color-cyan)' },
        { id: 'qa_engineer', Icon: Bug, name: 'QA', color: '#fef08a' },
        { id: 'sec_auditor', Icon: Lock, name: 'Sec', color: '#f87171' },
        { id: 'red_teamer', Icon: Crosshair, name: 'Red', color: '#dc2626' },
        { id: 'optimizer', Icon: Zap, name: 'Opt', color: '#facc15' },
        { id: 'devops', Icon: Box, name: 'Ops', color: '#818cf8' },
        { id: 'tech_writer', Icon: Feather, name: 'Docs', color: '#d1d5db' }
    ];

    const activeDef = AGENT_DEFINITIONS[activeAgent] || AGENT_DEFINITIONS['analyst'] || { name: 'Unknown', role: 'System', color: '#6b7280', description: 'Agent profile not found.' };
    const tokenPercentage = Math.min((tokenUsage / 4096) * 100, 100);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flex: 1,
            position: 'relative'
        }}>
            {/* Phase Indicator - Premium Glass Style */}
            <div className="hidden-xl" style={{
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(8, 8, 18, 0.9) 0%, rgba(5, 5, 12, 0.95) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              borderRadius: '6px',
              padding: '0.375rem 0.75rem',
              gap: '0.5rem',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}>
                <PhaseBadge active={currentPhase === 'analysis'} label="Anl" icon={Search} color="#60a5fa" />
                <div style={{ width: '8px', height: '1px', background: '#1f2937' }} />
                <PhaseBadge active={currentPhase === 'design'} label="Dsg" icon={Palette} color="#f472b6" />
                <div style={{ width: '8px', height: '1px', background: '#1f2937' }} />
                <PhaseBadge active={currentPhase === 'architecture'} label="Arc" icon={LayoutTemplate} color="#fb923c" />
                <div style={{ width: '8px', height: '1px', background: '#1f2937' }} />
                <PhaseBadge active={currentPhase === 'swarm'} label="Dev" icon={Rocket} color="var(--color-cyan)" />
                <div style={{ width: '8px', height: '1px', background: '#1f2937' }} />
                <PhaseBadge active={currentPhase === 'testing'} label="QA" icon={Bug} color="#fef08a" />
                <div style={{ width: '8px', height: '1px', background: '#1f2937' }} />
                <PhaseBadge active={currentPhase === 'review'} label="Sec" icon={Lock} color="#f87171" />
                <div style={{ width: '8px', height: '1px', background: '#1f2937' }} />
                <PhaseBadge active={currentPhase === 'deployment'} label="Dep" icon={Box} color="#818cf8" />
            </div>

            <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flex: 1, overflowX: 'auto' }}>
                {agents.map((agent) => {
                    const isActive = activeAgent === agent.id;
                    const vote = councilVotes.find(v => v.voter === agent.id);
                    let stateColor = isActive ? agent.color : '#374151'; // text-gray-700
                    if (vote?.verdict === 'APPROVE') stateColor = '#22c55e';
                    if (vote?.verdict === 'REJECT') stateColor = '#ef4444';

                    const isGlitching = isActive && isThinking;

                    return (
                        <button
                            key={agent.id}
                            onClick={() => { SoundEffects.click(); onSelectAgent(agent.id as AgentProfile); }}
                            onMouseEnter={() => SoundEffects.hover()}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2.5rem',
                                height: '2.5rem',
                                transition: 'all 0.3s',
                                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                opacity: isActive ? 1 : 0.6,
                                zIndex: isActive ? 10 : 1,
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer'
                            }}
                            className="agent-btn"
                            title={`${agent.name}`}
                        >
                            {/* Glitch Wrapper */}
                            <div style={{ position: 'relative' }} className={isGlitching ? 'animate-glitch' : ''}>
                                <Hexagon size={32} strokeWidth={1.5} style={{
                                    transition: 'all 0.3s',
                                    color: stateColor,
                                    fill: isActive ? `rgba(var(--color-current-rgb), 0.1)` : 'transparent', // Approximation, simplifying fill
                                    filter: isActive ? `drop-shadow(0 0 8px ${stateColor})` : 'none'
                                }} />
                            </div>

                            <agent.Icon size={12} style={{ position: 'absolute', zIndex: 10, transition: 'color 0.3s', color: isActive ? 'white' : '#4b5563' }} />

                            {vote && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    zIndex: 20,
                                    background: 'black',
                                    borderRadius: '50%',
                                    padding: '2px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {vote.verdict === 'APPROVE' ? <ThumbsUp size={10} color="#4ade80" /> : <ThumbsDown size={10} color="#ef4444" />}
                                </div>
                            )}
                            {isActive && <div style={{ position: 'absolute', bottom: '-4px', width: '4px', height: '4px', borderRadius: '50%', background: agent.color }} />}
                        </button>
                    );
                })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '240px', justifyContent: 'flex-end', position: 'relative', zIndex: 10 }}>
                {/* Context Gauge */}
                <div className="hidden-lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', marginRight: '1rem', width: '6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '8px', fontFamily: 'var(--font-mono)', color: '#6b7280', marginBottom: '2px' }}>
                        <BrainCircuit size={10} /> CTX LOAD
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#1f2937', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div
                            style={{
                                height: '100%',
                                transition: 'all 0.5s',
                                width: `${tokenPercentage}%`,
                                background: tokenPercentage > 80 ? '#ef4444' : 'var(--color-cyan)'
                            }}
                        />
                    </div>
                </div>

                <div className="hidden-lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: activeDef.color ? activeDef.color.replace('text-', '') : '#9ca3af' }}>{activeDef.name.split('(')[0]}</span>
                    <span style={{ fontSize: '8px', color: '#4b5563', fontFamily: 'var(--font-mono)', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeDef.description.split('.')[0]}</span>
                </div>

                <div style={{ height: '2rem', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {onToggleAutoRun && <ControlButton onClick={onToggleAutoRun} active={autoRun} activeColor="#4ade80" inactiveColor="#4b5563" icon={Rocket} title="Auto-Run Mode" glow />}
                    <ControlButton onClick={onToggleMute} active={!isMuted} activeColor="#4ade80" inactiveColor="#4b5563" icon={isMuted ? VolumeX : Volume2} title="Audio" />
                    <ControlButton onClick={onToggleSupervision} active={isSupervised && godMode} disabled={!godMode} activeColor="#60a5fa" inactiveColor="#4b5563" icon={isSupervised ? Eye : EyeOff} title="Supervision" glow />
                    <ControlButton onClick={onToggleGodMode} active={godMode} activeColor="#ef4444" inactiveColor="#4b5563" icon={godMode ? ShieldAlert : ShieldCheck} title="GOD MODE" glow pulse className={godMode ? "god-mode-active" : ""} />
                </div>
            </div>

            <style>{`
                @media (max-width: 1280px) { .hidden-xl { display: none !important; } }
                @media (max-width: 1024px) { .hidden-lg { display: none !important; } }
                .agent-btn:hover { opacity: 1 !important; transform: scale(1.05); }
                .god-mode-active { background: rgba(127, 29, 29, 0.1); border-color: rgba(239, 68, 68, 0.5) !important; }
            `}</style>
        </div>
    );
};

const PhaseBadge = ({ active, label, icon: Icon, color }: any) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '9px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '0.25rem 0.625rem',
        borderRadius: '4px',
        transition: 'all 0.25s ease',
        background: active ? `${color}15` : 'transparent',
        color: active ? color : '#4b5563',
        border: active ? `1px solid ${color}40` : '1px solid transparent',
        boxShadow: active ? `0 0 12px ${color}30` : 'none',
        textShadow: active ? `0 0 8px ${color}60` : 'none'
    }}>
        <Icon size={10} /> {label}
    </div>
);

const ControlButton = ({ onClick, active, disabled, activeColor, inactiveColor, icon: Icon, title, className = "", glow, pulse }: any) => (
    <button
        onClick={() => { SoundEffects.click(); onClick(); }}
        onMouseEnter={() => SoundEffects.hover()}
        disabled={disabled}
        style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s ease',
            background: active ? `${activeColor}15` : 'rgba(255, 255, 255, 0.02)',
            border: active ? `1px solid ${activeColor}50` : '1px solid rgba(255, 255, 255, 0.08)',
            color: active ? activeColor : inactiveColor,
            opacity: disabled ? 0.2 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: active && glow ? `0 0 15px ${activeColor}40` : 'none',
            animation: pulse && active ? 'pulse 2s infinite' : 'none'
        }}
        className={`control-btn ${className}`}
        title={title}
    >
        <Icon size={14} style={{ filter: active && glow ? `drop-shadow(0 0 4px ${activeColor})` : 'none' }} />
    </button>
);

export default TheCouncil;