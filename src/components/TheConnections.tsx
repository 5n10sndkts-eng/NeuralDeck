
import React, { useState } from 'react';
import { Server, Globe, Terminal, Cpu, Check, AlertCircle, Save, Plus, Trash2, Plug, PlayCircle, Key, Edit3, Copy, Shuffle } from 'lucide-react';
import { ConnectionProfile, LlmProvider, AgentProfile } from '../types';
import { AGENT_DEFINITIONS } from '../services/agent';
import { sendChat } from '../services/api';

interface Props {
  profiles: ConnectionProfile[];
  agentRouting: Record<string, string>; // AgentID -> ProfileID
  activeProfileId: string;
  onUpdateProfiles: (profiles: ConnectionProfile[]) => void;
  onUpdateRouting: (routing: Record<string, string>) => void;
  onUpdateActiveProfile: (id: string) => void;
}

const TheConnections: React.FC<Props> = ({ 
    profiles, 
    agentRouting, 
    activeProfileId, 
    onUpdateProfiles, 
    onUpdateRouting, 
    onUpdateActiveProfile 
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'matrix'>('profiles');
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // --- PROFILE MANAGEMENT ---
  const handleAddProfile = () => {
      const newProfile: ConnectionProfile = {
          id: `conn-${Date.now()}`,
          name: 'New Connection',
          provider: 'vllm',
          model: 'default',
          baseUrl: 'http://localhost:8000/v1'
      };
      setEditingProfile(newProfile);
  };

  const handleSaveProfile = () => {
      if (!editingProfile) return;
      const exists = profiles.find(p => p.id === editingProfile.id);
      if (exists) {
          onUpdateProfiles(profiles.map(p => p.id === editingProfile.id ? editingProfile : p));
      } else {
          onUpdateProfiles([...profiles, editingProfile]);
      }
      setEditingProfile(null);
  };

  const handleDeleteProfile = (id: string) => {
      if (id === activeProfileId) {
          alert("Cannot delete the currently active default profile.");
          return;
      }
      if (window.confirm("Delete this connection profile?")) {
          onUpdateProfiles(profiles.filter(p => p.id !== id));
          // Cleanup routing
          const newRouting = { ...agentRouting };
          Object.keys(newRouting).forEach(key => {
              if (newRouting[key] === id) delete newRouting[key];
          });
          onUpdateRouting(newRouting);
      }
  };

  const handleTestConnection = async (profile: ConnectionProfile) => {
      setTestStatus('Testing...');
      try {
          await sendChat([
              { role: 'user', content: 'Ping', timestamp: Date.now() }
          ], {
              provider: profile.provider,
              model: profile.model,
              baseUrl: profile.baseUrl,
              apiKey: profile.apiKey,
              cliCommand: profile.cliCommand
          });
          setTestStatus('Success!');
          setTimeout(() => setTestStatus(null), 2000);
      } catch (e: any) {
          setTestStatus(`Failed: ${e.message}`);
          setTimeout(() => setTestStatus(null), 4000);
      }
  };

  const renderProfileForm = () => {
      if (!editingProfile) return null;
      
      return (
          <div className="bg-[#0a0a0a] border border-white/10 rounded p-4 space-y-4 animate-in slide-in-right">
              <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                  <h3 className="text-sm font-bold text-cyber-cyan uppercase">Configure Connection</h3>
                  <button onClick={() => setEditingProfile(null)} className="text-xs text-gray-500 hover:text-white">CANCEL</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Connection Name</label>
                      <input 
                          value={editingProfile.name}
                          onChange={e => setEditingProfile({...editingProfile, name: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white focus:border-cyber-cyan focus:outline-none"
                      />
                  </div>
                  <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Provider Type</label>
                      <select
                          value={editingProfile.provider}
                          onChange={e => {
                              const provider = e.target.value as LlmProvider;
                              let updates: Partial<ConnectionProfile> = { provider };
                              // Auto-populate defaults for LM Studio
                              if (provider === 'lmstudio') {
                                  updates.baseUrl = 'http://localhost:1234/v1';
                              }
                              setEditingProfile({...editingProfile, ...updates});
                          }}
                          className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white focus:border-cyber-cyan focus:outline-none"
                      >
                          <optgroup label="HTTP APIs">
                              <option value="vllm">OpenAI / vLLM / LocalAI</option>
                              <option value="lmstudio">LM Studio (Local)</option>
                              <option value="gemini">Google Gemini API</option>
                              <option value="anthropic">Anthropic Claude API</option>
                              <option value="openai">OpenAI API</option>
                              <option value="copilot">GitHub Copilot API</option>
                          </optgroup>
                          <optgroup label="CLI Tools">
                              <option value="cli">Local CLI (Ollama/Shell)</option>
                              <option value="claude-cli">Claude Code CLI</option>
                              <option value="gemini-cli">Gemini CLI</option>
                              <option value="copilot-cli">GitHub Copilot CLI</option>
                              <option value="cursor-cli">Cursor Agent CLI</option>
                          </optgroup>
                      </select>
                  </div>
              </div>

              {/* Dynamic Fields based on Provider */}

              {/* OpenAI-compatible APIs (vLLM, OpenAI, LM Studio) */}
              {(editingProfile.provider === 'vllm' || editingProfile.provider === 'openai' || editingProfile.provider === 'lmstudio') && (
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">Base URL</label>
                          <input
                              value={editingProfile.baseUrl || ''}
                              onChange={e => setEditingProfile({...editingProfile, baseUrl: e.target.value})}
                              placeholder={editingProfile.provider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:8000/v1'}
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                          {editingProfile.provider === 'lmstudio' && (
                              <p className="text-[9px] text-gray-600 mt-1">LM Studio default: http://localhost:1234/v1</p>
                          )}
                      </div>
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">API Key (Optional)</label>
                          <input
                              type="password"
                              value={editingProfile.apiKey || ''}
                              onChange={e => setEditingProfile({...editingProfile, apiKey: e.target.value})}
                              placeholder={editingProfile.provider === 'lmstudio' ? 'lm-studio (or leave empty)' : 'sk-...'}
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                          {editingProfile.provider === 'lmstudio' && (
                              <p className="text-[9px] text-gray-600 mt-1">LM Studio usually doesn't require an API key.</p>
                          )}
                      </div>
                  </div>
              )}

              {/* Cloud APIs (Gemini, Anthropic) */}
              {(editingProfile.provider === 'gemini' || editingProfile.provider === 'anthropic') && (
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">API Key</label>
                          <input
                              type="password"
                              value={editingProfile.apiKey || ''}
                              onChange={e => setEditingProfile({...editingProfile, apiKey: e.target.value})}
                              placeholder={editingProfile.provider === 'gemini' ? 'AIza...' : 'sk-ant...'}
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                          <p className="text-[9px] text-gray-600 mt-1">Leave empty to use server-side environment variable.</p>
                      </div>
                  </div>
              )}

              {/* Generic CLI (Ollama/Shell) */}
              {editingProfile.provider === 'cli' && (
                  <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Command Template</label>
                      <input
                          value={editingProfile.cliCommand || ''}
                          onChange={e => setEditingProfile({...editingProfile, cliCommand: e.target.value})}
                          placeholder='ollama run llama3 "{{prompt}}"'
                          className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                      />
                      <p className="text-[9px] text-gray-600 mt-1">Use {'{{prompt}}'} as placeholder for the message.</p>
                  </div>
              )}

              {/* Claude Code CLI */}
              {editingProfile.provider === 'claude-cli' && (
                  <div className="space-y-4">
                      <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                          <p className="text-[10px] text-purple-300">Claude Code CLI uses the installed `claude` command. Ensure Claude Code is installed and authenticated.</p>
                      </div>
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">Command Template</label>
                          <input
                              value={editingProfile.cliCommand || 'claude -p "{{prompt}}"'}
                              onChange={e => setEditingProfile({...editingProfile, cliCommand: e.target.value})}
                              placeholder='claude -p "{{prompt}}"'
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                      </div>
                  </div>
              )}

              {/* Gemini CLI */}
              {editingProfile.provider === 'gemini-cli' && (
                  <div className="space-y-4">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                          <p className="text-[10px] text-blue-300">Gemini CLI uses the installed `gemini` command. Ensure it's installed and configured with your API key.</p>
                      </div>
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">Command Template</label>
                          <input
                              value={editingProfile.cliCommand || 'gemini "{{prompt}}"'}
                              onChange={e => setEditingProfile({...editingProfile, cliCommand: e.target.value})}
                              placeholder='gemini "{{prompt}}"'
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                      </div>
                  </div>
              )}

              {/* GitHub Copilot CLI */}
              {editingProfile.provider === 'copilot-cli' && (
                  <div className="space-y-4">
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                          <p className="text-[10px] text-green-300">GitHub Copilot CLI uses `gh copilot`. Ensure GitHub CLI is installed with Copilot extension.</p>
                      </div>
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">Command Template</label>
                          <input
                              value={editingProfile.cliCommand || 'gh copilot suggest "{{prompt}}"'}
                              onChange={e => setEditingProfile({...editingProfile, cliCommand: e.target.value})}
                              placeholder='gh copilot suggest "{{prompt}}"'
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                      </div>
                  </div>
              )}

              {/* Cursor Agent CLI */}
              {editingProfile.provider === 'cursor-cli' && (
                  <div className="space-y-4">
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                          <p className="text-[10px] text-yellow-300">Cursor Agent CLI uses the `cursor` command. Ensure Cursor is installed with CLI enabled.</p>
                      </div>
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">Command Template</label>
                          <input
                              value={editingProfile.cliCommand || 'cursor --prompt "{{prompt}}"'}
                              onChange={e => setEditingProfile({...editingProfile, cliCommand: e.target.value})}
                              placeholder='cursor --prompt "{{prompt}}"'
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                      </div>
                  </div>
              )}

              <div>
                   <label className="text-[10px] uppercase text-gray-500 block mb-1">Model Identifier</label>
                   <input 
                       value={editingProfile.model || ''}
                       onChange={e => setEditingProfile({...editingProfile, model: e.target.value})}
                       placeholder="gpt-4, gemini-pro, llama3..."
                       className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                   />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                   <button onClick={() => handleTestConnection(editingProfile)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-xs font-bold uppercase">
                       {testStatus || 'Test'}
                   </button>
                   <button onClick={handleSaveProfile} className="px-4 py-2 bg-cyber-cyan/20 text-cyber-cyan hover:bg-cyber-cyan/30 rounded text-xs font-bold uppercase border border-cyber-cyan/50">
                       Save Connection
                   </button>
              </div>
          </div>
      );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden font-mono" style={{
      backgroundColor: 'var(--color-void)',
      color: '#d1d5db'
    }}>
        {/* Premium HUD Header */}
        <div className="h-14 flex items-center justify-between px-5 relative" style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
        }}>
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.5) 50%, transparent 100%)'
          }} />

          <div className="flex items-center gap-3">
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#00f0ff',
                boxShadow: '0 0 8px #00f0ff, 0 0 16px rgba(0, 240, 255, 0.5)'
              }} />
              <Server size={18} style={{ color: '#00f0ff' }} />
              <span style={{
                color: '#00f0ff',
                fontWeight: 700,
                fontSize: '12px',
                letterSpacing: '0.15em',
                textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
              }}>NEURAL LINK REGISTRY</span>
          </div>

          <div className="flex p-1" style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
              <button
                onClick={() => setActiveTab('profiles')}
                className="flex items-center gap-2"
                style={{
                  padding: '6px 16px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: activeTab === 'profiles' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                  color: activeTab === 'profiles' ? '#00f0ff' : '#6b7280',
                  border: activeTab === 'profiles' ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
              >
                  <Plug size={12} /> Connections
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className="flex items-center gap-2"
                style={{
                  padding: '6px 16px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: activeTab === 'matrix' ? 'rgba(188, 19, 254, 0.15)' : 'transparent',
                  color: activeTab === 'matrix' ? '#bc13fe' : '#6b7280',
                  border: activeTab === 'matrix' ? '1px solid rgba(188, 19, 254, 0.3)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
              >
                  <Shuffle size={12} /> Routing Matrix
              </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Left Panel (List/Matrix) */}
            <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${editingProfile ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
                
                {/* PROFILES TAB */}
                {activeTab === 'profiles' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Available Uplinks</h2>
                            <button onClick={handleAddProfile} className="text-xs flex items-center gap-2 text-green-400 hover:text-green-300">
                                <Plus size={14} /> NEW CONNECTION
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {profiles.map(profile => (
                                <div key={profile.id} className={`p-3 rounded border transition-colors flex items-center justify-between ${activeProfileId === profile.id ? 'bg-cyber-cyan/10 border-cyber-cyan/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded bg-black ${activeProfileId === profile.id ? 'text-cyber-cyan' : 'text-gray-500'}`}>
                                            {profile.provider === 'cli' ? <Terminal size={16} /> : <Globe size={16} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200">{profile.name}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">
                                                {profile.provider.toUpperCase()} • {profile.model}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                         {activeProfileId !== profile.id && (
                                             <button onClick={() => onUpdateActiveProfile(profile.id)} className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white uppercase">
                                                 Set Default
                                             </button>
                                         )}
                                         {activeProfileId === profile.id && (
                                             <span className="text-[10px] px-2 py-1 text-cyber-cyan font-bold uppercase border border-cyber-cyan/30 rounded">Active</span>
                                         )}
                                         <button onClick={() => setEditingProfile(profile)} className="p-1.5 text-gray-500 hover:text-white"><Edit3 size={14}/></button>
                                         <button onClick={() => handleDeleteProfile(profile.id)} className="p-1.5 text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MATRIX TAB */}
                {activeTab === 'matrix' && (
                    <div className="space-y-6">
                         <p className="text-xs text-gray-500 mb-4">Map specific Agents to specialized Connections. Any Agent not routed here will use the <strong>Default Uplink</strong>.</p>
                         
                         <div className="grid grid-cols-1 gap-2">
                             {Object.entries(AGENT_DEFINITIONS).map(([agentId, def]) => {
                                 const currentProfileId = agentRouting[agentId] || activeProfileId;
                                 const isOverride = !!agentRouting[agentId];

                                 return (
                                     <div key={agentId} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded hover:border-white/10">
                                         <div className="flex items-center gap-3">
                                             <div className={`w-2 h-2 rounded-full ${def.color.replace('text', 'bg')}`} />
                                             <div>
                                                 <div className="text-xs font-bold text-gray-200 uppercase">{def.name}</div>
                                                 <div className="text-[9px] text-gray-600">{def.description.split('.')[0]}</div>
                                             </div>
                                         </div>

                                         <div className="flex items-center gap-2">
                                             <select 
                                                value={currentProfileId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newRouting = { ...agentRouting };
                                                    if (val === activeProfileId) {
                                                        delete newRouting[agentId]; // Reset to default
                                                    } else {
                                                        newRouting[agentId] = val;
                                                    }
                                                    onUpdateRouting(newRouting);
                                                }}
                                                className={`bg-black border rounded p-1.5 text-xs w-48 focus:outline-none ${isOverride ? 'border-cyber-purple text-cyber-purple' : 'border-white/10 text-gray-500'}`}
                                             >
                                                 {profiles.map(p => (
                                                     <option key={p.id} value={p.id}>{p.name}</option>
                                                 ))}
                                             </select>
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                    </div>
                )}
            </div>

            {/* Edit Panel (Conditional) */}
            {editingProfile && (
                <div className="w-1/2 p-6 bg-[#080808] border-l border-white/10">
                    {renderProfileForm()}
                </div>
            )}
        </div>
    </div>
  );
};

export default TheConnections;
