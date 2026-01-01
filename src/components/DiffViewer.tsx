import React, { useMemo, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronUp, ChevronDown, Columns, AlignLeft, MessageSquare } from 'lucide-react';
import * as Diff from 'diff';

// --- Types ---

export interface DiffViewerProps {
    oldCode: string;
    newCode: string;
    fileName: string;
    language?: string;
    onApply: () => void;
    onReject: (reason?: string) => void;
    showActions?: boolean;
}

export type DiffViewMode = 'split' | 'unified';

interface DiffLine {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    oldLineNumber: number | null;
    newLineNumber: number | null;
}

// --- Utility Functions ---

function computeDiffLines(oldCode: string, newCode: string): DiffLine[] {
    const diff = Diff.diffLines(oldCode, newCode);
    const lines: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const part of diff) {
        const partLines = part.value.split('\n');
        // Remove last empty element if the part ends with newline
        if (partLines[partLines.length - 1] === '') {
            partLines.pop();
        }

        for (const line of partLines) {
            if (part.added) {
                lines.push({
                    type: 'added',
                    content: line,
                    oldLineNumber: null,
                    newLineNumber: newLineNum++,
                });
            } else if (part.removed) {
                lines.push({
                    type: 'removed',
                    content: line,
                    oldLineNumber: oldLineNum++,
                    newLineNumber: null,
                });
            } else {
                lines.push({
                    type: 'unchanged',
                    content: line,
                    oldLineNumber: oldLineNum++,
                    newLineNumber: newLineNum++,
                });
            }
        }
    }

    return lines;
}

function getLanguageFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        rs: 'rust',
        go: 'go',
        java: 'java',
        css: 'css',
        scss: 'scss',
        html: 'html',
        json: 'json',
        md: 'markdown',
        yaml: 'yaml',
        yml: 'yaml',
    };
    return languageMap[ext || ''] || 'plaintext';
}

// --- Styled Line Component ---

const DiffLineComponent: React.FC<{
    line: DiffLine;
    showOldLineNum: boolean;
    showNewLineNum: boolean;
}> = memo(({ line, showOldLineNum, showNewLineNum }) => {
    const bgColor = {
        added: 'rgba(0, 255, 100, 0.08)',
        removed: 'rgba(255, 0, 60, 0.08)',
        unchanged: 'transparent',
    }[line.type];

    const textColor = {
        added: '#00ff64',
        removed: '#ff003c',
        unchanged: 'rgba(255, 255, 255, 0.85)',
    }[line.type];

    const prefix = {
        added: '+',
        removed: '-',
        unchanged: ' ',
    }[line.type];

    const prefixColor = {
        added: '#00ff64',
        removed: '#ff003c',
        unchanged: 'rgba(255, 255, 255, 0.3)',
    }[line.type];

    return (
        <div
            className="flex font-mono text-sm"
            style={{ background: bgColor, minHeight: '22px' }}
        >
            {/* Old line number */}
            {showOldLineNum && (
                <span
                    className="flex-shrink-0 text-right px-2 select-none"
                    style={{
                        width: '48px',
                        color: 'rgba(0, 240, 255, 0.4)',
                        borderRight: '1px solid rgba(0, 240, 255, 0.1)',
                    }}
                >
                    {line.oldLineNumber || ''}
                </span>
            )}

            {/* New line number */}
            {showNewLineNum && (
                <span
                    className="flex-shrink-0 text-right px-2 select-none"
                    style={{
                        width: '48px',
                        color: 'rgba(0, 240, 255, 0.4)',
                        borderRight: '1px solid rgba(0, 240, 255, 0.1)',
                    }}
                >
                    {line.newLineNumber || ''}
                </span>
            )}

            {/* Prefix (+/-/space) */}
            <span
                className="flex-shrink-0 px-2 select-none font-bold"
                style={{ color: prefixColor, width: '24px' }}
            >
                {prefix}
            </span>

            {/* Content */}
            <pre
                className="flex-1 whitespace-pre-wrap break-all px-2"
                style={{ color: textColor, margin: 0 }}
            >
                {line.content || ' '}
            </pre>
        </div>
    );
});
DiffLineComponent.displayName = 'DiffLineComponent';

// --- Main Component ---

export const DiffViewer: React.FC<DiffViewerProps> = memo(({
    oldCode,
    newCode,
    fileName,
    language,
    onApply,
    onReject,
    showActions = true,
}) => {
    const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [currentChangeIndex, setCurrentChangeIndex] = useState(0);

    const detectedLanguage = language || getLanguageFromFileName(fileName);
    const diffLines = useMemo(() => computeDiffLines(oldCode, newCode), [oldCode, newCode]);

    // Find indices of changed lines for navigation
    const changeIndices = useMemo(() => {
        return diffLines
            .map((line, index) => (line.type !== 'unchanged' ? index : -1))
            .filter(index => index !== -1);
    }, [diffLines]);

    // Stats
    const stats = useMemo(() => {
        let additions = 0;
        let deletions = 0;
        for (const line of diffLines) {
            if (line.type === 'added') additions++;
            if (line.type === 'removed') deletions++;
        }
        return { additions, deletions };
    }, [diffLines]);

    const handleNextChange = useCallback(() => {
        if (currentChangeIndex < changeIndices.length - 1) {
            setCurrentChangeIndex(prev => prev + 1);
            // Scroll to element would go here in a real implementation
        }
    }, [currentChangeIndex, changeIndices.length]);

    const handlePrevChange = useCallback(() => {
        if (currentChangeIndex > 0) {
            setCurrentChangeIndex(prev => prev - 1);
        }
    }, [currentChangeIndex]);

    const handleReject = useCallback(() => {
        onReject(rejectReason || undefined);
        setShowRejectDialog(false);
        setRejectReason('');
    }, [onReject, rejectReason]);

    // Split view: separate old and new columns
    const renderSplitView = () => {
        const oldLines = diffLines.filter(l => l.type !== 'added');
        const newLines = diffLines.filter(l => l.type !== 'removed');

        return (
            <div className="flex h-full">
                {/* Old Code Column */}
                <div className="flex-1 overflow-auto border-r" style={{ borderColor: 'rgba(0, 240, 255, 0.2)' }}>
                    <div className="sticky top-0 z-10 px-3 py-1 font-mono text-xs" style={{
                        background: 'rgba(255, 0, 60, 0.1)',
                        color: '#ff003c',
                        borderBottom: '1px solid rgba(255, 0, 60, 0.3)',
                    }}>
                        ORIGINAL
                    </div>
                    {oldLines.map((line, idx) => (
                        <DiffLineComponent
                            key={`old-${idx}`}
                            line={line}
                            showOldLineNum={true}
                            showNewLineNum={false}
                        />
                    ))}
                </div>

                {/* New Code Column */}
                <div className="flex-1 overflow-auto">
                    <div className="sticky top-0 z-10 px-3 py-1 font-mono text-xs" style={{
                        background: 'rgba(0, 255, 100, 0.1)',
                        color: '#00ff64',
                        borderBottom: '1px solid rgba(0, 255, 100, 0.3)',
                    }}>
                        MODIFIED
                    </div>
                    {newLines.map((line, idx) => (
                        <DiffLineComponent
                            key={`new-${idx}`}
                            line={{ ...line, type: line.type === 'removed' ? 'unchanged' : line.type }}
                            showOldLineNum={false}
                            showNewLineNum={true}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Unified view: single column with all changes
    const renderUnifiedView = () => (
        <div className="overflow-auto h-full">
            {diffLines.map((line, idx) => (
                <DiffLineComponent
                    key={idx}
                    line={line}
                    showOldLineNum={true}
                    showNewLineNum={true}
                />
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full" style={{
            background: 'rgba(5, 5, 15, 0.95)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '8px',
        }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{
                borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
                background: 'rgba(0, 240, 255, 0.03)',
            }}>
                {/* File Info */}
                <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold" style={{ color: '#00f0ff' }}>
                        {fileName}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{
                        background: 'rgba(0, 240, 255, 0.1)',
                        color: 'rgba(0, 240, 255, 0.7)',
                    }}>
                        {detectedLanguage}
                    </span>
                </div>

                {/* Stats & Controls */}
                <div className="flex items-center gap-4">
                    {/* Change Stats */}
                    <div className="flex items-center gap-3 font-mono text-xs">
                        <span style={{ color: '#00ff64' }}>+{stats.additions}</span>
                        <span style={{ color: '#ff003c' }}>-{stats.deletions}</span>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevChange}
                            disabled={currentChangeIndex === 0}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                            title="Previous change"
                        >
                            <ChevronUp size={16} style={{ color: '#00f0ff' }} />
                        </button>
                        <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {changeIndices.length > 0 ? `${currentChangeIndex + 1}/${changeIndices.length}` : '0/0'}
                        </span>
                        <button
                            onClick={handleNextChange}
                            disabled={currentChangeIndex >= changeIndices.length - 1}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                            title="Next change"
                        >
                            <ChevronDown size={16} style={{ color: '#00f0ff' }} />
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex rounded overflow-hidden" style={{ border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                        <button
                            onClick={() => setViewMode('unified')}
                            className={`p-1.5 ${viewMode === 'unified' ? 'bg-cyan-500/20' : 'hover:bg-white/10'}`}
                            title="Unified view"
                        >
                            <AlignLeft size={14} style={{ color: viewMode === 'unified' ? '#00f0ff' : 'rgba(255,255,255,0.5)' }} />
                        </button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={`p-1.5 ${viewMode === 'split' ? 'bg-cyan-500/20' : 'hover:bg-white/10'}`}
                            title="Split view"
                        >
                            <Columns size={14} style={{ color: viewMode === 'split' ? '#00f0ff' : 'rgba(255,255,255,0.5)' }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'split' ? renderSplitView() : renderUnifiedView()}
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex items-center justify-end gap-3 px-4 py-3" style={{
                    borderTop: '1px solid rgba(0, 240, 255, 0.2)',
                    background: 'rgba(0, 240, 255, 0.03)',
                }}>
                    <button
                        onClick={() => setShowRejectDialog(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            background: 'rgba(255, 0, 60, 0.15)',
                            border: '1px solid rgba(255, 0, 60, 0.4)',
                            color: '#ff003c',
                        }}
                    >
                        <X size={16} />
                        REJECT
                    </button>
                    <button
                        onClick={onApply}
                        className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            background: 'rgba(0, 255, 100, 0.15)',
                            border: '1px solid rgba(0, 255, 100, 0.4)',
                            color: '#00ff64',
                        }}
                    >
                        <Check size={16} />
                        APPLY CHANGES
                    </button>
                </div>
            )}

            {/* Reject Dialog */}
            <AnimatePresence>
                {showRejectDialog && (
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
                                <MessageSquare size={20} style={{ color: '#ff003c' }} />
                                <h3 className="font-mono font-bold" style={{ color: '#ff003c' }}>
                                    REJECTION REASON
                                </h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                Optionally provide a reason for rejection. This helps the agent improve.
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
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
                                    onClick={() => setShowRejectDialog(false)}
                                    className="px-4 py-2 rounded font-mono text-sm"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                    }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="px-4 py-2 rounded font-mono text-sm font-bold"
                                    style={{
                                        background: 'rgba(255, 0, 60, 0.2)',
                                        border: '1px solid rgba(255, 0, 60, 0.4)',
                                        color: '#ff003c',
                                    }}
                                >
                                    CONFIRM REJECT
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

DiffViewer.displayName = 'DiffViewer';

export default DiffViewer;
