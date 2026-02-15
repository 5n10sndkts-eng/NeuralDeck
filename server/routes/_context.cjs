/**
 * Shared context for route modules.
 * Provides access to services, helpers, and configuration
 * that route handlers need without circular dependencies.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Services
const securityLogger = require('../lib/securityLogger.cjs');
const encryption = require('../lib/encryption.cjs');
const { broadcast } = require('../services/socket.cjs');
const { getCheckpointService } = require('../services/checkpointService.cjs');
const reasoningService = require('../services/reasoningService.cjs');
const hiveMemory = require('../services/hiveMemory.cjs');
const { workspaceService, NEURALDECK_DIR } = require('../services/workspaceService.cjs');
const opencodeCLI = require('../services/opencodeCLI.cjs');
const providerAdapter = require('../services/providerAdapter.cjs');

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const IS_LOCAL_ONLY = HOST === '127.0.0.1' || HOST === 'localhost';
const WORKSPACE_PATH = process.cwd();

const ALLOW_INTERPRETERS = process.env.ALLOW_INTERPRETERS === 'true';
const ALLOWED_COMMANDS = [
    'ls', 'pwd', 'mkdir', 'touch', 'cat', 'grep', 'find', 'echo', 'head', 'tail', 'wc',
    'git',
    'ollama', 'codex', 'openai', 'claude', 'gemini',
    'tsc', 'vite', 'esbuild'
];
if (ALLOW_INTERPRETERS) {
    ALLOWED_COMMANDS.push('npm', 'node', 'npx', 'python', 'python3');
}

const DANGEROUS_PATTERNS = [
    /rm\s+(-[rf]+\s+)*[\/~]/,
    /rm\s+(-[rf]+\s+)*\*/,
    /rm\s+(-[rf]+\s+)*\.\./,
    /rm\s+(-[rf]+\s+)*\$/,
    /mkfs/, /dd\s+if=/, /format\s+[a-z]:?/i,
    /fdisk/, /parted/,
    /shutdown/, /reboot/, /halt/, /poweroff/,
    /init\s+[06]/,
    />\s*\/dev\/sd/,
    /chmod\s+777\s+\//,
    /chown\s+.*\s+\//,
    /curl.*\|\s*(ba)?sh/,
    /wget.*\|\s*(ba)?sh/,
    /eval\s*\(/,
    /exec\s*\(/,
];

const COMMAND_TIMEOUT = 30000;
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

const LLM_HOST_ALLOWLIST = process.env.LLM_HOST_ALLOWLIST
    ? process.env.LLM_HOST_ALLOWLIST.split(',').map(h => h.trim()).filter(Boolean)
    : ['localhost', '127.0.0.1', '::1', 'generativelanguage.googleapis.com'];
const LLM_ORIGIN_ALLOWLIST = process.env.LLM_ORIGIN_ALLOWLIST
    ? process.env.LLM_ORIGIN_ALLOWLIST.split(',').map(o => o.trim()).filter(Boolean)
    : [];

const GEMINI_OPENAI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';

// --- Helper functions ---

const isAllowedBaseUrl = (candidate) => {
    try {
        const parsed = new URL(candidate);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        const origin = `${parsed.protocol}//${parsed.host}`;
        if (LLM_ORIGIN_ALLOWLIST.includes(origin)) {
            return true;
        }
        return LLM_HOST_ALLOWLIST.includes(parsed.hostname);
    } catch {
        return false;
    }
};

const safePath = (inputPath, workspaceId = null) => {
    let basePath = WORKSPACE_PATH;
    if (workspaceId) {
        const workspace = workspaceService.getWorkspaceById(workspaceId);
        if (!workspace) {
            throw new Error("Invalid workspace ID");
        }
        basePath = workspace.path;
    }
    const resolved = path.resolve(basePath, inputPath.replace(/^\//, ''));
    if (!resolved.startsWith(basePath)) {
        throw new Error("Access Denied: Path traversal detected.");
    }
    if (resolved.startsWith(NEURALDECK_DIR) || resolved === NEURALDECK_DIR) {
        throw new Error("Access Denied: Cannot access NeuralDeck application files.");
    }
    return resolved;
};

const generateTimestampedFilename = (originalPath) => {
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    const timestamp = Date.now();
    return `${basename}_${timestamp}${ext}`;
};

const parseCommandArgs = (command) => {
    const args = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let escaped = false;

    for (let i = 0; i < command.length; i++) {
        const ch = command[i];
        if (escaped) { current += ch; escaped = false; continue; }
        if (ch === '\\' && !inSingle) { escaped = true; continue; }
        if (ch === '\'' && !inDouble) { inSingle = !inSingle; continue; }
        if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
        if (/\s/.test(ch) && !inSingle && !inDouble) {
            if (current.length > 0) { args.push(current); current = ''; }
            continue;
        }
        current += ch;
    }

    if (escaped || inSingle || inDouble) {
        throw new Error('Unterminated quote or escape in command');
    }
    if (current.length > 0) { args.push(current); }
    return args;
};

const extractPathsFromToken = (token) => {
    const candidates = [];
    if (token.startsWith('/')) candidates.push(token);
    if (token.startsWith('~/')) candidates.push(path.join(USER_HOME, token.slice(2)));
    const eqIndex = token.indexOf('=');
    if (eqIndex !== -1) {
        const value = token.slice(eqIndex + 1);
        if (value.startsWith('/')) candidates.push(value);
        else if (value.startsWith('~/')) candidates.push(path.join(USER_HOME, value.slice(2)));
    }
    return candidates;
};

const runCommand = (command, options, timeoutMs) => {
    return new Promise((resolve) => {
        let args;
        try { args = parseCommandArgs(command); }
        catch (err) { return resolve({ error: err }); }
        if (args.length === 0) return resolve({ error: new Error('Empty command') });

        const [cmd, ...cmdArgs] = args;
        const child = spawn(cmd, cmdArgs, { ...options, shell: false });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const maxStdout = 5000;
        const maxStderr = 1000;

        const timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
        child.stdout.on('data', (chunk) => { if (stdout.length < maxStdout) stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { if (stderr.length < maxStderr) stderr += chunk.toString(); });
        child.on('error', (error) => { clearTimeout(timeout); resolve({ error, stdout, stderr }); });
        child.on('close', (code) => {
            clearTimeout(timeout);
            resolve({
                stdout: stdout.length > maxStdout ? stdout.slice(0, maxStdout) + '\n... [truncated]' : stdout,
                stderr: stderr.length > maxStderr ? stderr.slice(0, maxStderr) + '\n... [truncated]' : stderr,
                exitCode: typeof code === 'number' ? code : 1,
                timedOut
            });
        });
    });
};

const runCommandArgs = (cmd, cmdArgs, options, timeoutMs) => {
    return new Promise((resolve) => {
        const child = spawn(cmd, cmdArgs, { ...options, shell: false });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const maxStdout = 5000;
        const maxStderr = 1000;

        const timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
        child.stdout.on('data', (chunk) => { if (stdout.length < maxStdout) stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { if (stderr.length < maxStderr) stderr += chunk.toString(); });
        child.on('error', (error) => { clearTimeout(timeout); resolve({ error, stdout, stderr }); });
        child.on('close', (code) => {
            clearTimeout(timeout);
            resolve({
                stdout: stdout.length > maxStdout ? stdout.slice(0, maxStdout) + '\n... [truncated]' : stdout,
                stderr: stderr.length > maxStderr ? stderr.slice(0, maxStderr) + '\n... [truncated]' : stderr,
                exitCode: typeof code === 'number' ? code : 1,
                timedOut
            });
        });
    });
};

const validateCommand = (cmd) => {
    if (typeof cmd !== 'string') return { valid: false, reason: 'Command must be a string' };
    if (/[;&|`$]/.test(cmd)) return { valid: false, reason: 'Command chaining or interpolation not allowed' };
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(cmd)) return { valid: false, reason: 'Command matches dangerous pattern' };
    }
    const baseCmd = cmd.trim().split(/\s+/)[0];
    if (!baseCmd) return { valid: false, reason: 'Command is empty' };
    if (!ALLOWED_COMMANDS.includes(baseCmd)) return { valid: false, reason: `Command '${baseCmd}' is not in whitelist` };
    return { valid: true };
};

const validateCommandPaths = (cmd) => {
    let tokens;
    try { tokens = parseCommandArgs(cmd); }
    catch (err) { return { valid: false, reason: err.message }; }

    for (const token of tokens) {
        if (token.includes('..') && (token.includes('/') || token.includes('\\')))
            return { valid: false, reason: `Path traversal blocked: ${token}` };
        if (token.startsWith('~/'))
            return { valid: false, reason: `Home paths not allowed: ${token}` };

        const candidates = extractPathsFromToken(token);
        for (const candidate of candidates) {
            if (candidate.includes('..'))
                return { valid: false, reason: `Path traversal blocked: ${candidate}` };
            try {
                const resolved = path.resolve(candidate);
                if (!resolved.startsWith(WORKSPACE_PATH))
                    return { valid: false, reason: `Path outside workspace: ${candidate}` };
                if (resolved.startsWith(NEURALDECK_DIR) || resolved === NEURALDECK_DIR)
                    return { valid: false, reason: `Access denied to app directory: ${candidate}` };
            } catch (e) {
                return { valid: false, reason: `Invalid path: ${candidate}` };
            }
        }
    }
    return { valid: true };
};

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

module.exports = {
    // Node builtins
    fs, path, spawn, crypto,
    // Services
    securityLogger, encryption, broadcast,
    getCheckpointService, reasoningService, hiveMemory,
    workspaceService, NEURALDECK_DIR, opencodeCLI, providerAdapter,
    // Config
    PORT, HOST, IS_LOCAL_ONLY, WORKSPACE_PATH,
    ALLOWED_COMMANDS, DANGEROUS_PATTERNS, COMMAND_TIMEOUT,
    USER_HOME, EXTENDED_PATH, EXEC_OPTIONS,
    LLM_HOST_ALLOWLIST, LLM_ORIGIN_ALLOWLIST, GEMINI_OPENAI_BASE_URL,
    // Helpers
    isAllowedBaseUrl, safePath, generateTimestampedFilename,
    parseCommandArgs, extractPathsFromToken,
    runCommand, runCommandArgs,
    validateCommand, validateCommandPaths,
    getFileStructure,
};
