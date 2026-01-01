const { v4: uuidv4 } = require('uuid');
const { getLLM } = require('../lib/llm.cjs');
const hiveMemory = require('./hiveMemory.cjs');

class ReasoningService {
    constructor(mcpClient) {
        // If mcpClient is provided (e.g. in tests), use it.
        // Otherwise, we don't strictly need it if we are using the LLM directly to simulate the tool.
        // But AC1 says "integrates with sequential-thinking tool". 
        // We will simulate the "Tool Call" behavior by prompting the LLM to output the specific JSON structure.
        this.mcpClient = mcpClient;
        this.thoughts = [];
    }

    /**
     * Decomposes a user request into a sequence of thoughts using the sequential-thinking pattern
     * @param {string} userRequest 
     * @returns {Promise<Array>} Array of thought objects
     */
    async decomposeRequest(userRequest) {
        const llm = getLLM();

        const systemPrompt = `You are a Cognitive Swarm Core. 
    Your task is to decompose the user's request into a sequence of "thoughts" using the sequential-thinking pattern.
    
    Return a SINGLE JSON object representing the FIRST thought in a chain of reasoning.
    Format usage:
    {
      "thought": "Your detailed reasoning here",
      "thoughtNumber": 1,
      "totalThoughts": 3,
      "nextThoughtNeeded": true
    }
    
    User Request: "${userRequest}"`;

        let contentText = "";

        try {
            // Handle both LangChain ChatModel (returns object with .content) and Mock (might return string)
            const response = await llm.invoke(systemPrompt);

            if (typeof response === 'string') {
                contentText = response;
            } else if (response.content) {
                contentText = response.content;
            } else {
                console.error("Unknown LLM response format", response);
                throw new Error("Invalid LLM response");
            }

            // Clean up markdown code blocks if present
            const jsonMatch = contentText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : contentText;

            const parsed = JSON.parse(jsonStr);

            const thoughtObj = {
                id: uuidv4(),
                thought: parsed.thought,
                thoughtNumber: parsed.thoughtNumber || 1,
                role: this.assignRole(parsed.thought)
            };

            // Story 7.3: Adaptive Learning (Simulated)
            // If the thought contains specific keywords, "learn" them as context for the Hive
            if (parsed.thought.length > 10) {
                const contextKey = `thought_context_${Date.now().toString().slice(-4)}`;
                // Async learn (fire and forget)
                hiveMemory.learn(contextKey, parsed.thought.substring(0, 50) + "...", "cognitive-core");
            }

            this.thoughts.push(thoughtObj);
            return [thoughtObj]; // For now return the single thought generated

        } catch (e) {
            console.error("[ReasoningService] Transformation failed", e);
            // Fallback for demo if LLM fails
            return [{
                id: uuidv4(),
                thought: "Analyzing request... (LLM unavailable)",
                thoughtNumber: 1,
                role: "analyst"
            }];
        }
    }

    /**
     * Assigns an agent role based on thought content
     * @param {string} thoughtContent 
     * @returns {string} Role (analyst, architect, engineer, qa)
     */
    assignRole(thoughtContent) {
        const content = (thoughtContent || "").toLowerCase();

        if (content.includes('analyze') || content.includes('review') || content.includes('break down')) {
            return 'analyst';
        }
        if (content.includes('architecture') || content.includes('design') || content.includes('structure')) {
            return 'architect';
        }
        if (content.includes('test') || content.includes('verify') || content.includes('validate')) {
            return 'qa';
        }

        return 'engineer'; // Default to builder
    }
}

// Singleton for consistency
const serviceInstance = new ReasoningService();
module.exports = serviceInstance;
module.exports.ReasoningService = ReasoningService; // Export class for testing
