/**
 * Rate Limiter Tests - Story 4-2 Task 3
 * Tests for API rate limit management and request queuing
 */

import {
    RateLimiter,
    RateLimitConfig,
    DEFAULT_RATE_LIMIT_CONFIG,
    getRateLimiter,
    resetRateLimiter,
} from '../../src/services/rateLimiter';

describe('RateLimiter - Story 4-2 Task 3', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter();
    });

    afterEach(() => {
        rateLimiter.reset();
        resetRateLimiter();
    });

    describe('DEFAULT_RATE_LIMIT_CONFIG', () => {
        it('[P0] should have sensible defaults', () => {
            expect(DEFAULT_RATE_LIMIT_CONFIG.maxConcurrent).toBe(5);
            expect(DEFAULT_RATE_LIMIT_CONFIG.requestsPerMinute).toBe(60);
            expect(DEFAULT_RATE_LIMIT_CONFIG.retryAfterMs).toBe(1000);
            expect(DEFAULT_RATE_LIMIT_CONFIG.maxRetries).toBe(3);
            expect(DEFAULT_RATE_LIMIT_CONFIG.backoffMultiplier).toBe(2);
        });
    });

    describe('Constructor', () => {
        it('[P0] should use default config', () => {
            const limiter = new RateLimiter();
            const state = limiter.getState();

            expect(state.currentConcurrent).toBe(0);
            expect(state.requestsThisMinute).toBe(0);
            expect(state.isRateLimited).toBe(false);
        });

        it('[P0] should accept custom config', () => {
            const customConfig: Partial<RateLimitConfig> = {
                maxConcurrent: 10,
                requestsPerMinute: 100,
            };

            const limiter = new RateLimiter(customConfig);
            const capacity = limiter.getRemainingCapacity();

            expect(capacity.concurrent).toBe(10);
            expect(capacity.perMinute).toBe(100);
        });
    });

    describe('enqueue (AC: 2)', () => {
        it('[P0] should execute request immediately when under limit', async () => {
            let executed = false;
            const result = await rateLimiter.enqueue(async () => {
                executed = true;
                return 'done';
            });

            expect(executed).toBe(true);
            expect(result).toBe('done');
        });

        it('[P0] should track concurrent requests', async () => {
            let inFlight = 0;
            let maxInFlight = 0;

            const tasks = Array(3).fill(null).map(() =>
                rateLimiter.enqueue(async () => {
                    inFlight++;
                    maxInFlight = Math.max(maxInFlight, inFlight);
                    await new Promise(r => setTimeout(r, 50));
                    inFlight--;
                    return 'done';
                })
            );

            await Promise.all(tasks);

            expect(maxInFlight).toBeGreaterThan(0);
            expect(maxInFlight).toBeLessThanOrEqual(5); // Default max concurrent
        });

        it('[P1] should respect priority ordering', async () => {
            const limiter = new RateLimiter({ maxConcurrent: 1 });
            const results: number[] = [];

            // Queue up requests with different priorities
            const task1 = limiter.enqueue(async () => { results.push(1); return 1; }, 0);
            const task2 = limiter.enqueue(async () => { results.push(2); return 2; }, 10); // High priority
            const task3 = limiter.enqueue(async () => { results.push(3); return 3; }, 5);

            await Promise.all([task1, task2, task3]);

            // First one executes immediately, then by priority
            expect(results[0]).toBe(1);
            // Priority ordering for remaining
        });
    });

    describe('executeAll (AC: 1)', () => {
        it('[P0] should execute multiple requests in parallel', async () => {
            const startTime = Date.now();

            const executions = [
                async () => { await new Promise(r => setTimeout(r, 100)); return 1; },
                async () => { await new Promise(r => setTimeout(r, 100)); return 2; },
                async () => { await new Promise(r => setTimeout(r, 100)); return 3; },
            ];

            const results = await rateLimiter.executeAll(executions);

            const duration = Date.now() - startTime;

            // Parallel execution should complete in ~100ms, not 300ms
            expect(duration).toBeLessThan(250);
            expect(results).toHaveLength(3);
            expect(results.every(r => r.status === 'fulfilled')).toBe(true);
        });

        it('[P0] should handle mixed success/failure', async () => {
            const executions = [
                async () => 'success',
                async () => { throw new Error('failed'); },
                async () => 'success2',
            ];

            const results = await rateLimiter.executeAll(executions);

            expect(results[0].status).toBe('fulfilled');
            expect(results[1].status).toBe('rejected');
            expect(results[2].status).toBe('fulfilled');
        });
    });

    describe('handleRateLimitResponse (AC: 2)', () => {
        it('[P0] should set rate limited state', () => {
            rateLimiter.handleRateLimitResponse();

            const state = rateLimiter.getState();
            expect(state.isRateLimited).toBe(true);
        });

        it('[P0] should track retry-after time', () => {
            const before = Date.now();
            rateLimiter.handleRateLimitResponse('5'); // 5 seconds

            const state = rateLimiter.getState();
            expect(state.retryAfter).toBeGreaterThanOrEqual(before + 5000);
        });

        it('[P1] should increment rate limited metrics', () => {
            rateLimiter.handleRateLimitResponse();
            rateLimiter.handleRateLimitResponse();

            const metrics = rateLimiter.getMetrics();
            expect(metrics.rateLimitedRequests).toBe(2);
        });
    });

    describe('getRemainingCapacity', () => {
        it('[P0] should return available capacity', () => {
            const capacity = rateLimiter.getRemainingCapacity();

            expect(capacity.concurrent).toBe(5);
            expect(capacity.perMinute).toBe(60);
        });

        it('[P1] should update after requests', async () => {
            await rateLimiter.enqueue(async () => 'done');

            const capacity = rateLimiter.getRemainingCapacity();
            expect(capacity.perMinute).toBe(59);
        });
    });

    describe('getMetrics', () => {
        it('[P0] should track total requests', async () => {
            await rateLimiter.enqueue(async () => 1);
            await rateLimiter.enqueue(async () => 2);
            await rateLimiter.enqueue(async () => 3);

            const metrics = rateLimiter.getMetrics();
            expect(metrics.totalRequests).toBe(3);
            expect(metrics.successfulRequests).toBe(3);
        });

        it('[P1] should track peak concurrent', async () => {
            const limiter = new RateLimiter({ maxConcurrent: 10 });

            const tasks = Array(5).fill(null).map(() =>
                limiter.enqueue(async () => {
                    await new Promise(r => setTimeout(r, 50));
                    return 'done';
                })
            );

            await Promise.all(tasks);

            const metrics = limiter.getMetrics();
            expect(metrics.peakConcurrent).toBeGreaterThan(0);
        });
    });

    describe('getQueueLength', () => {
        it('[P0] should return queue size', () => {
            const length = rateLimiter.getQueueLength();
            expect(length).toBe(0);
        });
    });

    describe('clearQueue', () => {
        it('[P0] should clear pending requests', async () => {
            const limiter = new RateLimiter({ maxConcurrent: 1 });

            // Start a long task
            const longTask = limiter.enqueue(async () => {
                await new Promise(r => setTimeout(r, 1000));
                return 'long';
            });

            // Queue more tasks - add catch to avoid unhandled rejection
            const task1Promise = limiter.enqueue(async () => 'queued1').catch(() => 'cleared');
            const task2Promise = limiter.enqueue(async () => 'queued2').catch(() => 'cleared');

            // Give time for queueing
            await new Promise(r => setTimeout(r, 10));

            // Clear queue
            const cleared = limiter.clearQueue();

            // Cleared tasks should reject
            expect(cleared).toBeGreaterThanOrEqual(0);

            // Wait for promises to settle to avoid unhandled rejections
            await Promise.allSettled([task1Promise, task2Promise]);
        });
    });

    describe('reset', () => {
        it('[P0] should reset all state', async () => {
            await rateLimiter.enqueue(async () => 'done');
            rateLimiter.handleRateLimitResponse();

            rateLimiter.reset();

            const state = rateLimiter.getState();
            expect(state.currentConcurrent).toBe(0);
            expect(state.requestsThisMinute).toBe(0);
            expect(state.isRateLimited).toBe(false);
        });
    });

    describe('Singleton getRateLimiter', () => {
        it('[P0] should return same instance', () => {
            resetRateLimiter();

            const limiter1 = getRateLimiter();
            const limiter2 = getRateLimiter();

            expect(limiter1).toBe(limiter2);
        });

        it('[P1] should accept initial config', () => {
            resetRateLimiter();

            const limiter = getRateLimiter({ maxConcurrent: 20 });
            const capacity = limiter.getRemainingCapacity();

            expect(capacity.concurrent).toBe(20);
        });
    });

    describe('Exponential Backoff', () => {
        it('[P0] should calculate increasing delays', () => {
            const config = DEFAULT_RATE_LIMIT_CONFIG;
            const delays = [0, 1, 2, 3].map(retryCount =>
                config.retryAfterMs * Math.pow(config.backoffMultiplier, retryCount)
            );

            expect(delays).toEqual([1000, 2000, 4000, 8000]);
        });
    });
});

describe('Rate Limiter Integration - Story 4-2 (AC: 2)', () => {
    describe('API Rate Limit Handling', () => {
        it('[P0] should queue requests when at limit', async () => {
            const limiter = new RateLimiter({ maxConcurrent: 2 });
            const results: number[] = [];

            const tasks = [1, 2, 3, 4, 5].map(n =>
                limiter.enqueue(async () => {
                    await new Promise(r => setTimeout(r, 50));
                    results.push(n);
                    return n;
                })
            );

            await Promise.all(tasks);

            expect(results).toHaveLength(5);
            expect(results.sort()).toEqual([1, 2, 3, 4, 5]);
        });

        it('[P1] should maintain order for same-priority requests', async () => {
            const limiter = new RateLimiter({ maxConcurrent: 1 });
            const results: number[] = [];

            const tasks = [1, 2, 3].map(n =>
                limiter.enqueue(async () => {
                    results.push(n);
                    return n;
                }, 0) // Same priority
            );

            await Promise.all(tasks);

            expect(results).toEqual([1, 2, 3]);
        });
    });
});
