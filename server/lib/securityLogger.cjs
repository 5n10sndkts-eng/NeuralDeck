/**
 * Security Audit Logger - Story 6-4
 * Provides structured logging for security events with redaction
 */

const fs = require('fs').promises;
const path = require('path');

const LOG_DIR = path.join(process.cwd(), '.neuraldeck', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'security-audit.jsonl');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 30; // 30 days retention

// Ensure log directory exists
async function ensureLogDir() {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (err) {
        console.error('[SECURITY_LOG] Failed to create log directory:', err.message);
    }
}

// Redact sensitive data from logs
function redactSensitive(data) {
    const redacted = { ...data };
    
    // Redact API keys
    if (redacted.apiKey) {
        redacted.apiKey = '***REDACTED***';
    }
    if (redacted.key) {
        redacted.key = '***REDACTED***';
    }
    if (redacted.token) {
        redacted.token = redacted.token.substring(0, 10) + '...***';
    }
    if (redacted.password) {
        redacted.password = '***REDACTED***';
    }
    
    return redacted;
}

// Rotate log file if needed
async function rotateLogIfNeeded() {
    try {
        const stats = await fs.stat(LOG_FILE);
        if (stats.size >= MAX_LOG_SIZE) {
            const timestamp = Date.now();
            const archivePath = path.join(LOG_DIR, `security-audit.${timestamp}.jsonl`);
            await fs.rename(LOG_FILE, archivePath);
            
            // Clean up old logs
            const files = await fs.readdir(LOG_DIR);
            const logFiles = files
                .filter(f => f.startsWith('security-audit.') && f.endsWith('.jsonl'))
                .sort()
                .reverse();
            
            // Keep only MAX_LOG_FILES
            for (let i = MAX_LOG_FILES; i < logFiles.length; i++) {
                await fs.unlink(path.join(LOG_DIR, logFiles[i]));
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('[SECURITY_LOG] Rotation error:', err.message);
        }
    }
}

// Write log entry
async function writeLog(entry) {
    try {
        await ensureLogDir();
        await rotateLogIfNeeded();
        
        const logLine = JSON.stringify(entry) + '\n';
        await fs.appendFile(LOG_FILE, logLine, 'utf-8');
    } catch (err) {
        console.error('[SECURITY_LOG] Write error:', err.message);
    }
}

// Log file write operation
async function logFileWrite(filePath, agent, success, error = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'FILE_WRITE',
        filePath,
        agent: agent || 'unknown',
        success,
        error: error ? error.message : null,
    };
    
    await writeLog(entry);
}

// Log file read operation
async function logFileRead(filePath, agent, success, error = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'FILE_READ',
        filePath,
        agent: agent || 'unknown',
        success,
        error: error ? error.message : null,
    };
    
    await writeLog(entry);
}

// Log command execution
async function logCommandExec(command, args, exitCode, agent, success, error = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'COMMAND_EXEC',
        command,
        args: args || [],
        exitCode,
        agent: agent || 'unknown',
        success,
        error: error ? error.message : null,
    };
    
    await writeLog(redactSensitive(entry));
}

// Log authentication attempt
async function logAuthAttempt(userId, ip, success, reason = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'AUTH_ATTEMPT',
        userId: userId || 'anonymous',
        ip,
        success,
        reason,
    };
    
    await writeLog(entry);
}

// Log session creation
async function logSessionCreate(userId, sessionId, ip) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'SESSION_CREATE',
        userId: userId || 'anonymous',
        sessionId: sessionId.substring(0, 10) + '...',
        ip,
    };
    
    await writeLog(entry);
}

// Log session refresh
async function logSessionRefresh(userId, sessionId, ip) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'SESSION_REFRESH',
        userId: userId || 'anonymous',
        sessionId: sessionId.substring(0, 10) + '...',
        ip,
    };
    
    await writeLog(entry);
}

// Log session invalidation
async function logSessionInvalidate(userId, sessionId, reason) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'SESSION_INVALIDATE',
        userId: userId || 'anonymous',
        sessionId: sessionId ? sessionId.substring(0, 10) + '...' : 'unknown',
        reason,
    };
    
    await writeLog(entry);
}

// Log API key operation
async function logApiKeyOperation(operation, keyId, userId, ip) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: 'API_KEY_OPERATION',
        operation, // 'create', 'read', 'update', 'delete'
        keyId,
        userId: userId || 'anonymous',
        ip,
    };
    
    await writeLog(entry);
}

// Log security event
async function logSecurityEvent(eventType, details) {
    const entry = {
        timestamp: new Date().toISOString(),
        event: eventType,
        ...redactSensitive(details),
    };
    
    await writeLog(entry);
}

// Get recent logs (for admin viewing)
async function getRecentLogs(limit = 100) {
    try {
        const content = await fs.readFile(LOG_FILE, 'utf-8');
        const lines = content.trim().split('\n');
        const logs = lines
            .slice(-limit)
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
        
        return logs.reverse();
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

module.exports = {
    logFileWrite,
    logFileRead,
    logCommandExec,
    logAuthAttempt,
    logSessionCreate,
    logSessionRefresh,
    logSessionInvalidate,
    logApiKeyOperation,
    logSecurityEvent,
    getRecentLogs,
};
