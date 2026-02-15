'use strict';

async function securityRoutes(fastify, opts) {
    const { verifyToken, fs, path, broadcast, securityLogger, safePath, WORKSPACE_PATH } = opts;

    // --- Security Scan State ---

    const activeSecurityScans = new Map();

    // Generate scan ID
    function generateScanId() {
        return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    }

    // Generate finding ID
    function generateFindingId() {
        return `vuln-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    }

    // Vulnerability type metadata (mirror of frontend securityAnalyzer.ts)
    const VULNERABILITY_INFO = {
        SQL_INJECTION: { name: 'SQL Injection', severity: 'Critical', cweId: 'CWE-89' },
        XSS: { name: 'Cross-Site Scripting', severity: 'High', cweId: 'CWE-79' },
        PATH_TRAVERSAL: { name: 'Path Traversal', severity: 'High', cweId: 'CWE-22' },
        COMMAND_INJECTION: { name: 'Command Injection', severity: 'Critical', cweId: 'CWE-78' },
        INSECURE_DESERIALIZATION: { name: 'Insecure Deserialization', severity: 'High', cweId: 'CWE-502' },
        BROKEN_AUTH: { name: 'Broken Authentication', severity: 'Critical', cweId: 'CWE-287' },
        SENSITIVE_DATA_EXPOSURE: { name: 'Sensitive Data Exposure', severity: 'High', cweId: 'CWE-200' },
        XXE: { name: 'XML External Entities', severity: 'High', cweId: 'CWE-611' },
        BROKEN_ACCESS_CONTROL: { name: 'Broken Access Control', severity: 'High', cweId: 'CWE-284' },
        SECURITY_MISCONFIGURATION: { name: 'Security Misconfiguration', severity: 'Medium', cweId: 'CWE-16' },
        INSECURE_DEPENDENCY: { name: 'Insecure Dependency', severity: 'Medium', cweId: 'CWE-1104' },
        HARDCODED_SECRET: { name: 'Hardcoded Secret', severity: 'High', cweId: 'CWE-798' },
        WEAK_CRYPTO: { name: 'Weak Cryptography', severity: 'Medium', cweId: 'CWE-327' },
    };

    // Initiate a security scan
    fastify.post('/api/security/scan', { preHandler: verifyToken }, async (request, reply) => {
        const { targetPaths, agents, llmConfig } = request.body;

        if (!targetPaths || !Array.isArray(targetPaths) || targetPaths.length === 0) {
            reply.code(400).send({ error: 'targetPaths array is required' });
            return;
        }

        const scanId = generateScanId();
        const now = Date.now();

        const validAgents = agents || ['vuln_scanner', 'code_auditor', 'pen_tester'];

        fastify.log.info(`[SECURITY] Starting scan: ${scanId} with agents: ${validAgents.join(', ')}`);

        // Collect files to scan
        const filesToScan = [];
        for (const targetPath of targetPaths) {
            try {
                const fullPath = safePath(targetPath);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory()) {
                    // Recursively get files
                    const files = await getFilesRecursive(fullPath, ['.ts', '.tsx', '.js', '.cjs', '.mjs']);
                    filesToScan.push(...files.map(f => f.replace(WORKSPACE_PATH, '').replace(/^\//, '')));
                } else if (stat.isFile()) {
                    filesToScan.push(targetPath);
                }
            } catch (err) {
                fastify.log.warn(`[SECURITY] Could not access path: ${targetPath} - ${err.message}`);
            }
        }

        if (filesToScan.length === 0) {
            reply.code(400).send({ error: 'No valid files found to scan' });
            return;
        }

        // Create scan record
        const scan = {
            id: scanId,
            status: 'running',
            agents: validAgents,
            targetPaths,
            filesToScan,
            fileCount: filesToScan.length,
            findings: [],
            startTime: now,
            endTime: null,
            progress: { completed: 0, total: filesToScan.length * validAgents.length },
            logs: [`[${new Date(now).toISOString()}] Scan initiated`],
        };

        activeSecurityScans.set(scanId, scan);

        // Broadcast scan started
        broadcast('security:scan-started', {
            scanId,
            agents: validAgents,
            fileCount: filesToScan.length,
            timestamp: now,
        });

        fastify.log.info(`[SECURITY] Scan ${scanId} started. Files: ${filesToScan.length}, Agents: ${validAgents.length}`);

        // Return immediately, processing continues async
        return {
            scanId,
            status: 'running',
            fileCount: filesToScan.length,
            agents: validAgents,
        };
    });

    // Helper: Recursively get files with extensions
    async function getFilesRecursive(dir, extensions = []) {
        const files = [];
        try {
            const dirents = await fs.readdir(dir, { withFileTypes: true });
            for (const dirent of dirents) {
                if (dirent.name === 'node_modules' || dirent.name === '.git' || dirent.name === 'dist') continue;
                const fullPath = path.join(dir, dirent.name);
                if (dirent.isDirectory()) {
                    const subFiles = await getFilesRecursive(fullPath, extensions);
                    files.push(...subFiles);
                } else if (dirent.isFile()) {
                    const ext = path.extname(dirent.name);
                    if (extensions.length === 0 || extensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (err) {
            fastify.log.warn(`[SECURITY] Could not read directory: ${dir}`);
        }
        return files;
    }

    // Get scan status
    fastify.get('/api/security/scan/:scanId', { preHandler: verifyToken }, async (request, reply) => {
        const { scanId } = request.params;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        return scan;
    });

    // List all scans
    fastify.get('/api/security/scans', { preHandler: verifyToken }, async (request, reply) => {
        const scans = Array.from(activeSecurityScans.values()).map(s => ({
            id: s.id,
            status: s.status,
            agents: s.agents,
            fileCount: s.fileCount,
            findingCount: s.findings.length,
            startTime: s.startTime,
            endTime: s.endTime,
        }));

        return { scans };
    });

    // Get findings for a scan
    fastify.get('/api/security/findings/:scanId', { preHandler: verifyToken }, async (request, reply) => {
        const { scanId } = request.params;
        const { severity, type } = request.query;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        let findings = scan.findings;

        // Filter by severity if provided
        if (severity) {
            findings = findings.filter(f => f.severity === severity);
        }

        // Filter by type if provided
        if (type) {
            findings = findings.filter(f => f.type === type);
        }

        return {
            scanId,
            total: scan.findings.length,
            filtered: findings.length,
            findings,
        };
    });

    // Add finding to a scan (called by frontend security analyzer)
    fastify.post('/api/security/findings/:scanId', { preHandler: verifyToken }, async (request, reply) => {
        const { scanId } = request.params;
        const finding = request.body;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        // Validate and normalize finding
        if (!finding.type || !finding.severity) {
            reply.code(400).send({ error: 'Finding must have type and severity' });
            return;
        }

        const normalizedFinding = {
            id: finding.id || generateFindingId(),
            type: finding.type,
            severity: finding.severity,
            title: finding.title || `${VULNERABILITY_INFO[finding.type]?.name || finding.type} Detected`,
            description: finding.description || '',
            filePath: finding.filePath || 'unknown',
            lineNumber: finding.lineNumber || undefined,
            codeSnippet: finding.codeSnippet?.substring(0, 500) || undefined,
            impact: finding.impact || 'Potential security vulnerability',
            remediation: finding.remediation || 'Review and fix the identified issue',
            detectedBy: finding.detectedBy || 'unknown',
            timestamp: Date.now(),
            status: 'open',
            cweId: VULNERABILITY_INFO[finding.type]?.cweId || undefined,
        };

        scan.findings.push(normalizedFinding);
        scan.logs.push(`[${new Date().toISOString()}] Finding added: ${normalizedFinding.type} in ${normalizedFinding.filePath}`);

        // Broadcast finding discovered
        broadcast('security:finding-discovered', {
            scanId,
            finding: normalizedFinding,
            timestamp: Date.now(),
        });

        fastify.log.info(`[SECURITY] Finding added to ${scanId}: ${normalizedFinding.type} (${normalizedFinding.severity})`);

        return normalizedFinding;
    });

    // Update finding status
    fastify.put('/api/security/findings/:scanId/:findingId', { preHandler: verifyToken }, async (request, reply) => {
        const { scanId, findingId } = request.params;
        const { status, notes } = request.body;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        const finding = scan.findings.find(f => f.id === findingId);
        if (!finding) {
            reply.code(404).send({ error: 'Finding not found' });
            return;
        }

        const validStatuses = ['open', 'reviewed', 'fixed', 'false_positive'];
        if (status && !validStatuses.includes(status)) {
            reply.code(400).send({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        if (status) finding.status = status;
        if (notes) finding.notes = notes;
        finding.updatedAt = Date.now();

        scan.logs.push(`[${new Date().toISOString()}] Finding ${findingId} updated: status=${status || 'unchanged'}`);

        // Broadcast finding updated
        broadcast('security:finding-updated', {
            scanId,
            findingId,
            status: finding.status,
            timestamp: Date.now(),
        });

        return finding;
    });

    // Complete a scan
    fastify.post('/api/security/scan/:scanId/complete', { preHandler: verifyToken }, async (request, reply) => {
        const { scanId } = request.params;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        if (scan.status === 'completed') {
            reply.code(400).send({ error: 'Scan already completed' });
            return;
        }

        const endTime = Date.now();
        scan.status = 'completed';
        scan.endTime = endTime;
        scan.logs.push(`[${new Date(endTime).toISOString()}] Scan completed`);

        // Calculate summary
        scan.summary = {
            critical: scan.findings.filter(f => f.severity === 'Critical').length,
            high: scan.findings.filter(f => f.severity === 'High').length,
            medium: scan.findings.filter(f => f.severity === 'Medium').length,
            low: scan.findings.filter(f => f.severity === 'Low').length,
            total: scan.findings.length,
        };

        // Broadcast scan completed
        broadcast('security:scan-completed', {
            scanId,
            summary: scan.summary,
            duration: endTime - scan.startTime,
            timestamp: endTime,
        });

        fastify.log.info(`[SECURITY] Scan ${scanId} completed. Findings: ${scan.findings.length} (C:${scan.summary.critical} H:${scan.summary.high} M:${scan.summary.medium} L:${scan.summary.low})`);

        return {
            scanId,
            status: 'completed',
            duration: endTime - scan.startTime,
            summary: scan.summary,
        };
    });

    // Generate security report
    fastify.get('/api/security/report/:scanId', { preHandler: verifyToken }, async (request, reply) => {
        const { scanId } = request.params;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        const summary = scan.summary || {
            critical: scan.findings.filter(f => f.severity === 'Critical').length,
            high: scan.findings.filter(f => f.severity === 'High').length,
            medium: scan.findings.filter(f => f.severity === 'Medium').length,
            low: scan.findings.filter(f => f.severity === 'Low').length,
            total: scan.findings.length,
        };

        const report = {
            id: `report-${scanId}`,
            scanId,
            generatedAt: Date.now(),
            status: scan.status,
            startTime: scan.startTime,
            endTime: scan.endTime || Date.now(),
            duration: (scan.endTime || Date.now()) - scan.startTime,
            agents: scan.agents,
            scannedFiles: scan.filesToScan,
            fileCount: scan.fileCount,
            summary,
            findings: scan.findings,
            findingsByType: {},
            findingsByFile: {},
        };

        // Group findings by type
        for (const finding of scan.findings) {
            if (!report.findingsByType[finding.type]) {
                report.findingsByType[finding.type] = [];
            }
            report.findingsByType[finding.type].push(finding);
        }

        // Group findings by file
        for (const finding of scan.findings) {
            if (!report.findingsByFile[finding.filePath]) {
                report.findingsByFile[finding.filePath] = [];
            }
            report.findingsByFile[finding.filePath].push(finding);
        }

        return report;
    });

    // Cancel a running scan
    fastify.post('/api/security/scan/:scanId/cancel', { preHandler: verifyToken }, async (request, reply) => {
        const { scanId } = request.params;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        if (scan.status !== 'running') {
            reply.code(400).send({ error: 'Scan is not running' });
            return;
        }

        scan.status = 'cancelled';
        scan.endTime = Date.now();
        scan.logs.push(`[${new Date().toISOString()}] Scan cancelled by user`);

        // Broadcast scan cancelled
        broadcast('security:scan-cancelled', {
            scanId,
            timestamp: Date.now(),
        });

        fastify.log.info(`[SECURITY] Scan ${scanId} cancelled`);

        return { scanId, status: 'cancelled' };
    });

    // Clear completed scans
    fastify.delete('/api/security/scans/completed', { preHandler: verifyToken }, async (request, reply) => {
        let cleared = 0;
        for (const [id, scan] of activeSecurityScans) {
            if (scan.status === 'completed' || scan.status === 'cancelled') {
                activeSecurityScans.delete(id);
                cleared++;
            }
        }

        fastify.log.info(`[SECURITY] Cleared ${cleared} completed/cancelled scans`);

        return { cleared };
    });

    // Get vulnerability metadata
    fastify.get('/api/security/vulnerability-types', { preHandler: verifyToken }, async (request, reply) => {
        return { types: VULNERABILITY_INFO };
    });

    fastify.log.info('[SECURITY] Security scanning API endpoints registered');

    // --- RAG (Retrieval-Augmented Generation) API - Story 6-1 ---

    // Load RAG service and Codebase Indexer
    let ragService = null;
    let codebaseIndexer = null;

    try {
        ragService = require('../lib/rag.cjs');
        const { initCodebaseIndexer, getCodebaseIndexer } = require('../services/codebaseIndexer.cjs');

        // Initialize codebase indexer (which will also initialize RAG)
        codebaseIndexer = await initCodebaseIndexer(fastify.log);
        fastify.log.info('[RAG] RAG service and codebase indexer initialized');
    } catch (err) {
        fastify.log.warn(`[RAG] Could not initialize RAG service: ${err.message}`);
    }

    // Task 4.1: GET /api/rag/search - Semantic code search
    fastify.get('/api/rag/search', { preHandler: verifyToken }, async (request, reply) => {
        // Task 4.5: Request validation
        const { q, k } = request.query;

        if (!q || typeof q !== 'string') {
            reply.code(400).send({
                error: 'Query parameter "q" is required and must be a string',
                code: 'INVALID_QUERY'
            });
            return;
        }

        if (q.trim().length === 0) {
            reply.code(400).send({
                error: 'Query cannot be empty',
                code: 'EMPTY_QUERY'
            });
            return;
        }

        if (q.length > 1000) {
            reply.code(400).send({
                error: 'Query exceeds maximum length (1000 characters)',
                code: 'QUERY_TOO_LONG'
            });
            return;
        }

        // Validate k parameter
        let limit = 5; // Default
        if (k !== undefined) {
            const parsedK = parseInt(k, 10);
            if (isNaN(parsedK) || parsedK < 1 || parsedK > 50) {
                reply.code(400).send({
                    error: 'Parameter "k" must be a number between 1 and 50',
                    code: 'INVALID_K'
                });
                return;
            }
            limit = parsedK;
        }

        // Check if RAG service is available
        if (!ragService) {
            reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
            return;
        }

        const startTime = Date.now();
        fastify.log.info(`[RAG] Search query: "${q.substring(0, 50)}${q.length > 50 ? '...' : ''}" k=${limit}`);

        try {
            // Task 4.1 & 4.2: Execute query and return formatted results
            const results = await ragService.query(q, limit);
            const queryTime = Date.now() - startTime;

            const stats = await ragService.getStats();

            fastify.log.info(`[RAG] Search completed: ${results.length} results in ${queryTime}ms`);

            // Task 4.2: Response format
            return {
                results: results.map(r => ({
                    content: r.content,
                    source: r.source,
                    score: r.score
                })),
                stats: {
                    queryTime,
                    totalChunks: stats.chunkCount,
                    resultsReturned: results.length,
                    query: q
                }
            };

        } catch (err) {
            fastify.log.error(`[RAG] Search error: ${err.message}`);
            reply.code(500).send({
                error: `RAG search failed: ${err.message}`,
                code: 'SEARCH_ERROR'
            });
        }
    });

    // Task 4.3: GET /api/rag/stats - Get RAG index statistics
    fastify.get('/api/rag/stats', { preHandler: verifyToken }, async (request, reply) => {
        if (!ragService) {
            reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
            return;
        }

        try {
            const ragStats = await ragService.getStats();

            // Get indexer stats if available
            let indexerStats = null;
            if (codebaseIndexer) {
                const { getCodebaseIndexer } = require('../services/codebaseIndexer.cjs');
                const indexer = getCodebaseIndexer();
                if (indexer) {
                    indexerStats = indexer.getStats();
                }
            }

            return {
                rag: {
                    fileCount: ragStats.fileCount,
                    chunkCount: ragStats.chunkCount,
                    isInitialized: ragStats.isInitialized,
                    memoryUsage: ragStats.memoryUsage,
                    config: ragStats.config
                },
                indexer: indexerStats ? {
                    totalFiles: indexerStats.totalFiles,
                    indexedFiles: indexerStats.indexedFiles,
                    failedFiles: indexerStats.failedFiles,
                    totalChunks: indexerStats.totalChunks,
                    isIndexing: indexerStats.isIndexing,
                    lastUpdated: indexerStats.lastUpdated,
                    startTime: indexerStats.startTime,
                    endTime: indexerStats.endTime
                } : null,
                timestamp: Date.now()
            };

        } catch (err) {
            fastify.log.error(`[RAG] Stats error: ${err.message}`);
            reply.code(500).send({
                error: `Failed to get RAG stats: ${err.message}`,
                code: 'STATS_ERROR'
            });
        }
    });

    // Task 4.4: POST /api/rag/reindex - Trigger full reindex
    fastify.post('/api/rag/reindex', { preHandler: verifyToken }, async (request, reply) => {
        if (!codebaseIndexer) {
            reply.code(503).send({
                error: 'Codebase indexer not available',
                code: 'SERVICE_UNAVAILABLE'
            });
            return;
        }

        try {
            const { getCodebaseIndexer } = require('../services/codebaseIndexer.cjs');
            const indexer = getCodebaseIndexer();

            if (!indexer) {
                reply.code(503).send({
                    error: 'Codebase indexer not initialized',
                    code: 'INDEXER_NOT_INITIALIZED'
                });
                return;
            }

            // Check if already indexing
            const currentStats = indexer.getStats();
            if (currentStats.isIndexing) {
                reply.code(409).send({
                    error: 'Reindex already in progress',
                    code: 'REINDEX_IN_PROGRESS',
                    progress: {
                        indexed: currentStats.indexedFiles,
                        total: currentStats.totalFiles
                    }
                });
                return;
            }

            fastify.log.info('[RAG] Starting full reindex...');

            // Start reindex in background
            indexer.reindex().catch(err => {
                fastify.log.error(`[RAG] Reindex failed: ${err.message}`);
            });

            // Broadcast reindex started
            broadcast('rag:reindex-started', {
                timestamp: Date.now()
            });

            return {
                success: true,
                message: 'Reindex started',
                timestamp: Date.now()
            };

        } catch (err) {
            fastify.log.error(`[RAG] Reindex error: ${err.message}`);
            reply.code(500).send({
                error: `Failed to start reindex: ${err.message}`,
                code: 'REINDEX_ERROR'
            });
        }
    });

    // GET /api/rag/config - Get RAG configuration
    fastify.get('/api/rag/config', { preHandler: verifyToken }, async (request, reply) => {
        if (!ragService) {
            reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
            return;
        }

        try {
            const config = ragService.getConfig();
            return { config };
        } catch (err) {
            reply.code(500).send({
                error: `Failed to get RAG config: ${err.message}`,
                code: 'CONFIG_ERROR'
            });
        }
    });

    // POST /api/rag/clear - Clear all indexed content
    fastify.post('/api/rag/clear', { preHandler: verifyToken }, async (request, reply) => {
        if (!ragService) {
            reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
            return;
        }

        try {
            const result = await ragService.clear();
            fastify.log.info(`[RAG] Cleared ${result.clearedChunks} chunks from ${result.clearedFiles} files`);

            // Broadcast clear event
            broadcast('rag:cleared', {
                clearedChunks: result.clearedChunks,
                clearedFiles: result.clearedFiles,
                timestamp: Date.now()
            });

            return result;
        } catch (err) {
            fastify.log.error(`[RAG] Clear error: ${err.message}`);
            reply.code(500).send({
                error: `Failed to clear RAG index: ${err.message}`,
                code: 'CLEAR_ERROR'
            });
        }
    });

    fastify.log.info('[RAG] RAG API endpoints registered');
}

module.exports = securityRoutes;
