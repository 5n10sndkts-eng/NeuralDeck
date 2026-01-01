import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Check,
    X,
    CheckCircle2,
    XCircle,
    Circle,
    ChevronRight,
    FolderOpen,
    AlertCircle
} from 'lucide-react';
import { DiffViewer } from './DiffViewer';

// --- Types ---

export interface FileChange {
    id: string;
    path: string;
    oldContent: string;
    newContent: string;
    additions: number;
    deletions: number;
    status: 'pending' | 'applied' | 'rejected';
    rejectionReason?: string;
}

export interface MultiFileDiffProps {
    changes: FileChange[];
    onApply: (fileId: string) => Promise<void>;
    onReject: (fileId: string, reason?: string) => Promise<void>;
    onApplyAll: () => Promise<void>;
    onRejectAll: (reason?: string) => Promise<void>;
    onClose?: () => void;
    agentName?: string;
}

// --- Utility Functions ---

function getFileIcon(path: string): React.ReactNode {
    const ext = path.split('.').pop()?.toLowerCase();
    const colorMap: Record<string, string> = {
        ts: '#3178c6',
        tsx: '#3178c6',
        js: '#f7df1e',
        jsx: '#f7df1e',
        py: '#3776ab',
        rs: '#dea584',
        go: '#00add8',
        css: '#264de4',
        html: '#e34c26',
        json: '#5d5d5d',
        md: '#ffffff',
    };
    const color = colorMap[ext || ''] || '#888888';
    return <FileText size={14} style={{ color }} />;
}

function getFileName(path: string): string {
    return path.split('/').pop() || path;
}

function getFileDir(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
}

// --- File List Item Component ---

const FileListItem: React.FC<{
    file: FileChange;
    isSelected: boolean;
    onClick: () => void;
}> = memo(({ file, isSelected, onClick }) => {
    const statusConfig = {
        pending: {
            icon: <Circle size={12} />,
            color: 'rgba(255, 255, 255, 0.5)',
            label: 'Pending',
        },
        applied: {
            icon: <CheckCircle2 size={12} />,
            color: '#00ff64',
            label: 'Applied',
        },
        rejected: {
            icon: <XCircle size={12} />,
            color: '#ff003c',
            label: 'Rejected',
        },
    };

    const status = statusConfig[file.status];

    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full text-left px-3 py-2 transition-all"
            style={{
                background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                borderLeft: isSelected ? '2px solid #00f0ff' : '2px solid transparent',
            }}
        >
            <div className="flex items-center gap-2">
                {/* Status Icon */}
                <span style={{ color: status.color }}>{status.icon}</span>

                {/* File Icon */}
                {getFileIcon(file.path)}

                {/* File Name */}
                <span
                    className="flex-1 font-mono text-sm truncate"
                    style={{
                        color: isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.85)',
                        textDecoration: file.status === 'rejected' ? 'line-through' : 'none',
                        opacity: file.status === 'rejected' ? 0.5 : 1,
                    }}
                >
                    {getFileName(file.path)}
                </span>

                {/* Stats */}
                <div className="flex items-center gap-2 font-mono text-xs">
                    <span style={{ color: '#00ff64' }}>+{file.additions}</span>
                    <span style={{ color: '#ff003c' }}>-{file.deletions}</span>
                </div>

                {/* Arrow */}
                {isSelected && (
                    <ChevronRight size={14} style={{ color: '#00f0ff' }} />
                )}
            </div>

            {/* Directory Path */}
            <div
                className="font-mono text-xs mt-1 pl-5 truncate"
                style={{ color: 'rgba(255, 255, 255, 0.3)' }}
            >
                {getFileDir(file.path)}
            </div>
        </motion.button>
    );
});
FileListItem.displayName = 'FileListItem';

// --- Main Component ---

export const MultiFileDiff: React.FC<MultiFileDiffProps> = memo(({
    changes,
    onApply,
    onReject,
    onApplyAll,
    onRejectAll,
    onClose,
    agentName = 'Agent',
}) => {
    const [selectedFileId, setSelectedFileId] = useState<string>(changes[0]?.id || '');
    const [isApplyingAll, setIsApplyingAll] = useState(false);
    const [showRejectAllDialog, setShowRejectAllDialog] = useState(false);
    const [rejectAllReason, setRejectAllReason] = useState('');

    const selectedFile = useMemo(
        () => changes.find(c => c.id === selectedFileId),
        [changes, selectedFileId]
    );

    // Statistics
    const stats = useMemo(() => {
        let totalAdditions = 0;
        let totalDeletions = 0;
        let pending = 0;
        let applied = 0;
        let rejected = 0;

        for (const change of changes) {
            totalAdditions += change.additions;
            totalDeletions += change.deletions;
            if (change.status === 'pending') pending++;
            if (change.status === 'applied') applied++;
            if (change.status === 'rejected') rejected++;
        }

        return { totalAdditions, totalDeletions, pending, applied, rejected };
    }, [changes]);

    const handleApply = useCallback(async () => {
        if (selectedFile) {
            await onApply(selectedFile.id);
            // Auto-advance to next pending file
            const nextPending = changes.find(c => c.id !== selectedFile.id && c.status === 'pending');
            if (nextPending) {
                setSelectedFileId(nextPending.id);
            }
        }
    }, [selectedFile, onApply, changes]);

    const handleReject = useCallback(async (reason?: string) => {
        if (selectedFile) {
            await onReject(selectedFile.id, reason);
            // Auto-advance to next pending file
            const nextPending = changes.find(c => c.id !== selectedFile.id && c.status === 'pending');
            if (nextPending) {
                setSelectedFileId(nextPending.id);
            }
        }
    }, [selectedFile, onReject, changes]);

    const handleApplyAll = useCallback(async () => {
        setIsApplyingAll(true);
        try {
            await onApplyAll();
        } finally {
            setIsApplyingAll(false);
        }
    }, [onApplyAll]);

    const handleRejectAll = useCallback(async () => {
        await onRejectAll(rejectAllReason || undefined);
        setShowRejectAllDialog(false);
        setRejectAllReason('');
    }, [onRejectAll, rejectAllReason]);

    return (
        <div className="flex flex-col h-full" style={{
            background: 'rgba(5, 5, 15, 0.98)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 240, 255, 0.2)',
        }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{
                borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
                background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05), rgba(255, 0, 180, 0.05))',
            }}>
                <div className="flex items-center gap-3">
                    <FolderOpen size={18} style={{ color: '#00f0ff' }} />
                    <span className="font-mono text-sm font-bold" style={{ color: '#00f0ff' }}>
                        PROPOSED CHANGES
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{
                        background: 'rgba(255, 0, 180, 0.1)',
                        color: '#ff00b4',
                        border: '1px solid rgba(255, 0, 180, 0.3)',
                    }}>
                        by {agentName}
                    </span>
                </div>

                {/* Summary Stats */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 font-mono text-xs">
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {changes.length} file{changes.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color: '#00ff64' }}>+{stats.totalAdditions}</span>
                        <span style={{ color: '#ff003c' }}>-{stats.totalDeletions}</span>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                        {stats.pending > 0 && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded" style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.7)',
                            }}>
                                {stats.pending} pending
                            </span>
                        )}
                        {stats.applied > 0 && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded" style={{
                                background: 'rgba(0, 255, 100, 0.1)',
                                color: '#00ff64',
                            }}>
                                {stats.applied} applied
                            </span>
                        )}
                        {stats.rejected > 0 && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded" style={{
                                background: 'rgba(255, 0, 60, 0.1)',
                                color: '#ff003c',
                            }}>
                                {stats.rejected} rejected
                            </span>
                        )}
                    </div>

                    {/* Close Button */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-white/10"
                            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* File List Sidebar */}
                <div
                    className="flex flex-col overflow-hidden"
                    style={{
                        width: '280px',
                        borderRight: '1px solid rgba(0, 240, 255, 0.2)',
                        background: 'rgba(0, 0, 0, 0.3)',
                    }}
                >
                    {/* File List */}
                    <div className="flex-1 overflow-y-auto py-2">
                        {changes.map((file) => (
                            <FileListItem
                                key={file.id}
                                file={file}
                                isSelected={file.id === selectedFileId}
                                onClick={() => setSelectedFileId(file.id)}
                            />
                        ))}
                    </div>

                    {/* Batch Actions */}
                    {stats.pending > 0 && (
                        <div className="p-3 flex gap-2" style={{
                            borderTop: '1px solid rgba(0, 240, 255, 0.2)',
                        }}>
                            <button
                                onClick={() => setShowRejectAllDialog(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'rgba(255, 0, 60, 0.15)',
                                    border: '1px solid rgba(255, 0, 60, 0.3)',
                                    color: '#ff003c',
                                }}
                            >
                                <X size={12} />
                                REJECT ALL
                            </button>
                            <button
                                onClick={handleApplyAll}
                                disabled={isApplyingAll}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'rgba(0, 255, 100, 0.15)',
                                    border: '1px solid rgba(0, 255, 100, 0.3)',
                                    color: '#00ff64',
                                    opacity: isApplyingAll ? 0.5 : 1,
                                }}
                            >
                                <Check size={12} />
                                {isApplyingAll ? 'APPLYING...' : 'APPLY ALL'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Diff Viewer */}
                <div className="flex-1 overflow-hidden">
                    {selectedFile ? (
                        <DiffViewer
                            oldCode={selectedFile.oldContent}
                            newCode={selectedFile.newContent}
                            fileName={selectedFile.path}
                            onApply={handleApply}
                            onReject={handleReject}
                            showActions={selectedFile.status === 'pending'}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <AlertCircle size={48} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                            <p className="font-mono text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                Select a file to view changes
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* All Changes Processed Banner */}
            {stats.pending === 0 && changes.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 flex items-center justify-center gap-3"
                    style={{
                        borderTop: '1px solid rgba(0, 255, 100, 0.3)',
                        background: 'rgba(0, 255, 100, 0.05)',
                    }}
                >
                    <CheckCircle2 size={18} style={{ color: '#00ff64' }} />
                    <span className="font-mono text-sm" style={{ color: '#00ff64' }}>
                        All changes have been processed
                    </span>
                    <span className="font-mono text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        ({stats.applied} applied, {stats.rejected} rejected)
                    </span>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="ml-4 px-4 py-1.5 rounded font-mono text-xs font-bold"
                            style={{
                                background: 'rgba(0, 240, 255, 0.15)',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                color: '#00f0ff',
                            }}
                        >
                            CLOSE
                        </button>
                    )}
                </motion.div>
            )}

            {/* Reject All Dialog */}
            <AnimatePresence>
                {showRejectAllDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center z-50"
                        style={{ background: 'rgba(0, 0, 0, 0.8)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="p-6 rounded-lg max-w-md w-full"
                            style={{
                                background: 'rgba(10, 10, 20, 0.98)',
                                border: '1px solid rgba(255, 0, 60, 0.4)',
                            }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle size={20} style={{ color: '#ff003c' }} />
                                <h3 className="font-mono font-bold" style={{ color: '#ff003c' }}>
                                    REJECT ALL CHANGES
                                </h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                This will reject all {stats.pending} pending changes.
                                Optionally provide a reason.
                            </p>
                            <textarea
                                value={rejectAllReason}
                                onChange={(e) => setRejectAllReason(e.target.value)}
                                placeholder="Enter rejection reason (optional)..."
                                className="w-full p-3 rounded font-mono text-sm resize-none"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    minHeight: '100px',
                                }}
                            />
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setShowRejectAllDialog(false)}
                                    className="px-4 py-2 rounded font-mono text-sm"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                    }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleRejectAll}
                                    className="px-4 py-2 rounded font-mono text-sm font-bold"
                                    style={{
                                        background: 'rgba(255, 0, 60, 0.2)',
                                        border: '1px solid rgba(255, 0, 60, 0.4)',
                                        color: '#ff003c',
                                    }}
                                >
                                    REJECT {stats.pending} CHANGES
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

MultiFileDiff.displayName = 'MultiFileDiff';

export default MultiFileDiff;
