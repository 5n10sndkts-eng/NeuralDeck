import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SwarmNode } from '../hooks/useSwarm';
import { ThoughtNode } from './ThoughtNode';
import { SimpleSynapse } from './Synapse';

interface Props {
    nodes: SwarmNode[];
    edges: { source: string, target: string }[];
}

export const NeuralGraph3D: React.FC<Props> = ({ nodes, edges }) => {
    return (
        <div className="w-full h-full relative rounded-lg overflow-hidden bg-black/90">
            <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
                <color attach="background" args={['#050510']} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {/* Environment */}
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                {/* Controls */}
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={50}
                    autoRotate={nodes.length > 0}
                    autoRotateSpeed={0.5}
                />

                {/* Graph Content */}
                <group>
                    {nodes.map(node => (
                        <ThoughtNode
                            key={node.id}
                            node={node}
                            onClick={(n) => console.log('Clicked node:', n)}
                        />
                    ))}

                    {edges.map((edge, i) => {
                        const source = nodes.find(n => n.id === edge.source);
                        const target = nodes.find(n => n.id === edge.target);
                        if (!source || !target) return null;

                        return <SimpleSynapse key={i} source={source} target={target} />;
                    })}
                </group>

                {/* Post Processing */}
                <EffectComposer>
                    <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                </EffectComposer>
            </Canvas>

            {/* Fallback Overlay for Empty State */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-[#00f0ff]/30 font-mono text-xs">
                        AWAITING NEURAL ACTIVATION...
                    </div>
                </div>
            )}
        </div>
    );
};
