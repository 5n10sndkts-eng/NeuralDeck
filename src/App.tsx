import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
    Activity, Hexagon, Terminal as TerminalIcon, Play, Square, Layout,
    KanbanSquare, Database, FlaskConical, Network, Server,
    GitBranch, Layers, Users, Settings, Loader2, Home, Cpu,
    Shield, Globe, MessageSquare, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Contexts
import { UIProvider, useUI } from './contexts/UIContext';
import { ConversationProvider, useConversation } from './contexts/ConversationContext';
import { HoloPanel } from './components/HoloPanel';
import { useSocket } from './hooks/useSocket';
import { MainLayout } from './components/MainLayout';
import { CyberDock } from './components/CyberDock';
import { TheOrchestrator } from './components/TheOrchestrator';

// Core Components (Always loaded)
import TheTerminal from './components/TheTerminal';
import NeuralLink from './components/NeuralLink';
import TheEditor from './components/TheEditor';
import TheCouncil from './components/TheCouncil';
import CommandPalette from './components/CommandPalette';
import { KeyboardHelp } from './components/KeyboardHelp';
import { VisionDropZone } from './components/VisionDropZone';
import { VisionPreview } from './components/VisionPreview';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { VoiceCommandHelp } from './components/VoiceCommandHelp';
import { AudioVisualizer } from './components/AudioVisualizer';
import { LoadingSkeleton, ConstructLoadingSkeleton, GraphLoadingSkeleton } from './components/LoadingSkeleton';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';

// Lazy-loaded Components (Heavy dependencies)
const TheConstruct = lazy(() => import('./components/TheConstruct'));
const CyberVerse = lazy(() => import('./components/CyberVerse'));
const TheBoard = lazy(() => import('./components/TheBoard'));
const TheSynapse = lazy(() => import('./components/TheSynapse'));
const NeuralGrid = lazy(() => import('./components/NeuralGrid'));
const TheConnections = lazy(() => import('./components/TheConnections'));
const TheLaboratory = lazy(() => import('./components/TheLaboratory'));
const TheRoundtable = lazy(() => import('./components/TheRoundtable'));
const TheGrid = lazy(() => import('./components/TheGrid'));
const TheGitLog = lazy(() => import('./components/TheGitLog'));

// Hooks & Services
import { useVoice } from './hooks/useVoiceInput';
import { parseVoiceCommand } from './services/voiceCommandParser';
import { useNeuralAutonomy } from './hooks/useNeuralAutonomy';
import { fetchFiles, sendChat, readFile, writeFile } from './services/api';
import { authService } from './services/auth';
import { GlobalAudio } from './services/audioEngine';
import { SoundEffects } from './services/sound';
import type { AmbientMood } from './services/ambientGenerator';
import { AGENT_DEFINITIONS } from './services/agent';
import { storageManager } from './services/storageManager';
import { FileNode, ChatMessage, ConnectionProfile, ViewMode, AgentProfile } from './types';

const AppContent: React.FC = () => {
    // --- AUTH INITIALIZATION - Story 6-4 ---
    useEffect(() => {
        // Create anonymous session if not authenticated
        if (!authService.isAuthenticated()) {
            authService.createSession('anonymous').then((tokens) => {
                if (tokens) {
                    console.log('[AUTH] Anonymous session created');
                } else {
                    console.warn('[AUTH] Failed to create session');
                }
            });
        }
    }, []);

    // --- UI CONTEXT (Adaptive) ---
    const { mode, isAlert, toggleAlert, setActiveAgents: setUIImplActiveAgents } = useUI();
    const { phase, logs, activeAgents, isAutoMode, toggleAuto, currentThought } = useSocket(); // useSocket call moved to top
    
    // --- CONVERSATION CONTEXT ---
    const {
        messages,
        addMessage,
        currentSessionId,
        newSession,
        isLoading: isLoadingConversation,
        cleanupOldSessions
    } = useConversation();

    // Sync activeAgents from Socket to UI Context
    useEffect(() => {
        if (activeAgents) {
            setUIImplActiveAgents(activeAgents);
        }
    }, [activeAgents, setUIImplActiveAgents]);

    // --- STATE ---
    const [view, setView] = useState<ViewMode>('workspace');
    const [files, setFiles] = useState<FileNode[]>([]);
    const [fileContents, setFileContents] = useState<Record<string, string>>({});
    const [openFiles, setOpenFiles] = useState<string[]>([]);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [showCmdPalette, setShowCmdPalette] = useState(false);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    // Settings / Config - Initialize from LocalStorage
    const [profiles, setProfiles] = useState<ConnectionProfile[]>(() => {
        const saved = localStorage.getItem('neural_profiles');
        return saved ? JSON.parse(saved) : [{
            id: 'default', name: 'LM Studio', provider: 'lmstudio', model: 'openai/gpt-oss-20b', baseUrl: 'http://192.168.100.190:1234/v1'
        }];
    });

    const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('neural_active_profile') || 'default');

    const [agentRouting, setAgentRouting] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('neural_routing');
        return saved ? JSON.parse(saved) : {};
    });

    const [godMode, setGodMode] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSupervised, setIsSupervised] = useState(false);
    const [manualSelectedAgent, setManualSelectedAgent] = useState<AgentProfile>('analyst');
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [visionAnalysisLog, setVisionAnalysisLog] = useState<string[]>([]);
    const [showVoiceHelp, setShowVoiceHelp] = useState(false);
    const [audioVolume, setAudioVolume] = useState(() => {
        const saved = localStorage.getItem('audio_volume');
        return saved ? parseFloat(saved) : 0.4;
    });
    const [audioMood, setAudioMood] = useState<AmbientMood>(() => {
        const saved = localStorage.getItem('audio_mood');
        return (saved as AmbientMood) || 'focus';
    });

    // Persistence Effects
    useEffect(() => { localStorage.setItem('neural_profiles', JSON.stringify(profiles)); }, [profiles]);
    useEffect(() => { localStorage.setItem('neural_active_profile', activeProfileId); }, [activeProfileId]);
    useEffect(() => { localStorage.setItem('neural_routing', JSON.stringify(agentRouting)); }, [agentRouting]);
    useEffect(() => { localStorage.setItem('audio_volume', audioVolume.toString()); }, [audioVolume]);
    useEffect(() => { localStorage.setItem('audio_mood', audioMood); }, [audioMood]);

    // Storage auto-cleanup initialization (Story 6-2)
    useEffect(() => {
        storageManager.initAutoCleanup(async () => {
            return await cleanupOldSessions(storageManager.getRetentionPeriod());
        });
    }, []);

    // --- AUDIO SYSTEM (Unified) ---
    // isMuted is already defined at line 98
    const toggleAudio = async () => {
        const muted = await GlobalAudio.toggle();
        setIsMuted(muted);
    };

    // Auto-update GlobalAudio mode based on UI phase
    useEffect(() => {
        GlobalAudio.setMode(mode === 'ALERT' ? 'ALERT' : (mode === 'CODING' ? 'CODING' : 'IDLE'));
    }, [mode]);

    // Initialize GlobalAudio and sync initial state
    useEffect(() => {
        GlobalAudio.init(audioVolume, audioMood);
        GlobalAudio.setMuted(isMuted);
        GlobalAudio.setMode(mode === 'ALERT' ? 'ALERT' : (mode === 'CODING' ? 'CODING' : 'IDLE'));

        if (activeAgents.length === 0) {
            GlobalAudio.setAgentState('idle');
        } else if (activeAgents.length === 1) {
            GlobalAudio.setAgentState('working');
        } else {
            GlobalAudio.setAgentState('swarm');
        }
    }, []);

    // Update GlobalAudio based on agent state
    useEffect(() => {
        if (activeAgents.length === 0) {
            GlobalAudio.setAgentState('idle');
        } else if (activeAgents.length === 1) {
            GlobalAudio.setAgentState('working');
        } else {
            GlobalAudio.setAgentState('swarm');
        }
    }, [activeAgents]);

    // Handle mute/volume changes
    useEffect(() => {
        GlobalAudio.init(audioVolume, audioMood);
    }, [isMuted, audioVolume]);

    // Mood changes handled by GlobalAudio.setMood internally if added, 
    // but for now let's just use setMode as defined.

    // Keyboard shortcut for mute (M key)
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                // Only if not typing in an input
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    setIsMuted(!isMuted);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isMuted]);

    // Adaptive UI Logic
    useEffect(() => {
        if (mode === 'CODING') {
            setShowSidebar(false);
        } else {
            setShowSidebar(true);
        }
    }, [mode]);

    // --- VOICE INPUT HOOK ---
    const voice = useVoice();

    useEffect(() => {
        if (voice.transcript) {
            const command = parseVoiceCommand(voice.transcript, 1.0, 0.7);
            if (command) {
                // Execute command
                const [category, action] = command.action.split(':');

                if (category === 'navigation') {
                    const viewMap: Record<string, ViewMode> = {
                        workspace: 'workspace',
                        construct: 'construct',
                        terminal: 'terminal',
                        dashboard: 'workspace',
                    };
                    if (viewMap[action]) {
                        setView(viewMap[action]);
                    }
                    // Activate specific agent
                    const agentName = command.target.toLowerCase();
                    const agentEntry = Object.entries(AGENT_DEFINITIONS).find(([_, d]) => d.name.toLowerCase() === agentName);
                    if (agentEntry) {
                        setManualSelectedAgent(agentEntry[0] as AgentProfile);
                    }
                } else if (category === 'system' && action === 'help') {
                    setShowVoiceHelp(true);
                }

                voice.resetTranscript();
            }
        }
    }, [voice.transcript]);

    // Keyboard shortcut for voice toggle (Cmd/Ctrl + Shift + V)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
                e.preventDefault();
                if (voice.isListening) {
                    voice.stopListening();
                } else {
                    voice.startListening();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [voice]);

    // --- AUTONOMY HOOK ---
    const activeConfig = profiles.find(p => p.id === activeProfileId) || profiles[0];

    const loadFiles = async (background = false) => {
        if (!background) setIsLoadingFiles(true);
        try {
            const data = await fetchFiles();
            setFiles(data);
        } finally {
            if (!background) setIsLoadingFiles(false);
        }
    };

    // --- STATE & DATA ---
    // MIGRATION: Replaced useNeuralAutonomy (Client-Side) with useSocket (Server-Side Cortex)
    // const { phase, logs, activeAgents, isAutoMode, toggleAuto, currentThought } = useSocket(); // This line was moved to the top

    // --- AUDIO ENGINE SYNC ---
    // Sync activeAgents from Socket to UI Context
    useEffect(() => {
        if (activeAgents) {
            setUIImplActiveAgents(activeAgents);
        }
    }, [activeAgents, setUIImplActiveAgents]);

    // --- LAYOUT ---
    // --- INITIALIZATION ---
    // --- INITIALIZATION ---
    useEffect(() => {
        loadFiles();
        const interval = setInterval(() => loadFiles(true), 5000); // Poll FS silently
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowCmdPalette(p => !p);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);



    // --- FILE HANDLERS ---
    const handleFileOpen = async (path: string) => {
        if (!fileContents[path]) {
            try {
                const content = await readFile(path);
                setFileContents(prev => ({ ...prev, [path]: content }));
            } catch {
                setFileContents(prev => ({ ...prev, [path]: '' }));
            }
        }
        if (!openFiles.includes(path)) setOpenFiles(prev => [...prev, path]);
        setActiveFile(path);
        if (view !== 'workspace') setView('workspace');
    };

    const handleFileClose = (path: string) => {
        setOpenFiles(prev => prev.filter(p => p !== path));
        if (activeFile === path) {
            setActiveFile(openFiles.find(p => p !== path) || null);
        }
    };

    const handleFileSave = async (path: string, content: string) => {
        await writeFile(path, content);
        setFileContents(prev => ({ ...prev, [path]: content }));
        SoundEffects.success();
    };

    // --- TERMINAL HANDLERS ---
    const handleSendMessage = async (text: string) => {
        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
        await addMessage(userMsg);
        SoundEffects.typing();

        let chatHistory = [...messages, userMsg];
        let agentId: AgentProfile | undefined = undefined;

        // Manual Override Logic
        if (activeAgents.length === 0 && manualSelectedAgent) {
            agentId = manualSelectedAgent;
            const def = AGENT_DEFINITIONS[manualSelectedAgent];
            const systemMsg: ChatMessage = {
                role: 'system',
                content: `IDENTITY: ${def.name} (${def.role}).\n${def.systemPrompt}\nYou are chatting with the user in manual override mode. Be helpful and execute commands if asked.`,
                timestamp: Date.now()
            };
            chatHistory = [systemMsg, ...messages, userMsg];
        }

        const response = await sendChat(chatHistory, {
            provider: activeConfig.provider,
            model: activeConfig.model,
            baseUrl: activeConfig.baseUrl
        });

        await addMessage({ ...response, agentId });
    };

    const handleCodeTransfer = async (code: string) => {
        if (!activeFile) {
            SoundEffects.error();
            alert("No file open to inject code into.");
            return;
        }

        const currentContent = fileContents[activeFile] || '';
        const newContent = currentContent + '\n\n' + code;

        setFileContents(prev => ({ ...prev, [activeFile]: newContent }));
        await writeFile(activeFile, newContent);
        SoundEffects.success();
    };

    const handleAudit = async (path: string) => {
        const content = fileContents[path];
        if (!content) return;

        const userMsg: ChatMessage = {
            role: 'user',
            content: `SYSTEM: Perform a generic SECURITY AUDIT on the following file:\n\nFile: ${path}\n\`\`\`\n${content.substring(0, 2000)}\n\`\`\``,
            timestamp: Date.now()
        };

        await addMessage(userMsg);
        SoundEffects.typing();

        const response = await sendChat([...messages, userMsg], {
            provider: activeConfig.provider,
            model: activeConfig.model,
            baseUrl: activeConfig.baseUrl
        });

        await addMessage(response);
    };

    // --- COMMAND PALETTE HANDLER ---
    const handleCommand = async (cmd: string) => {
        if (cmd.startsWith('view:')) setView(cmd.split(':')[1] as ViewMode);
        if (cmd === 'toggle:auto') toggleAuto();
        if (cmd === 'clear') await newSession();
        if (cmd === 'audit' && activeFile) handleAudit(activeFile);
    };

    // --- VISION ANALYSIS HANDLER ---
    const simulateVisionAnalysis = async (file: File) => {
        setVisionAnalysisLog([]);
        const steps = [
            'Scanning pixels...',
            'Identifying components...',
            'OCR Extraction in progress...',
            'Analyzing UI structure...',
            'Detecting interactive elements...',
            'Mapping visual hierarchy...',
            'Analysis complete.'
        ];

        for (let i = 0; i < steps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setVisionAnalysisLog(prev => [...prev, steps[i]]);

            // Also log to terminal messages
            const analysisMsg: ChatMessage = {
                role: 'system',
                content: `[VISION CORTEX] ${steps[i]}`,
                timestamp: Date.now()
            };
            await addMessage(analysisMsg);
        }
    };

    const handleFileDrop = (file: File) => {
        setDroppedFile(file);
        simulateVisionAnalysis(file);
    };

    const handleCloseVisionPreview = () => {
        setDroppedFile(null);
        setVisionAnalysisLog([]);
    };

    // --- RENDER HELPERS ---
    // DockItem component removed as it's now handled by CyberDock

    // --- SUB-VIEWS ---
    const renderView = () => {
        switch (view) {
            case 'workspace':
                return (
                    <div className="flex w-full h-full gap-4 p-4" style={{ backgroundColor: 'var(--color-void)' }}>
                        {/* Background ambient glow */}
                        <div className="absolute inset-0 pointer-events-none" style={{
                            background: 'radial-gradient(ellipse at 30% 20%, rgba(0, 240, 255, 0.04) 0%, transparent 50%)'
                        }} />

                        {/* File Explorer - Left sidebar */}
                        <div className="w-72 min-w-[260px] max-w-[300px] flex-shrink-0 flex flex-col relative z-10 overflow-hidden" style={{
                            background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.9) 0%, rgba(5, 5, 12, 0.95) 100%)',
                            border: '1px solid rgba(0, 240, 255, 0.15)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(20px)'
                        }}>
                            {/* Premium Header */}
                            <div className="px-4 py-3 flex items-center gap-3 relative" style={{
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
                                    boxShadow: '0 0 8px #00f0ff'
                                }} />
                                <span style={{
                                    color: '#00f0ff',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '0.2em',
                                    textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
                                }}>NEURAL_NET</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <NeuralLink
                                    files={files}
                                    onFileSelect={handleFileOpen}
                                    activeFile={activeFile}
                                    openFiles={openFiles}
                                    isOpen={true}
                                    isLoading={isLoadingFiles}
                                />
                            </div>
                        </div>

                        {/* Main Editor Area */}
                        <div className="flex-1 flex flex-col gap-4 min-w-0 relative z-10">
                            {/* Editor Panel */}
                            <div className="flex-[2] min-h-0 overflow-hidden" style={{
                                background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.9) 0%, rgba(5, 5, 12, 0.95) 100%)',
                                border: '1px solid rgba(0, 240, 255, 0.15)',
                                borderRadius: '8px',
                                backdropFilter: 'blur(20px)'
                            }}>
                                <TheEditor
                                    isOpen={true}
                                    activeFile={activeFile}
                                    openFiles={openFiles}
                                    fileContents={fileContents}
                                    onCloseFile={handleFileClose}
                                    onSelectFile={setActiveFile}
                                    onSave={handleFileSave}
                                    onAudit={handleAudit}
                                    onLint={async () => []}
                                    onComplete={async () => ""}
                                    onFormat={() => { }}
                                    onRunCommand={() => { }}
                                />
                            </div>

                            {/* Terminal Panel */}
                            <div className="flex-1 min-h-[180px] max-h-[280px] overflow-hidden" style={{
                                background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.9) 0%, rgba(5, 5, 12, 0.95) 100%)',
                                border: '1px solid rgba(0, 240, 255, 0.15)',
                                borderRadius: '8px',
                                backdropFilter: 'blur(20px)'
                            }}>
                                <TheTerminal
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    isThinking={activeAgents.length > 0}
                                    onTransferCode={handleCodeTransfer}
                                    activePersona={activeAgents.length > 0 ? undefined : manualSelectedAgent}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'orchestrator': return <TheOrchestrator />;

            case 'board': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<LoadingSkeleton message="LOADING NEURAL BOARD..." />}>
                            <TheBoard files={files} onOpenFile={handleFileOpen} onUpdateFile={handleFileSave} />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'synapse': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<GraphLoadingSkeleton />}>
                            <TheSynapse files={files} onFileSelect={handleFileOpen} activeFile={activeFile} />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'construct': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<ConstructLoadingSkeleton />}>
                            <TheConstruct />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'construct-3d': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<ConstructLoadingSkeleton />}>
                            <CyberVerse files={files} onFileSelect={handleFileOpen} activeAgents={activeAgents} />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'laboratory': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<LoadingSkeleton message="INITIALIZING LABORATORY..." />}>
                            <TheLaboratory />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'grid': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<LoadingSkeleton message="LOADING GRID INTERFACE..." />}>
                            <TheGrid />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'git': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<LoadingSkeleton message="LOADING GIT LOG..." />}>
                            <TheGitLog />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'roundtable': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<LoadingSkeleton message="INITIALIZING ROUNDTABLE..." />}>
                            <TheRoundtable fileContents={fileContents} llmConfig={activeConfig} />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

            case 'connections': 
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<LoadingSkeleton message="LOADING CONNECTIONS..." />}>
                            <TheConnections 
                                profiles={profiles} 
                                agentRouting={agentRouting} 
                                activeProfileId={activeProfileId} 
                                onUpdateProfiles={setProfiles} 
                                onUpdateRouting={setAgentRouting} 
                                onUpdateActiveProfile={setActiveProfileId} 
                            />
                        </Suspense>
                    </ChunkErrorBoundary>
                );
            default: return (
                <div className="flex items-center justify-center h-full text-cyber-cyan opacity-50 font-mono">
                    MODULE_OFFLINE
                </div>
            );
        }
    };

    return (
        <MainLayout
            sidebar={<CyberDock activeView={view} onViewChange={setView} show={showSidebar} />}
            header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
                    {/* Logo Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Hexagon style={{ color: 'var(--color-cyan)' }} className={activeAgents.length > 0 ? 'animate-spin-slow' : ''} size={24} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="font-display" style={{ fontWeight: 'bold', fontSize: '1.125rem', letterSpacing: '0.1em', color: 'white', lineHeight: 1 }}>NEURAL DECK</span>
                            <span className="font-mono" style={{ fontSize: '10px', color: 'var(--color-cyan)', letterSpacing: '0.3em', opacity: 0.8 }}>SYSTEM_ONLINE_V2.0</span>
                        </div>
                    </div>

                    {/* Council Section */}
                    <TheCouncil
                        activeAgent={activeAgents.length > 0 ? activeAgents[0] : manualSelectedAgent}
                        currentPhase={phase}
                        onSelectAgent={(agent) => setManualSelectedAgent(agent)}
                        godMode={godMode}
                        isMuted={isMuted}
                        isSupervised={isSupervised}
                        isThinking={activeAgents.length > 0}
                        autoRun={isAutoMode}
                        tokenUsage={0}
                        onToggleGodMode={() => setGodMode(!godMode)}
                        onToggleSupervision={() => setIsSupervised(!isSupervised)}
                        onToggleMute={() => setIsMuted(!isMuted)}
                        onToggleAutoRun={toggleAuto}
                    />
                </div>
            }
        >
            {/* ALERT STATE OVERLAY */}
            <AnimatePresence>
                {isAlert && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }}
                        className="absolute-fill pointer-events-none z-[0]"
                        style={{ background: 'radial-gradient(circle, rgba(255,0,0,0.1) 0%, rgba(255,0,0,0.4) 100%)', position: 'absolute', inset: 0 }}
                    />
                )}
            </AnimatePresence>

            {/* GLOBAL BACKGROUNDS */}
            <div className="absolute-fill bg-grid-pattern" style={{ opacity: 0.1, pointerEvents: 'none', zIndex: 0 }} />
            <div className="absolute-fill" style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.05) 0%, transparent 50%)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            <VisionDropZone onDrop={handleFileDrop}>
                <AnimatePresence mode="wait">
                    <HoloPanel
                        key={view}
                        variant={isAlert ? 'alert' : 'glass'}
                        className="w-full h-full"
                        title={`SYSTEM_VIEW: ${view.toUpperCase()}`}
                        style={{ border: 'none', background: 'transparent' }}
                    >
                        {renderView()}
                    </HoloPanel>
                </AnimatePresence>
            </VisionDropZone>

            <VisionPreview
                file={droppedFile}
                onClose={handleCloseVisionPreview}
                analysisLog={visionAnalysisLog}
            />

            <VoiceVisualizer
                isActive={voice.isListening}
            />

            <VoiceCommandHelp
                isOpen={showVoiceHelp}
                onClose={() => setShowVoiceHelp(false)}
            />

            <AudioVisualizer
                isPlaying={!isMuted}
                volume={isMuted ? 0 : audioVolume}
                mood={audioMood}
                onVolumeChange={(vol) => {
                    setAudioVolume(vol);
                    if (vol > 0 && isMuted) {
                        setIsMuted(false);
                    }
                }}
                onMoodChange={setAudioMood}
                onToggleMute={() => setIsMuted(!isMuted)}
            />

            <CommandPalette
                isOpen={showCmdPalette}
                onClose={() => setShowCmdPalette(false)}
                files={files}
                onFileSelect={handleFileOpen}
                onCommand={handleCommand}
            />

            <KeyboardHelp />
        </MainLayout>
    );
};

// Root App Wrapper
const App: React.FC = () => {
    return (
        <UIProvider>
            <ConversationProvider>
                <AppContent />
            </ConversationProvider>
        </UIProvider>
    );
};

export default App;
