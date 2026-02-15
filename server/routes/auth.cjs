'use strict';

async function authRoutes(fastify, opts) {
    const { verifyToken, activeSessions, JWT_SECRET, SESSION_EXPIRY, REFRESH_TOKEN_EXPIRY, IS_LOCAL_ONLY, jwt, crypto, csrf, securityLogger } = opts;

    // Create session
    fastify.post('/api/auth/session', async (request, reply) => {
        try {
            const { userId } = request.body;

            // SECURITY: Reject anonymous sessions when server is network-accessible
            if (!IS_LOCAL_ONLY && !userId) {
                reply.code(401).send({ error: 'Authentication required for network access. Provide a userId.' });
                return;
            }

            const sessionId = crypto.randomBytes(32).toString('hex');
            const now = Date.now();

            // Create session
            const session = {
                sessionId,
                userId: userId || 'anonymous',
                createdAt: now,
                expiresAt: now + (SESSION_EXPIRY * 1000),
                invalidated: false,
                ip: request.ip,
            };

            activeSessions.set(sessionId, session);

            // Generate JWT token
            const token = jwt.sign(
                { userId: session.userId, sessionId },
                JWT_SECRET,
                { expiresIn: SESSION_EXPIRY }
            );

            // Generate refresh token
            const refreshToken = jwt.sign(
                { userId: session.userId, sessionId, type: 'refresh' },
                JWT_SECRET,
                { expiresIn: REFRESH_TOKEN_EXPIRY }
            );

            await securityLogger.logSessionCreate(session.userId, sessionId, request.ip);
            await securityLogger.logAuthAttempt(session.userId, request.ip, true);

            return {
                token,
                refreshToken,
                expiresIn: SESSION_EXPIRY,
                userId: session.userId,
            };
        } catch (err) {
            fastify.log.error(`[AUTH] Session creation error: ${err.message}`);
            reply.code(500).send({ error: 'Failed to create session' });
        }
    });

    // Refresh token
    fastify.post('/api/auth/refresh', async (request, reply) => {
        try {
            const { refreshToken } = request.body;

            if (!refreshToken) {
                reply.code(400).send({ error: 'Refresh token required' });
                return;
            }

            const decoded = jwt.verify(refreshToken, JWT_SECRET);

            if (decoded.type !== 'refresh') {
                reply.code(400).send({ error: 'Invalid refresh token' });
                return;
            }

            const session = activeSessions.get(decoded.sessionId);
            if (!session || session.invalidated) {
                await securityLogger.logAuthAttempt(decoded.userId, request.ip, false, 'Session invalidated');
                reply.code(401).send({ error: 'Session expired or invalidated' });
                return;
            }

            // Update session expiry
            const now = Date.now();
            session.expiresAt = now + (SESSION_EXPIRY * 1000);

            // Generate new token
            const newToken = jwt.sign(
                { userId: session.userId, sessionId: decoded.sessionId },
                JWT_SECRET,
                { expiresIn: SESSION_EXPIRY }
            );

            await securityLogger.logSessionRefresh(session.userId, decoded.sessionId, request.ip);

            return {
                token: newToken,
                expiresIn: SESSION_EXPIRY,
            };
        } catch (err) {
            await securityLogger.logAuthAttempt(null, request.ip, false, err.message);
            reply.code(401).send({ error: 'Invalid or expired refresh token' });
        }
    });

    // Logout (invalidate session)
    fastify.post('/api/auth/logout', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const session = activeSessions.get(request.user.sessionId);
            if (session) {
                session.invalidated = true;
                await securityLogger.logSessionInvalidate(request.user.userId, request.user.sessionId, 'User logout');
            }

            return { success: true };
        } catch (err) {
            fastify.log.error(`[AUTH] Logout error: ${err.message}`);
            reply.code(500).send({ error: 'Failed to logout' });
        }
    });

    // Get CSRF token
    fastify.get('/api/auth/csrf-token', async (request, reply) => {
        if (!csrf) {
            reply.code(503).send({ error: 'CSRF protection not available' });
            return;
        }

        const token = await reply.generateCsrf();
        return { csrfToken: token };
    });
}

module.exports = authRoutes;
