import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Scanline } from '@react-three/postprocessing';
import { FileNode, AgentProfile } from '../types';
import { GraphNode } from './Construct/GraphNode';
import { DataBeam } from './Construct/DataBeam';
import { AgentDrone } from './Construct/AgentDrone';

// --- CONSTANTS ---
const COLORS = {
    VOID: '#050510',
    CYAN: '#00F0FF',
    RED: '#FF003C'
};

// --- SCENE CONTENT ---
const SceneContent = ({ files, onFileSelect, activeAgents }: { files: FileNode[], onFileSelect: (path: string) => void, activeAgents: AgentProfile[] }) => {
    // Flatten files for node generation (Deterministic Layout)
    const nodes = useMemo(() => {
        let flattened: { file: FileNode, pos: [number, number, number] }[] = [];
        const traverse = (list: FileNode[], parentPos: [number, number, number] = [0, 0, 0], level = 1) => {
            list.forEach((file, i) => {
                // Spherical Distribution: Deterministic
                const phi = Math.acos(-1 + (2 * i) / list.length);
                const theta = Math.sqrt(list.length * Math.PI) * phi;
                const radius = 5 * level;

                const pos: [number, number, number] = [
                    radius * Math.cos(theta) * Math.sin(phi),
                    radius * Math.sin(theta) * Math.sin(phi),
                    radius * Math.cos(phi)
                ];

                flattened.push({ file, pos: [pos[0] + parentPos[0], pos[1] + parentPos[1], pos[2] + parentPos[2]] });
                if (file.children) traverse(file.children, pos, level + 1);
            });
        };
        traverse(files);
        return flattened;
    }, [files]);

    return (
        <group>
            {nodes.map((node, i) => (
                <GraphNode
                    key={node.file.path}
                    file={node.file}
                    position={node.pos}
                    onClick={onFileSelect}
                />
            ))}
            {/* Visual Connections (Optional: Connecting random nodes to simulate complexity) */}
            {nodes.slice(0, 10).map((node, i) => (
                <DataBeam
                    key={`beam-${i}`}
                    start={[0, 0, 0]}
                    end={node.pos}
                    color={COLORS.CYAN}
                />
            ))}

            {/* Agent Drones - Swarm Visualization */}
            {activeAgents.map((agentId, index) => (
                <AgentDrone
                    key={`drone-${agentId}-${index}`}
                    agentId={agentId}
                    position={[
                        Math.cos((index / activeAgents.length) * Math.PI * 2) * 10,
                        5 + index * 2,
                        Math.sin((index / activeAgents.length) * Math.PI * 2) * 10
                    ]}
                />
            ))}
        </group>
    );
};

// --- MAIN COMPONENT ---
const CyberVerse: React.FC<{ files: FileNode[], onFileSelect: (path: string) => void, activeAgents: AgentProfile[] }> = ({ files, onFileSelect, activeAgents = [] }) => {
    return (
        <div className="w-full h-full bg-black relative">
            <Canvas gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.5]}>
                <PerspectiveCamera makeDefault position={[0, 0, 30]} fov={45} />
                <OrbitControls enableZoom={true} enablePan={true} autoRotate autoRotateSpeed={0.2} maxDistance={60} minDistance={5} />

                <color attach="background" args={[COLORS.VOID]} />

                <ambientLight intensity={0.4} />
                <pointLight position={[20, 20, 20]} intensity={2} color={COLORS.CYAN} />
                <pointLight position={[-20, -20, -20]} intensity={2} color={COLORS.RED} />

                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

                <Physics gravity={[0, 0, 0]}>
                    <SceneContent files={files} onFileSelect={onFileSelect} activeAgents={activeAgents} />
                </Physics>

                <EffectComposer>
                    <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
                    <ChromaticAberration offset={[0.002, 0.002]} />
                    <Noise opacity={0.1} />
                    <Scanline density={1.5} opacity={0.05} />
                </EffectComposer>
            </Canvas>

            {/* OVERLAY */}
            <div className="absolute top-4 left-4 pointer-events-none">
                <div className="text-[var(--color-cyan)] font-mono text-xs tracking-[0.2em] border-l-2 border-[var(--color-cyan)] pl-2">
                    <div>THE CONSTRUCT v2.0</div>
                    <div>PHYSICS_ENGINE: ONLINE</div>
                    <div>NODES: {files.length}</div>
                    <div>ACTIVE_AGENTS: {activeAgents.length}</div>
                </div>
            </div>
        </div>
    );
};

export default CyberVerse;
