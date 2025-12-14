# Architecture Overview: NeuralDeck

**NeuralDeck** is a high-fidelity, autonomous AI workstation designed with a "Corporate Cyberpunk" aesthetic. It serves as a local-first development environment that visualizes and executes AI agent workflows.

## System Architecture

The system is built as a **Monolith** combining a React frontend with an Express backend.

### 1. Frontend (The Neural Grid)
- **Framework:** React + Vite
- **UI library:** Custom "CyberUI" components using Tailwind CSS and Framer Motion for animations.
- **Visualization:** `ReactFlow` is used to render "The Synapse" (Node Graph) and "The Living Circuit".
- **State Management:** Custom hooks like `useNeuralAutonomy` drive the agent state machine.
- **Key Views:**
  - **The Laboratory:** Main workspace for AI interaction.
  - **The Synapse:** Visual workflow editor.
  - **The Council:** Agent management and status.
  - **The Grid:** Package management and script runner.
  - **The Board:** Kanban-style task tracking.

### 2. Backend (The Core)
- **Runtime:** Node.js (Express)
- **Entry Point:** `server.js`
- **Security:**
  - **Helmet.js:** secures HTTP headers (CSP disabled for local dev).
  - **Rate Limiting:** Protects against DDoS/overload.
  - **Input Sanitization:** "Safe Shell" execution prevents command injection.
- **Capabilities:**
  - **LLM Gateway:** Proxies requests to Local (Ollama/vLLM) or Cloud (OpenAI) models.
  - **File System Access:** Provides API endpoints (`/api/read`, `/api/write`) for agents to manipulate the workspace.
  - **Tool Execution:** safely executes allowed shell commands (git, npm) via MCP-like endpoints.

## Security & Deployment
- **Deployment Protocol:** "Ascension" (defined in `DEPLOYMENT_BRIEF.md`).
- **Containerization:** Supports Multi-stage Docker builds with Nginx reverse proxy.
- **Environment:** Transitioning to `.env.production` for secret management.

## Agent System (BMAD / Neural)
- **Workflow:** Analysis -> Design -> Architecture -> Scrum -> Swarm -> Testing -> Security -> Optimization.
- **Autonomy:** Agents can autonomously read files, write code, and trigger subsequent phases.
- **Red Team:** Includes adversarial agents ("Sentinel", "Red Teamer") for security auditing and "War Room" simulations.
