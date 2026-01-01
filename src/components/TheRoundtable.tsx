
import React, { useState, useRef, useEffect } from 'react';
import { AgentProfile, LlmConfig } from '../types';
import { AGENT_DEFINITIONS, runRoundtableLoop } from '../services/agent';
import { Users, Hexagon, MessageSquare, PlayCircle, StopCircle, Bot, Siren, ShieldAlert, Globe2, Radar } from 'lucide-react';
import { SoundEffects } from '../services/sound';

interface Props {
    fileContents: { [path: string]: string };
    llmConfig: LlmConfig;
}

interface RoundtableMessage {
    agent: AgentProfile;
    content: string;
    timestamp: number;
}

const TheRoundtable: React.FC<Props> = ({ fileContents, llmConfig }) => {
    const [participants, setParticipants] = useState<AgentProfile[]>(['architect', 'developer', 'sec_auditor']);
    const [topic, setTopic] = useState('');
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [messages, setMessages] = useState<RoundtableMessage[]>([]);
    const [activeSpeaker, setActiveSpeaker] = useState<AgentProfile | null>(null);
    const [isWarRoom, setIsWarRoom] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Toggle War Room Effects and Participants
    const toggleWarRoom = () => {
        if (!isWarRoom) {
            setParticipants(['red_teamer', 'sec_auditor', 'devops']);
            setTopic('SYSTEM PENETRATION TEST: Identify Critical Vulnerabilities and Exploits.');
            SoundEffects.boot();
        }
        setIsWarRoom(!isWarRoom);
    };

    const toggleParticipant = (id: AgentProfile) => {
        if (participants.includes(id)) {
            setParticipants(participants.filter(p => p !== id));
        } else {
            setParticipants([...participants, id]);
        }
    };

    const startSession = async () => {
        if (!topic.trim() || participants.length < 2) return;
        setIsSessionActive(true);
        setMessages([]);
        SoundEffects.boot();

        await runRoundtableLoop(
            participants,
            topic,
            fileContents,
            (agent, content) => {
                if (content === '...') {
                    setActiveSpeaker(agent);
                } else {
                    setMessages(prev => [...prev, { agent, content, timestamp: Date.now() }]);
                    SoundEffects.typing();
                    setActiveSpeaker(null);
                }
            },
            llmConfig,
            isWarRoom ? 8 : 10 // Max turns
        );

        setIsSessionActive(false);
        setActiveSpeaker(null);
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row overflow-hidden font-mono relative transition-colors duration-700" style={{
            backgroundColor: isWarRoom ? 'rgba(15, 2, 2, 1)' : 'var(--color-void)'
        }}>
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none transition-all duration-1000" style={{
                background: isWarRoom
                    ? 'radial-gradient(ellipse at center, rgba(255, 0, 0, 0.15) 0%, transparent 70%)'
                    : 'radial-gradient(ellipse at center, rgba(188, 19, 254, 0.1) 0%, transparent 70%)'
            }} />

            {/* War Room Scan Lines */}
            {isWarRoom && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255, 0, 0, 0.05) 2px, rgba(255, 0, 0, 0.05) 4px)'
                }} />
            )}

            {/* Left Config Panel */}
            <div className="w-full md:w-80 flex flex-col z-10" style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(16px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {/* Premium HUD Header */}
                <div className="h-14 flex items-center justify-between px-5 relative transition-colors" style={{
                    background: isWarRoom
                        ? 'linear-gradient(180deg, rgba(20, 5, 5, 0.98) 0%, rgba(10, 2, 2, 0.95) 100%)'
                        : 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
                    borderBottom: isWarRoom ? '1px solid rgba(255, 0, 0, 0.3)' : '1px solid rgba(188, 19, 254, 0.2)'
                }}>
                    {/* Bottom glow line */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
                        background: isWarRoom
                            ? 'linear-gradient(90deg, transparent 0%, rgba(255, 0, 0, 0.5) 50%, transparent 100%)'
                            : 'linear-gradient(90deg, transparent 0%, rgba(188, 19, 254, 0.5) 50%, transparent 100%)'
                    }} />

                    <div className="flex items-center gap-2">
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isWarRoom ? '#ff003c' : '#bc13fe',
                            boxShadow: isWarRoom ? '0 0 8px #ff003c, 0 0 16px rgba(255, 0, 60, 0.5)' : '0 0 8px #bc13fe, 0 0 16px rgba(188, 19, 254, 0.5)',
                            animation: isWarRoom ? 'pulse 1s infinite' : 'none'
                        }} />
                        {isWarRoom ? <Siren size={18} style={{ color: '#ff003c' }} className="animate-pulse" /> : <Users size={18} style={{ color: '#bc13fe' }} />}
                        <span className="font-bold text-sm tracking-widest uppercase" style={{
                            color: isWarRoom ? '#ff003c' : '#bc13fe',
                            textShadow: isWarRoom ? '0 0 10px rgba(255, 0, 60, 0.5)' : '0 0 10px rgba(188, 19, 254, 0.5)'
                        }}>
                            {isWarRoom ? 'WAR ROOM' : 'Roundtable'}
                        </span>
                    </div>
                    <button
                        onClick={toggleWarRoom}
                        disabled={isSessionActive}
                        style={{
                            fontSize: '9px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: isSessionActive ? 'not-allowed' : 'pointer',
                            color: isWarRoom ? '#ff003c' : '#6b7280',
                            background: isWarRoom ? 'rgba(255, 0, 60, 0.1)' : 'transparent',
                            border: isWarRoom ? '1px solid rgba(255, 0, 60, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                            opacity: isSessionActive ? 0.5 : 1
                        }}
                    >
                        {isWarRoom ? 'Deactivate' : 'Red Alert'}
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">

                    {/* Threat Map Visual for War Room */}
                    {isWarRoom && (
                        <div className="mb-6 rounded p-4 relative overflow-hidden" style={{
                            border: '1px solid rgba(255, 0, 60, 0.3)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)'
                        }}>
                            <div className="absolute inset-0 opacity-20 grid grid-cols-6 gap-1">
                                {Array.from({length: 24}).map((_, i) => (
                                    <div key={i} className="animate-pulse" style={{
                                        backgroundColor: 'rgba(255, 0, 60, 0.2)',
                                        animationDelay: `${Math.random() * 2}s`
                                    }} />
                                ))}
                            </div>
                            <div className="relative z-10 flex flex-col items-center justify-center h-24 gap-2" style={{ color: '#ff003c' }}>
                                <Radar size={32} className="animate-spin" style={{ animationDuration: '3s' }} />
                                <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Threat Assessment Active</span>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="text-[10px] uppercase font-bold mb-2 block" style={{ color: '#6b7280' }}>Discussion Topic</label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Design a scalable microservices architecture..."
                            disabled={isSessionActive}
                            className="w-full rounded p-3 text-xs focus:outline-none h-24 resize-none transition-colors"
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                color: 'white',
                                border: isWarRoom ? '1px solid rgba(255, 0, 60, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="text-[10px] uppercase font-bold mb-2 block" style={{ color: '#6b7280' }}>Squad Selection</label>
                        <div className="space-y-2">
                            {Object.entries(AGENT_DEFINITIONS).map(([id, def]) => {
                                const isSelected = participants.includes(id as AgentProfile);
                                return (
                                    <div
                                        key={id}
                                        onClick={() => !isSessionActive && toggleParticipant(id as AgentProfile)}
                                        className="p-2 rounded cursor-pointer flex items-center gap-3 transition-all"
                                        style={{
                                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                            border: isSelected ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                                            opacity: isSelected ? 1 : 0.5
                                        }}
                                    >
                                        <div className="w-3 h-3 rounded-full" style={{
                                            backgroundColor: isSelected ? def.color.replace('text-', '').includes('cyan') ? '#00f0ff' : def.color.replace('text-', '').includes('purple') ? '#bc13fe' : '#6b7280' : '#374151'
                                        }} />
                                        <span className="text-xs font-bold" style={{ color: isSelected ? 'white' : '#6b7280' }}>{def.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={startSession}
                        disabled={isSessionActive || participants.length < 2 || !topic}
                        className="w-full py-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        style={{
                            cursor: (isSessionActive || participants.length < 2 || !topic) ? 'not-allowed' : 'pointer',
                            backgroundColor: isSessionActive ? 'rgba(55, 65, 81, 0.5)' : isWarRoom ? 'rgba(220, 38, 38, 0.8)' : 'rgba(188, 19, 254, 0.2)',
                            color: isSessionActive ? '#6b7280' : isWarRoom ? 'white' : '#bc13fe',
                            border: isWarRoom ? '1px solid rgba(255, 0, 60, 0.5)' : '1px solid rgba(188, 19, 254, 0.5)',
                            boxShadow: isSessionActive ? 'none' : isWarRoom ? '0 0 20px rgba(255, 0, 0, 0.4)' : '0 0 15px rgba(188, 19, 254, 0.2)'
                        }}
                    >
                        {isSessionActive ? <span className="animate-pulse">Session in Progress...</span> : <><PlayCircle size={14} /> Initialize Session</>}
                    </button>
                </div>
            </div>

            {/* Right Chat/Viz Panel */}
            <div className="flex-1 flex flex-col relative">

                {/* Visualization Area (Top) */}
                <div className="h-48 flex items-center justify-center overflow-hidden relative transition-colors" style={{
                    backgroundColor: isWarRoom ? 'rgba(50, 10, 10, 0.3)' : 'rgba(3, 3, 3, 1)',
                    borderBottom: isWarRoom ? '1px solid rgba(255, 0, 60, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(45deg, transparent 25%, rgba(255, 255, 255, 0.02) 50%, transparent 75%, transparent 100%)',
                        backgroundSize: '20px 20px'
                    }} />
                    
                    {/* Agents in Circle */}
                    <div className="relative w-full max-w-2xl h-full flex items-center justify-center gap-8">
                        {participants.map((id, idx) => {
                            const def = AGENT_DEFINITIONS[id];
                            const isActive = activeSpeaker === id;
                            const agentColor = def.color.includes('cyan') ? '#00f0ff' : def.color.includes('purple') ? '#bc13fe' : def.color.includes('red') ? '#ff003c' : '#6b7280';
                            return (
                                <div key={id} className="flex flex-col items-center gap-2 transition-all duration-500" style={{
                                    transform: isActive ? 'scale(1.25) translateY(-8px)' : 'scale(1)',
                                    opacity: isActive ? 1 : 0.7
                                }}>
                                    <div className="relative w-12 h-12 flex items-center justify-center">
                                        <Hexagon size={48} strokeWidth={1.5} fill={isActive ? 'currentColor' : 'none'} fillOpacity={0.1} style={{
                                            color: isActive ? agentColor : '#1f2937',
                                            transition: 'color 0.3s'
                                        }} />
                                        <Bot size={20} className="absolute" style={{ color: isActive ? 'white' : '#4b5563' }} />
                                        {isActive && <div className="absolute inset-0 rounded-full blur-xl opacity-50" style={{ backgroundColor: agentColor }} />}
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: isActive ? agentColor : '#4b5563' }}>{def.name.split(' ')[1]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Conversation Stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative" style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.02) 2px, rgba(0, 240, 255, 0.02) 4px)'
                }}>
                    {messages.length === 0 && !isSessionActive && (
                        <div className="h-full flex flex-col items-center justify-center opacity-50">
                            {isWarRoom ? (
                                <ShieldAlert size={64} strokeWidth={1} className="mb-4 animate-pulse" style={{ color: 'rgba(255, 0, 60, 0.5)' }} />
                            ) : (
                                <MessageSquare size={48} strokeWidth={1} className="mb-4" style={{ color: '#374151' }} />
                            )}
                            <p className="font-mono text-xs tracking-[0.2em]" style={{
                                color: isWarRoom ? 'rgba(255, 0, 60, 0.6)' : '#374151',
                                fontWeight: isWarRoom ? 700 : 400
                            }}>
                                {isWarRoom ? 'WAR ROOM ACTIVE - STANDING BY' : 'AWAITING ROUNDTABLE INPUT'}
                            </p>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const def = AGENT_DEFINITIONS[msg.agent];
                        const msgColor = def.color.includes('cyan') ? '#00f0ff' : def.color.includes('purple') ? '#bc13fe' : def.color.includes('red') ? '#ff003c' : '#6b7280';
                        return (
                            <div key={idx} className="flex gap-4 max-w-4xl mx-auto animate-fade-in-up">
                                <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 mt-1" style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <Bot size={16} style={{ color: msgColor }} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-3 mb-1">
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: msgColor }}>{def.name}</span>
                                        <span className="text-[9px] font-mono" style={{ color: '#4b5563' }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap pl-4 py-1" style={{
                                        color: '#d1d5db',
                                        borderLeft: '2px solid rgba(255, 255, 255, 0.05)'
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {activeSpeaker && (
                        <div className="max-w-4xl mx-auto flex gap-4 opacity-50">
                             <div className="w-8 h-8" />
                             <div className="text-xs font-mono animate-pulse" style={{ color: '#6b7280' }}>
                                 {AGENT_DEFINITIONS[activeSpeaker].name} is thinking...
                             </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>
            </div>
        </div>
    );
};

export default TheRoundtable;