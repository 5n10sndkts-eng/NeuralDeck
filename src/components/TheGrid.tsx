
import React, { useState, useEffect } from 'react';
import { Hexagon, Package, Trash2, Plus, RefreshCw, ShieldCheck, Layers, Play, Terminal, Lock } from 'lucide-react';
import { readFile, callMCPTool } from '../services/api';
import { SoundEffects } from '../services/sound';

const TheGrid: React.FC = () => {
  const [packages, setPackages] = useState<{ name: string, version: string, type: 'dep' | 'dev' }[]>([]);
  const [scripts, setScripts] = useState<{ name: string, cmd: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputPkg, setInputPkg] = useState('');
  const [auditLog, setAuditLog] = useState<string | null>(null);
  const [runningScript, setRunningScript] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const raw = await readFile('package.json');
        if (!raw || raw.includes('Error')) {
            setPackages([]);
            setScripts([]);
        } else {
            const json = JSON.parse(raw);
            const deps = Object.entries(json.dependencies || {}).map(([name, version]) => ({ name, version: version as string, type: 'dep' as const }));
            const devDeps = Object.entries(json.devDependencies || {}).map(([name, version]) => ({ name, version: version as string, type: 'dev' as const }));
            setPackages([...deps, ...devDeps]);
            
            const scriptList = Object.entries(json.scripts || {}).map(([name, cmd]) => ({ name, cmd: cmd as string }));
            setScripts(scriptList);
        }
    } catch (e) {
        setPackages([]);
        setScripts([]);
    } finally {
        setLoading(false);
    }
  };

  const handleInstall = async () => {
      if (!inputPkg) return;
      setLoading(true);
      try {
          await callMCPTool('npm_install', { package: inputPkg });
          SoundEffects.success();
          setInputPkg('');
          fetchData();
      } catch (e) {
          SoundEffects.error();
      } finally {
          setLoading(false);
      }
  };

  const handleUninstall = async (pkg: string) => {
      if (!window.confirm(`Uninstall ${pkg}?`)) return;
      setLoading(true);
      try {
          await callMCPTool('npm_uninstall', { package: pkg });
          SoundEffects.success();
          fetchData();
      } catch (e) {
          SoundEffects.error();
      } finally {
          setLoading(false);
      }
  };

  const handleRunScript = async (scriptName: string) => {
      setRunningScript(scriptName);
      setAuditLog(null);
      SoundEffects.boot();
      try {
          const res = await callMCPTool('shell_exec', { command: `npm run ${scriptName}` });
          const result = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
          setAuditLog(result.stdout || result.stderr || "Script executed.");
          SoundEffects.success();
      } catch (e) {
          SoundEffects.error();
          setAuditLog("Execution Failed.");
      } finally {
          setRunningScript(null);
      }
  };

  const handleAudit = async () => {
      setLoading(true);
      try {
          const res = await callMCPTool('shell_exec', { command: 'npm audit' });
          const result = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
          setAuditLog(result.stdout || result.stderr || "No vulnerabilities found.");
      } catch (e) {
          setAuditLog("Audit Failed.");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative" style={{ backgroundColor: 'var(--color-void)' }}>
        {/* Background Effects - Unified Cyberpunk Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(0, 240, 255, 0.08) 0%, transparent 60%)'
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)'
        }} />

        {/* Premium HUD Header */}
        <div className="h-14 flex items-center justify-between px-5 z-10 relative" style={{
            background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
        }}>
            {/* Bottom glow line */}
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
                <Layers size={18} style={{ color: '#00f0ff' }} />
                <span className="font-bold text-xs tracking-[0.2em] uppercase font-display" style={{ color: '#00f0ff', textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>The Grid</span>
                <span className="text-[10px] font-mono uppercase" style={{ color: '#6b7280' }}>// Node Modules</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="neon-input flex items-center rounded" style={{ padding: '0', background: 'rgba(5, 5, 12, 0.8)' }}>
                    <input
                        value={inputPkg}
                        onChange={e => setInputPkg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleInstall()}
                        placeholder="Install Module..."
                        className="bg-transparent text-xs text-white px-3 py-2 focus:outline-none w-44 font-mono placeholder-gray-600"
                    />
                    <button onClick={handleInstall} disabled={loading} className="px-3 py-2 text-green-400 hover:text-white hover:bg-green-500/10 transition-colors border-l border-white/10"><Plus size={14}/></button>
                </div>
                <button onClick={fetchData} disabled={loading} className="neon-button neon-button-sm neon-button-ghost"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={handleAudit} className="neon-button neon-button-sm neon-button-red"><ShieldCheck size={14} /> Audit</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar z-10 relative">

            {/* Output Console for Scripts/Audit */}
            {auditLog && (
                <div className="neon-panel-cyan mb-8 p-4 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2 border-b border-cyan-500/20 pb-2">
                        <h3 className="text-glow-cyan text-xs font-bold uppercase flex items-center gap-2 font-display"><Terminal size={12}/> Execution Log</h3>
                        <button onClick={() => setAuditLog(null)} className="neon-button neon-button-sm neon-button-ghost">Clear</button>
                    </div>
                    <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar leading-relaxed crt-text">{auditLog}</pre>
                </div>
            )}

            {/* Scripts Section */}
            {scripts.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--color-cyan)', opacity: 0.7 }}>
                        <Terminal size={12} /> Defined Scripts
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {scripts.map(script => (
                            <button
                                key={script.name}
                                onClick={() => handleRunScript(script.name)}
                                disabled={runningScript !== null}
                                className={`
                                    flex items-center justify-between px-3 py-2 rounded transition-all
                                    ${runningScript === script.name
                                        ? 'neon-panel-yellow'
                                        : 'neon-card hover:neon-card-hover'
                                    }
                                `}
                            >
                                <div className="flex flex-col items-start overflow-hidden">
                                    <span className="text-xs font-bold uppercase truncate w-full text-left text-glow-cyan">{script.name}</span>
                                    <span className="text-[8px] font-mono text-gray-500 truncate w-full text-left opacity-50">{script.cmd}</span>
                                </div>
                                {runningScript === script.name ? (
                                    <RefreshCw size={12} className="animate-spin text-yellow-400" />
                                ) : (
                                    <Play size={12} className="opacity-50 text-cyan-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--color-cyan)', opacity: 0.7 }}>
                    <Package size={12} /> Dependencies
                </h3>
                {packages.find(p => p.name === 'helmet') && (
                    <div className="text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded" style={{
                        color: 'var(--color-green)',
                        background: 'rgba(0, 255, 136, 0.1)',
                        border: '1px solid rgba(0, 255, 136, 0.3)'
                    }}>
                        <Lock size={10} /> HARDENED
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {packages.length === 0 && !loading && (
                     <div className="col-span-full flex flex-col items-center justify-center py-10" style={{ color: 'rgba(0, 240, 255, 0.3)' }}>
                         <Package size={48} strokeWidth={1} className="mb-4" />
                         <p className="font-mono text-xs tracking-widest">NO MODULES DETECTED</p>
                     </div>
                )}

                {packages.map((pkg) => (
                    <div key={pkg.name} className="relative group">
                        <div className={`absolute inset-0 ${pkg.type === 'dep' ? 'bg-gradient-to-br from-green-500/10 to-transparent' : 'bg-gradient-to-br from-cyan-500/10 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity rounded-lg blur-md`} />
                        <div className="neon-card group-hover:neon-card-hover p-4 rounded-lg transition-all duration-300 hover:-translate-y-1" style={{
                            borderColor: pkg.type === 'dep' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 240, 255, 0.2)'
                        }}>
                            <div className="flex justify-between items-start mb-3">
                                <Hexagon size={24} strokeWidth={1.5} style={{ color: pkg.type === 'dep' ? 'var(--color-green)' : 'var(--color-cyan)' }} />
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{
                                    border: `1px solid ${pkg.type === 'dep' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 240, 255, 0.3)'}`,
                                    color: pkg.type === 'dep' ? 'var(--color-green)' : 'var(--color-cyan)'
                                }}>
                                    {pkg.type === 'dep' ? 'PROD' : 'DEV'}
                                </span>
                            </div>
                            <div className="font-mono text-sm font-bold text-gray-200 mb-1 truncate text-glow-cyan" title={pkg.name}>{pkg.name}</div>
                            <div className="font-mono text-[10px] text-gray-500 mb-4">{pkg.version}</div>

                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleUninstall(pkg.name)}
                                    className="neon-button neon-button-sm neon-button-red"
                                    title="Uninstall"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default TheGrid;
