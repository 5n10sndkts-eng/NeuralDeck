/**
 * Swarm Execution Engine - Story 4-2
 *
 * Core parallel execution service for Developer Swarm.
 * Enables multiple developer nodes to process stories simultaneously
 * using Promise.allSettled() for fault-tolerant parallelism.
 */

import { AgentNodeState, ChatMessage, LlmConfig, AgentAction } from '../types';
import { StoryMetadata } from '../hooks/useStoryWatcher';
import { DeveloperSwarmNode } from '../hooks/useSwarm';
import { sendChat, readFile, writeFile } from './api';
import { AGENT_DEFINITIONS } from './agent';

// --- FILE LOCK INTEGRATION (AC: 3) ---

export interface FileLock {
    filePath: string;
    agentId: string;
    lockedAt: number;
}

/**
 * Check if a file is locked by another agent
 */
export const checkFileLock = async (filePath: string): Promise<FileLock | null> => {
    try {
        const response = await fetch(`/api/files/lock/${encodeURIComponent(filePath)}`);
        if (response.ok) {
            const data = await response.json();
            return data.lock || null;
        }
        return null;
    } catch (error) {
        console.warn(`[SwarmEngine] Could not check file lock: ${error}`);
        return null;
    }
};

/**
 * Acquire a file lock for an agent
 */
export const acquireFileLock = async (filePath: string, agentId: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/files/lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, agentId }),
        });
        return response.ok;
    } catch (error) {
        console.warn(`[SwarmEngine] Could not acquire file lock: ${error}`);
        return false;
    }
};

/**
 * Release a file lock for an agent
 */
export const releaseFileLock = async (filePath: string, agentId: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/files/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, agentId }),
        });
        return response.ok;
    } catch (error) {
        console.warn(`[SwarmEngine] Could not release file lock: ${error}`);
        return false;
    }
};

/**
 * Get all current file locks
 */
export const getAllFileLocks = async (): Promise<FileLock[]> => {
    try {
        const response = await fetch('/api/files/locks');
        if (response.ok) {
            const data = await response.json();
            return data.locks || [];
        }
        return [];
    } catch (error) {
        console.warn(`[SwarmEngine] Could not get file locks: ${error}`);
        return [];
    }
};

// --- INTERFACES ---

export interface SwarmExecutionConfig {
    maxConcurrency: number;         // Max parallel API calls
    retryAttempts: number;          // Retry count for failed nodes
    retryDelayMs: number;           // Delay between retries
    timeoutMs: number;              // Per-task timeout
    checkFileLocks: boolean;        // Enable file conflict detection
}

export interface DeveloperTaskContext {
    nodeId: string;
    storyId: string;
    storyPath: string;
    storyTitle: string;
    storyContent: string;
    taskCount: number;
    acceptanceCriteria: string[];
}

export interface DeveloperTaskResult {
    nodeId: string;
    storyId: string;
    status: 'success' | 'error' | 'timeout' | 'cancelled';
    startTime: number;
    endTime: number;
    duration: number;
    filesModified: string[];
    tasksCompleted: number;
    error?: string;
    logs: string[];
}

export interface SwarmExecutionResult {
    executionId: string;
    status: 'completed' | 'partial' | 'failed';
    startTime: number;
    endTime: number;
    totalDuration: number;
    nodeResults: DeveloperTaskResult[];
    successCount: number;
    failureCount: number;
    parallelismVerified: boolean;   // NFR-1: < 2x single story time
    averageSingleTaskTime?: number;
}

export type SwarmExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SwarmExecution {
    id: string;
    stories: StoryMetadata[];
    developers: DeveloperSwarmNode[];
    config: SwarmExecutionConfig;
    status: SwarmExecutionStatus;
    startTime: number;
    result?: SwarmExecutionResult;
}

// --- DEFAULT CONFIG ---

export const DEFAULT_SWARM_CONFIG: SwarmExecutionConfig = {
    maxConcurrency: 5,
    retryAttempts: 2,
    retryDelayMs: 1000,
    timeoutMs: 120000,  // 2 minutes per task
    checkFileLocks: true,
};

// --- EXECUTION ENGINE ---

/**
 * Generate unique execution ID
 */
export const generateExecutionId = (): string => {
    return `swarm-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Parse story content to extract task context
 */
export const parseStoryContext = async (story: StoryMetadata): Promise<DeveloperTaskContext> => {
    let storyContent = '';

    try {
        // Read story file content
        storyContent = await readFile(story.path);
    } catch (e) {
        console.warn(`[SwarmEngine] Could not read story file: ${story.path}`);
    }

    // Extract acceptance criteria from content
    const acMatch = storyContent.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n## |$)/);
    const acceptanceCriteria: string[] = [];

    if (acMatch) {
        const acSection = acMatch[1];
        const criteriaMatches = acSection.match(/^\d+\..+$/gm);
        if (criteriaMatches) {
            acceptanceCriteria.push(...criteriaMatches);
        }
    }

    return {
        nodeId: `dev-${story.id}-${Date.now()}`,
        storyId: story.id,
        storyPath: story.path,
        storyTitle: story.title,
        storyContent,
        taskCount: story.taskCount,
        acceptanceCriteria,
    };
};

/**
 * Execute a single developer task
 * Returns result with timing and status information
 */
export const executeDeveloperTask = async (
    context: DeveloperTaskContext,
    llmConfig: LlmConfig,
    onProgress?: (nodeId: string, state: AgentNodeState, progress: number) => void,
    onLog?: (nodeId: string, message: string) => void
): Promise<DeveloperTaskResult> => {
    const startTime = Date.now();
    const logs: string[] = [];
    const filesModified: string[] = [];
    let tasksCompleted = 0;

    const log = (msg: string) => {
        logs.push(`[${new Date().toISOString()}] ${msg}`);
        onLog?.(context.nodeId, msg);
        console.log(`[SwarmEngine] [${context.storyId}] ${msg}`);
    };

    try {
        // Update state to THINKING
        onProgress?.(context.nodeId, 'THINKING', 0);
        log(`Starting task for story: ${context.storyTitle}`);

        // Build developer prompt with story context
        const developerDef = AGENT_DEFINITIONS['developer'];
        const systemPrompt = `${developerDef.systemPrompt}

STORY CONTEXT:
Title: ${context.storyTitle}
Path: ${context.storyPath}
Tasks: ${context.taskCount}

ACCEPTANCE CRITERIA:
${context.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

FULL STORY CONTENT:
${context.storyContent}

INSTRUCTIONS:
1. Analyze the story requirements
2. Implement each task systematically
3. Write/update code files as needed
4. Mark the story as Done when complete
5. Return a JSON action for each step`;

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: systemPrompt,
                timestamp: Date.now(),
            },
            {
                role: 'user',
                content: 'Begin implementation of this story. Process each task and return JSON actions.',
                timestamp: Date.now(),
            },
        ];

        // Update state to WORKING
        onProgress?.(context.nodeId, 'WORKING', 10);
        log('Querying LLM for implementation plan...');

        // Execute LLM call
        const response = await sendChat(messages, llmConfig);
        const responseText = response.content || '';

        log(`Received LLM response (${responseText.length} chars)`);

        // Parse action from response
        let action: AgentAction | null = null;
        try {
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanText.indexOf('{');
            const lastBrace = cleanText.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
                action = JSON.parse(jsonStr);
            }
        } catch (parseError) {
            log('Could not parse JSON action from response');
        }

        // Process action if available
        if (action) {
            log(`Action: ${action.tool} - ${action.thought}`);

            // Handle file writes with lock checking (AC: 3)
            if (action.tool === 'fs_write' || action.tool === 'write_file') {
                const filePath = action.parameters.path;
                const content = action.parameters.content;

                if (filePath && content) {
                    // Check for file lock conflicts
                    const existingLock = await checkFileLock(filePath);
                    if (existingLock && existingLock.agentId !== context.nodeId) {
                        log(`File locked by ${existingLock.agentId}, skipping write: ${filePath}`);
                    } else {
                        // Acquire lock, write, then release
                        const lockAcquired = await acquireFileLock(filePath, context.nodeId);
                        if (lockAcquired) {
                            try {
                                await writeFile(filePath, content);
                                filesModified.push(filePath);
                                tasksCompleted++;
                                log(`Wrote file: ${filePath}`);
                            } finally {
                                await releaseFileLock(filePath, context.nodeId);
                            }
                        } else {
                            log(`Could not acquire lock for: ${filePath}`);
                        }
                    }
                }
            }

            // Handle finish
            if (action.tool === 'finish') {
                tasksCompleted = context.taskCount;
                log('Developer marked task as complete');
            }
        }

        // Update progress based on tasks completed
        const progress = context.taskCount > 0
            ? Math.round((tasksCompleted / context.taskCount) * 100)
            : 100;

        onProgress?.(context.nodeId, 'DONE', progress);
        log(`Task completed: ${tasksCompleted}/${context.taskCount} tasks`);

        const endTime = Date.now();

        return {
            nodeId: context.nodeId,
            storyId: context.storyId,
            status: 'success',
            startTime,
            endTime,
            duration: endTime - startTime,
            filesModified,
            tasksCompleted,
            logs,
        };

    } catch (error: any) {
        const endTime = Date.now();
        log(`Error: ${error.message}`);

        onProgress?.(context.nodeId, 'IDLE', 0);

        return {
            nodeId: context.nodeId,
            storyId: context.storyId,
            status: 'error',
            startTime,
            endTime,
            duration: endTime - startTime,
            filesModified,
            tasksCompleted,
            error: error.message,
            logs,
        };
    }
};

/**
 * Execute swarm - run all developer tasks in parallel
 * Uses Promise.allSettled() for fault-tolerant parallelism (AC: 1, 5)
 */
export const executeSwarm = async (
    stories: StoryMetadata[],
    llmConfig: LlmConfig,
    config: SwarmExecutionConfig = DEFAULT_SWARM_CONFIG,
    onNodeProgress?: (nodeId: string, state: AgentNodeState, progress: number) => void,
    onNodeLog?: (nodeId: string, message: string) => void,
    onSwarmProgress?: (completed: number, total: number) => void
): Promise<SwarmExecutionResult> => {
    const executionId = generateExecutionId();
    const startTime = Date.now();

    console.log(`[SwarmEngine] Starting swarm execution: ${executionId}`);
    console.log(`[SwarmEngine] Processing ${stories.length} stories with max concurrency: ${config.maxConcurrency}`);

    // Parse story contexts
    const contexts = await Promise.all(
        stories.map(story => parseStoryContext(story))
    );

    console.log(`[SwarmEngine] Parsed ${contexts.length} story contexts`);

    // Execute all tasks in parallel using Promise.allSettled (AC: 1, 5)
    // This ensures one failure doesn't stop other tasks
    const results = await Promise.allSettled(
        contexts.map(async (context, index) => {
            // Add small stagger to avoid rate limit spikes
            await new Promise(resolve => setTimeout(resolve, index * 100));

            return executeDeveloperTask(
                context,
                llmConfig,
                onNodeProgress,
                onNodeLog
            );
        })
    );

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Process results
    const nodeResults: DeveloperTaskResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            nodeResults.push(result.value);
            if (result.value.status === 'success') {
                successCount++;
            } else {
                failureCount++;
            }
        } else {
            // Promise rejected - create error result
            failureCount++;
            nodeResults.push({
                nodeId: contexts[index].nodeId,
                storyId: contexts[index].storyId,
                status: 'error',
                startTime,
                endTime,
                duration: totalDuration,
                filesModified: [],
                tasksCompleted: 0,
                error: result.reason?.message || 'Unknown error',
                logs: [`Error: ${result.reason?.message || 'Unknown error'}`],
            });
        }

        onSwarmProgress?.(index + 1, stories.length);
    });

    // Calculate average single task time for NFR-1 verification
    const successfulResults = nodeResults.filter(r => r.status === 'success');
    const averageSingleTaskTime = successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
        : undefined;

    // NFR-1: Verify parallelism - total time should be < 2x average single task time
    const parallelismVerified = averageSingleTaskTime
        ? totalDuration < (averageSingleTaskTime * 2)
        : false;

    const executionResult: SwarmExecutionResult = {
        executionId,
        status: failureCount === 0 ? 'completed' : failureCount === stories.length ? 'failed' : 'partial',
        startTime,
        endTime,
        totalDuration,
        nodeResults,
        successCount,
        failureCount,
        parallelismVerified,
        averageSingleTaskTime,
    };

    console.log(`[SwarmEngine] Swarm execution complete: ${executionId}`);
    console.log(`[SwarmEngine] Results: ${successCount} success, ${failureCount} failed`);
    console.log(`[SwarmEngine] Total duration: ${totalDuration}ms`);
    console.log(`[SwarmEngine] Parallelism verified (NFR-1): ${parallelismVerified}`);

    return executionResult;
};

/**
 * Retry failed tasks from a swarm execution
 */
export const retryFailedTasks = async (
    previousResult: SwarmExecutionResult,
    stories: StoryMetadata[],
    llmConfig: LlmConfig,
    config: SwarmExecutionConfig = DEFAULT_SWARM_CONFIG,
    onNodeProgress?: (nodeId: string, state: AgentNodeState, progress: number) => void,
    onNodeLog?: (nodeId: string, message: string) => void
): Promise<SwarmExecutionResult> => {
    const failedStoryIds = previousResult.nodeResults
        .filter(r => r.status !== 'success')
        .map(r => r.storyId);

    const storiesToRetry = stories.filter(s => failedStoryIds.includes(s.id));

    if (storiesToRetry.length === 0) {
        console.log('[SwarmEngine] No failed tasks to retry');
        return previousResult;
    }

    console.log(`[SwarmEngine] Retrying ${storiesToRetry.length} failed tasks`);

    return executeSwarm(
        storiesToRetry,
        llmConfig,
        config,
        onNodeProgress,
        onNodeLog
    );
};

export default {
    executeSwarm,
    executeDeveloperTask,
    parseStoryContext,
    retryFailedTasks,
    generateExecutionId,
    DEFAULT_SWARM_CONFIG,
};
