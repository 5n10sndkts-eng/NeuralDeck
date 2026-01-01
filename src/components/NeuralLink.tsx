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

  const iconStyle = { width: 14, height: 14 };

  if (lower === 'package.json') return <Package style={{ ...iconStyle, color: '#fb923c' }} />;
  if (lower.startsWith('tsconfig')) return <FileCog style={{ ...iconStyle, color: '#60a5fa' }} />;
  if (lower.startsWith('.env')) return <Settings style={{ ...iconStyle, color: '#eab308' }} />;
  if (lower === 'readme.md') return <BookOpen style={{ ...iconStyle, color: '#d1d5db' }} />;
  if (lower === '.gitignore') return <FileCode style={{ ...iconStyle, color: '#6b7280' }} />;

  switch (ext) {
    case 'tsx': return <Code2 style={{ ...iconStyle, color: '#60a5fa' }} />;
    case 'ts': return <FileCode style={{ ...iconStyle, color: '#3b82f6' }} />;
    case 'jsx': return <Code2 style={{ ...iconStyle, color: '#facc15' }} />;
    case 'js': return <FileCode style={{ ...iconStyle, color: '#facc15' }} />;
    case 'css': return <Layout style={{ ...iconStyle, color: '#67e8f9' }} />;
    case 'json': return <Braces style={{ ...iconStyle, color: '#fef08a' }} />;
    case 'html': return <Globe style={{ ...iconStyle, color: '#f97316' }} />;
    case 'md': return <FileText style={{ ...iconStyle, color: '#9ca3af' }} />;
    default: return <FileType style={{ ...iconStyle, color: '#4b5563' }} />;
  }
};

const getDirectoryIcon = (name: string, isOpen: boolean) => {
  const lower = name.toLowerCase();
  const color = isOpen ? '#facc15' : '#ca8a04'; // Default folder color logic
  const iconStyle = { width: 14, height: 14 };

  if (lower === 'node_modules') return <Package style={{ ...iconStyle, color: '#7f1d1d' }} />;
  if (lower === '.git') return <GitBranch style={{ ...iconStyle, color: '#4b5563' }} />;
  if (lower === 'src') return <Code2 style={{ ...iconStyle, color: isOpen ? '#60a5fa' : '#2563eb' }} />;
  if (lower === 'components') return <Layout style={{ ...iconStyle, color: isOpen ? '#fb923c' : '#ea580c' }} />;

  return isOpen ? <FolderOpen style={{ ...iconStyle, color: 'var(--color-purple)' }} /> : <Folder style={{ ...iconStyle, color: '#4b5563' }} />;
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
    <div style={{ userSelect: 'none', position: 'relative' }}>
      <MotionDiv
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        style={{
          paddingLeft: `${depth * 12 + 8}px`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          paddingTop: '0.25rem',
          paddingBottom: '0.25rem',
          paddingRight: '0.5rem',
          cursor: 'pointer',
          borderRadius: '0 4px 4px 0',
          background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        }}
        whileHover={{ x: 4, transition: { duration: 0.2 }, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        {isActive && (
          <MotionDiv
            layoutId="activeFileIndicator"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'var(--color-cyan)',
              boxShadow: '0 0 8px #00f0ff'
            }}
          />
        )}

        <span style={{
          flexShrink: 0,
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(0deg)' : 'rotate(0deg)' // Was unused rotation
        }}>
          {node.type === 'directory' ? (
            getDirectoryIcon(node.name, expanded)
          ) : (
            getFileIcon(node.name)
          )}
        </span>

        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.025em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          color: isActive ? 'var(--color-cyan)' : '#9ca3af',
          fontWeight: isActive ? 500 : 400,
          textShadow: isActive ? 'var(--shadow-neon-cyan)' : 'none'
        }}>
          {node.name}
          {isModified && <span style={{ marginLeft: '0.25rem', color: '#eab308' }}>*</span>}
        </span>
      </MotionDiv>

      <AnimatePresence>
        {expanded && node.children && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${depth * 12 + 14}px`,
              width: '1px',
              background: 'rgba(255, 255, 255, 0.05)'
            }} />
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isLoading && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ height: '2px', width: '100%', background: 'rgba(0, 240, 255, 0.2)', overflow: 'hidden', marginBottom: '0.5rem' }}
        >
          <motion.div
            style={{ height: '100%', background: 'var(--color-cyan)', boxShadow: '0 0 10px #00f0ff' }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </MotionDiv>
      )}

      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', position: 'relative' }}>
        {files.length === 0 && isLoading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, gap: '0.5rem' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-cyan)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)', animation: 'pulse 2s infinite' }}>INITIALIZING LINK...</span>
          </div>
        ) : (
          <AnimatePresence>
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
