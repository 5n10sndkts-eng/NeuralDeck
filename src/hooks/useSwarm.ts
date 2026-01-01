import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { AgentProfile, AgentNodeState } from '../types';
import { StoryMetadata } from './useStoryWatcher';
import { triggerThink, Thought } from '../services/api';

export interface SwarmNode {
    id: string;
    agent: AgentProfile;
    content: string;
    type: 'analysis' | 'plan' | 'code' | 'review' | 'default';
    status: 'active' | 'completed';
    timestamp: number;
    x?: number; // For visualization
    y?: number;
}

/**
 * Developer Node for dynamic spawning (Story 4-1)
 */
export interface DeveloperSwarmNode {
    id: string;                     // Format: dev-{storyId}-{timestamp}
    storyId: string;                // Associated story file ID
    storyPath: string;              // Full path to story file
    storyTitle: string;             // Story title for display
    state: AgentNodeState;          // IDLE, THINKING, WORKING, DONE
    progress: number;               // 0-100
    taskCount: number;              // Total tasks
    completedTasks: number;         // Completed tasks
    spawnedAt: number;              // Timestamp when node was spawned
    assignedAt?: number;            // When work started
    completedAt?: number;           // When work finished
}

export const useSwarm = () => {
    const { logs, activeAgents, phase, socket, isConnected } = useSocket();
    const [nodes, setNodes] = useState<SwarmNode[]>([]);
    const [edges, setEdges] = useState<{ source: string, target: string }[]>([]);

    // Developer nodes state (Story 4-1)
    const [developerNodes, setDeveloperNodes] = useState<DeveloperSwarmNode[]>([]);
    const [storyToDevMap, setStoryToDevMap] = useState<Map<string, string>>(new Map());
    const spawnTimestamps = useRef<number[]>([]);

    // Process Logs into Graph Nodes
    useEffect(() => {
        if (logs.length === 0) return;

        // Simplify for now: Each new log entry from an Agent is a Node.
        // In a real implementation, we would parse structured JSON from the 'sequential-thinking' tool.

        const latestLog = logs[0]; // logs are prepended
        if (!latestLog.msg) return;

        const newNode: SwarmNode = {
            id: `node-${Date.now()}`,
            agent: (activeAgents.length > 0 ? activeAgents[0] : 'analyst'), // Default to analyst if unknown
            content: latestLog.msg,
            type: mapPhaseToType(phase),
            status: 'completed', // Logs are usually finished events
            timestamp: Date.now(),
            x: Math.random() * 100, // Random placement for now, Graph will handle layout
            y: Math.random() * 100
        };

        setNodes(prev => {
            // Avoid duplicates if log ID exists (if logs had IDs)
            // For now, simple append limit
            const start = [newNode, ...prev].slice(0, 50); // Keep last 50
            return start;
        });

        // Create simple linear edge for now
        setEdges(prev => {
            if (nodes.length > 0) {
                return [...prev, { source: nodes[0].id, target: newNode.id }];
            }
            return prev;
        });

    }, [logs, activeAgents, phase]); // Re-run when logs change

    /**
     * Generate unique developer node ID
     * Format: dev-{storyId}-{timestamp}
     */
    const generateDeveloperNodeId = useCallback((storyId: string): string => {
        return `dev-${storyId}-${Date.now()}`;
    }, []);

    /**
     * Add a new developer node for a story (AC: 2, 3)
     * Returns the new node ID for tracking
     */
    const addDeveloperNode = useCallback((story: StoryMetadata): string => {
        const nodeId = generateDeveloperNodeId(story.id);
        const spawnTime = Date.now();

        const newDevNode: DeveloperSwarmNode = {
            id: nodeId,
            storyId: story.id,
            storyPath: story.path,
            storyTitle: story.title,
            state: 'IDLE',
            progress: 0,
            taskCount: story.taskCount,
            completedTasks: 0,
            spawnedAt: spawnTime,
        };

        setDeveloperNodes(prev => [...prev, newDevNode]);
        setStoryToDevMap(prev => new Map(prev).set(story.id, nodeId));

        // Track spawn timing for performance monitoring (AC: 5)
        spawnTimestamps.current.push(spawnTime);

        console.log(`[useSwarm] Spawned developer node: ${nodeId} for story: ${story.title}`);

        return nodeId;
    }, [generateDeveloperNodeId]);

    /**
     * Remove a developer node (AC: 4)
     * Called when a story file is deleted
     */
    const removeDeveloperNode = useCallback((storyId: string): boolean => {
        const nodeId = storyToDevMap.get(storyId);
        if (!nodeId) {
            console.warn(`[useSwarm] No developer node found for story: ${storyId}`);
            return false;
        }

        setDeveloperNodes(prev => prev.filter(node => node.id !== nodeId));
        setStoryToDevMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(storyId);
            return newMap;
        });

        console.log(`[useSwarm] Removed developer node: ${nodeId} for story: ${storyId}`);
        return true;
    }, [storyToDevMap]);

    /**
     * Update developer node state (AC: 3)
     */
    const updateDeveloperNodeState = useCallback((
        storyId: string,
        updates: Partial<Pick<DeveloperSwarmNode, 'state' | 'progress' | 'completedTasks'>>
    ): void => {
        setDeveloperNodes(prev => prev.map(node => {
            if (node.storyId !== storyId) return node;

            const updatedNode = { ...node, ...updates };

            // Set assignedAt when transitioning from IDLE
            if (node.state === 'IDLE' && updates.state && updates.state !== 'IDLE') {
                updatedNode.assignedAt = Date.now();
            }

            // Set completedAt when transitioning to DONE
            if (updates.state === 'DONE' && node.state !== 'DONE') {
                updatedNode.completedAt = Date.now();
            }

            return updatedNode;
        }));
    }, []);

    /**
     * Get developer node by story ID
     */
    const getDeveloperNodeByStoryId = useCallback((storyId: string): DeveloperSwarmNode | undefined => {
        return developerNodes.find(node => node.storyId === storyId);
    }, [developerNodes]);

    /**
     * Spawn multiple developer nodes for stories (AC: 5)
     * Ensures all nodes are created within 2 seconds target
     */
    const spawnDeveloperNodesFromStories = useCallback((stories: StoryMetadata[]): string[] => {
        const startTime = Date.now();
        const nodeIds: string[] = [];

        stories.forEach(story => {
            // Skip if already has a developer node
            if (storyToDevMap.has(story.id)) {
                console.log(`[useSwarm] Developer node already exists for story: ${story.id}`);
                return;
            }

            const nodeId = addDeveloperNode(story);
            nodeIds.push(nodeId);
        });

        const duration = Date.now() - startTime;
        console.log(`[useSwarm] Spawned ${nodeIds.length} developer nodes in ${duration}ms`);

        // Performance warning if over 2 second target
        if (duration > 2000) {
            console.warn(`[useSwarm] Node spawning exceeded 2s target: ${duration}ms`);
        }

        return nodeIds;
    }, [addDeveloperNode, storyToDevMap]);

    /**
     * Get spawn timing metrics for monitoring (AC: 5)
     */
    const getSpawnMetrics = useCallback(() => {
        const timestamps = spawnTimestamps.current;
        if (timestamps.length < 2) return null;

        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
        }

        return {
            totalSpawns: timestamps.length,
            averageIntervalMs: intervals.reduce((a, b) => a + b, 0) / intervals.length,
            maxIntervalMs: Math.max(...intervals),
        };
    }, []);

    /**
     * Trigger sequential thinking (Story 7.1)
     */
    const triggerReasoning = useCallback(async (prompt: string) => {
        try {
            const { thoughts } = await triggerThink(prompt);

            // Map thoughts to SwarmNodes for visualization
            const newNodes: SwarmNode[] = thoughts.map((t, index) => ({
                id: t.id || `thought-${Date.now()}-${index}`,
                agent: (t.role as AgentProfile) || 'analyst',
                content: t.thought,
                type: 'analysis', // Thoughts are analysis/planning
                status: 'completed',
                timestamp: Date.now(),
                x: Math.random() * 100,
                y: Math.random() * 100
            }));

            setNodes(prev => [...prev, ...newNodes]);

            // Add edges between sequential thoughts
            setEdges(prev => {
                const newEdges: { source: string, target: string }[] = [];
                // Connect to last existing node if any
                if (prev.length > 0 && newNodes.length > 0) {
                    // logic to connect to *something* meaningful, for now just loosely attach
                }

                // Connect new nodes sequentially
                for (let i = 0; i < newNodes.length - 1; i++) {
                    newEdges.push({ source: newNodes[i].id, target: newNodes[i + 1].id });
                }
                return [...prev, ...newEdges];
            });

        } catch (error) {
            console.error("[useSwarm] Reasoning failed:", error);
        }
    }, []);

    return {
        // Original swarm functionality
        nodes,
        edges,
        activeAgents,

        // Developer node management (Story 4-1)
        developerNodes,
        addDeveloperNode,
        removeDeveloperNode,
        updateDeveloperNodeState,
        getDeveloperNodeByStoryId,
        spawnDeveloperNodesFromStories,
        getSpawnMetrics,
        storyToDevMap,
        triggerReasoning, // Story 7.1
    };
};

// Helper
const mapPhaseToType = (phase: string): SwarmNode['type'] => {
    switch (phase) {
        case 'analysis': return 'analysis';
        case 'planning': return 'plan';
        case 'architecture': return 'plan';
        case 'implementation': return 'code';
        case 'review': return 'review';
        default: return 'default';
    }
};
