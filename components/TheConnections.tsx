
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
                          onChange={e => setEditingProfile({...editingProfile, provider: e.target.value as LlmProvider})}
                          className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white focus:border-cyber-cyan focus:outline-none"
                      >
                          <option value="vllm">OpenAI / vLLM / LocalAI</option>
                          <option value="gemini">Google Gemini API</option>
                          <option value="anthropic">Anthropic Claude API</option>
                          <option value="cli">Local CLI (Ollama/Shell)</option>
                          <option value="copilot">GitHub Copilot</option>
                      </select>
                  </div>
              </div>

              {/* Dynamic Fields based on Provider */}
              {(editingProfile.provider === 'vllm' || editingProfile.provider === 'openai') && (
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">Base URL</label>
                          <input 
                              value={editingProfile.baseUrl || ''}
                              onChange={e => setEditingProfile({...editingProfile, baseUrl: e.target.value})}
                              placeholder="http://localhost:8000/v1"
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                      </div>
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">API Key (Optional)</label>
                          <input 
                              type="password"
                              value={editingProfile.apiKey || ''}
                              onChange={e => setEditingProfile({...editingProfile, apiKey: e.target.value})}
                              placeholder="sk-..."
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                      </div>
                  </div>
              )}

              {(editingProfile.provider === 'gemini' || editingProfile.provider === 'anthropic') && (
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] uppercase text-gray-500 block mb-1">API Key</label>
                          <input 
                              type="password"
                              value={editingProfile.apiKey || ''}
                              onChange={e => setEditingProfile({...editingProfile, apiKey: e.target.value})}
                              placeholder={editingProfile.provider === 'gemini' ? "AIza..." : "sk-ant..."}
                              className="w-full bg-black border border-white/10 rounded p-2 text-xs text-white font-mono focus:border-cyber-cyan focus:outline-none"
                          />
                          <p className="text-[9px] text-gray-600 mt-1">Leave empty to use server-side environment variable.</p>
                      </div>
                  </div>
              )}

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
    <div className="w-full h-full bg-[#050505] text-gray-300 flex flex-col overflow-hidden font-mono">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]">
          <div className="flex items-center gap-2 text-cyber-cyan">
              <Server size={18} />
              <span className="font-bold text-sm tracking-wider">NEURAL LINK REGISTRY</span>
          </div>
          <div className="flex bg-black/50 rounded p-1 border border-white/10">
              <button 
                onClick={() => setActiveTab('profiles')}
                className={`px-4 py-1.5 rounded text-xs uppercase flex items-center gap-2 ${activeTab === 'profiles' ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-gray-500 hover:text-white'}`}
              >
                  <Plug size={12} /> Connections
              </button>
              <button 
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-1.5 rounded text-xs uppercase flex items-center gap-2 ${activeTab === 'matrix' ? 'bg-cyber-purple/20 text-cyber-purple' : 'text-gray-500 hover:text-white'}`}
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
