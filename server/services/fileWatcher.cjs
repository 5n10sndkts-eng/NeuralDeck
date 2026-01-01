/**
 * File Watcher Service - Story 1.3
 * Shared file watching and file locking infrastructure
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const WORKSPACE_PATH = process.cwd();
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

/**
 * FileWatcherService - Singleton service for file watching and locking
 * Extends EventEmitter for pub/sub pattern
 */
class FileWatcherService extends EventEmitter {
    constructor() {
        super();
        this.watcher = null;
        this.subscribers = new Set();
        this.fileLocks = new Map(); // Map<filePath, { agentId, timestamp, timeout }>
        this.isInitialized = false;
        this.logger = console; // Will be replaced with Fastify logger
    }

    /**
     * Initialize the file watcher
     * @param {object} logger - Fastify logger instance
     */
    init(logger) {
        if (this.isInitialized) {
            this.logger.warn('[FILE_WATCHER] Already initialized');
            return this;
        }

        this.logger = logger || console;
        this.logger.info('[FILE_WATCHER] Initializing file watcher service...');

        try {
            // Watch workspace directory recursively
            this.watcher = fs.watch(WORKSPACE_PATH, { recursive: true }, (eventType, filename) => {
                if (!filename) return;

                // Ignore node_modules, .git, dist directories
                if (filename.includes('node_modules') ||
                    filename.includes('.git') ||
                    filename.includes('dist')) {
                    return;
                }

                const filePath = path.join(WORKSPACE_PATH, filename);
                const relativePath = filename;

                // Determine event type
                let type = 'update';
                if (eventType === 'rename') {
                    // Check if file exists to determine create vs delete
                    try {
                        fs.accessSync(filePath);
                        type = 'create';
                    } catch {
                        type = 'delete';
                    }
                }

                const event = {
                    filePath,
                    relativePath,
                    eventType: type,
                    timestamp: Date.now()
                };

                this.logger.info(`[FILE_WATCHER] ${type}: ${relativePath}`);
                this.emit('fileChange', event);
                this.notifySubscribers(event);
            });

            this.watcher.on('error', (error) => {
                this.logger.error(`[FILE_WATCHER] Watcher error: ${error.message}`);
                this.emit('error', error);
            });

            // Start periodic lock cleanup
            this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), CLEANUP_INTERVAL);

            this.isInitialized = true;
            this.logger.info('[FILE_WATCHER] File watcher service initialized successfully');

        } catch (error) {
            this.logger.error(`[FILE_WATCHER] Failed to initialize: ${error.message}`);
            throw error;
        }

        return this;
    }

    /**
     * Subscribe to file change events
     * @param {function} callback - Function to call on file changes
     * @returns {function} Unsubscribe function
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        this.subscribers.add(callback);
        this.logger.info(`[FILE_WATCHER] Subscriber added. Total: ${this.subscribers.size}`);

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
            this.logger.info(`[FILE_WATCHER] Subscriber removed. Total: ${this.subscribers.size}`);
        };
    }

    /**
     * Notify all subscribers of a file change event
     * @param {object} event - File change event
     */
    notifySubscribers(event) {
        for (const callback of this.subscribers) {
            try {
                callback(event);
            } catch (error) {
                // Continue notifying other subscribers even if one fails
                this.logger.error(`[FILE_WATCHER] Subscriber error: ${error.message}`);
            }
        }
    }

    /**
     * Acquire a file lock
     * @param {string} filePath - Path to file to lock
     * @param {string} agentId - ID of agent requesting lock
     * @returns {object} Lock result { success, lock?, reason? }
     */
    acquireLock(filePath, agentId) {
        const normalizedPath = path.normalize(filePath);
        const existingLock = this.fileLocks.get(normalizedPath);

        // Check for existing lock
        if (existingLock) {
            // Check if lock has expired
            if (Date.now() - existingLock.timestamp > LOCK_TIMEOUT) {
                this.logger.warn(`[FILE_WATCHER] Expired lock cleared: ${normalizedPath} (was held by ${existingLock.agentId})`);
                clearTimeout(existingLock.timeoutId);
                this.fileLocks.delete(normalizedPath);
            } else {
                this.logger.warn(`[FILE_WATCHER] Lock denied: ${normalizedPath} - held by ${existingLock.agentId}`);
                return {
                    success: false,
                    reason: `File locked by ${existingLock.agentId}`,
                    lockedBy: existingLock.agentId,
                    lockedAt: existingLock.timestamp,
                    expiresIn: LOCK_TIMEOUT - (Date.now() - existingLock.timestamp)
                };
            }
        }

        // Create new lock with auto-expiration
        const timeoutId = setTimeout(() => {
            this.logger.warn(`[FILE_WATCHER] Lock auto-expired: ${normalizedPath} (agent: ${agentId})`);
            this.fileLocks.delete(normalizedPath);
            this.emit('lockExpired', { filePath: normalizedPath, agentId });
        }, LOCK_TIMEOUT);

        const lock = {
            agentId,
            timestamp: Date.now(),
            timeoutId,
            filePath: normalizedPath
        };

        this.fileLocks.set(normalizedPath, lock);
        this.logger.info(`[FILE_WATCHER] Lock acquired: ${normalizedPath} by ${agentId}`);

        this.emit('lockAcquired', { filePath: normalizedPath, agentId });

        return {
            success: true,
            lock: {
                agentId,
                filePath: normalizedPath,
                timestamp: lock.timestamp,
                expiresAt: lock.timestamp + LOCK_TIMEOUT
            }
        };
    }

    /**
     * Release a file lock
     * @param {string} filePath - Path to file to unlock
     * @param {string} agentId - ID of agent releasing lock
     * @returns {object} Release result { success, reason? }
     */
    releaseLock(filePath, agentId) {
        const normalizedPath = path.normalize(filePath);
        const existingLock = this.fileLocks.get(normalizedPath);

        if (!existingLock) {
            return { success: false, reason: 'No lock exists for this file' };
        }

        if (existingLock.agentId !== agentId) {
            this.logger.warn(`[FILE_WATCHER] Lock release denied: ${normalizedPath} - not owned by ${agentId}`);
            return {
                success: false,
                reason: `Lock owned by ${existingLock.agentId}, not ${agentId}`
            };
        }

        // Clear timeout and remove lock
        clearTimeout(existingLock.timeoutId);
        this.fileLocks.delete(normalizedPath);

        this.logger.info(`[FILE_WATCHER] Lock released: ${normalizedPath} by ${agentId}`);
        this.emit('lockReleased', { filePath: normalizedPath, agentId });

        return { success: true };
    }

    /**
     * Get current lock status for a file
     * @param {string} filePath - Path to file
     * @returns {object|null} Lock info or null if not locked
     */
    getLock(filePath) {
        const normalizedPath = path.normalize(filePath);
        const lock = this.fileLocks.get(normalizedPath);

        if (!lock) return null;

        // Check if expired
        if (Date.now() - lock.timestamp > LOCK_TIMEOUT) {
            clearTimeout(lock.timeoutId);
            this.fileLocks.delete(normalizedPath);
            return null;
        }

        return {
            agentId: lock.agentId,
            filePath: normalizedPath,
            timestamp: lock.timestamp,
            expiresAt: lock.timestamp + LOCK_TIMEOUT,
            expiresIn: LOCK_TIMEOUT - (Date.now() - lock.timestamp)
        };
    }

    /**
     * Get all current locks
     * @returns {Array} Array of lock info objects
     */
    getAllLocks() {
        const locks = [];
        for (const [filePath, lock] of this.fileLocks) {
            const lockInfo = this.getLock(filePath);
            if (lockInfo) {
                locks.push(lockInfo);
            }
        }
        return locks;
    }

    /**
     * Cleanup expired locks (called periodically)
     */
    cleanupExpiredLocks() {
        const now = Date.now();
        for (const [filePath, lock] of this.fileLocks) {
            if (now - lock.timestamp > LOCK_TIMEOUT) {
                clearTimeout(lock.timeoutId);
                this.fileLocks.delete(filePath);
                this.logger.info(`[FILE_WATCHER] Cleaned up expired lock: ${filePath}`);
                this.emit('lockExpired', { filePath, agentId: lock.agentId });
            }
        }
    }

    /**
     * Shutdown the file watcher service
     */
    shutdown() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Clear all locks
        for (const [, lock] of this.fileLocks) {
            clearTimeout(lock.timeoutId);
        }
        this.fileLocks.clear();
        this.subscribers.clear();

        this.isInitialized = false;
        this.logger.info('[FILE_WATCHER] File watcher service shutdown');
    }
}

// Singleton instance
let instance = null;

/**
 * Initialize the file watcher service
 * @param {object} logger - Fastify logger instance
 * @returns {FileWatcherService}
 */
function initFileWatcher(logger) {
    if (!instance) {
        instance = new FileWatcherService();
    }
    return instance.init(logger);
}

/**
 * Get the file watcher service instance
 * @returns {FileWatcherService|null}
 */
function getFileWatcher() {
    return instance;
}

module.exports = {
    FileWatcherService,
    initFileWatcher,
    getFileWatcher
};
