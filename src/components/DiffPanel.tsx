import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompare, AlertCircle } from 'lucide-react';
import { MultiFileDiff, FileChange } from './MultiFileDiff';

interface DiffPanelProps {
    isOpen: boolean;
    pendingDiffs: FileChange[];
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
    onApply: (fileId: string) => Promise<void>;
    onReject: (fileId: string, reason?: string) => Promise<void>;
    onApplyAll: () => Promise<void>;
    onRejectAll: (reason?: string) => Promise<void>;
    agentName?: string;
}

export const DiffPanel: React.FC<DiffPanelProps> = memo(({
    isOpen,
    pendingDiffs,
    isLoading,
    error,
    onClose,
    onApply,
    onReject,
    onApplyAll,
    onRejectAll,
    agentName = 'Agent'
}) => {
    const pendingCount = useMemo(
        () => pendingDiffs.filter(d => d.status === 'pending').length,
        [pendingDiffs]
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            >
                {/* Backdrop click to close */}
                <div
                    className="absolute inset-0"
                    onClick={onClose}
                />

                {/* Panel */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-[90vw] h-[85vh] max-w-7xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center" style={{
                            background: 'rgba(5, 5, 15, 0.8)',
                            borderRadius: '12px'
                        }}>
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                <span className="font-mono text-sm" style={{ color: '#00f0ff' }}>
                                    Processing...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded flex items-center gap-2" style={{
                            background: 'rgba(255, 0, 60, 0.2)',
                            border: '1px solid rgba(255, 0, 60, 0.4)',
                        }}>
                            <AlertCircle size={16} style={{ color: '#ff003c' }} />
                            <span className="font-mono text-sm" style={{ color: '#ff003c' }}>
                                {error}
                            </span>
                        </div>
                    )}

                    {/* Content */}
                    {pendingDiffs.length > 0 ? (
                        <MultiFileDiff
                            changes={pendingDiffs}
                            onApply={onApply}
                            onReject={onReject}
                            onApplyAll={onApplyAll}
                            onRejectAll={onRejectAll}
                            onClose={onClose}
                            agentName={agentName}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center rounded-xl" style={{
                            background: 'rgba(5, 5, 15, 0.98)',
                            border: '1px solid rgba(0, 240, 255, 0.2)',
                        }}>
                            <GitCompare size={48} style={{ color: 'rgba(0, 240, 255, 0.3)' }} />
                            <p className="mt-4 font-mono text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                No pending changes to review
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 px-6 py-2 rounded font-mono text-sm font-bold"
                                style={{
                                    background: 'rgba(0, 240, 255, 0.15)',
                                    border: '1px solid rgba(0, 240, 255, 0.3)',
                                    color: '#00f0ff',
                                }}
                            >
                                CLOSE
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

DiffPanel.displayName = 'DiffPanel';

// Badge component for showing pending diff count
export const DiffBadge: React.FC<{
    count: number;
    onClick: () => void;
}> = memo(({ count, onClick }) => {
    if (count === 0) return null;

    return (
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold"
            style={{
                background: 'rgba(255, 170, 0, 0.15)',
                border: '1px solid rgba(255, 170, 0, 0.4)',
                color: '#ffaa00',
                boxShadow: '0 0 12px rgba(255, 170, 0, 0.2)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <GitCompare size={12} />
            <span>{count} PENDING</span>
            <motion.div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: '#ffaa00' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
        </motion.button>
    );
});

DiffBadge.displayName = 'DiffBadge';

export default DiffPanel;
