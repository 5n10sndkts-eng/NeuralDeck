import React, { useState, useMemo } from 'react';
import { useSphere } from '@react-three/cannon';
import { Text } from '@react-three/drei';
import { FileNode } from '../../types';
import { SoundEffects } from '../../services/sound';
import * as THREE from 'three';

// Palette matches index.css variables roughly
const COLORS = {
    FILE: '#00F0FF', // Cyan
    DIR: '#bc13fe',  // Purple
    HOVER: '#FFFFFF',
    SELECTED: '#FF003C'
};

interface GraphNodeProps {
    file: FileNode;
    position: [number, number, number];
    onClick: (path: string) => void;
}

export const GraphNode: React.FC<GraphNodeProps> = ({ file, position, onClick }) => {
    const [hovered, setHover] = useState(false);

    // Physics Body: Mass 0 makes it static (stable, doesn't jitter)
    const [ref] = useSphere(() => ({
        mass: 0,
        position,
        args: [0.5],
    }));

    const isDir = file.type === 'directory';
    const color = isDir ? COLORS.DIR : COLORS.FILE;

    return (
        <group>
            <mesh
                ref={ref as any}
                onClick={(e) => {
                    e.stopPropagation();
                    SoundEffects.click();
                    onClick(file.path);
                }}
                onPointerOver={() => {
                    setHover(true);
                    SoundEffects.hover();
                }}
                onPointerOut={() => setHover(false)}
            >
                {isDir ? <icosahedronGeometry args={[0.6, 0]} /> : <sphereGeometry args={[0.4, 16, 16]} />}
                <meshStandardMaterial
                    color={hovered ? COLORS.HOVER : color}
                    emissive={color}
                    emissiveIntensity={hovered ? 2 : 1.0}
                    roughness={0.1}
                    metalness={0.9}
                    wireframe={isDir && !hovered}
                />
            </mesh>

            {/* Floating Label (only on hover) */}
            {hovered && (
                <Text
                    position={[0, 0.8, 0]}
                    fontSize={0.3}
                    color={COLORS.HOVER}
                    anchorX="center"
                    anchorY="bottom"
                    font="https://fonts.gstatic.com/s/rajdhani/v10/L10M2bI9wYy2p3_d6v8.woff"
                >
                    {file.name}
                </Text>
            )}
        </group>
    );
};
