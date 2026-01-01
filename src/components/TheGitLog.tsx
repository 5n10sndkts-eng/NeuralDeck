
import React, { useEffect, useState } from 'react';
import { GitCommit, GitBranch, Hash, RefreshCw, ChevronDown, AlertCircle, Clock, User, FileText, X, GitGraph, ArrowRight } from 'lucide-react';
import { callMCPTool } from '../services/api';

const TheGitLog: React.FC = () => {
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commitDetails, setCommitDetails] = useState<string>('');
  const BATCH_SIZE = 10;

  const fetchLogs = async (reset = false) => {
    setLoading(true);
    setError(null);
    const currentOffset = reset ? 0 : offset;
    
    try {
      const result = await callMCPTool('git_log', { count: BATCH_SIZE, skip: currentOffset });
      let parsedCommits = [];
      
      if (result.result) {
         try {
             parsedCommits = JSON.parse(result.result);
         } catch (e) {
             setError("Failed to parse data stream.");
         }
      }

      if (Array.isArray(parsedCommits)) {
        setCommits(prev => reset ? parsedCommits : [...prev, ...parsedCommits]);
        setOffset(currentOffset + BATCH_SIZE);
        if (reset && parsedCommits.length === 0) setError("Repository Empty.");
      } else {
        setError("Invalid response format.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommitDetails = async (hash: string) => {
      setDetailLoading(true);
      try {
          const result = await callMCPTool('git_show', { hash });
          const output = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
          setCommitDetails(output.exitCode === 0 ? output.stdout : "Error retrieving segment details.");
      } catch {
          setCommitDetails("Connection interrupted.");
      } finally {
          setDetailLoading(false);
      }
  };

  useEffect(() => { fetchLogs(true); }, []);

  useEffect(() => {
      if (selectedCommit) fetchCommitDetails(selectedCommit.hash);
      else setCommitDetails('');
  }, [selectedCommit]);

  return (
    <div className="w-full h-full text-gray-300 flex font-mono overflow-hidden relative" style={{ backgroundColor: 'var(--color-void)' }}>
        {/* Background Effects - Unified Cyberpunk Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(255, 100, 50, 0.06) 0%, transparent 60%)'
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.02) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
        }} />

        {/* Left Panel: Commit Stream */}
        <div className={`${selectedCommit ? 'w-1/3 hidden md:flex' : 'w-full'} flex flex-col transition-all z-10`} style={{
            borderRight: '1px solid rgba(0, 240, 255, 0.1)'
        }}>
            {/* Premium HUD Header */}
            <div className="h-14 flex items-center justify-between px-4 relative" style={{
                background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
                borderBottom: '1px solid rgba(255, 100, 50, 0.2)'
            }}>
                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 100, 50, 0.5) 50%, transparent 100%)'
                }} />
                <div className="flex items-center gap-3">
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ff6432',
                        boxShadow: '0 0 8px #ff6432, 0 0 16px rgba(255, 100, 50, 0.5)'
                    }} />
                    <GitBranch size={18} style={{ color: '#ff6432' }} />
                    <span className="font-bold text-xs tracking-[0.2em] uppercase font-display" style={{ color: '#ff6432', textShadow: '0 0 10px rgba(255, 100, 50, 0.5)' }}>The Git Log</span>
                    <span className="text-[10px] text-gray-500 font-mono uppercase">// Chrono Log</span>
                </div>
                <button onClick={() => fetchLogs(true)} className="neon-button neon-button-sm neon-button-ghost">
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0 bg-scanlines custom-scrollbar">
                {error && (
                    <div className="p-4 text-red-400 text-[10px] flex items-center gap-2 bg-red-900/10 border-b border-red-500/20">
                        <AlertCircle size={12} /> {error}
                    </div>
                )}

                {commits.map((commit, idx) => (
                    <div
                        key={idx}
                        onClick={() => setSelectedCommit(commit)}
                        className="p-3 cursor-pointer transition-all group relative"
                        style={{
                            borderBottom: '1px solid rgba(0, 240, 255, 0.05)',
                            background: selectedCommit?.hash === commit.hash ? 'rgba(255, 100, 50, 0.05)' : 'transparent'
                        }}
                    >
                        {selectedCommit?.hash === commit.hash && <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: '#ff6432', boxShadow: '0 0 10px rgba(255, 100, 50, 0.5)' }} />}
                        <div className="flex items-center justify-between mb-1">
                             <span className="text-[10px] font-mono font-bold" style={{ color: '#ff6432' }}>#{commit.hash}</span>
                             <span className="text-[9px] uppercase" style={{ color: 'rgba(0, 240, 255, 0.4)' }}>{commit.date.split(' ').slice(0,3).join(' ')}</span>
                        </div>
                        <div className="text-xs text-gray-300 truncate group-hover:text-white transition-colors mb-1">{commit.message}</div>
                        <div className="flex items-center gap-1 text-[9px] uppercase" style={{ color: 'rgba(0, 240, 255, 0.4)' }}>
                             <User size={8} /> {commit.author}
                        </div>
                    </div>
                ))}

                {commits.length > 0 && (
                    <button onClick={() => fetchLogs(false)} disabled={loading} className="w-full py-3 text-[10px] uppercase tracking-widest transition-colors" style={{
                        color: 'rgba(0, 240, 255, 0.5)',
                        background: 'rgba(0, 240, 255, 0.02)'
                    }}>
                        {loading ? 'Syncing...' : 'Load More Segments'}
                    </button>
                )}
            </div>
        </div>

        {/* Right Panel: Diff View */}
        {selectedCommit && (
             <div className="flex-1 flex flex-col animate-fade-in-up w-full md:w-auto absolute md:relative inset-0 z-20 md:z-0" style={{
                 backgroundColor: 'rgba(8, 8, 12, 0.95)',
                 borderLeft: '1px solid rgba(0, 240, 255, 0.1)'
             }}>
                 <div className="h-14 flex items-center justify-between px-4 relative" style={{
                     background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
                     borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
                 }}>
                     <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
                         background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.3) 50%, transparent 100%)'
                     }} />
                     <div className="flex items-center gap-2">
                         <Hash size={14} style={{ color: '#ff6432' }} />
                         <span className="font-mono text-[10px] tracking-wider" style={{ color: 'rgba(0, 240, 255, 0.6)' }}>{selectedCommit.hash}</span>
                     </div>
                     <button onClick={() => setSelectedCommit(null)} className="md:hidden neon-button neon-button-sm neon-button-ghost"><X size={14} /></button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                      <div className="mb-6 pb-6" style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}>
                          <h2 className="text-lg font-bold text-glow-cyan mb-2">{selectedCommit.message}</h2>
                          <div className="flex flex-wrap gap-4 text-xs font-mono" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>
                               <span className="flex items-center gap-2"><User size={12}/> {selectedCommit.author}</span>
                               <span className="flex items-center gap-2"><Clock size={12}/> {selectedCommit.date}</span>
                          </div>
                      </div>

                      <div>
                          <h3 className="text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2" style={{ color: 'var(--color-cyan)', opacity: 0.7 }}>
                              <FileText size={12} /> Diff Manifest
                          </h3>
                          {detailLoading ? (
                              <div className="flex items-center gap-2 text-xs animate-pulse font-mono" style={{ color: 'var(--color-cyan)' }}>
                                  <RefreshCw size={12} className="animate-spin" /> DECRYPTING...
                              </div>
                          ) : (
                              <div className="neon-card relative p-4 rounded">
                                  <div className="absolute top-0 right-0 p-1 opacity-10" style={{ color: 'var(--color-cyan)' }}><GitGraph size={100} /></div>
                                  <pre className="relative text-[10px] font-mono whitespace-pre-wrap leading-relaxed custom-scrollbar crt-text" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>
                                      {commitDetails}
                                  </pre>
                              </div>
                          )}
                      </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default TheGitLog;
