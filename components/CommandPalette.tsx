
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, Terminal, Bug, X, GitBranch, Layout, Database, Activity, FlaskConical, Users, Layers, KanbanSquare, Server, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileNode } from '../types';

const MotionDiv = motion.div as any;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  files: FileNode[];
  onFileSelect: (path: string) => void;
  onCommand: (cmd: string) => void;
}

const CommandPalette: React.FC<Props> = ({ isOpen, onClose, files, onFileSelect, onCommand }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten file tree for search
  const flattenFiles = (nodes: FileNode[]): { name: string; path: string }[] => {
    let flat: { name: string; path: string }[] = [];
    nodes.forEach(node => {
      if (node.type === 'file') {
        flat.push({ name: node.name, path: node.path });
      } else if (node.children) {
        flat = [...flat, ...flattenFiles(node.children)];
      }
    });
    return flat;
  };

  const allFiles = React.useMemo(() => flattenFiles(files), [files]);

  const commands = [
    { id: 'view:workspace', name: 'Go to Workspace', icon: <Layout size={14} />, type: 'command' },
    { id: 'view:orchestrator', name: 'Go to Neural Orchestrator', icon: <Activity size={14} />, type: 'command' },
    { id: 'view:board', name: 'Go to Kanban Board', icon: <KanbanSquare size={14} />, type: 'command' },
    { id: 'view:laboratory', name: 'Go to Laboratory', icon: <FlaskConical size={14} />, type: 'command' },
    { id: 'view:synapse', name: 'Go to Synapse Graph', icon: <Network size={14} />, type: 'command' },
    { id: 'view:construct', name: 'Go to The Construct', icon: <Database size={14} />, type: 'command' },
    { id: 'view:grid', name: 'Go to Package Grid', icon: <Layers size={14} />, type: 'command' },
    { id: 'view:roundtable', name: 'Go to Roundtable', icon: <Users size={14} />, type: 'command' },
    { id: 'view:connections', name: 'Go to Connections', icon: <Server size={14} />, type: 'command' },
    { id: 'view:git', name: 'Go to Git Logs', icon: <GitBranch size={14} />, type: 'command' },
    { id: 'audit', name: 'Audit Current File', icon: <Bug size={14} />, type: 'command' },
    { id: 'clear', name: 'Clear Terminal', icon: <Terminal size={14} />, type: 'command' },
    { id: 'toggle:sidebar', name: 'Toggle Sidebar', icon: <Terminal size={14} />, type: 'command' },
  ];

  const filteredItems = [
    ...commands.filter(c => c.name.toLowerCase().includes(query.toLowerCase())),
    ...allFiles.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).map(f => ({ ...f, id: f.path, icon: <FileCode size={14} />, type: 'file' }))
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeItem(filteredItems[activeIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredItems]);

  const executeItem = (item: any) => {
    if (!item) return;
    if (item.type === 'file') {
      onFileSelect(item.path);
    } else {
      onCommand(item.id);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm">
      <MotionDiv 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-[#0a0a0a] border border-cyber-cyan/30 shadow-[0_0_30px_rgba(0,243,255,0.1)] rounded-lg overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
          <Search size={18} className="text-cyber-cyan" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search files..."
            className="flex-1 bg-transparent border-none focus:outline-none text-gray-200 font-mono text-sm"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm font-mono">No matching protocols found.</div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => executeItem(item)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-colors font-mono text-sm
                  ${idx === activeIndex ? 'bg-cyber-cyan/10 text-cyber-cyan' : 'text-gray-400 hover:bg-white/5'}
                `}
              >
                <span className={idx === activeIndex ? 'text-cyber-cyan' : 'text-gray-600'}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
                {item.type === 'command' && (
                   <span className="ml-auto text-[10px] uppercase tracking-wider opacity-50 border border-white/10 px-1 rounded">CMD</span>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          <div className="flex gap-3">
            <span>Select <b className="text-gray-300">↵</b></span>
            <span>Navigate <b className="text-gray-300">↑↓</b></span>
          </div>
          <span>NeuralDeck v2.0</span>
        </div>
      </MotionDiv>
    </div>
  );
};

export default CommandPalette;
