import { useState, useCallback, useEffect, useRef } from 'react';
import {
    createDiffPreview,
    applyDiff,
    rejectDiff,
    getPendingDiffs,
    getDiff,
    DiffPreviewResponse,
    DiffRecord,
    PendingDiffSummary
} from '../services/api';
import { FileChange } from '../components/MultiFileDiff';

// --- Types ---

export interface DiffManagerState {
    isOpen: boolean;
    pendingDiffs: FileChange[];
    currentDiffId: string | null;
    isLoading: boolean;
    error: string | null;
}

export interface DiffManagerActions {
    openDiffPanel: () => void;
    closeDiffPanel: () => void;
    proposeDiff: (path: string, proposedContent: string, agentId?: string, reason?: string) => Promise<string>;
    applyChange: (fileId: string) => Promise<void>;
    rejectChange: (fileId: string, reason?: string) => Promise<void>;
    applyAll: () => Promise<void>;
    rejectAll: (reason?: string) => Promise<void>;
    refreshPendingDiffs: () => Promise<void>;
}

export type UseDiffManagerReturn = DiffManagerState & DiffManagerActions;

// --- Hook ---

export function useDiffManager(): UseDiffManagerReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [pendingDiffs, setPendingDiffs] = useState<FileChange[]>([]);
    const [currentDiffId, setCurrentDiffId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track locally managed diffs (in-memory cache)
    const diffCacheRef = useRef<Map<string, DiffRecord>>(new Map());

    // Convert API DiffRecord to FileChange
    const recordToFileChange = useCallback((record: DiffRecord): FileChange => ({
        id: record.id,
        path: record.path,
        oldContent: record.oldContent,
        newContent: record.newContent,
        additions: record.additions,
        deletions: record.deletions,
        status: record.status,
        rejectionReason: record.rejectionReason || undefined
    }), []);

    // Convert API summary to FileChange (requires fetching full diff)
    const summaryToFileChange = useCallback(async (summary: PendingDiffSummary): Promise<FileChange> => {
        // Check cache first
        const cached = diffCacheRef.current.get(summary.id);
        if (cached) {
            return recordToFileChange(cached);
        }

        // Fetch full diff
        const record = await getDiff(summary.id);
        diffCacheRef.current.set(summary.id, record);
        return recordToFileChange(record);
    }, [recordToFileChange]);

    // Refresh pending diffs from server
    const refreshPendingDiffs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { pending } = await getPendingDiffs();

            // Fetch full details for each pending diff
            const fileChanges = await Promise.all(
                pending.map(summary => summaryToFileChange(summary))
            );

            setPendingDiffs(fileChanges);

            // Auto-open panel if there are pending diffs
            if (fileChanges.length > 0 && !isOpen) {
                setIsOpen(true);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to refresh diffs');
        } finally {
            setIsLoading(false);
        }
    }, [summaryToFileChange, isOpen]);

    // Propose a new diff
    const proposeDiff = useCallback(async (
        path: string,
        proposedContent: string,
        agentId?: string,
        reason?: string
    ): Promise<string> => {
        try {
            setIsLoading(true);
            setError(null);

            const preview = await createDiffPreview({
                path,
                proposedContent,
                agentId,
                reason
            });

            // Add to local state
            const fileChange: FileChange = {
                id: preview.id,
                path: preview.path,
                oldContent: preview.oldContent,
                newContent: preview.newContent,
                additions: preview.additions,
                deletions: preview.deletions,
                status: 'pending'
            };

            setPendingDiffs(prev => [...prev, fileChange]);

            // Cache the record
            diffCacheRef.current.set(preview.id, {
                ...preview,
                agentId: agentId || null,
                reason: reason || null,
                createdAt: Date.now(),
                status: 'pending'
            });

            // Open panel
            setIsOpen(true);
            setCurrentDiffId(preview.id);

            return preview.id;
        } catch (e: any) {
            setError(e.message || 'Failed to create diff');
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Apply a single change
    const applyChange = useCallback(async (fileId: string) => {
        try {
            setIsLoading(true);
            setError(null);

            await applyDiff(fileId);

            // Update local state
            setPendingDiffs(prev =>
                prev.map(d => d.id === fileId ? { ...d, status: 'applied' as const } : d)
            );

            // Update cache
            const cached = diffCacheRef.current.get(fileId);
            if (cached) {
                cached.status = 'applied';
                cached.appliedAt = Date.now();
            }
        } catch (e: any) {
            setError(e.message || 'Failed to apply diff');
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Reject a single change
    const rejectChange = useCallback(async (fileId: string, reason?: string) => {
        try {
            setIsLoading(true);
            setError(null);

            await rejectDiff(fileId, reason);

            // Update local state
            setPendingDiffs(prev =>
                prev.map(d => d.id === fileId ? {
                    ...d,
                    status: 'rejected' as const,
                    rejectionReason: reason
                } : d)
            );

            // Update cache
            const cached = diffCacheRef.current.get(fileId);
            if (cached) {
                cached.status = 'rejected';
                cached.rejectedAt = Date.now();
                cached.rejectionReason = reason || null;
            }
        } catch (e: any) {
            setError(e.message || 'Failed to reject diff');
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Apply all pending changes
    const applyAll = useCallback(async () => {
        const pendingIds = pendingDiffs
            .filter(d => d.status === 'pending')
            .map(d => d.id);

        for (const id of pendingIds) {
            await applyChange(id);
        }
    }, [pendingDiffs, applyChange]);

    // Reject all pending changes
    const rejectAll = useCallback(async (reason?: string) => {
        const pendingIds = pendingDiffs
            .filter(d => d.status === 'pending')
            .map(d => d.id);

        for (const id of pendingIds) {
            await rejectChange(id, reason);
        }
    }, [pendingDiffs, rejectChange]);

    // Panel controls
    const openDiffPanel = useCallback(() => setIsOpen(true), []);
    const closeDiffPanel = useCallback(() => {
        setIsOpen(false);
        // Clear completed diffs from state
        setPendingDiffs(prev => prev.filter(d => d.status === 'pending'));
    }, []);

    // Cleanup old cache entries periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            for (const [id, record] of diffCacheRef.current.entries()) {
                if (record.createdAt < oneHourAgo) {
                    diffCacheRef.current.delete(id);
                }
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return {
        // State
        isOpen,
        pendingDiffs,
        currentDiffId,
        isLoading,
        error,

        // Actions
        openDiffPanel,
        closeDiffPanel,
        proposeDiff,
        applyChange,
        rejectChange,
        applyAll,
        rejectAll,
        refreshPendingDiffs
    };
}

export default useDiffManager;
