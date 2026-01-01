/**
 * NeuralGrid Component Tests - Story 2-1
 * Tests for ReactFlow visual state machine with agent nodes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import NeuralGrid from '../NeuralGrid';
import { AgentProfile, NeuralPhase } from '../../types';

// Mock Socket.IO
const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
};

jest.mock('../../hooks/useSocket', () => ({
    useSocket: () => ({ socket: mockSocket, isConnected: true }),
}));

// Mock ReactFlow internals that cause issues in tests
jest.mock('reactflow', () => {
    const actual = jest.requireActual('reactflow');
    return {
        ...actual,
        // Mock getBezierPath to return a simple path
        getBezierPath: () => ['M0,0 L100,100', 50, 50, 50, 50],
    };
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>{children}</div>
    </ReactFlowProvider>
);

describe('NeuralGrid Component - Story 2-1', () => {
    const defaultProps = {
        phase: 'idle' as NeuralPhase,
        activeAgents: [] as AgentProfile[],
        files: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Node Rendering (AC: 1)', () => {
        it('[P0] should render all 8 agent nodes', () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // Verify all 8 nodes are present
            expect(screen.getByText('USER INPUT')).toBeInTheDocument();
            expect(screen.getByText('ANALYST')).toBeInTheDocument();
            expect(screen.getByText('PRODUCT MGR')).toBeInTheDocument();
            expect(screen.getByText('ARCHITECT')).toBeInTheDocument();
            expect(screen.getByText('SCRUM MASTER')).toBeInTheDocument();
            expect(screen.getByText('DEV SWARM')).toBeInTheDocument();
            expect(screen.getByText('QA ENGINEER')).toBeInTheDocument();
            expect(screen.getByText('SECURITY')).toBeInTheDocument();
        });

        it('[P0] should display phase in header', () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} phase="analysis" />
                </TestWrapper>
            );

            expect(screen.getByText('analysis')).toBeInTheDocument();
        });

        it('[P1] should display active agents in header', () => {
            render(
                <TestWrapper>
                    <NeuralGrid
                        {...defaultProps}
                        activeAgents={['analyst', 'architect']}
                    />
                </TestWrapper>
            );

            expect(screen.getByText(/ANALYST, ARCHITECT/i)).toBeInTheDocument();
        });
    });

    describe('State-Based Styling (AC: 1)', () => {
        it('[P0] should show IDLE state by default', () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // All nodes should show IDLE state
            const idleStates = screen.getAllByText('IDLE');
            expect(idleStates.length).toBeGreaterThan(0);
        });

        it('[P0] should update node state when agent is active', () => {
            render(
                <TestWrapper>
                    <NeuralGrid
                        {...defaultProps}
                        phase="analysis"
                        activeAgents={['analyst']}
                    />
                </TestWrapper>
            );

            // Analyst should be WORKING when active
            const workingStates = screen.getAllByText('WORKING');
            expect(workingStates.length).toBeGreaterThan(0);
        });

        it('[P1] should show DONE state when phase is finished', () => {
            render(
                <TestWrapper>
                    <NeuralGrid
                        {...defaultProps}
                        phase="finished"
                        activeAgents={['analyst']}
                    />
                </TestWrapper>
            );

            const doneStates = screen.getAllByText('DONE');
            expect(doneStates.length).toBeGreaterThan(0);
        });
    });

    describe('Graph Interactions (AC: 2)', () => {
        it('[P0] should open details panel on node click', async () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // Click on a node (find the analyst node container)
            const analystNode = screen.getByText('ANALYST');
            fireEvent.click(analystNode);

            // Details panel should appear
            await waitFor(() => {
                expect(screen.getByText('Agent ID')).toBeInTheDocument();
            });
        });

        it('[P1] should close details panel on close button click', async () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // Open panel
            const analystNode = screen.getByText('ANALYST');
            fireEvent.click(analystNode);

            await waitFor(() => {
                expect(screen.getByText('Agent ID')).toBeInTheDocument();
            });

            // Close panel
            const closeButton = screen.getByLabelText('Close');
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByText('Agent ID')).not.toBeInTheDocument();
            });
        });
    });

    describe('WebSocket Integration (AC: 5)', () => {
        it('[P0] should subscribe to agent:state-change events', () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // Verify socket subscription
            expect(mockSocket.on).toHaveBeenCalledWith(
                'agent:state-change',
                expect.any(Function)
            );
        });

        it('[P0] should unsubscribe on unmount', () => {
            const { unmount } = render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            unmount();

            expect(mockSocket.off).toHaveBeenCalledWith(
                'agent:state-change',
                expect.any(Function)
            );
        });

        it('[P1] should update node state on WebSocket event', async () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // Get the handler that was registered
            const onCall = mockSocket.on.mock.calls.find(
                (call) => call[0] === 'agent:state-change'
            );
            expect(onCall).toBeDefined();

            const handler = onCall[1];

            // Simulate state change event
            handler({ agentId: 'analyst', state: 'THINKING' });

            await waitFor(() => {
                const thinkingStates = screen.getAllByText('THINKING');
                expect(thinkingStates.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Cyberpunk Aesthetic (AC: 4)', () => {
        it('[P1] should have Void Black background', () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // The main container should have the dark background
            const container = document.querySelector('.bg-\\[\\#050505\\]');
            expect(container).toBeInTheDocument();
        });

        it('[P2] should display NEURAL_GRID_VISUALIZER label', () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            expect(screen.getByText('NEURAL_GRID_VISUALIZER')).toBeInTheDocument();
        });
    });

    describe('Performance (AC: 3)', () => {
        it('[P1] should render within acceptable time', () => {
            const startTime = performance.now();

            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Should render in under 100ms for good UX
            expect(renderTime).toBeLessThan(100);
        });

        it('[P2] should handle rapid state updates', async () => {
            const { rerender } = render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} />
                </TestWrapper>
            );

            // Simulate rapid phase changes
            const phases: NeuralPhase[] = [
                'analysis',
                'planning',
                'architecture',
                'implementation',
            ];

            for (const phase of phases) {
                rerender(
                    <TestWrapper>
                        <NeuralGrid {...defaultProps} phase={phase} />
                    </TestWrapper>
                );
            }

            // Should not throw errors during rapid updates
            expect(screen.getByText('implementation')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('[P2] should handle empty activeAgents array', () => {
            render(
                <TestWrapper>
                    <NeuralGrid {...defaultProps} activeAgents={[]} />
                </TestWrapper>
            );

            expect(screen.getByText(/ACTIVE AGENTS: NONE/)).toBeInTheDocument();
        });

        it('[P2] should handle undefined phase gracefully', () => {
            render(
                <TestWrapper>
                    <NeuralGrid
                        {...defaultProps}
                        phase={undefined as unknown as NeuralPhase}
                    />
                </TestWrapper>
            );

            // Should not crash
            expect(screen.getByText('USER INPUT')).toBeInTheDocument();
        });
    });
});

describe('AgentNode Component', () => {
    // AgentNode is tested indirectly through NeuralGrid
    // These tests verify the node rendering behavior

    it('[P1] should display node label and role', () => {
        render(
            <TestWrapper>
                <NeuralGrid
                    phase="idle"
                    activeAgents={[]}
                    files={[]}
                />
            </TestWrapper>
        );

        // Check that roles are displayed
        expect(screen.getByText('Discovery')).toBeInTheDocument();
        expect(screen.getByText('Planning')).toBeInTheDocument();
        expect(screen.getByText('Solutioning')).toBeInTheDocument();
    });
});

describe('AgentDetailsPanel Component', () => {
    it('[P1] should display agent capabilities', async () => {
        render(
            <TestWrapper>
                <NeuralGrid
                    phase="idle"
                    activeAgents={[]}
                    files={[]}
                />
            </TestWrapper>
        );

        // Click on analyst node
        fireEvent.click(screen.getByText('ANALYST'));

        await waitFor(() => {
            expect(screen.getByText('Capabilities')).toBeInTheDocument();
            expect(screen.getByText(/Code Analysis/)).toBeInTheDocument();
        });
    });

    it('[P1] should display agent description', async () => {
        render(
            <TestWrapper>
                <NeuralGrid
                    phase="idle"
                    activeAgents={[]}
                    files={[]}
                />
            </TestWrapper>
        );

        // Click on analyst node
        fireEvent.click(screen.getByText('ANALYST'));

        await waitFor(() => {
            expect(screen.getByText('Description')).toBeInTheDocument();
        });
    });
});
