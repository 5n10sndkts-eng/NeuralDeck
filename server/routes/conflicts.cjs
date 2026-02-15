'use strict';

async function conflictRoutes(fastify, opts) {
    const { verifyToken, fs, path, broadcast, securityLogger, safePath, WORKSPACE_PATH } = opts;

    // Track active conflicts
    const activeConflicts = new Map();

    // Generate conflict ID
    function generateConflictId() {
        return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Detect and register a conflict
    fastify.post('/api/conflicts/detect', { preHandler: verifyToken }, async (request, reply) => {
        const { filePath, developerA, developerB } = request.body;

        if (!filePath || !developerA || !developerB) {
            reply.code(400).send({ error: 'filePath, developerA, and developerB are required' });
            return;
        }

        const conflictId = generateConflictId();
        const now = Date.now();

        // Read original file content
        let originalContent = '';
        try {
            const fullPath = safePath(filePath);
            originalContent = await fs.readFile(fullPath, 'utf-8');
        } catch (e) {
            fastify.log.warn(`[CONFLICT] Could not read original file: ${filePath}`);
        }

        const conflict = {
            id: conflictId,
            filePath,
            originalContent,
            developerA: { ...developerA, timestamp: developerA.timestamp || now },
            developerB: { ...developerB, timestamp: developerB.timestamp || now },
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            logs: [`[${new Date(now).toISOString()}] Conflict detected`],
        };

        activeConflicts.set(conflictId, conflict);

        fastify.log.info(`[CONFLICT] Detected: ${conflictId} on file ${filePath}`);

        // Broadcast conflict detected event
        broadcast('conflict:detected', {
            conflictId,
            filePath,
            developerA: developerA.nodeId,
            developerB: developerB.nodeId,
            timestamp: now,
        });

        return conflict;
    });

    // List all conflicts
    fastify.get('/api/conflicts', { preHandler: verifyToken }, async (request, reply) => {
        const conflicts = Array.from(activeConflicts.values()).map(c => ({
            id: c.id,
            filePath: c.filePath,
            status: c.status,
            developerA: c.developerA.nodeId,
            developerB: c.developerB.nodeId,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));

        return { conflicts, total: conflicts.length };
    });

    // Get conflict details
    fastify.get('/api/conflicts/:conflictId', { preHandler: verifyToken }, async (request, reply) => {
        const { conflictId } = request.params;
        const conflict = activeConflicts.get(conflictId);

        if (!conflict) {
            reply.code(404).send({ error: 'Conflict not found' });
            return;
        }

        return conflict;
    });

    // Attempt automatic resolution
    fastify.post('/api/conflicts/:conflictId/auto', { preHandler: verifyToken }, async (request, reply) => {
        const { conflictId } = request.params;
        const { llmConfig } = request.body;
        const conflict = activeConflicts.get(conflictId);

        if (!conflict) {
            reply.code(404).send({ error: 'Conflict not found' });
            return;
        }

        if (conflict.status !== 'pending' && conflict.status !== 'manual-required') {
            reply.code(400).send({ error: `Conflict status is ${conflict.status}, cannot auto-resolve` });
            return;
        }

        conflict.status = 'auto-resolving';
        conflict.updatedAt = Date.now();
        conflict.logs.push(`[${new Date().toISOString()}] Starting automatic resolution...`);

        fastify.log.info(`[CONFLICT] Auto-resolving: ${conflictId}`);

        // For now, attempt a simple merge strategy
        // Real implementation would call LLM via frontend
        try {
            // Simplified: check if changes are non-overlapping (append strategy)
            const contentA = conflict.developerA.content || '';
            const contentB = conflict.developerB.content || '';
            const original = conflict.originalContent || '';

            // Simple strategy: if both added to end, combine them
            let mergedContent = original;
            let strategy = 'manual';
            let canMerge = false;

            // Check if both are additions to the original
            if (contentA.startsWith(original) && contentB.startsWith(original)) {
                const additionA = contentA.slice(original.length);
                const additionB = contentB.slice(original.length);

                if (additionA && additionB) {
                    mergedContent = original + additionA + '\n' + additionB;
                    strategy = 'append';
                    canMerge = true;
                }
            }

            if (canMerge) {
                conflict.resolution = {
                    content: mergedContent,
                    method: strategy,
                    resolvedAt: Date.now(),
                    resolvedBy: 'system',
                };
                conflict.status = 'resolved';
                conflict.updatedAt = Date.now();
                conflict.logs.push(`[${new Date().toISOString()}] Auto-resolved using ${strategy} strategy`);

                // Write resolved file
                const fullPath = safePath(conflict.filePath);
                await fs.writeFile(fullPath, mergedContent, 'utf-8');

                // Broadcast resolution
                broadcast('conflict:resolved', {
                    conflictId,
                    filePath: conflict.filePath,
                    method: strategy,
                    timestamp: Date.now(),
                });

                fastify.log.info(`[CONFLICT] Auto-resolved: ${conflictId} using ${strategy}`);

                return conflict;
            } else {
                // Cannot auto-merge, mark as manual-required
                conflict.status = 'manual-required';
                conflict.updatedAt = Date.now();
                conflict.logs.push(`[${new Date().toISOString()}] Manual resolution required: overlapping changes`);

                // Create conflict file with markers
                const conflictFilePath = conflict.filePath + '.conflict';
                const conflictFileContent = `<<<<<<< ${conflict.developerA.nodeId} (Story: ${conflict.developerA.storyId || 'unknown'})
${contentA}
=======
${contentB}
>>>>>>> ${conflict.developerB.nodeId} (Story: ${conflict.developerB.storyId || 'unknown'})

/* CONFLICT INFO
 * File: ${conflict.filePath}
 * Conflict ID: ${conflict.id}
 * Created: ${new Date(conflict.createdAt).toISOString()}
 */`;

                const fullConflictPath = safePath(conflictFilePath);
                await fs.writeFile(fullConflictPath, conflictFileContent, 'utf-8');

                conflict.conflictFilePath = conflictFilePath;

                fastify.log.info(`[CONFLICT] Created conflict file: ${conflictFilePath}`);

                return conflict;
            }
        } catch (err) {
            conflict.status = 'failed';
            conflict.error = err.message;
            conflict.updatedAt = Date.now();
            conflict.logs.push(`[${new Date().toISOString()}] Auto-resolution failed: ${err.message}`);

            broadcast('conflict:failed', {
                conflictId,
                filePath: conflict.filePath,
                error: err.message,
                timestamp: Date.now(),
            });

            fastify.log.error(`[CONFLICT] Auto-resolution failed: ${conflictId} - ${err.message}`);

            return conflict;
        }
    });

    // Manual resolution
    fastify.post('/api/conflicts/:conflictId/resolve', { preHandler: verifyToken }, async (request, reply) => {
        const { conflictId } = request.params;
        const { resolvedContent, resolvedBy } = request.body;
        const conflict = activeConflicts.get(conflictId);

        if (!conflict) {
            reply.code(404).send({ error: 'Conflict not found' });
            return;
        }

        if (!resolvedContent) {
            reply.code(400).send({ error: 'resolvedContent is required' });
            return;
        }

        if (conflict.status === 'resolved') {
            reply.code(400).send({ error: 'Conflict already resolved' });
            return;
        }

        conflict.resolution = {
            content: resolvedContent,
            method: 'manual',
            resolvedAt: Date.now(),
            resolvedBy: resolvedBy || 'user',
        };
        conflict.status = 'resolved';
        conflict.updatedAt = Date.now();
        conflict.logs.push(`[${new Date().toISOString()}] Manually resolved by ${resolvedBy || 'user'}`);

        // Write resolved file
        try {
            const fullPath = safePath(conflict.filePath);
            await fs.writeFile(fullPath, resolvedContent, 'utf-8');

            // Broadcast resolution
            broadcast('conflict:resolved', {
                conflictId,
                filePath: conflict.filePath,
                method: 'manual',
                timestamp: Date.now(),
            });

            fastify.log.info(`[CONFLICT] Manually resolved: ${conflictId}`);

            return conflict;
        } catch (err) {
            conflict.status = 'failed';
            conflict.error = err.message;
            conflict.logs.push(`[${new Date().toISOString()}] Write failed: ${err.message}`);

            reply.code(500).send({ error: `Failed to write resolved file: ${err.message}` });
            return;
        }
    });

    // Get conflict statistics
    fastify.get('/api/conflicts/stats', { preHandler: verifyToken }, async (request, reply) => {
        const conflicts = Array.from(activeConflicts.values());

        const stats = {
            total: conflicts.length,
            pending: conflicts.filter(c => c.status === 'pending').length,
            autoResolving: conflicts.filter(c => c.status === 'auto-resolving').length,
            manualRequired: conflicts.filter(c => c.status === 'manual-required').length,
            resolved: conflicts.filter(c => c.status === 'resolved').length,
            failed: conflicts.filter(c => c.status === 'failed').length,
            byFile: {},
            byDeveloper: {},
        };

        // Count by file
        for (const conflict of conflicts) {
            stats.byFile[conflict.filePath] = (stats.byFile[conflict.filePath] || 0) + 1;
            stats.byDeveloper[conflict.developerA.nodeId] = (stats.byDeveloper[conflict.developerA.nodeId] || 0) + 1;
            stats.byDeveloper[conflict.developerB.nodeId] = (stats.byDeveloper[conflict.developerB.nodeId] || 0) + 1;
        }

        return stats;
    });

    // Clear resolved conflicts
    fastify.delete('/api/conflicts/resolved', { preHandler: verifyToken }, async (request, reply) => {
        let cleared = 0;
        for (const [id, conflict] of activeConflicts) {
            if (conflict.status === 'resolved') {
                activeConflicts.delete(id);
                cleared++;
            }
        }

        fastify.log.info(`[CONFLICT] Cleared ${cleared} resolved conflicts`);

        return { cleared };
    });

    fastify.log.info('[CONFLICT] Conflict resolution API endpoints registered');
}

module.exports = conflictRoutes;
