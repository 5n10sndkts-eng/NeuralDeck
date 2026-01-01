import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import {
    ToolExecution,
    ToolHistoryEntry,
    ToolExecutionState,
    ToolStartedEvent,
    ToolOutputEvent,
    ToolCompletedEvent,
    ToolOutputChunk,
} from '../types';

const MAX_HISTORY_PER_AGENT = 10;
const OUTPUT_PREVIEW_LENGTH = 200;

interface UseToolExecutionReturn {
    // Active executions (currently running)
    activeExecutions: Map<string, ToolExecution>;
    // History per agent (last 10 completed)
    toolHistory: Map<string, ToolHistoryEntry[]>;
    // Selected execution for detailed view
    selectedExecution: ToolExecution | null;
    // Actions
    selectExecution: (executionId: string | null) => void;
    getAgentHistory: (agentId: string) => ToolHistoryEntry[];
    getActiveExecution: (agentId: string) => ToolExecution | undefined;
    isAgentExecuting: (agentId: string) => boolean;
    // Mock trigger for testing
    triggerMockExecution: (agentId: string, toolName: string) => void;
}

export const useToolExecution = (): UseToolExecutionReturn => {
    const { socket } = useSocket();

    // Active tool executions (keyed by executionId)
    const [activeExecutions, setActiveExecutions] = useState<Map<string, ToolExecution>>(new Map());

    // Tool history per agent (keyed by agentId)
    const [toolHistory, setToolHistory] = useState<Map<string, ToolHistoryEntry[]>>(new Map());

    // Currently selected execution for detailed view
    const [selectedExecution, setSelectedExecution] = useState<ToolExecution | null>(null);

    // Ref to track execution by agent for quick lookup
    const agentExecutionMap = useRef<Map<string, string>>(new Map());

    // Handle tool:started event
    const handleToolStarted = useCallback((event: ToolStartedEvent) => {
        const execution: ToolExecution = {
            id: event.executionId,
            agentId: event.agentId,
            toolName: event.toolName,
            status: 'executing',
            output: [],
            startTime: event.timestamp,
            arguments: event.arguments,
        };

        setActiveExecutions(prev => {
            const next = new Map(prev);
            next.set(event.executionId, execution);
            return next;
        });

        agentExecutionMap.current.set(event.agentId, event.executionId);

        console.log(`[TOOL] Started: ${event.toolName} for agent ${event.agentId}`);
    }, []);

    // Handle tool:output event
    const handleToolOutput = useCallback((event: ToolOutputEvent) => {
        const chunk: ToolOutputChunk = {
            stream: event.stream,
            content: event.output,
            timestamp: event.timestamp,
            sequenceNumber: event.sequenceNumber,
        };

        setActiveExecutions(prev => {
            const next = new Map<string, ToolExecution>(prev);
            const execution = next.get(event.executionId);

            if (execution) {
                const updatedExecution: ToolExecution = {
                    ...execution,
                    output: [...(execution.output || []), chunk],
                };
                next.set(event.executionId, updatedExecution);

                // Update selected execution if it's the one being viewed
                if (selectedExecution?.id === event.executionId) {
                    setSelectedExecution(updatedExecution);
                }
            }

            return next;
        });
    }, [selectedExecution]);

    // Handle tool:completed event
    const handleToolCompleted = useCallback((event: ToolCompletedEvent) => {
        setActiveExecutions(prev => {
            const next = new Map<string, ToolExecution>(prev);
            const execution = next.get(event.executionId);

            if (execution) {
                // Create history entry
                const outputArray = execution.output || [];
                const fullOutput = outputArray
                    .map((chunk: ToolOutputChunk) => chunk.content)
                    .join('');

                const historyEntry: ToolHistoryEntry = {
                    id: execution.id,
                    agentId: execution.agentId,
                    toolName: execution.toolName,
                    status: event.status,
                    timestamp: execution.startTime,
                    duration: event.duration,
                    exitCode: event.exitCode,
                    outputPreview: fullOutput.slice(0, OUTPUT_PREVIEW_LENGTH),
                    fullOutput,
                };

                // Add to history
                setToolHistory(prevHistory => {
                    const nextHistory = new Map<string, ToolHistoryEntry[]>(prevHistory);
                    const agentHistory = nextHistory.get(event.agentId) || [];

                    // Add new entry at the beginning, keep only last MAX_HISTORY_PER_AGENT
                    const updatedHistory = [historyEntry, ...agentHistory].slice(0, MAX_HISTORY_PER_AGENT);
                    nextHistory.set(event.agentId, updatedHistory);

                    return nextHistory;
                });

                // Remove from active executions
                next.delete(event.executionId);
                agentExecutionMap.current.delete(event.agentId);

                console.log(`[TOOL] Completed: ${execution.toolName} - ${event.status} (${event.duration}ms)`);
            }

            return next;
        });

        // Clear selected if it was this execution
        if (selectedExecution?.id === event.executionId) {
            setSelectedExecution(null);
        }
    }, [selectedExecution]);

    // Subscribe to WebSocket events
    useEffect(() => {
        if (!socket) return;

        socket.on('tool:started', handleToolStarted);
        socket.on('tool:output', handleToolOutput);
        socket.on('tool:completed', handleToolCompleted);

        return () => {
            socket.off('tool:started', handleToolStarted);
            socket.off('tool:output', handleToolOutput);
            socket.off('tool:completed', handleToolCompleted);
        };
    }, [socket, handleToolStarted, handleToolOutput, handleToolCompleted]);

    // Select an execution for detailed view
    const selectExecution = useCallback((executionId: string | null) => {
        if (executionId === null) {
            setSelectedExecution(null);
            return;
        }

        const execution = activeExecutions.get(executionId);
        if (execution) {
            setSelectedExecution(execution);
        } else {
            // Check history for completed executions
            for (const history of toolHistory.values()) {
                const entry = history.find(h => h.id === executionId);
                if (entry) {
                    // Convert history entry back to execution format for viewing
                    setSelectedExecution({
                        id: entry.id,
                        agentId: entry.agentId,
                        toolName: entry.toolName,
                        status: entry.status,
                        output: [{
                            stream: 'stdout',
                            content: entry.fullOutput,
                            timestamp: entry.timestamp,
                        }],
                        startTime: entry.timestamp,
                        duration: entry.duration,
                        exitCode: entry.exitCode,
                    });
                    return;
                }
            }
        }
    }, [activeExecutions, toolHistory]);

    // Get history for a specific agent
    const getAgentHistory = useCallback((agentId: string): ToolHistoryEntry[] => {
        return toolHistory.get(agentId) || [];
    }, [toolHistory]);

    // Get active execution for an agent
    const getActiveExecution = useCallback((agentId: string): ToolExecution | undefined => {
        const executionId = agentExecutionMap.current.get(agentId);
        if (executionId) {
            return activeExecutions.get(executionId);
        }
        return undefined;
    }, [activeExecutions]);

    // Check if an agent is currently executing a tool
    const isAgentExecuting = useCallback((agentId: string): boolean => {
        return agentExecutionMap.current.has(agentId);
    }, []);

    // Mock execution trigger for testing (will be removed in production)
    const triggerMockExecution = useCallback((agentId: string, toolName: string) => {
        const executionId = `mock-${Date.now()}`;

        // Simulate tool:started
        handleToolStarted({
            agentId,
            toolName,
            executionId,
            timestamp: Date.now(),
            arguments: { mock: true },
        });

        // Simulate output chunks
        const outputs = [
            '$ Initializing tool execution...\n',
            '> Processing request...\n',
            '> Fetching data...\n',
            '✓ Operation completed successfully\n',
        ];

        let delay = 500;
        outputs.forEach((output, index) => {
            setTimeout(() => {
                handleToolOutput({
                    agentId,
                    toolName,
                    executionId,
                    output,
                    stream: 'stdout',
                    timestamp: Date.now(),
                    sequenceNumber: index,
                });
            }, delay);
            delay += 500;
        });

        // Simulate completion
        setTimeout(() => {
            handleToolCompleted({
                agentId,
                toolName,
                executionId,
                status: 'success',
                exitCode: 0,
                duration: delay,
                timestamp: Date.now(),
            });
        }, delay + 500);
    }, [handleToolStarted, handleToolOutput, handleToolCompleted]);

    return {
        activeExecutions,
        toolHistory,
        selectedExecution,
        selectExecution,
        getAgentHistory,
        getActiveExecution,
        isAgentExecuting,
        triggerMockExecution,
    };
};
