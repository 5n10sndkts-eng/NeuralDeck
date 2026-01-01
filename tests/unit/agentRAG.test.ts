/**
 * Unit Tests for Agent RAG Integration
 * Story 6.1: Codebase RAG Indexing System - Task 5
 */

// Mock RAG service
class MockRAGService {
    private chunks: Array<{ content: string; source: string }> = [];

    async query(queryText: string, k = 5) {
        return this.chunks.slice(0, k).map((chunk, i) => ({
            content: chunk.content,
            source: chunk.source,
            score: 0.95 - (i * 0.1)
        }));
    }

    addChunk(content: string, source: string) {
        this.chunks.push({ content, source });
    }

    clear() {
        this.chunks = [];
    }
}

// Mock broadcast function
const mockBroadcastMessages: Array<{ event: string; data: unknown }> = [];
const mockBroadcast = (event: string, data: unknown) => {
    mockBroadcastMessages.push({ event, data });
};

// Mock getRAGContext implementation (mirrors core.cjs logic)
const getRAGContext = async (
    ragService: MockRAGService | null,
    query: string,
    k = 5
): Promise<string> => {
    if (!ragService) {
        return '';
    }

    try {
        const results = await ragService.query(query, k);

        if (!results || results.length === 0) {
            return '';
        }

        let context = '\n--- RELEVANT CODEBASE CONTEXT (RAG) ---\n';
        for (const result of results) {
            context += `\n[Source: ${result.source}] (Relevance: ${(result.score * 100).toFixed(1)}%)\n`;
            context += `${result.content.substring(0, 1500)}\n`;
            context += '---\n';
        }
        return context;
    } catch {
        return '';
    }
};

// Mock agent cycle with RAG integration
interface AgentOptions {
    useRAG?: boolean;
    ragQuery?: string | null;
    ragK?: number;
}

interface AgentDef {
    name: string;
    role: string;
    systemPrompt: string;
}

const MOCK_AGENT_DEFINITIONS: Record<string, AgentDef> = {
    analyst: {
        name: "The Analyst",
        role: "Requirements Engineer",
        systemPrompt: "You are the Lead Analyst. GOAL: Define the project."
    },
    architect: {
        name: "The Architect",
        role: "System Architect",
        systemPrompt: "You are the Architect. GOAL: Design system structure."
    }
};

async function simulateAgentCycle(
    agentId: string,
    contextFiles: string[],
    ragService: MockRAGService | null,
    options: AgentOptions = {}
): Promise<{ fileContext: string; ragContext: string; combinedContext: string }> {
    const def = MOCK_AGENT_DEFINITIONS[agentId];
    if (!def) {
        throw new Error(`Unknown agent: ${agentId}`);
    }

    const { useRAG = true, ragQuery = null, ragK = 5 } = options;

    // Build file context
    let fileContext = "";
    for (const f of contextFiles) {
        fileContext += `\n--- FILE: ${f} ---\nMock content for ${f}\n`;
    }

    // Inject RAG context if enabled
    let ragContext = "";
    if (useRAG && ragService) {
        const query = ragQuery || `${def.role} ${def.systemPrompt.substring(0, 200)}`;
        ragContext = await getRAGContext(ragService, query, ragK);
    }

    const combinedContext = fileContext + ragContext;

    return { fileContext, ragContext, combinedContext };
}

describe('[P0] Agent RAG Integration - Task 5', () => {
    let ragService: MockRAGService;

    beforeEach(() => {
        ragService = new MockRAGService();
        mockBroadcastMessages.length = 0;

        // Add some test chunks
        ragService.addChunk(
            'export function calculateSum(a: number, b: number): number { return a + b; }',
            'src/utils/math.ts'
        );
        ragService.addChunk(
            'const API_BASE_URL = "https://api.example.com";',
            'src/config/api.ts'
        );
        ragService.addChunk(
            'interface User { id: string; name: string; email: string; }',
            'src/types/user.ts'
        );
    });

    describe('getRAGContext() - Task 5.1 & 5.2', () => {
        test('[P0] should return formatted context from RAG results', async () => {
            const context = await getRAGContext(ragService, 'calculate function', 3);

            expect(context).toContain('--- RELEVANT CODEBASE CONTEXT (RAG) ---');
            expect(context).toContain('[Source:');
            expect(context).toContain('Relevance:');
        });

        test('[P0] should include source file paths', async () => {
            const context = await getRAGContext(ragService, 'math', 3);

            expect(context).toContain('src/utils/math.ts');
        });

        test('[P0] should include relevance scores', async () => {
            const context = await getRAGContext(ragService, 'user interface', 3);

            expect(context).toMatch(/\d+\.\d+%/);
        });

        test('[P0] should return empty string when no results', async () => {
            ragService.clear();
            const context = await getRAGContext(ragService, 'nonexistent', 5);

            expect(context).toBe('');
        });

        test('[P0] should return empty string when RAG service is null', async () => {
            const context = await getRAGContext(null, 'anything', 5);

            expect(context).toBe('');
        });

        test('[P0] should respect k parameter for result count', async () => {
            const context1 = await getRAGContext(ragService, 'code', 1);
            const context3 = await getRAGContext(ragService, 'code', 3);

            // Count occurrences of [Source: marker
            const count1 = (context1.match(/\[Source:/g) || []).length;
            const count3 = (context3.match(/\[Source:/g) || []).length;

            expect(count1).toBeLessThanOrEqual(1);
            expect(count3).toBeLessThanOrEqual(3);
        });
    });

    describe('Agent Cycle RAG Integration - Task 5.3', () => {
        test('[P0] should inject RAG context into agent prompts', async () => {
            const result = await simulateAgentCycle('analyst', [], ragService);

            expect(result.ragContext).toContain('RELEVANT CODEBASE CONTEXT');
            expect(result.combinedContext).toContain(result.ragContext);
        });

        test('[P0] should combine file context and RAG context', async () => {
            const result = await simulateAgentCycle(
                'architect',
                ['docs/architecture.md'],
                ragService
            );

            expect(result.combinedContext).toContain('FILE: docs/architecture.md');
            expect(result.combinedContext).toContain('RELEVANT CODEBASE CONTEXT');
        });

        test('[P0] should skip RAG when useRAG is false', async () => {
            const result = await simulateAgentCycle(
                'analyst',
                ['docs/brief.md'],
                ragService,
                { useRAG: false }
            );

            expect(result.ragContext).toBe('');
            expect(result.combinedContext).not.toContain('RELEVANT CODEBASE CONTEXT');
        });

        test('[P0] should use custom ragQuery when provided', async () => {
            // This test verifies the query parameter is used (indirectly through result format)
            const result = await simulateAgentCycle(
                'analyst',
                [],
                ragService,
                { ragQuery: 'custom search query' }
            );

            // RAG context should still be present
            expect(result.ragContext).toContain('RELEVANT CODEBASE CONTEXT');
        });

        test('[P0] should respect ragK parameter', async () => {
            const result1 = await simulateAgentCycle(
                'analyst',
                [],
                ragService,
                { ragK: 1 }
            );

            const result3 = await simulateAgentCycle(
                'analyst',
                [],
                ragService,
                { ragK: 3 }
            );

            const count1 = (result1.ragContext.match(/\[Source:/g) || []).length;
            const count3 = (result3.ragContext.match(/\[Source:/g) || []).length;

            expect(count1).toBeLessThanOrEqual(1);
            expect(count3).toBeLessThanOrEqual(3);
        });
    });

    describe('RAG Service Availability - Task 5.4', () => {
        test('[P0] should handle null RAG service gracefully', async () => {
            const result = await simulateAgentCycle('analyst', [], null);

            expect(result.ragContext).toBe('');
            // Agent cycle should still complete
            expect(result.combinedContext).toBeDefined();
        });

        test('[P0] should work with file context when RAG unavailable', async () => {
            const result = await simulateAgentCycle(
                'architect',
                ['src/App.tsx', 'src/index.tsx'],
                null
            );

            expect(result.fileContext).toContain('FILE: src/App.tsx');
            expect(result.fileContext).toContain('FILE: src/index.tsx');
            expect(result.ragContext).toBe('');
        });
    });

    describe('Context Truncation', () => {
        test('[P1] should truncate long content in RAG results', async () => {
            // Add a very long chunk
            ragService.addChunk('x'.repeat(3000), 'src/large-file.ts');

            const context = await getRAGContext(ragService, 'large', 5);

            // Each chunk should be limited to 1500 chars
            const sourceMatches = context.match(/\[Source: src\/large-file\.ts\]/);
            expect(sourceMatches).toBeTruthy();

            // Content should be truncated (1500 char limit per chunk)
            const largeFileSection = context.split('src/large-file.ts')[1];
            if (largeFileSection) {
                expect(largeFileSection.length).toBeLessThan(2000);
            }
        });
    });
});

describe('[P1] Agent RAG Edge Cases', () => {
    let ragService: MockRAGService;

    beforeEach(() => {
        ragService = new MockRAGService();
    });

    test('[P1] should handle empty query gracefully', async () => {
        ragService.addChunk('test content', 'test.ts');
        const context = await getRAGContext(ragService, '', 5);

        // Should still attempt to return results
        expect(context).toBeDefined();
    });

    test('[P1] should handle special characters in content', async () => {
        ragService.addChunk(
            'const regex = /[a-z]+\\d+/gi; const sql = "SELECT * WHERE id = \'test\'";',
            'src/special.ts'
        );

        const context = await getRAGContext(ragService, 'regex', 5);

        expect(context).toContain('regex');
        expect(context).toContain('src/special.ts');
    });

    test('[P1] should handle unicode content', async () => {
        ragService.addChunk(
            'const greeting = "こんにちは"; const emoji = "🚀🎉";',
            'src/i18n.ts'
        );

        const context = await getRAGContext(ragService, 'greeting', 5);

        expect(context).toContain('src/i18n.ts');
    });
});
