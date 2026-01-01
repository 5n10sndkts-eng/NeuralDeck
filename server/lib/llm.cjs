const { ChatOpenAI } = require("@langchain/openai");

/**
 * LLM Service Factory
 * Provides a unified interface for getting LLM instances.
 * Falls back to a mock if no API key is present.
 */
class LLMService {
    constructor() {
        this.model = null;
        this.provider = 'mock';
    }

    initialize() {
        // specific configuration loading
        const apiKey = process.env.OPENAI_API_KEY;
        const modelName = process.env.LLM_MODEL || "gpt-4-turbo-preview"; // Default to a smart model

        if (apiKey) {
            try {
                this.model = new ChatOpenAI({
                    openAIApiKey: apiKey,
                    modelName: modelName,
                    temperature: 0.7,
                });
                this.provider = 'openai';
                console.log(`[LLM] Initialized OpenAI model: ${modelName}`);
            } catch (e) {
                console.warn("[LLM] Failed to initialize OpenAI, falling back to mock", e);
            }
        } else {
            console.warn("[LLM] No OPENAI_API_KEY found, using Mock LLM");
        }
    }

    /**
     * Get the configured LLM instance
     * @returns {BaseChatModel|MockLLM}
     */
    getLLM() {
        if (!this.model) {
            this.initialize();
        }

        if (this.provider === 'mock' && !this.model) {
            return new MockLLM();
        }

        return this.model;
    }
}

/**
 * Simple Mock LLM for demonstration/development without keys
 */
class MockLLM {
    async invoke(prompt) {
        console.log("[MockLLM] Invoked with prompt length:", prompt.length);

        // Return a simulated response in sequential-thinking format
        return {
            content: JSON.stringify({
                thought: "Analysis: This requires a multi-step approach. [MOCK]",
                thoughtNumber: 1,
                totalThoughts: 3,
                nextThoughtNeeded: true
            })
        };
    }

    // LangChain compatibility
    async call(messages) {
        return this.invoke(messages[0].content);
    }
}

const llmService = new LLMService();
module.exports = { getLLM: () => llmService.getLLM() };
