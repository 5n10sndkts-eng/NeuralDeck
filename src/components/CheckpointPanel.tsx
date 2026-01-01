import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    RotateCcw,
    Trash2,
    Eye,
    X,
    History,
    User,
    Bot,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    HardDrive,
    RefreshCw
} from 'lucide-react';
import {
    getCheckpoints,
    getCheckpointContent,
    restoreCheckpoint,
    deleteCheckpoint,
    Checkpoint
} from '../services/api';
import { DiffViewer } from './DiffViewer';

interface CheckpointPanelProps {
    filePath: string;
    currentContent: string;
    isOpen: boolean;
    onClose: () => void;
    onRestore?: (content: string) => void;
}

// Format timestamp
function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';

    // Less than 1 hour
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }

    // Same year
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format file size
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Checkpoint list item
const CheckpointItem: React.FC<{
    checkpoint: Checkpoint;
    isSelected: boolean;
    onClick: () => void;
}> = memo(({ checkpoint, isSelected, onClick }) => {
    const isAgent = checkpoint.agentId && !['user', 'anonymous'].includes(checkpoint.agentId);

    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full text-left p-3 transition-all hover:bg-white/5"
            style={{
                background: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                borderLeft: isSelected ? '2px solid #00f0ff' : '2px solid transparent',
            }}
        >
            <div className="flex items-start gap-3">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: isAgent ? '#ff00b4' : '#00f0ff',
                            boxShadow: `0 0 8px ${isAgent ? '#ff00b4' : '#00f0ff'}40`,
                        }}
                    />
                    <div className="w-0.5 flex-1 bg-gray-700 mt-1" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {isAgent ? (
                            <Bot size={12} style={{ color: '#ff00b4' }} />
                        ) : (
                            <User size={12} style={{ color: '#00f0ff' }} />
                        )}
                        <span
                            className="font-mono text-xs font-bold truncate"
                            style={{ color: isAgent ? '#ff00b4' : '#00f0ff' }}
                        >
                            {checkpoint.agentId || 'User'}
                        </span>
                        <span className="text-xs text-gray-500">
                            {formatTime(checkpoint.timestamp)}
                        </span>
                    </div>

                    <p className="text-xs text-gray-400 truncate mb-1">
                        {checkpoint.summary}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <HardDrive size={10} />
                        <span>{formatSize(checkpoint.size)}</span>
                    </div>
                </div>

                {isSelected && (
                    <ChevronRight size={14} style={{ color: '#00f0ff' }} />
                )}
            </div>
        </motion.button>
    );
});
CheckpointItem.displayName = 'CheckpointItem';

// Main panel component
export const CheckpointPanel: React.FC<CheckpointPanelProps> = memo(({
    filePath,
    currentContent,
    isOpen,
    onClose,
    onRestore
}) => {
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const selectedCheckpoint = useMemo(
        () => checkpoints.find(c => c.id === selectedId),
        [checkpoints, selectedId]
    );

    // Load checkpoints
    const loadCheckpoints = useCallback(async () => {
        if (!filePath) return;

        setIsLoading(true);
        setError(null);

        try {
            const { checkpoints: data } = await getCheckpoints(filePath);
            setCheckpoints(data);
            if (data.length > 0 && !selectedId) {
                setSelectedId(data[0].id);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load checkpoints');
        } finally {
            setIsLoading(false);
        }
    }, [filePath, selectedId]);

    // Load on open
    useEffect(() => {
        if (isOpen) {
            loadCheckpoints();
        }
    }, [isOpen, loadCheckpoints]);

    // Load preview content when selection changes
    useEffect(() => {
        if (!selectedId) {
            setPreviewContent(null);
            return;
        }

        const loadPreview = async () => {
            try {
                const { content } = await getCheckpointContent(selectedId);
                setPreviewContent(content);
            } catch (e: any) {
                setError(e.message || 'Failed to load preview');
            }
        };

        loadPreview();
    }, [selectedId]);

    // Handle restore
    const handleRestore = useCallback(async () => {
        if (!selectedId) return;

        setIsRestoring(true);
        setError(null);

        try {
            await restoreCheckpoint(selectedId);
            setSuccessMessage('Checkpoint restored successfully');
            setTimeout(() => setSuccessMessage(null), 3000);

            // Reload checkpoints
            await loadCheckpoints();

            // Notify parent
            if (previewContent && onRestore) {
                onRestore(previewContent);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to restore checkpoint');
        } finally {
            setIsRestoring(false);
        }
    }, [selectedId, previewContent, onRestore, loadCheckpoints]);

    // Handle delete
    const handleDelete = useCallback(async () => {
        if (!selectedId) return;

        try {
            await deleteCheckpoint(selectedId);
            setCheckpoints(prev => prev.filter(c => c.id !== selectedId));
            setSelectedId(checkpoints[0]?.id || null);
        } catch (e: any) {
            setError(e.message || 'Failed to delete checkpoint');
        }
    }, [selectedId, checkpoints]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex"
                style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            >
                {/* Backdrop */}
                <div className="absolute inset-0" onClick={onClose} />

                {/* Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute right-0 top-0 bottom-0 w-full max-w-4xl flex"
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'rgba(5, 5, 15, 0.98)',
                        borderLeft: '1px solid rgba(0, 240, 255, 0.2)',
                    }}
                >
                    {/* Sidebar - Checkpoint List */}
                    <div
                        className="w-80 flex flex-col overflow-hidden"
                        style={{
                            borderRight: '1px solid rgba(0, 240, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.3)',
                        }}
                    >
                        {/* Header */}
                        <div className="p-4 flex items-center justify-between" style={{
                            borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
                        }}>
                            <div className="flex items-center gap-2">
                                <History size={18} style={{ color: '#00f0ff' }} />
                                <span className="font-mono text-sm font-bold" style={{ color: '#00f0ff' }}>
                                    CHECKPOINTS
                                </span>
                            </div>
                            <button
                                onClick={loadCheckpoints}
                                className="p-1.5 rounded hover:bg-white/10"
                                title="Refresh"
                            >
                                <RefreshCw size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                            </button>
                        </div>

                        {/* File path */}
                        <div className="px-4 py-2 text-xs font-mono truncate" style={{
                            color: 'rgba(255, 255, 255, 0.4)',
                            background: 'rgba(0, 0, 0, 0.3)',
                        }}>
                            {filePath.split('/').pop()}
                        </div>

                        {/* Checkpoint list */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : checkpoints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                                    <Clock size={24} className="mb-2 opacity-30" />
                                    <p className="text-xs">No checkpoints yet</p>
                                </div>
                            ) : (
                                checkpoints.map(cp => (
                                    <CheckpointItem
                                        key={cp.id}
                                        checkpoint={cp}
                                        isSelected={cp.id === selectedId}
                                        onClick={() => setSelectedId(cp.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Stats footer */}
                        <div className="p-3 flex items-center justify-between text-xs" style={{
                            borderTop: '1px solid rgba(0, 240, 255, 0.15)',
                            color: 'rgba(255, 255, 255, 0.4)',
                        }}>
                            <span>{checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {/* Main content - Preview/Diff */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 flex items-center justify-between" style={{
                            borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
                        }}>
                            <div className="flex items-center gap-4">
                                {selectedCheckpoint && (
                                    <>
                                        <span className="font-mono text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                            {formatTime(selectedCheckpoint.timestamp)}
                                        </span>
                                        <button
                                            onClick={() => setShowDiff(!showDiff)}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
                                            style={{
                                                background: showDiff ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                color: showDiff ? '#00f0ff' : 'rgba(255, 255, 255, 0.5)',
                                            }}
                                        >
                                            <Eye size={12} />
                                            {showDiff ? 'DIFF' : 'PREVIEW'}
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Delete button */}
                                {selectedCheckpoint && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 rounded hover:bg-red-500/20"
                                        title="Delete checkpoint"
                                    >
                                        <Trash2 size={14} style={{ color: '#ff003c' }} />
                                    </button>
                                )}

                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded hover:bg-white/10"
                                >
                                    <X size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                                </button>
                            </div>
                        </div>

                        {/* Success/Error messages */}
                        <AnimatePresence>
                            {successMessage && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 py-2 flex items-center gap-2"
                                    style={{ background: 'rgba(0, 255, 100, 0.1)' }}
                                >
                                    <CheckCircle2 size={14} style={{ color: '#00ff64' }} />
                                    <span className="text-xs" style={{ color: '#00ff64' }}>
                                        {successMessage}
                                    </span>
                                </motion.div>
                            )}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 py-2 flex items-center gap-2"
                                    style={{ background: 'rgba(255, 0, 60, 0.1)' }}
                                >
                                    <AlertCircle size={14} style={{ color: '#ff003c' }} />
                                    <span className="text-xs" style={{ color: '#ff003c' }}>
                                        {error}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content area */}
                        <div className="flex-1 overflow-hidden">
                            {!selectedCheckpoint ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <Clock size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm">Select a checkpoint to preview</p>
                                </div>
                            ) : showDiff && previewContent !== null ? (
                                <DiffViewer
                                    oldCode={previewContent}
                                    newCode={currentContent}
                                    fileName={filePath}
                                    onApply={() => {}}
                                    onReject={() => {}}
                                    showActions={false}
                                />
                            ) : (
                                <pre
                                    className="p-4 h-full overflow-auto font-mono text-sm"
                                    style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                                >
                                    {previewContent}
                                </pre>
                            )}
                        </div>

                        {/* Action footer */}
                        {selectedCheckpoint && (
                            <div className="p-4 flex items-center justify-end gap-3" style={{
                                borderTop: '1px solid rgba(0, 240, 255, 0.15)',
                            }}>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded font-mono text-xs"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                    }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleRestore}
                                    disabled={isRestoring}
                                    className="flex items-center gap-2 px-4 py-2 rounded font-mono text-xs font-bold transition-all hover:scale-[1.02]"
                                    style={{
                                        background: 'rgba(0, 240, 255, 0.15)',
                                        border: '1px solid rgba(0, 240, 255, 0.4)',
                                        color: '#00f0ff',
                                        opacity: isRestoring ? 0.5 : 1,
                                    }}
                                >
                                    <RotateCcw size={14} />
                                    {isRestoring ? 'RESTORING...' : 'RESTORE THIS VERSION'}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

CheckpointPanel.displayName = 'CheckpointPanel';

export default CheckpointPanel;
