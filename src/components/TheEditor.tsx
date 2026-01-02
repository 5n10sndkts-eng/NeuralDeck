
import React, { useState, useEffect, useRef } from 'react';
import { Save, ShieldAlert, Code, X, Play, FileText, Lock, Eye, RefreshCw, History } from 'lucide-react';
import { LintIssue } from '../types';
import { CyberButton } from './CyberUI';
import { SoundEffects } from '../services/sound';
import { CheckpointPanel } from './CheckpointPanel';

interface Props {
  openFiles: string[];
  activeFile: string | null;
  fileContents: { [path: string]: string };
  onSave: (path: string, newContent: string) => void;
  onAudit: (path: string) => void;
  onCloseFile: (path: string) => void;
  onSelectFile: (path: string) => void;
  isOpen: boolean;
  aiEdit?: { path: string; content: string } | null;
  onAiEditConsumed?: () => void;
  onLint: (content: string, path?: string) => Promise<LintIssue[]>;
  onComplete: (content: string, cursorIndex: number) => Promise<string>;
  onFormat: (path: string) => void;
  onRunCommand: (command: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onToggleZen?: () => void;
  isZen?: boolean;
}

const TheEditor: React.FC<Props> = ({
  openFiles, activeFile, fileContents, onSave, onAudit, onCloseFile, onSelectFile,
  isOpen, onLint, onFormat, onDirtyChange, isZen
}) => {
  const [localContent, setLocalContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync content
  useEffect(() => {
    if (activeFile && fileContents[activeFile] !== undefined) {
      setLocalContent(fileContents[activeFile]);
      setIsDirty(false);
    }
  }, [activeFile, fileContents]);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    setIsDirty(true);
  };

  const triggerScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    SoundEffects.boot(); // Use boot sound as scan SFX
    setTimeout(() => {
      setIsScanning(false);
      if (activeFile) onAudit(activeFile);
    }, 2000); // Scan duration matches animation
  };

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Basic syntax highlighting for display
  const highlight = (code: string) => {
    return code
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\b(import|export|from|const|let|var|function|return|if|else)\b/g, '<span class="text-cyber-purple font-bold">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-orange-400">$1</span>')
      .replace(/("[^"]*")/g, '<span class="text-green-400">$1</span>')
      .replace(/(\/\/.*)/g, '<span class="text-gray-500 italic">$1</span>');
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden" style={{ backgroundColor: 'var(--color-void)' }}>

      {/* Editor Header - Premium HUD Style */}
      <div className="h-14 flex items-end px-5 gap-1 z-20 relative" style={{
        background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
      }}>
        {/* Glow Line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.5) 50%, transparent 100%)'
        }} />
        {openFiles.map(path => (
          <div
            key={path}
            onClick={() => onSelectFile(path)}
            className="group flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
            style={{
              background: activeFile === path
                ? 'linear-gradient(180deg, rgba(0, 240, 255, 0.1) 0%, rgba(5, 5, 15, 0.95) 100%)'
                : 'transparent',
              borderTop: activeFile === path ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent',
              borderLeft: activeFile === path ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid transparent',
              borderRight: activeFile === path ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid transparent',
              color: activeFile === path ? '#00f0ff' : '#6b7280',
              clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)',
              marginBottom: '-1px'
            }}
          >
            <span style={{ textShadow: activeFile === path ? '0 0 10px rgba(0, 240, 255, 0.5)' : 'none' }}>
              {path.split('/').pop()}
            </span>
            {isDirty && activeFile === path && (
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
                backgroundColor: '#ffd000',
                boxShadow: '0 0 6px rgba(255, 208, 0, 0.6)'
              }} />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onCloseFile(path); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: '#6b7280' }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#ff003c'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#6b7280'}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <div className="flex-1" />

        {/* Toolbar */}
        <div className="flex items-center gap-2 pb-1 pr-2">
          <CyberButton onClick={triggerScan} variant="danger" className="text-[9px] py-1 h-6" icon={<ShieldAlert size={10} />}>
            {isScanning ? 'SCANNING...' : 'SEC_AUDIT'}
          </CyberButton>
          <CyberButton onClick={() => setIsHistoryOpen(true)} variant="secondary" className="text-[9px] py-1 h-6" icon={<History size={10} />}>
            HISTORY
          </CyberButton>
          <CyberButton onClick={() => activeFile && onSave(activeFile, localContent)} variant="primary" className="text-[9px] py-1 h-6" icon={<Save size={10} />}>
            SAVE
          </CyberButton>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 relative flex overflow-hidden">

        {!activeFile ? (
          /* Empty State - Premium Cyberpunk Style */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 relative" style={{
            background: 'radial-gradient(ellipse at center, rgba(0, 240, 255, 0.03) 0%, transparent 70%)'
          }}>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)'
            }} />
            
            <div className="relative z-10 flex flex-col items-center gap-4">
              <FileText size={48} style={{ 
                color: 'rgba(0, 240, 255, 0.3)', 
                filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.2))'
              }} />
              <div className="text-center">
                <h3 className="font-display text-sm uppercase tracking-wider mb-2" style={{ 
                  color: '#00f0ff', 
                  textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' 
                }}>
                  No File Open
                </h3>
                <p className="font-mono text-xs" style={{ color: '#6b7280' }}>
                  Select a file from the explorer to begin editing
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <div className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider" style={{
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '4px',
                  color: '#00f0ff'
                }}>
                  ⌘K - Command Palette
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Line Numbers - Premium Gutter */}
            <div className="w-14 text-right pr-3 pt-4 select-none font-mono text-[10px] z-10" style={{
              background: 'linear-gradient(90deg, rgba(8, 8, 16, 0.8) 0%, rgba(5, 5, 12, 0.6) 100%)',
              borderRight: '1px solid rgba(0, 240, 255, 0.1)',
              color: '#4b5563'
            }}>
              {localContent.split('\n').map((_, i) => (
                <div key={i} className="h-[20px] leading-[20px]" style={{
                  color: i + 1 === Math.floor(localContent.split('\n').length / 2) ? '#00f0ff' : undefined
                }}>{i + 1}</div>
              ))}
            </div>

            <div className="flex-1 relative">
              {/* SCANNER OVERLAY */}
              {isScanning && (
                <div className="absolute inset-0 z-50 pointer-events-none">
                  {/* Laser Line */}
                  <div className="w-full h-[2px] bg-cyber-red shadow-[0_0_20px_rgba(255,0,60,0.8)] animate-[scan_2s_linear_infinite]" />
                  {/* Red tint */}
                  <div className="absolute inset-0 bg-cyber-red/5 mix-blend-overlay" />
                  {/* Grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,60,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,60,0.2)_1px,transparent_1px)] bg-[size:20px_20px]" />
                </div>
              )}

              {/* Syntax Highlight Layer (Back) */}
              <pre
                ref={preRef}
                className="absolute inset-0 p-4 font-mono text-sm leading-[20px] whitespace-pre pointer-events-none overflow-hidden text-gray-300"
                dangerouslySetInnerHTML={{ __html: highlight(localContent) }}
              />

              {/* Input Layer (Front) */}
              <textarea
                ref={textareaRef}
                value={localContent}
                onChange={handleChange}
                onScroll={handleScroll}
                className="absolute inset-0 bg-transparent text-transparent caret-cyber-cyan p-4 font-mono text-sm leading-[20px] resize-none border-none focus:ring-0 outline-none whitespace-pre custom-scrollbar selection:bg-cyber-cyan/30 selection:text-transparent z-10"
                spellCheck={false}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer Status - Premium HUD Bar */}
      <div className="h-7 flex items-center justify-between px-4 text-[9px] font-mono uppercase tracking-widest z-20 relative" style={{
        background: 'linear-gradient(180deg, rgba(5, 5, 15, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)',
        borderTop: '1px solid rgba(0, 240, 255, 0.15)'
      }}>
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.3) 50%, transparent 100%)'
        }} />

        <div className="flex items-center gap-4" style={{ color: '#6b7280' }}>
          <span className="flex items-center gap-1.5">
            <Code size={10} style={{ color: '#00f0ff' }} /> UTF-8
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={10} style={{ color: activeFile ? '#4ade80' : '#6b7280' }} />
            {activeFile ? 'READ/WRITE' : 'NO FILE'}
          </span>
        </div>

        <div className="flex items-center gap-2" style={{
          color: isDirty ? '#ffd000' : '#4ade80',
          textShadow: isDirty ? '0 0 8px rgba(255, 208, 0, 0.5)' : '0 0 8px rgba(74, 222, 128, 0.5)'
        }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{
            backgroundColor: isDirty ? '#ffd000' : '#4ade80',
            boxShadow: isDirty ? '0 0 6px #ffd000' : '0 0 6px #4ade80',
            animation: isDirty ? 'pulse 2s infinite' : 'none'
          }} />
          {isDirty ? 'UNSAVED CHANGES' : 'SYSTEM SYNCED'}
        </div>
      </div>

      {/* Checkpoint / History Panel */}
      {activeFile && (
        <CheckpointPanel
          filePath={activeFile}
          currentContent={localContent}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={(content) => {
            setLocalContent(content);
            setIsDirty(true);
            setIsHistoryOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TheEditor;
