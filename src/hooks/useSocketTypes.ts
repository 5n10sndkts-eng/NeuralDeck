import { AgentNodeState, VulnerabilityFinding } from '../types';

// --- CONNECTION STATE TYPES (Story 6-6) ---

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'stale';

export interface ConnectionInfo {
    state: ConnectionState;
    reconnectAttempt: number;
    lastConnectedAt: number | null;
    disconnectedAt: number | null;
    reconnectCountdown: number | null;
}

// --- DELTA UPDATE TYPES (Story 6-6) ---

export interface Delta<T> {
    version: number;
    timestamp: number;
    changes: Partial<T>;
    removals: string[];
}

export interface VersionedState {
    version: number;
    timestamp: number;
}

export function applyDelta<T extends object>(state: T, delta: Delta<Partial<T>>): T {
    const newState = { ...state };
    if (delta.changes) {
        Object.assign(newState, delta.changes);
    }
    if (delta.removals) {
        for (const key of delta.removals) {
            delete (newState as Record<string, unknown>)[key];
        }
    }
    return newState;
}

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

// --- AGGREGATE STATE TYPES ---

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

export interface ConflictManagerState {
    conflicts: Map<string, ConflictState>;
    pendingCount: number;
    resolvedCount: number;
    lastConflict: ConflictState | null;
}

// --- INITIAL STATES ---

export const initialSecurityState: SecurityScanState = {
    scanId: null,
    status: 'idle',
    findings: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    startTime: null,
    endTime: null,
};

export const initialSwarmState: SwarmExecutionState = {
    executionId: null,
    status: 'idle',
    nodeStates: new Map(),
    progress: { completed: 0, total: 0 },
    startTime: null,
    endTime: null,
    totalDuration: null,
    parallelismVerified: null,
};

export const initialConflictState: ConflictManagerState = {
    conflicts: new Map(),
    pendingCount: 0,
    resolvedCount: 0,
    lastConflict: null,
};

export const initialConnectionInfo: ConnectionInfo = {
    state: 'disconnected',
    reconnectAttempt: 0,
    lastConnectedAt: null,
    disconnectedAt: null,
    reconnectCountdown: null,
};

export const STALE_THRESHOLD_MS = 5 * 60 * 1000;
