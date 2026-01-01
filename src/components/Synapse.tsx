import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { SwarmNode } from '../hooks/useSwarm';
import { useFrame } from '@react-three/fiber';

interface Props {
    source: SwarmNode;
    target: SwarmNode;
}

export const Synapse: React.FC<Props> = ({ source, target }) => {
    const lineRef = useRef<any>(null);

    // Convert SwarmNode 0-100 coordinates to 3D space (matching ThoughtNode)
    const start = new THREE.Vector3(
        source.x ? (source.x - 50) / 5 : 0,
        source.y ? -(source.y - 50) / 5 : 0,
        0
    );
    const end = new THREE.Vector3(
        target.x ? (target.x - 50) / 5 : 0,
        target.y ? -(target.y - 50) / 5 : 0,
        0
    );

    const curve = new THREE.LineCurve3(start, end);

    useFrame((state) => {
        if (lineRef.current && lineRef.current.material) {
            // Animate dash offset to simulate data flow
            lineRef.current.material.dashOffset -= 0.02;
        }
    });

    return (
        <mesh>
            <tubeGeometry args={[curve, 20, 0.05, 8, false]} />
            <meshBasicMaterial
                ref={lineRef}
                color="#00f0ff"
                transparent
                opacity={0.3}
                depthWrite={false}
            />
            {/* Optional: Add a second line for the animated flow effect if Tube doesn't support dash easily in standard material */}
        </mesh>
    );
};

// Simple Line implementation using standard THREE.Line if Tube is too heavy
export const SimpleSynapse: React.FC<Props> = ({ source, target }) => {
    const ref = useRef<THREE.Line>(null);

    const start = new THREE.Vector3(
        source.x ? (source.x - 50) / 5 : 0,
        source.y ? -(source.y - 50) / 5 : 0,
        0
    );
    const end = new THREE.Vector3(
        target.x ? (target.x - 50) / 5 : 0,
        target.y ? -(target.y - 50) / 5 : 0,
        0
    );

    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    return (
        <line geometry={geometry}>
            <lineBasicMaterial color="#00f0ff" transparent opacity={0.2} linewidth={1} />
        </line>
    );
};
