/**
 * Codebase Indexer Service - Story 6.1
 * Task 2: Create Codebase Indexer Service
 * Task 3: Integrate with File Watcher
 *
 * Scans and indexes the workspace codebase for semantic search.
 * Integrates with FileWatcherService for incremental updates.
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

const rag = require('../lib/rag.cjs');
const { getFileWatcher } = require('./fileWatcher.cjs');
const { broadcast } = require('./socket.cjs');

const WORKSPACE_PATH = process.cwd();

// Task 2.3: File extension whitelist
const INDEXED_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs',
    '.json', '.md', '.css', '.html', '.yaml', '.yml'
]);

// Task 2.4: Ignore patterns
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'coverage',
    '.next',
    '.cache',
    'build',
    '__pycache__'
];

const IGNORE_FILE_PATTERNS = [
    '.lock',
    '.log',
    '.map',
    '-lock.json',
    '.min.js',
    '.min.css'
];

// Configuration
const INDEXER_CONFIG = {
    maxFileSizeMB: 10,              // Skip files larger than 10MB
    debounceMs: 100,                // Debounce file changes
    batchSize: 10,                  // Files to index in parallel
    maxTotalFiles: 10000,           // Maximum files to index
};

/**
 * CodebaseIndexerService - Singleton service for codebase indexing
 * Extends EventEmitter for pub/sub pattern
 */
class CodebaseIndexerService extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.isIndexing = false;
        this.logger = console;
        this.stats = {
            totalFiles: 0,
            totalChunks: 0,
            indexedFiles: 0,
            failedFiles: 0,
            startTime: null,
            endTime: null,
            lastUpdated: null
        };
        this.fileWatcherUnsubscribe = null;
        this.debounceTimers = new Map();
    }

    /**
     * Task 2.2: Initialize the indexer and scan workspace
     * @param {object} logger - Fastify logger instance
     */
    async init(logger) {
        if (this.isInitialized) {
            this.logger.warn('[INDEXER] Already initialized');
            return this;
        }

        this.logger = logger || console;
        this.logger.info('[INDEXER] Initializing codebase indexer...');

        try {
            // Start initial indexing
            await this.indexWorkspace();

            // Task 3.1: Subscribe to file watcher
            this.subscribeToFileWatcher();

            this.isInitialized = true;
            this.logger.info('[INDEXER] Codebase indexer initialized successfully');

        } catch (error) {
            this.logger.error(`[INDEXER] Failed to initialize: ${error.message}`);
            throw error;
        }

        return this;
    }

    /**
     * Check if a file should be indexed
     * @param {string} filePath - Path to file
     * @returns {boolean}
     */
    shouldIndexFile(filePath) {
        const relativePath = filePath.replace(WORKSPACE_PATH, '').replace(/^[/\\]/, '');

        // Check ignore patterns
        for (const pattern of IGNORE_PATTERNS) {
            if (relativePath.includes(pattern + '/') || relativePath.includes(pattern + '\\')) {
                return false;
            }
        }

        // Check file extension
        const ext = path.extname(filePath).toLowerCase();
        if (!INDEXED_EXTENSIONS.has(ext)) {
            return false;
        }

        // Check file-specific ignore patterns
        const filename = path.basename(filePath);
        for (const pattern of IGNORE_FILE_PATTERNS) {
            if (filename.includes(pattern)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Recursively get all files in a directory
     * @param {string} dir - Directory to scan
     * @returns {Promise<string[]>}
     */
    async getFilesRecursive(dir) {
        const files = [];

        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Skip ignored directories early
                if (entry.isDirectory()) {
                    if (!IGNORE_PATTERNS.includes(entry.name)) {
                        const subFiles = await this.getFilesRecursive(fullPath);
                        files.push(...subFiles);
                    }
                } else if (entry.isFile()) {
                    if (this.shouldIndexFile(fullPath)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            this.logger.warn(`[INDEXER] Could not read directory ${dir}: ${error.message}`);
        }

        return files;
    }

    /**
     * Index a single file
     * @param {string} filePath - Path to file
     * @returns {Promise<{success: boolean, chunks?: number}>}
     */
    async indexFile(filePath) {
        try {
            const stat = await fs.stat(filePath);

            // Skip large files
            if (stat.size > INDEXER_CONFIG.maxFileSizeMB * 1024 * 1024) {
                this.logger.warn(`[INDEXER] Skipping large file: ${filePath} (${Math.round(stat.size / 1024 / 1024)}MB)`);
                return { success: false, reason: 'file_too_large' };
            }

            const content = await fs.readFile(filePath, 'utf-8');
            const relativePath = filePath.replace(WORKSPACE_PATH, '').replace(/^[/\\]/, '');

            const result = await rag.ingest(content, {
                source: relativePath,
                absolutePath: filePath,
                size: stat.size,
                modified: stat.mtime.toISOString()
            });

            return result;
        } catch (error) {
            this.logger.error(`[INDEXER] Failed to index ${filePath}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Task 2.2: Index the entire workspace
     */
    async indexWorkspace() {
        if (this.isIndexing) {
            this.logger.warn('[INDEXER] Indexing already in progress');
            return;
        }

        this.isIndexing = true;
        this.stats.startTime = Date.now();
        this.stats.indexedFiles = 0;
        this.stats.failedFiles = 0;
        this.stats.totalChunks = 0;

        // Task 2.5: Emit start event
        this.emit('indexing:start', { timestamp: Date.now() });
        broadcast('rag:indexing', { status: 'started', timestamp: Date.now() });

        this.logger.info('[INDEXER] Starting workspace indexing...');

        try {
            // Clear existing index
            await rag.clear();

            // Get all indexable files
            const files = await this.getFilesRecursive(WORKSPACE_PATH);
            this.stats.totalFiles = Math.min(files.length, INDEXER_CONFIG.maxTotalFiles);

            this.logger.info(`[INDEXER] Found ${files.length} files to index`);

            // Index files in batches
            for (let i = 0; i < this.stats.totalFiles; i += INDEXER_CONFIG.batchSize) {
                const batch = files.slice(i, i + INDEXER_CONFIG.batchSize);
                const results = await Promise.allSettled(
                    batch.map(file => this.indexFile(file))
                );

                // Process results
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.success) {
                        this.stats.indexedFiles++;
                        this.stats.totalChunks += result.value.chunks || 0;
                    } else {
                        this.stats.failedFiles++;
                    }
                }

                // Task 2.5: Emit progress event
                const progress = Math.round(((i + batch.length) / this.stats.totalFiles) * 100);
                this.emit('indexing:progress', {
                    progress,
                    indexed: this.stats.indexedFiles,
                    total: this.stats.totalFiles
                });

                // Broadcast to frontend
                broadcast('rag:indexing', {
                    status: 'progress',
                    progress,
                    indexed: this.stats.indexedFiles,
                    total: this.stats.totalFiles
                });
            }

            this.stats.endTime = Date.now();
            this.stats.lastUpdated = Date.now();
            const elapsed = this.stats.endTime - this.stats.startTime;

            // Task 2.5: Emit complete event
            this.emit('indexing:complete', {
                ...this.stats,
                elapsedMs: elapsed
            });

            broadcast('rag:indexing', {
                status: 'complete',
                ...this.stats,
                elapsedMs: elapsed
            });

            this.logger.info(`[INDEXER] Indexing complete: ${this.stats.indexedFiles} files, ${this.stats.totalChunks} chunks in ${elapsed}ms`);

        } catch (error) {
            this.logger.error(`[INDEXER] Indexing failed: ${error.message}`);
            this.emit('indexing:error', { error: error.message });
            broadcast('rag:indexing', { status: 'error', error: error.message });
        } finally {
            this.isIndexing = false;
        }
    }

    /**
     * Task 3.1: Subscribe to file watcher events
     */
    subscribeToFileWatcher() {
        const fileWatcher = getFileWatcher();

        if (!fileWatcher) {
            this.logger.warn('[INDEXER] File watcher not available, incremental updates disabled');
            return;
        }

        this.fileWatcherUnsubscribe = fileWatcher.subscribe((event) => {
            this.handleFileChange(event);
        });

        this.logger.info('[INDEXER] Subscribed to file watcher for incremental updates');
    }

    /**
     * Task 3.2-3.6: Handle file change events with debouncing
     * @param {object} event - File change event from watcher
     */
    handleFileChange(event) {
        const { filePath, relativePath, eventType } = event;

        // Check if file should be indexed
        if (!this.shouldIndexFile(filePath)) {
            return;
        }

        // Task 3.5: Debounce rapid changes
        const existingTimer = this.debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(async () => {
            this.debounceTimers.delete(filePath);
            await this.processFileChange(filePath, relativePath, eventType);
        }, INDEXER_CONFIG.debounceMs);

        this.debounceTimers.set(filePath, timer);
    }

    /**
     * Process a debounced file change
     * @param {string} filePath - Absolute file path
     * @param {string} relativePath - Relative file path
     * @param {string} eventType - Type of change (create, update, delete)
     */
    async processFileChange(filePath, relativePath, eventType) {
        const startTime = Date.now();

        try {
            switch (eventType) {
                case 'create':
                    // Task 3.2: Ingest new file
                    const createResult = await this.indexFile(filePath);
                    if (createResult.success) {
                        this.stats.indexedFiles++;
                        this.stats.totalChunks += createResult.chunks || 0;
                    }
                    break;

                case 'update':
                    // Task 3.3: Update existing file
                    const content = await fs.readFile(filePath, 'utf-8');
                    const stat = await fs.stat(filePath);
                    await rag.updateDocument(content, {
                        source: relativePath,
                        absolutePath: filePath,
                        size: stat.size,
                        modified: stat.mtime.toISOString()
                    });
                    break;

                case 'delete':
                    // Task 3.4: Remove deleted file
                    await rag.removeDocument(relativePath);
                    this.stats.indexedFiles--;
                    break;
            }

            const elapsed = Date.now() - startTime;

            // Task 3.6: Log timing
            this.logger.info(`[INDEXER] ${eventType} ${relativePath} (${elapsed}ms)`);

            this.stats.lastUpdated = Date.now();

            // Broadcast update
            broadcast('rag:update', {
                eventType,
                file: relativePath,
                elapsedMs: elapsed
            });

        } catch (error) {
            this.logger.error(`[INDEXER] Failed to process ${eventType} for ${relativePath}: ${error.message}`);
        }
    }

    /**
     * Get current indexer statistics
     * @returns {object}
     */
    getStats() {
        return {
            ...this.stats,
            isIndexing: this.isIndexing,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Force a full re-index
     */
    async reindex() {
        this.logger.info('[INDEXER] Starting full re-index...');
        await this.indexWorkspace();
    }

    /**
     * Shutdown the indexer
     */
    shutdown() {
        // Clear debounce timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        // Unsubscribe from file watcher
        if (this.fileWatcherUnsubscribe) {
            this.fileWatcherUnsubscribe();
            this.fileWatcherUnsubscribe = null;
        }

        this.isInitialized = false;
        this.logger.info('[INDEXER] Codebase indexer shutdown');
    }
}

// Singleton instance
let instance = null;

/**
 * Initialize the codebase indexer service
 * @param {object} logger - Fastify logger instance
 * @returns {Promise<CodebaseIndexerService>}
 */
async function initCodebaseIndexer(logger) {
    if (!instance) {
        instance = new CodebaseIndexerService();
    }
    return instance.init(logger);
}

/**
 * Get the codebase indexer service instance
 * @returns {CodebaseIndexerService|null}
 */
function getCodebaseIndexer() {
    return instance;
}

module.exports = {
    CodebaseIndexerService,
    initCodebaseIndexer,
    getCodebaseIndexer
};
