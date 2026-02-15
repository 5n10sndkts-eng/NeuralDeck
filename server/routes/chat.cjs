'use strict';

const { exec, spawn } = require('child_process');
const { initFileWatcher, getFileWatcher } = require('../services/fileWatcher.cjs');

// Docker helper functions
function generateNodeDockerfile({ dependencies = {}, buildCommand, port = 3001, envVars = {} }) {
    const nodeVersion = dependencies.nodeVersion || '20-alpine';
    const buildCmd = buildCommand || 'npm run build';
    let envVarsSection = '';
    if (Object.keys(envVars).length > 0) {
        envVarsSection = Object.entries(envVars).map(([key, value]) => `ENV ${key}=${value}`).join('\n') + '\n';
    }
    return `# Multi-stage Node.js Dockerfile
# Stage 1: Build
FROM node:${nodeVersion} AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
${buildCommand ? `RUN ${buildCmd}` : ''}

# Stage 2: Production
FROM node:${nodeVersion}
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
${envVarsSection}EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1
CMD ["node", "index.js"]
`;
}

function generatePythonDockerfile({ dependencies = {}, buildCommand, port = 8000, envVars = {} }) {
    const pythonVersion = dependencies.pythonVersion || '3.11-alpine';
    let envVarsSection = '';
    if (Object.keys(envVars).length > 0) {
        envVarsSection = Object.entries(envVars).map(([key, value]) => `ENV ${key}=${value}`).join('\n') + '\n';
    }
    return `# Multi-stage Python Dockerfile
# Stage 1: Build
FROM python:${pythonVersion} AS builder
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:${pythonVersion}
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
${envVarsSection}ENV PATH=/root/.local/bin:$PATH
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${port}/health')" || exit 1
CMD ["python", "app.py"]
`;
}

function generateReactDockerfile({ dependencies = {}, buildCommand, port = 5173, envVars = {} }) {
    const nodeVersion = dependencies.nodeVersion || '20-alpine';
    const buildCmd = buildCommand || 'npm run build';
    let envVarsSection = '';
    if (Object.keys(envVars).length > 0) {
        envVarsSection = Object.entries(envVars).map(([key, value]) => `ENV ${key}=${value}`).join('\n') + '\n';
    }
    return `# Multi-stage React/Vite Dockerfile
# Stage 1: Build
FROM node:${nodeVersion} AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN ${buildCmd}

# Stage 2: Production (Nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .
${envVarsSection}EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost:${port} || exit 1
CMD ["nginx", "-g", "daemon off;"]
`;
}

function parseDockerErrors(buildOutput) {
    const errors = [];
    const lines = buildOutput.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('ERROR') || line.includes('error')) {
            const lineMatch = line.match(/Dockerfile:(\d+)/);
            const dockerfileLine = lineMatch ? parseInt(lineMatch[1], 10) : null;
            let errorMessage = line;
            if (i + 1 < lines.length && lines[i + 1].trim()) {
                errorMessage += ' ' + lines[i + 1].trim();
            }
            errors.push({ line: i + 1, dockerfileLine, message: errorMessage.trim(), raw: line });
        }
        const stepMatch = line.match(/Step (\d+)\/(\d+)/);
        if (stepMatch && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (nextLine.includes('error') || nextLine.includes('ERROR') || nextLine.includes('failed')) {
                errors.push({ line: i + 1, dockerfileLine: parseInt(stepMatch[1], 10), message: nextLine.trim(), raw: line + ' ' + nextLine });
            }
        }
    }
    return errors;
}

async function chatRoutes(fastify, opts) {
    const {
        verifyToken, fs, path, safePath, broadcast, securityLogger, encryption,
        WORKSPACE_PATH, EXEC_OPTIONS, COMMAND_TIMEOUT,
        ALLOWED_COMMANDS, isAllowedBaseUrl, validateCommand, validateCommandPaths,
        runCommand, runCommandArgs, parseCommandArgs, GEMINI_OPENAI_BASE_URL, hiveMemory
    } = opts;

    const CLI_PROVIDER_COMMANDS = {
        'cli': null,
        'claude-cli': ['claude'],
        'gemini-cli': ['gemini'],
        'codex-cli': ['codex'],
        'ollama-cli': ['ollama'],
        'copilot-cli': ['gh'],
        'cursor-cli': ['cursor']
    };

    // Unified LLM Gateway
    fastify.post('/api/chat', { preHandler: verifyToken }, async (request, reply) => {
        const { messages, config } = request.body;
        const { provider, baseUrl, apiKey, model, temperature, cliCommand } = config || {};

        // --- CLI PROVIDER HANDLING ---
        const cliProviders = ['cli', 'claude-cli', 'gemini-cli', 'codex-cli', 'ollama-cli', 'copilot-cli', 'cursor-cli'];
        if (cliProviders.includes(provider)) {
            fastify.log.info(`[GATEWAY] CLI Provider: ${provider}`);

            if (!cliCommand) {
                reply.code(400).send({ error: 'CLI command template required for CLI providers' });
                return;
            }
            if (typeof cliCommand !== 'string') {
                reply.code(400).send({ error: 'CLI command template must be a string' });
                return;
            }

            const prompt = messages
                .filter(m => m.role !== 'system')
                .map(m => m.content)
                .join('\n');

            const cmdBase = cliCommand.trim().split(/\s+/)[0];
            const allowedBases = CLI_PROVIDER_COMMANDS[provider];

            if (allowedBases && !allowedBases.includes(cmdBase)) {
                fastify.log.warn(`[GATEWAY] CLI command base '${cmdBase}' not allowed for provider ${provider}`);
                reply.code(400).send({ error: `Command '${cmdBase}' not allowed for ${provider}. Expected: ${allowedBases.join(', ')}` });
                return;
            }

            if (provider === 'cli' && !ALLOWED_COMMANDS.includes(cmdBase)) {
                fastify.log.warn(`[GATEWAY] CLI command base '${cmdBase}' not in whitelist`);
                reply.code(400).send({ error: `Command '${cmdBase}' is not in the allowed commands whitelist` });
                return;
            }

            let tokens;
            try {
                tokens = parseCommandArgs(cliCommand);
            } catch (err) {
                reply.code(400).send({ error: err.message });
                return;
            }

            if (!tokens.length) {
                reply.code(400).send({ error: 'CLI command template is empty' });
                return;
            }

            let replaced = false;
            const resolvedTokens = tokens.map(token => {
                if (token.includes('{{prompt}}')) {
                    replaced = true;
                    return token.replace('{{prompt}}', prompt);
                }
                return token;
            });

            if (!replaced) {
                reply.code(400).send({ error: 'CLI command template must include {{prompt}}' });
                return;
            }

            const [finalCmd, ...finalArgs] = resolvedTokens;

            fastify.log.info(`[GATEWAY] Executing CLI: ${finalCmd} ...`);

            const startTime = Date.now();
            const result = await runCommandArgs(finalCmd, finalArgs, EXEC_OPTIONS, 120000);
            const duration = Date.now() - startTime;

            if (result.error || result.exitCode !== 0 || result.timedOut) {
                const message = result.timedOut
                    ? 'CLI Error: Command timed out'
                    : `CLI Error: ${result.stderr || result.error?.message || 'Unknown error'}`;
                fastify.log.error(`[GATEWAY] CLI error: ${message}`);
                return {
                    choices: [{ message: { role: 'assistant', content: message } }],
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                    model: provider,
                    cli_duration: duration
                };
            }

            fastify.log.info(`[GATEWAY] CLI success in ${duration}ms`);
            return {
                choices: [{ message: { role: 'assistant', content: result.stdout.trim() } }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                model: provider,
                cli_duration: duration
            };
        }

        // --- HTTP API PROVIDER HANDLING ---
        let targetUrl;
        if (baseUrl) {
            if (!isAllowedBaseUrl(baseUrl)) {
                fastify.log.warn(`[GATEWAY] Base URL blocked by allowlist: ${baseUrl}`);
                reply.code(400).send({ error: 'Base URL not allowed' });
                return;
            }
            targetUrl = baseUrl.replace(/\/+$/, '');
            if (!/\/openai(\/|$)/i.test(targetUrl) && !targetUrl.endsWith('/v1')) {
                targetUrl += '/v1';
            }
        } else if (provider === 'gemini') {
            targetUrl = GEMINI_OPENAI_BASE_URL;
        } else if (provider === 'openai') {
            targetUrl = 'https://api.openai.com/v1';
        } else if (provider === 'lmstudio') {
            targetUrl = process.env.LMSTUDIO_URL || 'http://localhost:1234/v1';
        } else {
            targetUrl = 'http://localhost:8000/v1';
        }

        const targetKey = apiKey
            || (provider === 'gemini' ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) : null)
            || process.env.OPENAI_API_KEY
            || 'lm-studio';
        const targetModel = (model || 'openai/gpt-oss-20b').trim();

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
    fastify.post('/api/mcp/call', { preHandler: verifyToken }, async (request, reply) => {
        const { tool, args } = request.body;
        const clientIp = request.ip;

        if (tool === 'shell_exec' || tool === 'run_command') {
            const cmd = args?.command || args;

            const cmdValidation = validateCommand(cmd, clientIp);
            if (!cmdValidation.valid) {
                fastify.log.warn(`[SECURITY] Command rejected: ${cmd} from ${clientIp} - ${cmdValidation.reason}`);
                return { result: `Error: ${cmdValidation.reason}` };
            }

            const pathValidation = validateCommandPaths(cmd, clientIp);
            if (!pathValidation.valid) {
                fastify.log.warn(`[SECURITY] Path traversal blocked: ${cmd} from ${clientIp} - ${pathValidation.reason}`);
                return { result: `Error: ${pathValidation.reason}` };
            }

            const startTime = Date.now();
            fastify.log.info(`[COMMAND] Executing: ${cmd} from ${clientIp}`);

            const result = await runCommand(cmd, EXEC_OPTIONS, COMMAND_TIMEOUT);
            const executionTime = Date.now() - startTime;
            const exitCode = typeof result.exitCode === 'number' ? result.exitCode : 1;

            if (exitCode === 0 && !result.timedOut) {
                fastify.log.info(`[COMMAND] Success: ${cmd} from ${clientIp} - exit:${exitCode} time:${executionTime}ms`);
            } else {
                fastify.log.warn(`[COMMAND] Failed: ${cmd} from ${clientIp} - exit:${exitCode} time:${executionTime}ms error:${result.error?.message || 'unknown'}`);
            }

            return {
                result: JSON.stringify({
                    stdout: result.stdout || '',
                    stderr: result.stderr || '',
                    exitCode: exitCode,
                    executionTime: executionTime,
                    timedOut: !!result.timedOut
                })
            };
        }

        // Git Log Tool - Story 1.2: Validated
        if (tool === 'git_log') {
            const count = typeof args?.count === 'number' ? Math.min(Math.max(1, args.count), 100) : 10;
            const skip = typeof args?.skip === 'number' ? Math.max(0, args.skip) : 0;
            const gitArgs = ['log', `--pretty=format:%h|||%an|||%ad|||%s`, '--date=short', '-n', String(count), '--skip', String(skip)];

            fastify.log.info(`[COMMAND] Executing git_log: count=${count} skip=${skip} from ${clientIp}`);

            return new Promise((resolve) => {
                const child = spawn('git', gitArgs, { ...EXEC_OPTIONS, shell: false });
                let stdout = '';
                let stderr = '';
                child.stdout.on('data', (data) => { stdout += data; });
                child.stderr.on('data', (data) => { stderr += data; });
                child.on('error', (error) => {
                    fastify.log.warn(`[COMMAND] git_log failed from ${clientIp}: ${error.message}`);
                    resolve({ result: "[]" });
                });
                child.on('close', (code) => {
                    if (code !== 0) {
                        fastify.log.warn(`[COMMAND] git_log exited with code ${code} from ${clientIp}`);
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
    const DOCKER_BUILD_TIMEOUT = 10 * 60 * 1000;

    const sanitizeImageName = (name) => {
        if (!name) return `docker-test-${Date.now()}`;
        const sanitized = name.replace(/[^a-zA-Z0-9._/-]/g, '');
        if (sanitized.length > 200) throw new Error('Invalid image name: too long (max 200 characters)');
        if (sanitized.length === 0) throw new Error('Invalid image name: empty after sanitization');
        return sanitized;
    };

    fastify.post('/api/docker/generate', { preHandler: verifyToken }, async (request, reply) => {
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

            let finalPath;
            if (outputPath) {
                finalPath = safePath(outputPath);
            } else {
                finalPath = path.join(WORKSPACE_PATH, 'Dockerfile');
            }

            await fs.writeFile(finalPath, dockerfileContent, 'utf-8');
            fastify.log.info(`[DOCKER] Dockerfile written to: ${finalPath}`);

            return { success: true, dockerfilePath: finalPath, content: dockerfileContent };
        } catch (error) {
            fastify.log.error(`[DOCKER] Generation error: ${error.message}`);
            if (error.message.includes('Path traversal')) {
                reply.code(400).send({ error: error.message });
            } else {
                reply.code(500).send({ error: `Failed to generate Dockerfile: ${error.message}` });
            }
        }
    });

    fastify.post('/api/docker/validate', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { dockerfilePath, imageName, cleanup = true } = request.body;

            if (!dockerfilePath) {
                reply.code(400).send({ error: 'dockerfilePath is required' });
                return;
            }

            const safeDockerfilePath = safePath(dockerfilePath);

            try {
                await fs.access(safeDockerfilePath);
            } catch (error) {
                reply.code(404).send({ error: `Dockerfile not found: ${dockerfilePath}` });
                return;
            }

            let sanitizedImageName;
            try {
                sanitizedImageName = sanitizeImageName(imageName || `docker-test-${Date.now()}`);
            } catch (error) {
                reply.code(400).send({ error: error.message });
                return;
            }

            const imageTag = `${sanitizedImageName}:latest`;
            fastify.log.info(`[DOCKER] Validating Dockerfile: ${safeDockerfilePath}, image: ${imageTag}`);

            const buildDir = path.dirname(safeDockerfilePath);
            const dockerfileName = path.basename(safeDockerfilePath);
            const buildCommand = `docker build -t ${imageTag} -f ${dockerfileName} ${buildDir}`;

            const buildResult = await new Promise((resolve) => {
                let killed = false;
                const childProcess = exec(buildCommand, {
                    ...EXEC_OPTIONS,
                    cwd: buildDir,
                    timeout: DOCKER_BUILD_TIMEOUT
                }, (error, stdout, stderr) => {
                    if (killed) {
                        resolve({ error: new Error('Docker build timeout after 10 minutes'), stdout: stdout || '', stderr: stderr || '' });
                    } else {
                        resolve({ error, stdout: stdout || '', stderr: stderr || '' });
                    }
                });

                const timeout = setTimeout(() => {
                    if (childProcess && !childProcess.killed) {
                        killed = true;
                        childProcess.kill('SIGTERM');
                        fastify.log.warn(`[DOCKER] Build killed due to timeout: ${imageTag}`);
                    }
                }, DOCKER_BUILD_TIMEOUT + 5000);

                childProcess.on('exit', () => clearTimeout(timeout));
            });

            const buildSuccess = !buildResult.error;
            const buildOutput = buildResult.stdout + buildResult.stderr;

            fastify.log.info(`[DOCKER] Build ${buildSuccess ? 'succeeded' : 'failed'} for ${imageTag}`);

            let errors = [];
            if (!buildSuccess) {
                errors = parseDockerErrors(buildOutput);
                fastify.log.warn(`[DOCKER] Build errors: ${errors.length} issues found`);
            }

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
        fileWatcher.subscribe((event) => {
            fastify.log.info(`[FILE_CHANGE] ${event.eventType}: ${event.relativePath}`);
        });
        fastify.log.info('[STARTUP] File watcher service initialized');
    } catch (error) {
        fastify.log.error(`[STARTUP] File watcher failed to initialize: ${error.message}`);
    }

    // --- FILE LOCK API ENDPOINTS - Story 1.3 ---
    fastify.post('/api/files/lock', { preHandler: verifyToken }, async (request, reply) => {
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

    fastify.post('/api/files/unlock', { preHandler: verifyToken }, async (request, reply) => {
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

    fastify.get('/api/files/locks', { preHandler: verifyToken }, async (request, reply) => {
        const watcher = getFileWatcher();
        if (!watcher) {
            reply.code(503).send({ error: 'File watcher service not available' });
            return;
        }
        return { locks: watcher.getAllLocks() };
    });

    fastify.get('/api/files/lock/:filePath', { preHandler: verifyToken }, async (request, reply) => {
        const { filePath } = request.params;
        const watcher = getFileWatcher();
        if (!watcher) {
            reply.code(503).send({ error: 'File watcher service not available' });
            return;
        }
        const lock = watcher.getLock(decodeURIComponent(filePath));
        return { locked: !!lock, lock };
    });
}

module.exports = chatRoutes;
