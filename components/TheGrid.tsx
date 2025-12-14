
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
    <div className="w-full h-full bg-[#020204] flex flex-col overflow-hidden relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(0,243,255,0.05),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#050505] z-10">
            <div className="flex items-center gap-2 text-cyber-cyan text-glow">
                <Layers size={18} />
                <span className="font-bold text-sm tracking-[0.2em] uppercase">The Grid: Node Modules</span>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-black border border-white/10 rounded p-1">
                    <input 
                        value={inputPkg} 
                        onChange={e => setInputPkg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleInstall()}
                        placeholder="Install Module..." 
                        className="bg-transparent text-xs text-white px-2 py-1 focus:outline-none w-40 font-mono"
                    />
                    <button onClick={handleInstall} disabled={loading} className="px-2 text-green-400 hover:text-white transition-colors"><Plus size={14}/></button>
                </div>
                <button onClick={fetchData} disabled={loading} className="p-2 rounded border border-white/10 hover:bg-white/5 text-gray-500 hover:text-white"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={handleAudit} className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 text-red-400 border border-red-500/30 rounded text-xs uppercase font-bold hover:bg-red-900/40 transition-colors"><ShieldCheck size={14} /> Audit</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar z-10 relative">
            
            {/* Output Console for Scripts/Audit */}
            {auditLog && (
                <div className="mb-8 bg-[#0a0a0a] border border-white/20 rounded p-4 animate-in fade-in-up shadow-lg">
                    <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
                        <h3 className="text-cyber-cyan text-xs font-bold uppercase flex items-center gap-2"><Terminal size={12}/> Execution Log</h3>
                        <button onClick={() => setAuditLog(null)} className="text-gray-500 hover:text-white text-[10px] uppercase">Clear Log</button>
                    </div>
                    <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">{auditLog}</pre>
                </div>
            )}

            {/* Scripts Section */}
            {scripts.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Terminal size={12} /> Defined Scripts
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {scripts.map(script => (
                            <button 
                                key={script.name}
                                onClick={() => handleRunScript(script.name)}
                                disabled={runningScript !== null}
                                className={`
                                    flex items-center justify-between px-3 py-2 rounded border transition-all
                                    ${runningScript === script.name 
                                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-cyber-cyan/50 hover:text-white'
                                    }
                                `}
                            >
                                <div className="flex flex-col items-start overflow-hidden">
                                    <span className="text-xs font-bold uppercase truncate w-full text-left">{script.name}</span>
                                    <span className="text-[8px] font-mono text-gray-500 truncate w-full text-left opacity-50">{script.cmd}</span>
                                </div>
                                {runningScript === script.name ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                    <Play size={12} className="opacity-50" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Package size={12} /> Dependencies
                </h3>
                {packages.find(p => p.name === 'helmet') && (
                    <div className="text-[10px] text-green-500 font-mono flex items-center gap-1 bg-green-900/10 px-2 py-0.5 rounded border border-green-900/30">
                        <Lock size={10} /> HARDENED
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {packages.length === 0 && !loading && (
                     <div className="col-span-full flex flex-col items-center justify-center text-gray-700 py-10">
                         <Package size={48} strokeWidth={1} className="mb-4 opacity-50" />
                         <p className="font-mono text-xs tracking-widest">NO MODULES DETECTED</p>
                     </div>
                )}

                {packages.map((pkg) => (
                    <div key={pkg.name} className="relative group">
                        <div className={`absolute inset-0 bg-gradient-to-br ${pkg.type === 'dep' ? 'from-green-500/10 to-transparent' : 'from-blue-500/10 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity rounded-lg blur-md`} />
                        <div className={`relative bg-black/80 border ${pkg.type === 'dep' ? 'border-green-900/50 group-hover:border-green-500/50' : 'border-blue-900/50 group-hover:border-blue-500/50'} p-4 rounded-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1`}>
                            <div className="flex justify-between items-start mb-3">
                                <Hexagon size={24} strokeWidth={1.5} className={pkg.type === 'dep' ? 'text-green-400' : 'text-blue-400'} />
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${pkg.type === 'dep' ? 'border-green-900/50 text-green-600' : 'border-blue-900/50 text-blue-600'}`}>
                                    {pkg.type === 'dep' ? 'PROD' : 'DEV'}
                                </span>
                            </div>
                            <div className="font-mono text-sm font-bold text-gray-200 mb-1 truncate" title={pkg.name}>{pkg.name}</div>
                            <div className="font-mono text-[10px] text-gray-500 mb-4">{pkg.version}</div>
                            
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleUninstall(pkg.name)}
                                    className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20 transition-colors"
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
