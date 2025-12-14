
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

const PORT = process.env.PORT || 3001;
const WORKSPACE_PATH = process.cwd();

// --- ALLOWED COMMANDS WHITELIST ---
const ALLOWED_COMMANDS = ['ls', 'pwd', 'mkdir', 'touch', 'cat', 'grep', 'find', 'npm test', 'echo', 'git status', 'git diff', 'git log', 'git add', 'git commit', 'npm'];
const EXEC_OPTIONS = { cwd: WORKSPACE_PATH, maxBuffer: 1024 * 1024 * 10 }; // 10MB Buffer

// --- UTILS ---
const safePath = (inputPath) => {
    // Prevent traversal
    const resolved = path.resolve(WORKSPACE_PATH, inputPath.replace(/^\//, ''));
    if (!resolved.startsWith(WORKSPACE_PATH)) {
        throw new Error("Access Denied: Path traversal detected.");
    }
    return resolved;
};

// --- BOOTSTRAP ---
async function start() {
    
    // 1. Security Headers (Helmet)
    if (helmet) {
        await fastify.register(helmet, { contentSecurityPolicy: false }); // Disabled for Dev/Local flexibility
    }

    // 2. CORS
    if (cors) {
        await fastify.register(cors, { 
            origin: true, // Allow all for local dev, restrict in prod
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        });
    }

    // 3. Compression
    if (compress) {
        await fastify.register(compress);
    }

    // 4. Rate Limiting (DDoS Protection)
    if (rateLimit) {
        await fastify.register(rateLimit, {
            max: 1000,
            timeWindow: '1 minute',
            errorResponseBuilder: () => ({ error: "NEURAL OVERLOAD: Too many requests." })
        });
    }

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
    fastify.post('/api/read', async (request, reply) => {
        try {
            const { filePath } = request.body;
            const cleanPath = safePath(filePath);
            const content = await fs.readFile(cleanPath, 'utf-8');
            return { content };
        } catch (e) {
            reply.code(404).send({ error: `File not found or unreadable. ${e.message}` });
        }
    });

    // File System: Write
    fastify.post('/api/write', async (request, reply) => {
        try {
            const { filePath, content } = request.body;
            const cleanPath = safePath(filePath);
            await fs.mkdir(path.dirname(cleanPath), { recursive: true });
            await fs.writeFile(cleanPath, content, 'utf-8');
            fastify.log.info(`[FS] Wrote ${filePath}`);
            return { success: true };
        } catch (e) {
            reply.code(500).send({ error: e.message });
        }
    });

    // Unified LLM Gateway
    fastify.post('/api/chat', async (request, reply) => {
        const { messages, config } = request.body;
        const { provider, baseUrl, apiKey, model, temperature } = config || {};

        const targetUrl = baseUrl || (provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:8000/v1');
        const targetKey = apiKey || process.env.OPENAI_API_KEY || 'sk-placeholder';
        const targetModel = model || 'llama3';

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

    // Tool Execution (Safe Shell)
    fastify.post('/api/mcp/call', async (request, reply) => {
        const { tool, args } = request.body;

        if (tool === 'shell_exec' || tool === 'run_command') {
            const cmd = args.command || args;
            const baseCmd = cmd.split(' ')[0];

            if (/[;&|`$]/.test(cmd)) {
                return { result: "Error: Command chaining/interpolation prohibited by Safety Protocol." };
            }
            
            if (!ALLOWED_COMMANDS.includes(baseCmd) && !cmd.startsWith('npm')) {
                 return { result: `Error: Command '${baseCmd}' is restricted.` };
            }

            return new Promise((resolve) => {
                exec(cmd, EXEC_OPTIONS, (error, stdout, stderr) => {
                    resolve({ 
                        result: JSON.stringify({ 
                            stdout: stdout.substring(0, 5000), 
                            stderr: stderr.substring(0, 1000), 
                            exitCode: error ? error.code : 0 
                        }) 
                    });
                });
            });
        }
        
        // Git Log Tool
        if (tool === 'git_log') {
             const count = Math.min(args.count || 10, 100);
             const skip = args.skip || 0;
             const cmd = `git log --pretty=format:'%h|||%an|||%ad|||%s' --date=short -n ${count} --skip ${skip}`;
             
             return new Promise((resolve) => {
                exec(cmd, EXEC_OPTIONS, (error, stdout, stderr) => {
                    if (error) return resolve({ result: "[]" });
                    const lines = stdout.split('\n').filter(l => l.trim()).map(l => {
                        const [hash, author, date, message] = l.split('|||');
                        return { hash, author, date, message };
                    });
                    resolve({ result: JSON.stringify(lines) });
                });
             });
        }

        return { result: "Tool processed (No op / Not found)." };
    });

    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`NEURAL DECK CORE ONLINE: http://localhost:${PORT}`);
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

start();
