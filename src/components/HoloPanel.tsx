import React from 'react';
import { motion } from 'framer-motion';

interface HoloPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'glass' | 'solid' | 'alert' | 'elevated';
    glow?: 'none' | 'subtle' | 'medium' | 'intense';
    delay?: number;
    title?: string;
    status?: 'idle' | 'active' | 'warning' | 'error';
}

export const HoloPanel: React.FC<HoloPanelProps> = ({
    children,
    variant = 'glass',
    glow = 'subtle',
    delay = 0,
    title,
    status,
    className,
    style,
    ...props
}) => {

    const getVariantStyles = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
        };

        switch (variant) {
            case 'alert':
                return {
                    ...base,
                    border: '1px solid rgba(255, 0, 60, 0.5)',
                    boxShadow: '0 0 30px rgba(255, 0, 60, 0.2), inset 0 1px 0 rgba(255, 0, 60, 0.1)',
                    background: 'linear-gradient(135deg, rgba(30, 0, 10, 0.9) 0%, rgba(15, 0, 5, 0.95) 100%)'
                };
            case 'solid':
                return {
                    ...base,
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    boxShadow: '0 0 25px rgba(0, 240, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    background: 'linear-gradient(135deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 12, 0.99) 100%)'
                };
            case 'elevated':
                return {
                    ...base,
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 240, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                    background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(8, 8, 16, 0.98) 100%)'
                };
            case 'glass':
            default:
                return {
                    ...base,
                    border: '1px solid rgba(0, 240, 255, 0.15)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.85) 0%, rgba(5, 5, 12, 0.9) 100%)'
                };
        }
    };

    const getGlowStyles = (): React.CSSProperties => {
        switch (glow) {
            case 'intense':
                return { boxShadow: '0 0 40px rgba(0, 240, 255, 0.3), 0 0 80px rgba(0, 240, 255, 0.15)' };
            case 'medium':
                return { boxShadow: '0 0 25px rgba(0, 240, 255, 0.2), 0 0 50px rgba(0, 240, 255, 0.1)' };
            case 'subtle':
                return { boxShadow: '0 0 15px rgba(0, 240, 255, 0.1)' };
            default:
                return {};
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'active': return '#00f0ff';
            case 'warning': return '#ffd000';
            case 'error': return '#ff003c';
            default: return 'rgba(255, 255, 255, 0.3)';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: delay
            }}
            className={`holo-panel relative overflow-hidden rounded-lg ${className || ''}`}
            style={{
                ...getVariantStyles(),
                ...getGlowStyles(),
                ...style
            }}
            {...props as any}
        >
            {/* Corner Brackets - Cyberpunk HUD Frame */}
            <svg className="absolute top-0 left-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M0 12 L0 0 L12 0" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1" />
            </svg>
            <svg className="absolute top-0 right-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M4 0 L16 0 L16 12" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M0 4 L0 16 L12 16" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M4 16 L16 16 L16 4" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1" />
            </svg>

            {/* Glass Highlight Overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%, transparent 100%)',
                    borderRadius: 'inherit'
                }}
            />

            {/* Optional Title Bar */}
            {title && (
                <div
                    className="relative px-4 py-2 flex justify-between items-center"
                    style={{
                        borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
                        background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05) 0%, transparent 50%, rgba(0, 240, 255, 0.05) 100%)'
                    }}
                >
                    <span
                        className="text-[10px] font-mono tracking-[0.2em] uppercase"
                        style={{ color: 'rgba(0, 240, 255, 0.8)' }}
                    >
                        {title}
                    </span>
                    <div className="flex items-center gap-2">
                        {status && (
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                    backgroundColor: getStatusColor(),
                                    boxShadow: `0 0 8px ${getStatusColor()}`
                                }}
                            />
                        )}
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40" />
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/20" />
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>

            {/* Subtle Scanline Effect */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.5) 2px, rgba(0, 240, 255, 0.5) 4px)',
                    borderRadius: 'inherit'
                }}
            />
        </motion.div>
    );
};
