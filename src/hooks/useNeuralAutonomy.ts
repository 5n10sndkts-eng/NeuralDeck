
import { useState, useEffect, useCallback } from 'react';
import { FileNode, ConnectionProfile, AgentProfile, NeuralPhase } from '../types';

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

        // Detect artifacts from each phase
        const hasScan = flatFiles.some(f => f.includes('docs/project-scan-report.json'));
        const hasPRD = flatFiles.some(f => f.includes('docs/prd.md'));
        const hasDesign = flatFiles.some(f => f.includes('docs/ux-design.md') || f.includes('docs/design.md'));
        const hasArch = flatFiles.some(f => f.includes('docs/architecture.md'));
        const hasStories = flatFiles.some(f => f.includes('stories/'));
        const hasTests = flatFiles.some(f => f.includes('.test.') || f.includes('.spec.'));
        const hasReview = flatFiles.some(f => f.includes('docs/review-report.md'));
        const hasDocs = flatFiles.some(f => f.includes('docs/api-docs.md') || f.includes('docs/README.md'));
        const hasDeployConfig = flatFiles.some(f => f.includes('Dockerfile') || f.includes('docker-compose') || f.includes('.deploy'));

        // Determine current phase based on completed artifacts (progressive)
        if (hasDeployConfig && hasDocs) {
            setPhase('finished');
            setActiveAgentIds([]);
        } else if (hasDeployConfig) {
            setPhase('documentation');
            setActiveAgentIds(['tech_writer']);
        } else if (hasReview) {
            setPhase('deployment');
            setActiveAgentIds(['devops']);
        } else if (hasTests && hasStories) {
            setPhase('review');
            setActiveAgentIds(['qa_engineer', 'sec_auditor']);
        } else if (hasStories) {
            setPhase('implementation');
            setActiveAgentIds(['developer']);
        } else if (hasArch) {
            setPhase('scrum');
            setActiveAgentIds(['scrum_master']);
        } else if (hasDesign) {
            setPhase('architecture');
            setActiveAgentIds(['architect']);
        } else if (hasPRD) {
            setPhase('design');
            setActiveAgentIds(['ux_designer']);
        } else if (hasScan) {
            setPhase('planning');
            setActiveAgentIds(['product_manager']);
        } else {
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
