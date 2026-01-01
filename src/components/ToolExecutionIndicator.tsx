import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolExecutionState } from '../types';

interface ToolExecutionIndicatorProps {
    isExecuting: boolean;
    status?: ToolExecutionState;
    toolName?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
    sm: { ring: 24, icon: 12, stroke: 2 },
    md: { ring: 32, icon: 16, stroke: 3 },
    lg: { ring: 40, icon: 20, stroke: 4 },
};

export const ToolExecutionIndicator: React.FC<ToolExecutionIndicatorProps> = ({
    isExecuting,
    status = 'idle',
    toolName,
    size = 'md',
}) => {
    const config = sizeConfig[size];

    // Don't show if idle
    if (!isExecuting && status === 'idle') {
        return null;
    }

    const getStatusColor = () => {
        switch (status) {
            case 'executing':
                return '#00f0ff'; // Electric Cyan
            case 'success':
                return '#00ff41'; // Neon Green
            case 'error':
                return '#ff0040'; // Error Red
            default:
                return '#00f0ff';
        }
    };

    const color = getStatusColor();

    return (
        <AnimatePresence>
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-2 -right-2 z-10"
                title={toolName ? `Executing: ${toolName}` : 'Tool Execution'}
            >
                {/* Outer glow ring */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        width: config.ring,
                        height: config.ring,
                        background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                    }}
                    animate={isExecuting ? {
                        scale: [1, 1.3, 1],
                        opacity: [0.8, 0.4, 0.8],
                    } : {}}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* Progress ring */}
                <svg
                    width={config.ring}
                    height={config.ring}
                    className="relative"
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    {/* Background circle */}
                    <circle
                        cx={config.ring / 2}
                        cy={config.ring / 2}
                        r={(config.ring - config.stroke) / 2}
                        fill="rgba(0, 0, 0, 0.8)"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth={config.stroke}
                    />

                    {/* Animated progress arc */}
                    {isExecuting && (
                        <motion.circle
                            cx={config.ring / 2}
                            cy={config.ring / 2}
                            r={(config.ring - config.stroke) / 2}
                            fill="none"
                            stroke={color}
                            strokeWidth={config.stroke}
                            strokeLinecap="round"
                            strokeDasharray={`${Math.PI * (config.ring - config.stroke) * 0.25} ${Math.PI * (config.ring - config.stroke)}`}
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            style={{
                                transformOrigin: 'center',
                                filter: `drop-shadow(0 0 4px ${color})`,
                            }}
                        />
                    )}

                    {/* Success/Error static ring */}
                    {!isExecuting && status !== 'idle' && (
                        <circle
                            cx={config.ring / 2}
                            cy={config.ring / 2}
                            r={(config.ring - config.stroke) / 2}
                            fill="none"
                            stroke={color}
                            strokeWidth={config.stroke}
                            style={{
                                filter: `drop-shadow(0 0 4px ${color})`,
                            }}
                        />
                    )}
                </svg>

                {/* Center icon */}
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                        width: config.ring,
                        height: config.ring,
                    }}
                >
                    {isExecuting ? (
                        <TerminalIcon size={config.icon} color={color} />
                    ) : status === 'success' ? (
                        <CheckIcon size={config.icon} color={color} />
                    ) : status === 'error' ? (
                        <ErrorIcon size={config.icon} color={color} />
                    ) : null}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Icon components
const TerminalIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
            d="M4 17L10 11L4 5"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M12 19H20"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const CheckIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
        <path
            d="M5 12L10 17L19 8"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </motion.svg>
);

const ErrorIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
        <path
            d="M6 6L18 18M6 18L18 6"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
        />
    </motion.svg>
);

export default ToolExecutionIndicator;
