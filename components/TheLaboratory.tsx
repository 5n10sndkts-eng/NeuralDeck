
import React, { useState, useEffect } from 'react';
import { AgentProfile } from '../types';
import { AGENT_DEFINITIONS } from '../services/agent';
import { sendChat } from '../services/api';
import { FlaskConical, Play, RotateCcw, Terminal, Sparkles, CheckCircle2, Cpu, ChevronRight } from 'lucide-react';

const TheLaboratory: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile>('optimizer');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [testInput, setTestInput] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<{ time: number; tokens: number } | null>(null);

  useEffect(() => {
    const definition = AGENT_DEFINITIONS[selectedAgent];
    setSystemPrompt(`IDENTITY: ${definition.name}\nCORE DIRECTIVE: ${definition.systemPrompt}`);
  }, [selectedAgent]);

  const runExperiment = async () => {
    if (!testInput.trim() || isRunning) return;
    setIsRunning(true);
    setOutput(null);
    setMetrics(null);
    
    const startTime = Date.now();
    try {
      const response = await sendChat([
        { role: 'system', content: systemPrompt, timestamp: Date.now() },
        { role: 'user', content: testInput, timestamp: Date.now() }
      ]);
      const duration = Date.now() - startTime;
      const estTokens = (response.content.length / 4).toFixed(0);
      setOutput(response.content);
      setMetrics({ time: duration, tokens: parseInt(estTokens) });
    } catch (error) {
      setOutput("PROTOCOL FAILURE: Connection severed.");
    } finally {
      setIsRunning(false);
    }
  };

  const resetLab = () => {
    setTestInput('');
    setOutput(null);
    setMetrics(null);
  };

  return (
    <div className="w-full h-full bg-[#050505] text-gray-300 flex flex-col font-mono">
      <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0a0a]">
         <div className="flex items-center gap-2 text-cyber-purple text-glow-purple">
             <FlaskConical size={16} />
             <span className="font-bold text-xs tracking-widest uppercase">The Laboratory</span>
         </div>
         <div className="text-[9px] text-gray-600 uppercase border border-white/10 px-2 py-0.5 rounded">Sandbox Mode</div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Config Panel */}
        <div className="w-full md:w-1/3 border-r border-white/10 flex flex-col bg-[#080808]">
            <div className="p-4 border-b border-white/5">
                <label className="text-[9px] text-gray-500 uppercase mb-2 block font-bold">Subject Selection</label>
                <div className="relative">
                    <select 
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value as AgentProfile)}
                        className="w-full bg-black border border-white/10 text-xs p-2 rounded text-gray-300 focus:border-cyber-purple focus:outline-none appearance-none uppercase tracking-wider"
                    >
                        {Object.entries(AGENT_DEFINITIONS).map(([key, def]) => (
                            <option key={key} value={key}>{def.name}</option>
                        ))}
                    </select>
                    <ChevronRight size={12} className="absolute right-3 top-3 text-gray-600 pointer-events-none rotate-90" />
                </div>
            </div>

            <div className="flex-1 p-4 flex flex-col min-h-0 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] text-gray-500 uppercase font-bold flex items-center gap-2">
                        <Terminal size={10} /> System DNA
                    </label>
                    <button onClick={() => { const def = AGENT_DEFINITIONS[selectedAgent]; setSystemPrompt(`IDENTITY: ${def.name}\nCORE DIRECTIVE: ${def.systemPrompt}`); }} className="text-[9px] text-cyber-cyan hover:text-white">Reset</button>
                </div>
                <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 p-3 rounded text-[10px] text-green-500/80 focus:border-green-500/30 focus:outline-none resize-none custom-scrollbar leading-relaxed font-mono-tight"
                    spellCheck={false}
                />
            </div>

            <div className="flex-1 p-4 flex flex-col min-h-0">
                <label className="text-[9px] text-gray-500 uppercase font-bold mb-2 flex items-center gap-2">
                    <Sparkles size={10} /> Stimulus
                </label>
                <textarea 
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Input test vector..."
                    className="flex-1 bg-black/30 border border-white/10 p-3 rounded text-[11px] text-white focus:border-cyber-purple/50 focus:outline-none resize-none custom-scrollbar"
                />
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2">
                <button onClick={resetLab} className="p-2.5 rounded border border-white/10 text-gray-500 hover:text-white hover:bg-white/5 transition-colors"><RotateCcw size={14} /></button>
                <button onClick={runExperiment} disabled={isRunning || !testInput.trim()} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all ${isRunning ? 'bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/30' : 'bg-cyber-purple text-white hover:bg-cyber-purple/90 shadow-[0_0_15px_rgba(189,0,255,0.3)]'}`}>
                    {isRunning ? 'Processing...' : <><Play size={14} fill="currentColor" /> Initialize</>}
                </button>
            </div>
        </div>

        {/* Output Panel */}
        <div className="w-full md:w-2/3 bg-[#0c0c0c] flex flex-col relative bg-scanlines">
             <div className="p-2 border-b border-white/5 flex justify-between items-center bg-black/40">
                 <span className="text-[9px] text-gray-600 font-mono px-2 uppercase">Observation Deck</span>
                 {metrics && (
                     <div className="flex gap-3 text-[9px] font-mono text-cyber-cyan">
                         <span>T+{metrics.time}ms</span>
                         <span>TOKENS:{metrics.tokens}</span>
                     </div>
                 )}
             </div>
             
             <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
                 {!output && !isRunning && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-800 opacity-50">
                         <FlaskConical size={64} strokeWidth={1} className="mb-2" />
                         <p className="text-[10px] font-mono tracking-[0.3em]">AWAITING DATA</p>
                     </div>
                 )}

                 {isRunning && (
                     <div className="flex items-center gap-2 text-cyber-purple font-mono text-xs absolute top-6 left-6">
                         <span className="animate-pulse">GENERATING RESPONSE...</span>
                     </div>
                 )}

                 {output && (
                     <div className="animate-in fade-in-up duration-500">
                         <div className="border-l-2 border-cyber-cyan/50 pl-3 py-1 mb-4">
                             <h3 className="text-cyber-cyan text-[10px] font-bold uppercase flex items-center gap-2">
                                 <CheckCircle2 size={10} /> Experiment Result
                             </h3>
                         </div>
                         <pre className="whitespace-pre-wrap font-mono text-xs text-gray-300 leading-relaxed selection:bg-cyber-cyan/30">
                             {output}
                         </pre>
                     </div>
                 )}
             </div>
             
             <div className="h-6 bg-[#050505] border-t border-white/5 flex items-center px-4 gap-4 text-[8px] text-gray-600 font-mono uppercase">
                 <div className="flex items-center gap-1"><div className={`w-1 h-1 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} /> SYSTEM STATUS: {isRunning ? 'BUSY' : 'READY'}</div>
                 <div className="flex-1 text-right">ISOLATION: ACTIVE</div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default TheLaboratory;
