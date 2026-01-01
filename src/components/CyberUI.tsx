import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../contexts/UIContext';

// --- CyberButton v3 (Premium Neon Glass) ---
interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    glow?: boolean;
    icon?: React.ReactNode;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
    children, className, variant = 'primary', size = 'md', glow = true, icon, onClick, onMouseEnter, ...props
}) => {
    const { playSound } = useUI();

    const getVariantStyles = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 700,
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            borderRadius: '6px',
        };

        const sizes: Record<string, React.CSSProperties> = {
            sm: { padding: '0.375rem 0.875rem', fontSize: '0.625rem', borderRadius: '4px' },
            md: { padding: '0.625rem 1.25rem', fontSize: '0.6875rem', borderRadius: '6px' },
            lg: { padding: '0.75rem 1.75rem', fontSize: '0.75rem', borderRadius: '8px' }
        };

        const variants: Record<string, React.CSSProperties> = {
            primary: {
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(0, 240, 255, 0.04) 100%)',
                color: '#00f0ff',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                boxShadow: glow 
                    ? '0 0 1px rgba(0, 240, 255, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.2)'
            },
            secondary: {
                background: 'linear-gradient(135deg, rgba(188, 19, 254, 0.12) 0%, rgba(188, 19, 254, 0.04) 100%)',
                color: '#bc13fe',
                border: '1px solid rgba(188, 19, 254, 0.4)',
                boxShadow: glow 
                    ? '0 0 1px rgba(188, 19, 254, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.2)'
            },
            danger: {
                background: 'linear-gradient(135deg, rgba(255, 0, 60, 0.12) 0%, rgba(255, 0, 60, 0.04) 100%)',
                color: '#ff003c',
                border: '1px solid rgba(255, 0, 60, 0.4)',
                boxShadow: glow 
                    ? '0 0 1px rgba(255, 0, 60, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.2)'
            },
            ghost: {
                background: 'rgba(10, 10, 20, 0.4)',
                color: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }
        };

        return { ...base, ...sizes[size], ...variants[variant] };
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={getVariantStyles()}
            className={`cyber-button ${className || ''}`}
            onClick={(e) => {
                playSound('click');
                onClick?.(e);
            }}
            onMouseEnter={(e) => {
                playSound('hover');
                onMouseEnter?.(e);
            }}
            {...props as any}
        >
            {/* Shine Effect */}
            <div
                className="cyber-button-shine"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                    transform: 'skewX(-15deg)',
                    transition: 'left 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            />

            {icon && <span style={{ position: 'relative', zIndex: 10, display: 'flex' }}>{icon}</span>}
            <span style={{ position: 'relative', zIndex: 10 }}>{children}</span>

            <style>{`
                .cyber-button:hover .cyber-button-shine {
                    left: 100%;
                }
                .cyber-button:hover {
                    border-color: currentColor !important;
                    box-shadow: 0 0 5px currentColor, 0 0 15px rgba(0, 240, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
                    text-shadow: 0 0 10px currentColor !important;
                }
            `}</style>
        </motion.button>
    );
};

// --- CyberPanel v3 (Premium Holographic Glass) ---
interface CyberPanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    loading?: boolean;
    variant?: 'glass' | 'solid' | 'elevated';
    status?: 'idle' | 'active' | 'warning' | 'error';
}

export const CyberPanel: React.FC<CyberPanelProps> = ({
    children, className, title, loading, variant = 'glass', status
}) => {
    const getVariantStyles = (): React.CSSProperties => {
        const variants: Record<string, React.CSSProperties> = {
            glass: {
                background: 'linear-gradient(135deg, rgba(10, 10, 18, 0.88) 0%, rgba(5, 5, 12, 0.96) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.18)',
                boxShadow: '0 0 1px rgba(0, 240, 255, 0.5), 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
            },
            solid: {
                background: 'linear-gradient(135deg, rgba(12, 12, 22, 0.98) 0%, rgba(6, 6, 14, 0.99) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.25)',
                boxShadow: '0 0 25px rgba(0, 240, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            },
            elevated: {
                background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.92) 0%, rgba(8, 8, 16, 0.96) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                boxShadow: '0 0 2px rgba(0, 240, 255, 0.7), 0 0 20px rgba(0, 240, 255, 0.15), 0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
            }
        };
        return variants[variant];
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-lg ${className || ''}`}
            style={{
                ...getVariantStyles(),
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)'
            }}
        >
            {/* Corner Brackets */}
            <svg className="absolute top-0 left-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M0 12 L0 0 L12 0" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1.5" />
            </svg>
            <svg className="absolute top-0 right-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M4 0 L16 0 L16 12" fill="none" stroke="rgba(0, 240, 255, 0.5)" strokeWidth="1.5" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M0 4 L0 16 L12 16" fill="none" stroke="rgba(188, 19, 254, 0.5)" strokeWidth="1.5" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16">
                <path d="M4 16 L16 16 L16 4" fill="none" stroke="rgba(188, 19, 254, 0.5)" strokeWidth="1.5" />
            </svg>

            {/* Glass Highlight */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, transparent 40%, transparent 100%)',
                    borderRadius: 'inherit'
                }}
            />

            {title && (
                <div
                    className="relative px-4 py-2.5 flex items-center justify-between"
                    style={{
                        borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
                        background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05) 0%, transparent 50%, rgba(0, 240, 255, 0.05) 100%)'
                    }}
                >
                    <span
                        className="flex items-center gap-2"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '10px',
                            color: '#00f0ff',
                            letterSpacing: '0.2em',
                            textShadow: '0 0 10px rgba(0,240,255,0.5)'
                        }}
                    >
                        {loading && (
                            <div
                                className="w-1.5 h-1.5 rounded-full animate-pulse"
                                style={{ backgroundColor: '#00f0ff', boxShadow: '0 0 8px #00f0ff' }}
                            />
                        )}
                        {title.toUpperCase()}
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
                            <div style={{ width: '3px', height: '10px', background: 'rgba(0, 240, 255, 0.4)', transform: 'skewX(-12deg)' }} />
                            <div style={{ width: '3px', height: '10px', background: 'rgba(188, 19, 254, 0.4)', transform: 'skewX(-12deg)' }} />
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 p-4">
                {children}
            </div>

            {/* Scanline Effect */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.8) 2px, rgba(0, 240, 255, 0.8) 4px)',
                    borderRadius: 'inherit'
                }}
            />
        </motion.div>
    );
};

// --- CyberTerminal v3 (Premium CRT Effect) ---
export const CyberTerminal: React.FC<{ lines: any[]; className?: string }> = ({ lines, className }) => {
    return (
        <div
            className={`relative overflow-hidden ${className || ''}`}
            style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '1rem',
                background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(5, 5, 12, 0.98) 100%)',
                borderTop: '1px solid rgba(0, 240, 255, 0.2)',
                height: '12rem',
                overflowY: 'auto'
            }}
        >
            {/* CRT Glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0, 240, 255, 0.05) 0%, transparent 70%)'
                }}
            />

            {/* Scanlines */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)'
                }}
            />

            <AnimatePresence initial={false}>
                {lines.map((line, i) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i}
                        className="relative z-10 mb-1"
                        style={{ color: 'rgba(10, 255, 10, 0.9)', textShadow: '0 0 5px rgba(10, 255, 10, 0.5)' }}
                    >
                        <span style={{ color: '#00f0ff', marginRight: '0.5rem', opacity: 0.7 }}>❯</span>
                        {line.content || line}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

// --- CyberInput v3 (Premium Neon Input) ---
export const CyberInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => {
        return (
            <div className="cyber-input-wrapper relative group">
                <input
                    ref={ref}
                    className={`cyber-input ${className || ''}`}
                    style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, rgba(5, 5, 12, 0.9) 0%, rgba(8, 8, 16, 0.95) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.15)',
                        color: '#00f0ff',
                        padding: '0.75rem 1rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '4px',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'
                    }}
                    {...props}
                />
                {/* Focus Glow */}
                <div
                    className="cyber-input-glow absolute inset-0 pointer-events-none rounded opacity-0 transition-opacity"
                    style={{
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 15px rgba(0, 240, 255, 0.1)'
                    }}
                />
                {/* Bottom Accent */}
                <div
                    className="cyber-input-accent absolute bottom-0 left-1/2 w-0 h-[2px] transition-all"
                    style={{
                        background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)',
                        transform: 'translateX(-50%)'
                    }}
                />
                <style>{`
                    .cyber-input:focus {
                        border-color: rgba(0, 240, 255, 0.5) !important;
                        box-shadow: 0 0 20px rgba(0, 240, 255, 0.15) !important;
                    }
                    .cyber-input:focus + .cyber-input-glow {
                        opacity: 1;
                    }
                    .cyber-input:focus ~ .cyber-input-accent {
                        width: 80%;
                    }
                    .cyber-input::placeholder {
                        color: rgba(0, 240, 255, 0.3);
                    }
                `}</style>
            </div>
        );
    }
);
CyberInput.displayName = "CyberInput";

// --- Section Header Component ---
interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    status?: 'idle' | 'active' | 'warning' | 'error';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, actions, status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'active': return '#00f0ff';
            case 'warning': return '#ffd000';
            case 'error': return '#ff003c';
            default: return null;
        }
    };

    return (
        <div
            className="flex items-center justify-between mb-4 pb-3"
            style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}
        >
            <div className="flex items-center gap-3">
                {status && getStatusColor() && (
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: getStatusColor()!,
                            boxShadow: `0 0 10px ${getStatusColor()}`
                        }}
                    />
                )}
                <div>
                    <h3
                        className="text-xs font-bold uppercase tracking-[0.2em]"
                        style={{
                            fontFamily: 'var(--font-display)',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}
                    >
                        {title}
                    </h3>
                    {subtitle && (
                        <p
                            className="text-[10px] mt-0.5"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                color: 'rgba(0, 240, 255, 0.5)'
                            }}
                        >
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
};
