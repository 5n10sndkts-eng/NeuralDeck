import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Trash2, Download, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { useConversation } from '../contexts/ConversationContext';
import { Session } from '../hooks/useConversationStorage';
import { storageManager } from '../services/storageManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ConversationHistory: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    sessions,
    currentSessionId,
    switchSession,
    deleteSession,
    exportSession,
    storageType,
    cleanupOldSessions,
    getStorageUsage
  } = useConversation();

  const [searchQuery, setSearchQuery] = useState('');
  const [storageStats, setStorageStats] = useState<{ used: number; quota: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Load storage stats when panel opens
  React.useEffect(() => {
    if (isOpen) {
      getStorageUsage().then(setStorageStats);
    }
  }, [isOpen, getStorageUsage]);

  // Filter sessions based on search
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(s =>
      s.title.toLowerCase().includes(query) ||
      new Date(s.createdAt).toLocaleString().toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      alert('Cannot delete the last session');
      return;
    }
    
    if (confirm('Delete this session? This cannot be undone.')) {
      setIsDeleting(sessionId);
      await deleteSession(sessionId);
      setIsDeleting(null);
    }
  };

  const handleExport = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await exportSession(sessionId);
  };

  const handleCleanup = async () => {
    const retentionDays = storageManager.getRetentionPeriod();
    if (confirm(`Delete all sessions older than ${retentionDays} days?`)) {
      const count = await cleanupOldSessions(retentionDays);
      alert(`Cleaned up ${count} old sessions`);
      getStorageUsage().then(setStorageStats);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const storagePercentage = storageStats
    ? (storageStats.used / storageStats.quota) * 100
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a14] border-l border-cyan-500/30 shadow-2xl z-50 flex flex-col"
            style={{
              boxShadow: '-4px 0 20px rgba(0, 240, 255, 0.15)'
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-cyan-500/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-cyan-400 text-sm font-bold tracking-wider uppercase">
                  Session History
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions..."
                  className="w-full bg-black/40 border border-cyan-500/20 rounded px-9 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>

              {/* Storage Info */}
              <div className="mt-3 p-2 bg-black/40 rounded border border-cyan-500/10">
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span>Storage: {storageType.toUpperCase()}</span>
                  <span>{storagePercentage.toFixed(1)}% used</span>
                </div>
                <div className="w-full h-1 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {filteredSessions.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8">
                  <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                  {searchQuery ? 'No sessions found' : 'No sessions yet'}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    isDeleting={isDeleting === session.id}
                    onSelect={() => {
                      switchSession(session.id);
                      onClose();
                    }}
                    onDelete={(e) => handleDelete(session.id, e)}
                    onExport={(e) => handleExport(session.id, e)}
                    formatDate={formatDate}
                  />
                ))
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-cyan-500/30 space-y-2">
              <button
                onClick={handleCleanup}
                className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                Cleanup Old Sessions
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface SessionCardProps {
  session: Session;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isActive,
  isDeleting,
  onSelect,
  onDelete,
  onExport,
  formatDate
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded cursor-pointer transition-all group ${
        isActive
          ? 'bg-cyan-500/10 border border-cyan-500/40'
          : 'bg-black/20 border border-gray-800 hover:border-cyan-500/30 hover:bg-black/40'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className={`text-xs font-semibold line-clamp-1 ${
          isActive ? 'text-cyan-400' : 'text-gray-300'
        }`}>
          {session.title}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onExport}
            className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
            title="Export"
          >
            <Download size={12} className="text-cyan-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Delete"
            disabled={isDeleting}
          >
            <Trash2 size={12} className={isDeleting ? 'text-gray-600' : 'text-red-400'} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MessageSquare size={10} />
            {session.messageCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatDate(session.updatedAt)}
          </span>
        </div>
        {isActive && (
          <span className="text-cyan-400 text-[9px] font-bold tracking-wide">ACTIVE</span>
        )}
      </div>
    </motion.div>
  );
};
