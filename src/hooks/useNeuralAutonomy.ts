
import { useState, useEffect, useCallback } from 'react';
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
    const [activeAgentIds, setActiveAgentIds] = useState<AgentProfile[]>([]);

    const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
        setLogs(prev => [{ msg, type, timestamp: Date.now() }, ...prev]);
    }, []);

    const toggleAuto = useCallback(() => setIsAutoMode(p => !p), []);

    // --- STATE MACHINE ---
    useEffect(() => {
        // Flatten file list for easy checking
        const flatFiles = flatten(files);

        // 1. ANALYSIS PHASE
        // Check if Analyst has done work (scan report)
        const hasScan = flatFiles.some(f => f.includes('docs/project-scan-report.json'));

        // 2. PLANNING PHASE
        // Check if PM has done PRD
        const hasPRD = flatFiles.some(f => f.includes('docs/prd.md'));

        // 3. ARCHITECTURE PHASE
        // Check if Architect has done Architecture
        const hasArch = flatFiles.some(f => f.includes('docs/architecture.md'));

        // 4. IMPLEMENTATION PHASE
        // Check if Scrum Master has created Stories
        const hasStories = flatFiles.some(f => f.includes('stories/'));

        // Determine current state based on what DOESN'T exist yet (The "Next Step")

        if (hasStories) {
            // Implementation Phase: Swarm is working on stories
            setPhase('implementation');
            setActiveAgentIds(['developer']);
        } else if (hasArch) {
            // Architecture Done -> Needs Scrum Master to plan Sprint
            setPhase('planning'); // Sprint Planning
            setActiveAgentIds(['scrum_master']);
        } else if (hasPRD) {
            // PRD Done -> Needs Architect
            setPhase('architecture');
            setActiveAgentIds(['architect']);
        } else if (hasScan) {
            // Scan Done -> Needs PM to write PRD
            setPhase('planning');
            setActiveAgentIds(['product_manager']);
        } else {
            // Nothing done -> Needs Analyst
            setPhase('analysis');
            setActiveAgentIds(['analyst']);
        }

    }, [files]); // Re-evaluate when filesystem changes

    return {
        phase,
        logs,
        activeAgents: activeAgentIds,
        isAutoMode,
        toggleAuto,
        addLog
    };
};

function flatten(nodes: FileNode[]): string[] {
    let result: string[] = [];
    for (const node of nodes) {
        if (node.type === 'file') result.push(node.path);
        if (node.type === 'directory' && node.children) result = result.concat(flatten(node.children));
    }
    return result;
}
