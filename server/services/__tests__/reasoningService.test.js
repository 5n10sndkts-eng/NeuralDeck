const { ReasoningService } = require('../reasoningService.cjs');

// Mock LLM module
jest.mock('../../lib/llm.cjs', () => ({
    getLLM: jest.fn()
}));

const { getLLM } = require('../../lib/llm.cjs');

describe('ReasoningService', () => {
    let service;
    let mockLLM;

    beforeEach(() => {
        service = new ReasoningService();
        mockLLM = {
            invoke: jest.fn()
        };
        getLLM.mockReturnValue(mockLLM);
    });

    describe('decomposeRequest', () => {
        it('should successfully decompose a complex request into thoughts', async () => {
            const userRequest = "Analyze the security";

            const mockResponse = {
                content: JSON.stringify({
                    thought: "First, I need to review the existing login code",
                    thoughtNumber: 1,
                    totalThoughts: 3,
                    nextThoughtNeeded: true
                })
            };

            mockLLM.invoke.mockResolvedValue(mockResponse);

            const thoughts = await service.decomposeRequest(userRequest);

            expect(mockLLM.invoke).toHaveBeenCalledWith(expect.stringContaining(userRequest));
            expect(thoughts).toBeDefined();
            expect(Array.isArray(thoughts)).toBe(true);
            expect(thoughts[0].thought).toContain("review the existing login code");
            expect(thoughts[0].role).toBe('analyst');
        });

        it('should assign roles to thoughts', async () => {
            const thoughtContent = "Review security architecture";
            const role = service.assignRole(thoughtContent);
            expect(role).toBe('analyst');
        });

        it('should fallback to default thought if LLM fails', async () => {
            mockLLM.invoke.mockRejectedValue(new Error("API Error"));
            const thoughts = await service.decomposeRequest("fail me");
            expect(thoughts[0].thought).toContain("LLM unavailable");
        });
    });
});
