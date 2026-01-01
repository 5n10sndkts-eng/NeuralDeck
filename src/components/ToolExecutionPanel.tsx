import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolExecution, ToolOutputChunk } from '../types';

interface ToolExecutionPanelProps {
    executions: Map<string, ToolExecution>;
    selectedExecutionId: string | null;
    onSelectExecution: (id: string | null) => void;
    onClose: () => void;
}

export const ToolExecutionPanel: React.FC<ToolExecutionPanelProps> = ({
    executions,
    selectedExecutionId,
    onSelectExecution,
    onClose,
}) => {
    const outputRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    const executionArray = Array.from(executions.values() as Iterable<ToolExecution>);
    const selectedExecution = selectedExecutionId
        ? executions.get(selectedExecutionId)
        : executionArray[0];

    // Auto-scroll to bottom when new output arrives
    useEffect(() => {
        if (autoScroll && outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [selectedExecution?.output, autoScroll]);

    // Handle scroll to detect if user scrolled up
    const handleScroll = () => {
        if (!outputRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setAutoScroll(isAtBottom);
    };

    const copyToClipboard = async () => {
        if (!selectedExecution) return;
        const text = selectedExecution.output.map(c => c.content).join('');
        await navigator.clipboard.writeText(text);
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    if (executionArray.length === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`fixed right-0 top-0 h-full z-50 ${isMinimized ? 'w-12' : 'w-[400px]'}`}
                style={{
                    background: 'linear-gradient(180deg, rgba(5, 5, 5, 0.98) 0%, rgba(10, 10, 20, 0.98) 100%)',
                    borderLeft: '1px solid rgba(0, 240, 255, 0.3)',
                    boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Minimized state */}
                {isMinimized ? (
                    <div className="h-full flex flex-col items-center py-4">
                        <button
                            onClick={() => setIsMinimized(false)}
                            className="p-2 text-cyber-cyan hover:bg-cyber-cyan/10 rounded transition-colors"
                            title="Expand Panel"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>

                        {/* Execution count badge */}
                        <div className="mt-4 w-8 h-8 rounded-full bg-cyber-cyan/20 border border-cyber-cyan/50 flex items-center justify-center">
                            <span className="text-cyber-cyan text-sm font-mono">{executionArray.length}</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-cyan/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
                                <span className="text-sm font-mono text-gray-400 tracking-wider">TOOL_EXECUTION</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    className="p-1 text-gray-400 hover:text-cyber-cyan transition-colors"
                                    title="Minimize"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                    title="Close"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Tabs for multiple executions */}
                        {executionArray.length > 1 && (
                            <div className="flex overflow-x-auto border-b border-gray-800 bg-black/30">
                                {executionArray.map(exec => (
                                    <button
                                        key={exec.id}
                                        onClick={() => onSelectExecution(exec.id)}
                                        className={`flex items-center gap-2 px-3 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors ${
                                            selectedExecution?.id === exec.id
                                                ? 'border-cyber-cyan text-cyber-cyan bg-cyber-cyan/5'
                                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        <StatusDot status={exec.status} />
                                        <span className="max-w-[100px] truncate">{exec.toolName}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Tool info header */}
                        {selectedExecution && (
                            <div className="px-4 py-3 border-b border-gray-800 bg-black/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <StatusDot status={selectedExecution.status} size="lg" />
                                            <span className="text-white font-mono text-sm">{selectedExecution.toolName}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                                            Agent: {selectedExecution.agentId}
                                            {selectedExecution.duration && ` • ${formatDuration(selectedExecution.duration)}`}
                                        </div>
                                    </div>

                                    <button
                                        onClick={copyToClipboard}
                                        className="p-2 text-gray-400 hover:text-cyber-cyan transition-colors"
                                        title="Copy output"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                                            <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Output terminal */}
                        <div
                            ref={outputRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto font-mono text-xs p-4"
                            style={{
                                height: 'calc(100% - 150px)',
                                background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
                            }}
                        >
                            {selectedExecution ? (
                                <div className="space-y-0">
                                    {selectedExecution.output.map((chunk, index) => (
                                        <OutputLine key={index} chunk={chunk} />
                                    ))}

                                    {selectedExecution.status === 'executing' && (
                                        <div className="flex items-center gap-2 text-cyber-cyan animate-pulse mt-2">
                                            <span className="inline-block w-2 h-4 bg-cyber-cyan" />
                                        </div>
                                    )}

                                    {selectedExecution.status === 'error' && selectedExecution.error && (
                                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400">
                                            <div className="font-bold mb-1">Error:</div>
                                            {selectedExecution.error}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <span className="text-sm">No active tool executions</span>
                                </div>
                            )}
                        </div>

                        {/* Footer status bar */}
                        <div className="absolute bottom-0 left-0 right-0 px-4 py-2 border-t border-gray-800 bg-black/50">
                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                                <span>
                                    {selectedExecution?.output.length || 0} lines •
                                    {autoScroll ? ' Auto-scroll ON' : ' Auto-scroll OFF'}
                                </span>
                                <span>
                                    {executionArray.length} active execution{executionArray.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Scanline effect */}
                        <div
                            className="absolute inset-0 pointer-events-none opacity-5"
                            style={{
                                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.03) 2px, rgba(0, 240, 255, 0.03) 4px)',
                            }}
                        />
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

// Status dot component
const StatusDot: React.FC<{ status: string; size?: 'sm' | 'lg' }> = ({ status, size = 'sm' }) => {
    const sizeClass = size === 'lg' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5';

    const colorClass = {
        executing: 'bg-cyber-cyan animate-pulse',
        success: 'bg-green-400',
        error: 'bg-red-400',
        idle: 'bg-gray-500',
    }[status] || 'bg-gray-500';

    return <div className={`${sizeClass} rounded-full ${colorClass}`} />;
};

// Output line component with syntax highlighting
const OutputLine: React.FC<{ chunk: ToolOutputChunk }> = ({ chunk }) => {
    const isStderr = chunk.stream === 'stderr';

    // Simple syntax highlighting
    const highlightLine = (content: string) => {
        // Error patterns
        if (content.match(/error|Error|ERROR|failed|Failed|FAILED/)) {
            return <span className="text-red-400">{content}</span>;
        }
        // Success patterns
        if (content.match(/success|Success|SUCCESS|✓|done|Done|DONE|passed|Passed/)) {
            return <span className="text-green-400">{content}</span>;
        }
        // Warning patterns
        if (content.match(/warning|Warning|WARNING|⚠/)) {
            return <span className="text-yellow-400">{content}</span>;
        }
        // Command prompts
        if (content.startsWith('$') || content.startsWith('>')) {
            return <span className="text-cyber-cyan">{content}</span>;
        }
        // Numbers/metrics
        if (content.match(/^\d+(\.\d+)?%/) || content.match(/\d+ms|\d+s/)) {
            return <span className="text-purple-400">{content}</span>;
        }

        return content;
    };

    return (
        <div className={`leading-5 ${isStderr ? 'text-red-300' : 'text-gray-300'}`}>
            {chunk.content.split('\n').map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all">
                    {highlightLine(line)}
                </div>
            ))}
        </div>
    );
};

export default ToolExecutionPanel;
