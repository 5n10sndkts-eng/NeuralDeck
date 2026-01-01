import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';

interface DataBeamProps {
    start: [number, number, number];
    end: [number, number, number];
    color?: string;
}

export const DataBeam: React.FC<DataBeamProps> = ({ start, end, color = '#00F0FF' }) => {
    const points = useMemo(() => [start, end], [start, end]);

    return (
        <Line
            points={points}
            color={color}
            lineWidth={1}
            transparent
            opacity={0.5}
        />
    );
};
