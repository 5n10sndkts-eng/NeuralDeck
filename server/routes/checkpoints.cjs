'use strict';

async function checkpointRoutes(fastify, opts) {
    const { verifyToken, fs, path, getCheckpointService, WORKSPACE_PATH, workspaceService, securityLogger, safePath, socketService } = opts;

    // Initialize checkpoint service
    const checkpointService = getCheckpointService(WORKSPACE_PATH);

    // Checkpoint: Get checkpoints for a file
    fastify.get('/api/checkpoints', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { filePath } = request.query;

            if (!filePath) {
                return reply.code(400).send({ error: 'Missing filePath query parameter' });
            }

            const cleanPath = safePath(filePath);
            const checkpoints = await checkpointService.getCheckpoints(cleanPath);

            return { checkpoints };
        } catch (e) {
            fastify.log.error(`[CHECKPOINT] Get error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Checkpoint: Get checkpoint content
    fastify.get('/api/checkpoints/:checkpointId/content', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { checkpointId } = request.params;
            const content = await checkpointService.getCheckpointContent(checkpointId);

            return { content };
        } catch (e) {
            if (e.message === 'Checkpoint not found') {
                return reply.code(404).send({ error: 'Checkpoint not found' });
            }
            fastify.log.error(`[CHECKPOINT] Content error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Checkpoint: Restore a checkpoint
    fastify.post('/api/checkpoints/:checkpointId/restore', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { checkpointId } = request.params;
            const result = await checkpointService.restoreCheckpoint(checkpointId);

            fastify.log.info(`[CHECKPOINT] Restored: ${checkpointId} to ${result.filePath}`);

            // Emit socket event for real-time update
            if (socketService) {
                socketService.broadcastToAll('checkpoint:restored', {
                    checkpointId,
                    filePath: result.filePath,
                    restoredFrom: result.restoredFrom,
                });
            }

            return result;
        } catch (e) {
            if (e.message === 'Checkpoint not found') {
                return reply.code(404).send({ error: 'Checkpoint not found' });
            }
            fastify.log.error(`[CHECKPOINT] Restore error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Checkpoint: Delete a checkpoint
    fastify.delete('/api/checkpoints/:checkpointId', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { checkpointId } = request.params;
            const result = await checkpointService.deleteCheckpoint(checkpointId);

            fastify.log.info(`[CHECKPOINT] Deleted: ${checkpointId}`);

            return result;
        } catch (e) {
            if (e.message === 'Checkpoint not found') {
                return reply.code(404).send({ error: 'Checkpoint not found' });
            }
            fastify.log.error(`[CHECKPOINT] Delete error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Checkpoint: Get storage stats
    fastify.get('/api/checkpoints/stats', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const stats = await checkpointService.getStats();
            return stats;
        } catch (e) {
            fastify.log.error(`[CHECKPOINT] Stats error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Checkpoint: Get all files with checkpoints
    fastify.get('/api/checkpoints/files', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const files = await checkpointService.getFilesWithCheckpoints();
            return { files };
        } catch (e) {
            fastify.log.error(`[CHECKPOINT] Files error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Checkpoint: Manual cleanup
    fastify.post('/api/checkpoints/cleanup', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const result = await checkpointService.cleanup();
            fastify.log.info(`[CHECKPOINT] Manual cleanup: ${result.deletedCount} removed`);
            return result;
        } catch (e) {
            fastify.log.error(`[CHECKPOINT] Cleanup error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // Checkpoint: Create manual checkpoint
    fastify.post('/api/checkpoints', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { filePath, summary } = request.body;

            if (!filePath) {
                return reply.code(400).send({ error: 'Missing filePath' });
            }

            const cleanPath = safePath(filePath);

            // Read current file content
            const content = await fs.readFile(cleanPath, 'utf-8');

            const checkpoint = await checkpointService.createCheckpoint(
                cleanPath,
                content,
                request.user?.userId || 'user',
                summary || 'Manual checkpoint'
            );

            fastify.log.info(`[CHECKPOINT] Manual: ${checkpoint.id} for ${cleanPath}`);

            return checkpoint;
        } catch (e) {
            if (e.code === 'ENOENT') {
                return reply.code(404).send({ error: 'File not found' });
            }
            fastify.log.error(`[CHECKPOINT] Create error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = checkpointRoutes;
