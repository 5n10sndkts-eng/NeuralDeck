
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileNode, ConnectionProfile, AgentProfile } from '../types';

export type NeuralPhase = 'idle' | 'analysis' | 'planning' | 'architecture' | 'implementation' | 'review';

export interface LogEntry {
    type: 'info' | 'error' | 'success' | 'command';
    msg: string;
    timestamp: number;
}

export const useNeuralAutonomy = (
    files: FileNode[],
    config: ConnectionProfile,
    onRefreshFiles: () => void
) => {
    const [phase, setPhase] = useState<NeuralPhase>('idle');
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Track active agents by ID
    const [activeAgentIds, setActiveAgentIds] = useState<AgentProfile[]>([]);

    const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
        setLogs(prev => [{ msg, type, timestamp: Date.now() }, ...prev]);
    }, []);

    const toggleAuto = useCallback(() => setIsAutoMode(p => !p), []);

    // Poll File System / Analysis Logic
    useEffect(() => {
        if (!isAutoMode) return;

        // Simple state machine simulation based on file presence if auto mode is on
        const flatFiles = flatten(files);

        // Check Triggers
        const hasBrief = flatFiles.some(f => f.includes('project_brief.md'));
        const hasPrd = flatFiles.some(f => f.includes('prd.md'));
        const hasArch = flatFiles.some(f => f.includes('architecture.md'));
        const hasStories = flatFiles.some(f => f.includes('stories/'));

        // Determine Phase
        let nextPhase: NeuralPhase = 'idle';
        let agents: AgentProfile[] = [];

        if (hasStories) {
            nextPhase = 'implementation';
            // In implementation, Swarm is active
            agents = ['swarm'];
        } else if (hasArch) {
            nextPhase = 'implementation'; // Transitioning
            agents = ['scrum_master'];
        } else if (hasPrd) {
            nextPhase = 'architecture';
            agents = ['architect'];
        } else if (hasBrief) {
            nextPhase = 'planning';
            agents = ['pm'];
        } else {
            nextPhase = 'analysis';
            agents = ['analyst'];
        }

        setPhase(nextPhase);
        setActiveAgentIds(agents);

    }, [files, isAutoMode]);

    return {
        phase,
        logs,
        activeAgents: activeAgentIds,
        isAutoMode,
        toggleAuto,
        addLog
    };
};

// Helper
function flatten(nodes: FileNode[]): string[] {
    let result: string[] = [];
    for (const node of nodes) {
        if (node.type === 'file') result.push(node.path);
        if (node.type === 'directory' && node.children) result = result.concat(flatten(node.children));
    }
    return result;
}
