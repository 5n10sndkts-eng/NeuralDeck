import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Ring, Text } from '@react-three/drei';
import * as THREE from 'three';
import { AGENT_DEFINITIONS } from '../../services/agent';
import { AgentProfile } from '../../types';

interface AgentDroneProps {
    agentId: AgentProfile;
    position?: [number, number, number];
}

export const AgentDrone: React.FC<AgentDroneProps> = ({ agentId, position = [0, 5, 0] }) => {
    const groupRef = useRef<THREE.Group>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);
    const ring3Ref = useRef<THREE.Mesh>(null);

    // Get agent definition
    const def = useMemo(() => AGENT_DEFINITIONS[agentId] || AGENT_DEFINITIONS.analyst, [agentId]);

    // Role color extraction from text-class string (simplified for three.js)
    const agentColor = useMemo(() => {
        if (def.color.includes('cyan')) return '#00f0ff';
        if (def.color.includes('purple')) return '#bc13fe';
        if (def.color.includes('green')) return '#0aff0a';
        if (def.color.includes('orange')) return '#ffa500';
        if (def.color.includes('red')) return '#ff003c';
        return '#00f0ff';
    }, [def.color]);

    // Orbital/patrol animation
    useFrame(({ clock }) => {
        if (groupRef.current) {
            const t = clock.getElapsedTime() * 0.3;
            groupRef.current.position.x = position[0] + Math.cos(t) * 3;
            groupRef.current.position.y = position[1] + Math.sin(t * 0.5) * 1 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
            groupRef.current.position.z = position[2] + Math.sin(t) * 3;
        }

        if (ring1Ref.current) ring1Ref.current.rotation.z += 0.01;
        if (ring2Ref.current) ring2Ref.current.rotation.z -= 0.015;
        if (ring3Ref.current) ring3Ref.current.rotation.x += 0.02;
    });

    return (
        <group ref={groupRef} position={position}>
            <Sphere args={[0.5, 32, 32]}>
                <meshStandardMaterial
                    color={agentColor}
                    emissive={agentColor}
                    emissiveIntensity={1.0}
                    metalness={0.9}
                    roughness={0.1}
                />
            </Sphere>

            <pointLight color={agentColor} intensity={2} distance={10} decay={2} />

            <Ring ref={ring1Ref} args={[0.8, 1, 32]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial color={agentColor} transparent opacity={0.6} side={THREE.DoubleSide} />
            </Ring>

            <Ring ref={ring2Ref} args={[1.2, 1.4, 32]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial color={agentColor} transparent opacity={0.4} side={THREE.DoubleSide} />
            </Ring>

            <Ring ref={ring3Ref} args={[1.6, 1.8, 32]} rotation={[0, Math.PI / 2, 0]}>
                <meshBasicMaterial color={agentColor} transparent opacity={0.3} side={THREE.DoubleSide} />
            </Ring>

            <Text
                position={[0, 1.5, 0]}
                fontSize={0.3}
                color={agentColor}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                {def.name.toUpperCase()}
            </Text>

            <Text
                position={[0, -1.5, 0]}
                fontSize={0.15}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#000000"
            >
                {def.role.toUpperCase()}
            </Text>
        </group>
    );
};
