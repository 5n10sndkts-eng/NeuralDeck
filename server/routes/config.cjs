'use strict';

async function configRoutes(fastify, opts) {
    const { verifyToken, securityLogger, encryption } = opts;

    // List all API key providers
    fastify.get('/api/config/keys', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const providers = await encryption.listProviders();
            await securityLogger.logApiKeyOperation('list', 'all', request.user.userId, request.ip);
            return { providers };
        } catch (err) {
            fastify.log.error(`[API_KEYS] List error: ${err.message}`);
            reply.code(500).send({ error: 'Failed to list API key providers' });
        }
    });

    // Get API key for a provider
    fastify.get('/api/config/keys/:provider', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { provider } = request.params;
            const apiKey = await encryption.getApiKey(provider);

            await securityLogger.logApiKeyOperation('read', provider, request.user.userId, request.ip);

            if (!apiKey) {
                reply.code(404).send({ error: `No API key found for provider: ${provider}` });
                return;
            }

            // Return masked key for verification
            const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
            return { provider, exists: true, masked: maskedKey };
        } catch (err) {
            fastify.log.error(`[API_KEYS] Get error: ${err.message}`);
            reply.code(500).send({ error: 'Failed to get API key' });
        }
    });

    // Set/Update API key for a provider
    fastify.post('/api/config/keys/:provider', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { provider } = request.params;
            const { apiKey } = request.body;

            if (!apiKey) {
                reply.code(400).send({ error: 'API key is required' });
                return;
            }

            await encryption.updateApiKey(provider, apiKey);
            await securityLogger.logApiKeyOperation('update', provider, request.user.userId, request.ip);

            return { success: true, provider };
        } catch (err) {
            fastify.log.error(`[API_KEYS] Update error: ${err.message}`);
            reply.code(500).send({ error: 'Failed to update API key' });
        }
    });

    // Delete API key for a provider
    fastify.delete('/api/config/keys/:provider', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { provider } = request.params;
            await encryption.deleteApiKey(provider);
            await securityLogger.logApiKeyOperation('delete', provider, request.user.userId, request.ip);

            return { success: true, provider };
        } catch (err) {
            fastify.log.error(`[API_KEYS] Delete error: ${err.message}`);
            reply.code(500).send({ error: 'Failed to delete API key' });
        }
    });

    // Get security audit logs (admin only)
    fastify.get('/api/security/audit-logs', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const limit = parseInt(request.query.limit || '100', 10);
            const logs = await securityLogger.getRecentLogs(limit);
            return { logs, count: logs.length };
        } catch (err) {
            fastify.log.error(`[AUDIT] Log retrieval error: ${err.message}`);
            reply.code(500).send({ error: 'Failed to retrieve audit logs' });
        }
    });
}

module.exports = configRoutes;
