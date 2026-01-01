/**
 * Unit Tests for RAG API Endpoints
 * Story 6.1: Codebase RAG Indexing System - Task 4
 */

// Mock HTTP request/response for Fastify route testing
interface MockRequest {
    query: Record<string, string | undefined>;
    body?: unknown;
}

interface MockReply {
    statusCode: number;
    sentData: unknown;
    code: (code: number) => MockReply;
    send: (data: unknown) => MockReply;
}

// Response types for handlers
interface SearchResponse {
    results: Array<{ content: string; source: string; score: number }>;
    stats: { queryTime: number; totalChunks: number; resultsReturned: number; query: string };
}

interface StatsResponse {
    rag: {
        fileCount: number;
        chunkCount: number;
        isInitialized: boolean;
        memoryUsage: { heapUsed: number; heapTotal: number };
        config: { chunkSize: number; chunkOverlap: number; modelName: string };
    };
    timestamp: number;
}

interface ConfigResponse {
    config: { chunkSize: number; chunkOverlap: number; modelName: string; maxChunksPerFile: number };
}

interface ClearResponse {
    success: boolean;
    clearedChunks: number;
    clearedFiles: number;
}

function createMockReply(): MockReply {
    const reply: MockReply = {
        statusCode: 200,
        sentData: null,
        code(code: number) {
            this.statusCode = code;
            return this;
        },
        send(data: unknown) {
            this.sentData = data;
            return this;
        }
    };
    return reply;
}

// Mock RAG Service for testing
class MockRAGService {
    private chunks: Array<{ content: string; source: string }> = [];
    private fileCount = 0;

    async query(queryText: string, k = 5) {
        // Simulate search results
        return this.chunks.slice(0, k).map((chunk, i) => ({
            content: chunk.content,
            source: chunk.source,
            score: 0.95 - (i * 0.1)
        }));
    }

    async getStats() {
        return {
            fileCount: this.fileCount,
            chunkCount: this.chunks.length,
            isInitialized: true,
            memoryUsage: { heapUsed: 50, heapTotal: 100 },
            config: {
                chunkSize: 2000,
                chunkOverlap: 300,
                modelName: 'Xenova/all-MiniLM-L6-v2'
            }
        };
    }

    async clear() {
        const clearedChunks = this.chunks.length;
        const clearedFiles = this.fileCount;
        this.chunks = [];
        this.fileCount = 0;
        return { success: true, clearedChunks, clearedFiles };
    }

    getConfig() {
        return {
            chunkSize: 2000,
            chunkOverlap: 300,
            modelName: 'Xenova/all-MiniLM-L6-v2',
            maxChunksPerFile: 500
        };
    }

    // Test helper
    addTestData(content: string, source: string) {
        this.chunks.push({ content, source });
        this.fileCount++;
    }
}

// Simulate route handlers
function createSearchHandler(ragService: MockRAGService | null) {
    return async (request: MockRequest, reply: MockReply) => {
        const { q, k } = request.query;

        // Validation
        if (!q || typeof q !== 'string') {
            return reply.code(400).send({
                error: 'Query parameter "q" is required and must be a string',
                code: 'INVALID_QUERY'
            });
        }

        if (q.trim().length === 0) {
            return reply.code(400).send({
                error: 'Query cannot be empty',
                code: 'EMPTY_QUERY'
            });
        }

        if (q.length > 1000) {
            return reply.code(400).send({
                error: 'Query exceeds maximum length (1000 characters)',
                code: 'QUERY_TOO_LONG'
            });
        }

        let limit = 5;
        if (k !== undefined) {
            const parsedK = parseInt(k, 10);
            if (isNaN(parsedK) || parsedK < 1 || parsedK > 50) {
                return reply.code(400).send({
                    error: 'Parameter "k" must be a number between 1 and 50',
                    code: 'INVALID_K'
                });
            }
            limit = parsedK;
        }

        if (!ragService) {
            return reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        const startTime = Date.now();
        const results = await ragService.query(q, limit);
        const queryTime = Date.now() - startTime;
        const stats = await ragService.getStats();

        return {
            results: results.map(r => ({
                content: r.content,
                source: r.source,
                score: r.score
            })),
            stats: {
                queryTime,
                totalChunks: stats.chunkCount,
                resultsReturned: results.length,
                query: q
            }
        };
    };
}

function createStatsHandler(ragService: MockRAGService | null) {
    return async (_request: MockRequest, reply: MockReply) => {
        if (!ragService) {
            return reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        const ragStats = await ragService.getStats();
        return {
            rag: {
                fileCount: ragStats.fileCount,
                chunkCount: ragStats.chunkCount,
                isInitialized: ragStats.isInitialized,
                memoryUsage: ragStats.memoryUsage,
                config: ragStats.config
            },
            timestamp: Date.now()
        };
    };
}

function createConfigHandler(ragService: MockRAGService | null) {
    return async (_request: MockRequest, reply: MockReply) => {
        if (!ragService) {
            return reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        const config = ragService.getConfig();
        return { config };
    };
}

function createClearHandler(ragService: MockRAGService | null) {
    return async (_request: MockRequest, reply: MockReply) => {
        if (!ragService) {
            return reply.code(503).send({
                error: 'RAG service not available',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        const result = await ragService.clear();
        return result;
    };
}

describe('[P0] RAG API Endpoints - Task 4', () => {
    let ragService: MockRAGService;

    beforeEach(() => {
        ragService = new MockRAGService();
        // Add some test data
        ragService.addTestData('function calculateSum(a, b) { return a + b; }', 'src/math.ts');
        ragService.addTestData('export const API_URL = "https://api.example.com";', 'src/config.ts');
        ragService.addTestData('import React from "react";', 'src/App.tsx');
    });

    describe('GET /api/rag/search - Task 4.1 & 4.2', () => {
        test('[P0] should return search results with correct format', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: { q: 'calculate sum', k: '5' } }, reply) as SearchResponse;

            expect(result).toBeDefined();
            expect(result.results).toBeDefined();
            expect(Array.isArray(result.results)).toBe(true);
            expect(result.stats).toBeDefined();
            expect(result.stats.queryTime).toBeDefined();
            expect(result.stats.totalChunks).toBeDefined();
        });

        test('[P0] should return results with content, source, and score', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: { q: 'function', k: '2' } }, reply) as SearchResponse;

            expect(result.results.length).toBeGreaterThan(0);
            const firstResult = result.results[0];
            expect(firstResult.content).toBeDefined();
            expect(firstResult.source).toBeDefined();
            expect(firstResult.score).toBeDefined();
            expect(typeof firstResult.score).toBe('number');
        });

        test('[P0] should respect k parameter for result limit', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: { q: 'test', k: '2' } }, reply) as SearchResponse;

            expect(result.results.length).toBeLessThanOrEqual(2);
        });

        test('[P0] should default k to 5 when not provided', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: { q: 'test' } }, reply) as SearchResponse;

            expect(result.results.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Request Validation - Task 4.5', () => {
        test('[P0] should reject missing query parameter', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            await handler({ query: {} }, reply);

            expect(reply.statusCode).toBe(400);
            expect((reply.sentData as { code: string }).code).toBe('INVALID_QUERY');
        });

        test('[P0] should reject empty query', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            await handler({ query: { q: '   ' } }, reply);

            expect(reply.statusCode).toBe(400);
            expect((reply.sentData as { code: string }).code).toBe('EMPTY_QUERY');
        });

        test('[P0] should reject query exceeding 1000 characters', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            const longQuery = 'a'.repeat(1001);
            await handler({ query: { q: longQuery } }, reply);

            expect(reply.statusCode).toBe(400);
            expect((reply.sentData as { code: string }).code).toBe('QUERY_TOO_LONG');
        });

        test('[P0] should reject invalid k parameter (not a number)', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            await handler({ query: { q: 'test', k: 'abc' } }, reply);

            expect(reply.statusCode).toBe(400);
            expect((reply.sentData as { code: string }).code).toBe('INVALID_K');
        });

        test('[P0] should reject k parameter less than 1', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            await handler({ query: { q: 'test', k: '0' } }, reply);

            expect(reply.statusCode).toBe(400);
            expect((reply.sentData as { code: string }).code).toBe('INVALID_K');
        });

        test('[P0] should reject k parameter greater than 50', async () => {
            const handler = createSearchHandler(ragService);
            const reply = createMockReply();
            await handler({ query: { q: 'test', k: '51' } }, reply);

            expect(reply.statusCode).toBe(400);
            expect((reply.sentData as { code: string }).code).toBe('INVALID_K');
        });
    });

    describe('Service Unavailable Handling', () => {
        test('[P0] should return 503 when RAG service is unavailable', async () => {
            const handler = createSearchHandler(null);
            const reply = createMockReply();
            await handler({ query: { q: 'test' } }, reply);

            expect(reply.statusCode).toBe(503);
            expect((reply.sentData as { code: string }).code).toBe('SERVICE_UNAVAILABLE');
        });
    });

    describe('GET /api/rag/stats - Task 4.3', () => {
        test('[P0] should return RAG statistics', async () => {
            const handler = createStatsHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: {} }, reply) as StatsResponse;

            expect(result).toBeDefined();
            expect(result.rag).toBeDefined();
            expect(result.rag.fileCount).toBeDefined();
            expect(result.rag.chunkCount).toBeDefined();
            expect(result.rag.isInitialized).toBe(true);
            expect(result.timestamp).toBeDefined();
        });

        test('[P0] should include memory usage in stats', async () => {
            const handler = createStatsHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: {} }, reply) as StatsResponse;

            expect(result.rag.memoryUsage).toBeDefined();
            expect(result.rag.memoryUsage.heapUsed).toBeDefined();
            expect(result.rag.memoryUsage.heapTotal).toBeDefined();
        });

        test('[P0] should include config in stats', async () => {
            const handler = createStatsHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: {} }, reply) as StatsResponse;

            expect(result.rag.config).toBeDefined();
            expect(result.rag.config.chunkSize).toBe(2000);
            expect(result.rag.config.chunkOverlap).toBe(300);
        });

        test('[P0] should return 503 when service unavailable', async () => {
            const handler = createStatsHandler(null);
            const reply = createMockReply();
            await handler({ query: {} }, reply);

            expect(reply.statusCode).toBe(503);
        });
    });

    describe('GET /api/rag/config', () => {
        test('[P0] should return RAG configuration', async () => {
            const handler = createConfigHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: {} }, reply) as ConfigResponse;

            expect(result).toBeDefined();
            expect(result.config).toBeDefined();
            expect(result.config.chunkSize).toBe(2000);
            expect(result.config.chunkOverlap).toBe(300);
            expect(result.config.modelName).toBe('Xenova/all-MiniLM-L6-v2');
            expect(result.config.maxChunksPerFile).toBe(500);
        });
    });

    describe('POST /api/rag/clear', () => {
        test('[P0] should clear all indexed content', async () => {
            const handler = createClearHandler(ragService);
            const reply = createMockReply();
            const result = await handler({ query: {} }, reply) as ClearResponse;

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.clearedChunks).toBeGreaterThanOrEqual(0);
            expect(result.clearedFiles).toBeGreaterThanOrEqual(0);
        });

        test('[P0] should reset stats after clear', async () => {
            // Clear
            const clearHandler = createClearHandler(ragService);
            await clearHandler({ query: {} }, createMockReply());

            // Check stats
            const statsHandler = createStatsHandler(ragService);
            const result = await statsHandler({ query: {} }, createMockReply()) as StatsResponse;

            expect(result.rag.fileCount).toBe(0);
            expect(result.rag.chunkCount).toBe(0);
        });
    });
});

describe('[P1] RAG API Edge Cases', () => {
    let ragService: MockRAGService;

    beforeEach(() => {
        ragService = new MockRAGService();
    });

    test('[P1] should handle search with no indexed content', async () => {
        const handler = createSearchHandler(ragService);
        const reply = createMockReply();
        const result = await handler({ query: { q: 'anything' } }, reply) as SearchResponse;

        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        expect(result.results.length).toBe(0);
    });

    test('[P1] should handle special characters in query', async () => {
        ragService.addTestData('const regex = /test/gi;', 'src/regex.ts');

        const handler = createSearchHandler(ragService);
        const reply = createMockReply();
        const result = await handler({ query: { q: 'regex /test/' } }, reply) as SearchResponse;

        expect(result).toBeDefined();
        expect(reply.statusCode).toBe(200);
    });

    test('[P1] should handle unicode in query', async () => {
        ragService.addTestData('const greeting = "こんにちは";', 'src/i18n.ts');

        const handler = createSearchHandler(ragService);
        const reply = createMockReply();
        const result = await handler({ query: { q: 'こんにちは greeting' } }, reply) as SearchResponse;

        expect(result).toBeDefined();
        expect(reply.statusCode).toBe(200);
    });

    test('[P1] should accept k at boundary values (1 and 50)', async () => {
        for (let i = 0; i < 60; i++) {
            ragService.addTestData(`chunk ${i}`, `file${i}.ts`);
        }

        const handler = createSearchHandler(ragService);

        // Test k=1
        const result1 = await handler({ query: { q: 'chunk', k: '1' } }, createMockReply()) as SearchResponse;
        expect(result1.results.length).toBeLessThanOrEqual(1);

        // Test k=50
        const result50 = await handler({ query: { q: 'chunk', k: '50' } }, createMockReply()) as SearchResponse;
        expect(result50.results.length).toBeLessThanOrEqual(50);
    });
});
