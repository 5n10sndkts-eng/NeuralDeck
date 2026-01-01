import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    ConnectionMode,
    NodeTypes,
    Position,
    getBezierPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { AgentProfile, FileNode, AgentNodeData, AgentNodeState, NeuralPhase, ToolHistoryEntry } from '../types';
import { useSocket } from '../hooks/useSocket';
import { usePacketSystem } from '../hooks/usePacketSystem';
import { useToolExecution } from '../hooks/useToolExecution';
import { useStoryWatcher } from '../hooks/useStoryWatcher';
import { useSwarm, DeveloperSwarmNode } from '../hooks/useSwarm';
import AgentNode from './AgentNode';
import DeveloperNode, { DeveloperNodeData } from './DeveloperNode';
import AgentDetailsPanel from './AgentDetailsPanel';
import DataPacket from './DataPacket';
import { ToolExecutionPanel } from './ToolExecutionPanel';
import ConflictAlert from './ConflictAlert';

interface NeuralGridProps {
    phase: NeuralPhase;
    activeAgents: AgentProfile[];
    files: FileNode[];
}

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 160;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // Shift to center
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

// Define all 8 agent nodes
const createInitialNodes = (): Node<AgentNodeData>[] => [
    {
        id: 'user_input',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'USER INPUT',
            role: 'Input',
            agentId: 'user_input' as const,
            state: 'IDLE' as AgentNodeState,
        },
    },
    {
        id: 'analyst',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'ANALYST',
            role: 'Discovery',
            agentId: 'analyst',
            state: 'IDLE' as AgentNodeState,
        },
    },
    {
        id: 'pm',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'PRODUCT MGR',
            role: 'Planning',
            agentId: 'product_manager',
            state: 'IDLE' as AgentNodeState,
        },
    },
    {
        id: 'architect',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'ARCHITECT',
            role: 'Solutioning',
            agentId: 'architect',
            state: 'IDLE' as AgentNodeState,
        },
    },
    {
        id: 'sm',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'SCRUM MASTER',
            role: 'Management',
            agentId: 'scrum_master',
            state: 'IDLE' as AgentNodeState,
        },
    },
    {
        id: 'swarm',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'DEV SWARM',
            role: 'Implementation',
            agentId: 'developer',
            state: 'IDLE' as AgentNodeState,
        },
    },
    {
        id: 'qa',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'QA ENGINEER',
            role: 'Testing',
            agentId: 'qa' as const,
            state: 'IDLE' as AgentNodeState,
        },
    },
    {
        id: 'security',
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: {
            label: 'SECURITY',
            role: 'Security Audit',
            agentId: 'security' as const,
            state: 'IDLE' as AgentNodeState,
        },
    },
];

// Define all workflow edges
const createInitialEdges = (): Edge[] => [
    {
        id: 'e0-1',
        source: 'user_input',
        target: 'analyst',
        animated: true,
        style: { stroke: '#00f0ff', strokeWidth: 2 },
    },
    {
        id: 'e1-2',
        source: 'analyst',
        target: 'pm',
        animated: true,
        style: { stroke: '#00f0ff', strokeWidth: 2 },
    },
    {
        id: 'e2-3',
        source: 'pm',
        target: 'architect',
        animated: true,
        style: { stroke: '#00f0ff', strokeWidth: 2 },
    },
    {
        id: 'e3-4',
        source: 'architect',
        target: 'sm',
        animated: true,
        style: { stroke: '#00f0ff', strokeWidth: 2 },
    },
    {
        id: 'e4-5',
        source: 'sm',
        target: 'swarm',
        animated: true,
        style: { stroke: '#00f0ff', strokeWidth: 2 },
    },
    {
        id: 'e5-6',
        source: 'swarm',
        target: 'qa',
        animated: true,
        style: { stroke: '#00f0ff', strokeWidth: 2 },
    },
    {
        id: 'e6-7',
        source: 'qa',
        target: 'security',
        animated: true,
        style: { stroke: '#00f0ff', strokeWidth: 2 },
    },
];

const NeuralGrid: React.FC<NeuralGridProps> = ({ phase, activeAgents, files }) => {
    const initialNodes = useMemo(() => createInitialNodes(), []);
    const initialEdges = useMemo(() => createInitialEdges(), []);

    const layouted = useMemo(
        () => getLayoutedElements(initialNodes, initialEdges),
        [initialNodes, initialEdges]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layouted.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);
    const [selectedAgent, setSelectedAgent] = useState<AgentNodeData | null>(null);
    const [showExecutionPanel, setShowExecutionPanel] = useState(false);
    const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

    // Custom node types (Story 4-1: Added developerNode)
    const nodeTypes: NodeTypes = useMemo(() => ({
        agentNode: AgentNode,
        developerNode: DeveloperNode,
    }), []);

    // Story Watcher for detecting new story files (Story 4-1)
    const {
        stories,
        isWatching,
        getPendingStories,
        getInProgressStories,
    } = useStoryWatcher();

    // Swarm hook for developer node management (Story 4-1)
    const {
        developerNodes,
        spawnDeveloperNodesFromStories,
        removeDeveloperNode,
        updateDeveloperNodeState,
        getSpawnMetrics,
    } = useSwarm();

    // WebSocket integration for real-time state updates (Story 4-2: Added swarm state, Story 4-3: Added conflict state)
    const {
        socket,
        swarmState,
        startSwarmExecution,
        cancelSwarmExecution,
        resetSwarmState,
        conflictState,
        resolveConflictAuto,
        resolveConflictManually,
    } = useSocket();

    // Data Packet System
    const { packets, triggerPacket, removePacket } = usePacketSystem();

    // Tool Execution System (Story 2-3)
    const {
        activeExecutions,
        toolHistory,
        selectExecution,
        getActiveExecution,
        getAgentHistory,
        isAgentExecuting,
    } = useToolExecution();

    // Handle execution indicator click - open panel and select execution
    const handleExecutionClick = useCallback((executionId: string) => {
        setSelectedExecutionId(executionId);
        setShowExecutionPanel(true);
        selectExecution(executionId);
    }, [selectExecution]);

    /**
     * Story 4-1: Spawn developer nodes when new stories are detected (AC: 1, 4)
     * Monitors story changes and dynamically adds/removes developer nodes
     */
    useEffect(() => {
        if (!stories.length) return;

        // Spawn developer nodes for pending stories
        const pendingStories = getPendingStories();
        if (pendingStories.length > 0) {
            const spawnedIds = spawnDeveloperNodesFromStories(pendingStories);
            if (spawnedIds.length > 0) {
                console.log(`[NeuralGrid] Spawned ${spawnedIds.length} developer nodes for pending stories`);
            }
        }
    }, [stories, getPendingStories, spawnDeveloperNodesFromStories]);

    /**
     * Story 4-1: Integrate developer nodes into ReactFlow graph (AC: 2)
     * Creates ReactFlow nodes from DeveloperSwarmNode data
     */
    useEffect(() => {
        if (developerNodes.length === 0) return;

        // Create ReactFlow nodes for each developer
        const devReactFlowNodes: Node<DeveloperNodeData>[] = developerNodes.map((devNode, index) => ({
            id: devNode.id,
            type: 'developerNode',
            position: { x: 0, y: 0 }, // Will be recalculated by dagre
            data: {
                id: devNode.id,
                storyId: devNode.storyId,
                storyTitle: devNode.storyTitle,
                state: devNode.state,
                progress: devNode.progress,
                taskCount: devNode.taskCount,
                completedTasks: devNode.completedTasks,
                onExecutionClick: handleExecutionClick,
            },
        }));

        // Create edges from swarm node to each developer
        const devEdges: Edge[] = developerNodes.map((devNode) => ({
            id: `e-swarm-${devNode.id}`,
            source: 'swarm',
            target: devNode.id,
            animated: devNode.state === 'WORKING',
            style: {
                stroke: devNode.state === 'DONE' ? '#00ff41' : '#ff00ff',
                strokeWidth: 2,
            },
        }));

        // Update nodes with developer nodes
        setNodes((nds) => {
            // Filter out old developer nodes
            const baseNodes = nds.filter(n => n.type !== 'developerNode');
            const allNodes = [...baseNodes, ...devReactFlowNodes];

            // Get current edges without developer edges
            const baseEdges = edges.filter(e => !e.id.startsWith('e-swarm-dev-'));
            const allEdges = [...baseEdges, ...devEdges];

            // Recalculate layout with all nodes
            const layouted = getLayoutedElements(allNodes, allEdges);

            // Update edges separately
            setEdges(layouted.edges);

            return layouted.nodes;
        });
    }, [developerNodes, edges, handleExecutionClick, setNodes, setEdges]);

    useEffect(() => {
        if (!socket) return;

        const handleAgentStateChange = (data: {
            agentId: string;
            state: AgentNodeState;
        }) => {
            // Trigger packet animation when agent finishes task
            if (data.state === 'DONE') {
                const sourceNode = nodes.find(
                    (n) => n.id === data.agentId || n.data.agentId === data.agentId
                );

                if (sourceNode) {
                    // Find outgoing edge
                    const outgoingEdge = edges.find((e) => e.source === sourceNode.id);
                    if (outgoingEdge) {
                        triggerPacket(sourceNode.id, outgoingEdge.target, outgoingEdge.id);
                    }
                }
            }

            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === data.agentId || node.data.agentId === data.agentId) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                state: data.state,
                            },
                        };
                    }
                    return node;
                })
            );
        };

        socket.on('agent:state-change', handleAgentStateChange);

        return () => {
            socket.off('agent:state-change', handleAgentStateChange);
        };
    }, [socket, setNodes, nodes, edges, triggerPacket]);

    // Update node states based on active agents and tool executions
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                const nodeData = node.data as AgentNodeData;

                // Map node IDs to AgentProfile
                const agentIdMap: Record<string, AgentProfile | null> = {
                    analyst: 'analyst',
                    pm: 'product_manager',
                    architect: 'architect',
                    sm: 'scrum_master',
                    swarm: 'developer',
                    user_input: null,
                    qa: null,
                    security: null,
                };

                const mappedAgentId = agentIdMap[node.id];
                const isActive = mappedAgentId && activeAgents.includes(mappedAgentId);

                // Get active tool execution for this agent
                const agentId = nodeData.agentId;
                const activeExecution = getActiveExecution(agentId as string);

                // Determine state based on activity
                let newState: AgentNodeState = 'IDLE';
                if (isActive) {
                    // Could be THINKING, WORKING, or DONE based on phase
                    newState = phase === 'finished' ? 'DONE' : 'WORKING';
                }

                return {
                    ...node,
                    data: {
                        ...nodeData,
                        state: newState,
                        activeExecution,
                        onExecutionClick: handleExecutionClick,
                    },
                };
            })
        );
    }, [phase, activeAgents, setNodes, getActiveExecution, handleExecutionClick]);

    // Node click handler
    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            const nodeData = node.data as AgentNodeData;
            const history = getAgentHistory(nodeData.agentId as string);
            setSelectedAgent({
                ...nodeData,
                toolHistory: history,
            } as AgentNodeData & { toolHistory?: ToolHistoryEntry[] });
        },
        [getAgentHistory]
    );

    return (
        <div className="w-full h-full bg-[#050505]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                className="bg-black"
            >
                <Background color="#1a1a1a" gap={20} />
                <Controls className="bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan fill-cyber-cyan" />

                {/* Data Packets Overlay */}
                {packets.map((packet) => {
                    const sourceNode = nodes.find((n) => n.id === packet.sourceId);
                    const targetNode = nodes.find((n) => n.id === packet.targetId);

                    if (!sourceNode || !targetNode) return null;

                    // Calculate path for animation
                    // Assuming Top/Bottom handles based on AgentNode implementation
                    const [path] = getBezierPath({
                        sourceX: sourceNode.position.x + nodeWidth / 2,
                        sourceY: sourceNode.position.y + nodeHeight,
                        sourcePosition: Position.Bottom,
                        targetX: targetNode.position.x + nodeWidth / 2,
                        targetY: targetNode.position.y,
                        targetPosition: Position.Top,
                    });

                    return (
                        <DataPacket
                            key={packet.id}
                            edgePath={path}
                            onComplete={() => removePacket(packet.id)}
                        />
                    );
                })}

                {/* Cyber Overlay */}
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-gray-500 font-mono">NEURAL_GRID_VISUALIZER</div>
                        <div className="text-xl font-display text-white tracking-widest uppercase">
                            PHASE: <span className="text-cyber-cyan">{phase}</span>
                        </div>
                        <div className="text-xs font-mono text-gray-400">
                            ACTIVE AGENTS: {activeAgents.length > 0 ? activeAgents.map(a => a.toUpperCase()).join(', ') : 'NONE'}
                        </div>
                        {/* Story 4-1: Developer Swarm Status */}
                        {developerNodes.length > 0 && (
                            <div className="text-xs font-mono text-cyber-purple mt-1">
                                DEV SWARM: {developerNodes.length} NODE{developerNodes.length !== 1 ? 'S' : ''} |
                                <span className="text-cyber-green ml-1">
                                    {developerNodes.filter(d => d.state === 'DONE').length} DONE
                                </span>
                                <span className="text-cyber-cyan ml-1">
                                    {developerNodes.filter(d => d.state === 'WORKING').length} WORKING
                                </span>
                            </div>
                        )}
                        {/* Story 4-2: Swarm Execution Status */}
                        {swarmState.status !== 'idle' && (
                            <div className="mt-2 p-2 bg-black/50 border border-cyber-cyan/30 rounded">
                                <div className="text-xs font-mono text-cyber-cyan">
                                    SWARM EXECUTION: <span className={
                                        swarmState.status === 'running' ? 'text-yellow-400' :
                                        swarmState.status === 'completed' ? 'text-green-400' :
                                        swarmState.status === 'partial' ? 'text-orange-400' :
                                        swarmState.status === 'failed' ? 'text-red-400' :
                                        'text-gray-400'
                                    }>{swarmState.status.toUpperCase()}</span>
                                </div>
                                <div className="text-xs font-mono text-gray-400 mt-1">
                                    PROGRESS: {swarmState.progress.completed}/{swarmState.progress.total}
                                </div>
                                {swarmState.totalDuration !== null && (
                                    <div className="text-xs font-mono text-gray-400">
                                        DURATION: {(swarmState.totalDuration / 1000).toFixed(1)}s
                                    </div>
                                )}
                                {swarmState.parallelismVerified !== null && (
                                    <div className={`text-xs font-mono ${swarmState.parallelismVerified ? 'text-green-400' : 'text-orange-400'}`}>
                                        NFR-1: {swarmState.parallelismVerified ? '✓ PARALLEL OK' : '⚠ SLOW'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </ReactFlow>

            {/* Agent Details Panel */}
            <AgentDetailsPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />

            {/* Tool Execution Panel (Story 2-3) */}
            {showExecutionPanel && (
                <ToolExecutionPanel
                    executions={activeExecutions}
                    selectedExecutionId={selectedExecutionId}
                    onSelectExecution={(id) => {
                        setSelectedExecutionId(id);
                        selectExecution(id);
                    }}
                    onClose={() => {
                        setShowExecutionPanel(false);
                        setSelectedExecutionId(null);
                    }}
                />
            )}

            {/* Floating button to show execution panel when there are active executions */}
            {!showExecutionPanel && activeExecutions.size > 0 && (
                <button
                    onClick={() => setShowExecutionPanel(true)}
                    className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2 bg-cyber-cyan/20 border border-cyber-cyan/50 rounded-lg text-cyber-cyan font-mono text-sm hover:bg-cyber-cyan/30 transition-colors"
                    style={{
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
                    }}
                >
                    <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
                    <span>{activeExecutions.size} ACTIVE TOOL{activeExecutions.size !== 1 ? 'S' : ''}</span>
                </button>
            )}

            {/* Conflict Alert (Story 4-3) */}
            <ConflictAlert
                conflictState={conflictState}
                onResolveAuto={resolveConflictAuto}
                onResolveManually={resolveConflictManually}
            />
        </div>
    );
};

export default NeuralGrid;
