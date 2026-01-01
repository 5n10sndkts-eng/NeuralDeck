/**
 * RAG Persistence Layer - Story 6.1: Task 6
 * Optional file-based persistence for RAG index state
 *
 * Features:
 * - Task 6.1: JSON file storage for index metadata
 * - Task 6.2: Startup restoration from cache
 * - Task 6.3: Incremental updates (only index changed files)
 * - Task 6.4: Cache invalidation on file changes
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CACHE_DIR = process.env.RAG_CACHE_DIR || path.join(process.cwd(), '.rag-cache');
const INDEX_METADATA_FILE = 'index-metadata.json';
const FILE_HASHES_FILE = 'file-hashes.json';
const CACHE_VERSION = '1.0.0';

/**
 * RAG Persistence Service
 * Handles saving and loading RAG index state to/from disk
 */
class RAGPersistenceService {
    constructor(logger = console) {
        this.logger = logger;
        this.cacheDir = CACHE_DIR;
        this.isInitialized = false;
        this.fileHashes = new Map(); // Map<filePath, hash>
        this.lastSaveTime = null;
    }

    /**
     * Task 6.1: Initialize persistence layer
     * Creates cache directory if it doesn't exist
     */
    async init() {
        if (this.isInitialized) return this;

        try {
            // Ensure cache directory exists
            await fs.mkdir(this.cacheDir, { recursive: true });

            // Load existing file hashes if available
            await this.loadFileHashes();

            this.isInitialized = true;
            this.logger.info(`[RAG_PERSIST] Initialized. Cache dir: ${this.cacheDir}`);

            return this;
        } catch (err) {
            this.logger.error(`[RAG_PERSIST] Initialization failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Task 6.1: Save index metadata to disk
     * @param {object} metadata - Index metadata to save
     */
    async saveIndexMetadata(metadata) {
        if (!this.isInitialized) {
            await this.init();
        }

        const metadataPath = path.join(this.cacheDir, INDEX_METADATA_FILE);

        const dataToSave = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            ...metadata
        };

        try {
            await fs.writeFile(metadataPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
            this.lastSaveTime = Date.now();
            this.logger.info(`[RAG_PERSIST] Saved index metadata: ${metadata.indexedFiles || 0} files`);
            return { success: true, path: metadataPath };
        } catch (err) {
            this.logger.error(`[RAG_PERSIST] Failed to save metadata: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Task 6.2: Load index metadata from disk
     * @returns {object|null} Saved metadata or null if not found
     */
    async loadIndexMetadata() {
        if (!this.isInitialized) {
            await this.init();
        }

        const metadataPath = path.join(this.cacheDir, INDEX_METADATA_FILE);

        try {
            const content = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(content);

            // Check version compatibility
            if (metadata.version !== CACHE_VERSION) {
                this.logger.warn(`[RAG_PERSIST] Cache version mismatch. Expected ${CACHE_VERSION}, got ${metadata.version}`);
                return null;
            }

            this.logger.info(`[RAG_PERSIST] Loaded index metadata from ${new Date(metadata.timestamp).toISOString()}`);
            return metadata;
        } catch (err) {
            if (err.code === 'ENOENT') {
                this.logger.info('[RAG_PERSIST] No existing cache found');
                return null;
            }
            this.logger.error(`[RAG_PERSIST] Failed to load metadata: ${err.message}`);
            return null;
        }
    }

    /**
     * Task 6.3: Calculate file hash for change detection
     * @param {string} filePath - Path to file
     * @param {string} content - File content
     * @returns {string} MD5 hash of content
     */
    calculateFileHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Task 6.3: Check if file has changed since last index
     * @param {string} filePath - Path to file
     * @param {string} content - Current file content
     * @returns {boolean} True if file has changed or is new
     */
    hasFileChanged(filePath, content) {
        const currentHash = this.calculateFileHash(content);
        const storedHash = this.fileHashes.get(filePath);

        if (!storedHash) {
            return true; // New file
        }

        return currentHash !== storedHash;
    }

    /**
     * Task 6.3: Update file hash after indexing
     * @param {string} filePath - Path to file
     * @param {string} content - File content that was indexed
     */
    updateFileHash(filePath, content) {
        const hash = this.calculateFileHash(content);
        this.fileHashes.set(filePath, hash);
    }

    /**
     * Task 6.4: Invalidate file from cache
     * @param {string} filePath - Path to file to invalidate
     */
    invalidateFile(filePath) {
        const hadHash = this.fileHashes.delete(filePath);
        if (hadHash) {
            this.logger.info(`[RAG_PERSIST] Invalidated cache for: ${filePath}`);
        }
        return hadHash;
    }

    /**
     * Task 6.3: Save file hashes to disk
     */
    async saveFileHashes() {
        if (!this.isInitialized) {
            await this.init();
        }

        const hashesPath = path.join(this.cacheDir, FILE_HASHES_FILE);
        const hashesObj = Object.fromEntries(this.fileHashes);

        try {
            await fs.writeFile(hashesPath, JSON.stringify({
                version: CACHE_VERSION,
                timestamp: Date.now(),
                hashes: hashesObj
            }, null, 2), 'utf-8');

            this.logger.info(`[RAG_PERSIST] Saved ${this.fileHashes.size} file hashes`);
            return { success: true, count: this.fileHashes.size };
        } catch (err) {
            this.logger.error(`[RAG_PERSIST] Failed to save file hashes: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Task 6.2: Load file hashes from disk
     */
    async loadFileHashes() {
        const hashesPath = path.join(this.cacheDir, FILE_HASHES_FILE);

        try {
            const content = await fs.readFile(hashesPath, 'utf-8');
            const data = JSON.parse(content);

            // Check version compatibility
            if (data.version !== CACHE_VERSION) {
                this.logger.warn('[RAG_PERSIST] File hashes version mismatch, starting fresh');
                this.fileHashes = new Map();
                return;
            }

            this.fileHashes = new Map(Object.entries(data.hashes || {}));
            this.logger.info(`[RAG_PERSIST] Loaded ${this.fileHashes.size} file hashes`);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                this.logger.warn(`[RAG_PERSIST] Could not load file hashes: ${err.message}`);
            }
            this.fileHashes = new Map();
        }
    }

    /**
     * Task 6.3: Get list of files that need reindexing
     * Compares current files against cached hashes
     * @param {string[]} currentFiles - Array of file paths to check
     * @param {function} readFile - Function to read file content
     * @returns {Promise<object>} Object with arrays of new, changed, and unchanged files
     */
    async getFilesToReindex(currentFiles, readFile) {
        const result = {
            new: [],
            changed: [],
            unchanged: [],
            deleted: []
        };

        // Check which files are new or changed
        for (const filePath of currentFiles) {
            try {
                const content = await readFile(filePath);

                if (!this.fileHashes.has(filePath)) {
                    result.new.push(filePath);
                } else if (this.hasFileChanged(filePath, content)) {
                    result.changed.push(filePath);
                } else {
                    result.unchanged.push(filePath);
                }
            } catch (err) {
                this.logger.warn(`[RAG_PERSIST] Could not read file: ${filePath}`);
            }
        }

        // Check for deleted files
        for (const cachedPath of this.fileHashes.keys()) {
            if (!currentFiles.includes(cachedPath)) {
                result.deleted.push(cachedPath);
            }
        }

        this.logger.info(
            `[RAG_PERSIST] Reindex analysis: ${result.new.length} new, ` +
            `${result.changed.length} changed, ${result.unchanged.length} unchanged, ` +
            `${result.deleted.length} deleted`
        );

        return result;
    }

    /**
     * Clear all cached data
     */
    async clearCache() {
        try {
            const metadataPath = path.join(this.cacheDir, INDEX_METADATA_FILE);
            const hashesPath = path.join(this.cacheDir, FILE_HASHES_FILE);

            await fs.unlink(metadataPath).catch(() => {});
            await fs.unlink(hashesPath).catch(() => {});

            this.fileHashes.clear();
            this.lastSaveTime = null;

            this.logger.info('[RAG_PERSIST] Cache cleared');
            return { success: true };
        } catch (err) {
            this.logger.error(`[RAG_PERSIST] Failed to clear cache: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            cacheDir: this.cacheDir,
            cachedFileCount: this.fileHashes.size,
            lastSaveTime: this.lastSaveTime,
            version: CACHE_VERSION
        };
    }

    /**
     * Check if cache exists and is valid
     */
    async isCacheValid() {
        const metadata = await this.loadIndexMetadata();
        if (!metadata) return false;

        // Check if cache is too old (older than 7 days)
        const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - metadata.timestamp > MAX_CACHE_AGE) {
            this.logger.warn('[RAG_PERSIST] Cache is too old, will rebuild');
            return false;
        }

        return true;
    }
}

// Singleton instance
let instance = null;

/**
 * Initialize the persistence service
 * @param {object} logger - Logger instance
 * @returns {Promise<RAGPersistenceService>}
 */
async function initRAGPersistence(logger) {
    if (!instance) {
        instance = new RAGPersistenceService(logger);
    }
    return instance.init();
}

/**
 * Get the persistence service instance
 * @returns {RAGPersistenceService|null}
 */
function getRAGPersistence() {
    return instance;
}

module.exports = {
    RAGPersistenceService,
    initRAGPersistence,
    getRAGPersistence
};
