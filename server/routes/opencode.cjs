'use strict';

async function opencodeRoutes(fastify, opts) {
    const { verifyToken, fs, path, opencodeCLI, providerAdapter } = opts;

    // Health check (no auth required)
    fastify.get('/health', async (request, reply) => {
        return {
            status: 'ONLINE',
            uptime: process.uptime(),
            timestamp: Date.now(),
            version: '2.0.0-CYBER-FASTIFY'
        };
    });

    // OpenCode: Health and status
    fastify.get('/api/opencode/health', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const health = await opencodeCLI.healthCheck();
            return {
                success: true,
                ...health
            };
        } catch (error) {
            fastify.log.error(`[OPENCODE] Health check failed: ${error.message}`);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // OpenCode: Agent mappings and routing metadata
    fastify.get('/api/opencode/agents', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const mappingsFile = path.join(process.cwd(), '.neuraldeck', 'agent-mappings.json');
            const raw = await fs.readFile(mappingsFile, 'utf-8');
            const parsed = JSON.parse(raw);
            return {
                success: true,
                mappings: parsed.mappings || {},
                stats: parsed.stats || null,
                version: parsed.version || null
            };
        } catch (error) {
            fastify.log.error(`[OPENCODE] Failed to load agent mappings: ${error.message}`);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // OpenCode: Session list and local cache
    fastify.get('/api/opencode/sessions', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const [sessions, cacheRaw] = await Promise.all([
                opencodeCLI.listSessions(),
                fs.readFile(path.join(process.cwd(), '.neuraldeck', 'session-cache.json'), 'utf-8').catch(() => null)
            ]);

            return {
                success: true,
                sessions,
                cache: cacheRaw ? JSON.parse(cacheRaw) : { version: '1.0.0', sessions: {} }
            };
        } catch (error) {
            fastify.log.error(`[OPENCODE] Failed to list sessions: ${error.message}`);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // OpenCode: Prompt routing endpoint
    fastify.post('/api/opencode/prompt', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { agentId, prompt, options } = request.body || {};

            if (!agentId || !prompt) {
                return reply.code(400).send({
                    success: false,
                    error: 'agentId and prompt are required'
                });
            }

            const result = await providerAdapter.routeToAgent(prompt, agentId, options || {});
            return {
                success: true,
                result
            };
        } catch (error) {
            fastify.log.error(`[OPENCODE] Prompt routing failed: ${error.message}`);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    });

    // OpenCode: Cache session for a specific NeuralDeck agent
    fastify.post('/api/opencode/cache-session', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { agentId, sessionId } = request.body || {};

            if (!agentId || !sessionId) {
                return reply.code(400).send({
                    success: false,
                    error: 'agentId and sessionId are required'
                });
            }

            const saved = opencodeCLI.cacheSessionId(agentId, sessionId);
            if (!saved) {
                return reply.code(500).send({
                    success: false,
                    error: 'Failed to save session cache'
                });
            }

            return {
                success: true,
                agentId,
                sessionId
            };
        } catch (error) {
            fastify.log.error(`[OPENCODE] Cache session failed: ${error.message}`);
            reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    });
}

module.exports = opencodeRoutes;
