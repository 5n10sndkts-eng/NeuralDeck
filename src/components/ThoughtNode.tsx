import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { SwarmNode } from '../hooks/useSwarm';

interface Props {
    node: SwarmNode;
    onClick: (node: SwarmNode) => void;
}

export const ThoughtNode: React.FC<Props> = ({ node, onClick }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);

    // Animation: subtle float/rotation
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
            meshRef.current.position.y += Math.sin(state.clock.elapsedTime + node.timestamp) * 0.002;
        }
    });

    const getColor = (type: string) => {
        switch (type) {
            case 'analysis': return '#00f0ff'; // Cyan
            case 'plan': return '#ffd000'; // Yellow
            case 'code': return '#0aff0a'; // Green
            case 'review': return '#ff003c'; // Red
            default: return '#ffffff';
        }
    };

    const color = getColor(node.type);

    return (
        <group position={[node.x ? (node.x - 50) / 5 : 0, node.y ? -(node.y - 50) / 5 : 0, 0]}> {/* Simple mapping from 0-100 2D space to 3D center */}
            {/* Core Node */}
            <mesh
                ref={meshRef}
                onClick={(e) => { e.stopPropagation(); onClick(node); }}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
                scale={hovered ? 1.5 : 1}
            >
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 2 : 0.5}
                    toneMapped={false}
                />
            </mesh>

            {/* Label (Visible on Hover) */}
            {hovered && (
                <Html distanceFactor={10}>
                    <div className="pointer-events-none select-none bg-black/80 text-white p-2 rounded border border-[#00f0ff] min-w-[150px]">
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{node.type}</div>
                        <div className="text-xs mt-1">{node.content}</div>
                    </div>
                </Html>
            )}
        </group>
    );
};
