import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layout, Activity, KanbanSquare, Network, FlaskConical,
    Database, Server, Layers, GitBranch, Settings, Users
} from 'lucide-react';
import { ViewMode } from '../types';
import { useUI } from '../contexts/UIContext';

interface CyberDockProps {
    activeView: ViewMode;
    onViewChange: (view: ViewMode) => void;
    show: boolean;
}

export const CyberDock: React.FC<CyberDockProps> = ({ activeView, onViewChange, show }) => {
    const { playSound } = useUI();

    const DockItem = ({ mode, icon: Icon, label }: { mode: ViewMode, icon: any, label: string }) => {
        const isActive = activeView === mode;

        return (
            <motion.button
                whileHover={{ scale: 1.1, x: 6 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                    onViewChange(mode);
                    playSound('click');
                }}
                onMouseEnter={() => playSound('hover')}
                className="dock-item group relative"
                style={{
                    width: '3.25rem',
                    height: '3.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.5rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.35)',
                    background: isActive
                        ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.18) 0%, rgba(0, 240, 255, 0.06) 100%)'
                        : 'transparent',
                    boxShadow: isActive
                        ? '0 0 24px rgba(0, 240, 255, 0.25), inset 0 0 20px rgba(0, 240, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.3)'
                        : 'none',
                    border: isActive
                        ? '1px solid rgba(0, 240, 255, 0.5)'
                        : '1px solid transparent',
                    cursor: 'pointer'
                }}
                aria-label={label}
            >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />

                {/* Active Indicator - Glowing Bar */}
                {isActive && (
                    <motion.div
                        layoutId="active-dock-indicator"
                        className="absolute"
                        style={{
                            left: '-2px',
                            width: '4px',
                            height: '75%',
                            background: 'linear-gradient(180deg, transparent 0%, #00f0ff 15%, #00f0ff 85%, transparent 100%)',
                            borderRadius: '0 2px 2px 0',
                            boxShadow: '0 0 12px rgba(0, 240, 255, 0.7), 0 0 24px rgba(0, 240, 255, 0.4)'
                        }}
                    />
                )}

                {/* Premium Tooltip */}
                <div
                    className="dock-tooltip"
                    style={{
                        position: 'absolute',
                        left: 'calc(100% + 12px)',
                        padding: '0.5rem 0.75rem',
                        background: 'linear-gradient(135deg, rgba(8, 8, 18, 0.95) 0%, rgba(5, 5, 12, 0.98) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.15em',
                        color: '#00f0ff',
                        textTransform: 'uppercase',
                        borderRadius: '4px',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        zIndex: 100,
                        backdropFilter: 'blur(12px)',
                        opacity: 0,
                        transform: 'translateX(-5px)',
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.2), 0 4px 15px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Tooltip Arrow */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '-4px',
                            top: '50%',
                            transform: 'translateY(-50%) rotate(45deg)',
                            width: '8px',
                            height: '8px',
                            background: 'rgba(8, 8, 18, 0.95)',
                            borderLeft: '1px solid rgba(0, 240, 255, 0.3)',
                            borderBottom: '1px solid rgba(0, 240, 255, 0.3)'
                        }}
                    />
                    {label}
                </div>

                <style>{`
                    .dock-item:hover {
                        color: white !important;
                        background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%) !important;
                        border-color: rgba(0, 240, 255, 0.3) !important;
                        box-shadow: 0 0 15px rgba(0, 240, 255, 0.2), inset 0 0 15px rgba(0, 240, 255, 0.05) !important;
                    }
                    .dock-item:hover .dock-tooltip {
                        opacity: 1 !important;
                        transform: translateX(0) !important;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                `}</style>
            </motion.button>
        );
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -80, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative"
                    style={{
                        width: '5rem',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '1.25rem 0',
                        gap: '0.625rem',
                        background: 'linear-gradient(180deg, rgba(8, 8, 18, 0.9) 0%, rgba(5, 5, 12, 0.95) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderRight: '1px solid rgba(0, 240, 255, 0.12)',
                        zIndex: 40
                    }}
                >
                    {/* Top Edge Glow */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[1px]"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.3) 50%, transparent 100%)'
                        }}
                    />

                    {/* Right Edge Glow */}
                    <div
                        className="absolute top-0 right-0 bottom-0 w-[1px]"
                        style={{
                            background: 'linear-gradient(180deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.05) 50%, rgba(0, 240, 255, 0.2) 100%)'
                        }}
                    />

                    {/* Navigation Items */}
                    <DockItem mode="workspace" icon={Layout} label="Workspace" />
                    <DockItem mode="orchestrator" icon={Activity} label="Orchestrator" />
                    <DockItem mode="board" icon={KanbanSquare} label="Kanban" />
                    <DockItem mode="synapse" icon={Network} label="Synapse" />

                    {/* Separator */}
                    <div
                        className="my-2"
                        style={{
                            width: '2rem',
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.3) 50%, transparent 100%)'
                        }}
                    />

                    <DockItem mode="laboratory" icon={FlaskConical} label="Laboratory" />
                    <DockItem mode="roundtable" icon={Users} label="Roundtable" />
                    <DockItem mode="construct" icon={Database} label="Construct" />
                    <DockItem mode="construct-3d" icon={Server} label="Immerse" />
                    <DockItem mode="grid" icon={Layers} label="Grid" />
                    <DockItem mode="git" icon={GitBranch} label="Git" />

                    <div style={{ flex: 1 }} />

                    {/* Bottom Separator */}
                    <div
                        className="mb-2"
                        style={{
                            width: '2rem',
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.3) 50%, transparent 100%)'
                        }}
                    />

                    <DockItem mode="connections" icon={Settings} label="System" />

                    {/* Bottom Edge Glow */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-[1px]"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.2) 50%, transparent 100%)'
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
