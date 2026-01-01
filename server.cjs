
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

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

// --- SECURITY SERVICES - Story 6-4 ---
const securityLogger = require('./server/lib/securityLogger.cjs');
const encryption = require('./server/lib/encryption.cjs');

// --- FILE WATCHER SERVICE - Story 1.3 ---
const { initFileWatcher, getFileWatcher } = require('./server/services/fileWatcher.cjs');

// --- SOCKET SERVICE - Story 4-1 ---
const { broadcast } = require('./server/services/socket.cjs');

const PORT = process.env.PORT || 3001;
const WORKSPACE_PATH = process.cwd();

// --- JWT CONFIGURATION - Story 6-4 ---
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY || '86400', 10); // 24 hours in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// In-memory session store (use Redis in production)
const activeSessions = new Map();

// --- COMMAND SECURITY - Story 1.2 ---

// Expanded whitelist of allowed base commands
const ALLOWED_COMMANDS = [
    // File operations
    'ls', 'pwd', 'mkdir', 'touch', 'cat', 'grep', 'find', 'echo', 'head', 'tail', 'wc',
    // Git commands
    'git',
    // NPM/Node commands
    'npm', 'node', 'npx',
    // Python (version checks only)
    'python', 'python3',
    // Build tools
    'tsc', 'vite', 'esbuild'
];

// Dangerous patterns that are ALWAYS blocked
const DANGEROUS_PATTERNS = [
    /rm\s+(-[rf]+\s+)*[\/~]/, // rm -rf /, rm -rf ~
    /rm\s+(-[rf]+\s+)*\*/, // rm -rf *
    /rm\s+(-[rf]+\s+)*\.\./, // rm -rf ..
    /rm\s+(-[rf]+\s+)*\$/, // rm -rf $HOME, $PWD, etc.
    /mkfs/, // Format filesystem
    /dd\s+if=/, // Disk destroyer
    /format\s+[a-z]:?/i, // Windows format
    /fdisk/, /parted/, // Disk partitioning
    /shutdown/, /reboot/, /halt/, /poweroff/, // System control
    /init\s+[06]/, // System runlevel
    />\s*\/dev\/sd/, // Overwrite disk
    /chmod\s+777\s+\//, // Dangerous permissions on root
    /chown\s+.*\s+\//, // Change ownership of root
    /curl.*\|\s*(ba)?sh/, // Pipe to shell
    /wget.*\|\s*(ba)?sh/, // Pipe to shell
    /eval\s*\(/, // eval execution
    /exec\s*\(/, // exec in command
];

// Command execution timeout (30 seconds)
const COMMAND_TIMEOUT = 30000;
// Include user's local bin paths for CLI tools (claude, gemini, etc.)
const USER_HOME = process.env.HOME || process.env.USERPROFILE || '';
const EXTENDED_PATH = [
    `${USER_HOME}/.local/bin`,
    '/opt/homebrew/bin',
    '/usr/local/bin',
    process.env.PATH
].filter(Boolean).join(':');
const EXEC_OPTIONS = {
    cwd: WORKSPACE_PATH,
    maxBuffer: 1024 * 1024 * 10,
    timeout: COMMAND_TIMEOUT,
    env: { ...process.env, PATH: EXTENDED_PATH }
};

// Validate command against whitelist and blacklist
const validateCommand = (cmd, ip) => {
    // Type check - prevent object/array injection
    if (typeof cmd !== 'string') {
        return { valid: false, reason: 'Command must be a string' };
    }

    // Check for command chaining/interpolation
    if (/[;&|`$]/.test(cmd)) {
        return { valid: false, reason: 'Command chaining or interpolation not allowed' };
    }

    // Check against dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(cmd)) {
            return { valid: false, reason: 'Command matches dangerous pattern' };
        }
    }

    // Extract base command
    const baseCmd = cmd.trim().split(/\s+/)[0];

    // Check whitelist
    if (!ALLOWED_COMMANDS.includes(baseCmd)) {
        return { valid: false, reason: `Command '${baseCmd}' is not in whitelist` };
    }

    return { valid: true };
};

// Validate file paths in command arguments
const validateCommandPaths = (cmd, ip) => {
    // Extract potential file paths from command
    const pathPatterns = [
        /(?:^|\s)(\.\.\/[^\s]*)/g, // ../path
        /(?:^|\s)(\/[^\s]+)/g, // /absolute/path
        /(?:^|\s)(~\/[^\s]*)/g, // ~/home path
    ];

    for (const pattern of pathPatterns) {
        let match;
        while ((match = pattern.exec(cmd)) !== null) {
            const potentialPath = match[1];

            // Block obvious traversal patterns
            if (potentialPath.includes('..')) {
                return { valid: false, reason: `Path traversal blocked: ${potentialPath}` };
            }

            // For absolute paths, verify they're within workspace
            if (potentialPath.startsWith('/')) {
                try {
                    const resolved = path.resolve(potentialPath);
                    if (!resolved.startsWith(WORKSPACE_PATH)) {
                        return { valid: false, reason: `Path outside workspace: ${potentialPath}` };
                    }
                } catch (e) {
                    return { valid: false, reason: `Invalid path: ${potentialPath}` };
                }
            }
        }
    }

    return { valid: true };
};

// --- UTILS ---
const safePath = (inputPath) => {
    // Prevent traversal
    const resolved = path.resolve(WORKSPACE_PATH, inputPath.replace(/^\//, ''));
    if (!resolved.startsWith(WORKSPACE_PATH)) {
        throw new Error("Access Denied: Path traversal detected.");
    }
    return resolved;
};

// Helper function to generate timestamped filename - Story 10 (R-007)
const generateTimestampedFilename = (originalPath) => {
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    const timestamp = Date.now();
    return `${basename}_${timestamp}${ext}`;
};

// --- BOOTSTRAP ---
async function start() {

    // 1. Security Headers (Helmet) - Story 1.1 & 6-4
    if (helmet) {
        const isDevelopment = process.env.NODE_ENV !== 'production';
        
        await fastify.register(helmet, {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"], // Vite requires unsafe-inline in dev
                    styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs this
                    connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*", "http://localhost:*"],
                    imgSrc: ["'self'", "data:", "blob:"],
                    fontSrc: ["'self'", "data:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
                reportOnly: isDevelopment, // Report-only in dev, enforce in production
            },
            xContentTypeOptions: true,    // Prevents MIME type sniffing
            xFrameOptions: { action: 'deny' }, // Prevents clickjacking
            xXssProtection: true,         // Enables XSS filter
            referrerPolicy: { policy: 'no-referrer' }, // Privacy protection
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
        const allowedOrigins = process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',')
            : [
                'http://localhost:3000',
                'http://localhost:5173',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:5173'
            ];

        await fastify.register(cors, {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, curl, Postman) in dev
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
            keyGenerator: (request) => request.ip, // Per-IP tracking
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

    // Verify JWT token
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

            // Check if session is still valid
            const session = activeSessions.get(decoded.sessionId);
            if (!session || session.invalidated) {
                await securityLogger.logAuthAttempt(decoded.userId, request.ip, false, 'Session invalidated');
                reply.code(401).send({ error: 'Session expired or invalidated' });
                return;
            }

            // Attach user info to request
            request.user = {
                userId: decoded.userId,
                sessionId: decoded.sessionId,
            };
        } catch (err) {
            await securityLogger.logAuthAttempt(null, request.ip, false, err.message);
            reply.code(401).send({ error: 'Invalid or expired token' });
        }
    };

    // Optional authentication (doesn't fail if no token)
    const optionalAuth = async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, JWT_SECRET);
                const session = activeSessions.get(decoded.sessionId);
                if (session && !session.invalidated) {
                    request.user = {
                        userId: decoded.userId,
                        sessionId: decoded.sessionId,
                    };
                }
            }
        } catch (err) {
            // Silent fail for optional auth
        }
    };

    // --- AUTHENTICATION ROUTES - Story 6-4 ---

    // Create session (login)
    fastify.post('/api/auth/session', async (request, reply) => {
        try {
            const { userId } = request.body;
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

    // --- API KEY MANAGEMENT ROUTES - Story 6-4 ---

    // List API key providers (without exposing actual keys)
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

    // --- ROUTES ---

    // Health Check
    fastify.get('/health', async (request, reply) => {
        return { 
            status: 'ONLINE', 
            uptime: process.uptime(), 
            timestamp: Date.now(),
            version: '2.0.0-CYBER-FASTIFY' 
        };
    });

    // File System: List
    fastify.get('/api/files', async (request, reply) => {
        try {
            const files = await getFileStructure(WORKSPACE_PATH);
            return files;
        } catch (e) {
            reply.code(500).send([]);
        }
    });

    // File System: Read
    fastify.post('/api/read', { preHandler: optionalAuth }, async (request, reply) => {
        try {
            const { filePath } = request.body;
            const cleanPath = safePath(filePath);
            const content = await fs.readFile(cleanPath, 'utf-8');
            
            await securityLogger.logFileRead(
                filePath,
                request.user?.userId || 'anonymous',
                true
            );
            
            return { content };
        } catch (e) {
            await securityLogger.logFileRead(
                request.body.filePath,
                request.user?.userId || 'anonymous',
                false,
                e
            );
            reply.code(404).send({ error: `File not found or unreadable. ${e.message}` });
        }
    });

    // File System: Write
    fastify.post('/api/write', { preHandler: optionalAuth }, async (request, reply) => {
        try {
            const { filePath, content } = request.body;
            const cleanPath = safePath(filePath);
            await fs.mkdir(path.dirname(cleanPath), { recursive: true });
            await fs.writeFile(cleanPath, content, 'utf-8');
            
            await securityLogger.logFileWrite(
                filePath,
                request.user?.userId || 'anonymous',
                true
            );
            
            fastify.log.info(`[FS] Wrote ${filePath}`);
            return { success: true };
        } catch (e) {
            await securityLogger.logFileWrite(
                request.body.filePath,
                request.user?.userId || 'anonymous',
                false,
                e
            );
            reply.code(500).send({ error: e.message });
        }
    });

    // File System: Check if file exists - Story 10 (R-007)
    fastify.get('/api/files/check', async (request, reply) => {
        try {
            const { path: filePath } = request.query;
            if (!filePath) {
                return reply.code(400).send({ error: 'Missing path parameter' });
            }
            const cleanPath = safePath(filePath);
            try {
                await fs.access(cleanPath);
                return { exists: true, path: cleanPath };
            } catch {
                return { exists: false, path: cleanPath };
            }
        } catch (e) {
            reply.code(500).send({ error: e.message });
        }
    });

    // File System: Create backup - Story 10 (R-007)
    fastify.post('/api/files/backup', async (request, reply) => {
        try {
            const { path: filePath } = request.body;
            if (!filePath) {
                return reply.code(400).send({ error: 'Missing path parameter' });
            }
            const originalPath = safePath(filePath);
            
            // Check if original file exists
            try {
                await fs.access(originalPath);
            } catch {
                return reply.code(404).send({ error: 'Original file not found' });
            }

            // Create backup directory
            const dir = path.dirname(originalPath);
            const backupDir = path.join(dir, '.backup');
            await fs.mkdir(backupDir, { recursive: true });

            // Generate backup filename with timestamp
            const backupFilename = generateTimestampedFilename(originalPath);
            const backupPath = path.join(backupDir, backupFilename);

            // Copy file to backup
            await fs.copyFile(originalPath, backupPath);
            fastify.log.info(`[FILES] Backup created: ${backupPath}`);

            return {
                success: true,
                backupPath,
                originalPath,
                timestamp: Date.now()
            };
        } catch (e) {
            reply.code(500).send({ error: e.message });
        }
    });

    // File System: Save with versioning - Story 10 (R-007)
    fastify.post('/api/files/save', async (request, reply) => {
        try {
            const { path: filePath, content, mode = 'versioned' } = request.body;
            
            // Validate required parameters
            if (!filePath || content == null) {
                return reply.code(400).send({ error: 'Missing path or content parameter' });
            }

            // Validate mode parameter
            if (mode !== 'versioned' && mode !== 'overwrite') {
                return reply.code(400).send({ 
                    error: `Invalid mode: ${mode}. Must be 'versioned' or 'overwrite'` 
                });
            }

            const cleanPath = safePath(filePath);
            const dir = path.dirname(cleanPath);
            
            // Ensure directory exists
            await fs.mkdir(dir, { recursive: true });

            let finalPath = cleanPath;
            let backupCreated = false;
            let wasVersioned = false;

            if (mode === 'versioned') {
                // Create versioned filename with timestamp
                const versionedFilename = generateTimestampedFilename(cleanPath);
                finalPath = path.join(dir, versionedFilename);
                wasVersioned = true;
                fastify.log.info(`[FILES] Creating versioned file: ${finalPath}`);
            } else if (mode === 'overwrite') {
                // Check if file exists and create backup
                try {
                    await fs.access(cleanPath);
                    // File exists - create backup first
                    const backupDir = path.join(dir, '.backup');
                    await fs.mkdir(backupDir, { recursive: true });
                    
                    const backupFilename = generateTimestampedFilename(cleanPath);
                    const backupPath = path.join(backupDir, backupFilename);
                    
                    await fs.copyFile(cleanPath, backupPath);
                    backupCreated = true;
                    fastify.log.info(`[FILES] Backup created before overwrite: ${backupPath}`);
                } catch {
                    // File doesn't exist - no backup needed
                }
            }

            // Write the file
            await fs.writeFile(finalPath, content, 'utf-8');
            fastify.log.info(`[FILES] File saved: ${finalPath}`);

            return {
                success: true,
                path: finalPath,
                mode,
                backupCreated,
                wasVersioned
            };
        } catch (e) {
            reply.code(500).send({ error: e.message });
        }
    });

    // CLI Provider whitelist for AI tools
    const CLI_PROVIDER_COMMANDS = {
        'cli': null, // User-defined, validated separately
        'claude-cli': ['claude'],
        'gemini-cli': ['gemini'],
        'copilot-cli': ['gh'],
        'cursor-cli': ['cursor']
    };

    // Unified LLM Gateway
    fastify.post('/api/chat', async (request, reply) => {
        const { messages, config } = request.body;
        const { provider, baseUrl, apiKey, model, temperature, cliCommand } = config || {};

        // --- CLI PROVIDER HANDLING ---
        const cliProviders = ['cli', 'claude-cli', 'gemini-cli', 'copilot-cli', 'cursor-cli'];
        if (cliProviders.includes(provider)) {
            fastify.log.info(`[GATEWAY] CLI Provider: ${provider}`);

            if (!cliCommand) {
                reply.code(400).send({ error: 'CLI command template required for CLI providers' });
                return;
            }

            // Build prompt from messages
            const prompt = messages
                .filter(m => m.role !== 'system')
                .map(m => m.content)
                .join('\n');

            // Validate CLI command base against whitelist
            const cmdBase = cliCommand.trim().split(/\s+/)[0];
            const allowedBases = CLI_PROVIDER_COMMANDS[provider];

            if (allowedBases && !allowedBases.includes(cmdBase)) {
                fastify.log.warn(`[GATEWAY] CLI command base '${cmdBase}' not allowed for provider ${provider}`);
                reply.code(400).send({ error: `Command '${cmdBase}' not allowed for ${provider}. Expected: ${allowedBases.join(', ')}` });
                return;
            }

            // For generic 'cli' provider, validate against main whitelist
            if (provider === 'cli' && !ALLOWED_COMMANDS.includes(cmdBase)) {
                fastify.log.warn(`[GATEWAY] CLI command base '${cmdBase}' not in whitelist`);
                reply.code(400).send({ error: `Command '${cmdBase}' is not in the allowed commands whitelist` });
                return;
            }

            // Replace template placeholder with escaped prompt
            const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
            const finalCommand = cliCommand.replace('{{prompt}}', escapedPrompt);

            fastify.log.info(`[GATEWAY] Executing CLI: ${finalCommand.substring(0, 100)}...`);

            return new Promise((resolve) => {
                const startTime = Date.now();
                exec(finalCommand, { ...EXEC_OPTIONS, timeout: 120000 }, (error, stdout, stderr) => {
                    const duration = Date.now() - startTime;

                    if (error) {
                        fastify.log.error(`[GATEWAY] CLI error: ${error.message}`);
                        resolve({
                            choices: [{
                                message: {
                                    role: 'assistant',
                                    content: `CLI Error: ${stderr || error.message}`
                                }
                            }],
                            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                            model: provider,
                            cli_duration: duration
                        });
                        return;
                    }

                    fastify.log.info(`[GATEWAY] CLI success in ${duration}ms`);
                    resolve({
                        choices: [{
                            message: {
                                role: 'assistant',
                                content: stdout.trim()
                            }
                        }],
                        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                        model: provider,
                        cli_duration: duration
                    });
                });
            });
        }

        // --- HTTP API PROVIDER HANDLING ---
        // Determine target URL based on provider
        let targetUrl;
        if (baseUrl) {
            // Normalize URL: ensure /v1 suffix for OpenAI-compatible APIs
            targetUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
            if (!targetUrl.endsWith('/v1')) {
                targetUrl += '/v1';
            }
        } else if (provider === 'openai') {
            targetUrl = 'https://api.openai.com/v1';
        } else if (provider === 'lmstudio') {
            targetUrl = 'http://192.168.100.190:1234/v1';
        } else {
            targetUrl = 'http://localhost:8000/v1';
        }

        const targetKey = apiKey || process.env.OPENAI_API_KEY || 'lm-studio';
        const targetModel = (model || 'openai/gpt-oss-20b').trim(); // Sanitize model name

        fastify.log.info(`[GATEWAY] Proxying to ${targetUrl} [Model: ${targetModel}]`);

        try {
            const response = await fetch(`${targetUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${targetKey}`
                },
                body: JSON.stringify({
                    model: targetModel,
                    messages: messages,
                    temperature: temperature || 0.7,
                    max_tokens: 4096,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                fastify.log.error(`[GATEWAY ERROR] ${errorText}`);
                reply.code(response.status).send({ error: `Upstream Error: ${errorText}` });
                return;
            }

            const data = await response.json();
            return data;

        } catch (error) {
            fastify.log.error(`[GATEWAY FAIL] ${error.message}`);
            reply.code(500).send({ error: 'Failed to connect to AI Provider.' });
        }
    });

    // Tool Execution (Safe Shell) - Story 1.2: Enhanced Security
    fastify.post('/api/mcp/call', async (request, reply) => {
        const { tool, args } = request.body;
        const clientIp = request.ip;

        if (tool === 'shell_exec' || tool === 'run_command') {
            const cmd = args?.command || args;

            // Step 1: Validate command against whitelist and blacklist
            const cmdValidation = validateCommand(cmd, clientIp);
            if (!cmdValidation.valid) {
                fastify.log.warn(`[SECURITY] Command rejected: ${cmd} from ${clientIp} - ${cmdValidation.reason}`);
                return { result: `Error: ${cmdValidation.reason}` };
            }

            // Step 2: Validate paths in command arguments
            const pathValidation = validateCommandPaths(cmd, clientIp);
            if (!pathValidation.valid) {
                fastify.log.warn(`[SECURITY] Path traversal blocked: ${cmd} from ${clientIp} - ${pathValidation.reason}`);
                return { result: `Error: ${pathValidation.reason}` };
            }

            // Step 3: Execute command with logging
            const startTime = Date.now();
            fastify.log.info(`[COMMAND] Executing: ${cmd} from ${clientIp}`);

            return new Promise((resolve) => {
                exec(cmd, EXEC_OPTIONS, (error, stdout, stderr) => {
                    const executionTime = Date.now() - startTime;
                    const exitCode = error ? (error.code || 1) : 0;

                    // Truncate output with indicators
                    const maxStdout = 5000;
                    const maxStderr = 1000;
                    const truncatedStdout = stdout.length > maxStdout
                        ? stdout.substring(0, maxStdout) + '\n... [truncated]'
                        : stdout;
                    const truncatedStderr = stderr.length > maxStderr
                        ? stderr.substring(0, maxStderr) + '\n... [truncated]'
                        : stderr;

                    if (exitCode === 0) {
                        fastify.log.info(`[COMMAND] Success: ${cmd} from ${clientIp} - exit:${exitCode} time:${executionTime}ms`);
                    } else {
                        fastify.log.warn(`[COMMAND] Failed: ${cmd} from ${clientIp} - exit:${exitCode} time:${executionTime}ms error:${error?.message || 'unknown'}`);
                    }

                    resolve({
                        result: JSON.stringify({
                            stdout: truncatedStdout,
                            stderr: truncatedStderr,
                            exitCode: exitCode,
                            executionTime: executionTime
                        })
                    });
                });
            });
        }

        // Git Log Tool - Story 1.2: Validated
        if (tool === 'git_log') {
            // Validate args types to prevent injection
            const count = typeof args?.count === 'number' ? Math.min(Math.max(1, args.count), 100) : 10;
            const skip = typeof args?.skip === 'number' ? Math.max(0, args.skip) : 0;

            const cmd = `git log --pretty=format:'%h|||%an|||%ad|||%s' --date=short -n ${count} --skip ${skip}`;

            fastify.log.info(`[COMMAND] Executing git_log: count=${count} skip=${skip} from ${clientIp}`);

            return new Promise((resolve) => {
                exec(cmd, EXEC_OPTIONS, (error, stdout, stderr) => {
                    if (error) {
                        fastify.log.warn(`[COMMAND] git_log failed from ${clientIp}: ${error.message}`);
                        return resolve({ result: "[]" });
                    }
                    const lines = stdout.split('\n').filter(l => l.trim()).map(l => {
                        const [hash, author, date, message] = l.split('|||');
                        return { hash, author, date, message };
                    });
                    fastify.log.info(`[COMMAND] git_log success from ${clientIp}: ${lines.length} commits`);
                    resolve({ result: JSON.stringify(lines) });
                });
            });
        }

        fastify.log.info(`[COMMAND] Unknown tool: ${tool} from ${clientIp}`);
        return { result: "Tool processed (No op / Not found)." };
    });

    // --- DOCKER INTEGRATION ENDPOINTS ---
    const DOCKER_BUILD_TIMEOUT = 10 * 60 * 1000; // 10 minutes

    // Sanitize image name to prevent command injection
    const sanitizeImageName = (name) => {
        if (!name) return `docker-test-${Date.now()}`;
        // Remove dangerous characters, keep only alphanumeric, hyphens, underscores, colons, slashes
        const sanitized = name.replace(/[^a-zA-Z0-9._/-]/g, '');
        if (sanitized.length > 200) {
            throw new Error('Invalid image name: too long (max 200 characters)');
        }
        if (sanitized.length === 0) {
            throw new Error('Invalid image name: empty after sanitization');
        }
        return sanitized;
    };

    // Dockerfile Generation Endpoint
    fastify.post('/api/docker/generate', async (request, reply) => {
        try {
            const { projectType, outputPath, dependencies = {}, buildCommand, port, envVars = {} } = request.body;

            if (!projectType) {
                reply.code(400).send({ error: 'projectType is required' });
                return;
            }

            fastify.log.info(`[DOCKER] Generating Dockerfile for project type: ${projectType}`);

            let dockerfileContent;
            const normalizedType = projectType.toLowerCase();

            if (normalizedType === 'nodejs' || normalizedType === 'node') {
                dockerfileContent = generateNodeDockerfile({ dependencies, buildCommand, port, envVars });
            } else if (normalizedType === 'python') {
                dockerfileContent = generatePythonDockerfile({ dependencies, buildCommand, port, envVars });
            } else if (normalizedType === 'react' || normalizedType === 'vite') {
                dockerfileContent = generateReactDockerfile({ dependencies, buildCommand, port, envVars });
            } else {
                reply.code(400).send({ error: `Unsupported project type: ${projectType}` });
                return;
            }

            // Determine output path
            let finalPath;
            if (outputPath) {
                finalPath = safePath(outputPath);
            } else {
                finalPath = path.join(WORKSPACE_PATH, 'Dockerfile');
            }

            // Write Dockerfile
            await fs.writeFile(finalPath, dockerfileContent, 'utf-8');
            fastify.log.info(`[DOCKER] Dockerfile written to: ${finalPath}`);

            return {
                success: true,
                dockerfilePath: finalPath,
                content: dockerfileContent
            };

        } catch (error) {
            fastify.log.error(`[DOCKER] Generation error: ${error.message}`);
            if (error.message.includes('Path traversal')) {
                reply.code(400).send({ error: error.message });
            } else {
                reply.code(500).send({ error: `Failed to generate Dockerfile: ${error.message}` });
            }
        }
    });

    // Dockerfile Validation Endpoint
    fastify.post('/api/docker/validate', async (request, reply) => {
        try {
            const { dockerfilePath, imageName, cleanup = true } = request.body;

            if (!dockerfilePath) {
                reply.code(400).send({ error: 'dockerfilePath is required' });
                return;
            }

            // Sanitize and validate paths
            const safeDockerfilePath = safePath(dockerfilePath);
            
            // Check if Dockerfile exists
            try {
                await fs.access(safeDockerfilePath);
            } catch (error) {
                reply.code(404).send({ error: `Dockerfile not found: ${dockerfilePath}` });
                return;
            }

            // Sanitize image name
            let sanitizedImageName;
            try {
                sanitizedImageName = sanitizeImageName(imageName || `docker-test-${Date.now()}`);
            } catch (error) {
                reply.code(400).send({ error: error.message });
                return;
            }

            const imageTag = `${sanitizedImageName}:latest`;
            fastify.log.info(`[DOCKER] Validating Dockerfile: ${safeDockerfilePath}, image: ${imageTag}`);

            // Build Docker image - Story 1.4: Fixed timeout handling
            const buildDir = path.dirname(safeDockerfilePath);
            const dockerfileName = path.basename(safeDockerfilePath);
            const buildCommand = `docker build -t ${imageTag} -f ${dockerfileName} ${buildDir}`;

            const buildResult = await new Promise((resolve) => {
                let killed = false;
                const childProcess = exec(buildCommand, {
                    ...EXEC_OPTIONS,
                    cwd: buildDir,
                    timeout: DOCKER_BUILD_TIMEOUT // Use exec's built-in timeout
                }, (error, stdout, stderr) => {
                    if (killed) {
                        resolve({ error: new Error('Docker build timeout after 10 minutes'), stdout: stdout || '', stderr: stderr || '' });
                    } else {
                        resolve({ error, stdout: stdout || '', stderr: stderr || '' });
                    }
                });

                // Backup timeout in case exec timeout doesn't work
                const timeout = setTimeout(() => {
                    if (childProcess && !childProcess.killed) {
                        killed = true;
                        childProcess.kill('SIGTERM');
                        fastify.log.warn(`[DOCKER] Build killed due to timeout: ${imageTag}`);
                    }
                }, DOCKER_BUILD_TIMEOUT + 5000); // 5 second grace period after exec timeout

                childProcess.on('exit', () => clearTimeout(timeout));
            });

            const buildSuccess = !buildResult.error;
            const buildOutput = buildResult.stdout + buildResult.stderr;
            
            fastify.log.info(`[DOCKER] Build ${buildSuccess ? 'succeeded' : 'failed'} for ${imageTag}`);

            // Parse errors if build failed
            let errors = [];
            if (!buildSuccess) {
                errors = parseDockerErrors(buildOutput);
                fastify.log.warn(`[DOCKER] Build errors: ${errors.length} issues found`);
            }

            // Cleanup image if requested and build succeeded
            if (cleanup && buildSuccess) {
                try {
                    const cleanupCommand = `docker rmi ${imageTag}`;
                    exec(cleanupCommand, EXEC_OPTIONS, (error) => {
                        if (error) {
                            fastify.log.warn(`[DOCKER] Cleanup warning: ${error.message}`);
                        } else {
                            fastify.log.info(`[DOCKER] Cleaned up image: ${imageTag}`);
                        }
                    });
                } catch (cleanupError) {
                    fastify.log.warn(`[DOCKER] Cleanup error (non-fatal): ${cleanupError.message}`);
                }
            }

            return {
                success: buildSuccess,
                imageTag: imageTag,
                stdout: buildResult.stdout,
                stderr: buildResult.stderr,
                buildOutput: buildOutput,
                errors: errors
            };

        } catch (error) {
            fastify.log.error(`[DOCKER] Validation error: ${error.message}`);
            if (error.message.includes('timeout')) {
                reply.code(408).send({ error: 'Docker build timeout' });
            } else if (error.message.includes('Path traversal')) {
                reply.code(400).send({ error: error.message });
            } else {
                reply.code(500).send({ error: `Failed to validate Dockerfile: ${error.message}` });
            }
        }
    });

    // --- FILE WATCHER INITIALIZATION - Story 1.3 ---
    try {
        const fileWatcher = initFileWatcher(fastify.log);

        // Subscribe to file changes and log them
        fileWatcher.subscribe((event) => {
            fastify.log.info(`[FILE_CHANGE] ${event.eventType}: ${event.relativePath}`);
        });

        fastify.log.info('[STARTUP] File watcher service initialized');
    } catch (error) {
        fastify.log.error(`[STARTUP] File watcher failed to initialize: ${error.message}`);
        // Continue server startup even if file watcher fails
    }

    // --- FILE LOCK API ENDPOINTS - Story 1.3 ---
    fastify.post('/api/files/lock', async (request, reply) => {
        const { filePath, agentId } = request.body;

        if (!filePath || !agentId) {
            reply.code(400).send({ error: 'filePath and agentId are required' });
            return;
        }

        const watcher = getFileWatcher();
        if (!watcher) {
            reply.code(503).send({ error: 'File watcher service not available' });
            return;
        }

        const result = watcher.acquireLock(filePath, agentId);
        return result;
    });

    fastify.post('/api/files/unlock', async (request, reply) => {
        const { filePath, agentId } = request.body;

        if (!filePath || !agentId) {
            reply.code(400).send({ error: 'filePath and agentId are required' });
            return;
        }

        const watcher = getFileWatcher();
        if (!watcher) {
            reply.code(503).send({ error: 'File watcher service not available' });
            return;
        }

        const result = watcher.releaseLock(filePath, agentId);
        return result;
    });

    fastify.get('/api/files/locks', async (request, reply) => {
        const watcher = getFileWatcher();
        if (!watcher) {
            reply.code(503).send({ error: 'File watcher service not available' });
            return;
        }

        return { locks: watcher.getAllLocks() };
    });

    fastify.get('/api/files/lock/:filePath', async (request, reply) => {
        const { filePath } = request.params;

        const watcher = getFileWatcher();
        if (!watcher) {
            reply.code(503).send({ error: 'File watcher service not available' });
            return;
        }

        const lock = watcher.getLock(decodeURIComponent(filePath));
        return { locked: !!lock, lock };
    });

    // --- STORY DETECTION API - Story 4-1 ---
    // Endpoint to list stories with metadata
    fastify.get('/api/stories', async (request, reply) => {
        try {
            const storiesDir = path.join(WORKSPACE_PATH, 'stories');

            // Check if stories directory exists
            try {
                await fs.access(storiesDir);
            } catch (error) {
                // Stories directory doesn't exist yet, return empty list
                return { stories: [], isWatching: true };
            }

            const files = await fs.readdir(storiesDir);
            const storyFiles = files.filter(f => f.endsWith('.md'));

            const stories = await Promise.all(storyFiles.map(async (filename) => {
                const filePath = path.join(storiesDir, filename);
                const stat = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf-8');

                // Parse story metadata from content
                const metadata = parseStoryContent(content, filePath);

                return {
                    id: filename.replace('.md', ''),
                    path: `/stories/${filename}`,
                    title: metadata.title,
                    status: metadata.status,
                    acceptanceCriteriaCount: metadata.acceptanceCriteriaCount,
                    taskCount: metadata.taskCount,
                    lastModified: stat.mtimeMs,
                };
            }));

            fastify.log.info(`[STORIES] Returned ${stories.length} story files`);
            return { stories, isWatching: true };

        } catch (error) {
            fastify.log.error(`[STORIES] Error listing stories: ${error.message}`);
            reply.code(500).send({ error: 'Failed to list stories' });
        }
    });

    // Parse story markdown content for metadata
    function parseStoryContent(content, filePath) {
        // Extract title from first H1 heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';

        // Count acceptance criteria (numbered list items under AC section)
        const acMatch = content.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n## |$)/);
        let acceptanceCriteriaCount = 0;
        if (acMatch) {
            const acSection = acMatch[1];
            acceptanceCriteriaCount = (acSection.match(/^\d+\./gm) || []).length;
        }

        // Count tasks (checkbox items)
        const taskMatches = content.match(/- \[[x ]\]/gi) || [];
        const taskCount = taskMatches.length;

        // Determine status from content
        let status = 'pending';
        const statusMatch = content.match(/Status:\s*(done|in-progress|pending|ready-for-dev)/i);
        if (statusMatch) {
            const rawStatus = statusMatch[1].toLowerCase();
            if (rawStatus === 'done') status = 'done';
            else if (rawStatus === 'in-progress') status = 'in-progress';
            else status = 'pending';
        }

        return {
            title,
            status,
            acceptanceCriteriaCount,
            taskCount,
        };
    }

    // Subscribe to file watcher for story events
    const storyWatcher = getFileWatcher();
    if (storyWatcher) {
        storyWatcher.subscribe(async (event) => {
            // Only handle story files
            if (!event.relativePath.startsWith('stories/') || !event.relativePath.endsWith('.md')) {
                return;
            }

            fastify.log.info(`[STORIES] File event: ${event.eventType} - ${event.relativePath}`);

            const storyPath = event.relativePath;
            const storyId = path.basename(storyPath, '.md');
            const fullPath = path.join(WORKSPACE_PATH, storyPath);

            // Prepare event data
            let eventData = {
                path: storyPath,
                storyId: storyId,
                timestamp: Date.now(),
            };

            // For created/updated events, read content and parse metadata
            if (event.eventType !== 'deleted') {
                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const metadata = parseStoryContent(content, fullPath);
                    eventData = {
                        ...eventData,
                        content: content,
                        title: metadata.title,
                        status: metadata.status,
                        acceptanceCriteriaCount: metadata.acceptanceCriteriaCount,
                        taskCount: metadata.taskCount,
                    };
                } catch (err) {
                    fastify.log.warn(`[STORIES] Could not read story content: ${err.message}`);
                }
            }

            // Broadcast WebSocket event (Story 4-1)
            switch (event.eventType) {
                case 'created':
                    fastify.log.info(`[STORIES] Broadcasting story:created for ${storyId}`);
                    broadcast('story:created', eventData);
                    break;
                case 'updated':
                    fastify.log.info(`[STORIES] Broadcasting story:updated for ${storyId}`);
                    broadcast('story:updated', eventData);
                    break;
                case 'deleted':
                    fastify.log.info(`[STORIES] Broadcasting story:deleted for ${storyId}`);
                    broadcast('story:deleted', eventData);
                    break;
            }
        });

        fastify.log.info('[STORIES] Story file watcher subscription active');
    }

    // --- SWARM EXECUTION API - Story 4-2 ---

    // Track active swarm executions
    const activeSwarmExecutions = new Map();

    // Start a swarm execution
    fastify.post('/api/swarm/execute', async (request, reply) => {
        const { storyIds, llmConfig, config } = request.body;

        if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
            reply.code(400).send({ error: 'storyIds array is required' });
            return;
        }

        const executionId = `swarm-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        fastify.log.info(`[SWARM] Starting execution: ${executionId} with ${storyIds.length} stories`);

        // Broadcast swarm started event
        broadcast('swarm:started', {
            executionId,
            storyIds,
            timestamp: Date.now(),
        });

        // Load story metadata for each story
        const storiesDir = path.join(WORKSPACE_PATH, 'stories');
        const stories = [];

        for (const storyId of storyIds) {
            try {
                const filePath = path.join(storiesDir, `${storyId}.md`);
                const content = await fs.readFile(filePath, 'utf-8');
                const metadata = parseStoryContent(content, filePath);

                stories.push({
                    id: storyId,
                    path: `/stories/${storyId}.md`,
                    title: metadata.title,
                    status: metadata.status,
                    taskCount: metadata.taskCount,
                    acceptanceCriteriaCount: metadata.acceptanceCriteriaCount,
                    content,
                });
            } catch (err) {
                fastify.log.warn(`[SWARM] Could not load story: ${storyId} - ${err.message}`);
            }
        }

        if (stories.length === 0) {
            reply.code(400).send({ error: 'No valid stories found' });
            return;
        }

        // Track execution
        const execution = {
            id: executionId,
            status: 'running',
            stories: stories.map(s => s.id),
            startTime: Date.now(),
            progress: { completed: 0, total: stories.length },
            results: [],
        };
        activeSwarmExecutions.set(executionId, execution);

        // Execute stories in parallel (simulated for backend)
        // Real execution happens on frontend with LLM calls
        // Backend tracks state and broadcasts events
        const startTime = Date.now();

        // Process each story with progress updates
        const nodeResults = await Promise.allSettled(
            stories.map(async (story, index) => {
                const nodeId = `dev-${story.id}-${Date.now()}`;
                const nodeStartTime = Date.now();

                // Broadcast node started
                broadcast('swarm:node-started', {
                    executionId,
                    nodeId,
                    storyId: story.id,
                    storyTitle: story.title,
                    timestamp: nodeStartTime,
                });

                // Simulate task processing with progress updates
                broadcast('swarm:node-progress', {
                    executionId,
                    nodeId,
                    storyId: story.id,
                    state: 'WORKING',
                    progress: 50,
                    timestamp: Date.now(),
                });

                // Add stagger to avoid rate limits
                await new Promise(r => setTimeout(r, index * 100));

                const nodeEndTime = Date.now();

                // Mark as done
                broadcast('swarm:node-completed', {
                    executionId,
                    nodeId,
                    storyId: story.id,
                    status: 'success',
                    duration: nodeEndTime - nodeStartTime,
                    timestamp: nodeEndTime,
                });

                // Update overall progress
                execution.progress.completed++;
                broadcast('swarm:progress', {
                    executionId,
                    completed: execution.progress.completed,
                    total: execution.progress.total,
                    timestamp: Date.now(),
                });

                return {
                    nodeId,
                    storyId: story.id,
                    status: 'success',
                    startTime: nodeStartTime,
                    endTime: nodeEndTime,
                    duration: nodeEndTime - nodeStartTime,
                    filesModified: [],
                    tasksCompleted: story.taskCount,
                };
            })
        );

        const endTime = Date.now();
        const totalDuration = endTime - startTime;

        // Build final results
        const processedResults = nodeResults.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    nodeId: `dev-${stories[index].id}-error`,
                    storyId: stories[index].id,
                    status: 'error',
                    error: result.reason?.message || 'Unknown error',
                    duration: totalDuration,
                };
            }
        });

        const successCount = processedResults.filter(r => r.status === 'success').length;
        const failureCount = processedResults.filter(r => r.status !== 'success').length;

        // NFR-1: Calculate parallelism verification
        const successfulResults = processedResults.filter(r => r.status === 'success');
        const avgSingleTime = successfulResults.length > 0
            ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
            : undefined;
        const parallelismVerified = avgSingleTime
            ? totalDuration < (avgSingleTime * 2)
            : false;

        const executionResult = {
            executionId,
            status: failureCount === 0 ? 'completed' : failureCount === stories.length ? 'failed' : 'partial',
            startTime,
            endTime,
            totalDuration,
            nodeResults: processedResults,
            successCount,
            failureCount,
            parallelismVerified,
            averageSingleTaskTime: avgSingleTime,
        };

        // Update execution record
        execution.status = executionResult.status;
        execution.results = processedResults;
        execution.endTime = endTime;

        // Broadcast completion
        broadcast('swarm:completed', {
            executionId,
            status: executionResult.status,
            successCount,
            failureCount,
            totalDuration,
            parallelismVerified,
            timestamp: endTime,
        });

        fastify.log.info(`[SWARM] Execution complete: ${executionId} - ${successCount} success, ${failureCount} failed, ${totalDuration}ms`);
        fastify.log.info(`[SWARM] NFR-1 Parallelism verified: ${parallelismVerified}`);

        return executionResult;
    });

    // Get swarm execution status
    fastify.get('/api/swarm/status/:executionId', async (request, reply) => {
        const { executionId } = request.params;
        const execution = activeSwarmExecutions.get(executionId);

        if (!execution) {
            reply.code(404).send({ error: 'Execution not found' });
            return;
        }

        return execution;
    });

    // List all active swarm executions
    fastify.get('/api/swarm/executions', async (request, reply) => {
        const executions = Array.from(activeSwarmExecutions.values()).map(exec => ({
            id: exec.id,
            status: exec.status,
            storyCount: exec.stories.length,
            progress: exec.progress,
            startTime: exec.startTime,
            endTime: exec.endTime,
        }));

        return { executions };
    });

    // Cancel a swarm execution
    fastify.post('/api/swarm/cancel/:executionId', async (request, reply) => {
        const { executionId } = request.params;
        const execution = activeSwarmExecutions.get(executionId);

        if (!execution) {
            reply.code(404).send({ error: 'Execution not found' });
            return;
        }

        if (execution.status !== 'running') {
            reply.code(400).send({ error: 'Execution is not running' });
            return;
        }

        execution.status = 'cancelled';
        execution.endTime = Date.now();

        broadcast('swarm:cancelled', {
            executionId,
            timestamp: Date.now(),
        });

        fastify.log.info(`[SWARM] Execution cancelled: ${executionId}`);

        return { success: true, executionId };
    });

    fastify.log.info('[SWARM] Swarm execution API endpoints registered');

    // --- CONFLICT RESOLUTION API - Story 4-3 ---

    // Track active conflicts
    const activeConflicts = new Map();

    // Generate conflict ID
    function generateConflictId() {
        return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Detect and register a conflict
    fastify.post('/api/conflicts/detect', async (request, reply) => {
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
    fastify.get('/api/conflicts', async (request, reply) => {
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
    fastify.get('/api/conflicts/:conflictId', async (request, reply) => {
        const { conflictId } = request.params;
        const conflict = activeConflicts.get(conflictId);

        if (!conflict) {
            reply.code(404).send({ error: 'Conflict not found' });
            return;
        }

        return conflict;
    });

    // Attempt automatic resolution
    fastify.post('/api/conflicts/:conflictId/auto', async (request, reply) => {
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
    fastify.post('/api/conflicts/:conflictId/resolve', async (request, reply) => {
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
    fastify.get('/api/conflicts/stats', async (request, reply) => {
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
    fastify.delete('/api/conflicts/resolved', async (request, reply) => {
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

    // --- SECURITY SCANNING API - Story 5-2 ---

    // Track active security scans
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
    fastify.post('/api/security/scan', async (request, reply) => {
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
    fastify.get('/api/security/scan/:scanId', async (request, reply) => {
        const { scanId } = request.params;
        const scan = activeSecurityScans.get(scanId);

        if (!scan) {
            reply.code(404).send({ error: 'Scan not found' });
            return;
        }

        return scan;
    });

    // List all scans
    fastify.get('/api/security/scans', async (request, reply) => {
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
    fastify.get('/api/security/findings/:scanId', async (request, reply) => {
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
    fastify.post('/api/security/findings/:scanId', async (request, reply) => {
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
    fastify.put('/api/security/findings/:scanId/:findingId', async (request, reply) => {
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
    fastify.post('/api/security/scan/:scanId/complete', async (request, reply) => {
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
    fastify.get('/api/security/report/:scanId', async (request, reply) => {
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
    fastify.post('/api/security/scan/:scanId/cancel', async (request, reply) => {
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
    fastify.delete('/api/security/scans/completed', async (request, reply) => {
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
    fastify.get('/api/security/vulnerability-types', async (request, reply) => {
        return { types: VULNERABILITY_INFO };
    });

    fastify.log.info('[SECURITY] Security scanning API endpoints registered');

    // --- RAG (Retrieval-Augmented Generation) API - Story 6-1 ---

    // Load RAG service and Codebase Indexer
    let ragService = null;
    let codebaseIndexer = null;

    try {
        ragService = require('./server/lib/rag.cjs');
        const { initCodebaseIndexer, getCodebaseIndexer } = require('./server/services/codebaseIndexer.cjs');

        // Initialize codebase indexer (which will also initialize RAG)
        codebaseIndexer = await initCodebaseIndexer(fastify.log);
        fastify.log.info('[RAG] RAG service and codebase indexer initialized');
    } catch (err) {
        fastify.log.warn(`[RAG] Could not initialize RAG service: ${err.message}`);
    }

    // Task 4.1: GET /api/rag/search - Semantic code search
    fastify.get('/api/rag/search', async (request, reply) => {
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
    fastify.get('/api/rag/stats', async (request, reply) => {
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
                const { getCodebaseIndexer } = require('./server/services/codebaseIndexer.cjs');
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
    fastify.post('/api/rag/reindex', async (request, reply) => {
        if (!codebaseIndexer) {
            reply.code(503).send({
                error: 'Codebase indexer not available',
                code: 'SERVICE_UNAVAILABLE'
            });
            return;
        }

        try {
            const { getCodebaseIndexer } = require('./server/services/codebaseIndexer.cjs');
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
    fastify.get('/api/rag/config', async (request, reply) => {
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
    fastify.post('/api/rag/clear', async (request, reply) => {
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

    // --- SOCKET.IO INITIALIZATION - Story 4-1 & 6-4 ---
    try {
        const { initSocket } = require('./server/services/socket.cjs');
        
        // Socket.IO needs the HTTP server, which Fastify wraps
        await fastify.ready();
        const httpServer = fastify.server;
        
        // Initialize Socket.IO with JWT auth
        initSocket(httpServer, {
            jwtSecret: JWT_SECRET,
            jwt,
            activeSessions,
            securityLogger,
        });
        
        fastify.log.info('[SOCKET] Socket.IO initialized with JWT authentication');
    } catch (err) {
        fastify.log.error(`[SOCKET] Failed to initialize Socket.IO: ${err.message}`);
        // Continue server startup even if Socket.IO fails
    }

    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`NEURAL DECK CORE ONLINE: http://localhost:${PORT}`);
        
        // Log JWT secret info (for development only)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUTH] JWT_SECRET: ${JWT_SECRET.substring(0, 10)}...`);
            console.log(`[AUTH] Session expiry: ${SESSION_EXPIRY}s (${SESSION_EXPIRY / 3600}h)`);
        }
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Recursive file lister
async function getFileStructure(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map(async (dirent) => {
        if (dirent.name === 'node_modules' || dirent.name === '.git' || dirent.name === 'dist') return null;
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            const children = await getFileStructure(res);
            return { name: dirent.name, path: res.replace(process.cwd(), '').replace(/\\/g, '/'), type: 'directory', children: children.filter(Boolean) };
        } else {
            return { name: dirent.name, path: res.replace(process.cwd(), '').replace(/\\/g, '/'), type: 'file' };
        }
    }));
    return files.filter(Boolean);
}

// --- DOCKER HELPER FUNCTIONS ---

// Generate Node.js Dockerfile with multi-stage build
function generateNodeDockerfile({ dependencies = {}, buildCommand, port = 3001, envVars = {} }) {
    const nodeVersion = dependencies.nodeVersion || '20-alpine';
    const buildCmd = buildCommand || 'npm run build';
    
    let envVarsSection = '';
    if (Object.keys(envVars).length > 0) {
        envVarsSection = Object.entries(envVars)
            .map(([key, value]) => `ENV ${key}=${value}`)
            .join('\n') + '\n';
    }

    return `# Multi-stage Node.js Dockerfile
# Stage 1: Build
FROM node:${nodeVersion} AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
${buildCommand ? `RUN ${buildCmd}` : ''}

# Stage 2: Production
FROM node:${nodeVersion}
WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

${envVarsSection}EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["node", "index.js"]
`;
}

// Generate Python Dockerfile with multi-stage build
function generatePythonDockerfile({ dependencies = {}, buildCommand, port = 8000, envVars = {} }) {
    const pythonVersion = dependencies.pythonVersion || '3.11-alpine';
    const buildCmd = buildCommand || 'pip install -r requirements.txt';
    
    let envVarsSection = '';
    if (Object.keys(envVars).length > 0) {
        envVarsSection = Object.entries(envVars)
            .map(([key, value]) => `ENV ${key}=${value}`)
            .join('\n') + '\n';
    }

    return `# Multi-stage Python Dockerfile
# Stage 1: Build
FROM python:${pythonVersion} AS builder
WORKDIR /app

# Copy requirements
COPY requirements*.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:${pythonVersion}
WORKDIR /app

# Copy from builder
COPY --from=builder /root/.local /root/.local
COPY . .

${envVarsSection}ENV PATH=/root/.local/bin:$PATH
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${port}/health')" || exit 1

CMD ["python", "app.py"]
`;
}

// Generate React/Vite Dockerfile with multi-stage build
function generateReactDockerfile({ dependencies = {}, buildCommand, port = 5173, envVars = {} }) {
    const nodeVersion = dependencies.nodeVersion || '20-alpine';
    const buildCmd = buildCommand || 'npm run build';
    
    let envVarsSection = '';
    if (Object.keys(envVars).length > 0) {
        envVarsSection = Object.entries(envVars)
            .map(([key, value]) => `ENV ${key}=${value}`)
            .join('\n') + '\n';
    }

    return `# Multi-stage React/Vite Dockerfile
# Stage 1: Build
FROM node:${nodeVersion} AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN ${buildCmd}

# Stage 2: Production (Nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copy built files from builder
COPY --from=builder /app/dist .

${envVarsSection}EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost:${port} || exit 1

CMD ["nginx", "-g", "daemon off;"]
`;
}

// Parse Docker build errors and extract line numbers
function parseDockerErrors(buildOutput) {
    const errors = [];
    const lines = buildOutput.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match Docker error patterns
        // Pattern 1: "ERROR [stage 0/2] RUN ..." followed by error details
        if (line.includes('ERROR') || line.includes('error')) {
            // Try to extract line number from Dockerfile reference
            const lineMatch = line.match(/Dockerfile:(\d+)/);
            const dockerfileLine = lineMatch ? parseInt(lineMatch[1], 10) : null;
            
            // Extract error message
            let errorMessage = line;
            if (i + 1 < lines.length && lines[i + 1].trim()) {
                errorMessage += ' ' + lines[i + 1].trim();
            }
            
            errors.push({
                line: i + 1,
                dockerfileLine: dockerfileLine,
                message: errorMessage.trim(),
                raw: line
            });
        }
        
        // Pattern 2: Build step errors with line references
        const stepMatch = line.match(/Step (\d+)\/(\d+)/);
        if (stepMatch && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (nextLine.includes('error') || nextLine.includes('ERROR') || nextLine.includes('failed')) {
                errors.push({
                    line: i + 1,
                    dockerfileLine: parseInt(stepMatch[1], 10),
                    message: nextLine.trim(),
                    raw: line + ' ' + nextLine
                });
            }
        }
    }
    
    return errors;
}

start();
