/**
 * useRAGStatus Hook - Story 6.1: Task 7.1 & 7.2
 * Fetches and tracks RAG service status from the backend
 */

import { useState, useEffect, useCallback } from 'react';

export interface RAGStats {
    rag: {
        fileCount: number;
        chunkCount: number;
        isInitialized: boolean;
        memoryUsage: {
            heapUsed: number;
            heapTotal: number;
        };
        config: {
            chunkSize: number;
            chunkOverlap: number;
            modelName: string;
        };
    };
    indexer: {
        totalFiles: number;
        indexedFiles: number;
        failedFiles: number;
        totalChunks: number;
        isIndexing: boolean;
        lastUpdated: number | null;
        startTime: number | null;
        endTime: number | null;
    } | null;
    timestamp: number;
}

export interface RAGSearchResult {
    content: string;
    source: string;
    score: number;
}

export interface RAGSearchResponse {
    results: RAGSearchResult[];
    stats: {
        queryTime: number;
        totalChunks: number;
        resultsReturned: number;
        query: string;
    };
}

interface UseRAGStatusReturn {
    stats: RAGStats | null;
    isLoading: boolean;
    error: string | null;
    isOnline: boolean;
    isIndexing: boolean;
    progress: number;
    refreshStats: () => Promise<void>;
    search: (query: string, k?: number) => Promise<RAGSearchResponse | null>;
    triggerReindex: () => Promise<boolean>;
}

const API_BASE = 'http://localhost:3001';
const POLL_INTERVAL = 5000; // 5 seconds

export function useRAGStatus(): UseRAGStatusReturn {
    const [stats, setStats] = useState<RAGStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Task 7.2: Fetch RAG stats from API
    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/rag/stats`);

            if (!response.ok) {
                if (response.status === 503) {
                    setError('RAG service unavailable');
                    setStats(null);
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data: RAGStats = await response.json();
            setStats(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStats(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Task 7.3: Poll for updates
    useEffect(() => {
        fetchStats();

        const interval = setInterval(fetchStats, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchStats]);

    // Task 7.4: Search function
    const search = useCallback(async (query: string, k = 5): Promise<RAGSearchResponse | null> => {
        try {
            const params = new URLSearchParams({ q: query, k: String(k) });
            const response = await fetch(`${API_BASE}/api/rag/search?${params}`);

            if (!response.ok) {
                throw new Error(`Search failed: HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.error('RAG search error:', err);
            return null;
        }
    }, []);

    // Task 7.5: Trigger reindex
    const triggerReindex = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE}/api/rag/reindex`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`Reindex failed: HTTP ${response.status}`);
            }

            // Refresh stats after triggering
            await fetchStats();
            return true;
        } catch (err) {
            console.error('RAG reindex error:', err);
            return false;
        }
    }, [fetchStats]);

    // Derived state
    const isOnline = stats?.rag?.isInitialized ?? false;
    const isIndexing = stats?.indexer?.isIndexing ?? false;

    // Calculate progress percentage
    const progress = stats?.indexer
        ? stats.indexer.totalFiles > 0
            ? Math.round((stats.indexer.indexedFiles / stats.indexer.totalFiles) * 100)
            : 0
        : 0;

    return {
        stats,
        isLoading,
        error,
        isOnline,
        isIndexing,
        progress,
        refreshStats: fetchStats,
        search,
        triggerReindex
    };
}
