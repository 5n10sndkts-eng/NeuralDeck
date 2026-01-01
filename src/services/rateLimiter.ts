/**
 * Rate Limiter Service - Story 4-2 Task 3
 *
 * Manages API rate limits for parallel LLM calls.
 * Implements request queuing, exponential backoff, and rate limit tracking.
 */

// --- INTERFACES ---

export interface RateLimitConfig {
    maxConcurrent: number;          // Max concurrent requests
    requestsPerMinute: number;      // Rate limit per minute
    retryAfterMs: number;           // Default retry delay
    maxRetries: number;             // Max retry attempts
    backoffMultiplier: number;      // Exponential backoff multiplier
}

export interface RateLimitState {
    currentConcurrent: number;
    requestsThisMinute: number;
    minuteStartTime: number;
    isRateLimited: boolean;
    retryAfter?: number;
}

export interface QueuedRequest<T> {
    id: string;
    execute: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    priority: number;
    retryCount: number;
    addedAt: number;
}

export interface RateLimitMetrics {
    totalRequests: number;
    successfulRequests: number;
    rateLimitedRequests: number;
    retriedRequests: number;
    averageWaitTime: number;
    peakConcurrent: number;
}

// --- DEFAULT CONFIG ---

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxConcurrent: 5,
    requestsPerMinute: 60,
    retryAfterMs: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
};

// --- RATE LIMITER CLASS ---

export class RateLimiter {
    private config: RateLimitConfig;
    private state: RateLimitState;
    private queue: QueuedRequest<any>[];
    private metrics: RateLimitMetrics;
    private processing: boolean;
    private waitTimes: number[];

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
        this.state = {
            currentConcurrent: 0,
            requestsThisMinute: 0,
            minuteStartTime: Date.now(),
            isRateLimited: false,
        };
        this.queue = [];
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            rateLimitedRequests: 0,
            retriedRequests: 0,
            averageWaitTime: 0,
            peakConcurrent: 0,
        };
        this.processing = false;
        this.waitTimes = [];
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if we're within rate limits
     */
    private canMakeRequest(): boolean {
        this.resetMinuteIfNeeded();

        // Check concurrent limit
        if (this.state.currentConcurrent >= this.config.maxConcurrent) {
            return false;
        }

        // Check rate limit
        if (this.state.requestsThisMinute >= this.config.requestsPerMinute) {
            return false;
        }

        // Check if currently rate limited
        if (this.state.isRateLimited && this.state.retryAfter) {
            if (Date.now() < this.state.retryAfter) {
                return false;
            }
            // Rate limit period expired
            this.state.isRateLimited = false;
            this.state.retryAfter = undefined;
        }

        return true;
    }

    /**
     * Reset minute counter if needed
     */
    private resetMinuteIfNeeded(): void {
        const now = Date.now();
        if (now - this.state.minuteStartTime >= 60000) {
            this.state.requestsThisMinute = 0;
            this.state.minuteStartTime = now;
        }
    }

    /**
     * Calculate backoff delay with exponential increase
     */
    private calculateBackoff(retryCount: number): number {
        return this.config.retryAfterMs * Math.pow(this.config.backoffMultiplier, retryCount);
    }

    /**
     * Handle rate limit response (HTTP 429)
     */
    public handleRateLimitResponse(retryAfterHeader?: string): void {
        this.state.isRateLimited = true;
        this.metrics.rateLimitedRequests++;

        // Parse retry-after header if provided
        const retryAfterMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : this.config.retryAfterMs;

        this.state.retryAfter = Date.now() + retryAfterMs;

        console.log(`[RateLimiter] Rate limited. Retry after: ${retryAfterMs}ms`);
    }

    /**
     * Process the request queue
     */
    private async processQueue(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0 && this.canMakeRequest()) {
            // Sort by priority (higher first) then by added time (older first)
            this.queue.sort((a, b) => {
                if (a.priority !== b.priority) return b.priority - a.priority;
                return a.addedAt - b.addedAt;
            });

            const request = this.queue.shift();
            if (!request) continue;

            const waitTime = Date.now() - request.addedAt;
            this.waitTimes.push(waitTime);
            if (this.waitTimes.length > 100) this.waitTimes.shift();

            this.state.currentConcurrent++;
            this.state.requestsThisMinute++;
            this.metrics.totalRequests++;

            if (this.state.currentConcurrent > this.metrics.peakConcurrent) {
                this.metrics.peakConcurrent = this.state.currentConcurrent;
            }

            // Execute request asynchronously
            this.executeRequest(request);
        }

        this.processing = false;

        // If queue still has items, schedule retry
        if (this.queue.length > 0) {
            const delay = this.state.isRateLimited && this.state.retryAfter
                ? this.state.retryAfter - Date.now()
                : 100;

            setTimeout(() => this.processQueue(), Math.max(delay, 100));
        }
    }

    /**
     * Execute a single request with error handling
     */
    private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
        try {
            const result = await request.execute();
            this.state.currentConcurrent--;
            this.metrics.successfulRequests++;
            request.resolve(result);
        } catch (error: any) {
            this.state.currentConcurrent--;

            // Check if it's a rate limit error
            if (error.status === 429 || error.message?.includes('rate limit')) {
                this.handleRateLimitResponse(error.headers?.get?.('retry-after'));

                // Retry if under max retries
                if (request.retryCount < this.config.maxRetries) {
                    const backoff = this.calculateBackoff(request.retryCount);
                    request.retryCount++;
                    this.metrics.retriedRequests++;

                    console.log(`[RateLimiter] Retrying request ${request.id} after ${backoff}ms (attempt ${request.retryCount})`);

                    setTimeout(() => {
                        this.queue.push(request);
                        this.processQueue();
                    }, backoff);

                    return;
                }
            }

            request.reject(error);
        }

        // Process more from queue
        this.processQueue();
    }

    /**
     * Queue a request for rate-limited execution
     */
    public async enqueue<T>(
        execute: () => Promise<T>,
        priority: number = 0
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const request: QueuedRequest<T> = {
                id: this.generateRequestId(),
                execute,
                resolve,
                reject,
                priority,
                retryCount: 0,
                addedAt: Date.now(),
            };

            this.queue.push(request);
            console.log(`[RateLimiter] Queued request ${request.id}. Queue size: ${this.queue.length}`);

            this.processQueue();
        });
    }

    /**
     * Execute multiple requests with rate limiting
     * Uses Promise.allSettled for fault tolerance
     */
    public async executeAll<T>(
        executions: Array<() => Promise<T>>,
        priority: number = 0
    ): Promise<PromiseSettledResult<T>[]> {
        const promises = executions.map(exec => this.enqueue(exec, priority));
        return Promise.allSettled(promises);
    }

    /**
     * Get current rate limit state
     */
    public getState(): RateLimitState {
        this.resetMinuteIfNeeded();
        return { ...this.state };
    }

    /**
     * Get rate limiter metrics
     */
    public getMetrics(): RateLimitMetrics {
        const averageWaitTime = this.waitTimes.length > 0
            ? this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length
            : 0;

        return {
            ...this.metrics,
            averageWaitTime,
        };
    }

    /**
     * Get remaining capacity
     */
    public getRemainingCapacity(): { concurrent: number; perMinute: number } {
        this.resetMinuteIfNeeded();
        return {
            concurrent: this.config.maxConcurrent - this.state.currentConcurrent,
            perMinute: this.config.requestsPerMinute - this.state.requestsThisMinute,
        };
    }

    /**
     * Get queue length
     */
    public getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Clear the queue (cancel pending requests)
     */
    public clearQueue(): number {
        const count = this.queue.length;
        this.queue.forEach(req => {
            req.reject(new Error('Queue cleared'));
        });
        this.queue = [];
        return count;
    }

    /**
     * Reset the rate limiter state
     */
    public reset(): void {
        this.clearQueue();
        this.state = {
            currentConcurrent: 0,
            requestsThisMinute: 0,
            minuteStartTime: Date.now(),
            isRateLimited: false,
        };
        this.waitTimes = [];
    }
}

// --- SINGLETON INSTANCE ---

let globalRateLimiter: RateLimiter | null = null;

/**
 * Get or create global rate limiter instance
 */
export const getRateLimiter = (config?: Partial<RateLimitConfig>): RateLimiter => {
    if (!globalRateLimiter) {
        globalRateLimiter = new RateLimiter(config);
    }
    return globalRateLimiter;
};

/**
 * Reset global rate limiter
 */
export const resetRateLimiter = (): void => {
    if (globalRateLimiter) {
        globalRateLimiter.reset();
    }
    globalRateLimiter = null;
};

export default RateLimiter;
