/**
 * DeveloperNode.tsx - Dynamic Developer Node for ReactFlow
 * Story 4-1: Dynamic Developer Node Spawning
 *
 * Renders individual developer nodes that are dynamically spawned
 * when story files are detected in the stories/ directory.
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { AgentNodeState, ToolExecution } from '../types';
import { ToolExecutionIndicator } from './ToolExecutionIndicator';

export interface DeveloperNodeData {
    id: string;                     // Unique developer ID (e.g., 'dev-story-4-1-1234567')
    storyId: string;                // Associated story file ID
    storyTitle: string;             // Story title for display
    state: AgentNodeState;          // IDLE, THINKING, WORKING, DONE
    progress?: number;              // 0-100 progress percentage
    activeExecution?: ToolExecution;
    onExecutionClick?: (executionId: string) => void;
    taskCount?: number;             // Total tasks in story
    completedTasks?: number;        // Completed tasks count
}

interface DeveloperNodeProps {
    data: DeveloperNodeData;
    isConnectable?: boolean;
}

/**
 * State-based styling matching AgentNode Cyberpunk aesthetic
 */
const getStateStyles = (state: AgentNodeState) => {
    switch (state) {
        case 'THINKING':
            return {
                borderColor: '#ff6b00',     // Orange for thinking
                backgroundColor: 'rgba(255, 107, 0, 0.1)',
                boxShadow: '0 0 20px rgba(255, 107, 0, 0.6)',
            };
        case 'WORKING':
            return {
                borderColor: '#00f0ff',     // Electric Cyan for working
                backgroundColor: 'rgba(0, 240, 255, 0.15)',
                boxShadow: '0 0 25px rgba(0, 240, 255, 0.8)',
            };
        case 'DONE':
            return {
                borderColor: '#00ff41',     // Matrix Green for done
                backgroundColor: 'rgba(0, 255, 65, 0.1)',
                boxShadow: '0 0 15px rgba(0, 255, 65, 0.6)',
            };
        case 'IDLE':
        default:
            return {
                borderColor: '#444',
                backgroundColor: 'rgba(30, 30, 30, 0.8)',
                boxShadow: 'none',
                opacity: 0.7,
            };
    }
};

/**
 * Truncate story title for display
 */
const truncateTitle = (title: string, maxLength: number = 20): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
};

const DeveloperNode: React.FC<DeveloperNodeProps> = ({ data, isConnectable }) => {
    const {
        id,
        storyId,
        storyTitle,
        state,
        progress = 0,
        activeExecution,
        onExecutionClick,
        taskCount = 0,
        completedTasks = 0,
    } = data;

    const stateStyles = getStateStyles(state);
    const displayTitle = truncateTitle(storyTitle);
    const progressPercent = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : progress;

    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                style={{ background: '#ff00ff', border: 'none' }}
            />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: 1,
                    opacity: 1,
                }}
                transition={{
                    duration: 0.4,
                    ease: [0.34, 1.56, 0.64, 1], // Spring-like entrance
                }}
                className="relative px-3 py-2 rounded-lg backdrop-blur-sm border-2"
                style={{
                    minWidth: '120px',
                    maxWidth: '160px',
                    background: stateStyles.backgroundColor,
                    borderColor: stateStyles.borderColor,
                    boxShadow: stateStyles.boxShadow,
                    opacity: stateStyles.opacity ?? 1,
                }}
            >
                {/* Tool Execution Indicator */}
                {activeExecution ? (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onExecutionClick?.(activeExecution.id);
                        }}
                        className="cursor-pointer absolute -top-2 -right-2"
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
                        className="absolute -top-2 -right-2 w-3 h-3 border-2 border-cyber-cyan border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    />
                ) : null}

                {/* Developer Label */}
                <div className="text-center">
                    <div className="text-[10px] font-mono text-gray-400 mb-0.5">
                        DEV
                    </div>
                    <div className="text-xs font-display tracking-wide text-white font-semibold leading-tight">
                        {displayTitle}
                    </div>
                    <div className="text-[8px] font-mono text-gray-500 mt-0.5 truncate" title={storyId}>
                        {storyId}
                    </div>

                    {/* Progress Bar */}
                    {state !== 'IDLE' && (
                        <div className="mt-1.5 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{
                                    backgroundColor: state === 'DONE' ? '#00ff41' : '#00f0ff',
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                    )}

                    {/* Task Counter */}
                    {taskCount > 0 && (
                        <div className="text-[8px] font-mono text-gray-500 mt-0.5">
                            {completedTasks}/{taskCount} tasks
                        </div>
                    )}

                    {/* State Indicator */}
                    <div className="text-[7px] font-mono mt-1">
                        <span
                            className={`
                                px-1 py-0.5 rounded
                                ${state === 'THINKING' ? 'bg-orange-500/20 text-orange-400' : ''}
                                ${state === 'WORKING' ? 'bg-cyber-cyan/30 text-cyber-cyan' : ''}
                                ${state === 'DONE' ? 'bg-green-500/20 text-green-400' : ''}
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
                            'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                    }}
                />
            </motion.div>

            <Handle
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                style={{ background: '#ff00ff', border: 'none' }}
            />
        </>
    );
};

export default DeveloperNode;
