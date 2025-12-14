
import React, { useState, useEffect } from 'react';
import { 
  Activity, Hexagon, TerminalSquare, Play, Square, Layout, 
  KanbanSquare, Database, FlaskConical, Network, Server, 
  GitBranch, Layers, Users, Settings, Loader2
} from 'lucide-react';

// Components
import TheTerminal from './components/TheTerminal';
import NeuralLink from './components/NeuralLink';
import NeuralGrid from './components/NeuralGrid';
import TheConnections from './components/TheConnections';
import TheEditor from './components/TheEditor';
import TheCouncil from './components/TheCouncil';
import TheBoard from './components/TheBoard';
import TheConstruct from './components/TheConstruct';
import TheLaboratory from './components/TheLaboratory';
import TheRoundtable from './components/TheRoundtable';
import TheSynapse from './components/TheSynapse';
import TheGrid from './components/TheGrid';
import TheGitLog from './components/TheGitLog';
import CommandPalette from './components/CommandPalette';

// Hooks & Services
import { useNeuralAutonomy } from './hooks/useNeuralAutonomy';
import { fetchFiles, sendChat, readFile, writeFile } from './services/api';
import { initAudio, SoundEffects } from './services/sound';
import { AGENT_DEFINITIONS } from './services/agent';
import { FileNode, ChatMessage, ConnectionProfile, ViewMode, AgentProfile } from './types';

const App: React.FC = () => {
  // --- STATE ---
  const [view, setView] = useState<ViewMode>('workspace');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // Settings / Config - Initialize from LocalStorage
  const [profiles, setProfiles] = useState<ConnectionProfile[]>(() => {
      const saved = localStorage.getItem('neural_profiles');
      return saved ? JSON.parse(saved) : [{
          id: 'default', name: 'Localhost', provider: 'vllm', model: 'llama3', baseUrl: 'http://localhost:11434/v1'
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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [manualSelectedAgent, setManualSelectedAgent] = useState<AgentProfile>('analyst');

  // Persistence Effects
  useEffect(() => { localStorage.setItem('neural_profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('neural_active_profile', activeProfileId); }, [activeProfileId]);
  useEffect(() => { localStorage.setItem('neural_routing', JSON.stringify(agentRouting)); }, [agentRouting]);

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

  const { phase, logs, activeAgents, isAutoMode, toggleAuto } = useNeuralAutonomy(files, activeConfig, () => loadFiles(true));

  // --- INITIALIZATION ---
  useEffect(() => {
    initAudio();
    loadFiles();
    const interval = setInterval(() => loadFiles(true), 5000); // Poll FS silently
    
    const handleKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setShowCmdPalette(p => !p);
        }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
        clearInterval(interval);
        window.removeEventListener('keydown', handleKey);
    };
  }, []);

  // --- FILE HANDLERS ---
  const handleFileOpen = async (path: string) => {
      if (!fileContents[path]) {
          try {
            const content = await readFile(path);
            setFileContents(prev => ({...prev, [path]: content}));
          } catch {
            setFileContents(prev => ({...prev, [path]: ''}));
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
      setFileContents(prev => ({...prev, [path]: content}));
      SoundEffects.success();
  };

  // --- TERMINAL HANDLERS ---
  const handleSendMessage = async (text: string) => {
      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      
      // Inject Persona if not auto-running
      let chatHistory = [...messages, userMsg];
      let agentId: AgentProfile | undefined = undefined;

      // If auto-mode is off, we use the manually selected agent as the persona
      if (activeAgents.length === 0 && manualSelectedAgent) {
          agentId = manualSelectedAgent;
          const def = AGENT_DEFINITIONS[manualSelectedAgent];
          const systemMsg: ChatMessage = { 
              role: 'system', 
              content: `IDENTITY: ${def.name} (${def.role}).\n${def.systemPrompt}\nYou are chatting with the user in manual override mode. Be helpful and execute commands if asked.`, 
              timestamp: Date.now() 
          };
          
          // Only prepend system message if the context hasn't been established or we switched agents
          // Simple heuristic: Always prepend for now to ensure persona strength
          chatHistory = [systemMsg, ...messages, userMsg];
      }

      const response = await sendChat(chatHistory, {
          provider: activeConfig.provider,
          model: activeConfig.model,
          baseUrl: activeConfig.baseUrl
      });
      
      setMessages(prev => [...prev, { ...response, agentId }]);
  };

  const handleCodeTransfer = async (code: string) => {
      if (!activeFile) {
          SoundEffects.error();
          alert("No file open to inject code into.");
          return;
      }
      
      const currentContent = fileContents[activeFile] || '';
      const newContent = currentContent + '\n\n' + code;
      
      setFileContents(prev => ({...prev, [activeFile]: newContent}));
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
      
      setMessages(prev => [...prev, userMsg]);
      SoundEffects.typing();

      const response = await sendChat([...messages, userMsg], {
          provider: activeConfig.provider,
          model: activeConfig.model,
          baseUrl: activeConfig.baseUrl
      });
      
      setMessages(prev => [...prev, response]);
  };

  // --- COMMAND PALETTE HANDLER ---
  const handleCommand = (cmd: string) => {
      if (cmd.startsWith('view:')) {
          setView(cmd.split(':')[1] as ViewMode);
      }
      if (cmd === 'toggle:sidebar') setSidebarVisible(!sidebarVisible);
      if (cmd === 'clear') setMessages([]);
      if (cmd === 'audit' && activeFile) handleAudit(activeFile);
  };

  // --- RENDER HELPERS ---
  const NavButton = ({ mode, icon: Icon, label }: { mode: ViewMode, icon: any, label: string }) => (
      <button 
          onClick={() => { setView(mode); SoundEffects.click(); }}
          className={`w-12 h-12 flex items-center justify-center transition-all relative group ${view === mode ? 'text-cyber-cyan bg-white/5 border-l-2 border-cyber-cyan' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          title={label}
      >
          <Icon size={20} strokeWidth={1.5} />
          <div className="absolute left-full ml-2 bg-black border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 rounded shadow-lg backdrop-blur-md">
              {label}
          </div>
      </button>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505] text-gray-300 font-sans overflow-hidden selection:bg-cyber-cyan/30 selection:text-white">
      
      {/* TOP HEADER: THE COUNCIL */}
      <TheCouncil 
          isThinking={activeAgents.length > 0}
          godMode={godMode}
          isMuted={isMuted}
          isSupervised={isSupervised}
          activeAgent={activeAgents.length > 0 ? activeAgents[0] : manualSelectedAgent}
          currentPhase={phase}
          autoRun={isAutoMode}
          tokenUsage={0} 
          onToggleGodMode={() => setGodMode(!godMode)}
          onToggleSupervision={() => setIsSupervised(!isSupervised)}
          onToggleMute={() => setIsMuted(!isMuted)}
          onSelectAgent={(agent) => setManualSelectedAgent(agent)}
          onToggleAutoRun={toggleAuto}
      />

      <div className="flex-1 flex overflow-hidden relative">
          
          {/* LEFT SIDEBAR: NAVIGATION */}
          <aside className="w-12 bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-2 z-40">
              <NavButton mode="workspace" icon={Layout} label="Workspace" />
              <NavButton mode="orchestrator" icon={Activity} label="Neural Orchestrator" />
              <NavButton mode="board" icon={KanbanSquare} label="Kanban Board" />
              <NavButton mode="synapse" icon={Network} label="Synapse Graph" />
              <div className="w-8 h-px bg-white/10 my-2" />
              <NavButton mode="laboratory" icon={FlaskConical} label="Laboratory" />
              <NavButton mode="construct" icon={Database} label="The Construct" />
              <NavButton mode="grid" icon={Layers} label="Package Grid" />
              <NavButton mode="git" icon={GitBranch} label="Git Log" />
              <NavButton mode="roundtable" icon={Users} label="Roundtable" />
              <div className="flex-1" />
              <NavButton mode="connections" icon={Server} label="Connections" />
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex overflow-hidden relative bg-[#050505]">
              
              {/* VIEW: WORKSPACE */}
              {view === 'workspace' && (
                  <div className="flex w-full h-full">
                      {sidebarVisible && (
                          <aside className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col relative z-30">
                              <div className="p-3 bg-white/5 border-b border-white/10 text-xs font-bold text-gray-400 uppercase flex justify-between items-center backdrop-blur-md">
                                  <span className="text-cyber-cyan tracking-wider">Project Files</span>
                                  <div className="flex items-center gap-2">
                                      {isLoadingFiles && <Loader2 size={10} className="animate-spin text-cyber-cyan" />}
                                      <span className="text-[9px] text-gray-600 font-mono">{files.length} Nodes</span>
                                  </div>
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                  <NeuralLink 
                                      files={files} 
                                      onFileSelect={handleFileOpen} 
                                      activeFile={activeFile} 
                                      openFiles={openFiles} 
                                      isOpen={true}
                                      isLoading={isLoadingFiles}
                                  />
                              </div>
                          </aside>
                      )}
                      
                      <div className="flex-1 flex flex-col min-w-0 relative z-20">
                          <div className="flex-1 border-b border-white/10 min-h-0">
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
                                  onFormat={() => {}}
                                  onRunCommand={() => {}}
                              />
                          </div>
                          <div className="h-1/3 min-h-[200px] bg-[#020204] border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] relative z-30">
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
              )}

              {/* VIEW: ORCHESTRATOR */}
              {view === 'orchestrator' && (
                  <div className="w-full h-full flex">
                      <div className="flex-1 relative">
                          <NeuralGrid phase={phase} activeAgents={activeAgents} files={files} />
                      </div>
                      <div className="w-80 border-l border-white/10 bg-black/60 backdrop-blur-md flex flex-col">
                           <div className="p-3 border-b border-white/10 font-bold text-xs uppercase text-cyber-cyan flex items-center gap-2 bg-white/5">
                               <TerminalSquare size={14} /> Neural Logs
                           </div>
                           <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1 bg-scanlines custom-scrollbar">
                                {logs.map((log, i) => (
                                    <div key={i} className={`break-words ${log.type === 'error' ? 'text-red-400' : log.type === 'command' ? 'text-yellow-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-400'}`}>
                                        <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.msg}
                                    </div>
                                ))}
                           </div>
                      </div>
                  </div>
              )}

              {/* OTHER VIEWS */}
              {view === 'board' && <TheBoard files={files} onOpenFile={handleFileOpen} onUpdateFile={handleFileSave} />}
              {view === 'laboratory' && <TheLaboratory />}
              {view === 'synapse' && <TheSynapse files={files} onFileSelect={handleFileOpen} activeFile={activeFile} />}
              {view === 'construct' && <TheConstruct />}
              {view === 'grid' && <TheGrid />}
              {view === 'git' && <TheGitLog />}
              {view === 'roundtable' && <TheRoundtable fileContents={fileContents} llmConfig={activeConfig} />}
              {view === 'connections' && (
                  <TheConnections 
                      profiles={profiles}
                      agentRouting={agentRouting}
                      activeProfileId={activeProfileId}
                      onUpdateProfiles={setProfiles}
                      onUpdateRouting={setAgentRouting}
                      onUpdateActiveProfile={setActiveProfileId}
                  />
              )}

          </main>
      </div>

      {/* OVERLAYS */}
      <CommandPalette 
          isOpen={showCmdPalette} 
          onClose={() => setShowCmdPalette(false)}
          files={files}
          onFileSelect={handleFileOpen}
          onCommand={handleCommand}
      />
    </div>
  );
};

export default App;
