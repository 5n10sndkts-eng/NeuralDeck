import React from 'react';
import { motion } from 'framer-motion';

interface DataPacketProps {
    edgePath: string;
    duration?: number;
    onComplete?: () => void;
}

const DataPacket: React.FC<DataPacketProps> = ({ edgePath, duration = 1.5, onComplete }) => {
    return (
        <motion.div
            initial={{ offsetDistance: '0%' }}
            animate={{ offsetDistance: '100%' }}
            transition={{
                duration: duration,
                ease: "easeInOut"
            }}
            onAnimationComplete={onComplete}
            // Cast style to allows offsetPath if TS complains, though usually React 19 / modern types might handle it.
            // We'll use a specific style object to be safe.
            style={{
                offsetPath: `path('${edgePath}')`,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#00f0ff', // Electric Cyan
                boxShadow: '0 0 10px #00f0ff, 0 0 20px #bc13fe', // Cyan + Purple glow
                zIndex: 1000,
                pointerEvents: 'none',
            } as any}
        />
    );
};

export default DataPacket;
