
import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import { AgentProfile, NeuralPhase } from '../types';
import { Cpu, FileText, Database, Layers, Users } from 'lucide-react';

interface Props {
    phase: NeuralPhase | string;
    activeAgents: AgentProfile[];
    files: any[]; // Used to visualize file nodes
}

const NeuralGrid: React.FC<Props> = ({ phase, activeAgents, files }) => {
    
    // Dynamic Node Construction based on Phase
    const nodes: Node[] = useMemo(() => {
        const baseNodes: Node[] = [
            { id: 'start', position: { x: 250, y: 0 }, data: { label: 'User Input' }, type: 'input', style: { background: '#050505', color: '#fff', borderColor: '#00f0ff', width: 150 } },
            
            { id: 'analyst', position: { x: 250, y: 100 }, data: { label: 'Analyst (Reqs)' }, style: { background: phase === 'analysis' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#60a5fa', boxShadow: phase === 'analysis' ? '0 0 20px #60a5fa' : 'none', width: 150 } },
            
            { id: 'pm', position: { x: 250, y: 200 }, data: { label: 'Product Manager' }, style: { background: phase === 'planning' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#c084fc', boxShadow: phase === 'planning' ? '0 0 20px #c084fc' : 'none', width: 150 } },
            
            { id: 'ux', position: { x: 100, y: 250 }, data: { label: 'UX Designer' }, style: { background: phase === 'design' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#f472b6', boxShadow: phase === 'design' ? '0 0 20px #f472b6' : 'none', width: 120 } },

            { id: 'arch', position: { x: 250, y: 300 }, data: { label: 'Architect' }, style: { background: phase === 'architecture' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#fb923c', boxShadow: phase === 'architecture' ? '0 0 20px #fb923c' : 'none', width: 150 } },
            
            { id: 'scrum', position: { x: 250, y: 400 }, data: { label: 'Scrum Master' }, style: { background: phase === 'scrum' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#4ade80', boxShadow: phase === 'scrum' ? '0 0 20px #4ade80' : 'none', width: 150 } },
        ];

        // Add Swarm & QA Nodes dynamically
        if (phase === 'swarm' || phase === 'implementation' || phase === 'testing' || phase === 'review' || phase === 'optimize' || phase === 'deployment' || phase === 'documentation') {
            baseNodes.push(
                { id: 'dev1', position: { x: 100, y: 500 }, data: { label: 'Dev Unit 1' }, style: { background: '#050505', color: '#00f0ff', borderColor: '#00f0ff', width: 120 } },
                { id: 'dev2', position: { x: 250, y: 500 }, data: { label: 'Dev Unit 2' }, style: { background: '#050505', color: '#00f0ff', borderColor: '#00f0ff', width: 120 } },
                { id: 'qa', position: { x: 250, y: 600 }, data: { label: 'QA Engineer' }, style: { background: phase === 'testing' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#fef08a', boxShadow: phase === 'testing' ? '0 0 20px #fef08a' : 'none', width: 150 } },
                { id: 'ops', position: { x: 400, y: 500 }, data: { label: 'DevOps' }, style: { background: phase === 'deployment' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#818cf8', boxShadow: phase === 'deployment' ? '0 0 20px #818cf8' : 'none', width: 120 } },
                { id: 'docs', position: { x: 400, y: 600 }, data: { label: 'Tech Writer' }, style: { background: phase === 'documentation' ? '#1a1a1a' : '#050505', color: '#fff', borderColor: '#d1d5db', boxShadow: phase === 'documentation' ? '0 0 20px #d1d5db' : 'none', width: 150 } }
            );
        }

        return baseNodes;
    }, [phase]);

    const edges: Edge[] = useMemo(() => {
        const baseEdges: Edge[] = [
            { id: 'e1-2', source: 'start', target: 'analyst', animated: phase === 'analysis', style: { stroke: phase === 'analysis' ? '#60a5fa' : '#333' } },
            { id: 'e2-3', source: 'analyst', target: 'pm', animated: phase === 'planning', style: { stroke: phase === 'planning' ? '#c084fc' : '#333' } },
            { id: 'e3-ux', source: 'pm', target: 'ux', animated: phase === 'design', style: { stroke: phase === 'design' ? '#f472b6' : '#333' } },
            { id: 'eux-4', source: 'ux', target: 'arch', animated: phase === 'architecture', style: { stroke: phase === 'architecture' ? '#fb923c' : '#333' } },
            { id: 'e3-4', source: 'pm', target: 'arch', animated: phase === 'architecture', style: { stroke: phase === 'architecture' ? '#fb923c' : '#333' } },
            { id: 'e4-5', source: 'arch', target: 'scrum', animated: phase === 'scrum', style: { stroke: phase === 'scrum' ? '#4ade80' : '#333' } },
        ];
        
        if (['swarm', 'implementation', 'testing', 'review', 'optimize', 'deployment', 'documentation'].includes(phase as string)) {
            baseEdges.push(
                { id: 'e5-6', source: 'scrum', target: 'dev1', animated: true, style: { stroke: '#00f0ff' } },
                { id: 'e5-7', source: 'scrum', target: 'dev2', animated: true, style: { stroke: '#00f0ff' } },
                { id: 'e-dev-qa', source: 'dev2', target: 'qa', animated: phase === 'testing', style: { stroke: phase === 'testing' ? '#fef08a' : '#333' } },
                { id: 'e-qa-ops', source: 'qa', target: 'ops', animated: phase === 'deployment', style: { stroke: phase === 'deployment' ? '#818cf8' : '#333' } },
                { id: 'e-ops-docs', source: 'ops', target: 'docs', animated: phase === 'documentation', style: { stroke: phase === 'documentation' ? '#d1d5db' : '#333' } }
            );
        }

        return baseEdges;
    }, [phase]);

    return (
        <div className="w-full h-full bg-[#020204] border-l border-white/10 relative">
            <div className="absolute top-4 left-4 z-10 bg-black/80 p-2 rounded border border-cyber-cyan/30 backdrop-blur pointer-events-none">
                <div className="text-xs font-bold text-cyber-cyan uppercase tracking-widest mb-1">Neural Orchestrator</div>
                <div className="text-[10px] text-gray-400">Phase: <span className="text-white font-mono">{typeof phase === 'string' ? phase.toUpperCase() : 'INIT'}</span></div>
                <div className="text-[10px] text-gray-400">Active Agents: <span className="text-white font-mono">{activeAgents?.length > 0 ? activeAgents.join(', ').toUpperCase() : 'IDLE'}</span></div>
            </div>

            <ReactFlow 
                nodes={nodes} 
                edges={edges}
                fitView
                attributionPosition="bottom-right"
                defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
                minZoom={0.5}
                maxZoom={2}
            >
                <Background color="#1a1a1a" gap={20} size={1} />
                <Controls className="bg-black border border-white/10 fill-white text-white" />
            </ReactFlow>
        </div>
    );
};

export default NeuralGrid;
