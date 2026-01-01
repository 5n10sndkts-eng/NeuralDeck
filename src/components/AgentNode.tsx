import React from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { AgentNodeData, AgentNodeState, ToolExecution } from '../types';
import { ToolExecutionIndicator } from './ToolExecutionIndicator';

interface AgentNodeProps {
    data: AgentNodeData & {
        activeExecution?: ToolExecution;
        onExecutionClick?: (executionId: string) => void;
    };
    isConnectable?: boolean;
}

const AgentNode: React.FC<AgentNodeProps> = ({ data, isConnectable }) => {
    const { label, role, state, activeExecution, onExecutionClick } = data;

    // State-based styling and animations
    const getStateStyles = (state: AgentNodeState) => {
        switch (state) {
            case 'THINKING':
                return {
                    borderColor: '#00f0ff',
                    backgroundColor: 'rgba(0, 240, 255, 0.1)',
                    boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                };
            case 'WORKING':
                return {
                    borderColor: '#00f0ff',
                    backgroundColor: 'rgba(0, 240, 255, 0.15)',
                    boxShadow: '0 0 25px rgba(0, 240, 255, 0.8)',
                };
            case 'DONE':
                return {
                    borderColor: '#00ff41',
                    backgroundColor: 'rgba(0, 255, 65, 0.1)',
                    boxShadow: '0 0 15px rgba(0, 255, 65, 0.6)',
                };
            case 'IDLE':
            default:
                return {
                    borderColor: '#333',
                    backgroundColor: 'rgba(20, 20, 20, 0.8)',
                    boxShadow: 'none',
                    opacity: 0.5,
                };
        }
    };

    const stateStyles = getStateStyles(state);

    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                style={{ background: '#00f0ff', border: 'none' }}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                    scale: 1,
                    opacity: 1,
                    ...stateStyles,
                }}
                transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                }}
                className="relative px-4 py-3 rounded-lg backdrop-blur-sm border-2"
                style={{
                    minWidth: '140px',
                    background: stateStyles.backgroundColor,
                    borderColor: stateStyles.borderColor,
                    boxShadow: stateStyles.boxShadow,
                }}
            >
                {/* Tool Execution Indicator (replaces simple spinner when executing tools) */}
                {activeExecution ? (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onExecutionClick?.(activeExecution.id);
                        }}
                        className="cursor-pointer"
                    >
                        <ToolExecutionIndicator
                            isExecuting={activeExecution.status === 'executing'}
                            status={activeExecution.status}
                            toolName={activeExecution.toolName}
                            size="sm"
                        />
                    </div>
                ) : state === 'WORKING' ? (
                    <motion.div
                        className="absolute -top-2 -right-2 w-4 h-4 border-2 border-cyber-cyan border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    />
                ) : null}

                {/* Label */}
                <div className="text-center">
                    <div className="text-sm font-display tracking-wider text-white font-bold uppercase">
                        {label}
                    </div>
                    <div className="text-[10px] font-mono text-gray-400 mt-1">
                        {role}
                    </div>

                    {/* State Indicator */}
                    <div className="text-[8px] font-mono mt-1">
                        <span
                            className={`
                px-1.5 py-0.5 rounded
                ${state === 'THINKING' ? 'bg-cyber-cyan/20 text-cyber-cyan' : ''}
                ${state === 'WORKING' ? 'bg-cyber-cyan/30 text-cyber-cyan' : ''}
                ${state === 'DONE' ? 'bg-cyber-green/20 text-cyber-green' : ''}
                ${state === 'IDLE' ? 'bg-gray-700/20 text-gray-500' : ''}
              `}
                        >
                            {state}
                        </span>
                    </div>
                </div>

                {/* Glassmorphism overlay */}
                <div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                    }}
                />
            </motion.div>

            <Handle
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                style={{ background: '#00f0ff', border: 'none' }}
            />

            {/* Pulse animation styles */}
            <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
        </>
    );
};

export default AgentNode;
