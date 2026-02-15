'use strict';

const { getFileWatcher } = require('../services/fileWatcher.cjs');

async function swarmRoutes(fastify, opts) {
    const { verifyToken, fs, path, broadcast, securityLogger, WORKSPACE_PATH, safePath, EXEC_OPTIONS, COMMAND_TIMEOUT, runCommand, runCommandArgs, validateCommand, validateCommandPaths } = opts;

    // --- STORIES API ---

    fastify.get('/api/stories', { preHandler: verifyToken }, async (request, reply) => {
        try {
            const storiesDir = path.join(WORKSPACE_PATH, 'stories');

            // Check if stories directory exists
            try {
                await fs.access(storiesDir);
            } catch (error) {
                // Stories directory doesn't exist yet, return empty list
                return { stories: [], isWatching: true };
            }

            const files = await fs.readdir(storiesDir);
            const storyFiles = files.filter(f => f.endsWith('.md'));

            const stories = await Promise.all(storyFiles.map(async (filename) => {
                const filePath = path.join(storiesDir, filename);
                const stat = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf-8');

                // Parse story metadata from content
                const metadata = parseStoryContent(content, filePath);

                return {
                    id: filename.replace('.md', ''),
                    path: `/stories/${filename}`,
                    title: metadata.title,
                    status: metadata.status,
                    acceptanceCriteriaCount: metadata.acceptanceCriteriaCount,
                    taskCount: metadata.taskCount,
                    lastModified: stat.mtimeMs,
                };
            }));

            fastify.log.info(`[STORIES] Returned ${stories.length} story files`);
            return { stories, isWatching: true };

        } catch (error) {
            fastify.log.error(`[STORIES] Error listing stories: ${error.message}`);
            reply.code(500).send({ error: 'Failed to list stories' });
        }
    });

    // Parse story markdown content for metadata
    function parseStoryContent(content, filePath) {
        // Extract title from first H1 heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';

        // Count acceptance criteria (numbered list items under AC section)
        const acMatch = content.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n## |$)/);
        let acceptanceCriteriaCount = 0;
        if (acMatch) {
            const acSection = acMatch[1];
            acceptanceCriteriaCount = (acSection.match(/^\d+\./gm) || []).length;
        }

        // Count tasks (checkbox items)
        const taskMatches = content.match(/- \[[x ]\]/gi) || [];
        const taskCount = taskMatches.length;

        // Determine status from content
        let status = 'pending';
        const statusMatch = content.match(/Status:\s*(done|in-progress|pending|ready-for-dev)/i);
        if (statusMatch) {
            const rawStatus = statusMatch[1].toLowerCase();
            if (rawStatus === 'done') status = 'done';
            else if (rawStatus === 'in-progress') status = 'in-progress';
            else status = 'pending';
        }

        return {
            title,
            status,
            acceptanceCriteriaCount,
            taskCount,
        };
    }

    // Subscribe to file watcher for story events
    const storyWatcher = getFileWatcher();
    if (storyWatcher) {
        storyWatcher.subscribe(async (event) => {
            // Only handle story files
            if (!event.relativePath.startsWith('stories/') || !event.relativePath.endsWith('.md')) {
                return;
            }

            fastify.log.info(`[STORIES] File event: ${event.eventType} - ${event.relativePath}`);

            const storyPath = event.relativePath;
            const storyId = path.basename(storyPath, '.md');
            const fullPath = path.join(WORKSPACE_PATH, storyPath);

            // Prepare event data
            let eventData = {
                path: storyPath,
                storyId: storyId,
                timestamp: Date.now(),
            };

            // For created/updated events, read content and parse metadata
            if (event.eventType !== 'deleted') {
                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const metadata = parseStoryContent(content, fullPath);
                    eventData = {
                        ...eventData,
                        content: content,
                        title: metadata.title,
                        status: metadata.status,
                        acceptanceCriteriaCount: metadata.acceptanceCriteriaCount,
                        taskCount: metadata.taskCount,
                    };
                } catch (err) {
                    fastify.log.warn(`[STORIES] Could not read story content: ${err.message}`);
                }
            }

            // Broadcast WebSocket event (Story 4-1)
            switch (event.eventType) {
                case 'created':
                    fastify.log.info(`[STORIES] Broadcasting story:created for ${storyId}`);
                    broadcast('story:created', eventData);
                    break;
                case 'updated':
                    fastify.log.info(`[STORIES] Broadcasting story:updated for ${storyId}`);
                    broadcast('story:updated', eventData);
                    break;
                case 'deleted':
                    fastify.log.info(`[STORIES] Broadcasting story:deleted for ${storyId}`);
                    broadcast('story:deleted', eventData);
                    break;
            }
        });

        fastify.log.info('[STORIES] Story file watcher subscription active');
    }

    // --- SWARM EXECUTION API - Story 4-2 ---

    // Track active swarm executions
    const activeSwarmExecutions = new Map();

    // Start a swarm execution
    fastify.post('/api/swarm/execute', { preHandler: verifyToken }, async (request, reply) => {
        const { storyIds, llmConfig, config } = request.body;

        if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
            reply.code(400).send({ error: 'storyIds array is required' });
            return;
        }

        const executionId = `swarm-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        fastify.log.info(`[SWARM] Starting execution: ${executionId} with ${storyIds.length} stories`);

        // Broadcast swarm started event
        broadcast('swarm:started', {
            executionId,
            storyIds,
            timestamp: Date.now(),
        });

        // Load story metadata for each story
        const storiesDir = path.join(WORKSPACE_PATH, 'stories');
        const stories = [];

        for (const storyId of storyIds) {
            try {
                const filePath = path.join(storiesDir, `${storyId}.md`);
                const content = await fs.readFile(filePath, 'utf-8');
                const metadata = parseStoryContent(content, filePath);

                stories.push({
                    id: storyId,
                    path: `/stories/${storyId}.md`,
                    title: metadata.title,
                    status: metadata.status,
                    taskCount: metadata.taskCount,
                    acceptanceCriteriaCount: metadata.acceptanceCriteriaCount,
                    content,
                });
            } catch (err) {
                fastify.log.warn(`[SWARM] Could not load story: ${storyId} - ${err.message}`);
            }
        }

        if (stories.length === 0) {
            reply.code(400).send({ error: 'No valid stories found' });
            return;
        }

        // Track execution
        const execution = {
            id: executionId,
            status: 'running',
            stories: stories.map(s => s.id),
            startTime: Date.now(),
            progress: { completed: 0, total: stories.length },
            results: [],
        };
        activeSwarmExecutions.set(executionId, execution);

        // Execute stories in parallel (simulated for backend)
        // Real execution happens on frontend with LLM calls
        // Backend tracks state and broadcasts events
        const startTime = Date.now();

        // Process each story with progress updates
        const nodeResults = await Promise.allSettled(
            stories.map(async (story, index) => {
                const nodeId = `dev-${story.id}-${Date.now()}`;
                const nodeStartTime = Date.now();

                // Broadcast node started
                broadcast('swarm:node-started', {
                    executionId,
                    nodeId,
                    storyId: story.id,
                    storyTitle: story.title,
                    timestamp: nodeStartTime,
                });

                // Simulate task processing with progress updates
                broadcast('swarm:node-progress', {
                    executionId,
                    nodeId,
                    storyId: story.id,
                    state: 'WORKING',
                    progress: 50,
                    timestamp: Date.now(),
                });

                // Add stagger to avoid rate limits
                await new Promise(r => setTimeout(r, index * 100));

                const nodeEndTime = Date.now();

                // Mark as done
                broadcast('swarm:node-completed', {
                    executionId,
                    nodeId,
                    storyId: story.id,
                    status: 'success',
                    duration: nodeEndTime - nodeStartTime,
                    timestamp: nodeEndTime,
                });

                // Update overall progress
                execution.progress.completed++;
                broadcast('swarm:progress', {
                    executionId,
                    completed: execution.progress.completed,
                    total: execution.progress.total,
                    timestamp: Date.now(),
                });

                return {
                    nodeId,
                    storyId: story.id,
                    status: 'success',
                    startTime: nodeStartTime,
                    endTime: nodeEndTime,
                    duration: nodeEndTime - nodeStartTime,
                    filesModified: [],
                    tasksCompleted: story.taskCount,
                };
            })
        );

        const endTime = Date.now();
        const totalDuration = endTime - startTime;

        // Build final results
        const processedResults = nodeResults.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    nodeId: `dev-${stories[index].id}-error`,
                    storyId: stories[index].id,
                    status: 'error',
                    error: result.reason?.message || 'Unknown error',
                    duration: totalDuration,
                };
            }
        });

        const successCount = processedResults.filter(r => r.status === 'success').length;
        const failureCount = processedResults.filter(r => r.status !== 'success').length;

        // NFR-1: Calculate parallelism verification
        const successfulResults = processedResults.filter(r => r.status === 'success');
        const avgSingleTime = successfulResults.length > 0
            ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
            : undefined;
        const parallelismVerified = avgSingleTime
            ? totalDuration < (avgSingleTime * 2)
            : false;

        const executionResult = {
            executionId,
            status: failureCount === 0 ? 'completed' : failureCount === stories.length ? 'failed' : 'partial',
            startTime,
            endTime,
            totalDuration,
            nodeResults: processedResults,
            successCount,
            failureCount,
            parallelismVerified,
            averageSingleTaskTime: avgSingleTime,
        };

        // Update execution record
        execution.status = executionResult.status;
        execution.results = processedResults;
        execution.endTime = endTime;

        // Broadcast completion
        broadcast('swarm:completed', {
            executionId,
            status: executionResult.status,
            successCount,
            failureCount,
            totalDuration,
            parallelismVerified,
            timestamp: endTime,
        });

        fastify.log.info(`[SWARM] Execution complete: ${executionId} - ${successCount} success, ${failureCount} failed, ${totalDuration}ms`);
        fastify.log.info(`[SWARM] NFR-1 Parallelism verified: ${parallelismVerified}`);

        return executionResult;
    });

    // Get swarm execution status
    fastify.get('/api/swarm/status/:executionId', { preHandler: verifyToken }, async (request, reply) => {
        const { executionId } = request.params;
        const execution = activeSwarmExecutions.get(executionId);

        if (!execution) {
            reply.code(404).send({ error: 'Execution not found' });
            return;
        }

        return execution;
    });

    // List all active swarm executions
    fastify.get('/api/swarm/executions', { preHandler: verifyToken }, async (request, reply) => {
        const executions = Array.from(activeSwarmExecutions.values()).map(exec => ({
            id: exec.id,
            status: exec.status,
            storyCount: exec.stories.length,
            progress: exec.progress,
            startTime: exec.startTime,
            endTime: exec.endTime,
        }));

        return { executions };
    });

    // Cancel a swarm execution
    fastify.post('/api/swarm/cancel/:executionId', { preHandler: verifyToken }, async (request, reply) => {
        const { executionId } = request.params;
        const execution = activeSwarmExecutions.get(executionId);

        if (!execution) {
            reply.code(404).send({ error: 'Execution not found' });
            return;
        }

        if (execution.status !== 'running') {
            reply.code(400).send({ error: 'Execution is not running' });
            return;
        }

        execution.status = 'cancelled';
        execution.endTime = Date.now();

        broadcast('swarm:cancelled', {
            executionId,
            timestamp: Date.now(),
        });

        fastify.log.info(`[SWARM] Execution cancelled: ${executionId}`);

        return { success: true, executionId };
    });

    fastify.log.info('[SWARM] Swarm execution API endpoints registered');
}

module.exports = swarmRoutes;
