'use strict';

async function diffRoutes(fastify, opts) {
    const { verifyToken, fs, path, safePath, broadcast, securityLogger, WORKSPACE_PATH, getCheckpointService, workspaceService } = opts;

    // Pending diffs storage (in-memory for session)
    const pendingDiffs = new Map();
    let diffIdCounter = 1;

    // Local helper: generate timestamped filename for backups
    const generateTimestampedFilename = (originalPath) => {
        const ext = path.extname(originalPath);
        const basename = path.basename(originalPath, ext);
        const timestamp = Date.now();
        return `${basename}_${timestamp}${ext}`;
    };

    // Diff: Preview changes before applying
    fastify.post('/api/diff/preview', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { path: filePath, proposedContent, agentId, reason } = request.body;

            if (!filePath || proposedContent === undefined) {
                return reply.code(400).send({ error: 'Missing path or proposedContent' });
            }

            const cleanPath = safePath(filePath);
            let oldContent = '';
            let isNewFile = false;

            // Try to read existing file
            try {
                oldContent = await fs.readFile(cleanPath, 'utf-8');
            } catch (e) {
                // File doesn't exist - this is a new file
                isNewFile = true;
            }

            // Calculate additions and deletions
            const oldLines = oldContent.split('\n');
            const newLines = proposedContent.split('\n');

            let additions = 0;
            let deletions = 0;

            // Simple line-based diff counting
            const oldSet = new Set(oldLines);
            const newSet = new Set(newLines);

            for (const line of newLines) {
                if (!oldSet.has(line)) additions++;
            }
            for (const line of oldLines) {
                if (!newSet.has(line)) deletions++;
            }

            // Create diff record
            const diffId = `diff-${diffIdCounter++}`;
            const diffRecord = {
                id: diffId,
                path: filePath,
                oldContent,
                newContent: proposedContent,
                additions,
                deletions,
                isNewFile,
                agentId: agentId || null,
                reason: reason || null,
                createdAt: Date.now(),
                status: 'pending'
            };

            pendingDiffs.set(diffId, diffRecord);

            fastify.log.info(`[DIFF] Preview created: ${diffId} for ${filePath} (+${additions}/-${deletions})`);

            return {
                id: diffId,
                path: filePath,
                oldContent,
                newContent: proposedContent,
                additions,
                deletions,
                isNewFile
            };
        } catch (e) {
            fastify.log.error(`[DIFF] Preview error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Diff: Apply approved changes
    fastify.post('/api/diff/apply', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { diffId } = request.body;

            if (!diffId) {
                return reply.code(400).send({ error: 'Missing diffId' });
            }

            const diff = pendingDiffs.get(diffId);
            if (!diff) {
                return reply.code(404).send({ error: 'Diff not found or expired' });
            }

            if (diff.status !== 'pending') {
                return reply.code(400).send({ error: `Diff already ${diff.status}` });
            }

            const cleanPath = safePath(diff.path);

            // Create backup before applying (if file exists)
            if (!diff.isNewFile) {
                try {
                    const dir = path.dirname(cleanPath);
                    const backupDir = path.join(dir, '.backup');
                    await fs.mkdir(backupDir, { recursive: true });

                    const backupFilename = generateTimestampedFilename(cleanPath);
                    const backupPath = path.join(backupDir, backupFilename);

                    await fs.copyFile(cleanPath, backupPath);
                    fastify.log.info(`[DIFF] Backup created: ${backupPath}`);
                } catch (e) {
                    fastify.log.warn(`[DIFF] Backup failed: ${e.message}`);
                }
            }

            // Apply the changes
            await fs.mkdir(path.dirname(cleanPath), { recursive: true });
            await fs.writeFile(cleanPath, diff.newContent, 'utf-8');

            // Update diff status
            diff.status = 'applied';
            diff.appliedAt = Date.now();
            diff.appliedBy = request.user?.userId || 'anonymous';

            // Log to security logger
            await securityLogger.logFileWrite(
                diff.path,
                request.user?.userId || 'anonymous',
                true
            );

            fastify.log.info(`[DIFF] Applied: ${diffId} to ${diff.path}`);

            // Emit socket event for real-time update
            broadcast('diff:applied', {
                diffId,
                path: diff.path,
                agentId: diff.agentId
            });

            return {
                success: true,
                diffId,
                path: diff.path,
                appliedAt: diff.appliedAt
            };
        } catch (e) {
            fastify.log.error(`[DIFF] Apply error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Diff: Reject changes
    fastify.post('/api/diff/reject', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { diffId, reason } = request.body;

            if (!diffId) {
                return reply.code(400).send({ error: 'Missing diffId' });
            }

            const diff = pendingDiffs.get(diffId);
            if (!diff) {
                return reply.code(404).send({ error: 'Diff not found or expired' });
            }

            if (diff.status !== 'pending') {
                return reply.code(400).send({ error: `Diff already ${diff.status}` });
            }

            // Update diff status
            diff.status = 'rejected';
            diff.rejectedAt = Date.now();
            diff.rejectedBy = request.user?.userId || 'anonymous';
            diff.rejectionReason = reason || null;

            fastify.log.info(`[DIFF] Rejected: ${diffId} for ${diff.path}${reason ? ` (${reason})` : ''}`);

            // Emit socket event for real-time update
            broadcast('diff:rejected', {
                diffId,
                path: diff.path,
                agentId: diff.agentId,
                reason
            });

            return {
                success: true,
                diffId,
                path: diff.path,
                rejectedAt: diff.rejectedAt,
                reason
            };
        } catch (e) {
            fastify.log.error(`[DIFF] Reject error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Diff: Get pending diffs list
    fastify.get('/api/diff/pending', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const pending = [];
            for (const [id, diff] of pendingDiffs.entries()) {
                if (diff.status === 'pending') {
                    pending.push({
                        id: diff.id,
                        path: diff.path,
                        additions: diff.additions,
                        deletions: diff.deletions,
                        isNewFile: diff.isNewFile,
                        agentId: diff.agentId,
                        createdAt: diff.createdAt
                    });
                }
            }
            return { pending };
        } catch (e) {
            reply.code(500).send({ error: e.message });
        }
    });

    // Diff: Get specific diff by ID
    fastify.get('/api/diff/:diffId', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { diffId } = request.params;
            const diff = pendingDiffs.get(diffId);

            if (!diff) {
                return reply.code(404).send({ error: 'Diff not found' });
            }

            return diff;
        } catch (e) {
            reply.code(500).send({ error: e.message });
        }
    });

    // Cleanup old diffs: all diffs older than 1 hour, and applied/rejected diffs older than 10 minutes
    const MAX_PENDING_DIFFS = 100;
    const cleanupInterval = setInterval(() => {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const tenMinAgo = Date.now() - 10 * 60 * 1000;
        let cleaned = 0;
        for (const [id, diff] of pendingDiffs.entries()) {
            const isOld = diff.createdAt < oneHourAgo;
            const isResolved = (diff.status === 'applied' || diff.status === 'rejected') && diff.createdAt < tenMinAgo;
            if (isOld || isResolved) {
                pendingDiffs.delete(id);
                cleaned++;
            }
        }
        // Cap total diffs to prevent memory exhaustion
        if (pendingDiffs.size > MAX_PENDING_DIFFS) {
            const excess = [...pendingDiffs.entries()]
                .sort((a, b) => a[1].createdAt - b[1].createdAt)
                .slice(0, pendingDiffs.size - MAX_PENDING_DIFFS);
            for (const [id] of excess) {
                pendingDiffs.delete(id);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            fastify.log.debug(`[DIFF] Cleaned ${cleaned} diffs. Active: ${pendingDiffs.size}`);
        }
    }, 5 * 60 * 1000); // Run every 5 minutes

    // Clear the interval when the plugin is torn down
    fastify.addHook('onClose', () => {
        clearInterval(cleanupInterval);
    });
}

module.exports = diffRoutes;
