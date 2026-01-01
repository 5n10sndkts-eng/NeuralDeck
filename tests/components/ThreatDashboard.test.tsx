/**
 * ThreatDashboard Component Tests - Story 5-3
 *
 * Tests for the Threat Assessment Dashboard component.
 */

// Mock modules that use import.meta.env before importing component
jest.mock('../../src/services/api', () => ({
    sendChat: jest.fn(() => Promise.resolve({ role: 'assistant', content: 'test', timestamp: Date.now() })),
    readFile: jest.fn(() => Promise.resolve('')),
    fetchFiles: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../src/hooks/useSocket', () => ({
    useSocket: jest.fn(() => ({
        socket: { on: jest.fn(), off: jest.fn() },
        isConnected: true,
    })),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThreatDashboard } from '../../src/components/ThreatDashboard';
import { VulnerabilityFinding, VulnerabilitySeverity, VulnerabilityType } from '../../src/types';

// Mock useUI context
jest.mock('../../src/contexts/UIContext', () => ({
    useUI: () => ({
        playSound: jest.fn(),
    }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock fetch
global.fetch = jest.fn();

// --- Test Data ---

const createMockFinding = (
    id: string,
    severity: VulnerabilitySeverity,
    type: VulnerabilityType = 'SQL_INJECTION',
    status: 'open' | 'reviewed' | 'fixed' | 'false_positive' = 'open'
): VulnerabilityFinding => ({
    id,
    type,
    severity,
    title: `${severity} - ${type} vulnerability`,
    description: `A ${severity.toLowerCase()} severity ${type} vulnerability`,
    filePath: `/src/file-${id}.ts`,
    lineNumber: 42,
    codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
    impact: `Potential ${severity.toLowerCase()} impact on system security`,
    remediation: 'Use parameterized queries',
    detectedBy: 'vuln_scanner',
    timestamp: Date.now(),
    status,
});

const mockFindings: VulnerabilityFinding[] = [
    createMockFinding('vuln-1', 'Critical', 'SQL_INJECTION'),
    createMockFinding('vuln-2', 'High', 'XSS'),
    createMockFinding('vuln-3', 'High', 'COMMAND_INJECTION'),
    createMockFinding('vuln-4', 'Medium', 'HARDCODED_SECRET'),
    createMockFinding('vuln-5', 'Low', 'SECURITY_MISCONFIGURATION'),
];

// --- Tests ---

describe('ThreatDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            json: () => Promise.resolve({ findings: mockFindings }),
        });
    });

    describe('Rendering', () => {
        it('should render the dashboard header', () => {
            render(<ThreatDashboard findings={mockFindings} />);

            expect(screen.getByText('THREAT ASSESSMENT')).toBeInTheDocument();
            expect(screen.getByText(/5 vulnerabilities detected/i)).toBeInTheDocument();
        });

        it('should render severity summary cards', () => {
            render(<ThreatDashboard findings={mockFindings} />);

            // Check severity counts
            expect(screen.getByText('1')).toBeInTheDocument(); // Critical
            expect(screen.getByText('2')).toBeInTheDocument(); // High
        });

        it('should render vulnerability findings list', () => {
            render(<ThreatDashboard findings={mockFindings} />);

            // Check finding titles are rendered
            expect(screen.getByText(/Critical - SQL_INJECTION vulnerability/)).toBeInTheDocument();
            expect(screen.getByText(/High - XSS vulnerability/)).toBeInTheDocument();
        });

        it('should display empty state when no findings', () => {
            render(<ThreatDashboard findings={[]} />);

            expect(screen.getByText('No vulnerabilities found')).toBeInTheDocument();
        });
    });

    describe('Severity Filtering', () => {
        it('should filter findings by severity when card is clicked', async () => {
            render(<ThreatDashboard findings={mockFindings} />);

            // Find and click the Critical severity card
            const criticalButtons = screen.getAllByRole('button');
            const criticalCard = criticalButtons.find(btn =>
                btn.textContent?.includes('Critical')
            );

            if (criticalCard) {
                fireEvent.click(criticalCard);

                // Should show only Critical findings
                await waitFor(() => {
                    expect(screen.getByText(/Showing 1 critical findings/i)).toBeInTheDocument();
                });
            }
        });

        it('should clear filter when same severity is clicked again', async () => {
            render(<ThreatDashboard findings={mockFindings} />);

            const criticalButtons = screen.getAllByRole('button');
            const criticalCard = criticalButtons.find(btn =>
                btn.textContent?.includes('Critical')
            );

            if (criticalCard) {
                // Click to filter
                fireEvent.click(criticalCard);
                // Click again to clear
                fireEvent.click(criticalCard);

                await waitFor(() => {
                    expect(screen.queryByText(/Showing.*critical findings/i)).not.toBeInTheDocument();
                });
            }
        });
    });

    describe('Finding Expansion', () => {
        it('should expand finding to show details when clicked', async () => {
            render(<ThreatDashboard findings={mockFindings} />);

            // Find a finding button and click it
            const findingButton = screen.getByText(/Critical - SQL_INJECTION vulnerability/).closest('button');

            if (findingButton) {
                fireEvent.click(findingButton);

                await waitFor(() => {
                    expect(screen.getByText('Description')).toBeInTheDocument();
                    expect(screen.getByText('Impact')).toBeInTheDocument();
                    expect(screen.getByText('Remediation')).toBeInTheDocument();
                });
            }
        });

        it('should show code snippet in expanded finding', async () => {
            render(<ThreatDashboard findings={mockFindings} />);

            const findingButton = screen.getByText(/Critical - SQL_INJECTION vulnerability/).closest('button');

            if (findingButton) {
                fireEvent.click(findingButton);

                await waitFor(() => {
                    expect(screen.getByText('Code Snippet')).toBeInTheDocument();
                    expect(screen.getByText(/SELECT \* FROM users/)).toBeInTheDocument();
                });
            }
        });
    });

    describe('Status Updates', () => {
        it('should allow changing finding status', async () => {
            const mockFetch = global.fetch as jest.Mock;
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true }),
            });

            render(<ThreatDashboard scanId="scan-123" findings={mockFindings} />);

            // Expand a finding first
            const findingButton = screen.getByText(/Critical - SQL_INJECTION vulnerability/).closest('button');
            if (findingButton) fireEvent.click(findingButton);

            await waitFor(() => {
                expect(screen.getByText('Update Status:')).toBeInTheDocument();
            });

            // Find the status dropdown and change it
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'fixed' } });

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith(
                    '/api/security/findings/scan-123/vuln-1',
                    expect.objectContaining({
                        method: 'PUT',
                        body: JSON.stringify({ status: 'fixed' }),
                    })
                );
            });
        });
    });

    describe('Export Functionality', () => {
        let mockCreateObjectURL: jest.Mock;
        let mockRevokeObjectURL: jest.Mock;
        let mockAnchorClick: jest.Mock;
        let originalCreateElement: typeof document.createElement;

        beforeEach(() => {
            mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
            mockRevokeObjectURL = jest.fn();
            mockAnchorClick = jest.fn();

            URL.createObjectURL = mockCreateObjectURL;
            URL.revokeObjectURL = mockRevokeObjectURL;

            // Store original before mocking
            originalCreateElement = document.createElement.bind(document);

            jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                if (tag === 'a') {
                    return { click: mockAnchorClick, href: '', download: '' } as any;
                }
                return originalCreateElement(tag);
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should export findings as JSON', async () => {
            render(<ThreatDashboard scanId="scan-123" findings={mockFindings} />);

            // Hover over export button to show dropdown
            const exportButton = screen.getByText(/Export/);
            fireEvent.mouseEnter(exportButton.closest('.group') as Element);

            // Click JSON export
            const jsonExportButton = screen.getByText('Export as JSON');
            fireEvent.click(jsonExportButton);

            expect(mockCreateObjectURL).toHaveBeenCalled();
            expect(mockAnchorClick).toHaveBeenCalled();
        });

        it('should export findings as CSV', async () => {
            render(<ThreatDashboard scanId="scan-123" findings={mockFindings} />);

            // Hover over export button to show dropdown
            const exportButton = screen.getByText(/Export/);
            fireEvent.mouseEnter(exportButton.closest('.group') as Element);

            // Click CSV export
            const csvExportButton = screen.getByText('Export as CSV');
            fireEvent.click(csvExportButton);

            expect(mockCreateObjectURL).toHaveBeenCalled();
            expect(mockAnchorClick).toHaveBeenCalled();
        });
    });

    describe('API Integration', () => {
        it('should fetch findings when scanId is provided', async () => {
            const mockFetch = global.fetch as jest.Mock;
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ findings: mockFindings }),
            });

            render(<ThreatDashboard scanId="scan-123" />);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/security/findings/scan-123');
            });
        });

        it('should handle fetch errors gracefully', async () => {
            const mockFetch = global.fetch as jest.Mock;
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            render(<ThreatDashboard scanId="scan-123" />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    '[ThreatDash] Failed to fetch findings:',
                    expect.any(Error)
                );
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Real-time Updates', () => {
        it('should expose addFinding function globally', () => {
            render(<ThreatDashboard findings={[]} />);

            expect((window as any).__threatDashboardAddFinding).toBeDefined();
            expect(typeof (window as any).__threatDashboardAddFinding).toBe('function');
        });

        it('should add new findings via global function', async () => {
            render(<ThreatDashboard findings={[]} />);

            const newFinding = createMockFinding('new-vuln', 'Critical', 'XSS');

            act(() => {
                (window as any).__threatDashboardAddFinding(newFinding);
            });

            await waitFor(() => {
                expect(screen.getByText(/Critical - XSS vulnerability/)).toBeInTheDocument();
            });
        });

        it('should not add duplicate findings', async () => {
            const finding = createMockFinding('vuln-1', 'Critical');
            render(<ThreatDashboard findings={[finding]} />);

            const initialCount = screen.getAllByText(/Critical/i).length;

            act(() => {
                (window as any).__threatDashboardAddFinding(finding);
            });

            await waitFor(() => {
                const newCount = screen.getAllByText(/Critical/i).length;
                expect(newCount).toBe(initialCount);
            });
        });

        it('should cleanup global function on unmount', () => {
            const { unmount } = render(<ThreatDashboard findings={[]} />);

            expect((window as any).__threatDashboardAddFinding).toBeDefined();

            unmount();

            expect((window as any).__threatDashboardAddFinding).toBeUndefined();
        });
    });

    describe('Callbacks', () => {
        it('should call onClose when close button is clicked', () => {
            const onClose = jest.fn();
            render(<ThreatDashboard findings={mockFindings} onClose={onClose} />);

            const closeButton = screen.getByText('✕');
            fireEvent.click(closeButton);

            expect(onClose).toHaveBeenCalled();
        });

        it('should call onStartScan when new scan button is clicked', () => {
            const onStartScan = jest.fn();
            render(<ThreatDashboard findings={mockFindings} onStartScan={onStartScan} />);

            const newScanButton = screen.getByText('New Scan');
            fireEvent.click(newScanButton);

            expect(onStartScan).toHaveBeenCalled();
        });
    });

    describe('Sorting', () => {
        it('should sort findings by severity (Critical first)', () => {
            const unsortedFindings = [
                createMockFinding('low-1', 'Low'),
                createMockFinding('crit-1', 'Critical'),
                createMockFinding('med-1', 'Medium'),
                createMockFinding('high-1', 'High'),
            ];

            render(<ThreatDashboard findings={unsortedFindings} />);

            const findingElements = screen.getAllByText(/vulnerability/);

            // First should be Critical
            expect(findingElements[0]).toHaveTextContent(/Critical/);
        });
    });
});

describe('ThreatDashboard Severity Summary', () => {
    it('should calculate correct counts for each severity', () => {
        const findings = [
            createMockFinding('c1', 'Critical'),
            createMockFinding('c2', 'Critical'),
            createMockFinding('h1', 'High'),
            createMockFinding('m1', 'Medium'),
            createMockFinding('m2', 'Medium'),
            createMockFinding('m3', 'Medium'),
            createMockFinding('l1', 'Low'),
        ];

        render(<ThreatDashboard findings={findings} />);

        // Check that counts are displayed
        expect(screen.getByText('2')).toBeInTheDocument(); // Critical count
        expect(screen.getByText('7 vulnerabilities detected')).toBeInTheDocument();
    });
});
