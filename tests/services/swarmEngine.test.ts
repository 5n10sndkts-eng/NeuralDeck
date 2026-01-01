/**
 * Swarm Engine Tests - Story 4-2 Task 1
 * Tests for parallel execution and fault-tolerant task processing
 */

import {
    SwarmExecutionConfig,
    SwarmExecutionResult,
    DeveloperTaskContext,
    DeveloperTaskResult,
    DEFAULT_SWARM_CONFIG,
    generateExecutionId,
    parseStoryContext,
} from '../../src/services/swarmEngine';
import { StoryMetadata } from '../../src/hooks/useStoryWatcher';

// Mock API calls
jest.mock('../../src/services/api', () => ({
    sendChat: jest.fn().mockResolvedValue({
        role: 'assistant',
        content: '{"thought": "Implementing feature", "tool": "fs_write", "parameters": {"path": "src/test.ts", "content": "test"}}',
        timestamp: Date.now(),
    }),
    readFile: jest.fn().mockResolvedValue(`# Test Story
Status: pending
## Acceptance Criteria
1. First criteria
2. Second criteria
## Tasks
- [ ] Task 1
- [ ] Task 2`),
    writeFile: jest.fn().mockResolvedValue(undefined),
}));

describe('Swarm Engine - Story 4-2 Task 1', () => {
    describe('generateExecutionId', () => {
        it('[P0] should generate unique execution IDs', () => {
            const id1 = generateExecutionId();
            const id2 = generateExecutionId();

            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^swarm-exec-\d+-[a-z0-9]+$/);
        });

        it('[P1] should include timestamp in ID', () => {
            const before = Date.now();
            const id = generateExecutionId();
            const after = Date.now();

            const timestampPart = id.split('-')[2];
            const timestamp = parseInt(timestampPart, 10);

            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('DEFAULT_SWARM_CONFIG', () => {
        it('[P0] should have sensible defaults', () => {
            expect(DEFAULT_SWARM_CONFIG.maxConcurrency).toBe(5);
            expect(DEFAULT_SWARM_CONFIG.retryAttempts).toBe(2);
            expect(DEFAULT_SWARM_CONFIG.timeoutMs).toBe(120000);
            expect(DEFAULT_SWARM_CONFIG.checkFileLocks).toBe(true);
        });
    });

    describe('parseStoryContext', () => {
        const mockStory: StoryMetadata = {
            id: 'story-test-1',
            path: '/stories/story-test-1.md',
            title: 'Test Story',
            status: 'pending',
            acceptanceCriteriaCount: 2,
            taskCount: 2,
            lastModified: Date.now(),
        };

        it('[P0] should parse story metadata into context', async () => {
            const context = await parseStoryContext(mockStory);

            expect(context.storyId).toBe('story-test-1');
            expect(context.storyPath).toBe('/stories/story-test-1.md');
            expect(context.storyTitle).toBe('Test Story');
            expect(context.taskCount).toBe(2);
        });

        it('[P0] should extract acceptance criteria', async () => {
            const context = await parseStoryContext(mockStory);

            expect(context.acceptanceCriteria).toHaveLength(2);
            expect(context.acceptanceCriteria[0]).toContain('First criteria');
        });

        it('[P1] should generate unique nodeId', async () => {
            const context1 = await parseStoryContext(mockStory);
            // Add small delay to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 5));
            const context2 = await parseStoryContext(mockStory);

            expect(context1.nodeId).not.toBe(context2.nodeId);
            expect(context1.nodeId).toMatch(/^dev-story-test-1-\d+$/);
        });
    });
});

describe('SwarmExecutionResult Interface - Story 4-2 Task 5', () => {
    describe('Result Structure (AC: 4)', () => {
        it('[P0] should have required fields', () => {
            const result: SwarmExecutionResult = {
                executionId: 'swarm-exec-123',
                status: 'completed',
                startTime: 1000,
                endTime: 2000,
                totalDuration: 1000,
                nodeResults: [],
                successCount: 3,
                failureCount: 0,
                parallelismVerified: true,
            };

            expect(result.executionId).toBeDefined();
            expect(result.status).toBe('completed');
            expect(result.totalDuration).toBe(1000);
            expect(result.parallelismVerified).toBe(true);
        });

        it('[P0] should support partial status', () => {
            const result: SwarmExecutionResult = {
                executionId: 'swarm-exec-456',
                status: 'partial',
                startTime: 1000,
                endTime: 3000,
                totalDuration: 2000,
                nodeResults: [],
                successCount: 2,
                failureCount: 1,
                parallelismVerified: false,
            };

            expect(result.status).toBe('partial');
            expect(result.failureCount).toBe(1);
        });

        it('[P1] should include optional average time', () => {
            const result: SwarmExecutionResult = {
                executionId: 'swarm-exec-789',
                status: 'completed',
                startTime: 1000,
                endTime: 5000,
                totalDuration: 4000,
                nodeResults: [],
                successCount: 4,
                failureCount: 0,
                parallelismVerified: true,
                averageSingleTaskTime: 3500,
            };

            expect(result.averageSingleTaskTime).toBe(3500);
        });
    });

    describe('NFR-1 Parallelism Verification (AC: 4)', () => {
        it('[P0] should verify parallelism when total < 2x average', () => {
            // 4 tasks averaging 3000ms each = 12000ms sequential
            // If total is 4000ms, that's < 6000ms (2x avg), so verified
            const avgTime = 3000;
            const totalDuration = 4000;
            const parallelismVerified = totalDuration < (avgTime * 2);

            expect(parallelismVerified).toBe(true);
        });

        it('[P0] should fail verification when total >= 2x average', () => {
            // If total is 7000ms and average is 3000ms, that's > 6000ms
            const avgTime = 3000;
            const totalDuration = 7000;
            const parallelismVerified = totalDuration < (avgTime * 2);

            expect(parallelismVerified).toBe(false);
        });
    });
});

describe('DeveloperTaskResult Interface - Story 4-2 Task 5', () => {
    describe('Task Result Structure', () => {
        it('[P0] should have required fields', () => {
            const result: DeveloperTaskResult = {
                nodeId: 'dev-story-1-12345',
                storyId: 'story-1',
                status: 'success',
                startTime: 1000,
                endTime: 2000,
                duration: 1000,
                filesModified: ['src/test.ts'],
                tasksCompleted: 3,
                logs: ['Started', 'Completed'],
            };

            expect(result.nodeId).toBeDefined();
            expect(result.status).toBe('success');
            expect(result.filesModified).toHaveLength(1);
            expect(result.tasksCompleted).toBe(3);
        });

        it('[P0] should support error status with message', () => {
            const result: DeveloperTaskResult = {
                nodeId: 'dev-story-2-12345',
                storyId: 'story-2',
                status: 'error',
                startTime: 1000,
                endTime: 1500,
                duration: 500,
                filesModified: [],
                tasksCompleted: 0,
                error: 'LLM connection failed',
                logs: ['Error: LLM connection failed'],
            };

            expect(result.status).toBe('error');
            expect(result.error).toBe('LLM connection failed');
        });

        it('[P1] should track duration correctly', () => {
            const result: DeveloperTaskResult = {
                nodeId: 'dev-story-3-12345',
                storyId: 'story-3',
                status: 'success',
                startTime: 5000,
                endTime: 8500,
                duration: 3500,
                filesModified: [],
                tasksCompleted: 2,
                logs: [],
            };

            expect(result.endTime - result.startTime).toBe(result.duration);
        });
    });
});

describe('SwarmExecutionConfig Interface - Story 4-2', () => {
    describe('Configuration Options', () => {
        it('[P0] should allow custom concurrency', () => {
            const config: SwarmExecutionConfig = {
                ...DEFAULT_SWARM_CONFIG,
                maxConcurrency: 10,
            };

            expect(config.maxConcurrency).toBe(10);
        });

        it('[P1] should allow retry configuration', () => {
            const config: SwarmExecutionConfig = {
                ...DEFAULT_SWARM_CONFIG,
                retryAttempts: 5,
                retryDelayMs: 2000,
            };

            expect(config.retryAttempts).toBe(5);
            expect(config.retryDelayMs).toBe(2000);
        });

        it('[P2] should allow file lock checking toggle', () => {
            const config: SwarmExecutionConfig = {
                ...DEFAULT_SWARM_CONFIG,
                checkFileLocks: false,
            };

            expect(config.checkFileLocks).toBe(false);
        });
    });
});

describe('Parallel Execution Logic - Story 4-2 (AC: 1)', () => {
    describe('Promise.allSettled Behavior', () => {
        it('[P0] should continue on individual failures', async () => {
            const tasks = [
                Promise.resolve({ id: 1, status: 'success' }),
                Promise.reject(new Error('Task 2 failed')),
                Promise.resolve({ id: 3, status: 'success' }),
            ];

            const results = await Promise.allSettled(tasks);

            expect(results[0].status).toBe('fulfilled');
            expect(results[1].status).toBe('rejected');
            expect(results[2].status).toBe('fulfilled');
        });

        it('[P0] should execute all tasks regardless of failures', async () => {
            const executionOrder: number[] = [];

            const tasks = [
                async () => { executionOrder.push(1); return 1; },
                async () => { executionOrder.push(2); throw new Error('fail'); },
                async () => { executionOrder.push(3); return 3; },
            ];

            await Promise.allSettled(tasks.map(t => t()));

            expect(executionOrder).toEqual([1, 2, 3]);
        });

        it('[P1] should preserve order in results', async () => {
            const tasks = [
                new Promise(r => setTimeout(() => r({ id: 1 }), 100)),
                new Promise(r => setTimeout(() => r({ id: 2 }), 50)),
                new Promise(r => setTimeout(() => r({ id: 3 }), 75)),
            ];

            const results = await Promise.allSettled(tasks);

            // Despite different completion times, results maintain order
            expect((results[0] as any).value.id).toBe(1);
            expect((results[1] as any).value.id).toBe(2);
            expect((results[2] as any).value.id).toBe(3);
        });
    });

    describe('Error Isolation (AC: 5)', () => {
        it('[P0] should isolate errors per task', async () => {
            const results: { id: number; error?: string }[] = [];

            const tasks = [
                async () => {
                    results.push({ id: 1 });
                    return { success: true };
                },
                async () => {
                    try {
                        throw new Error('Task error');
                    } catch (e: any) {
                        results.push({ id: 2, error: e.message });
                        throw e;
                    }
                },
                async () => {
                    results.push({ id: 3 });
                    return { success: true };
                },
            ];

            await Promise.allSettled(tasks.map(t => t()));

            expect(results).toHaveLength(3);
            expect(results[0].error).toBeUndefined();
            expect(results[1].error).toBe('Task error');
            expect(results[2].error).toBeUndefined();
        });
    });
});

describe('DeveloperTaskContext Interface - Story 4-2 Task 2', () => {
    describe('Context Structure', () => {
        it('[P0] should have all required fields', () => {
            const context: DeveloperTaskContext = {
                nodeId: 'dev-story-1-12345',
                storyId: 'story-1',
                storyPath: '/stories/story-1.md',
                storyTitle: 'Test Story',
                storyContent: '# Test Story\n## Tasks\n- Task 1',
                taskCount: 1,
                acceptanceCriteria: ['Given X When Y Then Z'],
            };

            expect(context.nodeId).toBeDefined();
            expect(context.storyContent).toContain('Test Story');
            expect(context.acceptanceCriteria).toHaveLength(1);
        });
    });
});
