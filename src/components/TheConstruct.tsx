
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
        try {
            const data = await readFile(CONTEXT_FILE);
            if (!data || data.includes('Error reading file')) {
                throw new Error("File not found");
            }
            setContent(data);
            updateStats(data);
        } catch (e) {
            // Fallback to default template if file missing
            const defaultData = `# NEURAL CONSTRUCT: PRIME DIRECTIVES

## 1. Project Architecture
- Describe the stack here.
- Define folder structure rules.

## 2. Coding Standards
- Define naming conventions.
- Define formatting rules.

## 3. Mission Memory
- Store long-term goals here.
`;
            setContent(defaultData);
            updateStats(defaultData);
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
        <div className="w-full h-full flex flex-col font-mono relative overflow-hidden" style={{ backgroundColor: 'var(--color-void)', color: 'var(--color-green)' }}>
            {/* Background Effects - Unified Cyberpunk Grid with green accent */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 50% 30%, rgba(0, 255, 136, 0.06) 0%, transparent 60%)'
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)'
            }} />

            {/* Premium HUD Header */}
            <div className="h-14 flex items-center justify-between px-5 z-10 relative" style={{
                background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
                borderBottom: '1px solid rgba(0, 255, 136, 0.2)'
            }}>
                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 136, 0.5) 50%, transparent 100%)'
                }} />

                <div className="flex items-center gap-3">
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-green)',
                        boxShadow: '0 0 8px rgba(0, 255, 136, 1), 0 0 16px rgba(0, 255, 136, 0.5)'
                    }} />
                    <Database size={18} className="animate-pulse" style={{ color: 'var(--color-green)' }} />
                    <span className="font-bold text-xs tracking-[0.2em] uppercase font-display" style={{ color: 'var(--color-green)', textShadow: '0 0 10px rgba(0, 255, 136, 0.5)' }}>The Construct</span>
                    <span className="text-[10px] text-gray-500 font-mono uppercase">// Memory Core</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-[10px] flex gap-4 font-bold" style={{ color: 'rgba(0, 255, 136, 0.5)' }}>
                        <span className="flex items-center gap-1"><Binary size={10} /> {stats.chars} BYTES</span>
                        <span className="flex items-center gap-1"><Cpu size={10} /> ~{stats.tokens} TOKENS</span>
                    </div>
                    <button
                        onClick={handleSave}
                        className="neon-button neon-button-green flex items-center gap-2 px-4 py-1.5"
                    >
                        <Save size={14} /> Commit Memory
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden z-10">
                {/* Decorator Sidebar */}
                <div className="w-12 flex flex-col items-center py-4 text-[10px] select-none" style={{
                    borderRight: '1px solid rgba(0, 255, 136, 0.1)',
                    backgroundColor: 'rgba(2, 5, 2, 0.8)',
                    color: 'rgba(0, 255, 136, 0.2)'
                }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="mb-2">{(Math.random() * 0xFF).toString(16).padStart(2, '0').toUpperCase()}</div>
                    ))}
                </div>

                {/* Main Editor */}
                <div className="flex-1 relative">
                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-green)' }} />
                        </div>
                    )}
                    <textarea
                        value={content}
                        onChange={(e) => { setContent(e.target.value); updateStats(e.target.value); SoundEffects.typing(); }}
                        className="w-full h-full p-8 font-mono text-sm focus:outline-none resize-none custom-scrollbar leading-relaxed crt-text"
                        style={{
                            backgroundColor: 'rgba(2, 8, 2, 0.6)',
                            color: 'var(--color-green)',
                            caretColor: 'var(--color-green)'
                        }}
                        spellCheck={false}
                        placeholder="// INITIALIZE MEMORY CORE..."
                    />

                    {/* Holographic Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-20" />
                </div>

                {/* Right Info Panel */}
                <div className="w-64 p-4 flex flex-col gap-6" style={{
                    borderLeft: '1px solid rgba(0, 255, 136, 0.1)',
                    backgroundColor: 'rgba(2, 5, 2, 0.8)'
                }}>
                    <div className="neon-card p-3 rounded" style={{ borderColor: 'rgba(0, 255, 136, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase" style={{ color: 'var(--color-green)' }}><Shield size={12} /> Prime Directive</div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(0, 255, 136, 0.6)' }}>
                            Content defined here persists across sessions. Use this to enforce coding standards, architectural patterns, and project-specific rules for all Agents.
                        </p>
                    </div>

                    <div className="neon-card p-3 rounded flex-1" style={{ borderColor: 'rgba(0, 255, 136, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase" style={{ color: 'var(--color-green)' }}><FileJson size={12} /> Memory Structure</div>
                        <div className="text-[10px] font-mono space-y-2" style={{ color: 'rgba(0, 255, 136, 0.7)' }}>
                            <div># HEADER</div>
                            <div className="pl-2" style={{ color: 'rgba(0, 255, 136, 0.4)' }}>- Directives</div>
                            <div className="pl-2" style={{ color: 'rgba(0, 255, 136, 0.4)' }}>- Stack Info</div>
                            <div># RULES</div>
                            <div className="pl-2" style={{ color: 'rgba(0, 255, 136, 0.4)' }}>- Linting</div>
                            <div className="pl-2" style={{ color: 'rgba(0, 255, 136, 0.4)' }}>- Security</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheConstruct;