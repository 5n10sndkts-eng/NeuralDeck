import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../contexts/UIContext';

interface MainLayoutProps {
    sidebar?: React.ReactNode;
    header?: React.ReactNode;
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, header, children }) => {
    const { isAlert } = useUI();

    return (
        <div className="h-screen w-screen overflow-hidden relative" style={{ backgroundColor: 'var(--color-void)', color: 'var(--color-text)' }}>
            {/* ALERT STATE OVERLAY */}
            <AnimatePresence>
                {isAlert && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none z-[0]"
                        style={{
                            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,0,60,0.2) 0%, rgba(255,0,60,0.08) 50%, transparent 100%)',
                            animation: 'pulse-glow 2s ease-in-out infinite'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* PREMIUM GLOBAL BACKGROUNDS - Enhanced Neon Renaissance */}
            {/* Animated Grid Lines */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{
                backgroundImage: `
                    linear-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
                maskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, black 30%, transparent 100%)'
            }} />

            {/* Top Glow - More Intense */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{
                background: 'radial-gradient(ellipse 120% 50% at 50% 0%, rgba(0, 240, 255, 0.12) 0%, rgba(188, 19, 254, 0.04) 40%, transparent 70%)'
            }} />

            {/* Side Accent Glows */}
            <div className="absolute left-0 top-0 bottom-0 w-1/4 pointer-events-none z-[0]" style={{
                background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.03) 0%, transparent 100%)'
            }} />
            <div className="absolute right-0 top-0 bottom-0 w-1/4 pointer-events-none z-[0]" style={{
                background: 'linear-gradient(-90deg, rgba(188, 19, 254, 0.03) 0%, transparent 100%)'
            }} />

            {/* Premium Vignette */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{
                background: 'radial-gradient(ellipse 150% 100% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.5) 100%)'
            }} />

            {/* TOP HUD BAR - Premium Neon Renaissance */}
            <div className="hud-header relative z-50" style={{
                height: '4rem',
                background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
                boxShadow: '0 0 1px rgba(0, 240, 255, 0.5), 0 1px 0 rgba(0, 240, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}>
                {/* HUD Line Accent - More Glowy */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 20%, rgba(0, 240, 255, 0.8) 50%, rgba(0, 240, 255, 0.6) 80%, transparent 100%)',
                    boxShadow: '0 0 10px rgba(0, 240, 255, 0.4), 0 0 20px rgba(0, 240, 255, 0.2)'
                }} />
                <div className="h-full flex items-center justify-between px-5">
                    {header}
                </div>
            </div>

            <div className="flex overflow-hidden relative z-40" style={{ height: 'calc(100vh - 4rem)' }}>
                {/* LEFT DOCK SLOT */}
                {sidebar}

                {/* MAIN VIEWPORT - Enhanced */}
                <main className="flex-1 relative overflow-hidden">
                    {/* Premium Scanline Effect */}
                    <div className="absolute inset-0 pointer-events-none z-[100] opacity-20" style={{
                        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.03) 2px, rgba(0, 240, 255, 0.03) 4px)'
                    }} />
                    {children}
                </main>
            </div>
        </div>
    );
};
