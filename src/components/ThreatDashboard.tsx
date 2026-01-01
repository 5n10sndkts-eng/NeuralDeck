/**
 * ThreatDashboard Component - Story 5-3
 *
 * Displays security vulnerabilities categorized by severity.
 * Shows real-time updates, allows status changes, and supports export.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    VulnerabilityFinding,
    VulnerabilitySeverity,
    VulnerabilityType,
    SecurityReport,
} from '../types';
import {
    getSeverityColor,
    getSeverityBgColor,
    getVulnerabilityLabel,
    VULNERABILITY_INFO,
} from '../services/securityAnalyzer';
import { CyberPanel, CyberButton } from './CyberUI';
import { useUI } from '../contexts/UIContext';

// --- Types ---

export interface ThreatDashboardProps {
    scanId?: string;
    findings?: VulnerabilityFinding[];
    onClose?: () => void;
    onStartScan?: () => void;
}

type FindingStatus = 'open' | 'reviewed' | 'fixed' | 'false_positive';

interface SeveritySummary {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
}

// --- Severity Card Component ---

interface SeverityCardProps {
    severity: VulnerabilitySeverity;
    count: number;
    isSelected: boolean;
    onClick: () => void;
}

const SeverityCard: React.FC<SeverityCardProps> = ({ severity, count, isSelected, onClick }) => {
    const colorClass = getSeverityColor(severity);
    const bgClass = getSeverityBgColor(severity);

    const icons: Record<VulnerabilitySeverity, string> = {
        Critical: '🔴',
        High: '🟠',
        Medium: '🟡',
        Low: '🔵',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`flex-1 p-4 rounded border transition-all ${bgClass} ${
                isSelected ? 'ring-2 ring-offset-2 ring-offset-black' : ''
            }`}
            style={{
                borderColor: isSelected ? 'currentColor' : 'rgba(255,255,255,0.1)',
                minWidth: '100px',
            }}
        >
            <div className="text-center">
                <div className="text-2xl mb-1">{icons[severity]}</div>
                <div className={`text-3xl font-bold ${colorClass}`}>{count}</div>
                <div className={`text-xs uppercase tracking-wider ${colorClass} opacity-70`}>
                    {severity}
                </div>
            </div>
        </motion.button>
    );
};

// --- Finding Card Component ---

interface FindingCardProps {
    finding: VulnerabilityFinding;
    isExpanded: boolean;
    onToggle: () => void;
    onStatusChange: (status: FindingStatus) => void;
    isNew?: boolean;
}

const FindingCard: React.FC<FindingCardProps> = ({
    finding,
    isExpanded,
    onToggle,
    onStatusChange,
    isNew,
}) => {
    const colorClass = getSeverityColor(finding.severity);
    const bgClass = getSeverityBgColor(finding.severity);
    const { playSound } = useUI();

    const statusLabels: Record<FindingStatus, { label: string; color: string }> = {
        open: { label: 'Open', color: 'text-red-400' },
        reviewed: { label: 'Reviewed', color: 'text-yellow-400' },
        fixed: { label: 'Fixed', color: 'text-green-400' },
        false_positive: { label: 'False Positive', color: 'text-gray-400' },
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        playSound('click');
        onStatusChange(e.target.value as FindingStatus);
    };

    return (
        <motion.div
            initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`${bgClass} border rounded-lg overflow-hidden mb-3 ${
                isNew ? 'ring-2 ring-yellow-400 animate-pulse' : ''
            }`}
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
            {/* Header - Always Visible */}
            <button
                onClick={() => {
                    playSound('hover');
                    onToggle();
                }}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${bgClass} ${colorClass}`}>
                        {finding.severity}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium text-white truncate">{finding.title}</div>
                        <div className="text-xs text-gray-400 truncate">
                            {finding.filePath}
                            {finding.lineNumber && `:${finding.lineNumber}`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs ${statusLabels[finding.status].color}`}>
                        {statusLabels[finding.status].label}
                    </span>
                    <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="text-gray-400"
                    >
                        ▼
                    </motion.span>
                </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 border-t border-white/5">
                            {/* Type & CWE */}
                            <div className="flex gap-4 mb-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Type: </span>
                                    <span className={colorClass}>
                                        {getVulnerabilityLabel(finding.type)}
                                    </span>
                                </div>
                                {VULNERABILITY_INFO[finding.type]?.cweId && (
                                    <div>
                                        <span className="text-gray-500">CWE: </span>
                                        <span className="text-cyan-400">
                                            {VULNERABILITY_INFO[finding.type].cweId}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <div className="text-xs text-gray-500 uppercase mb-1">
                                    Description
                                </div>
                                <div className="text-sm text-gray-300">{finding.description}</div>
                            </div>

                            {/* Code Snippet */}
                            {finding.codeSnippet && (
                                <div className="mb-4">
                                    <div className="text-xs text-gray-500 uppercase mb-1">
                                        Code Snippet
                                    </div>
                                    <pre className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 overflow-x-auto">
                                        {finding.codeSnippet}
                                    </pre>
                                </div>
                            )}

                            {/* Impact */}
                            <div className="mb-4">
                                <div className="text-xs text-gray-500 uppercase mb-1">Impact</div>
                                <div className="text-sm text-orange-300">{finding.impact}</div>
                            </div>

                            {/* Remediation */}
                            <div className="mb-4">
                                <div className="text-xs text-gray-500 uppercase mb-1">
                                    Remediation
                                </div>
                                <div className="text-sm text-green-300">{finding.remediation}</div>
                            </div>

                            {/* Status Change */}
                            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                                <label className="text-xs text-gray-500">Update Status:</label>
                                <select
                                    value={finding.status}
                                    onChange={handleStatusChange}
                                    className="bg-black/50 border border-white/10 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="open">Open</option>
                                    <option value="reviewed">Reviewed</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="false_positive">False Positive</option>
                                </select>
                                <span className="text-xs text-gray-500">
                                    Detected by: {finding.detectedBy}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- Main ThreatDashboard Component ---

export const ThreatDashboard: React.FC<ThreatDashboardProps> = ({
    scanId,
    findings: initialFindings = [],
    onClose,
    onStartScan,
}) => {
    const { playSound } = useUI();
    const [findings, setFindings] = useState<VulnerabilityFinding[]>(initialFindings);
    const [selectedSeverity, setSelectedSeverity] = useState<VulnerabilitySeverity | null>(null);
    const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
    const [newFindingIds, setNewFindingIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // Calculate summary
    const summary: SeveritySummary = useMemo(() => {
        return {
            critical: findings.filter((f) => f.severity === 'Critical').length,
            high: findings.filter((f) => f.severity === 'High').length,
            medium: findings.filter((f) => f.severity === 'Medium').length,
            low: findings.filter((f) => f.severity === 'Low').length,
            total: findings.length,
        };
    }, [findings]);

    // Filter findings by selected severity
    const filteredFindings = useMemo(() => {
        let result = [...findings];

        // Filter by severity if selected
        if (selectedSeverity) {
            result = result.filter((f) => f.severity === selectedSeverity);
        }

        // Sort by severity (Critical first)
        const severityOrder: Record<VulnerabilitySeverity, number> = {
            Critical: 0,
            High: 1,
            Medium: 2,
            Low: 3,
        };
        result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return result;
    }, [findings, selectedSeverity]);

    // Fetch findings from API if scanId is provided
    useEffect(() => {
        if (scanId) {
            fetchFindings(scanId);
        }
    }, [scanId]);

    // Update findings when initialFindings changes
    useEffect(() => {
        if (initialFindings.length > 0) {
            setFindings(initialFindings);
        }
    }, [initialFindings]);

    const fetchFindings = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/security/findings/${id}`);
            const data = await response.json();
            if (data.findings) {
                setFindings(data.findings);
            }
        } catch (error) {
            console.error('[ThreatDash] Failed to fetch findings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle status update
    const handleStatusChange = useCallback(
        async (findingId: string, newStatus: FindingStatus) => {
            // Optimistic update
            setFindings((prev) =>
                prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f))
            );

            // Persist to backend
            if (scanId) {
                try {
                    await fetch(`/api/security/findings/${scanId}/${findingId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus }),
                    });
                    console.log('[ThreatDash] Status updated:', findingId, newStatus);
                } catch (error) {
                    console.error('[ThreatDash] Failed to update status:', error);
                    // Revert on failure
                    if (scanId) fetchFindings(scanId);
                }
            }
        },
        [scanId]
    );

    // Add new finding (called from WebSocket events)
    const addFinding = useCallback((finding: VulnerabilityFinding) => {
        setFindings((prev) => {
            // Check if already exists
            if (prev.some((f) => f.id === finding.id)) return prev;
            return [finding, ...prev];
        });
        setNewFindingIds((prev) => new Set(prev).add(finding.id));
        playSound('alert');

        // Remove "new" highlight after 3 seconds
        setTimeout(() => {
            setNewFindingIds((prev) => {
                const next = new Set(prev);
                next.delete(finding.id);
                return next;
            });
        }, 3000);
    }, [playSound]);

    // Export functions
    const exportAsJSON = useCallback(() => {
        const data = {
            scanId,
            exportedAt: new Date().toISOString(),
            summary,
            findings: findings.map((f) => ({
                ...f,
                typeName: getVulnerabilityLabel(f.type),
                cweId: VULNERABILITY_INFO[f.type]?.cweId,
            })),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${scanId || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        playSound('success');
    }, [scanId, summary, findings, playSound]);

    const exportAsCSV = useCallback(() => {
        const headers = [
            'ID',
            'Severity',
            'Type',
            'Title',
            'File Path',
            'Line',
            'Status',
            'Description',
            'Impact',
            'Remediation',
            'Detected By',
        ];

        const rows = findings.map((f) => [
            f.id,
            f.severity,
            getVulnerabilityLabel(f.type),
            `"${f.title.replace(/"/g, '""')}"`,
            f.filePath,
            f.lineNumber || '',
            f.status,
            `"${f.description.replace(/"/g, '""')}"`,
            `"${f.impact.replace(/"/g, '""')}"`,
            `"${f.remediation.replace(/"/g, '""')}"`,
            f.detectedBy,
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${scanId || 'export'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        playSound('success');
    }, [scanId, findings, playSound]);

    // Expose addFinding for external use (WebSocket integration)
    useEffect(() => {
        (window as any).__threatDashboardAddFinding = addFinding;
        return () => {
            delete (window as any).__threatDashboardAddFinding;
        };
    }, [addFinding]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                        <h2
                            className="text-lg font-bold"
                            style={{ color: 'var(--color-red)', textShadow: '0 0 10px rgba(255,0,60,0.5)' }}
                        >
                            THREAT ASSESSMENT
                        </h2>
                        <p className="text-xs text-gray-500">
                            {summary.total} vulnerabilities detected
                            {scanId && ` • Scan: ${scanId.slice(0, 12)}...`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onStartScan && (
                        <CyberButton variant="danger" onClick={onStartScan}>
                            New Scan
                        </CyberButton>
                    )}
                    <div className="relative group">
                        <CyberButton variant="secondary">Export ▼</CyberButton>
                        <div className="absolute right-0 top-full mt-1 bg-black/90 border border-white/10 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <button
                                onClick={exportAsJSON}
                                className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10"
                            >
                                Export as JSON
                            </button>
                            <button
                                onClick={exportAsCSV}
                                className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10"
                            >
                                Export as CSV
                            </button>
                        </div>
                    </div>
                    {onClose && (
                        <CyberButton variant="ghost" onClick={onClose}>
                            ✕
                        </CyberButton>
                    )}
                </div>
            </div>

            {/* Severity Summary Cards */}
            <div className="p-4 border-b border-white/10">
                <div className="flex gap-3">
                    <SeverityCard
                        severity="Critical"
                        count={summary.critical}
                        isSelected={selectedSeverity === 'Critical'}
                        onClick={() =>
                            setSelectedSeverity(selectedSeverity === 'Critical' ? null : 'Critical')
                        }
                    />
                    <SeverityCard
                        severity="High"
                        count={summary.high}
                        isSelected={selectedSeverity === 'High'}
                        onClick={() =>
                            setSelectedSeverity(selectedSeverity === 'High' ? null : 'High')
                        }
                    />
                    <SeverityCard
                        severity="Medium"
                        count={summary.medium}
                        isSelected={selectedSeverity === 'Medium'}
                        onClick={() =>
                            setSelectedSeverity(selectedSeverity === 'Medium' ? null : 'Medium')
                        }
                    />
                    <SeverityCard
                        severity="Low"
                        count={summary.low}
                        isSelected={selectedSeverity === 'Low'}
                        onClick={() =>
                            setSelectedSeverity(selectedSeverity === 'Low' ? null : 'Low')
                        }
                    />
                </div>
                {selectedSeverity && (
                    <div className="mt-2 text-xs text-gray-500">
                        Showing {filteredFindings.length} {selectedSeverity.toLowerCase()} findings •
                        <button
                            onClick={() => setSelectedSeverity(null)}
                            className="text-cyan-400 ml-1 hover:underline"
                        >
                            Clear filter
                        </button>
                    </div>
                )}
            </div>

            {/* Findings List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-cyan-400 animate-pulse">Loading findings...</div>
                    </div>
                ) : filteredFindings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <span className="text-4xl mb-4">✅</span>
                        <p>No vulnerabilities found</p>
                        {selectedSeverity && (
                            <p className="text-sm mt-2">
                                No {selectedSeverity.toLowerCase()} severity issues
                            </p>
                        )}
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredFindings.map((finding) => (
                            <FindingCard
                                key={finding.id}
                                finding={finding}
                                isExpanded={expandedFindingId === finding.id}
                                onToggle={() =>
                                    setExpandedFindingId(
                                        expandedFindingId === finding.id ? null : finding.id
                                    )
                                }
                                onStatusChange={(status) => handleStatusChange(finding.id, status)}
                                isNew={newFindingIds.has(finding.id)}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default ThreatDashboard;
