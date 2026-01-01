
import { useState, useEffect, useCallback } from 'react';
import { FileNode, AgentProfile, AgentAction, LlmConfig, NeuralPhase } from '../types';
import { runAgentCycle } from '../services/agent';
import { writeFile, callMCPTool } from '../services/api';

export const useNeuralAutonomy = (
    files: FileNode[], 
    llmConfig: LlmConfig,
    refreshFiles: () => void
) => {
    const [phase, setPhase] = useState<NeuralPhase>('idle');
    const [logs, setLogs] = useState<{msg: string, type: string, timestamp: number}[]>([]);
    const [activeAgents, setActiveAgents] = useState<AgentProfile[]>([]);
    const [isAutoMode, setIsAutoMode] = useState(false);

    const addLog = (msg: string, type: string = 'info') => {
        setLogs(prev => [...prev, { msg, type, timestamp: Date.now() }]);
    };

    // --- FILE SYSTEM WATCHER ---
    // Checks for existence of key artifacts to advance the state machine
    useEffect(() => {
        if (!isAutoMode) return;

        const hasFile = (name: string) => {
            const find = (nodes: FileNode[]): boolean => {
                for (const node of nodes) {
                    if (node.name === name) return true;
                    if (node.children && find(node.children)) return true;
                }
                return false;
            };
            return find(files);
        };

        // State Machine Transition Logic
        if (phase === 'idle' && !hasFile('project_brief.md')) {
            transitionTo('analysis');
        } else if (hasFile('project_brief.md') && !hasFile('prd.md')) {
            transitionTo('planning');
        } else if (hasFile('prd.md') && !hasFile('architecture.md')) {
            transitionTo('architecture');
        } else if (hasFile('architecture.md') && !hasFile('stories')) {
            transitionTo('scrum');
        } else if (hasFile('stories')) {
            // Check if there are todo stories
            transitionTo('swarm');
        }

    }, [files, isAutoMode, phase]);

    const transitionTo = async (newPhase: NeuralPhase) => {
        if (phase === newPhase) return;
        setPhase(newPhase);
        addLog(`PHASE SHIFT: ${newPhase.toUpperCase()}`, 'system');
        
        // Trigger the Agent for this phase
        let agent: AgentProfile | null = null;
        let inputs: string[] = [];

        switch (newPhase) {
            case 'analysis': 
                agent = 'analyst'; 
                break;
            case 'planning': 
                agent = 'product_manager'; 
                inputs = ['docs/project_brief.md']; 
                break;
            case 'architecture': 
                agent = 'architect'; 
                inputs = ['docs/prd.md']; 
                break;
            case 'scrum': 
                agent = 'scrum_master'; 
                inputs = ['docs/architecture.md', 'docs/prd.md']; 
                break;
            case 'swarm':
                // Special handling for Swarm
                return; 
        }

        if (agent) {
            setActiveAgents([agent]);
            await executeAgent(agent, inputs);
            setActiveAgents([]);
            refreshFiles(); // Sync FS
        }
    };

    const executeAgent = async (agentId: AgentProfile, contextFiles: string[]) => {
        addLog(`Activating ${agentId}...`, 'info');
        
        // Run Agent Logic (Real LLM Call)
        const result = await runAgentCycle(agentId, contextFiles, llmConfig, (m, t) => addLog(m, t));
        const action = result?.action;

        if (action && action.tool === 'fs_write') {
            addLog(`Tool Execution: Writing ${action.parameters.filePath}`, 'command');
            await writeFile(action.parameters.filePath, action.parameters.content);
            addLog(`Artifact Created: ${action.parameters.filePath}`, 'success');
        } else if (action) {
            addLog(`Agent Action: ${JSON.stringify(action)}`, 'info');
        }
    };

    return {
        phase,
        logs,
        activeAgents,
        isAutoMode,
        toggleAuto: () => setIsAutoMode(!isAutoMode)
    };
};
