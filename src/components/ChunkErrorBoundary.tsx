import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ChunkErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ChunkErrorBoundary] Chunk loading error:', error, errorInfo);
        this.setState({ error, errorInfo });

        // Log to analytics if available
        if (typeof window !== 'undefined' && (window as any).analytics) {
            (window as any).analytics.track('chunk_load_error', {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
        // Force reload the page if retry fails
        setTimeout(() => {
            if (this.state.hasError) {
                window.location.reload();
            }
        }, 100);
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="w-full h-full flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.95) 0%, rgba(5, 5, 12, 0.98) 100%)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Alert background */}
                    <div className="absolute inset-0 opacity-5" style={{
                        background: 'radial-gradient(circle at center, rgba(255, 0, 0, 0.3) 0%, transparent 70%)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }} />

                    {/* Content */}
                    <motion.div
                        className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            background: 'rgba(20, 20, 30, 0.8)',
                            border: '1px solid rgba(255, 0, 0, 0.3)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        {/* Error icon */}
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        >
                            <AlertTriangle 
                                size={64} 
                                style={{ 
                                    color: '#ff0055',
                                    filter: 'drop-shadow(0 0 10px rgba(255, 0, 85, 0.5))'
                                }} 
                                strokeWidth={1.5}
                            />
                        </motion.div>

                        {/* Error title */}
                        <div className="text-center">
                            <h2 className="font-display text-xl font-bold mb-2" style={{
                                color: '#ff0055',
                                letterSpacing: '0.1em',
                                textShadow: '0 0 10px rgba(255, 0, 85, 0.5)'
                            }}>
                                MODULE LOAD FAILED
                            </h2>
                            <p className="font-mono text-sm opacity-80" style={{
                                color: 'var(--color-cyan)',
                                letterSpacing: '0.05em'
                            }}>
                                Failed to load required chunk
                            </p>
                        </div>

                        {/* Error details */}
                        {this.state.error && (
                            <div className="w-full p-4 rounded font-mono text-xs overflow-auto max-h-32" style={{
                                background: 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid rgba(255, 0, 85, 0.2)',
                                color: '#ff0055'
                            }}>
                                {this.state.error.message}
                            </div>
                        )}

                        {/* Retry button */}
                        <motion.button
                            onClick={this.handleRetry}
                            className="px-6 py-3 rounded font-mono font-bold flex items-center gap-2 transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)',
                                border: '1px solid var(--color-cyan)',
                                color: 'var(--color-cyan)',
                                textShadow: '0 0 10px rgba(0, 240, 255, 0.5)',
                                boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
                            }}
                        >
                            <RefreshCw size={16} />
                            RETRY LOAD
                        </motion.button>

                        {/* Hint text */}
                        <p className="font-mono text-xs text-center opacity-50" style={{
                            color: 'var(--color-cyan)',
                            letterSpacing: '0.05em'
                        }}>
                            Connection issues? Try refreshing the page
                        </p>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}
