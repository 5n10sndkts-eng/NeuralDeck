/**
 * ConflictAlert Component - Story 4-3
 *
 * Displays conflict notifications and provides resolution controls.
 * Shows pending conflicts with options for automatic or manual resolution.
 */

import React, { useState } from 'react';
import { ConflictState, ConflictManagerState } from '../hooks/useSocket';

interface ConflictAlertProps {
    conflictState: ConflictManagerState;
    onResolveAuto: (conflictId: string) => Promise<any>;
    onResolveManually: (conflictId: string, content: string) => Promise<any>;
    onDismiss?: () => void;
}

export const ConflictAlert: React.FC<ConflictAlertProps> = ({
    conflictState,
    onResolveAuto,
    onResolveManually,
    onDismiss,
}) => {
    const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
    const [manualContent, setManualContent] = useState<string>('');
    const [isResolving, setIsResolving] = useState<string | null>(null);

    const pendingConflicts = Array.from(conflictState.conflicts.values() as Iterable<ConflictState>).filter(
        c => c.status === 'pending' || c.status === 'manual-required'
    );

    if (pendingConflicts.length === 0) {
        return null;
    }

    const handleAutoResolve = async (conflictId: string) => {
        setIsResolving(conflictId);
        try {
            await onResolveAuto(conflictId);
        } finally {
            setIsResolving(null);
        }
    };

    const handleManualResolve = async (conflictId: string) => {
        if (!manualContent.trim()) return;
        setIsResolving(conflictId);
        try {
            await onResolveManually(conflictId, manualContent);
            setManualContent('');
            setExpandedConflict(null);
        } finally {
            setIsResolving(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'text-yellow-400';
            case 'auto-resolving': return 'text-blue-400';
            case 'manual-required': return 'text-orange-400';
            case 'resolved': return 'text-green-400';
            case 'failed': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return '⚠';
            case 'auto-resolving': return '⟳';
            case 'manual-required': return '✋';
            case 'resolved': return '✓';
            case 'failed': return '✕';
            default: return '?';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyber-panel/95 to-cyber-dark/95 backdrop-blur-md border border-cyber-purple/50 rounded-t-cyber-md px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-cyber-purple animate-pulse">⚔</span>
                    <span className="text-cyber-purple font-display font-bold text-cyber-sm uppercase tracking-wider">
                        Merge Conflicts ({pendingConflicts.length})
                    </span>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-cyber-purple/60 hover:text-cyber-purple transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Conflict List */}
            <div className="bg-cyber-dark/95 backdrop-blur-md border border-cyber-purple/30 border-t-0 rounded-b-cyber-md max-h-96 overflow-y-auto">
                {pendingConflicts.map(conflict => (
                    <div
                        key={conflict.conflictId}
                        className="border-b border-cyber-purple/20 last:border-b-0"
                    >
                        {/* Conflict Summary */}
                        <div
                            className="px-4 py-3 cursor-pointer hover:bg-cyber-purple/10 transition-colors"
                            onClick={() => setExpandedConflict(
                                expandedConflict === conflict.conflictId ? null : conflict.conflictId
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={getStatusColor(conflict.status)}>
                                        {getStatusIcon(conflict.status)}
                                    </span>
                                    <span className="text-cyber-text text-cyber-sm font-mono truncate max-w-48">
                                        {conflict.filePath.split('/').pop()}
                                    </span>
                                </div>
                                <span className="text-cyber-purple/60 text-xs">
                                    {expandedConflict === conflict.conflictId ? '▼' : '▶'}
                                </span>
                            </div>
                            <div className="text-cyber-xs text-cyber-muted mt-1">
                                {conflict.developerA} ↔ {conflict.developerB}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedConflict === conflict.conflictId && (
                            <div className="px-4 pb-3 space-y-3">
                                {/* File Path */}
                                <div className="text-cyber-xs text-cyber-muted font-mono break-all">
                                    {conflict.filePath}
                                </div>

                                {/* Status */}
                                <div className={`text-cyber-xs ${getStatusColor(conflict.status)}`}>
                                    Status: {conflict.status}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAutoResolve(conflict.conflictId)}
                                        disabled={isResolving === conflict.conflictId}
                                        className="flex-1 px-3 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/50 rounded-cyber-sm text-cyber-cyan text-cyber-xs hover:bg-cyber-cyan/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isResolving === conflict.conflictId ? 'Resolving...' : '🤖 Auto Resolve'}
                                    </button>
                                    <button
                                        onClick={() => setExpandedConflict(
                                            expandedConflict === conflict.conflictId + '-manual'
                                                ? conflict.conflictId
                                                : conflict.conflictId + '-manual'
                                        )}
                                        className="flex-1 px-3 py-1.5 bg-cyber-purple/10 border border-cyber-purple/50 rounded-cyber-sm text-cyber-purple text-cyber-xs hover:bg-cyber-purple/20 transition-colors"
                                    >
                                        ✏️ Manual
                                    </button>
                                </div>

                                {/* Manual Resolution Input */}
                                {expandedConflict === conflict.conflictId + '-manual' && (
                                    <div className="space-y-2 pt-2 border-t border-cyber-purple/20">
                                        <textarea
                                            value={manualContent}
                                            onChange={(e) => setManualContent(e.target.value)}
                                            placeholder="Paste resolved content here..."
                                            className="w-full h-32 px-2 py-1 bg-cyber-dark/60 border border-cyber-purple/30 rounded-cyber-sm text-cyber-xs text-cyber-text font-mono focus:outline-none focus:border-cyber-purple/50"
                                        />
                                        <button
                                            onClick={() => handleManualResolve(conflict.conflictId)}
                                            disabled={!manualContent.trim() || isResolving === conflict.conflictId}
                                            className="w-full px-3 py-1.5 bg-cyber-green/10 border border-cyber-green/50 rounded-cyber-sm text-cyber-green text-cyber-xs hover:bg-cyber-green/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isResolving === conflict.conflictId ? 'Saving...' : '✓ Save Resolution'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Stats Footer */}
            <div className="bg-cyber-dark/80 backdrop-blur-md border border-cyber-purple/20 border-t-0 rounded-b-cyber-md px-4 py-2 text-cyber-xs text-cyber-muted">
                <span className="text-cyber-green">{conflictState.resolvedCount}</span> resolved •
                <span className="text-cyber-cyan ml-1">{conflictState.pendingCount}</span> pending
            </div>
        </div>
    );
};

export default ConflictAlert;
