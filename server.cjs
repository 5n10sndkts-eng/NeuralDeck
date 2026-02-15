
const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');

// --- DEFENSIVE MODULES (Safe Require) ---
const safeRequire = (name) => {
    try { return require(name); }
    catch (e) {
        console.warn(`[SYSTEM WARNING] Module '${name}' not detected. Security protocols compromised. Run: npm install ${name}`);
        return null;
    }
};

const fastify = require('fastify')({
    logger: true,
    bodyLimit: 52428800 // 50MB limit
});

// --- MODULE LOADING ---
const helmet = safeRequire('@fastify/helmet');
const cors = safeRequire('@fastify/cors');
const rateLimit = safeRequire('@fastify/rate-limit');
const compress = safeRequire('@fastify/compress');
const cookie = safeRequire('@fastify/cookie');
const csrf = safeRequire('@fastify/csrf-protection');
const jwt = safeRequire('jsonwebtoken');
const crypto = require('crypto');

// --- SERVICES ---
const securityLogger = require('./server/lib/securityLogger.cjs');
const encryption = require('./server/lib/encryption.cjs');
const { broadcast } = require('./server/services/socket.cjs');
const { getCheckpointService } = require('./server/services/checkpointService.cjs');
const reasoningService = require('./server/services/reasoningService.cjs');
const hiveMemory = require('./server/services/hiveMemory.cjs');
const { workspaceService, NEURALDECK_DIR } = require('./server/services/workspaceService.cjs');
const opencodeCLI = require('./server/services/opencodeCLI.cjs');
const providerAdapter = require('./server/services/providerAdapter.cjs');

// --- ROUTE MODULES ---
const authRoutes = require('./server/routes/auth.cjs');
const configRoutes = require('./server/routes/config.cjs');
const opencodeRoutes = require('./server/routes/opencode.cjs');
const filesRoutes = require('./server/routes/files.cjs');
const diffRoutes = require('./server/routes/diff.cjs');
const checkpointRoutes = require('./server/routes/checkpoints.cjs');
const chatRoutes = require('./server/routes/chat.cjs');
const swarmRoutes = require('./server/routes/swarm.cjs');
const conflictRoutes = require('./server/routes/conflicts.cjs');
const securityRoutes = require('./server/routes/security.cjs');

// --- SHARED CONTEXT (imported from route context module) ---
const ctx = require('./server/routes/_context.cjs');

const PORT = ctx.PORT;
const HOST = ctx.HOST;
const IS_LOCAL_ONLY = ctx.IS_LOCAL_ONLY;
const WORKSPACE_PATH = ctx.WORKSPACE_PATH;

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];
const CORS_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
const SOCKET_CORS_ORIGINS = process.env.SOCKET_CORS_ORIGINS
    ? process.env.SOCKET_CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : CORS_ORIGINS;

// --- SECURITY: Fail-fast if critical modules are missing ---
const CRITICAL_SECURITY_MODULES = { helmet, cors, rateLimit, jwt };
const missingSecurity = Object.entries(CRITICAL_SECURITY_MODULES)
    .filter(([, mod]) => !mod)
    .map(([name]) => name);
if (missingSecurity.length > 0 && !IS_LOCAL_ONLY) {
    console.error(`[FATAL] Critical security modules missing: ${missingSecurity.join(', ')}. Run: npm install`);
    console.error('[FATAL] Server refuses to start in network mode without security modules.');
    process.exit(1);
} else if (missingSecurity.length > 0) {
    console.warn(`[SECURITY WARNING] Running in local-only mode without: ${missingSecurity.join(', ')}. Install for production use.`);
}

// --- JWT CONFIGURATION - Story 6-4 ---
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY || '86400', 10);
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60;

// In-memory session store (use Redis in production)
const activeSessions = new Map();

// SECURITY: Periodic cleanup of expired sessions to prevent memory leaks
const SESSION_CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of activeSessions) {
        if (session.expiresAt < now || session.invalidated) {
            activeSessions.delete(id);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`[SESSION] Cleaned ${cleaned} expired sessions. Active: ${activeSessions.size}`);
    }
}, SESSION_CLEANUP_INTERVAL);

// --- BOOTSTRAP ---
async function start() {

    // 1. Security Headers (Helmet) - Story 1.1 & 6-4
    if (helmet) {
        const isDevelopment = process.env.NODE_ENV !== 'production';

        await fastify.register(helmet, {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*", "http://localhost:*"],
                    imgSrc: ["'self'", "data:", "blob:"],
                    fontSrc: ["'self'", "data:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
                reportOnly: isDevelopment,
            },
            xContentTypeOptions: true,
            xFrameOptions: { action: 'deny' },
            xXssProtection: true,
            referrerPolicy: { policy: 'no-referrer' },
            hsts: process.env.NODE_ENV === 'production' ? {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            } : false
        });
        fastify.log.info('[SECURITY] Helmet security headers enabled with CSP');
    }

    // 2. CORS - Story 1.1: Explicit origin whitelist
    if (cors) {
        const allowedOrigins = CORS_ORIGINS;

        await fastify.register(cors, {
            origin: (origin, callback) => {
                if (!origin) {
                    if (process.env.NODE_ENV === 'production') {
                        fastify.log.warn(`[SECURITY] CORS blocked request with no origin`);
                        return callback(new Error('Not allowed'), false);
                    }
                    return callback(null, true);
                }
                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                fastify.log.warn(`[SECURITY] CORS blocked origin: ${origin}`);
                return callback(new Error('Not allowed by CORS'), false);
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
            credentials: true
        });
        fastify.log.info(`[SECURITY] CORS configured for origins: ${allowedOrigins.join(', ')}`);
    }

    // 3. Compression
    if (compress) {
        await fastify.register(compress);
    }

    // 4. Rate Limiting (DDoS Protection) - Story 1.1: 100 req/min per IP
    if (rateLimit) {
        await fastify.register(rateLimit, {
            max: 100,
            timeWindow: '1 minute',
            keyGenerator: (request) => request.ip,
            addHeaders: {
                'x-ratelimit-limit': true,
                'x-ratelimit-remaining': true,
                'x-ratelimit-reset': true
            },
            errorResponseBuilder: (request, context) => {
                fastify.log.warn(`[SECURITY] Rate limit exceeded: ${request.method} ${request.url} from ${request.ip}`);
                return {
                    statusCode: 429,
                    error: 'Too Many Requests',
                    message: 'NEURAL OVERLOAD: Rate limit exceeded',
                    retryAfter: Math.ceil(context.ttl / 1000)
                };
            }
        });
        fastify.log.info('[SECURITY] Rate limiting enabled: 100 req/min per IP');
    }

    // 5. Cookie Support - Story 6-4
    if (cookie) {
        await fastify.register(cookie, {
            secret: JWT_SECRET,
            parseOptions: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
            }
        });
        fastify.log.info('[SECURITY] Cookie support enabled');
    }

    // 6. CSRF Protection - Story 6-4
    if (csrf && cookie) {
        await fastify.register(csrf, {
            cookieOpts: { signed: true }
        });
        fastify.log.info('[SECURITY] CSRF protection enabled');
    }

    // 7. Security Event Logging Hook - Story 1.1 & 6-4
    fastify.addHook('onResponse', (request, reply, done) => {
        if (reply.statusCode === 429) {
            fastify.log.warn(`[SECURITY] Rate limit violation: ${request.method} ${request.url} from ${request.ip}`);
        }
        if (reply.statusCode === 403) {
            fastify.log.warn(`[SECURITY] Access forbidden: ${request.method} ${request.url} from ${request.ip}`);
        }
        done();
    });

    // --- JWT AUTHENTICATION MIDDLEWARE - Story 6-4 ---
    const verifyToken = async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                await securityLogger.logAuthAttempt(null, request.ip, false, 'No token provided');
                reply.code(401).send({ error: 'Authentication required' });
                return;
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);

            const session = activeSessions.get(decoded.sessionId);
            if (!session || session.invalidated) {
                await securityLogger.logAuthAttempt(decoded.userId, request.ip, false, 'Session invalidated');
                reply.code(401).send({ error: 'Session expired or invalidated' });
                return;
            }

            request.user = {
                userId: decoded.userId,
                sessionId: decoded.sessionId,
            };
        } catch (err) {
            await securityLogger.logAuthAttempt(null, request.ip, false, err.message);
            reply.code(401).send({ error: 'Invalid or expired token' });
        }
    };

    // --- SHARED OPTS FOR ROUTE PLUGINS ---
    const sharedOpts = {
        ...ctx,
        verifyToken,
        activeSessions,
        JWT_SECRET,
        SESSION_EXPIRY,
        REFRESH_TOKEN_EXPIRY,
        IS_LOCAL_ONLY,
        jwt,
        crypto,
        csrf,
        encryption,
        securityLogger,
        broadcast,
        getCheckpointService,
        reasoningService,
        hiveMemory,
        workspaceService,
        NEURALDECK_DIR,
        opencodeCLI,
        providerAdapter,
    };

    // --- REGISTER ROUTE MODULES ---
    await fastify.register(authRoutes, sharedOpts);
    await fastify.register(configRoutes, sharedOpts);
    await fastify.register(opencodeRoutes, sharedOpts);
    await fastify.register(filesRoutes, sharedOpts);
    await fastify.register(diffRoutes, sharedOpts);
    await fastify.register(checkpointRoutes, sharedOpts);
    await fastify.register(chatRoutes, sharedOpts);
    await fastify.register(swarmRoutes, sharedOpts);
    await fastify.register(conflictRoutes, sharedOpts);
    await fastify.register(securityRoutes, sharedOpts);

    fastify.log.info('[ROUTES] All route modules registered');

    // --- SOCKET.IO INITIALIZATION - Story 4-1 & 6-4 ---
    try {
        const { initSocket } = require('./server/services/socket.cjs');

        await fastify.ready();
        const httpServer = fastify.server;

        initSocket(httpServer, {
            jwtSecret: JWT_SECRET,
            jwt,
            activeSessions,
            securityLogger,
            corsOrigins: SOCKET_CORS_ORIGINS,
        });

        fastify.log.info('[SOCKET] Socket.IO initialized with JWT authentication');
    } catch (err) {
        fastify.log.error(`[SOCKET] Failed to initialize Socket.IO: ${err.message}`);
    }

    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`NEURAL DECK CORE ONLINE: http://${HOST}:${PORT}`);

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUTH] JWT_SECRET: ${JWT_SECRET.substring(0, 10)}...`);
            console.log(`[AUTH] Session expiry: ${SESSION_EXPIRY}s (${SESSION_EXPIRY / 3600}h)`);
        }
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

start();
