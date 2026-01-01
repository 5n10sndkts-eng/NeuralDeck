/**
 * RAG Status Panel Component - Story 6.1: Task 7
 * Premium Cyberpunk 2077 HUD styling
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRAGStatus, RAGSearchResult } from '../hooks/useRAGStatus';
import { Database, RefreshCw, Search, Zap } from 'lucide-react';

interface RAGStatusPanelProps {
    className?: string;
    compact?: boolean;
}

export const RAGStatusPanel: React.FC<RAGStatusPanelProps> = ({
    className = '',
    compact = false
}) => {
    const {
        stats,
        isLoading,
        error,
        isOnline,
        isIndexing,
        progress,
        refreshStats,
        search,
        triggerReindex
    } = useRAGStatus();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<RAGSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setShowResults(true);

        try {
            const result = await search(searchQuery, 5);
            setSearchResults(result?.results || []);
        } finally {
            setIsSearching(false);
        }
    };

    const handleReindex = async () => {
        const success = await triggerReindex();
        if (success) {
            setSearchResults([]);
            setShowResults(false);
        }
    };

    // Compact view for sidebar/header
    if (compact) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                        backgroundColor: isOnline
                            ? isIndexing ? '#ffd000' : '#0aff0a'
                            : '#ff003c',
                        boxShadow: `0 0 8px ${isOnline ? (isIndexing ? '#ffd000' : '#0aff0a') : '#ff003c'}`,
                        animation: isIndexing ? 'pulse 1.5s ease-in-out infinite' : 'none'
                    }}
                />
                <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'rgba(255, 255, 255, 0.5)'
                    }}
                >
                    RAG: {isOnline ? `${stats?.rag.chunkCount || 0} chunks` : 'Offline'}
                </span>
            </div>
        );
    }

    // Full panel view
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-lg ${className}`}
            style={{
                background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.9) 0%, rgba(5, 5, 12, 0.95) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.12)',
                backdropFilter: 'blur(16px)'
            }}
        >
            {/* Corner Brackets */}
            <svg className="absolute top-0 left-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M0 10 L0 0 L10 0" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1" />
            </svg>
            <svg className="absolute top-0 right-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M2 0 L12 0 L12 10" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M0 2 L0 12 L10 12" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" viewBox="0 0 12 12">
                <path d="M2 12 L12 12 L12 2" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1" />
            </svg>

            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                    borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
                    background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.03) 0%, transparent 50%, rgba(0, 240, 255, 0.03) 100%)'
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                            backgroundColor: isOnline
                                ? isIndexing ? '#ffd000' : '#0aff0a'
                                : '#ff003c',
                            boxShadow: `0 0 10px ${isOnline ? (isIndexing ? '#ffd000' : '#0aff0a') : '#ff003c'}`,
                            animation: isIndexing ? 'pulse 1.5s ease-in-out infinite' : 'none'
                        }}
                    />
                    <h3
                        className="text-xs font-bold uppercase tracking-[0.2em]"
                        style={{
                            fontFamily: 'var(--font-display)',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}
                    >
                        RAG Engine
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshStats}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider transition-all hover:text-white disabled:opacity-50"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            color: '#00f0ff'
                        }}
                    >
                        <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={handleReindex}
                        disabled={isIndexing || !isOnline}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider transition-all hover:text-white disabled:opacity-50"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            color: '#bc13fe'
                        }}
                    >
                        <Database size={10} />
                        Reindex
                    </button>
                </div>
            </div>

            {/* Status Display */}
            <div className="p-4">
                {isLoading && !stats ? (
                    <div className="text-center py-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Loading RAG status...
                    </div>
                ) : error ? (
                    <div className="text-center py-4" style={{ color: '#ff003c' }}>
                        {error}
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <StatItem label="Files" value={stats?.rag.fileCount || 0} icon={<Database size={14} />} />
                            <StatItem label="Chunks" value={stats?.rag.chunkCount || 0} icon={<Zap size={14} />} />
                            <StatItem
                                label="Memory"
                                value={`${Math.round((stats?.rag.memoryUsage.heapUsed || 0) / 1024 / 1024)}MB`}
                                icon={<Database size={14} />}
                            />
                            <StatItem
                                label="Status"
                                value={isIndexing ? 'Indexing' : isOnline ? 'Ready' : 'Offline'}
                                icon={<Zap size={14} />}
                                status={isIndexing ? 'warning' : isOnline ? 'active' : 'error'}
                            />
                        </div>

                        {/* Indexing Progress */}
                        {isIndexing && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-[10px] mb-1.5" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.5)' }}>
                                    <span>Indexing Progress</span>
                                    <span style={{ color: '#00f0ff' }}>{progress}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full rounded-full"
                                        style={{
                                            background: 'linear-gradient(90deg, #00f0ff, #bc13fe)',
                                            boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Search Interface */}
                        <form onSubmit={handleSearch} className="mt-4">
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0, 240, 255, 0.4)' }} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search codebase..."
                                        disabled={!isOnline}
                                        className="w-full pl-9 pr-3 py-2 text-sm rounded transition-all focus:outline-none"
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(0, 240, 255, 0.15)',
                                            color: '#00f0ff',
                                            fontFamily: 'var(--font-mono)'
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!isOnline || isSearching || !searchQuery.trim()}
                                    className="px-4 py-2 rounded text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
                                        border: '1px solid rgba(0, 240, 255, 0.3)',
                                        color: '#00f0ff'
                                    }}
                                >
                                    {isSearching ? '...' : 'Search'}
                                </button>
                            </div>
                        </form>

                        {/* Search Results */}
                        {showResults && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.4)' }}>
                                        {isSearching ? 'Searching...' : `${searchResults.length} results`}
                                    </span>
                                    {searchResults.length > 0 && (
                                        <button
                                            onClick={() => { setShowResults(false); setSearchResults([]); }}
                                            className="text-[10px] transition-colors hover:text-white"
                                            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.3)' }}
                                        >
                                            [CLEAR]
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                                    {searchResults.map((result, i) => (
                                        <SearchResultItem key={i} result={result} />
                                    ))}
                                    {!isSearching && searchResults.length === 0 && (
                                        <div className="text-center py-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                            No results found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Last Updated */}
                        {stats?.indexer?.lastUpdated && (
                            <div className="mt-4 text-center text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.25)' }}>
                                Last indexed: {new Date(stats.indexer.lastUpdated).toLocaleString()}
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </motion.div>
    );
};

// Sub-components
interface StatItemProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    status?: 'active' | 'warning' | 'error';
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon, status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'active': return '#0aff0a';
            case 'warning': return '#ffd000';
            case 'error': return '#ff003c';
            default: return '#00f0ff';
        }
    };

    return (
        <div
            className="relative rounded-lg p-3 text-center overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
        >
            <div className="mb-1.5" style={{ color: getStatusColor() }}>
                {icon}
            </div>
            <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'white' }}>
                {value}
            </div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                {label}
            </div>
        </div>
    );
};

interface SearchResultItemProps {
    result: RAGSearchResult;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result }) => (
    <div
        className="rounded-lg p-3 transition-all hover:border-cyan-500/30"
        style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
    >
        <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] truncate max-w-[60%]" style={{ fontFamily: 'var(--font-mono)', color: '#00f0ff' }}>
                {result.source}
            </span>
            <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.4)' }}>
                {(result.score * 100).toFixed(0)}% match
            </span>
        </div>
        <pre
            className="text-xs overflow-x-auto whitespace-pre-wrap max-h-20 overflow-y-auto custom-scrollbar"
            style={{ color: 'rgba(255, 255, 255, 0.6)' }}
        >
            {result.content.substring(0, 300)}
            {result.content.length > 300 && '...'}
        </pre>
    </div>
);

export default RAGStatusPanel;
