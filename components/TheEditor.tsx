
import React, { useState, useEffect, useRef } from 'react';
import { Save, ShieldAlert, Code, X, Play, FileText, Lock, Eye, RefreshCw } from 'lucide-react';
import { LintIssue } from '../types';
import { CyberButton } from './CyberUI';
import { SoundEffects } from '../services/sound';

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
    <div className="flex flex-col h-full w-full bg-[#050505] relative overflow-hidden">
      
      {/* Editor Header */}
      <div className="h-9 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-end px-2 gap-1 z-20 relative">
         {openFiles.map(path => (
             <div 
               key={path}
               onClick={() => onSelectFile(path)}
               className={`
                 group flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer border-t border-x border-transparent transition-all
                 ${activeFile === path ? 'bg-[#050505] border-cyber-cyan/30 text-cyber-cyan clip-path-tab' : 'text-gray-600 hover:text-white hover:bg-white/5'}
               `}
               style={{ clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)' }}
             >
               <span>{path.split('/').pop()}</span>
               {isDirty && activeFile === path && <div className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse" />}
               <button onClick={(e) => { e.stopPropagation(); onCloseFile(path); }} className="opacity-0 group-hover:opacity-100 hover:text-red-500"><X size={10} /></button>
             </div>
         ))}
         <div className="flex-1" />
         
         {/* Toolbar */}
         <div className="flex items-center gap-2 pb-1 pr-2">
            <CyberButton onClick={triggerScan} variant="danger" className="text-[9px] py-1 h-6" icon={<ShieldAlert size={10}/>}>
                {isScanning ? 'SCANNING...' : 'SEC_AUDIT'}
            </CyberButton>
            <CyberButton onClick={() => activeFile && onSave(activeFile, localContent)} variant="success" className="text-[9px] py-1 h-6" icon={<Save size={10}/>}>
                SAVE
            </CyberButton>
         </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 relative flex overflow-hidden">
          
          {/* Line Numbers */}
          <div className="w-12 bg-[#080808]/50 backdrop-blur-sm text-right pr-3 pt-4 select-none text-gray-700 font-mono text-[10px] border-r border-white/5 z-10">
              {localContent.split('\n').map((_, i) => (
                  <div key={i} className="h-[20px] leading-[20px]">{i + 1}</div>
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
      </div>

      {/* Footer Status */}
      <div className="h-6 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest z-20 relative">
          <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Code size={10}/> UTF-8</span>
              <span className="flex items-center gap-1"><Lock size={10}/> {activeFile ? 'READ/WRITE' : 'NO FILE'}</span>
          </div>
          <div className={isDirty ? 'text-yellow-500 animate-pulse' : 'text-cyber-green'}>
              {isDirty ? 'UNSAVED CHANGES' : 'SYSTEM SYNCED'}
          </div>
      </div>
    </div>
  );
};

export default TheEditor;
