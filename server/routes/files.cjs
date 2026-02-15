'use strict';

async function filesRoutes(fastify, opts) {
    const { verifyToken, fs, path, safePath, generateTimestampedFilename, getFileStructure, WORKSPACE_PATH, workspaceService, securityLogger, getCheckpointService, reasoningService, hiveMemory } = opts;

    fastify.get('/api/files', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { workspaceId } = request.query;
            let workspacePath = WORKSPACE_PATH;

            // If workspaceId is provided, use that workspace
            if (workspaceId) {
                const workspace = workspaceService.getWorkspaceById(workspaceId);
                if (!workspace) {
                    return reply.code(404).send({ error: 'Workspace not found' });
                }
                workspacePath = workspace.path;
            } else {
                // Otherwise try to use active workspace
                const activeWorkspace = await workspaceService.getActiveWorkspace();
                if (activeWorkspace) {
                    workspacePath = activeWorkspace.path;
                }
            }

            const files = await getFileStructure(workspacePath);
            return files;
        } catch (e) {
            fastify.log.error(`[FILES] Error: ${e.message}`);
            reply.code(500).send([]);
        }
    });

    // --- WORKSPACE MANAGEMENT ENDPOINTS ---

    // Get all workspaces and active workspace
    fastify.get('/api/workspaces', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const workspaces = await workspaceService.getRecentWorkspaces();
            const active = await workspaceService.getActiveWorkspace();
            return { workspaces, active };
        } catch (err) {
            fastify.log.error(`[WORKSPACE] Error getting workspaces: ${err.message}`);
            reply.code(500).send({ error: err.message });
        }
    });

    // Add new workspace
    fastify.post('/api/workspaces', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { path: workspacePath, name } = request.body;

            if (!workspacePath) {
                return reply.code(400).send({ error: 'Workspace path is required' });
            }

            const workspace = await workspaceService.addWorkspace(workspacePath, name);

            await securityLogger.logSecurityEvent('workspace-add', {
                userId: request.user?.userId || 'anonymous',
                ip: request.ip,
                path: workspacePath
            });

            return { workspace };
        } catch (err) {
            fastify.log.error(`[WORKSPACE] Error adding workspace: ${err.message}`);
            reply.code(400).send({ error: err.message });
        }
    });

    // Activate a workspace
    fastify.post('/api/workspaces/:id/activate', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { id } = request.params;
            const workspace = await workspaceService.setActiveWorkspace(id);

            await securityLogger.logSecurityEvent('workspace-activate', {
                userId: request.user?.userId || 'anonymous',
                ip: request.ip,
                workspaceId: id
            });

            return { workspace };
        } catch (err) {
            fastify.log.error(`[WORKSPACE] Error activating workspace: ${err.message}`);
            reply.code(400).send({ error: err.message });
        }
    });

    // Remove workspace from list
    fastify.delete('/api/workspaces/:id', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { id } = request.params;
            await workspaceService.removeWorkspace(id);

            await securityLogger.logSecurityEvent('workspace-remove', {
                userId: request.user?.userId || 'anonymous',
                ip: request.ip,
                workspaceId: id
            });

            return { success: true };
        } catch (err) {
            fastify.log.error(`[WORKSPACE] Error removing workspace: ${err.message}`);
            reply.code(400).send({ error: err.message });
        }
    });

    // Validate workspace path
    fastify.post('/api/workspaces/validate', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { path: workspacePath } = request.body;

            if (!workspacePath) {
                return reply.code(400).send({ error: 'Path is required' });
            }

            const result = await workspaceService.validateWorkspacePath(workspacePath);
            return result;
        } catch (err) {
            fastify.log.error(`[WORKSPACE] Error validating path: ${err.message}`);
            reply.code(500).send({ error: err.message });
        }
    });

    // Browse directory for folder picker
    // SECURITY: Restricted to user's home directory tree to prevent arbitrary filesystem enumeration
    fastify.get('/api/browse', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const os = require('os');
            const homePath = os.homedir();
            const { path: dirPath } = request.query;

            if (!dirPath) {
                // Return user's home directory by default
                const result = await workspaceService.browseDirectory(homePath);
                return { ...result, currentPath: homePath };
            }

            // Resolve to absolute and verify it's within home directory
            const resolvedPath = require('path').resolve(dirPath);
            const resolvedHome = require('path').resolve(homePath);
            if (!resolvedPath.startsWith(resolvedHome + require('path').sep) && resolvedPath !== resolvedHome) {
                reply.code(403).send({ error: 'Browsing is restricted to your home directory' });
                return;
            }

            const result = await workspaceService.browseDirectory(resolvedPath);
            return { ...result, currentPath: resolvedPath };
        } catch (err) {
            fastify.log.error(`[WORKSPACE] Error browsing directory: ${err.message}`);
            reply.code(400).send({ error: err.message });
        }
    });

    // --- END WORKSPACE MANAGEMENT ENDPOINTS ---

    // --- REASONING SERVICE - Story 7-1 ---
    fastify.post('/api/think', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { prompt } = request.body;
            if (!prompt) {
                return reply.code(400).send({ error: 'Prompt is required' });
            }

            const thoughts = await reasoningService.decomposeRequest(prompt);
            await securityLogger.logAiOperation('sequential-thinking', request.user?.userId || 'anonymous', request.ip);

            return { thoughts };
        } catch (e) {
            fastify.log.error(`[THINK] Error: ${e.message}`);
            reply.code(500).send({ error: e.message });
        }
    });

    // --- HIVE MEMORY - Story 7-3 ---
    fastify.get('/api/hive', { preHandler: verifyToken }, async (request, reply) => {
        return { memories: hiveMemory.getAllMemories() };
    });

    fastify.post('/api/hive/learn', { preHandler: verifyToken }, async (request, reply) => {
        const { key, value } = request.body;
        hiveMemory.learn(key, value, request.user?.userId || 'api');
        return { success: true };
    });

    // File System: Read
    fastify.post('/api/read', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { filePath, workspaceId } = request.body;
            const cleanPath = safePath(filePath, workspaceId);
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

    // File System: Write (with automatic checkpointing - Story 6-8)
    fastify.post('/api/write', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { filePath, content, agentId, skipCheckpoint, workspaceId } = request.body;
            const cleanPath = safePath(filePath, workspaceId);

            // Determine workspace path for checkpoint service
            let workspacePath = WORKSPACE_PATH;
            if (workspaceId) {
                const workspace = workspaceService.getWorkspaceById(workspaceId);
                if (workspace) {
                    workspacePath = workspace.path;
                }
            }

            // Story 6-8: Create checkpoint before modification (if file exists)
            if (!skipCheckpoint) {
                try {
                    const oldContent = await fs.readFile(cleanPath, 'utf-8');
                    const checkpointService = getCheckpointService(workspacePath);
                    await checkpointService.createCheckpoint(
                        cleanPath,
                        oldContent,
                        agentId || request.user?.userId || 'anonymous',
                        `Before modification by ${agentId || 'user'}`
                    );
                } catch (cpError) {
                    // File doesn't exist or checkpoint failed - continue with write
                    if (cpError.code !== 'ENOENT') {
                        fastify.log.warn(`[CHECKPOINT] Failed to create checkpoint: ${cpError.message}`);
                    }
                }
            }

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

    // --- FILE CRUD OPERATIONS (Workspace-aware) ---

    // Create a new file or directory
    fastify.post('/api/files/create', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { path: itemPath, type, workspaceId } = request.body;

            if (!itemPath) {
                return reply.code(400).send({ error: 'Path is required' });
            }

            if (!type || !['file', 'directory'].includes(type)) {
                return reply.code(400).send({ error: 'Type must be "file" or "directory"' });
            }

            const cleanPath = safePath(itemPath, workspaceId);

            // Check if already exists
            try {
                await fs.access(cleanPath);
                return reply.code(400).send({ error: 'Path already exists' });
            } catch {
                // Path doesn't exist, good to create
            }

            if (type === 'directory') {
                await fs.mkdir(cleanPath, { recursive: true });
            } else {
                await fs.mkdir(path.dirname(cleanPath), { recursive: true });
                await fs.writeFile(cleanPath, '', 'utf-8');
            }

            await securityLogger.logSecurityEvent(`file-create-${type}`, {
                userId: request.user?.userId || 'anonymous',
                ip: request.ip,
                path: itemPath
            });

            return { success: true, path: itemPath, type };
        } catch (err) {
            fastify.log.error(`[FILE_CRUD] Create error: ${err.message}`);
            reply.code(500).send({ error: err.message });
        }
    });

    // Rename/move a file or directory
    fastify.post('/api/files/rename', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { oldPath, newPath, workspaceId } = request.body;

            if (!oldPath || !newPath) {
                return reply.code(400).send({ error: 'Both oldPath and newPath are required' });
            }

            const cleanOldPath = safePath(oldPath, workspaceId);
            const cleanNewPath = safePath(newPath, workspaceId);

            // Check if source exists
            await fs.access(cleanOldPath);

            // Check if destination already exists
            try {
                await fs.access(cleanNewPath);
                return reply.code(400).send({ error: 'Destination path already exists' });
            } catch {
                // Destination doesn't exist, good to rename
            }

            // Ensure destination directory exists
            await fs.mkdir(path.dirname(cleanNewPath), { recursive: true });

            // Perform rename
            await fs.rename(cleanOldPath, cleanNewPath);

            await securityLogger.logSecurityEvent('file-rename', {
                userId: request.user?.userId || 'anonymous',
                ip: request.ip,
                oldPath,
                newPath
            });

            return { success: true, oldPath, newPath };
        } catch (err) {
            fastify.log.error(`[FILE_CRUD] Rename error: ${err.message}`);
            reply.code(500).send({ error: err.message });
        }
    });

    // Delete a file or directory
    fastify.delete('/api/files', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const { path: itemPath, workspaceId } = request.body;

            if (!itemPath) {
                return reply.code(400).send({ error: 'Path is required' });
            }

            const cleanPath = safePath(itemPath, workspaceId);

            // Check if exists
            const stats = await fs.stat(cleanPath);

            // Delete file or directory
            if (stats.isDirectory()) {
                await fs.rm(cleanPath, { recursive: true, force: true });
            } else {
                await fs.unlink(cleanPath);
            }

            await securityLogger.logSecurityEvent('file-delete', {
                userId: request.user?.userId || 'anonymous',
                ip: request.ip,
                path: itemPath
            });

            return { success: true, path: itemPath };
        } catch (err) {
            fastify.log.error(`[FILE_CRUD] Delete error: ${err.message}`);
            reply.code(500).send({ error: err.message });
        }
    });

    // --- END FILE CRUD OPERATIONS ---

    // File System: Check if file exists - Story 10 (R-007)
    fastify.get('/api/files/check', { preHandler: verifyToken }, async (request, reply) => {
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
    fastify.post('/api/files/backup', { preHandler: verifyToken }, async (request, reply) => {
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
    fastify.post('/api/files/save', { preHandler: verifyToken }, async (request, reply) => {
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
}

module.exports = filesRoutes;
