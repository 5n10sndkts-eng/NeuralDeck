import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { SwarmNode } from '../hooks/useSwarm';

interface Props {
    nodes: SwarmNode[];
    edges: { source: string, target: string }[];
}

export const NeuralGraph: React.FC<Props> = ({ nodes, edges }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    const getLayout = () => {
        const spacingX = 150;
        const spacingY = 80;
        const cols = 4;

        return nodes.map((node, i) => ({
            ...node,
            x: 50 + (i % cols) * spacingX + (Math.random() * 20 - 10),
            y: 50 + Math.floor(i / cols) * spacingY
        }));
    };

    const layoutNodes = getLayout();

    return (
        <div
            className="w-full h-full relative overflow-hidden rounded-lg"
            style={{
                background: 'linear-gradient(135deg, rgba(5, 5, 12, 0.8) 0%, rgba(8, 8, 16, 0.9) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.1)',
                backdropFilter: 'blur(12px)'
            }}
        >
            {/* Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '30px 30px'
                }}
            />

            {/* Corner Brackets */}
            <svg className="absolute top-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
                <path d="M0 15 L0 0 L15 0" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1.5" />
            </svg>
            <svg className="absolute top-0 right-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
                <path d="M5 0 L20 0 L20 15" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1.5" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
                <path d="M0 5 L0 20 L15 20" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1.5" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
                <path d="M5 20 L20 20 L20 5" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1.5" />
            </svg>

            {/* SVG for edges */}
            <svg ref={svgRef} className="w-full h-full absolute inset-0 pointer-events-none">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(0, 240, 255, 0.1)" />
                        <stop offset="50%" stopColor="rgba(0, 240, 255, 0.4)" />
                        <stop offset="100%" stopColor="rgba(0, 240, 255, 0.1)" />
                    </linearGradient>
                    <marker
                        id="arrow"
                        markerWidth="10"
                        markerHeight="10"
                        refX="20"
                        refY="3"
                        orient="auto"
                        markerUnits="strokeWidth"
                    >
                        <path d="M0,0 L0,6 L9,3 z" fill="rgba(0, 240, 255, 0.6)" />
                    </marker>
                </defs>

                {edges.map((edge, i) => {
                    const source = layoutNodes.find(n => n.id === edge.source);
                    const target = layoutNodes.find(n => n.id === edge.target);
                    if (!source || !target) return null;

                    return (
                        <motion.line
                            key={i}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke="url(#edgeGradient)"
                            strokeWidth="2"
                            markerEnd="url(#arrow)"
                            filter="url(#glow)"
                        />
                    );
                })}
            </svg>

            {/* Nodes */}
            {layoutNodes.map((node) => (
                <motion.div
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.08, zIndex: 50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="absolute cursor-pointer"
                    style={{
                        left: node.x,
                        top: node.y,
                        transform: 'translate(-50%, -50%)',
                        maxWidth: '130px'
                    }}
                >
                    <div
                        className="relative p-2.5 rounded-lg overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${getNodeColor(node.type, 0.15)} 0%, ${getNodeColor(node.type, 0.05)} 100%)`,
                            border: `1px solid ${getNodeColor(node.type, 0.5)}`,
                            boxShadow: `0 0 20px ${getNodeColor(node.type, 0.3)}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
                        }}
                    >
                        {/* Node Type Badge */}
                        <div
                            className="text-[9px] font-bold uppercase tracking-wider mb-1.5"
                            style={{
                                fontFamily: 'var(--font-display)',
                                color: getNodeColor(node.type, 0.8)
                            }}
                        >
                            {node.type}
                        </div>

                        {/* Node Content */}
                        <div
                            className="text-[10px] truncate"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                color: 'rgba(255, 255, 255, 0.7)'
                            }}
                        >
                            {node.content}
                        </div>

                        {/* Corner Accent */}
                        <div
                            className="absolute top-0 left-0 w-2 h-2"
                            style={{
                                borderTop: `1px solid ${getNodeColor(node.type, 0.8)}`,
                                borderLeft: `1px solid ${getNodeColor(node.type, 0.8)}`
                            }}
                        />
                        <div
                            className="absolute bottom-0 right-0 w-2 h-2"
                            style={{
                                borderBottom: `1px solid ${getNodeColor(node.type, 0.8)}`,
                                borderRight: `1px solid ${getNodeColor(node.type, 0.8)}`
                            }}
                        />
                    </div>
                </motion.div>
            ))}

            {/* Empty State */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div
                            className="text-xs uppercase tracking-[0.2em] mb-2"
                            style={{
                                fontFamily: 'var(--font-display)',
                                color: 'rgba(0, 240, 255, 0.3)'
                            }}
                        >
                            Neural Pathway
                        </div>
                        <div
                            className="text-[10px]"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                color: 'rgba(255, 255, 255, 0.3)'
                            }}
                        >
                            Awaiting node activation...
                        </div>
                    </div>
                </div>
            )}

            {/* Scanline Effect */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.5) 2px, rgba(0, 240, 255, 0.5) 4px)'
                }}
            />
        </div>
    );
};

const getNodeColor = (type: SwarmNode['type'], alpha: number) => {
    switch (type) {
        case 'plan': return `rgba(255, 208, 0, ${alpha})`; // Yellow
        case 'code': return `rgba(10, 255, 10, ${alpha})`; // Green
        case 'analysis': return `rgba(0, 240, 255, ${alpha})`; // Cyan
        case 'review': return `rgba(255, 0, 60, ${alpha})`; // Red
        default: return `rgba(255, 255, 255, ${alpha})`;
    }
};
