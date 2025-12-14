
import React, { useState } from 'react';
import { Play, XOctagon, GitBranch, Terminal, AlertTriangle } from 'lucide-react';
import { InterventionResponse } from '../types';

interface Props {
  thought: string;
  tool: string;
  params: any;
  onDecision: (decision: InterventionResponse) => void;
}

const MissionControl: React.FC<Props> = ({ thought, tool, params, onDecision }) => {
  const [steerInput, setSteerInput] = useState('');
  const [isSteering, setIsSteering] = useState(false);

  const handleSteer = () => {
      if (!steerInput.trim()) return;
      onDecision({ type: 'STEER', instruction: steerInput });
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-black/90 border border-cyber-purple/50 rounded-lg shadow-[0_0_50px_rgba(189,0,255,0.2)] backdrop-blur-md z-50 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      
      {/* Header */}
      <div className="bg-cyber-purple/10 px-4 py-2 border-b border-cyber-purple/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyber-purple font-mono text-sm font-bold uppercase tracking-wider">
              <AlertTriangle size={16} className="animate-pulse" />
              Mission Control: Intervention Required
          </div>
          <div className="text-[10px] text-gray-500 font-mono">WAITING FOR AUTHORIZATION</div>
      </div>

      <div className="p-4 flex flex-col gap-4">
          {/* Thought */}
          <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Agent Reasoning</span>
              <div className="text-sm text-gray-300 italic border-l-2 border-gray-700 pl-3 py-1">
                  "{thought}"
              </div>
          </div>

          {/* Proposed Action */}
          <div className="bg-black/50 rounded border border-white/10 p-3 font-mono text-xs">
              <div className="flex items-center gap-2 mb-2 text-cyber-cyan">
                  <Terminal size={14} />
                  <span className="font-bold">{tool}</span>
              </div>
              <pre className="text-gray-400 whitespace-pre-wrap overflow-x-auto max-h-32 custom-scrollbar">
                  {JSON.stringify(params, null, 2)}
              </pre>
          </div>

          {/* Controls */}
          {!isSteering ? (
              <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => onDecision({ type: 'APPROVE' })}
                    className="flex-1 bg-green-900/20 border border-green-500/50 text-green-400 py-2 rounded font-mono text-xs uppercase hover:bg-green-900/40 transition-colors flex items-center justify-center gap-2 group"
                  >
                      <Play size={14} className="group-hover:fill-current" /> Approve & Execute
                  </button>
                  
                  <button 
                    onClick={() => setIsSteering(true)}
                    className="flex-1 bg-blue-900/20 border border-blue-500/50 text-blue-400 py-2 rounded font-mono text-xs uppercase hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2"
                  >
                      <GitBranch size={14} /> Steer / Refine
                  </button>

                  <button 
                    onClick={() => onDecision({ type: 'REJECT' })}
                    className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-2 rounded font-mono text-xs uppercase hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                    title="Abort Mission"
                  >
                      <XOctagon size={14} />
                  </button>
              </div>
          ) : (
              <div className="flex flex-col gap-2 mt-2 animate-in fade-in">
                  <div className="text-[10px] text-blue-400 uppercase font-mono">Steering Instruction</div>
                  <div className="flex gap-2">
                      <input 
                        autoFocus
                        value={steerInput}
                        onChange={(e) => setSteerInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSteer()}
                        placeholder="Enter new instruction to redirect agent..."
                        className="flex-1 bg-black border border-blue-500/50 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button 
                        onClick={handleSteer}
                        className="bg-blue-500/20 text-blue-400 px-4 rounded border border-blue-500/50 hover:bg-blue-500/30"
                      >
                          <GitBranch size={14} />
                      </button>
                      <button 
                        onClick={() => setIsSteering(false)}
                        className="text-gray-500 hover:text-white px-2"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default MissionControl;
