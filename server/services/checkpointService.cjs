/**
 * Story 6-8: Checkpoint/Undo System
 *
 * Provides automatic checkpointing of files before agent modifications,
 * allowing users to restore previous versions if needed.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Checkpoint storage configuration
const DEFAULT_CONFIG = {
    checkpointDir: '.neuraldeck/checkpoints',
    maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    minCheckpointsPerFile: 10,
    maxCheckpointsPerFile: 100,
    maxStorageMB: 500,
    autoCleanupIntervalMs: 24 * 60 * 60 * 1000, // Daily cleanup
};

class CheckpointService {
    constructor(workspaceRoot, config = {}) {
        this.workspaceRoot = workspaceRoot;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.checkpointPath = path.join(workspaceRoot, this.config.checkpointDir);
        this.indexPath = path.join(this.checkpointPath, 'index.json');
        this.filesPath = path.join(this.checkpointPath, 'files');
        this.index = null;
        this.initialized = false;
        this.cleanupTimer = null;
    }

    /**
     * Initialize the checkpoint service
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Ensure checkpoint directories exist
            await fs.mkdir(this.checkpointPath, { recursive: true });
            await fs.mkdir(this.filesPath, { recursive: true });

            // Load or create index
            await this.loadIndex();

            // Start cleanup scheduler
            this.startCleanupScheduler();

            this.initialized = true;
            console.log('[CHECKPOINT] Service initialized');
        } catch (error) {
            console.error('[CHECKPOINT] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load checkpoint index from disk
     */
    async loadIndex() {
        try {
            const data = await fs.readFile(this.indexPath, 'utf-8');
            this.index = JSON.parse(data);
        } catch (error) {
            // Create new index if not exists
            this.index = {
                version: 1,
                checkpoints: {},
                fileMap: {}, // Maps file paths to checkpoint IDs
            };
            await this.saveIndex();
        }
    }

    /**
     * Save checkpoint index to disk
     */
    async saveIndex() {
        try {
            await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
        } catch (error) {
            console.error('[CHECKPOINT] Failed to save index:', error);
            throw error;
        }
    }

    /**
     * Generate unique checkpoint ID
     */
    generateId() {
        return crypto.randomBytes(8).toString('hex');
    }

    /**
     * Generate content hash for deduplication
     */
    hashContent(content) {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
    }

    /**
     * Get relative file path for storage
     */
    getRelativePath(filePath) {
        const relative = path.relative(this.workspaceRoot, filePath);
        // Create safe filename from path
        return relative.replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    }

    /**
     * Create a checkpoint for a file
     */
    async createCheckpoint(filePath, content, agentId = null, summary = 'Checkpoint') {
        await this.initialize();

        const id = this.generateId();
        const timestamp = Date.now();
        const contentHash = this.hashContent(content);
        const relPath = this.getRelativePath(filePath);

        // Create checkpoint directory for this file
        const fileDir = path.join(this.filesPath, relPath);
        await fs.mkdir(fileDir, { recursive: true });

        // Store content
        const contentFile = path.join(fileDir, `${timestamp}.txt`);
        await fs.writeFile(contentFile, content, 'utf-8');

        // Create checkpoint record
        const checkpoint = {
            id,
            filePath,
            timestamp,
            agentId,
            summary,
            contentHash,
            contentFile: path.relative(this.checkpointPath, contentFile),
            size: Buffer.byteLength(content, 'utf-8'),
        };

        // Update index
        this.index.checkpoints[id] = checkpoint;

        // Update file map
        if (!this.index.fileMap[filePath]) {
            this.index.fileMap[filePath] = [];
        }
        this.index.fileMap[filePath].push(id);

        await this.saveIndex();

        console.log(`[CHECKPOINT] Created: ${id} for ${filePath}`);
        return checkpoint;
    }

    /**
     * Get all checkpoints for a file
     */
    async getCheckpoints(filePath) {
        await this.initialize();

        const checkpointIds = this.index.fileMap[filePath] || [];
        const checkpoints = checkpointIds
            .map(id => this.index.checkpoints[id])
            .filter(Boolean)
            .sort((a, b) => b.timestamp - a.timestamp); // Newest first

        return checkpoints;
    }

    /**
     * Get a specific checkpoint by ID
     */
    async getCheckpoint(checkpointId) {
        await this.initialize();

        return this.index.checkpoints[checkpointId] || null;
    }

    /**
     * Get checkpoint content
     */
    async getCheckpointContent(checkpointId) {
        await this.initialize();

        const checkpoint = this.index.checkpoints[checkpointId];
        if (!checkpoint) {
            throw new Error('Checkpoint not found');
        }

        const contentPath = path.join(this.checkpointPath, checkpoint.contentFile);
        const content = await fs.readFile(contentPath, 'utf-8');
        return content;
    }

    /**
     * Restore a file to a checkpoint
     */
    async restoreCheckpoint(checkpointId) {
        await this.initialize();

        const checkpoint = this.index.checkpoints[checkpointId];
        if (!checkpoint) {
            throw new Error('Checkpoint not found');
        }

        // Read current content
        let currentContent = '';
        try {
            currentContent = await fs.readFile(checkpoint.filePath, 'utf-8');
        } catch (error) {
            // File might not exist
        }

        // Create safety checkpoint of current state
        if (currentContent) {
            await this.createCheckpoint(
                checkpoint.filePath,
                currentContent,
                null,
                `Safety backup before restore to ${new Date(checkpoint.timestamp).toISOString()}`
            );
        }

        // Restore from checkpoint
        const restoredContent = await this.getCheckpointContent(checkpointId);
        await fs.mkdir(path.dirname(checkpoint.filePath), { recursive: true });
        await fs.writeFile(checkpoint.filePath, restoredContent, 'utf-8');

        console.log(`[CHECKPOINT] Restored: ${checkpointId} to ${checkpoint.filePath}`);

        return {
            success: true,
            filePath: checkpoint.filePath,
            restoredFrom: checkpoint.timestamp,
            checkpointId,
        };
    }

    /**
     * Delete a checkpoint
     */
    async deleteCheckpoint(checkpointId) {
        await this.initialize();

        const checkpoint = this.index.checkpoints[checkpointId];
        if (!checkpoint) {
            throw new Error('Checkpoint not found');
        }

        // Check minimum retention
        const fileCheckpoints = this.index.fileMap[checkpoint.filePath] || [];
        if (fileCheckpoints.length <= this.config.minCheckpointsPerFile) {
            throw new Error(`Cannot delete: minimum ${this.config.minCheckpointsPerFile} checkpoints required per file`);
        }

        // Delete content file
        try {
            const contentPath = path.join(this.checkpointPath, checkpoint.contentFile);
            await fs.unlink(contentPath);
        } catch (error) {
            console.warn(`[CHECKPOINT] Content file already deleted: ${checkpoint.contentFile}`);
        }

        // Update index
        delete this.index.checkpoints[checkpointId];
        this.index.fileMap[checkpoint.filePath] = fileCheckpoints.filter(id => id !== checkpointId);

        // Clean up empty file entries
        if (this.index.fileMap[checkpoint.filePath].length === 0) {
            delete this.index.fileMap[checkpoint.filePath];
        }

        await this.saveIndex();

        console.log(`[CHECKPOINT] Deleted: ${checkpointId}`);
        return { success: true };
    }

    /**
     * Get storage statistics
     */
    async getStats() {
        await this.initialize();

        let totalSize = 0;
        let checkpointCount = 0;
        const fileCount = Object.keys(this.index.fileMap).length;

        for (const id in this.index.checkpoints) {
            const checkpoint = this.index.checkpoints[id];
            totalSize += checkpoint.size || 0;
            checkpointCount++;
        }

        return {
            checkpointCount,
            fileCount,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            maxStorageMB: this.config.maxStorageMB,
        };
    }

    /**
     * Clean up old checkpoints based on retention policy
     */
    async cleanup() {
        await this.initialize();

        const now = Date.now();
        const cutoffTime = now - this.config.maxAgeMs;
        let deletedCount = 0;

        // Group checkpoints by file
        const fileCheckpoints = {};
        for (const id in this.index.checkpoints) {
            const cp = this.index.checkpoints[id];
            if (!fileCheckpoints[cp.filePath]) {
                fileCheckpoints[cp.filePath] = [];
            }
            fileCheckpoints[cp.filePath].push({ id, ...cp });
        }

        // Process each file
        for (const filePath in fileCheckpoints) {
            const checkpoints = fileCheckpoints[filePath]
                .sort((a, b) => b.timestamp - a.timestamp);

            // Keep at least minCheckpointsPerFile
            const toKeep = checkpoints.slice(0, this.config.minCheckpointsPerFile);
            const candidates = checkpoints.slice(this.config.minCheckpointsPerFile);

            // Delete old checkpoints exceeding age limit
            for (const cp of candidates) {
                if (cp.timestamp < cutoffTime) {
                    try {
                        await this.deleteCheckpoint(cp.id);
                        deletedCount++;
                    } catch (error) {
                        console.warn(`[CHECKPOINT] Cleanup failed for ${cp.id}:`, error.message);
                    }
                }
            }

            // Enforce max checkpoints per file
            const currentCount = (this.index.fileMap[filePath] || []).length;
            if (currentCount > this.config.maxCheckpointsPerFile) {
                const excess = currentCount - this.config.maxCheckpointsPerFile;
                const oldestCheckpoints = checkpoints
                    .slice(-excess)
                    .filter(cp => !toKeep.includes(cp));

                for (const cp of oldestCheckpoints) {
                    try {
                        await this.deleteCheckpoint(cp.id);
                        deletedCount++;
                    } catch (error) {
                        console.warn(`[CHECKPOINT] Cleanup failed for ${cp.id}:`, error.message);
                    }
                }
            }
        }

        console.log(`[CHECKPOINT] Cleanup completed: ${deletedCount} checkpoints removed`);
        return { deletedCount };
    }

    /**
     * Start automatic cleanup scheduler
     */
    startCleanupScheduler() {
        if (this.cleanupTimer) return;

        this.cleanupTimer = setInterval(
            () => this.cleanup().catch(console.error),
            this.config.autoCleanupIntervalMs
        );
    }

    /**
     * Stop cleanup scheduler
     */
    stopCleanupScheduler() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Get all files that have checkpoints
     */
    async getFilesWithCheckpoints() {
        await this.initialize();

        return Object.keys(this.index.fileMap).map(filePath => ({
            filePath,
            checkpointCount: this.index.fileMap[filePath].length,
        }));
    }
}

// Singleton instance
let checkpointServiceInstance = null;

/**
 * Get or create checkpoint service instance
 */
function getCheckpointService(workspaceRoot, config = {}) {
    if (!checkpointServiceInstance) {
        checkpointServiceInstance = new CheckpointService(workspaceRoot, config);
    }
    return checkpointServiceInstance;
}

module.exports = {
    CheckpointService,
    getCheckpointService,
};
