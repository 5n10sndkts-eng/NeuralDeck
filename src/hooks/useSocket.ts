import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { LogEntry, NeuralPhase } from './useNeuralAutonomy'; // Reuse types for now
import { AgentProfile, AgentNodeState, VulnerabilityFinding, SecurityReport, VulnerabilitySeverity } from '../types';

// --- SWARM EVENT TYPES (Story 4-2) ---

export interface SwarmStartedEvent {
    executionId: string;
    storyIds: string[];
    timestamp: number;
}

export interface SwarmNodeStartedEvent {
    executionId: string;
    nodeId: string;
    storyId: string;
    storyTitle: string;
    timestamp: number;
}

export interface SwarmNodeProgressEvent {
    executionId: string;
    nodeId: string;
    storyId: string;
    state: AgentNodeState;
    progress: number;
    timestamp: number;
}

export interface SwarmNodeCompletedEvent {
    executionId: string;
    nodeId: string;
    storyId: string;
    status: 'success' | 'error' | 'timeout';
    duration: number;
    error?: string;
    timestamp: number;
}

export interface SwarmProgressEvent {
    executionId: string;
    completed: number;
    total: number;
    timestamp: number;
}

export interface SwarmCompletedEvent {
    executionId: string;
    status: 'completed' | 'partial' | 'failed';
    successCount: number;
    failureCount: number;
    totalDuration: number;
    parallelismVerified: boolean;
    timestamp: number;
}

export interface SwarmCancelledEvent {
    executionId: string;
    timestamp: number;
}

// --- CONFLICT EVENT TYPES (Story 4-3) ---

export interface ConflictDetectedEvent {
    conflictId: string;
    filePath: string;
    developerA: string;
    developerB: string;
    timestamp: number;
}

export interface ConflictResolvedEvent {
    conflictId: string;
    filePath: string;
    method: 'auto' | 'manual' | 'append' | 'replace' | 'combine';
    timestamp: number;
}

export interface ConflictFailedEvent {
    conflictId: string;
    filePath: string;
    error: string;
    timestamp: number;
}

export type ConflictStatus = 'pending' | 'auto-resolving' | 'manual-required' | 'resolved' | 'failed';

export interface ConflictState {
    conflictId: string;
    filePath: string;
    developerA: string;
    developerB: string;
    status: ConflictStatus;
    createdAt: number;
}

// --- SECURITY EVENT TYPES (Story 5-3) ---

export interface SecurityScanStartedEvent {
    scanId: string;
    agents: string[];
    timestamp: number;
}

export interface SecurityFindingDiscoveredEvent {
    scanId: string;
    finding: VulnerabilityFinding;
    timestamp: number;
}

export interface SecurityFindingUpdatedEvent {
    scanId: string;
    findingId: string;
    status: 'open' | 'reviewed' | 'fixed' | 'false_positive';
    timestamp: number;
}

export interface SecurityScanCompletedEvent {
    scanId: string;
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
    };
    timestamp: number;
}

export interface SecurityScanCancelledEvent {
    scanId: string;
    timestamp: number;
}

// Security state for UI (Story 5-3)
export interface SecurityScanState {
    scanId: string | null;
    status: 'idle' | 'scanning' | 'completed' | 'cancelled' | 'failed';
    findings: VulnerabilityFinding[];
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
    };
    startTime: number | null;
    endTime: number | null;
}

const initialSecurityState: SecurityScanState = {
    scanId: null,
    status: 'idle',
    findings: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    startTime: null,
    endTime: null,
};

// Swarm execution state for UI
export interface SwarmExecutionState {
    executionId: string | null;
    status: 'idle' | 'running' | 'completed' | 'partial' | 'failed' | 'cancelled';
    nodeStates: Map<string, { storyId: string; state: AgentNodeState; progress: number }>;
    progress: { completed: number; total: number };
    startTime: number | null;
    endTime: number | null;
    totalDuration: number | null;
    parallelismVerified: boolean | null;
}

const initialSwarmState: SwarmExecutionState = {
    executionId: null,
    status: 'idle',
    nodeStates: new Map(),
    progress: { completed: 0, total: 0 },
    startTime: null,
    endTime: null,
    totalDuration: null,
    parallelismVerified: null,
};

// Conflict state for UI (Story 4-3)
export interface ConflictManagerState {
    conflicts: Map<string, ConflictState>;
    pendingCount: number;
    resolvedCount: number;
    lastConflict: ConflictState | null;
}

const initialConflictState: ConflictManagerState = {
    conflicts: new Map(),
    pendingCount: 0,
    resolvedCount: 0,
    lastConflict: null,
};

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Neural State
    const [phase, setPhase] = useState<NeuralPhase>('idle');
    const [activeAgents, setActiveAgents] = useState<AgentProfile[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [currentThought, setCurrentThought] = useState<string>('');

    // Swarm Execution State (Story 4-2)
    const [swarmState, setSwarmState] = useState<SwarmExecutionState>(initialSwarmState);

    // Conflict State (Story 4-3)
    const [conflictState, setConflictState] = useState<ConflictManagerState>(initialConflictState);

    // Security Scan State (Story 5-3)
    const [securityState, setSecurityState] = useState<SecurityScanState>(initialSecurityState);

    useEffect(() => {
        // Connect to backend
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
        const s = io(socketUrl);

        s.on('connect', () => {
            setIsConnected(true);
            s.emit('cmd:get_status'); // Request initial state if we implemented that
        });

        s.on('disconnect', () => setIsConnected(false));

        // --- LISTENERS ---

        s.on('phase:update', (agentId: string) => {
            // Map agentId to Phase strictly
            // logic mirrored from server or just simplified
            let newPhase: NeuralPhase = 'idle';
            if (agentId === 'analyst') newPhase = 'analysis';
            if (agentId === 'pm' || agentId === 'sm') newPhase = 'planning';
            if (agentId === 'architect') newPhase = 'architecture';
            if (agentId === 'swarm') newPhase = 'implementation';

            setPhase(newPhase);
            setActiveAgents([agentId as AgentProfile]);
        });

        s.on('agent:log', (entry: { msg: string, type: any }) => {
            setLogs(prev => [{ ...entry, timestamp: Date.now() } as LogEntry, ...prev]);
        });

        s.on('agent:thought', (data: { agent: string, text: string }) => {
            setCurrentThought(`${data.agent}: ${data.text}`);
        });

        s.on('status:auto', (val: boolean) => {
            setIsAutoMode(val);
        });

        // --- SWARM EVENT LISTENERS (Story 4-2) ---

        s.on('swarm:started', (event: SwarmStartedEvent) => {
            console.log('[useSocket] Swarm started:', event.executionId);
            setSwarmState({
                executionId: event.executionId,
                status: 'running',
                nodeStates: new Map(),
                progress: { completed: 0, total: event.storyIds.length },
                startTime: event.timestamp,
                endTime: null,
                totalDuration: null,
                parallelismVerified: null,
            });
        });

        s.on('swarm:node-started', (event: SwarmNodeStartedEvent) => {
            console.log('[useSocket] Swarm node started:', event.nodeId);
            setSwarmState(prev => {
                const newNodeStates = new Map(prev.nodeStates);
                newNodeStates.set(event.nodeId, {
                    storyId: event.storyId,
                    state: 'THINKING',
                    progress: 0,
                });
                return { ...prev, nodeStates: newNodeStates };
            });
        });

        s.on('swarm:node-progress', (event: SwarmNodeProgressEvent) => {
            setSwarmState(prev => {
                const newNodeStates = new Map(prev.nodeStates);
                newNodeStates.set(event.nodeId, {
                    storyId: event.storyId,
                    state: event.state,
                    progress: event.progress,
                });
                return { ...prev, nodeStates: newNodeStates };
            });
        });

        s.on('swarm:node-completed', (event: SwarmNodeCompletedEvent) => {
            console.log('[useSocket] Swarm node completed:', event.nodeId, event.status);
            setSwarmState(prev => {
                const newNodeStates = new Map(prev.nodeStates);
                newNodeStates.set(event.nodeId, {
                    storyId: event.storyId,
                    state: event.status === 'success' ? 'DONE' : 'IDLE',
                    progress: event.status === 'success' ? 100 : 0,
                });
                return { ...prev, nodeStates: newNodeStates };
            });
        });

        s.on('swarm:progress', (event: SwarmProgressEvent) => {
            setSwarmState(prev => ({
                ...prev,
                progress: { completed: event.completed, total: event.total },
            }));
        });

        s.on('swarm:completed', (event: SwarmCompletedEvent) => {
            console.log('[useSocket] Swarm completed:', event.executionId, event.status);
            setSwarmState(prev => ({
                ...prev,
                status: event.status,
                endTime: event.timestamp,
                totalDuration: event.totalDuration,
                parallelismVerified: event.parallelismVerified,
            }));
        });

        s.on('swarm:cancelled', (event: SwarmCancelledEvent) => {
            console.log('[useSocket] Swarm cancelled:', event.executionId);
            setSwarmState(prev => ({
                ...prev,
                status: 'cancelled',
                endTime: event.timestamp,
            }));
        });

        // --- CONFLICT EVENT LISTENERS (Story 4-3) ---

        s.on('conflict:detected', (event: ConflictDetectedEvent) => {
            console.log('[useSocket] Conflict detected:', event.conflictId);
            setConflictState(prev => {
                const newConflicts = new Map(prev.conflicts);
                const conflict: ConflictState = {
                    conflictId: event.conflictId,
                    filePath: event.filePath,
                    developerA: event.developerA,
                    developerB: event.developerB,
                    status: 'pending',
                    createdAt: event.timestamp,
                };
                newConflicts.set(event.conflictId, conflict);
                return {
                    ...prev,
                    conflicts: newConflicts,
                    pendingCount: prev.pendingCount + 1,
                    lastConflict: conflict,
                };
            });
        });

        s.on('conflict:resolved', (event: ConflictResolvedEvent) => {
            console.log('[useSocket] Conflict resolved:', event.conflictId);
            setConflictState(prev => {
                const newConflicts = new Map<string, ConflictState>(prev.conflicts);
                const existing = newConflicts.get(event.conflictId);
                if (existing) {
                    newConflicts.set(event.conflictId, { ...existing, status: 'resolved' as ConflictStatus });
                }
                return {
                    ...prev,
                    conflicts: newConflicts,
                    pendingCount: Math.max(0, prev.pendingCount - 1),
                    resolvedCount: prev.resolvedCount + 1,
                };
            });
        });

        s.on('conflict:failed', (event: ConflictFailedEvent) => {
            console.log('[useSocket] Conflict failed:', event.conflictId, event.error);
            setConflictState(prev => {
                const newConflicts = new Map<string, ConflictState>(prev.conflicts);
                const existing = newConflicts.get(event.conflictId);
                if (existing) {
                    newConflicts.set(event.conflictId, { ...existing, status: 'failed' as ConflictStatus });
                }
                return {
                    ...prev,
                    conflicts: newConflicts,
                    pendingCount: Math.max(0, prev.pendingCount - 1),
                };
            });
        });

        // --- SECURITY EVENT LISTENERS (Story 5-3) ---

        s.on('security:scan-started', (event: SecurityScanStartedEvent) => {
            console.log('[useSocket] Security scan started:', event.scanId);
            setSecurityState({
                scanId: event.scanId,
                status: 'scanning',
                findings: [],
                summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
                startTime: event.timestamp,
                endTime: null,
            });
        });

        s.on('security:finding-discovered', (event: SecurityFindingDiscoveredEvent) => {
            console.log('[useSocket] Security finding discovered:', event.finding.id);
            setSecurityState(prev => {
                const newFindings = [...prev.findings, event.finding];
                const newSummary = { ...prev.summary };

                // Update summary counts
                switch (event.finding.severity) {
                    case 'Critical': newSummary.critical++; break;
                    case 'High': newSummary.high++; break;
                    case 'Medium': newSummary.medium++; break;
                    case 'Low': newSummary.low++; break;
                }
                newSummary.total++;

                return {
                    ...prev,
                    findings: newFindings,
                    summary: newSummary,
                };
            });

            // Notify ThreatDashboard if it's open
            if ((window as any).__threatDashboardAddFinding) {
                (window as any).__threatDashboardAddFinding(event.finding);
            }
        });

        s.on('security:finding-updated', (event: SecurityFindingUpdatedEvent) => {
            console.log('[useSocket] Security finding updated:', event.findingId, event.status);
            setSecurityState(prev => ({
                ...prev,
                findings: prev.findings.map(f =>
                    f.id === event.findingId ? { ...f, status: event.status } : f
                ),
            }));
        });

        s.on('security:scan-completed', (event: SecurityScanCompletedEvent) => {
            console.log('[useSocket] Security scan completed:', event.scanId);
            setSecurityState(prev => ({
                ...prev,
                status: 'completed',
                summary: event.summary,
                endTime: event.timestamp,
            }));
        });

        s.on('security:scan-cancelled', (event: SecurityScanCancelledEvent) => {
            console.log('[useSocket] Security scan cancelled:', event.scanId);
            setSecurityState(prev => ({
                ...prev,
                status: 'cancelled',
                endTime: event.timestamp,
            }));
        });

        setSocket(s);

        return () => {
            s.disconnect();
        };
    }, []);

    const toggleAuto = useCallback(() => {
        if (socket) {
            socket.emit('cmd:toggle_auto', !isAutoMode);
            // Optimistic update
            setIsAutoMode(!isAutoMode);
        }
    }, [socket, isAutoMode]);

    // Swarm execution controls (Story 4-2)
    const startSwarmExecution = useCallback(async (storyIds: string[]) => {
        try {
            const response = await fetch('/api/swarm/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyIds }),
            });
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to start swarm execution:', error);
            return null;
        }
    }, []);

    const cancelSwarmExecution = useCallback(async (executionId: string) => {
        try {
            const response = await fetch(`/api/swarm/cancel/${executionId}`, {
                method: 'POST',
            });
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to cancel swarm execution:', error);
            return null;
        }
    }, []);

    const resetSwarmState = useCallback(() => {
        setSwarmState(initialSwarmState);
    }, []);

    // Conflict control functions (Story 4-3)
    const resolveConflictAuto = useCallback(async (conflictId: string) => {
        try {
            const response = await fetch(`/api/conflicts/${conflictId}/auto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to auto-resolve conflict:', error);
            return null;
        }
    }, []);

    const resolveConflictManually = useCallback(async (conflictId: string, resolvedContent: string) => {
        try {
            const response = await fetch(`/api/conflicts/${conflictId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resolvedContent }),
            });
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to manually resolve conflict:', error);
            return null;
        }
    }, []);

    const getConflicts = useCallback(async () => {
        try {
            const response = await fetch('/api/conflicts');
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to get conflicts:', error);
            return { conflicts: [], total: 0 };
        }
    }, []);

    const resetConflictState = useCallback(() => {
        setConflictState(initialConflictState);
    }, []);

    // Security scan control functions (Story 5-3)
    const startSecurityScan = useCallback(async (targetPaths?: string[]) => {
        try {
            const response = await fetch('/api/security/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPaths }),
            });
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to start security scan:', error);
            return null;
        }
    }, []);

    const cancelSecurityScan = useCallback(async (scanId: string) => {
        try {
            const response = await fetch(`/api/security/scan/${scanId}/cancel`, {
                method: 'POST',
            });
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to cancel security scan:', error);
            return null;
        }
    }, []);

    const getSecurityFindings = useCallback(async (scanId: string) => {
        try {
            const response = await fetch(`/api/security/findings/${scanId}`);
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to get security findings:', error);
            return { findings: [] };
        }
    }, []);

    const getSecurityReport = useCallback(async (scanId: string) => {
        try {
            const response = await fetch(`/api/security/report/${scanId}`);
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to get security report:', error);
            return null;
        }
    }, []);

    const updateFindingStatus = useCallback(async (
        scanId: string,
        findingId: string,
        status: 'open' | 'reviewed' | 'fixed' | 'false_positive'
    ) => {
        try {
            const response = await fetch(`/api/security/findings/${scanId}/${findingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            return await response.json();
        } catch (error) {
            console.error('[useSocket] Failed to update finding status:', error);
            return null;
        }
    }, []);

    const resetSecurityState = useCallback(() => {
        setSecurityState(initialSecurityState);
    }, []);

    return {
        socket,
        isConnected,
        phase,
        activeAgents,
        logs,
        isAutoMode,
        toggleAuto,
        currentThought,

        // Swarm execution (Story 4-2)
        swarmState,
        startSwarmExecution,
        cancelSwarmExecution,
        resetSwarmState,

        // Conflict resolution (Story 4-3)
        conflictState,
        resolveConflictAuto,
        resolveConflictManually,
        getConflicts,
        resetConflictState,

        // Security scanning (Story 5-3)
        securityState,
        startSecurityScan,
        cancelSecurityScan,
        getSecurityFindings,
        getSecurityReport,
        updateFindingStatus,
        resetSecurityState,
    };
};
