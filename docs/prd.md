---
stepsCompleted: [2]
inputDocuments: ['DEPLOYMENT_BRIEF.md', 'architecture_overview.md', 'api_endpoints.md']
workflowType: 'prd'
project_name: 'NeuralDeck'
author: 'Moe & Mary (Analyst)'
date: '2025-12-14'
---

# Product Requirements Document (PRD): NeuralDeck v2.0

## 1. Executive Summary
**NeuralDeck** is a high-fidelity, autonomous AI Project Manager and Development Environment designed with a "Corporate Cyberpunk" aesthetic. Unlike standard chat interfaces, it visualizes the software development lifecycle (SDLC) as a living "Neural Circuit" (Node Graph), allowing users to monitor parallel agent execution ("The Swarm") and interact via a diegetic "Netrunner" terminal.

**Core Value Proposition:**
- **Visual Autonomy:** See the AI thinking and moving data between nodes (n8n-style).
- **Parallel Execution:** "Developer Swarm" spawns multiple agents to implement stories simultaneously.
- **Local-First:** Direct file system access with robust security hardening.
- **Immersion:** A gamified, high-end UI that makes coding feel like hacking the matrix.

## 2. User Personas
- **The Architect:** Wants to see the high-level system design and data flow (The Synapse).
- **The Operator:** Monitoring the automated build/deploy pipelines (The Grid).
- **The Netrunner:** Interacts via CLI/Terminal for rapid commands (The Terminal).

## 3. Functional Requirements

### 3.1 The Neural Circuit (Autonomous Engine)
* **FR-3.1.1 Visual State Machine:** The app MUST render the BMAD workflow as a ReactFlow graph.
    * **Nodes:** User Input -> Analyst -> PM -> Architect -> Scrum Master -> Swarm -> QA -> Security.
    * **States:** IDLE (Dim), THINKING (Pulsing Cyan), WORKING (Rotating Spinner), DONE (Solid Green).
* **FR-3.1.2 Data Packets:** When an agent completes a task, a visual "Data Packet" animation MUST travel along the connecting edge to the next agent.
* **FR-3.1.3 Tool Execution Info:** Each node MUST display a "mini-log" showing the last tool used (e.g., `file_system.write`, `web.search`) and its status.

### 3.2 The Developer Swarm (Parallelism)
* **FR-3.2.1 Dynamic Spawning:** When the Scrum Master outputs a list of Stories (Markdown), the graph MUST dynamically spawn one "Developer Node" per story.
* **FR-3.2.2 Parallel Processing:** All Developer Nodes MUST execute their LLM calls in parallel (using `Promise.all` or independent async/await loops).
* **FR-3.2.3 Conflict Resolution:** (Future) If two developers edit the same file, the "Merge Conflict" agent is triggered.

### 3.3 The "War Room" (Security)
* **FR-3.3.1 Scan Protocol:** The UI MUST toggle to "Red Alert" mode (Red Theme) on demand.
* **FR-3.3.2 Adversarial Agents:** A specific "Red Team" agent squad MUST be selectable to audit code and attempt "penetration testing" of the user's project.
* **FR-3.3.3 Threat Assessment:** A dashboard panel MUST show identified vulnerabilities (Critical/High/Medium/Low).

### 3.4 The Core (Backend & Tools)
* **FR-3.4.1 Secure Gateway:** The `server.js` MUST use Helmet.js and Rate Limiting.
* **FR-3.4.2 Tool Whitelist:** The system MUST strictly enforce a whitelist of shell commands. No `rm -rf /` allowed.
* **FR-3.4.3 Docker Integration:** The "DevOps" agent MUST be able to generate and test Dockerfiles.

### 3.5 High-Compliance Context RAG
* **FR-3.5.1 Auto-Ingestion:** The system MUST watch the workspace (`./`) and automatically chunk/embed code files into a local Vector Store.
* **FR-3.5.2 Context injection:** All Agent prompts MUST be dynamically injected with relevant file snippets (High-Compliance) to ensure the LLM has full visibility, minimizing refusal due to "lack of information".
* **FR-3.5.3 Persona Configuration:** The system MUST allow custom System Prompts (e.g., "Senior Engineer Mode") to enforce strict instruction following for coding tasks.

## 4. Technical Constraints
* **Frontend:** React 18+, Vite, Tailwind CSS (Custom Config), Framer Motion.
* **Backend:** Node.js (Express), Native `fs` module.
* **AI:** Universal Gateway (OpenAI / Anthropic / Local vLLM Proxy).
* **Deployment:** Docker Compose + Nginx.

## 5. UI/UX Design Specifications ("The Cyberpunk 2099" Theme)
* **Color Palette:**
    * Void Black: `#050505` (Background)
    * Electric Cyan: `#00f0ff` (Primary/Active)
    * Acid Purple: `#bc13fe` (AI Thinking)
    * Crimson Red: `#ff003c` (Error/Danger)
* **Typography:** Monospace (e.g., JetBrains Mono, Fira Code) for data; Industrial Sans (e.g., Orbitron, Exo) for headers.
* **Interactions:** "Glitch" effects on hover, CRT scanlines on terminal output, glassmorphism for panels.

## 6. Success Metrics
* **Autonomy:** System can go from "PRD" to "5 Implemented Story Files" without human intervention.
* **Performance:** "Swarm" execution of 5 stories takes < 2x the time of a single story (proving parallelism).
* **Aesthetics:** User "Wow" factor verified via UI Review.
