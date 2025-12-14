
import React, { useEffect, useState } from 'react';
import { Database, Save, RefreshCw, FileJson, Shield, Cpu, Binary } from 'lucide-react';
import { readFile, writeFile, ingestContext } from '../services/api';
import { SoundEffects } from '../services/sound';

const TheConstruct: React.FC = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'raw' | 'visual'>('raw');
  const [stats, setStats] = useState({ chars: 0, lines: 0, tokens: 0 });

  const CONTEXT_FILE = '.neural_context.md';

  const loadContext = async () => {
    setLoading(true);
    SoundEffects.click();
    try {
        let data = await readFile(CONTEXT_FILE);
        if (!data || data.includes('Error reading file')) {
            // Default Template
            data = `# NEURAL CONSTRUCT: PRIME DIRECTIVES

## 1. Project Architecture
- Describe the stack here.
- Define folder structure rules.

## 2. Coding Standards
- Define naming conventions.
- Define formatting rules.

## 3. Mission Memory
- Store long-term goals here.
`;
        }
        setContent(data);
        updateStats(data);
    } catch (e) {
        setContent("Connection to Memory Core Failed.");
    } finally {
        setLoading(false);
    }
  };

  const updateStats = (text: string) => {
      setStats({
          chars: text.length,
          lines: text.split('\n').length,
          tokens: Math.floor(text.length / 4)
      });
  };

  const handleSave = async () => {
      setLoading(true);
      try {
          await writeFile(CONTEXT_FILE, content);
          await ingestContext(content); // Force Re-ingest to MCP if needed
          SoundEffects.success();
      } catch (e) {
          SoundEffects.error();
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      loadContext();
  }, []);

  return (
    <div className="w-full h-full bg-[#020204] flex flex-col text-green-500 font-mono relative overflow-hidden">
        {/* Matrix Background Effect (CSS Only) */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,0,.3)_25%,rgba(0,255,0,.3)_26%,transparent_27%,transparent_74%,rgba(0,255,0,.3)_75%,rgba(0,255,0,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(0,255,0,.3)_25%,rgba(0,255,0,.3)_26%,transparent_27%,transparent_74%,rgba(0,255,0,.3)_75%,rgba(0,255,0,.3)_76%,transparent_77%,transparent)] bg-[size:30px_30px]" />

        <div className="h-14 border-b border-green-900/30 flex items-center justify-between px-6 bg-[#051005] z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-900/20 rounded border border-green-500/30">
                    <Database size={18} className="animate-pulse" />
                </div>
                <div>
                    <h2 className="text-lg font-bold tracking-[0.2em] text-glow-green">THE CONSTRUCT</h2>
                    <div className="text-[10px] text-green-700 font-bold">LONG-TERM MEMORY CORE</div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 <div className="text-[10px] text-green-800 flex gap-4 font-bold">
                     <span className="flex items-center gap-1"><Binary size={10} /> {stats.chars} BYTES</span>
                     <span className="flex items-center gap-1"><Cpu size={10} /> ~{stats.tokens} TOKENS</span>
                 </div>
                 <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/50 text-green-400 hover:bg-green-500/20 rounded uppercase text-xs font-bold tracking-wider transition-all hover:shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                 >
                    <Save size={14} /> Commit Memory
                 </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden z-10">
            {/* Decorator Sidebar */}
            <div className="w-12 border-r border-green-900/30 bg-[#020502] flex flex-col items-center py-4 text-[10px] text-green-900 select-none">
                {Array.from({length: 20}).map((_, i) => (
                    <div key={i} className="mb-2 opacity-50">{(Math.random() * 0xFF).toString(16).padStart(2, '0').toUpperCase()}</div>
                ))}
            </div>

            {/* Main Editor */}
            <div className="flex-1 relative">
                {loading && (
                    <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center backdrop-blur-sm">
                        <RefreshCw size={32} className="animate-spin text-green-500" />
                    </div>
                )}
                <textarea 
                    value={content}
                    onChange={(e) => { setContent(e.target.value); updateStats(e.target.value); SoundEffects.typing(); }}
                    className="w-full h-full bg-[#020802] text-green-400 p-8 font-mono text-sm focus:outline-none resize-none custom-scrollbar leading-relaxed selection:bg-green-500/30 selection:text-white placeholder-green-900"
                    spellCheck={false}
                    placeholder="// INITIALIZE MEMORY CORE..."
                />
                
                {/* Holographic Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_1px,#000_1px)] bg-[size:100%_2px] opacity-10 mix-blend-overlay" />
            </div>

            {/* Right Info Panel */}
            <div className="w-64 border-l border-green-900/30 bg-[#020502] p-4 flex flex-col gap-6">
                <div className="p-3 border border-green-900/30 rounded bg-green-900/5">
                    <div className="flex items-center gap-2 mb-2 text-green-500 font-bold text-xs uppercase"><Shield size={12} /> Prime Directive</div>
                    <p className="text-[10px] text-green-700/80 leading-relaxed">
                        Content defined here persists across sessions. Use this to enforce coding standards, architectural patterns, and project-specific rules for all Agents.
                    </p>
                </div>

                <div className="p-3 border border-green-900/30 rounded bg-green-900/5 flex-1">
                    <div className="flex items-center gap-2 mb-2 text-green-500 font-bold text-xs uppercase"><FileJson size={12} /> Memory Structure</div>
                    <div className="text-[10px] text-green-600 font-mono space-y-2">
                        <div># HEADER</div>
                        <div className="pl-2 text-green-800">- Directives</div>
                        <div className="pl-2 text-green-800">- Stack Info</div>
                        <div># RULES</div>
                        <div className="pl-2 text-green-800">- Linting</div>
                        <div className="pl-2 text-green-800">- Security</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default TheConstruct;