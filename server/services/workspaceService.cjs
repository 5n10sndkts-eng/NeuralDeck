/**
 * Workspace Service
 * Manages user workspaces with persistence and security validation
 * 
 * Workspaces are stored in ~/.neuraldeck/config/workspaces.json
 * This keeps them separate from the NeuralDeck application source code.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const NEURALDECK_DIR = path.resolve(__dirname, '../../');
const CONFIG_DIR = path.join(os.homedir(), '.neuraldeck', 'config');
const WORKSPACES_FILE = path.join(CONFIG_DIR, 'workspaces.json');
const MAX_RECENT_WORKSPACES = 10;

// System directories that should never be used as workspaces
const FORBIDDEN_PATHS = [
    '/',
    '/usr',
    '/etc',
    '/bin',
    '/sbin',
    '/boot',
    '/sys',
    '/proc',
    '/dev',
    'C:\\',
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
];

/**
 * Workspace configuration schema
 */
const DEFAULT_CONFIG = {
    version: 1,
    activeWorkspaceId: null,
    workspaces: [],
    settings: {
        maxRecentWorkspaces: MAX_RECENT_WORKSPACES,
        showHiddenFiles: false,
        excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next', 'out']
    }
};

class WorkspaceService {
    constructor() {
        this.config = null;
        this.initialized = false;
    }

    /**
     * Initialize the workspace service
     * Ensures config directory and file exist
     */
    async init() {
        if (this.initialized) return;

        try {
            // Ensure config directory exists
            await fs.mkdir(CONFIG_DIR, { recursive: true });

            // Load or create config file
            try {
                const data = await fs.readFile(WORKSPACES_FILE, 'utf-8');
                this.config = JSON.parse(data);
                
                // Validate and upgrade config if needed
                if (this.config.version !== DEFAULT_CONFIG.version) {
                    this.config = { ...DEFAULT_CONFIG, ...this.config, version: DEFAULT_CONFIG.version };
                    await this._saveConfig();
                }
            } catch (err) {
                if (err.code === 'ENOENT') {
                    // Create new config file
                    this.config = { ...DEFAULT_CONFIG };
                    await this._saveConfig();
                } else {
                    throw err;
                }
            }

            this.initialized = true;
            console.log('[WORKSPACE] Service initialized');
        } catch (err) {
            console.error('[WORKSPACE] Failed to initialize:', err);
            throw err;
        }
    }

    /**
     * Save config to disk
     */
    async _saveConfig() {
        await fs.writeFile(WORKSPACES_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    }

    /**
     * Validate a workspace path
     * @param {string} workspacePath - Path to validate
     * @returns {Promise<{valid: boolean, error?: string, isGitRepo: boolean, fileCount: number}>}
     */
    async validateWorkspacePath(workspacePath) {
        try {
            // Resolve to absolute path
            const absolutePath = path.resolve(workspacePath);

            // Check if path exists
            let stats;
            try {
                stats = await fs.stat(absolutePath);
            } catch (err) {
                return {
                    valid: false,
                    error: 'Path does not exist',
                    isGitRepo: false,
                    fileCount: 0
                };
            }

            // Must be a directory
            if (!stats.isDirectory()) {
                return {
                    valid: false,
                    error: 'Path is not a directory',
                    isGitRepo: false,
                    fileCount: 0
                };
            }

            // Check if it's the NeuralDeck source directory
            if (absolutePath === NEURALDECK_DIR || absolutePath.startsWith(NEURALDECK_DIR + path.sep)) {
                return {
                    valid: false,
                    error: 'Cannot use NeuralDeck application directory as workspace',
                    isGitRepo: false,
                    fileCount: 0
                };
            }

            // Check if NeuralDeck is within this path (parent directory)
            if (NEURALDECK_DIR.startsWith(absolutePath + path.sep)) {
                return {
                    valid: false,
                    error: 'Cannot use parent directory of NeuralDeck application as workspace',
                    isGitRepo: false,
                    fileCount: 0
                };
            }

            // Check if it's a forbidden system directory
            for (const forbidden of FORBIDDEN_PATHS) {
                if (absolutePath === forbidden || absolutePath.startsWith(forbidden + path.sep)) {
                    return {
                        valid: false,
                        error: 'Cannot use system directory as workspace',
                        isGitRepo: false,
                        fileCount: 0
                    };
                }
            }

            // Check if it's only node_modules
            const basename = path.basename(absolutePath);
            if (basename === 'node_modules') {
                return {
                    valid: false,
                    error: 'Cannot use node_modules as workspace',
                    isGitRepo: false,
                    fileCount: 0
                };
            }

            // Check if it's a git repository
            let isGitRepo = false;
            try {
                await fs.access(path.join(absolutePath, '.git'));
                isGitRepo = true;
            } catch {
                // Not a git repo, that's okay
            }

            // Count files (shallow, for info only)
            let fileCount = 0;
            try {
                const entries = await fs.readdir(absolutePath);
                fileCount = entries.length;
            } catch {
                fileCount = 0;
            }

            return {
                valid: true,
                isGitRepo,
                fileCount
            };
        } catch (err) {
            return {
                valid: false,
                error: err.message,
                isGitRepo: false,
                fileCount: 0
            };
        }
    }

    /**
     * Get all recent workspaces
     * @returns {Promise<Array>}
     */
    async getRecentWorkspaces() {
        await this.init();
        return this.config.workspaces || [];
    }

    /**
     * Get active workspace
     * @returns {Promise<Object|null>}
     */
    async getActiveWorkspace() {
        await this.init();
        
        if (!this.config.activeWorkspaceId) {
            return null;
        }

        const workspace = this.config.workspaces.find(w => w.id === this.config.activeWorkspaceId);
        return workspace || null;
    }

    /**
     * Get workspace by ID
     * @param {string} id - Workspace ID
     * @returns {Object|null}
     */
    getWorkspaceById(id) {
        if (!this.initialized || !this.config) {
            return null;
        }
        return this.config.workspaces.find(w => w.id === id) || null;
    }

    /**
     * Add a new workspace
     * @param {string} workspacePath - Path to workspace
     * @param {string} [name] - Optional display name
     * @returns {Promise<Object>}
     */
    async addWorkspace(workspacePath, name) {
        await this.init();

        // Validate the path
        const validation = await this.validateWorkspacePath(workspacePath);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const absolutePath = path.resolve(workspacePath);

        // Check if workspace already exists
        const existing = this.config.workspaces.find(w => w.path === absolutePath);
        if (existing) {
            // Update last opened time and return
            existing.lastOpened = Date.now();
            await this._saveConfig();
            return existing;
        }

        // Create new workspace
        const workspace = {
            id: crypto.randomUUID(),
            path: absolutePath,
            name: name || path.basename(absolutePath),
            lastOpened: Date.now(),
            created: Date.now(),
            isGitRepo: validation.isGitRepo
        };

        // Add to beginning of list
        this.config.workspaces.unshift(workspace);

        // Limit to max recent workspaces
        if (this.config.workspaces.length > this.config.settings.maxRecentWorkspaces) {
            this.config.workspaces = this.config.workspaces.slice(0, this.config.settings.maxRecentWorkspaces);
        }

        await this._saveConfig();
        return workspace;
    }

    /**
     * Set active workspace
     * @param {string} id - Workspace ID
     * @returns {Promise<Object>}
     */
    async setActiveWorkspace(id) {
        await this.init();

        const workspace = this.config.workspaces.find(w => w.id === id);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Validate workspace still exists
        const validation = await this.validateWorkspacePath(workspace.path);
        if (!validation.valid) {
            throw new Error(`Workspace no longer valid: ${validation.error}`);
        }

        // Update last opened time
        workspace.lastOpened = Date.now();
        workspace.isGitRepo = validation.isGitRepo;

        // Set as active
        this.config.activeWorkspaceId = id;

        await this._saveConfig();
        return workspace;
    }

    /**
     * Remove workspace from list (doesn't delete files)
     * @param {string} id - Workspace ID
     * @returns {Promise<void>}
     */
    async removeWorkspace(id) {
        await this.init();

        const index = this.config.workspaces.findIndex(w => w.id === id);
        if (index === -1) {
            throw new Error('Workspace not found');
        }

        this.config.workspaces.splice(index, 1);

        // If this was the active workspace, clear it
        if (this.config.activeWorkspaceId === id) {
            this.config.activeWorkspaceId = null;
        }

        await this._saveConfig();
    }

    /**
     * Browse directory contents
     * @param {string} dirPath - Directory to browse
     * @returns {Promise<{entries: Array, parent: string|null}>}
     */
    async browseDirectory(dirPath) {
        const absolutePath = path.resolve(dirPath);

        // Security check - don't allow browsing NeuralDeck source
        if (absolutePath === NEURALDECK_DIR || absolutePath.startsWith(NEURALDECK_DIR + path.sep)) {
            throw new Error('Cannot browse NeuralDeck application directory');
        }

        try {
            const stats = await fs.stat(absolutePath);
            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }

            const entries = await fs.readdir(absolutePath, { withFileTypes: true });
            const result = [];

            for (const entry of entries) {
                // Skip hidden files by default
                if (entry.name.startsWith('.')) continue;

                const entryPath = path.join(absolutePath, entry.name);
                result.push({
                    name: entry.name,
                    path: entryPath,
                    isDirectory: entry.isDirectory()
                });
            }

            // Sort: directories first, then alphabetically
            result.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });

            // Get parent directory (null if at root)
            const parent = absolutePath === path.parse(absolutePath).root ? null : path.dirname(absolutePath);

            return {
                entries: result,
                parent
            };
        } catch (err) {
            throw new Error(`Failed to browse directory: ${err.message}`);
        }
    }
}

// Singleton instance
const workspaceService = new WorkspaceService();

module.exports = {
    workspaceService,
    NEURALDECK_DIR
};
