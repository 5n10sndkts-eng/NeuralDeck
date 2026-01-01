import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, Terminal, Bug, X, GitBranch, Layout, Database, Activity, FlaskConical, Users, Layers, KanbanSquare, Server, Network, Mic, Shield, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { FileNode } from '../types';
import { useUI } from '../contexts/UIContext';
import { useVoice } from '../hooks/useVoiceInput';
import { VoiceVisualizer } from './VoiceVisualizer';

// Fix: Proper typing for MotionDiv instead of any
const MotionDiv = motion.div as React.ComponentType<HTMLMotionProps<"div">>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  files: FileNode[];
  onFileSelect: (path: string) => void;
  onCommand: (cmd: string) => void;
}

const CommandPalette: React.FC<Props> = ({ isOpen, onClose, files, onFileSelect, onCommand }) => {
  const { playSound, isWarRoomActive, toggleWarRoomMode } = useUI();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice Integration
  const { isListening, transcript, startListening, stopListening, supported } = useVoice();

  // Constants
  const AUTO_EXECUTE_DELAY_MS = 800;

  // Sync Voice -> Query
  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      playSound('typing');

      // Auto-Execute Logic
      const match = commands.find(c => c.name.toLowerCase() === transcript.toLowerCase());
      if (match) {
        setTimeout(() => {
          executeItem(match);
        }, AUTO_EXECUTE_DELAY_MS); // Delay for visual confirmation
      }
    }
  }, [transcript]);

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
    // Story 5-1: War Room Mode Toggle (at top for visibility)
    {
      id: 'toggle:warroom',
      name: isWarRoomActive ? '🔴 Exit War Room Mode' : '⚔️ Enter War Room Mode',
      icon: isWarRoomActive ? <ShieldAlert size={14} className="text-red-500" /> : <Shield size={14} />,
      type: 'command',
      shortcut: 'Ctrl+Shift+W'
    },
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
      playSound('hover'); // Initial sound
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredItems.length);
        playSound('hover');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        playSound('hover');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeItem(filteredItems[activeIndex]);
      } else if (e.key === 'Escape') {
        onClose();
        stopListening();
      } else if (e.code === 'Space' && e.ctrlKey) {
        // Voice Trigger
        isListening ? stopListening() : startListening();
      } else if (e.key === 'W' && e.ctrlKey && e.shiftKey) {
        // Story 5-1: War Room Mode Toggle (Ctrl+Shift+W)
        e.preventDefault();
        toggleWarRoomMode();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredItems, isListening, toggleWarRoomMode]);

  const executeItem = (item: any) => {
    playSound('click');
    if (item.type === 'file') {
      onFileSelect(item.path);
    } else if (item.type === 'command') {
      // Story 5-1: Handle War Room toggle internally
      if (item.id === 'toggle:warroom') {
        toggleWarRoomMode();
      } else {
        onCommand(item.id);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'start', justifyContent: 'center', paddingTop: '15vh',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
    }}>
      <VoiceVisualizer isActive={isListening} />

      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={isWarRoomActive ? 'war-room-pulse' : ''}
        style={{
          width: '100%', maxWidth: '36rem',
          background: isWarRoomActive ? '#0a0000' : '#0a0a0a',
          border: isWarRoomActive ? '1px solid rgba(255, 0, 60, 0.5)' : '1px solid rgba(0, 243, 255, 0.3)',
          boxShadow: isWarRoomActive ? '0 0 30px rgba(255, 0, 60, 0.2)' : '0 0 30px rgba(0, 243, 255, 0.1)',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Header/Input */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)', gap: '0.75rem'
        }}>
          {isListening ? (
            <Mic size={18} className="text-red-500 animate-pulse" />
          ) : (
            <Search size={18} color={isWarRoomActive ? '#ff003c' : 'var(--color-cyan)'} />
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              playSound('typing');
            }}
            placeholder={isListening ? "Listening..." : "Type a command or search files... (Ctrl+Space for Voice)"}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e5e7eb', fontFamily: 'var(--font-mono)', fontSize: '0.875rem'
            }}
          />

          {supported && (
            <button onClick={isListening ? stopListening : startListening} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isListening ? '#ef4444' : '#6b7280' }}>
              <Mic size={16} />
            </button>
          )}

          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="custom-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto', padding: '0.5rem' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
              No matching protocols found.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => executeItem(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  background: idx === activeIndex ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                  color: idx === activeIndex ? 'var(--color-cyan)' : '#9ca3af'
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span style={{ color: idx === activeIndex ? 'var(--color-cyan)' : '#4b5563', display: 'flex' }}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
                {item.type === 'command' && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '10px', textTransform: 'uppercase',
                    letterSpacing: '0.05em', opacity: 0.5, border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0 0.25rem', borderRadius: '0.25rem'
                  }}>CMD</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.5rem 1rem',
          background: isWarRoomActive ? 'rgba(255,0,60,0.1)' : 'rgba(255,255,255,0.05)',
          borderTop: isWarRoomActive ? '1px solid rgba(255,0,60,0.3)' : '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span>Select <b style={{ color: '#d1d5db' }}>↵</b></span>
            <span>Navigate <b style={{ color: '#d1d5db' }}>↑↓</b></span>
            <span>WAR ROOM <b style={{ color: '#d1d5db' }}>CTRL+SHIFT+W</b></span>
          </div>
          {isWarRoomActive ? (
            <span style={{ color: '#ff003c', fontWeight: 'bold' }}>⚠ WAR ROOM ACTIVE</span>
          ) : (
            <span>NEURAL DECK v2.0 - OMNIPRESENCE</span>
          )}
        </div>
      </MotionDiv>
    </div >
  );
};

export default CommandPalette;
