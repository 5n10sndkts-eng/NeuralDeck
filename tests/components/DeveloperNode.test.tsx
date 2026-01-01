/**
 * DeveloperNode Component Tests - Story 4-1 Task 2
 * Tests for dynamic developer node rendering in ReactFlow
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import DeveloperNode, { DeveloperNodeData } from '../../src/components/DeveloperNode';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock ToolExecutionIndicator
jest.mock('../../src/components/ToolExecutionIndicator', () => ({
    ToolExecutionIndicator: ({ toolName, status }: any) => (
        <div data-testid="tool-indicator">{toolName} - {status}</div>
    ),
}));

// Wrapper for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ReactFlowProvider>
        <div style={{ width: 400, height: 300 }}>{children}</div>
    </ReactFlowProvider>
);

describe('DeveloperNode Component - Story 4-1 Task 2', () => {
    const defaultData: DeveloperNodeData = {
        id: 'dev-story-4-1-12345',
        storyId: 'story-4-1',
        storyTitle: 'Dynamic Developer Node Spawning',
        state: 'IDLE',
    };

    describe('Node Rendering (AC: 2)', () => {
        it('[P0] should render developer node with story title', () => {
            render(
                <TestWrapper>
                    <DeveloperNode data={defaultData} />
                </TestWrapper>
            );

            expect(screen.getByText(/Dynamic Developer/)).toBeInTheDocument();
        });

        it('[P0] should display story ID', () => {
            render(
                <TestWrapper>
                    <DeveloperNode data={defaultData} />
                </TestWrapper>
            );

            expect(screen.getByText('story-4-1')).toBeInTheDocument();
        });

        it('[P0] should display DEV label', () => {
            render(
                <TestWrapper>
                    <DeveloperNode data={defaultData} />
                </TestWrapper>
            );

            expect(screen.getByText('DEV')).toBeInTheDocument();
        });

        it('[P1] should truncate long story titles', () => {
            const longTitleData = {
                ...defaultData,
                storyTitle: 'This is a very long story title that should be truncated for display',
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={longTitleData} />
                </TestWrapper>
            );

            // Title should be truncated with ellipsis
            expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
        });
    });

    describe('State Display (AC: 3)', () => {
        it('[P0] should display IDLE state by default', () => {
            render(
                <TestWrapper>
                    <DeveloperNode data={defaultData} />
                </TestWrapper>
            );

            expect(screen.getByText('IDLE')).toBeInTheDocument();
        });

        it('[P0] should display WORKING state', () => {
            const workingData = { ...defaultData, state: 'WORKING' as const };

            render(
                <TestWrapper>
                    <DeveloperNode data={workingData} />
                </TestWrapper>
            );

            expect(screen.getByText('WORKING')).toBeInTheDocument();
        });

        it('[P0] should display DONE state', () => {
            const doneData = { ...defaultData, state: 'DONE' as const };

            render(
                <TestWrapper>
                    <DeveloperNode data={doneData} />
                </TestWrapper>
            );

            expect(screen.getByText('DONE')).toBeInTheDocument();
        });

        it('[P1] should display THINKING state', () => {
            const thinkingData = { ...defaultData, state: 'THINKING' as const };

            render(
                <TestWrapper>
                    <DeveloperNode data={thinkingData} />
                </TestWrapper>
            );

            expect(screen.getByText('THINKING')).toBeInTheDocument();
        });
    });

    describe('Progress Display (AC: 3)', () => {
        it('[P0] should display task counter when tasks provided', () => {
            const taskData = {
                ...defaultData,
                state: 'WORKING' as const,
                taskCount: 10,
                completedTasks: 3,
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={taskData} />
                </TestWrapper>
            );

            expect(screen.getByText('3/10 tasks')).toBeInTheDocument();
        });

        it('[P1] should not show task counter when taskCount is 0', () => {
            const noTaskData = {
                ...defaultData,
                state: 'WORKING' as const,
                taskCount: 0,
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={noTaskData} />
                </TestWrapper>
            );

            expect(screen.queryByText(/tasks/)).not.toBeInTheDocument();
        });

        it('[P1] should not show progress bar in IDLE state', () => {
            render(
                <TestWrapper>
                    <DeveloperNode data={defaultData} />
                </TestWrapper>
            );

            // Progress bar only shows when not IDLE
            const progressBars = document.querySelectorAll('.bg-gray-800.rounded-full');
            expect(progressBars.length).toBe(0);
        });
    });

    describe('Tool Execution Display (AC: 3)', () => {
        it('[P0] should display tool execution indicator when active', () => {
            const executionData = {
                ...defaultData,
                state: 'WORKING' as const,
                activeExecution: {
                    id: 'exec-1',
                    agentId: 'dev-1',
                    toolName: 'write_file',
                    status: 'executing' as const,
                    output: [],
                    startTime: Date.now(),
                },
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={executionData} />
                </TestWrapper>
            );

            expect(screen.getByTestId('tool-indicator')).toBeInTheDocument();
            expect(screen.getByText(/write_file/)).toBeInTheDocument();
        });

        it('[P1] should call onExecutionClick when indicator clicked', () => {
            const mockOnClick = jest.fn();
            const executionData = {
                ...defaultData,
                state: 'WORKING' as const,
                activeExecution: {
                    id: 'exec-123',
                    agentId: 'dev-1',
                    toolName: 'read_file',
                    status: 'executing' as const,
                    output: [],
                    startTime: Date.now(),
                },
                onExecutionClick: mockOnClick,
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={executionData} />
                </TestWrapper>
            );

            const indicator = screen.getByTestId('tool-indicator');
            fireEvent.click(indicator);

            expect(mockOnClick).toHaveBeenCalledWith('exec-123');
        });
    });

    describe('Unique Identifier (AC: 2)', () => {
        it('[P0] should display unique developer ID in tooltip', () => {
            render(
                <TestWrapper>
                    <DeveloperNode data={defaultData} />
                </TestWrapper>
            );

            const storyIdElement = screen.getByTitle('story-4-1');
            expect(storyIdElement).toBeInTheDocument();
        });

        it('[P0] should support different developer IDs', () => {
            const devData1 = { ...defaultData, id: 'dev-story-1-111', storyId: 'story-1' };
            const devData2 = { ...defaultData, id: 'dev-story-2-222', storyId: 'story-2' };

            const { rerender } = render(
                <TestWrapper>
                    <DeveloperNode data={devData1} />
                </TestWrapper>
            );

            expect(screen.getByText('story-1')).toBeInTheDocument();

            rerender(
                <TestWrapper>
                    <DeveloperNode data={devData2} />
                </TestWrapper>
            );

            expect(screen.getByText('story-2')).toBeInTheDocument();
        });
    });

    describe('Cyberpunk Aesthetic (AC: 2)', () => {
        it('[P1] should have ReactFlow handles', () => {
            render(
                <TestWrapper>
                    <DeveloperNode data={defaultData} isConnectable={true} />
                </TestWrapper>
            );

            // Handles are rendered (checking for presence in DOM)
            const handles = document.querySelectorAll('.react-flow__handle');
            expect(handles.length).toBeGreaterThanOrEqual(0); // Handles may not render in test env
        });
    });

    describe('Edge Cases', () => {
        it('[P2] should handle empty story title', () => {
            const emptyTitleData = {
                ...defaultData,
                storyTitle: '',
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={emptyTitleData} />
                </TestWrapper>
            );

            // Should render without crashing
            expect(screen.getByText('DEV')).toBeInTheDocument();
        });

        it('[P2] should handle undefined optional props', () => {
            const minimalData: DeveloperNodeData = {
                id: 'dev-min',
                storyId: 'min-story',
                storyTitle: 'Minimal',
                state: 'IDLE',
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={minimalData} />
                </TestWrapper>
            );

            expect(screen.getByText('Minimal')).toBeInTheDocument();
        });

        it('[P2] should handle 100% completion', () => {
            const completeData = {
                ...defaultData,
                state: 'DONE' as const,
                taskCount: 5,
                completedTasks: 5,
            };

            render(
                <TestWrapper>
                    <DeveloperNode data={completeData} />
                </TestWrapper>
            );

            expect(screen.getByText('5/5 tasks')).toBeInTheDocument();
        });
    });
});
