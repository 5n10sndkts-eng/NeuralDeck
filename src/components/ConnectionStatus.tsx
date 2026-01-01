import React, { useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { ConnectionState, ConnectionInfo } from '../hooks/useSocket';

interface ConnectionStatusProps {
    connectionInfo: ConnectionInfo;
    onReconnect: () => void;
    onReload: () => void;
    compact?: boolean;
}

const stateConfig: Record<ConnectionState, {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    label: string;
    pulse: boolean;
}> = {
    connected: {
        color: '#00ff88',
        bgColor: 'rgba(0, 255, 136, 0.1)',
        borderColor: 'rgba(0, 255, 136, 0.3)',
        icon: <Wifi size={14} />,
        label: 'CONNECTED',
        pulse: false,
    },
    connecting: {
        color: '#00f0ff',
        bgColor: 'rgba(0, 240, 255, 0.1)',
        borderColor: 'rgba(0, 240, 255, 0.3)',
        icon: <Loader2 size={14} className="animate-spin" />,
        label: 'CONNECTING',
        pulse: true,
    },
    reconnecting: {
        color: '#ffaa00',
        bgColor: 'rgba(255, 170, 0, 0.1)',
        borderColor: 'rgba(255, 170, 0, 0.3)',
        icon: <RefreshCw size={14} className="animate-spin" />,
        label: 'RECONNECTING',
        pulse: true,
    },
    disconnected: {
        color: '#ff4444',
        bgColor: 'rgba(255, 68, 68, 0.1)',
        borderColor: 'rgba(255, 68, 68, 0.3)',
        icon: <WifiOff size={14} />,
        label: 'DISCONNECTED',
        pulse: false,
    },
    stale: {
        color: '#ff6600',
        bgColor: 'rgba(255, 102, 0, 0.15)',
        borderColor: 'rgba(255, 102, 0, 0.4)',
        icon: <AlertTriangle size={14} />,
        label: 'CONNECTION STALE',
        pulse: true,
    },
};

// Story 6-6: Memoized ConnectionStatus component for optimal rendering
export const ConnectionStatus: React.FC<ConnectionStatusProps> = memo(({
    connectionInfo,
    onReconnect,
    onReload,
    compact = false,
}) => {
    const config = stateConfig[connectionInfo.state];
    const showActions = connectionInfo.state === 'disconnected' || connectionInfo.state === 'stale';
    const showCountdown = connectionInfo.state === 'reconnecting' && connectionInfo.reconnectCountdown;

    const formatCountdown = useCallback((seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }, []);

    const attemptText = useMemo(() => {
        if (connectionInfo.state === 'reconnecting' && connectionInfo.reconnectAttempt > 0) {
            return `Attempt ${connectionInfo.reconnectAttempt}`;
        }
        return null;
    }, [connectionInfo.state, connectionInfo.reconnectAttempt]);

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
                title={config.label}
            >
                <motion.div
                    animate={config.pulse ? { opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: config.color,
                        boxShadow: `0 0 8px ${config.color}`,
                    }}
                />
                {connectionInfo.state !== 'connected' && (
                    <span
                        className="font-mono text-xs"
                        style={{ color: config.color }}
                    >
                        {showCountdown
                            ? formatCountdown(connectionInfo.reconnectCountdown!)
                            : config.label}
                    </span>
                )}
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={connectionInfo.state}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-2"
                style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: config.bgColor,
                    border: `1px solid ${config.borderColor}`,
                    backdropFilter: 'blur(10px)',
                }}
            >
                {/* Status Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Status Indicator */}
                        <motion.div
                            animate={config.pulse ? { opacity: [1, 0.5, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="flex items-center justify-center"
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                backgroundColor: config.bgColor,
                                border: `2px solid ${config.color}`,
                                color: config.color,
                                boxShadow: `0 0 12px ${config.color}40`,
                            }}
                        >
                            {config.icon}
                        </motion.div>

                        {/* Status Text */}
                        <div className="flex flex-col">
                            <span
                                className="font-mono text-xs font-bold tracking-wider"
                                style={{ color: config.color }}
                            >
                                {config.label}
                            </span>
                            {attemptText && (
                                <span
                                    className="font-mono text-xs opacity-70"
                                    style={{ color: config.color }}
                                >
                                    {attemptText}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Countdown */}
                    {showCountdown && (
                        <div
                            className="font-mono text-lg font-bold"
                            style={{ color: config.color }}
                        >
                            {formatCountdown(connectionInfo.reconnectCountdown!)}
                        </div>
                    )}
                </div>

                {/* Stale Connection Warning */}
                {connectionInfo.state === 'stale' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-2 border-t"
                        style={{ borderColor: config.borderColor }}
                    >
                        <p className="text-xs text-gray-400 mb-3">
                            Connection has been offline for more than 5 minutes.
                            Real-time updates may be stale. Reload recommended.
                        </p>
                    </motion.div>
                )}

                {/* Action Buttons */}
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex gap-2 pt-2 border-t"
                        style={{ borderColor: config.borderColor }}
                    >
                        <button
                            onClick={onReconnect}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                backgroundColor: 'rgba(0, 240, 255, 0.2)',
                                border: '1px solid rgba(0, 240, 255, 0.4)',
                                color: '#00f0ff',
                            }}
                        >
                            <RefreshCw size={12} />
                            TRY RECONNECT
                        </button>
                        {connectionInfo.state === 'stale' && (
                            <button
                                onClick={onReload}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    backgroundColor: 'rgba(255, 102, 0, 0.2)',
                                    border: '1px solid rgba(255, 102, 0, 0.4)',
                                    color: '#ff6600',
                                }}
                            >
                                <RefreshCw size={12} />
                                RELOAD PAGE
                            </button>
                        )}
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
});

// Add display name for React DevTools
ConnectionStatus.displayName = 'ConnectionStatus';

export default ConnectionStatus;
