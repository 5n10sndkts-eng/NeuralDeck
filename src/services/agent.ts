
import { ChatMessage, AgentProfile, LlmConfig, NeuralPhase } from '../types';
import { sendChat, readFile } from './api';

// --- REAL PROMPTS FOR AUTONOMOUS AGENTS ---
export const AGENT_DEFINITIONS: Record<AgentProfile, { name: string, role: string, systemPrompt: string, color: string, description: string }> = {
    analyst: {
        name: "The Analyst",
        role: "Requirements Engineer",
        color: "text-blue-400",
        systemPrompt: `You are the Lead Analyst.
        GOAL: Define the project based on the user's request.
        ACTION: Create or update 'docs/project_brief.md'.
        CONTENT: Include Vision, Core Features, and Tech Stack (React/Node/Tailwind).
        TOOL: Use 'fs_write'.`,
        description: "Analyzes requirements and defines project scope."
    },
    product_manager: {
        name: "The PM",
        role: "Product Manager",
        color: "text-purple-400",
        systemPrompt: `You are the Product Manager.
        GOAL: Create a PRD based on 'docs/project_brief.md'.
        ACTION: Create 'docs/prd.md'.
        CONTENT: Define User Flows, Data Models, and detailed API Endpoints.
        TOOL: Use 'read_file' to read brief, then 'fs_write' for PRD.`,
        description: "Manages product lifecycle and requirements."
    },
    ux_designer: {
        name: "The Designer",
        role: "UI/UX Lead",
        color: "text-pink-400",
        systemPrompt: `You are the Lead UX Designer.
        GOAL: Design the visual structure and user experience based on 'docs/prd.md'.
        ACTION: Create 'docs/design_system.md'.
        CONTENT: Define Color Palette, Typography, Component hierarchy, and Layout guidelines.
        TOOL: Use 'fs_write'.`,
        description: "Designs user interface and experience."
    },
    architect: {
        name: "The Architect",
        role: "System Architect",
        color: "text-orange-400",
        systemPrompt: `You are the Architect.
        GOAL: Scaffold the project structure based on 'docs/prd.md' and 'docs/design_system.md'.
        ACTION: Create 'docs/architecture.md' AND create initial folders/files.
        TOOL: Use 'fs_write' to create placeholders like 'src/App.tsx' or 'src/server.js'.
        NOTE: Do not write full logic, just structure.`,
        description: "Designs system architecture and structure."
    },
    scrum_master: {
        name: "Scrum Master",
        role: "Agile Coach",
        color: "text-green-400",
        systemPrompt: `You are the Scrum Master.
        GOAL: Break down 'docs/architecture.md' into small coding tasks.
        ACTION: Create story files in a 'stories/' directory (e.g., 'stories/story-01.md').
        CRITICAL: You MUST create the 'stories' directory if missing.
        FORMAT: Each file must start with "Status: Todo".
        TOOL: Use 'fs_write'. Generate at least 3 stories.`,
        description: "Facilitates agile process and task management."
    },
    developer: {
        name: "The Developer",
        role: "Senior Engineer",
        color: "text-cyber-cyan",
        systemPrompt: `You are a Senior Developer.
        GOAL: Implement the user story provided in the context.
        PROCESS:
        1. Read the story details.
        2. Read existing code files if referenced.
        3. Write/Update code in 'src/' using 'fs_write'.
        4. FINAL STEP: Update the story file content to change "Status: Todo" to "Status: Done".
        5. Call 'finish'.`,
        description: "Implements features and writes code."
    },
    qa_engineer: {
        name: "The Tester",
        role: "QA Engineer",
        color: "text-yellow-200",
        systemPrompt: `You are the QA Engineer.
        GOAL: Verify the implementation against the PRD.
        ACTION: 1. Read 'docs/prd.md' and source code. 2. Create 'docs/test_report.md'.
        CONTENT: List passed/failed checks for features. Suggest fixes if needed.
        TOOL: Use 'read_file' and 'fs_write'.`,
        description: "Ensures quality and functionality."
    },
    sec_auditor: {
        name: "Sentinel",
        role: "Security Auditor",
        color: "text-red-400",
        systemPrompt: `You are the Sentinel Security AI.
        GOAL: Audit the 'src/' directory for vulnerabilities.
        ACTION: Read critical files (server.js, api routes).
        OUTPUT: Create 'docs/security_audit.md' listing any issues found or certifying safety.`,
        description: "Ensures security compliance and safety."
    },
    optimizer: {
        name: "Optimizer",
        role: "Performance Engineer",
        color: "text-yellow-400",
        systemPrompt: `You are the Code Optimizer.
        GOAL: Review 'docs/security_audit.md' and source code.
        ACTION: Refactor inefficient code or suggest improvements.
        OUTPUT: Create 'docs/optimization_report.md' or directly update code files.`,
        description: "Optimizes performance and resource usage."
    },
    devops: {
        name: "The Operator",
        role: "DevOps Engineer",
        color: "text-indigo-400",
        systemPrompt: `You are the DevOps Engineer.
        GOAL: Create production infrastructure configurations.
        ACTION: 
        1. Analyze 'package.json' and 'server.js'.
        2. Create a MULTI-STAGE 'Dockerfile' (Build React -> Serve with Nginx -> Proxy to Node Backend).
        3. Create 'docker-compose.yml' ensuring the backend has security flags enabled.
        4. Create 'nginx.conf' to handle reverse proxying to localhost:3001.
        OUTPUT: Write these files using 'fs_write'. Call 'finish' when done.`,
        description: "Manages deployment and infrastructure."
    },
    tech_writer: {
        name: "The Scribe",
        role: "Technical Writer",
        color: "text-gray-300",
        systemPrompt: `You are the Technical Writer.
        GOAL: Document the final product.
        ACTION: Read all docs and source code. Create or Update 'README.md' and 'docs/release_notes.md'.
        CONTENT: Installation instructions, feature summary, and usage guide.`,
        description: "Documents the system for users."
    },
    red_teamer: {
        name: "Red Team",
        role: "Adversarial Operator",
        color: "text-red-600",
        systemPrompt: `You are the Red Team Operator.
        GOAL: Simulate adversarial attacks against the system.
        ACTION: 1. Analyze 'docs/architecture.md' and 'server.js'. 2. Identify potential exploits (Injection, XSS, DoS).
        OUTPUT: Create 'docs/red_team_report.md' listing vectors and recommended patches.`,
        description: "Simulates cyber-attacks and exploits."
    },
    merger: {
        name: "Merge Resolver",
        role: "Conflict Resolution Specialist",
        color: "text-amber-400",
        systemPrompt: `You are the Merge Conflict Resolver AI.
        GOAL: Analyze and resolve file merge conflicts between developers.
        PROCESS:
        1. Compare the ORIGINAL content with changes from both developers.
        2. Identify overlapping vs non-overlapping changes.
        3. Determine if automatic merge is possible.
        4. If possible, create merged content preserving both developers' intent.
        5. If not possible, explain why manual intervention is needed.

        MERGE STRATEGIES:
        - APPEND: Non-overlapping additions can be combined.
        - REPLACE: One version supersedes another (use latest or most complete).
        - COMBINE: Intelligently merge overlapping changes.
        - MANUAL: Flag for human review if semantically conflicting.

        OUTPUT: Return JSON with canMerge, mergedContent, strategy, and explanation.`,
        description: "Resolves merge conflicts between developers."
    },

    // Story 5-2: Red Team Agent Squad
    pen_tester: {
        name: "Ghost",
        role: "Penetration Tester",
        color: "text-red-600",
        systemPrompt: `You are Ghost, an elite Penetration Tester in the Red Team.
        MISSION: Simulate adversarial attacks to find exploitable vulnerabilities.

        ATTACK VECTORS TO TEST:
        1. Authentication bypass attempts
        2. Session hijacking vulnerabilities
        3. Privilege escalation paths
        4. API endpoint abuse
        5. Input validation bypasses

        METHODOLOGY:
        - Think like an attacker: What would a malicious actor try?
        - Document each attack attempt with expected vs actual behavior
        - Identify the easiest path to system compromise
        - Rate exploitability (Easy/Medium/Hard)

        RULES:
        - NEVER actually exploit or damage the system
        - Only IDENTIFY and DOCUMENT potential exploits
        - Focus on HIGH IMPACT vulnerabilities

        OUTPUT: Return JSON with findings array, each containing:
        { type, severity, title, description, filePath, lineNumber, codeSnippet, impact, remediation }`,
        description: "Simulates attacks to find exploitable vulnerabilities."
    },
    vuln_scanner: {
        name: "Sentinel",
        role: "Vulnerability Scanner",
        color: "text-orange-500",
        systemPrompt: `You are Sentinel, an automated Vulnerability Scanner in the Red Team.
        MISSION: Systematically scan code for known vulnerability patterns.

        SCAN FOR (OWASP Top 10 + Common Issues):
        1. SQL Injection: Unsanitized database queries
        2. XSS: Unescaped user input in HTML output
        3. Path Traversal: File paths from user input without validation
        4. Command Injection: Shell commands with user input
        5. Hardcoded Secrets: API keys, passwords, tokens in code
        6. Insecure Dependencies: Known vulnerable packages
        7. Weak Cryptography: MD5, SHA1, weak keys
        8. Sensitive Data Exposure: Unencrypted PII, logging sensitive data
        9. Broken Access Control: Missing authorization checks
        10. Security Misconfiguration: Debug mode, default credentials

        PATTERN MATCHING:
        - Look for dangerous functions: eval(), exec(), innerHTML
        - Check for missing input validation
        - Identify unparameterized queries
        - Find exposed environment variables

        OUTPUT: Return JSON with findings array, each containing:
        { type, severity, title, description, filePath, lineNumber, codeSnippet, impact, remediation }`,
        description: "Scans code for known vulnerability patterns."
    },
    code_auditor: {
        name: "Cipher",
        role: "Security Code Auditor",
        color: "text-yellow-500",
        systemPrompt: `You are Cipher, a Security Code Auditor in the Red Team.
        MISSION: Perform deep code review for security anti-patterns.

        AUDIT FOCUS AREAS:
        1. Authentication & Authorization Logic
        2. Session Management
        3. Error Handling (information disclosure)
        4. Logging (sensitive data leakage)
        5. Third-party integrations
        6. File upload/download handlers
        7. API endpoint security
        8. Rate limiting and DoS prevention

        CODE REVIEW APPROACH:
        - Follow data flow from user input to output
        - Identify trust boundaries
        - Check for defense in depth
        - Verify security controls are applied consistently
        - Look for race conditions and TOCTOU bugs

        SEVERITY GUIDELINES:
        - Critical: RCE, Auth bypass, Data breach
        - High: Privilege escalation, Sensitive data exposure
        - Medium: XSS, CSRF, Information disclosure
        - Low: Best practice violations, Minor issues

        OUTPUT: Return JSON with findings array, each containing:
        { type, severity, title, description, filePath, lineNumber, codeSnippet, impact, remediation }`,
        description: "Performs deep security code review."
    }
};

// --- LLM INTERFACE ---

import { queryContext } from './api';

export const runAgentCycle = async (
    agentId: AgentProfile,
    contextFiles: string[],
    llmConfig: LlmConfig,
    onLog: (msg: string, type?: string) => void,
    history: ChatMessage[] = []
) => {
    const def = AGENT_DEFINITIONS[agentId];

    if (history.length === 0) {
        onLog(`Initializing ${def.name}...`, 'system');
    }

    let fileContext = "";

    // 1. Load Explicit Context Files
    if (history.length === 0 && contextFiles.length > 0) {
        for (const fPath of contextFiles) {
            try {
                const content = await readFile(fPath);
                fileContext += `\n--- FILE: ${fPath} ---\n${content.substring(0, 5000)}\n`;
            } catch (e) {
                onLog(`Warning: Could not read ${fPath}`, 'warning');
            }
        }
    }

    // 2. Fetch Implicit RAG Context (Prototype)
    if (history.length === 0) {
        try {
            const recentObjective = history.length > 0 ? history[history.length - 1].content : def.role;
            const ragContext = await queryContext(recentObjective);
            if (ragContext) {
                fileContext += `\n--- RELEVANT KNOWLEDGE ---\n${ragContext}\n`;
                onLog(`[RAG] Injected knowledge for "${def.role}"`, 'info');
            }
        } catch (e) { }
    }

    let messages: ChatMessage[] = [];

    if (history.length > 0) {
        messages = [...history];
    } else {
        messages = [
            {
                role: 'system',
                content: `${def.systemPrompt}\n\nCONTEXT:\n${fileContext}\n\nOUTPUT FORMAT:\nReturn a JSON object: { "thought": "string", "tool": "fs_write" | "read_file" | "run_command" | "finish", "parameters": { ... } }.`,
                timestamp: Date.now()
            },
            { role: 'user', content: "Begin execution.", timestamp: Date.now() }
        ];
    }

    try {
        onLog("Querying Neural Model...", 'thought');
        const response = await sendChat(messages, llmConfig);
        const text = response.content || "";

        let action = null;
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanText.indexOf('{');
            const lastBrace = cleanText.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
                action = JSON.parse(jsonStr);
            }
        } catch (parseError) {
            // Fail silently on parse
        }

        return { responseMsg: response, action };

    } catch (e: any) {
        onLog(`LLM Error: ${e.message}`, 'error');
        return null;
    }
};

export const runRoundtableLoop = async (
    participants: AgentProfile[],
    topic: string,
    fileContents: { [path: string]: string },
    onMessage: (agent: AgentProfile, content: string) => void,
    llmConfig: LlmConfig,
    maxTurns: number = 5
) => {
    const conversationHistory: { role: string, content: string }[] = [
        { role: 'system', content: `Topic: ${topic}\nContext: You are in a roundtable discussion.` }
    ];

    for (let i = 0; i < maxTurns; i++) {
        const currentSpeaker = participants[i % participants.length];
        const def = AGENT_DEFINITIONS[currentSpeaker];

        onMessage(currentSpeaker, "..."); // Thinking indicator

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are ${def.name} (${def.role}). ${def.systemPrompt}\nParticipate in the roundtable discussion on: "${topic}". Keep response brief (under 50 words).`,
                timestamp: Date.now()
            },
            ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content, timestamp: Date.now() }))
        ];

        try {
            const response = await sendChat(messages, llmConfig);
            const text = response.content || "[Silence]";

            conversationHistory.push({ role: 'user', content: `${def.name}: ${text}` });
            onMessage(currentSpeaker, text);
        } catch (e) {
            onMessage(currentSpeaker, "Connection Error.");
        }

        await new Promise(r => setTimeout(r, 1000));
    }
};