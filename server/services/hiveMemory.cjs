/**
 * Hive Memory Service (Story 7.3)
 * Central shared memory for agents to store and retrieve context.
 */

class HiveMemoryService {
    constructor() {
        // Map<key, { value, sourceAgent, confidence, timestamp }>
        this.memory = new Map();

        // Pre-load some "instincts" (demo data)
        this.learn("project_type", "React + Vite + Fastify", "system");
    }

    /**
     * Store a fact in the Hive
     */
    learn(key, value, sourceAgent = 'unknown', confidence = 0.8) {
        if (!key || !value) return false;

        this.memory.set(key.toLowerCase(), {
            value,
            sourceAgent,
            confidence,
            timestamp: Date.now()
        });

        console.log(`[Hive] Learned: ${key} = ${value} (from ${sourceAgent})`);
        return true;
    }

    /**
     * Retrieve a fact by key
     */
    recall(key) {
        return this.memory.get(key.toLowerCase());
    }

    /**
     * Get all memories (for visualization)
     */
    getAllMemories() {
        return Array.from(this.memory.entries()).map(([key, data]) => ({
            key,
            ...data
        }));
    }

    /**
     * Search memory values
     */
    search(query) {
        const q = query.toLowerCase();
        return Array.from(this.memory.entries())
            .filter(([key, data]) =>
                key.includes(q) ||
                String(data.value).toLowerCase().includes(q)
            )
            .map(([key, data]) => ({ key, ...data }));
    }
}

const hiveMemory = new HiveMemoryService();
module.exports = hiveMemory;
