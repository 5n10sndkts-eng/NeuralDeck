
import React, { useState } from 'react';
import { FileNode } from '../types';
import { 
  Folder, FolderOpen, FileCode, FileText, Layout, Code2, Zap, Package, Settings, FileType, BookOpen, Braces, FileCog, Globe, Image, Disc, Database, Terminal,
  Server, Box, GitBranch, Shield, Layers, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface Props {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  isOpen: boolean;
  activeFile: string | null;
  openFiles: string[];
  modifiedFiles?: string[];
  isLoading?: boolean;
}

const getFileIcon = (name: string) => {
  const lower = name.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (lower === 'package.json') return <Package size={14} className="text-orange-400" />;
  if (lower.startsWith('tsconfig')) return <FileCog size={14} className="text-blue-400" />;
  if (lower.startsWith('.env')) return <Settings size={14} className="text-yellow-500" />;
  if (lower === 'readme.md') return <BookOpen size={14} className="text-gray-300" />;
  if (lower === '.gitignore') return <FileCode size={14} className="text-gray-500" />;

  switch (ext) {
    case 'tsx': return <Code2 size={14} className="text-blue-400" />;
    case 'ts': return <FileCode size={14} className="text-blue-500" />;
    case 'jsx': return <Code2 size={14} className="text-yellow-400" />;
    case 'js': return <FileCode size={14} className="text-yellow-400" />;
    case 'css': return <Layout size={14} className="text-cyan-300" />;
    case 'json': return <Braces size={14} className="text-yellow-200" />;
    case 'html': return <Globe size={14} className="text-orange-500" />;
    case 'md': return <FileText size={14} className="text-gray-400" />;
    default: return <FileType size={14} className="text-gray-600" />;
  }
};

const getDirectoryIcon = (name: string, isOpen: boolean) => {
  const lower = name.toLowerCase();
  
  if (lower === 'node_modules') return <Package size={14} className="text-red-900/50" />;
  if (lower === '.git') return <GitBranch size={14} className="text-gray-600" />;
  if (lower === 'src') return <Code2 size={14} className={isOpen ? "text-blue-400" : "text-blue-600"} />;
  if (lower === 'components') return <Layout size={14} className={isOpen ? "text-orange-400" : "text-orange-600"} />;
  if (lower === 'api' || lower === 'services' || lower === 'lib') return <Server size={14} className={isOpen ? "text-green-400" : "text-green-600"} />;
  if (lower === 'types' || lower === 'interfaces') return <Braces size={14} className={isOpen ? "text-yellow-400" : "text-yellow-600"} />;
  if (lower === 'assets' || lower === 'public' || lower === 'images') return <Image size={14} className={isOpen ? "text-pink-400" : "text-pink-600"} />;
  if (lower === 'dist' || lower === 'build') return <Box size={14} className="text-gray-500" />;
  if (lower === 'auth' || lower === 'security') return <Shield size={14} className={isOpen ? "text-red-400" : "text-red-600"} />;
  if (lower === 'utils' || lower === 'helpers') return <Layers size={14} className={isOpen ? "text-purple-400" : "text-purple-600"} />;

  return isOpen ? <FolderOpen size={14} className="text-cyber-purple" /> : <Folder size={14} className="text-gray-600" />;
};

const FileTreeItem: React.FC<{ 
  node: FileNode; 
  onSelect: (p: string) => void;
  activeFile: string | null;
  openFiles: string[];
  modifiedFiles: string[];
  depth?: number;
}> = ({ node, onSelect, activeFile, openFiles, modifiedFiles, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const isActive = node.path === activeFile;
  const isModified = modifiedFiles.includes(node.path);

  const handleClick = () => {
    if (node.type === 'directory') {
      setExpanded(!expanded);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div className="select-none relative">
      <MotionDiv
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        className={`
          relative flex items-center gap-2 py-1 pr-2 cursor-pointer transition-colors group rounded-r
          ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        whileHover={{ x: 4, transition: { duration: 0.2 } }}
      >
        {isActive && (
            <MotionDiv 
                layoutId="activeFileIndicator"
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyber-cyan shadow-[0_0_8px_#00f0ff]" 
            />
        )}

        <span className={`flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-0' : ''}`}>
          {node.type === 'directory' ? (
            getDirectoryIcon(node.name, expanded)
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        
        <span className={`
            text-[11px] font-mono tracking-wide truncate flex-1
            ${isActive ? 'text-cyber-cyan font-medium text-glow' : 'text-gray-400'} 
            ${isModified ? 'text-yellow-500' : ''}
        `}>
          {node.name}
          {isModified && <span className="ml-1 text-yellow-500">*</span>}
        </span>
      </MotionDiv>

      <AnimatePresence>
        {expanded && node.children && (
          <MotionDiv 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="absolute top-0 bottom-0 w-px bg-white/5" style={{ left: `${depth * 12 + 14}px` }} />
            {node.children.map((child) => (
              <FileTreeItem 
                key={child.path} 
                node={child} 
                onSelect={onSelect} 
                activeFile={activeFile}
                openFiles={openFiles}
                modifiedFiles={modifiedFiles}
                depth={depth + 1}
              />
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

const NeuralLink: React.FC<Props> = ({ files, onFileSelect, isOpen, activeFile, openFiles, modifiedFiles = [], isLoading = false }) => {
  return (
    <div className={`flex-1 flex flex-col overflow-hidden`}>
      {isLoading && (
         <MotionDiv 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="h-0.5 w-full bg-cyber-cyan/20 overflow-hidden mb-2"
         >
            <motion.div 
                className="h-full bg-cyber-cyan shadow-[0_0_10px_#00f0ff]"
                animate={{ x: ["-100%", "100%"] }} 
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
            />
         </MotionDiv>
      )}
      
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 relative">
        {files.length === 0 && isLoading ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50 gap-2">
                 <Loader2 size={24} className="animate-spin text-cyber-cyan" />
                 <span className="text-[10px] font-mono text-cyber-cyan animate-pulse">INITIALIZING LINK...</span>
             </div>
        ) : (
            <AnimatePresence mode='wait'>
                {files.map((file) => (
                <FileTreeItem 
                    key={file.path} 
                    node={file} 
                    onSelect={onFileSelect} 
                    activeFile={activeFile} 
                    openFiles={openFiles}
                    modifiedFiles={modifiedFiles}
                />
                ))}
            </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default NeuralLink;
