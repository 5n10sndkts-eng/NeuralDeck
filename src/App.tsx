import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
    Activity, Hexagon, Terminal as TerminalIcon, Play, Square, Layout,
    KanbanSquare, Database, FlaskConical, Network, Server,
    GitBranch, Layers, Users, Settings, Loader2, Home, Cpu,
    Shield, Globe, MessageSquare, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Contexts
import { UIProvider, useUI } from './contexts/UIContext';
import { ConversationProvider, useConversation } from './contexts/ConversationContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { HoloPanel } from './components/HoloPanel';
import { useSocket } from './hooks/useSocket';
import { ConnectionStatus } from './components/ConnectionStatus';
import { MainLayout } from './components/MainLayout';
import { CyberDock } from './components/CyberDock';
import { WorkspaceManager } from './components/WorkspaceManager';
import { OpenCodeStatus } from './components/OpenCodeStatus';
import { AgentChat } from './components/AgentChat';

// Core Components (Always loaded)
import TheTerminal from './components/TheTerminal';
import NeuralLink from './components/NeuralLink';
import TheEditor from './components/TheEditor';
import TheCouncil from './components/TheCouncil';
import CommandPalette from './components/CommandPalette';
import { KeyboardHelp } from './components/KeyboardHelp';
import { VisionDropZone } from './components/VisionDropZone';
import { logger } from '@/services/logger';
import { VisionPreview } from './components/VisionPreview';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { VoiceCommandHelp } from './components/VoiceCommandHelp';
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
import { fetchFiles, sendChat, readFile, writeFile, writeFileWithOptions } from './services/api';
import { authService } from './services/auth';
import { AGENT_DEFINITIONS } from './services/agent';
import { storageManager } from './services/storageManager';
import { FileNode, ChatMessage, ConnectionProfile, ViewMode, AgentProfile } from './types';
import { CLI_COMMAND_TEMPLATES, CLI_PROVIDERS } from './constants';

const AppContent: React.FC = () => {
    // --- AUTH INITIALIZATION - Story 6-4 ---
    // Note: authFetch() in services/auth.ts also ensures a session exists.
    // This eager creation reduces first-request latency.

    // --- UI CONTEXT (Adaptive) ---
    const { mode, isAlert, toggleAlert, setActiveAgents: setUIImplActiveAgents } = useUI();
    const {
        phase, logs, activeAgents, isAutoMode, toggleAuto, currentThought,
        connectionInfo, forceReconnect, forceReload  // Story 6-6
    } = useSocket();
    const {
        currentWorkspace,
        files,
        isLoading: isLoadingWorkspace,
        refreshFiles,
        createFile: workspaceCreateFile,
        createFolder: workspaceCreateFolder,
        renameItem: workspaceRenameItem,
        deleteItem: workspaceDeleteItem,
    } = useWorkspace();
    
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
    const [fileContents, setFileContents] = useState<Record<string, string>>({});
    const [openFiles, setOpenFiles] = useState<string[]>([]);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [showCmdPalette, setShowCmdPalette] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
    const [showAgentChat, setShowAgentChat] = useState(false);
    const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

    const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
    const importFilesInputRef = useRef<HTMLInputElement | null>(null);
    const importFolderInputRef = useRef<HTMLInputElement | null>(null);

    // Settings / Config - Initialize from LocalStorage (with safe parsing)
    const safeJsonParse = <T,>(key: string, fallback: T): T => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch {
            console.warn(`[App] Corrupt localStorage data for "${key}", using default`);
            return fallback;
        }
    };

    const normalizeProfiles = (input: ConnectionProfile[]): ConnectionProfile[] => {
        return input.map(profile => {
            let next = profile;
            if (
                profile.id === 'default' &&
                profile.name === 'Local OpenAI' &&
                profile.provider === 'openai' &&
                profile.baseUrl === 'http://localhost:8000'
            ) {
                next = {
                    ...profile,
                    name: 'Mock (Local)',
                    provider: 'mock',
                    model: 'mock',
                    baseUrl: undefined,
                    apiKey: undefined,
                    cliCommand: undefined
                };
            }

            if (CLI_PROVIDERS.includes(next.provider)) {
                const template = CLI_COMMAND_TEMPLATES[next.provider];
                if (!next.cliCommand && template) {
                    return { ...next, cliCommand: template };
                }
            }
            return next;
        });
    };

    const [profiles, setProfiles] = useState<ConnectionProfile[]>(() =>
        normalizeProfiles(safeJsonParse('neural_profiles', [{
            id: 'default',
            name: 'Mock (Local)',
            provider: 'mock',
            model: 'mock'
        }]))
    );

    const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('neural_active_profile') || 'default');

    const [agentRouting, setAgentRouting] = useState<Record<string, string>>(() =>
        safeJsonParse('neural_routing', {})
    );

    const [godMode, setGodMode] = useState(false);
    const [isSupervised, setIsSupervised] = useState(false);
    const [manualSelectedAgent, setManualSelectedAgent] = useState<AgentProfile>('analyst');
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [visionAnalysisLog, setVisionAnalysisLog] = useState<string[]>([]);
    const [showVoiceHelp, setShowVoiceHelp] = useState(false);

    // Persistence Effects
    useEffect(() => {
        const normalized = normalizeProfiles(profiles);
        if (JSON.stringify(normalized) !== JSON.stringify(profiles)) {
            setProfiles(normalized);
            return;
        }
        localStorage.setItem('neural_profiles', JSON.stringify(profiles));
    }, [profiles]);
    useEffect(() => { localStorage.setItem('neural_active_profile', activeProfileId); }, [activeProfileId]);
    useEffect(() => { localStorage.setItem('neural_routing', JSON.stringify(agentRouting)); }, [agentRouting]);

    // Storage auto-cleanup initialization (Story 6-2)
    useEffect(() => {
        storageManager.initAutoCleanup(async () => {
            return await cleanupOldSessions(storageManager.getRetentionPeriod());
        });
    }, []);

    // Adaptive UI Logic
    useEffect(() => {
        if (mode === 'CODING') {
            setShowSidebar(false);
        } else {
            setShowSidebar(true);
        }
    }, [mode]);

    // Workspace menu: click-outside + escape-to-close
    useEffect(() => {
        if (!showWorkspaceMenu) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            if (!workspaceMenuRef.current) return;
            if (!workspaceMenuRef.current.contains(target)) {
                setShowWorkspaceMenu(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowWorkspaceMenu(false);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showWorkspaceMenu]);

    // --- VOICE INPUT HOOK ---
    const voice = useVoice();

    useEffect(() => {
        if (voice.transcript) {
            const command = parseVoiceCommand(voice.transcript, 1.0, 0.7);
            if (command) {
                // Execute command
                const [category, action] = command.action.split(':');

                if (category === 'navigation' || category === 'navigate') {
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

    const loadFiles = useCallback(async () => {
        // Files are now managed by WorkspaceContext
        await refreshFiles();
    }, [refreshFiles]);

    // --- STATE & DATA ---
    // --- INITIALIZATION ---
    useEffect(() => {
        loadFiles();
        const interval = setInterval(() => loadFiles(), 5000); // Poll FS silently
        return () => clearInterval(interval);
    }, [loadFiles]);

    // Show workspace manager on first run if no workspace selected
    useEffect(() => {
        const isAutomatedBrowser = typeof navigator !== 'undefined' && navigator.webdriver;
        if (isAutomatedBrowser) {
            return;
        }

        if (!isLoadingWorkspace && !currentWorkspace) {
            // Small delay to allow UI to render
            const timer = setTimeout(() => {
                setShowWorkspaceManager(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoadingWorkspace, currentWorkspace]);

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
                const content = await readFile(path, currentWorkspace?.id);
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
        try {
            await writeFile(path, content, currentWorkspace?.id);
            setFileContents(prev => ({ ...prev, [path]: content }));
        } catch (e: any) {
            console.error('[FS] Save failed:', e);
            await addMessage({
                role: 'system',
                content: `[FS ERROR] Failed to save ${path}: ${e?.message || 'Unknown error'}`,
                timestamp: Date.now()
            });
        }
    };

    // --- TERMINAL HANDLERS ---
    const handleSendMessage = async (text: string) => {
        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
        await addMessage(userMsg);

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
            baseUrl: activeConfig.baseUrl,
            apiKey: activeConfig.apiKey,
            cliCommand: activeConfig.cliCommand
        });

        await addMessage({ ...response, agentId });
    };

    const handleCodeTransfer = async (code: string) => {
        if (!activeFile) {
            alert("No file open to inject code into.");
            return;
        }

        const currentContent = fileContents[activeFile] || '';
        const newContent = currentContent + '\n\n' + code;

        setFileContents(prev => ({ ...prev, [activeFile]: newContent }));
        try {
            await writeFile(activeFile, newContent, currentWorkspace?.id);
        } catch (e: any) {
            console.error('[FS] Inject failed:', e);
            await addMessage({
                role: 'system',
                content: `[FS ERROR] Failed to write ${activeFile}: ${e?.message || 'Unknown error'}`,
                timestamp: Date.now()
            });
        }
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

        const response = await sendChat([...messages, userMsg], {
            provider: activeConfig.provider,
            model: activeConfig.model,
            baseUrl: activeConfig.baseUrl,
            apiKey: activeConfig.apiKey,
            cliCommand: activeConfig.cliCommand
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

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (typeof result !== 'string') {
                    reject(new Error('Failed to read file (unexpected result type)'));
                    return;
                }
                const commaIndex = result.indexOf(',');
                resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
            };
            reader.onerror = () => {
                reject(reader.error || new Error('Failed to read file'));
            };
            reader.readAsDataURL(file);
        });
    };

    const shouldSkipImportPath = (relativePath: string): boolean => {
        const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
        const parts = normalized.split('/').filter(Boolean);
        const blocked = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', '__pycache__', '.ssh', '.aws']);
        // Block sensitive dotfiles by name (not path segments)
        const fileName = parts[parts.length - 1] || '';
        if (/^\.env(\..*)?$/.test(fileName)) return true;
        return parts.some((part) => blocked.has(part));
    };

    const importSelectedFiles = async (selected: File[], mode: 'file' | 'folder') => {
        if (!currentWorkspace) {
            setShowWorkspaceManager(true);
            await addMessage({
                role: 'system',
                content: '[WORKSPACE] Select a workspace before importing files.',
                timestamp: Date.now()
            });
            return;
        }

        if (!selected || selected.length === 0) return;

        const filesToImport = selected;
        await addMessage({
            role: 'system',
            content: `[IMPORT] Starting import (${filesToImport.length} file${filesToImport.length === 1 ? '' : 's'}) into workspace: ${currentWorkspace.name}`,
            timestamp: Date.now()
        });

        let imported = 0;
        let skipped = 0;
        let failed = 0;
        let tooLarge = 0;

        for (const file of filesToImport) {
            const rawRel =
                mode === 'folder'
                    ? ((file as any).webkitRelativePath || file.name)
                    : file.name;

            const relPath = String(rawRel || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (!relPath) {
                skipped++;
                continue;
            }
            if (shouldSkipImportPath(relPath)) {
                skipped++;
                continue;
            }

            // Guard: skip files too large for base64 transport (7MB raw ≈ 10MB encoded)
            const MAX_IMPORT_FILE_SIZE = 7 * 1024 * 1024;
            if (file.size > MAX_IMPORT_FILE_SIZE) {
                tooLarge++;
                skipped++;
                logger.warn(`[IMPORT] Skipped (too large: ${(file.size / 1024 / 1024).toFixed(1)}MB): ${relPath}`);
                continue;
            }

            try {
                const base64 = await fileToBase64(file);
                await writeFileWithOptions(relPath, base64, {
                    workspaceId: currentWorkspace.id,
                    encoding: 'base64',
                    skipCheckpoint: true
                });
                imported++;

                if (imported % 25 === 0) {
                    await addMessage({
                        role: 'system',
                        content: `[IMPORT] Progress: ${imported}/${filesToImport.length} imported...`,
                        timestamp: Date.now()
                    });
                }
            } catch (e: any) {
                failed++;
                logger.error('[IMPORT] Failed:', relPath, e);
            }
        }

        await refreshFiles();

        await addMessage({
            role: 'system',
            content: `[IMPORT] Complete. Imported: ${imported}. Skipped: ${skipped}${tooLarge > 0 ? ` (${tooLarge} too large)` : ''}. Failed: ${failed}.`,
            timestamp: Date.now()
        });
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
                            background: 'radial-gradient(ellipse at 30% 20%, rgba(0, 240, 255, 0.05) 0%, transparent 50%)'
                        }} />

                        {/* File Explorer - Left sidebar */}
                        <div className="w-72 min-w-[260px] max-w-[300px] flex-shrink-0 flex flex-col relative z-10 overflow-visible" style={{
                            background: 'linear-gradient(135deg, rgba(10, 10, 22, 0.92) 0%, rgba(5, 5, 14, 0.96) 100%)',
                            border: '1px solid rgba(0, 240, 255, 0.18)',
                            borderRadius: '10px',
                            backdropFilter: 'blur(24px)',
                            boxShadow: '0 0 1px rgba(0, 240, 255, 0.5), 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
	                        }}>
	                            {/* Premium Header */}
	                            <div 
	                                className="px-4 py-3.5 flex items-center gap-3 relative transition-all"
	                                style={{
	                                    background: 'linear-gradient(180deg, rgba(12, 12, 24, 0.98) 0%, rgba(6, 6, 16, 0.96) 100%)',
	                                    borderBottom: '1px solid rgba(0, 240, 255, 0.22)'
	                                }}
	                                title="Workspace"
	                            >
		                                <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
		                                    background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%)',
		                                    boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)'
		                                }} />
		                                <div ref={workspaceMenuRef} className="relative flex-1 min-w-0">
		                                    <button
		                                        type="button"
		                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
		                                        onClick={(e) => { e.stopPropagation(); setShowWorkspaceMenu(prev => !prev); }}
		                                        style={{
		                                            background: 'rgba(0, 240, 255, 0.06)',
		                                            border: '1px solid rgba(0, 240, 255, 0.26)',
		                                            boxShadow: '0 0 0 1px rgba(0, 240, 255, 0.10) inset, 0 10px 30px rgba(0, 0, 0, 0.25)',
		                                            cursor: 'pointer'
		                                        }}
		                                        data-testid="workspace-menu-button"
		                                        aria-haspopup="menu"
		                                        aria-expanded={showWorkspaceMenu}
		                                        title={currentWorkspace ? `Workspace: ${currentWorkspace.name}` : 'Workspace: none selected'}
		                                    >
		                                        <div style={{
		                                            width: '9px',
		                                            height: '9px',
		                                            borderRadius: '50%',
		                                            flexShrink: 0,
		                                            backgroundColor: currentWorkspace ? '#00ff88' : '#ff4466',
		                                            boxShadow: currentWorkspace
		                                                ? '0 0 10px rgba(0, 255, 136, 0.7), 0 0 20px rgba(0, 255, 136, 0.4)'
		                                                : '0 0 10px rgba(255, 68, 102, 0.7), 0 0 20px rgba(255, 68, 102, 0.4)'
		                                        }} />
		                                        <div className="flex-1 min-w-0">
		                                            <div style={{
		                                                color: '#00f0ff',
		                                                fontSize: '10px',
		                                                fontWeight: 800,
		                                                letterSpacing: '0.22em',
		                                                textShadow: '0 0 12px rgba(0, 240, 255, 0.7)'
		                                            }}>
		                                                {currentWorkspace ? currentWorkspace.name.toUpperCase() : 'NO WORKSPACE'}
		                                            </div>
		                                            <div style={{
		                                                color: currentWorkspace ? '#666' : 'rgba(0, 240, 255, 0.65)',
		                                                fontSize: '9px',
		                                                marginTop: '2px',
		                                                overflow: 'hidden',
		                                                textOverflow: 'ellipsis',
		                                                whiteSpace: 'nowrap'
		                                            }} title={currentWorkspace?.path}>
		                                                {currentWorkspace ? currentWorkspace.path : 'Click to open / create a workspace'}
		                                            </div>
		                                        </div>
		                                        <ChevronDown
		                                            size={18}
		                                            style={{
		                                                color: '#00f0ff',
		                                                opacity: 0.95,
		                                                transform: showWorkspaceMenu ? 'rotate(180deg)' : 'rotate(0deg)',
		                                                transition: 'transform 160ms ease',
		                                                filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.35))'
		                                            }}
		                                        />
		                                    </button>

		                                    {showWorkspaceMenu && (
                                    <div
                                        role="menu"
                                        className="absolute left-0 right-0 mt-2 overflow-visible"
		                                            style={{
		                                                background: 'linear-gradient(135deg, rgba(10, 10, 22, 0.98) 0%, rgba(5, 5, 14, 0.99) 100%)',
		                                                border: '1px solid rgba(0, 240, 255, 0.28)',
		                                                borderRadius: '10px',
		                                                backdropFilter: 'blur(18px)',
		                                                boxShadow: '0 0 1px rgba(0, 240, 255, 0.4), 0 16px 48px rgba(0, 0, 0, 0.70)',
		                                                zIndex: 80
		                                            }}
		                                            onClick={(e) => e.stopPropagation()}
		                                        >
		                                            <button
		                                                type="button"
		                                                role="menuitem"
		                                                className="w-full px-4 py-3 text-left transition-colors hover:bg-[rgba(0,240,255,0.08)]"
		                                                style={{ color: '#ddd', fontSize: '12px' }}
		                                                data-testid="workspace-menu-open"
		                                                onClick={() => { setShowWorkspaceMenu(false); setShowWorkspaceManager(true); }}
		                                            >
		                                                Open Workspace...
		                                            </button>

		                                            <div style={{ height: '1px', background: 'rgba(0, 240, 255, 0.12)' }} />

		                                            <button
		                                                type="button"
		                                                role="menuitem"
		                                                className="w-full px-4 py-3 text-left transition-colors hover:bg-[rgba(0,240,255,0.08)]"
		                                                style={{
		                                                    color: currentWorkspace ? '#ddd' : '#555',
		                                                    fontSize: '12px',
		                                                    cursor: currentWorkspace ? 'pointer' : 'not-allowed'
		                                                }}
		                                                data-testid="workspace-menu-import-file"
		                                                disabled={!currentWorkspace}
		                                                onClick={() => {
		                                                    setShowWorkspaceMenu(false);
		                                                    if (!currentWorkspace) return;
		                                                    importFilesInputRef.current?.click();
		                                                }}
		                                            >
		                                                Import File...
		                                            </button>

		                                            <button
		                                                type="button"
		                                                role="menuitem"
		                                                className="w-full px-4 py-3 text-left transition-colors hover:bg-[rgba(0,240,255,0.08)]"
		                                                style={{
		                                                    color: currentWorkspace ? '#ddd' : '#555',
		                                                    fontSize: '12px',
		                                                    cursor: currentWorkspace ? 'pointer' : 'not-allowed'
		                                                }}
		                                                data-testid="workspace-menu-import-folder"
		                                                disabled={!currentWorkspace}
		                                                onClick={() => {
		                                                    setShowWorkspaceMenu(false);
		                                                    if (!currentWorkspace) return;
		                                                    importFolderInputRef.current?.click();
		                                                }}
		                                            >
		                                                Import Folder...
		                                            </button>

		                                            {!currentWorkspace && (
		                                                <div className="px-4 py-2" style={{ color: '#888', fontSize: '11px' }}>
		                                                    Select a workspace first to import files.
		                                                </div>
		                                            )}
		                                        </div>
		                                    )}
		                                </div>
		                            </div>
	                            <div className="flex-1 overflow-hidden">
	                                <NeuralLink
	                                    files={files}
                                    onFileSelect={handleFileOpen}
                                    activeFile={activeFile}
                                    openFiles={openFiles}
                                    isOpen={true}
                                    isLoading={isLoadingWorkspace}
                                />
                            </div>
                        </div>

                        {/* Main Editor Area */}
                        <div className="flex-1 flex flex-col gap-4 min-w-0 relative z-10">
                            {/* Editor Panel */}
                            <div className="flex-[2] min-h-0 overflow-hidden" style={{
                                background: 'linear-gradient(135deg, rgba(10, 10, 22, 0.92) 0%, rgba(5, 5, 14, 0.96) 100%)',
                                border: '1px solid rgba(0, 240, 255, 0.18)',
                                borderRadius: '10px',
                                backdropFilter: 'blur(24px)',
                                boxShadow: '0 0 1px rgba(0, 240, 255, 0.5), 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
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
                            <div className="flex-1 min-h-[200px] max-h-[320px] overflow-hidden" style={{
                                background: 'linear-gradient(135deg, rgba(10, 10, 22, 0.92) 0%, rgba(5, 5, 14, 0.96) 100%)',
                                border: '1px solid rgba(0, 240, 255, 0.18)',
                                borderRadius: '10px',
                                backdropFilter: 'blur(24px)',
                                boxShadow: '0 0 1px rgba(0, 240, 255, 0.5), 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
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

            case 'orchestrator':
                return (
                    <ChunkErrorBoundary>
                        <Suspense fallback={<GraphLoadingSkeleton />}>
                            <NeuralGrid phase={phase} activeAgents={activeAgents} files={files} />
                        </Suspense>
                    </ChunkErrorBoundary>
                );

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
                        {/* Story 6-6: Connection Status Indicator */}
                        <ConnectionStatus
                            connectionInfo={connectionInfo}
                            onReconnect={forceReconnect}
                            onReload={forceReload}
                            compact={true}
                        />
                    </div>

                    {/* Council Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <OpenCodeStatus onOpenChat={() => setShowAgentChat(true)} />
                        <TheCouncil
                            activeAgent={activeAgents.length > 0 ? activeAgents[0] : manualSelectedAgent}
                            currentPhase={phase}
                            onSelectAgent={(agent) => setManualSelectedAgent(agent)}
                            godMode={godMode}
                            isSupervised={isSupervised}
                            isThinking={activeAgents.length > 0}
                            autoRun={isAutoMode}
                            tokenUsage={0}
                            onToggleGodMode={() => setGodMode(!godMode)}
                            onToggleSupervision={() => setIsSupervised(!isSupervised)}
                            onToggleAutoRun={toggleAuto}
                        />
                    </div>
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

            <CommandPalette
                isOpen={showCmdPalette}
                onClose={() => setShowCmdPalette(false)}
                files={files}
                onFileSelect={handleFileOpen}
                onCommand={handleCommand}
            />

            <KeyboardHelp />

            <WorkspaceManager
                isOpen={showWorkspaceManager}
                onClose={() => setShowWorkspaceManager(false)}
            />

            <AgentChat
                isOpen={showAgentChat}
                onClose={() => setShowAgentChat(false)}
                defaultAgent={manualSelectedAgent}
            />

            {/* Hidden inputs used by the workspace dropdown import actions */}
            <input
                ref={importFilesInputRef}
                type="file"
                multiple
                data-testid="workspace-import-files-input"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const files = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
                    e.currentTarget.value = '';
                    void importSelectedFiles(files, 'file');
                }}
            />
            <input
                ref={importFolderInputRef}
                type="file"
                multiple
                data-testid="workspace-import-folder-input"
                style={{ display: 'none' }}
                {...({ webkitdirectory: 'true', directory: 'true' } as any)}
                onChange={(e) => {
                    const files = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
                    e.currentTarget.value = '';
                    void importSelectedFiles(files, 'folder');
                }}
            />
        </MainLayout>
    );
};

// Root App Wrapper
const App: React.FC = () => {
    return (
        <UIProvider>
            <ConversationProvider>
                <WorkspaceProvider>
                    <ChunkErrorBoundary>
                        <AppContent />
                    </ChunkErrorBoundary>
                </WorkspaceProvider>
            </ConversationProvider>
        </UIProvider>
    );
};

export default App;
