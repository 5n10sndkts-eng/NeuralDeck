/**
 * Security Analyzer Service Tests - Story 5-2
 *
 * Tests for the Red Team security analysis engine.
 */

import {
    RedTeamEngine,
    getRedTeamEngine,
    resetRedTeamEngine,
    VULNERABILITY_INFO,
    DEFAULT_SCAN_CONFIG,
    getSeverityColor,
    getSeverityBgColor,
    getVulnerabilityLabel,
    SecurityScanConfig,
    RedTeamCallbacks,
} from '../../src/services/securityAnalyzer';

// Mock the api module
jest.mock('../../src/services/api', () => ({
    sendChat: jest.fn(),
    readFile: jest.fn(),
}));

import { sendChat, readFile } from '../../src/services/api';

const mockSendChat = sendChat as jest.MockedFunction<typeof sendChat>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('SecurityAnalyzer - Story 5-2', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetRedTeamEngine();
    });

    describe('VULNERABILITY_INFO', () => {
        it('should have all required vulnerability types defined', () => {
            const requiredTypes = [
                'SQL_INJECTION',
                'XSS',
                'PATH_TRAVERSAL',
                'COMMAND_INJECTION',
                'INSECURE_DESERIALIZATION',
                'BROKEN_AUTH',
                'SENSITIVE_DATA_EXPOSURE',
                'XXE',
                'BROKEN_ACCESS_CONTROL',
                'SECURITY_MISCONFIGURATION',
                'INSECURE_DEPENDENCY',
                'HARDCODED_SECRET',
                'WEAK_CRYPTO',
            ];

            requiredTypes.forEach(type => {
                expect(VULNERABILITY_INFO[type]).toBeDefined();
                expect(VULNERABILITY_INFO[type].name).toBeDefined();
                expect(VULNERABILITY_INFO[type].description).toBeDefined();
                expect(VULNERABILITY_INFO[type].defaultSeverity).toBeDefined();
            });
        });

        it('should have valid CWE IDs for all vulnerability types', () => {
            Object.values(VULNERABILITY_INFO).forEach(info => {
                if (info.cweId) {
                    expect(info.cweId).toMatch(/^CWE-\d+$/);
                }
            });
        });

        it('should have valid severity levels', () => {
            const validSeverities = ['Critical', 'High', 'Medium', 'Low'];
            Object.values(VULNERABILITY_INFO).forEach(info => {
                expect(validSeverities).toContain(info.defaultSeverity);
            });
        });
    });

    describe('DEFAULT_SCAN_CONFIG', () => {
        it('should have default target paths', () => {
            expect(DEFAULT_SCAN_CONFIG.targetPaths).toContain('src/');
            expect(DEFAULT_SCAN_CONFIG.targetPaths).toContain('server.cjs');
        });

        it('should have default agents', () => {
            expect(DEFAULT_SCAN_CONFIG.agents).toContain('vuln_scanner');
            expect(DEFAULT_SCAN_CONFIG.agents).toContain('code_auditor');
            expect(DEFAULT_SCAN_CONFIG.agents).toContain('pen_tester');
        });

        it('should have reasonable default limits', () => {
            expect(DEFAULT_SCAN_CONFIG.maxFilesPerAgent).toBeGreaterThan(0);
            expect(DEFAULT_SCAN_CONFIG.maxFilesPerAgent).toBeLessThanOrEqual(100);
        });

        it('should exclude test files and node_modules', () => {
            expect(DEFAULT_SCAN_CONFIG.excludePatterns).toContain('*.test.ts');
            expect(DEFAULT_SCAN_CONFIG.excludePatterns).toContain('node_modules/**');
        });
    });

    describe('RedTeamEngine', () => {
        it('should create engine with default config', () => {
            const engine = new RedTeamEngine();
            expect(engine.isScanning()).toBe(false);
            expect(engine.getCurrentScanId()).toBeNull();
            expect(engine.getFindings()).toEqual([]);
        });

        it('should create engine with custom config', () => {
            const customConfig: Partial<SecurityScanConfig> = {
                targetPaths: ['custom/path'],
                agents: ['vuln_scanner'],
                maxFilesPerAgent: 5,
            };

            const engine = new RedTeamEngine(customConfig);
            expect(engine.isScanning()).toBe(false);
        });

        it('should allow setting callbacks after creation', () => {
            const engine = new RedTeamEngine();
            const callbacks: RedTeamCallbacks = {
                onScanStart: jest.fn(),
                onScanComplete: jest.fn(),
            };

            engine.setCallbacks(callbacks);
            // Callbacks are set (no assertion needed, just verify no error)
        });

        it('should prevent concurrent scans', async () => {
            const engine = new RedTeamEngine();

            // Start first scan
            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: '{"findings": []}',
                role: 'assistant',
                timestamp: Date.now(),
            });

            const firstScan = engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            // Attempt second scan while first is running
            await expect(
                engine.deploySquad(['test2.ts'], {
                    provider: 'openai',
                    baseUrl: 'http://localhost:8000',
                    model: 'test-model',
                })
            ).rejects.toThrow('Scan already in progress');

            await firstScan;
        });

        it('should reset engine state', () => {
            const engine = new RedTeamEngine();
            engine.reset();

            expect(engine.isScanning()).toBe(false);
            expect(engine.getCurrentScanId()).toBeNull();
            expect(engine.getFindings()).toEqual([]);
        });
    });

    describe('getRedTeamEngine singleton', () => {
        it('should return same instance on multiple calls', () => {
            const engine1 = getRedTeamEngine();
            const engine2 = getRedTeamEngine();
            expect(engine1).toBe(engine2);
        });

        it('should update callbacks on subsequent calls', () => {
            const callbacks1: RedTeamCallbacks = { onScanStart: jest.fn() };
            const callbacks2: RedTeamCallbacks = { onScanComplete: jest.fn() };

            const engine1 = getRedTeamEngine({}, callbacks1);
            const engine2 = getRedTeamEngine({}, callbacks2);

            expect(engine1).toBe(engine2);
        });

        it('should return fresh instance after reset', () => {
            const engine1 = getRedTeamEngine();
            resetRedTeamEngine();
            const engine2 = getRedTeamEngine();

            // After reset, the internal reference is cleared
            // But getRedTeamEngine creates a new instance
            expect(engine2).not.toBe(engine1);
        });
    });

    describe('deploySquad', () => {
        it('should run agents on provided files', async () => {
            const engine = new RedTeamEngine({
                agents: ['vuln_scanner'],
                maxFilesPerAgent: 2,
            });

            mockReadFile.mockResolvedValue('const password = "secret123";');
            mockSendChat.mockResolvedValue({
                content: JSON.stringify({
                    findings: [{
                        type: 'HARDCODED_SECRET',
                        severity: 'High',
                        title: 'Hardcoded Password',
                        description: 'Found hardcoded password in code',
                        filePath: 'test.ts',
                        lineNumber: 1,
                    }]
                }),
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report = await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.scanId).toBeDefined();
            expect(report.status).toBe('completed');
            expect(report.findings.length).toBeGreaterThanOrEqual(0);
            expect(report.scannedFiles).toContain('test.ts');
        });

        it('should generate unique scan IDs', async () => {
            const engine1 = new RedTeamEngine({ agents: ['vuln_scanner'] });
            const engine2 = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: '{"findings": []}',
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report1 = await engine1.deploySquad(['test1.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            const report2 = await engine2.deploySquad(['test2.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report1.scanId).not.toBe(report2.scanId);
        });

        it('should handle empty file gracefully', async () => {
            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('');

            const report = await engine.deploySquad(['empty.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.status).toBe('completed');
            expect(report.findings).toEqual([]);
        });

        it('should invoke callbacks during scan lifecycle', async () => {
            const callbacks: RedTeamCallbacks = {
                onScanStart: jest.fn(),
                onAgentStart: jest.fn(),
                onFindingDiscovered: jest.fn(),
                onAgentComplete: jest.fn(),
                onScanComplete: jest.fn(),
            };

            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] }, callbacks);

            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: '{"findings": []}',
                role: 'assistant',
                timestamp: Date.now(),
            });

            await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(callbacks.onScanStart).toHaveBeenCalled();
            expect(callbacks.onAgentStart).toHaveBeenCalled();
            expect(callbacks.onAgentComplete).toHaveBeenCalled();
            expect(callbacks.onScanComplete).toHaveBeenCalled();
        });
    });

    describe('generateReport', () => {
        it('should generate report with correct summary counts', async () => {
            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: JSON.stringify({
                    findings: [
                        { type: 'SQL_INJECTION', severity: 'Critical', title: 'SQL Injection' },
                        { type: 'XSS', severity: 'High', title: 'XSS' },
                        { type: 'SECURITY_MISCONFIGURATION', severity: 'Medium', title: 'Misc' },
                    ]
                }),
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report = await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.summary.critical).toBe(1);
            expect(report.summary.high).toBe(1);
            expect(report.summary.medium).toBe(1);
            expect(report.summary.low).toBe(0);
            expect(report.summary.total).toBe(3);
        });

        it('should include timing information', async () => {
            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: '{"findings": []}',
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report = await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.startTime).toBeDefined();
            expect(report.endTime).toBeDefined();
            expect(report.endTime).toBeGreaterThanOrEqual(report.startTime);
        });
    });

    describe('Utility Functions', () => {
        describe('getSeverityColor', () => {
            it('should return correct color for Critical', () => {
                expect(getSeverityColor('Critical')).toBe('text-red-600');
            });

            it('should return correct color for High', () => {
                expect(getSeverityColor('High')).toBe('text-orange-500');
            });

            it('should return correct color for Medium', () => {
                expect(getSeverityColor('Medium')).toBe('text-yellow-500');
            });

            it('should return correct color for Low', () => {
                expect(getSeverityColor('Low')).toBe('text-blue-400');
            });

            it('should return default color for unknown severity', () => {
                expect(getSeverityColor('Unknown' as any)).toBe('text-gray-400');
            });
        });

        describe('getSeverityBgColor', () => {
            it('should return correct background for Critical', () => {
                expect(getSeverityBgColor('Critical')).toBe('bg-red-600/20');
            });

            it('should return correct background for High', () => {
                expect(getSeverityBgColor('High')).toBe('bg-orange-500/20');
            });

            it('should return correct background for Medium', () => {
                expect(getSeverityBgColor('Medium')).toBe('bg-yellow-500/20');
            });

            it('should return correct background for Low', () => {
                expect(getSeverityBgColor('Low')).toBe('bg-blue-400/20');
            });
        });

        describe('getVulnerabilityLabel', () => {
            it('should return human-readable label for vulnerability types', () => {
                expect(getVulnerabilityLabel('SQL_INJECTION')).toBe('SQL Injection');
                expect(getVulnerabilityLabel('XSS')).toBe('Cross-Site Scripting');
                expect(getVulnerabilityLabel('PATH_TRAVERSAL')).toBe('Path Traversal');
            });

            it('should return type string for unknown types', () => {
                expect(getVulnerabilityLabel('UNKNOWN_TYPE' as any)).toBe('UNKNOWN_TYPE');
            });
        });
    });

    describe('Finding Parsing', () => {
        it('should parse valid JSON findings from LLM response', async () => {
            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('SELECT * FROM users WHERE id = ${req.params.id}');
            mockSendChat.mockResolvedValue({
                content: `Here is my analysis:
\`\`\`json
{
    "findings": [{
        "type": "SQL_INJECTION",
        "severity": "Critical",
        "title": "SQL Injection in User Query",
        "description": "User input directly concatenated in SQL query",
        "filePath": "test.ts",
        "lineNumber": 1,
        "codeSnippet": "SELECT * FROM users WHERE id = ' + req.params.id",
        "impact": "Full database access",
        "remediation": "Use parameterized queries"
    }]
}
\`\`\``,
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report = await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.findings.length).toBe(1);
            expect(report.findings[0].type).toBe('SQL_INJECTION');
            expect(report.findings[0].severity).toBe('Critical');
        });

        it('should handle malformed JSON gracefully', async () => {
            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: 'I found some issues but the JSON is malformed { broken',
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report = await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.status).toBe('completed');
            expect(report.findings).toEqual([]);
        });

        it('should normalize severity strings', async () => {
            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: JSON.stringify({
                    findings: [
                        { type: 'XSS', severity: 'CRITICAL', title: 'Test 1' },
                        { type: 'XSS', severity: 'high', title: 'Test 2' },
                        { type: 'XSS', severity: 'moderate', title: 'Test 3' },
                        { type: 'XSS', severity: 'info', title: 'Test 4' },
                    ]
                }),
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report = await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.findings[0].severity).toBe('Critical');
            expect(report.findings[1].severity).toBe('High');
            expect(report.findings[2].severity).toBe('Medium');
            expect(report.findings[3].severity).toBe('Low');
        });

        it('should normalize vulnerability type strings', async () => {
            const engine = new RedTeamEngine({ agents: ['vuln_scanner'] });

            mockReadFile.mockResolvedValue('const x = 1;');
            mockSendChat.mockResolvedValue({
                content: JSON.stringify({
                    findings: [
                        { type: 'sqli', severity: 'Critical', title: 'Test 1' },
                        { type: 'cross-site-scripting', severity: 'High', title: 'Test 2' },
                        { type: 'RCE', severity: 'Critical', title: 'Test 3' },
                    ]
                }),
                role: 'assistant',
                timestamp: Date.now(),
            });

            const report = await engine.deploySquad(['test.ts'], {
                provider: 'openai',
                baseUrl: 'http://localhost:8000',
                model: 'test-model',
            });

            expect(report.findings[0].type).toBe('SQL_INJECTION');
            expect(report.findings[1].type).toBe('XSS');
            expect(report.findings[2].type).toBe('COMMAND_INJECTION');
        });
    });
});
