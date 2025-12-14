
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
        <div className={`w-full h-full flex flex-col md:flex-row overflow-hidden font-mono relative transition-colors duration-700 ${isWarRoom ? 'bg-[#0f0202]' : 'bg-[#020204]'}`}>
            {/* Background Ambience */}
            <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isWarRoom ? 'bg-[radial-gradient(ellipse_at_center,rgba(255,0,0,0.15),transparent)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(120,0,255,0.1),transparent)]'}`} />
            
            {/* War Room Scan Lines */}
            {isWarRoom && <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,0,0,0.05)_50%)] bg-[size:100%_4px] pointer-events-none z-0" />}

            {/* Left Config Panel */}
            <div className="w-full md:w-80 border-r border-white/10 bg-black/40 backdrop-blur-md flex flex-col z-10">
                <div className={`h-14 border-b border-white/10 flex items-center justify-between px-4 transition-colors ${isWarRoom ? 'bg-red-900/20' : 'bg-[#080808]'}`}>
                    <div className={`flex items-center gap-2 ${isWarRoom ? 'text-red-500 text-glow-red' : 'text-cyber-purple text-glow-purple'}`}>
                        {isWarRoom ? <Siren size={18} className="animate-pulse" /> : <Users size={18} />}
                        <span className="font-bold text-sm tracking-widest uppercase">{isWarRoom ? 'WAR ROOM' : 'Roundtable'}</span>
                    </div>
                    <button 
                        onClick={toggleWarRoom}
                        disabled={isSessionActive}
                        className={`text-[9px] border px-2 py-1 rounded uppercase font-bold tracking-wider transition-all ${isWarRoom ? 'border-red-500 text-red-500 bg-red-900/20' : 'border-white/10 text-gray-500 hover:text-white'}`}
                    >
                        {isWarRoom ? 'Deactivate' : 'Red Alert'}
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    
                    {/* Threat Map Visual for War Room */}
                    {isWarRoom && (
                        <div className="mb-6 border border-red-500/30 bg-black rounded p-4 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20 grid grid-cols-6 gap-1">
                                {Array.from({length: 24}).map((_, i) => (
                                    <div key={i} className="bg-red-500/20 animate-pulse" style={{ animationDelay: `${Math.random() * 2}s` }} />
                                ))}
                            </div>
                            <div className="relative z-10 flex flex-col items-center justify-center h-24 gap-2 text-red-500">
                                <Radar size={32} className="animate-spin-slow" />
                                <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Threat Assessment Active</span>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Discussion Topic</label>
                        <textarea 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Design a scalable microservices architecture..."
                            className={`w-full bg-black border rounded p-3 text-xs text-white focus:outline-none h-24 resize-none transition-colors ${isWarRoom ? 'border-red-900/50 focus:border-red-500' : 'border-white/10 focus:border-cyber-purple'}`}
                            disabled={isSessionActive}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Squad Selection</label>
                        <div className="space-y-2">
                            {Object.entries(AGENT_DEFINITIONS).map(([id, def]) => (
                                <div 
                                    key={id}
                                    onClick={() => !isSessionActive && toggleParticipant(id as AgentProfile)}
                                    className={`p-2 rounded border cursor-pointer flex items-center gap-3 transition-all ${participants.includes(id as AgentProfile) ? `bg-white/5 border-${def.color.split('-')[1]}-500/50` : 'border-transparent hover:bg-white/5 opacity-50'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full ${participants.includes(id as AgentProfile) ? def.color.replace('text', 'bg') : 'bg-gray-700'}`} />
                                    <span className={`text-xs font-bold ${participants.includes(id as AgentProfile) ? 'text-white' : 'text-gray-500'}`}>{def.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={startSession}
                        disabled={isSessionActive || participants.length < 2 || !topic}
                        className={`w-full py-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all
                        ${isSessionActive ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : isWarRoom ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.4)] hover:bg-red-500' : 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50 hover:bg-cyber-purple/40 shadow-[0_0_15px_rgba(189,0,255,0.2)]'}
                        `}
                    >
                        {isSessionActive ? <span className="animate-pulse">Session in Progress...</span> : <><PlayCircle size={14} /> Initialize Session</>}
                    </button>
                </div>
            </div>

            {/* Right Chat/Viz Panel */}
            <div className="flex-1 flex flex-col relative">
                
                {/* Visualization Area (Top) */}
                <div className={`h-48 border-b flex items-center justify-center overflow-hidden relative transition-colors ${isWarRoom ? 'bg-red-950/10 border-red-900/30' : 'bg-[#030303] border-white/10'}`}>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[size:20px_20px]" />
                    
                    {/* Agents in Circle */}
                    <div className="relative w-full max-w-2xl h-full flex items-center justify-center gap-8">
                        {participants.map((id, idx) => {
                            const def = AGENT_DEFINITIONS[id];
                            const isActive = activeSpeaker === id;
                            return (
                                <div key={id} className={`flex flex-col items-center gap-2 transition-all duration-500 ${isActive ? 'scale-125 -translate-y-2' : 'opacity-70'}`}>
                                    <div className={`relative w-12 h-12 flex items-center justify-center`}>
                                        <Hexagon size={48} className={`transition-colors duration-300 ${isActive ? def.color : 'text-gray-800'}`} strokeWidth={1.5} fill={isActive ? 'currentColor' : 'none'} fillOpacity={0.1} />
                                        <Bot size={20} className={`absolute ${isActive ? 'text-white' : 'text-gray-600'}`} />
                                        {isActive && <div className={`absolute inset-0 rounded-full blur-xl opacity-50 ${def.color.replace('text', 'bg')}`} />}
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? def.color : 'text-gray-600'}`}>{def.name.split(' ')[1]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Conversation Stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-scanlines">
                    {messages.length === 0 && !isSessionActive && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50">
                            {isWarRoom ? <ShieldAlert size={64} strokeWidth={1} className="mb-4 text-red-800 animate-pulse" /> : <MessageSquare size={48} strokeWidth={1} className="mb-4" />}
                            <p className={`font-mono text-xs tracking-[0.2em] ${isWarRoom ? 'text-red-900 font-bold' : ''}`}>
                                {isWarRoom ? 'WAR ROOM ACTIVE - STANDING BY' : 'AWAITING ROUNDTABLE INPUT'}
                            </p>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const def = AGENT_DEFINITIONS[msg.agent];
                        return (
                            <div key={idx} className="flex gap-4 animate-in fade-in-up duration-300 max-w-4xl mx-auto">
                                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/5 border border-white/10 mt-1`}>
                                    <Bot size={16} className={def.color} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-3 mb-1">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${def.color}`}>{def.name}</span>
                                        <span className="text-[9px] text-gray-600 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap border-l-2 border-white/5 pl-4 py-1">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {activeSpeaker && (
                        <div className="max-w-4xl mx-auto flex gap-4 opacity-50">
                             <div className="w-8 h-8" />
                             <div className="text-xs font-mono text-gray-500 animate-pulse">
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