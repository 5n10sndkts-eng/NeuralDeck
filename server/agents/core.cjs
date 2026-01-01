const fs = require('fs').promises;
const path = require('path');
const { broadcast } = require('../services/socket.cjs');

// --- RAG SERVICE (Story 6-1: Task 5) ---
let ragService = null;
try {
    ragService = require('../lib/rag.cjs');
} catch (e) {
    console.warn('[AGENT CORE] RAG service not available:', e.message);
}

// --- RAG CONTEXT RETRIEVAL (Task 5.1, 5.2) ---
/**
 * Retrieve relevant codebase context for a given query using RAG
 * @param {string} query - The query to search for
 * @param {number} k - Number of results to return (default: 5)
 * @returns {Promise<string>} Formatted context string
 */
const getRAGContext = async (query, k = 5) => {
    if (!ragService) {
        return '';
    }

    try {
        const results = await ragService.query(query, k);

        if (!results || results.length === 0) {
            return '';
        }

        // Task 5.2: Format RAG results as context
        let context = '\n--- RELEVANT CODEBASE CONTEXT (RAG) ---\n';
        for (const result of results) {
            context += `\n[Source: ${result.source}] (Relevance: ${(result.score * 100).toFixed(1)}%)\n`;
            context += `${result.content.substring(0, 1500)}\n`;
            context += '---\n';
        }
        return context;
    } catch (e) {
        console.warn('[AGENT CORE] RAG query failed:', e.message);
        return '';
    }
};

// --- AGENT DEFINITIONS ---
const AGENT_DEFINITIONS = {
    analyst: {
        name: "The Analyst",
        role: "Requirements Engineer",
        systemPrompt: "You are the Lead Analyst. GOAL: Define the project based on the user's request. ACTION: Create or update 'docs/project_brief.md'. CONTENT: Include Vision, Core Features, and Tech Stack. TOOL: Use 'fs_write'."
    },
    pm: {
        name: "The PM",
        role: "Product Manager",
        systemPrompt: "You are the Product Manager. GOAL: Create a PRD based on 'docs/project_brief.md'. ACTION: Create 'docs/prd.md'. CONTENT: Define User Flows, Data Models, and detailed API Endpoints. TOOL: Use 'read_file' to read brief, then 'fs_write'."
    },
    architect: {
        name: "The Architect",
        role: "System Architect",
        systemPrompt: "You are the Architect. GOAL: Scaffold the project structure based on 'docs/prd.md'. ACTION: Create 'docs/architecture.md'. TOOL: Use 'fs_write'."
    },
    sm: {
        name: "Scrum Master",
        role: "Agile Coach",
        systemPrompt: "You are the Scrum Master. GOAL: Break down 'docs/architecture.md' into small coding stories. ACTION: Create story files in 'stories/' directory. FORMAT: Start with 'Status: Todo'. TOOL: Use 'fs_write'."
    },
    swarm: {
        name: "Swarm Developer",
        role: "Senior Engineer",
        systemPrompt: "You are a Senior Developer. GOAL: Pick a 'Status: Todo' story from 'stories/', implement it in 'src/', and mark it 'Status: Done'. TOOL: Use 'read_file' and 'fs_write'."
    }
};

// --- LLM INTERFACE (Server-Side) ---
const sendChat = async (messages) => {
    try {
        // Call the local Fastify Unified Gateway
        const response = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                config: { provider: 'vllm', baseUrl: 'http://localhost:8000/v1' } // Default to local
            })
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e) {
        console.error("LLM Error:", e);
        return "System Error: LLM Unreachable";
    }
};

// --- TOOLS ---
const TOOLS = {
    read_file: async ({ filePath }) => {
        try {
            return await fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
        } catch (e) { return `Error: ${e.message}`; }
    },
    fs_write: async ({ filePath, content }) => {
        try {
            const p = path.resolve(process.cwd(), filePath);
            await fs.mkdir(path.dirname(p), { recursive: true });
            await fs.writeFile(p, content, 'utf-8');
            return "Success";
        } catch (e) { return `Error: ${e.message}`; }
    }
};

// --- AGENT CYCLE ---
/**
 * Run a single agent cycle with optional RAG context injection
 * @param {string} agentId - ID of the agent to run
 * @param {string[]} contextFiles - Array of file paths to include as context
 * @param {object} options - Optional configuration
 * @param {boolean} options.useRAG - Whether to inject RAG context (default: true)
 * @param {string} options.ragQuery - Custom query for RAG (defaults to agent goal)
 * @param {number} options.ragK - Number of RAG results to include (default: 5)
 */
const runAgentCycle = async (agentId, contextFiles = [], options = {}) => {
    const def = AGENT_DEFINITIONS[agentId];
    if (!def) return;

    const { useRAG = true, ragQuery = null, ragK = 5 } = options;

    broadcast('agent:log', { msg: `[${def.name}] Waking up...`, type: 'info' });

    // 1. Build File Context
    let fileContext = "";
    for (const f of contextFiles) {
        const content = await TOOLS.read_file({ filePath: f });
        fileContext += `\n--- FILE: ${f} ---\n${content.substring(0, 5000)}\n`;
    }

    // 2. Task 5.1 & 5.3: Inject RAG context if enabled
    let ragContext = "";
    if (useRAG && ragService) {
        // Use custom query or derive from agent role/goal
        const query = ragQuery || `${def.role} ${def.systemPrompt.substring(0, 200)}`;
        broadcast('agent:log', { msg: `[${def.name}] Querying codebase context...`, type: 'info' });

        ragContext = await getRAGContext(query, ragK);

        if (ragContext) {
            broadcast('agent:log', {
                msg: `[${def.name}] Found ${ragK} relevant code snippets`,
                type: 'success'
            });
        }
    }

    // 3. Build messages with combined context
    const combinedContext = fileContext + ragContext;

    const messages = [
        {
            role: 'system',
            content: `${def.systemPrompt}\n\nCONTEXT:\n${combinedContext}\n\nOUTPUT FORMAT:\nReturn a JSON object: { "thought": "string", "tool": "fs_write" | "read_file", "parameters": { ... } }.`
        },
        { role: 'user', content: "Begin execution." }
    ];

    broadcast('agent:thought', { agent: def.name, text: "Analyzing context..." });

    const responseText = await sendChat(messages);

    // Parse JSON
    try {
        const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanText.substring(cleanText.indexOf('{'), cleanText.lastIndexOf('}') + 1));

        broadcast('agent:thought', { agent: def.name, text: json.thought || "Executing..." });

        if (json.tool && TOOLS[json.tool]) {
            broadcast('agent:log', { msg: `[${def.name}] Executing ${json.tool}...`, type: 'command' });
            const result = await TOOLS[json.tool](json.parameters);
            broadcast('agent:log', { msg: `[${def.name}] Tool Result: ${result}`, type: 'success' });
            return result;
        }
    } catch (e) {
        broadcast('agent:log', { msg: `[${def.name}] Parse/Exec Error: ${e.message}`, type: 'error' });
    }
};

/**
 * Query the RAG service directly (Task 5.4: Expose for other modules)
 * @param {string} query - Search query
 * @param {number} k - Number of results
 * @returns {Promise<Array>} RAG search results
 */
const queryRAG = async (query, k = 5) => {
    if (!ragService) {
        return [];
    }
    try {
        return await ragService.query(query, k);
    } catch (e) {
        console.warn('[AGENT CORE] RAG query failed:', e.message);
        return [];
    }
};

/**
 * Check if RAG service is available
 * @returns {boolean}
 */
const isRAGAvailable = () => {
    return ragService !== null;
};

module.exports = { runAgentCycle, AGENT_DEFINITIONS, getRAGContext, queryRAG, isRAGAvailable };
