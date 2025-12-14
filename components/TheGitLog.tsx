
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
    <div className="w-full h-full bg-[#020204] text-gray-300 flex font-mono overflow-hidden relative">
        {/* Left Panel: Commit Stream */}
        <div className={`${selectedCommit ? 'w-1/3 hidden md:flex' : 'w-full'} flex flex-col border-r border-white/10 transition-all z-10`}>
            <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#050505]">
                <div className="flex items-center gap-2 text-orange-500">
                    <GitBranch size={14} />
                    <span className="font-bold text-[10px] tracking-[0.2em] text-glow-red">CHRONO_LOG</span>
                </div>
                <button onClick={() => fetchLogs(true)} className="text-gray-500 hover:text-white transition-colors">
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
                        className={`p-3 border-b border-white/5 cursor-pointer transition-all group hover:bg-white/5 relative
                        ${selectedCommit?.hash === commit.hash ? 'bg-orange-500/5' : ''}
                        `}
                    >
                        {selectedCommit?.hash === commit.hash && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500 shadow-[0_0_10px_orange]" />}
                        <div className="flex items-center justify-between mb-1">
                             <span className="text-[10px] font-mono text-orange-400/80 font-bold">#{commit.hash}</span>
                             <span className="text-[9px] text-gray-600 uppercase">{commit.date.split(' ').slice(0,3).join(' ')}</span>
                        </div>
                        <div className="text-xs text-gray-300 truncate group-hover:text-white transition-colors mb-1">{commit.message}</div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-600 uppercase">
                             <User size={8} /> {commit.author}
                        </div>
                    </div>
                ))}
                
                {commits.length > 0 && (
                    <button onClick={() => fetchLogs(false)} disabled={loading} className="w-full py-3 text-[10px] text-gray-500 hover:text-white uppercase tracking-widest hover:bg-white/5 transition-colors">
                        {loading ? 'Syncing...' : 'Load More Segments'}
                    </button>
                )}
            </div>
        </div>

        {/* Right Panel: Diff View */}
        {selectedCommit && (
             <div className="flex-1 flex flex-col bg-[#08080b] animate-in slide-in-right duration-300 w-full md:w-auto absolute md:relative inset-0 z-20 md:z-0 border-l border-white/10">
                 <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#050505]">
                     <div className="flex items-center gap-2">
                         <Hash size={14} className="text-orange-400" />
                         <span className="font-mono text-[10px] tracking-wider text-gray-400">{selectedCommit.hash}</span>
                     </div>
                     <button onClick={() => setSelectedCommit(null)} className="md:hidden text-gray-500 hover:text-white"><X size={14} /></button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                      <div className="mb-6 pb-6 border-b border-white/5">
                          <h2 className="text-lg font-bold text-white mb-2">{selectedCommit.message}</h2>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-mono">
                               <span className="flex items-center gap-2"><User size={12}/> {selectedCommit.author}</span>
                               <span className="flex items-center gap-2"><Clock size={12}/> {selectedCommit.date}</span>
                          </div>
                      </div>

                      <div>
                          <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4 flex items-center gap-2">
                              <FileText size={12} /> Diff Manifest
                          </h3>
                          {detailLoading ? (
                              <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse font-mono">
                                  <RefreshCw size={12} className="animate-spin" /> DECRYPTING...
                              </div>
                          ) : (
                              <div className="relative border border-white/10 bg-black rounded p-4">
                                  <div className="absolute top-0 right-0 p-1 opacity-20"><GitGraph size={100} /></div>
                                  <pre className="relative text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-relaxed custom-scrollbar">
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
