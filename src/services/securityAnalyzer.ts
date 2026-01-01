/**
 * Security Analyzer Service - Story 5-2
 *
 * Red Team engine for vulnerability scanning and security analysis.
 * Deploys specialized security agents to analyze code for vulnerabilities.
 */

import {
    RedTeamAgent,
    VulnerabilityFinding,
    VulnerabilitySeverity,
    VulnerabilityType,
    SecurityReport,
    LlmConfig,
} from '../types';
import { AGENT_DEFINITIONS } from './agent';
import { sendChat, readFile } from './api';

// --- Configuration ---

export interface SecurityScanConfig {
    targetPaths: string[];
    agents: RedTeamAgent[];
    maxFilesPerAgent?: number;
    includePatterns?: string[];
    excludePatterns?: string[];
}

export const DEFAULT_SCAN_CONFIG: SecurityScanConfig = {
    targetPaths: ['src/', 'server.cjs'],
    agents: ['vuln_scanner', 'code_auditor', 'pen_tester'],
    maxFilesPerAgent: 20,
    includePatterns: ['*.ts', '*.tsx', '*.js', '*.cjs', '*.mjs'],
    excludePatterns: ['*.test.ts', '*.spec.ts', 'node_modules/**'],
};

// --- Vulnerability Type Metadata ---

export const VULNERABILITY_INFO: Record<VulnerabilityType, {
    name: string;
    description: string;
    defaultSeverity: VulnerabilitySeverity;
    cweId?: string;
}> = {
    SQL_INJECTION: {
        name: 'SQL Injection',
        description: 'Unsanitized user input in SQL queries',
        defaultSeverity: 'Critical',
        cweId: 'CWE-89',
    },
    XSS: {
        name: 'Cross-Site Scripting',
        description: 'Unescaped user input rendered in HTML',
        defaultSeverity: 'High',
        cweId: 'CWE-79',
    },
    PATH_TRAVERSAL: {
        name: 'Path Traversal',
        description: 'User-controlled file paths without validation',
        defaultSeverity: 'High',
        cweId: 'CWE-22',
    },
    COMMAND_INJECTION: {
        name: 'Command Injection',
        description: 'User input in shell commands',
        defaultSeverity: 'Critical',
        cweId: 'CWE-78',
    },
    INSECURE_DESERIALIZATION: {
        name: 'Insecure Deserialization',
        description: 'Untrusted data deserialization',
        defaultSeverity: 'High',
        cweId: 'CWE-502',
    },
    BROKEN_AUTH: {
        name: 'Broken Authentication',
        description: 'Weak or missing authentication controls',
        defaultSeverity: 'Critical',
        cweId: 'CWE-287',
    },
    SENSITIVE_DATA_EXPOSURE: {
        name: 'Sensitive Data Exposure',
        description: 'Unprotected sensitive information',
        defaultSeverity: 'High',
        cweId: 'CWE-200',
    },
    XXE: {
        name: 'XML External Entities',
        description: 'External entity processing in XML parsers',
        defaultSeverity: 'High',
        cweId: 'CWE-611',
    },
    BROKEN_ACCESS_CONTROL: {
        name: 'Broken Access Control',
        description: 'Missing authorization checks',
        defaultSeverity: 'High',
        cweId: 'CWE-284',
    },
    SECURITY_MISCONFIGURATION: {
        name: 'Security Misconfiguration',
        description: 'Insecure default configurations',
        defaultSeverity: 'Medium',
        cweId: 'CWE-16',
    },
    INSECURE_DEPENDENCY: {
        name: 'Insecure Dependency',
        description: 'Known vulnerable third-party packages',
        defaultSeverity: 'Medium',
        cweId: 'CWE-1104',
    },
    HARDCODED_SECRET: {
        name: 'Hardcoded Secret',
        description: 'Credentials or keys in source code',
        defaultSeverity: 'High',
        cweId: 'CWE-798',
    },
    WEAK_CRYPTO: {
        name: 'Weak Cryptography',
        description: 'Use of weak or deprecated cryptographic algorithms',
        defaultSeverity: 'Medium',
        cweId: 'CWE-327',
    },
};

// --- Red Team Engine ---

export interface RedTeamCallbacks {
    onScanStart?: (scanId: string, agents: RedTeamAgent[]) => void;
    onAgentStart?: (agent: RedTeamAgent, filePath: string) => void;
    onFindingDiscovered?: (finding: VulnerabilityFinding) => void;
    onAgentComplete?: (agent: RedTeamAgent, findingsCount: number) => void;
    onScanComplete?: (report: SecurityReport) => void;
    onError?: (error: string, agent?: RedTeamAgent) => void;
}

export class RedTeamEngine {
    private config: SecurityScanConfig;
    private callbacks: RedTeamCallbacks;
    private currentScanId: string | null = null;
    private findings: VulnerabilityFinding[] = [];
    private scannedFiles: string[] = [];
    private isRunning = false;

    constructor(config: Partial<SecurityScanConfig> = {}, callbacks: RedTeamCallbacks = {}) {
        this.config = { ...DEFAULT_SCAN_CONFIG, ...config };
        this.callbacks = callbacks;
    }

    public setCallbacks(callbacks: RedTeamCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    public isScanning(): boolean {
        return this.isRunning;
    }

    public getCurrentScanId(): string | null {
        return this.currentScanId;
    }

    public getFindings(): VulnerabilityFinding[] {
        return [...this.findings];
    }

    /**
     * Deploy the Red Team squad to analyze files
     */
    public async deploySquad(
        filesToScan: string[],
        llmConfig: LlmConfig
    ): Promise<SecurityReport> {
        if (this.isRunning) {
            throw new Error('Scan already in progress');
        }

        this.isRunning = true;
        this.currentScanId = this.generateScanId();
        this.findings = [];
        this.scannedFiles = [];

        const startTime = Date.now();

        console.log(`[RedTeam] Deploying squad: ${this.config.agents.join(', ')}`);
        this.callbacks.onScanStart?.(this.currentScanId, this.config.agents);

        try {
            // Run each agent on the files
            for (const agent of this.config.agents) {
                const agentFindings = await this.runAgent(agent, filesToScan, llmConfig);
                this.findings.push(...agentFindings);
                this.callbacks.onAgentComplete?.(agent, agentFindings.length);
            }

            const report = this.generateReport(startTime);
            this.callbacks.onScanComplete?.(report);

            console.log(`[RedTeam] Scan complete. Found ${this.findings.length} vulnerabilities.`);
            return report;

        } catch (error: any) {
            console.error(`[RedTeam] Scan failed:`, error);
            this.callbacks.onError?.(error.message);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Run a single Red Team agent on files
     */
    private async runAgent(
        agent: RedTeamAgent,
        files: string[],
        llmConfig: LlmConfig
    ): Promise<VulnerabilityFinding[]> {
        const agentDef = AGENT_DEFINITIONS[agent];
        const agentFindings: VulnerabilityFinding[] = [];

        console.log(`[RedTeam] [${agentDef.name}] Starting analysis...`);

        for (const filePath of files.slice(0, this.config.maxFilesPerAgent)) {
            try {
                this.callbacks.onAgentStart?.(agent, filePath);

                const fileContent = await readFile(filePath);
                if (!fileContent || fileContent.length === 0) continue;

                this.scannedFiles.push(filePath);

                const findings = await this.analyzeFile(agent, filePath, fileContent, llmConfig);

                for (const finding of findings) {
                    this.callbacks.onFindingDiscovered?.(finding);
                    agentFindings.push(finding);
                }

            } catch (error: any) {
                console.warn(`[RedTeam] [${agentDef.name}] Error scanning ${filePath}:`, error.message);
            }
        }

        return agentFindings;
    }

    /**
     * Analyze a single file with a Red Team agent
     */
    private async analyzeFile(
        agent: RedTeamAgent,
        filePath: string,
        content: string,
        llmConfig: LlmConfig
    ): Promise<VulnerabilityFinding[]> {
        const agentDef = AGENT_DEFINITIONS[agent];

        // Truncate large files
        const truncatedContent = content.substring(0, 10000);

        const messages = [
            {
                role: 'system' as const,
                content: `${agentDef.systemPrompt}\n\nANALYZE THIS FILE:\nPath: ${filePath}\n\n\`\`\`\n${truncatedContent}\n\`\`\``,
                timestamp: Date.now(),
            },
            {
                role: 'user' as const,
                content: 'Analyze this file for security vulnerabilities. Return a JSON object with a "findings" array.',
                timestamp: Date.now(),
            },
        ];

        try {
            const response = await sendChat(messages, llmConfig);
            const text = response.content || '';

            // Parse findings from response
            return this.parseFindings(text, agent, filePath);

        } catch (error: any) {
            console.warn(`[RedTeam] LLM error for ${filePath}:`, error.message);
            return [];
        }
    }

    /**
     * Parse vulnerability findings from LLM response
     */
    private parseFindings(
        responseText: string,
        agent: RedTeamAgent,
        filePath: string
    ): VulnerabilityFinding[] {
        const findings: VulnerabilityFinding[] = [];

        try {
            // Extract JSON from response
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanText.indexOf('{');
            const lastBrace = cleanText.lastIndexOf('}');

            if (firstBrace === -1 || lastBrace === -1) return findings;

            const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonStr);

            const rawFindings = parsed.findings || [];

            for (const raw of rawFindings) {
                const finding = this.normalizeFinding(raw, agent, filePath);
                if (finding) {
                    findings.push(finding);
                }
            }

        } catch (error) {
            // Parsing failed, return empty
        }

        return findings;
    }

    /**
     * Normalize a raw finding into VulnerabilityFinding
     */
    private normalizeFinding(
        raw: any,
        agent: RedTeamAgent,
        defaultFilePath: string
    ): VulnerabilityFinding | null {
        if (!raw || typeof raw !== 'object') return null;

        const type = this.normalizeVulnType(raw.type);
        if (!type) return null;

        const severity = this.normalizeSeverity(raw.severity);

        return {
            id: this.generateFindingId(),
            type,
            severity,
            title: raw.title || `${VULNERABILITY_INFO[type].name} Detected`,
            description: raw.description || VULNERABILITY_INFO[type].description,
            filePath: raw.filePath || defaultFilePath,
            lineNumber: typeof raw.lineNumber === 'number' ? raw.lineNumber : undefined,
            codeSnippet: raw.codeSnippet?.substring(0, 500),
            impact: raw.impact || 'Potential security vulnerability',
            remediation: raw.remediation || 'Review and fix the identified issue',
            detectedBy: agent,
            timestamp: Date.now(),
            status: 'open',
        };
    }

    /**
     * Normalize vulnerability type string to enum
     */
    private normalizeVulnType(typeStr: string): VulnerabilityType | null {
        if (!typeStr) return null;

        const normalized = typeStr.toUpperCase().replace(/[- ]/g, '_');

        const typeMap: Record<string, VulnerabilityType> = {
            'SQL_INJECTION': 'SQL_INJECTION',
            'SQLI': 'SQL_INJECTION',
            'XSS': 'XSS',
            'CROSS_SITE_SCRIPTING': 'XSS',
            'PATH_TRAVERSAL': 'PATH_TRAVERSAL',
            'DIRECTORY_TRAVERSAL': 'PATH_TRAVERSAL',
            'COMMAND_INJECTION': 'COMMAND_INJECTION',
            'RCE': 'COMMAND_INJECTION',
            'INSECURE_DESERIALIZATION': 'INSECURE_DESERIALIZATION',
            'BROKEN_AUTH': 'BROKEN_AUTH',
            'BROKEN_AUTHENTICATION': 'BROKEN_AUTH',
            'SENSITIVE_DATA_EXPOSURE': 'SENSITIVE_DATA_EXPOSURE',
            'DATA_EXPOSURE': 'SENSITIVE_DATA_EXPOSURE',
            'XXE': 'XXE',
            'BROKEN_ACCESS_CONTROL': 'BROKEN_ACCESS_CONTROL',
            'ACCESS_CONTROL': 'BROKEN_ACCESS_CONTROL',
            'SECURITY_MISCONFIGURATION': 'SECURITY_MISCONFIGURATION',
            'MISCONFIGURATION': 'SECURITY_MISCONFIGURATION',
            'INSECURE_DEPENDENCY': 'INSECURE_DEPENDENCY',
            'VULNERABLE_DEPENDENCY': 'INSECURE_DEPENDENCY',
            'HARDCODED_SECRET': 'HARDCODED_SECRET',
            'HARDCODED_CREDENTIAL': 'HARDCODED_SECRET',
            'SECRET': 'HARDCODED_SECRET',
            'WEAK_CRYPTO': 'WEAK_CRYPTO',
            'WEAK_CRYPTOGRAPHY': 'WEAK_CRYPTO',
        };

        return typeMap[normalized] || null;
    }

    /**
     * Normalize severity string
     */
    private normalizeSeverity(severityStr: string): VulnerabilitySeverity {
        if (!severityStr) return 'Medium';

        const normalized = severityStr.toLowerCase();

        if (normalized.includes('critical')) return 'Critical';
        if (normalized.includes('high')) return 'High';
        if (normalized.includes('medium') || normalized.includes('moderate')) return 'Medium';
        if (normalized.includes('low') || normalized.includes('info')) return 'Low';

        return 'Medium';
    }

    /**
     * Generate the final security report
     */
    public generateReport(startTime: number): SecurityReport {
        const summary = {
            critical: this.findings.filter(f => f.severity === 'Critical').length,
            high: this.findings.filter(f => f.severity === 'High').length,
            medium: this.findings.filter(f => f.severity === 'Medium').length,
            low: this.findings.filter(f => f.severity === 'Low').length,
            total: this.findings.length,
        };

        return {
            id: `report-${this.currentScanId}`,
            scanId: this.currentScanId || 'unknown',
            startTime,
            endTime: Date.now(),
            status: 'completed',
            findings: [...this.findings],
            summary,
            scannedFiles: [...this.scannedFiles],
            agentsDeployed: [...this.config.agents],
        };
    }

    /**
     * Reset the engine state
     */
    public reset(): void {
        this.currentScanId = null;
        this.findings = [];
        this.scannedFiles = [];
        this.isRunning = false;
    }

    private generateScanId(): string {
        return `scan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }

    private generateFindingId(): string {
        return `vuln-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }
}

// --- Singleton ---

let engineInstance: RedTeamEngine | null = null;

export function getRedTeamEngine(
    config?: Partial<SecurityScanConfig>,
    callbacks?: RedTeamCallbacks
): RedTeamEngine {
    if (!engineInstance) {
        engineInstance = new RedTeamEngine(config, callbacks);
    } else if (callbacks) {
        engineInstance.setCallbacks(callbacks);
    }
    return engineInstance;
}

export function resetRedTeamEngine(): void {
    if (engineInstance) {
        engineInstance.reset();
    }
    engineInstance = null;
}

// --- Utility Functions ---

export function getSeverityColor(severity: VulnerabilitySeverity): string {
    switch (severity) {
        case 'Critical': return 'text-red-600';
        case 'High': return 'text-orange-500';
        case 'Medium': return 'text-yellow-500';
        case 'Low': return 'text-blue-400';
        default: return 'text-gray-400';
    }
}

export function getSeverityBgColor(severity: VulnerabilitySeverity): string {
    switch (severity) {
        case 'Critical': return 'bg-red-600/20';
        case 'High': return 'bg-orange-500/20';
        case 'Medium': return 'bg-yellow-500/20';
        case 'Low': return 'bg-blue-400/20';
        default: return 'bg-gray-400/20';
    }
}

export function getVulnerabilityLabel(type: VulnerabilityType): string {
    return VULNERABILITY_INFO[type]?.name || type;
}
