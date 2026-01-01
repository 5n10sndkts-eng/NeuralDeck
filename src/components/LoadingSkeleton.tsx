import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Box, Network } from 'lucide-react';

interface LoadingSkeletonProps {
    variant?: 'default' | 'construct' | 'graph';
    message?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
    variant = 'default',
    message = 'INITIALIZING MODULE...'
}) => {
    return (
        <div className="w-full h-full flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.95) 0%, rgba(5, 5, 12, 0.98) 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                animation: 'pulse 2s ease-in-out infinite'
            }} />

            {/* Radial glow */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(circle at center, rgba(0, 240, 255, 0.1) 0%, transparent 70%)'
            }} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6">
                {/* Icon based on variant */}
                <motion.div
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                        scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    }}
                >
                    {variant === 'construct' ? (
                        <Box size={64} style={{ color: 'var(--color-cyan)' }} strokeWidth={1.5} />
                    ) : variant === 'graph' ? (
                        <Network size={64} style={{ color: 'var(--color-cyan)' }} strokeWidth={1.5} />
                    ) : (
                        <Loader2 size={64} style={{ color: 'var(--color-cyan)' }} strokeWidth={1.5} />
                    )}
                </motion.div>

                {/* Loading bars */}
                <div className="flex flex-col gap-3 w-80">
                    <motion.div
                        className="h-2 rounded-full overflow-hidden"
                        style={{
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid rgba(0, 240, 255, 0.2)'
                        }}
                    >
                        <motion.div
                            className="h-full rounded-full"
                            style={{
                                background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.5) 0%, rgba(0, 240, 255, 1) 50%, rgba(0, 240, 255, 0.5) 100%)',
                                boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
                            }}
                            animate={{
                                x: ['-100%', '200%']
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'linear'
                            }}
                        />
                    </motion.div>

                    {/* Status text */}
                    <motion.div
                        className="font-mono text-center"
                        style={{
                            color: 'var(--color-cyan)',
                            fontSize: '0.75rem',
                            letterSpacing: '0.15em',
                            textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
                        }}
                        animate={{
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    >
                        {message}
                    </motion.div>
                </div>

                {/* Scanning effect */}
                <motion.div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.8) 50%, transparent 100%)',
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.8)'
                    }}
                    animate={{
                        y: ['0vh', '100vh']
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                />
            </div>
        </div>
    );
};

export const ConstructLoadingSkeleton: React.FC = () => (
    <LoadingSkeleton 
        variant="construct" 
        message="LOADING 3D CONSTRUCT ENGINE..."
    />
);

export const GraphLoadingSkeleton: React.FC = () => (
    <LoadingSkeleton 
        variant="graph" 
        message="INITIALIZING NEURAL GRAPH..."
    />
);
