# Architecture Document: NeuralDeck v2.0

## 1. System Overview
**NeuralDeck** is a local-first, autonomous AI development environment. It operates as a **Monolithic Web Application** where a React frontend ("The Neural Grid") communicates with a Node.js/Express backend ("The Core") to visualize and execute AI workflows.

## 2. Component Architecture

### 2.1 Frontend: The Neural Grid (React + Vite)
Responsible for visualization, user interaction, and client-side agent state.
- **`components/NeuralGrid`**: The primary workspace. Uses `ReactFlow` to render the "Living Circuit".
- **`hooks/useNeuralAutonomy`**: The "Brain". A custom hook that implements the BMAD State Machine.
    - *State:* `idle` | `analysis` | `architecture` | `implementation` (Swarm).
    - *Logic:* Polls the file system via Backend API to determine when to trigger the next agent.
- **`components/TheTerminal`**: Diegetic CLI. Renders stdout/stderr from backend shell commands.
- **`components/TheSynapse`**: Visual editor for the RAG Vector Store (future expansion).

### 2.2 Backend: The Core (Node.js + Fastify)
Responsible for file I/O, LLM proxying, and secure tool execution.
- **`server.js`**: Main entry point.
    - **Middleware**: `fastify-helmet` (Security), `fastify-cors`, `fastify-rate-limit`.
    - **Routes**:
        - `/api/chat`: Unified Gateway to OpenAI/Ollama.
        - `/api/files`: Recursive file listing.
        - `/api/rag/ingest`: (NEW) Triggers file chunking & embedding.
        - `/api/rag/query`: (NEW) Semantic search for agent context.
- **`lib/rag.ts`** (NEW): Handles the "High-Compliance" Context.
    - Uses `langchain` + `TensorFlow.js` (Universal Encoder) for local embeddings.
    - Stores vectors in-memory (or `LevelDB` for persistence).

### 2.3 The "Swarm" Engine
To satisfy **FR-3.2 (Parallelism)**:
1.  **Trigger:** Scrum Master writes `stories/story-*.md`.
2.  **Detection:** `useNeuralAutonomy` detects new files in `stories/`.
3.  **Spawn:** The hook dynamically adds `DeveloperNode` components to the ReactFlow graph.
4.  **Execution:** The hook fires `Promise.all()` to call `/api/chat` for each developer node simultaneously.

## 3. Data Flow

### 3.1 The Autonomous Loop
1.  **User** inputs goal -> **Analyst** (Agent).
2.  **Analyst** calls `/api/rag/query` for context -> Generates `project_brief.md`.
3.  **Core** writes file to disk.
4.  **Autonomy Hook** detects file -> Triggers **PM**.
5.  **PM** reads brief -> Generates `prd.md`.
6.  **Scrum Master** reads PRD -> Generates `stories/*.md`.
7.  **Swarm** activates -> Developers read stories -> Write code to `src/`.

## 4. Technology Stack & Dependencies
| Component | Tech Choice | Justification |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | High performance, ecosystem support. |
| **Visualization** | ReactFlow | Industry standard for node graphs. |
| **Styling** | Tailwind CSS + Framer Motion | "Cyberpunk" aesthetic requirements. |
| **Backend** | Fastify | High-throughput, low overhead, schema-based validation. |
| **RAG/AI** | LangChain.js | "High-Compliance" context management. |
| **Embeddings** | Xenova/transformers (Local) | Zero-cost local embedding generation. |

## 5. File Structure
```
neural-deck/
├── src/
│   ├── components/
│   │   ├── NeuralGrid.tsx    # Main Graph View
│   │   ├── CircuitNode.tsx   # Individual Agent UI
│   │   └── CyberUI.tsx       # Reusable Cyberpunk Components
│   ├── hooks/
│   │   └── useNeuralAutonomy.ts # The Autonomy Brain
├── server/
│   ├── server.js             # API Gateway
│   └── lib/
│       └── rag.ts            # (NEW) RAG Engine
├── docs/                     # Project Documentation
└── package.json
```

## 6. Security Considerations
- **Command Whitelist:** Only specific commands (`npm install`, `git`, `ls`) are allowed.
- **Path Traversal:** Middleware prevents accessing files outside `process.cwd()`.
- **API Keys:** Stored in `.env.local` (Client) or memory; never committed.
