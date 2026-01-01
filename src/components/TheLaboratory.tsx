
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
    <div className="w-full h-full text-gray-300 flex flex-col font-mono relative" style={{ backgroundColor: 'var(--color-void)' }}>
      {/* Background Effects - Unified Cyberpunk Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 70% 30%, rgba(188, 19, 254, 0.08) 0%, transparent 60%)'
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.02) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
      }} />

      {/* Premium HUD Header */}
      <div className="h-14 flex items-center justify-between px-5 z-10 relative" style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
          borderBottom: '1px solid rgba(188, 19, 254, 0.2)'
      }}>
         {/* Bottom glow line */}
         <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
             background: 'linear-gradient(90deg, transparent 0%, rgba(188, 19, 254, 0.5) 50%, transparent 100%)'
         }} />
         <div className="flex items-center gap-3">
             <div style={{
                     width: '8px',
                     height: '8px',
                     borderRadius: '50%',
                     backgroundColor: '#bc13fe',
                     boxShadow: '0 0 8px #bc13fe, 0 0 16px rgba(188, 19, 254, 0.5)'
                 }} />
             <FlaskConical size={18} style={{ color: 'var(--color-purple)' }} />
             <span className="font-bold text-xs tracking-[0.2em] uppercase font-display" style={{ color: 'var(--color-purple)', textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>The Laboratory</span>
             <span className="text-[10px] text-gray-500 font-mono uppercase">// Agent Sandbox</span>
         </div>
         <div className="text-[9px] uppercase px-2 py-0.5 rounded font-mono" style={{
             color: 'var(--color-purple)',
             border: '1px solid rgba(188, 19, 254, 0.3)',
             background: 'rgba(188, 19, 254, 0.1)'
         }}>Sandbox Mode</div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden z-10 relative">
        {/* Config Panel */}
        <div className="w-full md:w-1/3 flex flex-col" style={{
            backgroundColor: 'rgba(8, 8, 12, 0.8)',
            borderRight: '1px solid rgba(0, 240, 255, 0.1)'
        }}>
            <div className="p-4" style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.05)' }}>
                <label className="text-[9px] uppercase mb-2 block font-bold" style={{ color: 'var(--color-purple)', opacity: 0.7 }}>Subject Selection</label>
                <div className="relative">
                    <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value as AgentProfile)}
                        className="w-full text-xs p-2 rounded text-gray-300 appearance-none uppercase tracking-wider neon-input"
                        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                    >
                        {Object.entries(AGENT_DEFINITIONS).map(([key, def]) => (
                            <option key={key} value={key}>{def.name}</option>
                        ))}
                    </select>
                    <ChevronRight size={12} className="absolute right-3 top-3 pointer-events-none rotate-90" style={{ color: 'var(--color-cyan)' }} />
                </div>
            </div>

            <div className="flex-1 p-4 flex flex-col min-h-0" style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.05)' }}>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] uppercase font-bold flex items-center gap-2" style={{ color: 'var(--color-cyan)', opacity: 0.7 }}>
                        <Terminal size={10} /> System DNA
                    </label>
                    <button onClick={() => { const def = AGENT_DEFINITIONS[selectedAgent]; setSystemPrompt(`IDENTITY: ${def.name}\nCORE DIRECTIVE: ${def.systemPrompt}`); }} className="text-[9px] text-glow-cyan hover:text-white transition-colors">Reset</button>
                </div>
                <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="flex-1 neon-input p-3 rounded text-[10px] resize-none custom-scrollbar leading-relaxed font-mono"
                    style={{ color: 'var(--color-green)', background: 'rgba(0, 0, 0, 0.3)' }}
                    spellCheck={false}
                />
            </div>

            <div className="flex-1 p-4 flex flex-col min-h-0">
                <label className="text-[9px] uppercase font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-purple)', opacity: 0.7 }}>
                    <Sparkles size={10} /> Stimulus
                </label>
                <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Input test vector..."
                    className="flex-1 neon-input p-3 rounded text-[11px] text-white resize-none custom-scrollbar"
                    style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                />
            </div>

            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid rgba(0, 240, 255, 0.1)' }}>
                <button onClick={resetLab} className="neon-button neon-button-ghost p-2.5"><RotateCcw size={14} /></button>
                <button onClick={runExperiment} disabled={isRunning || !testInput.trim()} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all ${isRunning ? 'neon-button neon-button-ghost' : 'neon-button neon-button-purple'}`}>
                    {isRunning ? 'Processing...' : <><Play size={14} fill="currentColor" /> Initialize</>}
                </button>
            </div>
        </div>

        {/* Output Panel */}
        <div className="w-full md:w-2/3 flex flex-col relative bg-scanlines" style={{ backgroundColor: 'rgba(12, 12, 15, 0.9)' }}>
             <div className="p-3 flex justify-between items-center" style={{
                 background: 'rgba(0, 0, 0, 0.4)',
                 borderBottom: '1px solid rgba(0, 240, 255, 0.1)'
             }}>
                 <span className="text-[9px] font-mono px-2 uppercase" style={{ color: 'var(--color-cyan)', opacity: 0.6 }}>Observation Deck</span>
                 {metrics && (
                     <div className="flex gap-3 text-[9px] font-mono text-glow-cyan">
                         <span>T+{metrics.time}ms</span>
                         <span>TOKENS:{metrics.tokens}</span>
                     </div>
                 )}
             </div>

             <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
                 {!output && !isRunning && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: 'rgba(0, 240, 255, 0.2)' }}>
                         <FlaskConical size={64} strokeWidth={1} className="mb-2" />
                         <p className="text-[10px] font-mono tracking-[0.3em]">AWAITING DATA</p>
                     </div>
                 )}

                 {isRunning && (
                     <div className="flex items-center gap-2 font-mono text-xs absolute top-6 left-6" style={{ color: 'var(--color-purple)' }}>
                         <span className="animate-pulse">GENERATING RESPONSE...</span>
                     </div>
                 )}

                 {output && (
                     <div className="animate-fade-in-up">
                         <div className="pl-3 py-1 mb-4" style={{ borderLeft: '2px solid rgba(0, 240, 255, 0.5)' }}>
                             <h3 className="text-[10px] font-bold uppercase flex items-center gap-2 text-glow-cyan">
                                 <CheckCircle2 size={10} /> Experiment Result
                             </h3>
                         </div>
                         <pre className="whitespace-pre-wrap font-mono text-xs text-gray-300 leading-relaxed crt-text" style={{ color: 'rgba(0, 240, 255, 0.8)' }}>
                             {output}
                         </pre>
                     </div>
                 )}
             </div>

             <div className="h-6 flex items-center px-4 gap-4 text-[8px] font-mono uppercase" style={{
                 backgroundColor: 'rgba(5, 5, 8, 0.9)',
                 borderTop: '1px solid rgba(0, 240, 255, 0.1)',
                 color: 'rgba(0, 240, 255, 0.4)'
             }}>
                 <div className="flex items-center gap-1">
                     <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : ''}`} style={{ background: isRunning ? undefined : 'var(--color-green)', boxShadow: isRunning ? '0 0 6px rgba(255, 200, 0, 0.5)' : '0 0 6px rgba(0, 255, 136, 0.5)' }} />
                     SYSTEM STATUS: {isRunning ? 'BUSY' : 'READY'}
                 </div>
                 <div className="flex-1 text-right">ISOLATION: ACTIVE</div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default TheLaboratory;
