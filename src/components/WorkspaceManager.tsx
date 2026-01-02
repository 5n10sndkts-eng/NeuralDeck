import React, { useState } from 'react';
import { FolderOpen, FolderPlus, Trash2, Clock, GitBranch, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { FolderBrowser } from './FolderBrowser';

const MotionDiv = motion.div as any;

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace, recentWorkspaces, openWorkspace, addWorkspace, removeWorkspace } = useWorkspace();
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = async (path: string) => {
    try {
      setError(null);
      await addWorkspace(path);
      setShowFolderBrowser(false);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenWorkspace = async (id: string) => {
    try {
      setError(null);
      await openWorkspace(id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setError(null);
      await removeWorkspace(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
            onClick={onClose}
          >
            <MotionDiv
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[80vh] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(10, 10, 22, 0.95) 0%, rgba(5, 5, 14, 0.98) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 0 40px rgba(0, 240, 255, 0.2), 0 20px 60px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(0, 240, 255, 0.2)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(180, 0, 255, 0.2) 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <FolderOpen style={{ width: 18, height: 18, color: 'var(--color-cyan)' }} />
                    </div>
                    <div>
                      <h2 style={{
                        color: '#00f0ff',
                        fontSize: '18px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}>
                        WORKSPACE MANAGER
                      </h2>
                      <p style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>
                        Manage your project workspaces
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <X style={{ width: 16, height: 16, color: '#999' }} />
                  </button>
                </div>

                {/* Current workspace indicator */}
                {currentWorkspace && (
                  <div className="px-4 py-3 rounded-lg" style={{
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#00ff88',
                        boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                      }} />
                      <span style={{ color: '#00ff88', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em' }}>
                        ACTIVE WORKSPACE
                      </span>
                    </div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                      {currentWorkspace.name}
                    </div>
                    <div style={{ color: '#666', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>
                      {currentWorkspace.path}
                    </div>
                  </div>
                )}
              </div>

              {/* Error display */}
              {error && (
                <div className="px-6 py-3 border-b" style={{
                  background: 'rgba(255, 68, 102, 0.1)',
                  borderColor: 'rgba(255, 68, 102, 0.3)',
                }}>
                  <div style={{ color: '#ff4466', fontSize: '13px' }}>
                    {error}
                  </div>
                </div>
              )}

              {/* Workspaces list */}
              <div className="px-6 py-4 overflow-y-auto max-h-96">
                <div className="flex items-center justify-between mb-3">
                  <span style={{
                    color: '#999',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                  }}>
                    RECENT WORKSPACES
                  </span>
                  <button
                    onClick={() => setShowFolderBrowser(true)}
                    className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(180, 0, 255, 0.2) 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      color: '#00f0ff',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <FolderPlus style={{ width: 14, height: 14 }} />
                    Add Workspace
                  </button>
                </div>

                {recentWorkspaces.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen style={{
                      width: 48,
                      height: 48,
                      color: '#333',
                      margin: '0 auto 16px',
                    }} />
                    <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                      No workspaces yet
                    </div>
                    <div style={{ color: '#444', fontSize: '12px' }}>
                      Add a workspace to get started
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentWorkspaces.map((workspace, index) => (
                      <MotionDiv
                        key={workspace.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleOpenWorkspace(workspace.id)}
                        className="px-4 py-3 rounded-lg cursor-pointer transition-all group"
                        style={{
                          background: workspace.id === currentWorkspace?.id
                            ? 'rgba(0, 240, 255, 0.08)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: workspace.id === currentWorkspace?.id
                            ? '1px solid rgba(0, 240, 255, 0.3)'
                            : '1px solid transparent',
                        }}
                        whileHover={{
                          background: 'rgba(0, 240, 255, 0.1)',
                          borderColor: 'rgba(0, 240, 255, 0.3)',
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span style={{
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                              }}>
                                {workspace.name}
                              </span>
                              {workspace.isGitRepo && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded" style={{
                                  background: 'rgba(0, 255, 136, 0.1)',
                                  border: '1px solid rgba(0, 255, 136, 0.2)',
                                }}>
                                  <GitBranch style={{ width: 10, height: 10, color: '#00ff88' }} />
                                  <span style={{ color: '#00ff88', fontSize: '9px', fontWeight: 600 }}>GIT</span>
                                </div>
                              )}
                            </div>
                            <div style={{
                              color: '#666',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {workspace.path}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5" style={{ color: '#555', fontSize: '10px' }}>
                              <Clock style={{ width: 10, height: 10 }} />
                              {formatTimestamp(workspace.lastOpened)}
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleRemoveWorkspace(workspace.id, e)}
                            className="p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              background: 'rgba(255, 68, 102, 0.1)',
                              border: '1px solid rgba(255, 68, 102, 0.2)',
                            }}
                          >
                            <Trash2 style={{ width: 14, height: 14, color: '#ff4466' }} />
                          </button>
                        </div>
                      </MotionDiv>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(0, 240, 255, 0.1)' }}>
                <div style={{ color: '#555', fontSize: '11px' }}>
                  💡 <span style={{ color: '#666' }}>Tip: NeuralDeck keeps your workspace separate from its source code for security</span>
                </div>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Folder Browser */}
      <AnimatePresence>
        {showFolderBrowser && (
          <FolderBrowser
            onSelect={handleSelectFolder}
            onCancel={() => setShowFolderBrowser(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
