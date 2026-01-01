---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['prd.md', 'architecture.md', 'ux-design-specification.md']
advancedElicitation: ['Cross-Functional War Room', 'Pre-mortem Analysis', 'First Principles Analysis']
workflowType: 'create-epics-and-stories'
workflowStatus: 'complete'
date: '2025-12-16'
---

# NeuralDeckProjects - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for NeuralDeckProjects, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-3.1.1: Visual State Machine - The app MUST render the BMAD workflow as a ReactFlow graph with nodes (User Input -> Analyst -> PM -> Architect -> Scrum Master -> Swarm -> QA -> Security) and states (IDLE (Dim), THINKING (Pulsing Cyan), WORKING (Rotating Spinner), DONE (Solid Green)).

FR-3.1.2: Data Packets - When an agent completes a task, a visual "Data Packet" animation MUST travel along the connecting edge to the next agent.

FR-3.1.3: Tool Execution Info - Each node MUST display a "mini-log" showing the last tool used (e.g., `file_system.write`, `web.search`) and its status.

FR-3.2.1: Dynamic Spawning - When the Scrum Master outputs a list of Stories (Markdown), the graph MUST dynamically spawn one "Developer Node" per story.

FR-3.2.2: Parallel Processing - All Developer Nodes MUST execute their LLM calls in parallel (using `Promise.all` or independent async/await loops).

FR-3.2.3: Conflict Resolution - (Future) If two developers edit the same file, the "Merge Conflict" agent is triggered.

FR-3.3.1: Scan Protocol - The UI MUST toggle to "Red Alert" mode (Red Theme) on demand.

FR-3.3.2: Adversarial Agents - A specific "Red Team" agent squad MUST be selectable to audit code and attempt "penetration testing" of the user's project.

FR-3.3.3: Threat Assessment - A dashboard panel MUST show identified vulnerabilities (Critical/High/Medium/Low).

FR-3.4.1: Secure Gateway - The `server.js` MUST use Helmet.js and Rate Limiting.

FR-3.4.2: Tool Whitelist - The system MUST strictly enforce a whitelist of shell commands. No `rm -rf /` allowed.

FR-3.4.3: Docker Integration - The "DevOps" agent MUST be able to generate and test Dockerfiles.

FR-3.5.1: Auto-Ingestion - The system MUST watch the workspace (`./`) and automatically chunk/embed code files into a local Vector Store.

FR-3.5.2: Context injection - All Agent prompts MUST be dynamically injected with relevant file snippets (High-Compliance) to ensure the LLM has full visibility, minimizing refusal due to "lack of information".

FR-3.5.3: Persona Configuration - The system MUST allow custom System Prompts (e.g., "Senior Engineer Mode") to enforce strict instruction following for coding tasks.

### NonFunctional Requirements

NFR-1: Performance - "Swarm" execution of 5 stories takes < 2x the time of a single story (proving parallelism).

NFR-2: Aesthetics - User "Wow" factor verified via UI Review (Cyberpunk 2099 theme).

NFR-3: Autonomy - System can go from "PRD" to "5 Implemented Story Files" without human intervention.

NFR-4: Frontend Technology - React 18+, Vite, Tailwind CSS (Custom Config), Framer Motion.

NFR-5: Backend Technology - Node.js (Express), Native `fs` module.

NFR-6: AI Gateway - Universal Gateway (OpenAI / Anthropic / Local vLLM Proxy).

NFR-7: Deployment - Docker Compose + Nginx.

NFR-8: Performance - Locked 60fps, UI must never freeze even when processing hundreds of agent tasks.

NFR-9: Responsive Design - Smart Rendering prioritizing frame rate over particle count.

NFR-10: Browser Compatibility - Support for modern browsers with WebGL support.

### Additional Requirements

**From Architecture:**
- Frontend uses React 18, Vite, ReactFlow for visualization, Tailwind CSS + Framer Motion for styling
- Backend uses Fastify with fastify-helmet (Security), fastify-cors, fastify-rate-limit middleware
- Routes: `/api/chat` (Unified Gateway), `/api/files` (Recursive file listing), `/api/rag/ingest` (File chunking & embedding), `/api/rag/query` (Semantic search)
- RAG Engine uses `langchain` + `TensorFlow.js` (Universal Encoder) for local embeddings, stores vectors in-memory (or `LevelDB` for persistence)
- Command Whitelist: Only specific commands (`npm install`, `git`, `ls`) are allowed
- Path Traversal: Middleware prevents accessing files outside `process.cwd()`
- API Keys: Stored in `.env.local` (Client) or memory; never committed
- File Structure: `src/components/`, `src/hooks/`, `server/`, `server/lib/`, `docs/`

**From UX Design:**
- Color Palette: Void Black `#050505` (Background), Electric Cyan `#00f0ff` (Primary/Active), Acid Purple `#bc13fe` (AI Thinking), Crimson Red `#ff003c` (Error/Danger)
- Typography: Monospace (JetBrains Mono, Fira Code) for data; Industrial Sans (Orbitron, Exo) for headers
- Interactions: "Glitch" effects on hover, CRT scanlines on terminal output, glassmorphism for panels
- LOD System: Tactical (1-10 agents, full fidelity), Strategic (10-50 agents, simplified nodes), Hive (50+ agents, auto-cluster)
- Safe Mode: Global toggle to disable chromatic aberration and shake
- Performance Tiers: Cinematic (Default - Bloom, Motion Blur, CRT Scanlines, Particles), Competitive (Flat vectors, high contrast, no post-processing)
- Hybrid Control Scheme: CyberDeck (Cmd+K command palette), Tactical HUD (Status Sidebar), Neural Circuit (Main Viewport with Pan/Zoom)
- Diegetic UI: Menus unfold like holographic projections
- Micro-interactions: Hover effects trigger data decoding animations
- Soundscapes: Subtle hums and clicks (toggleable) enforce the machine aesthetic

### FR Coverage Map

FR-3.1.1: Epic 2 - Visual State Machine rendering with ReactFlow graph
FR-3.1.2: Epic 2 - Data Packet animations between agent nodes
FR-3.1.3: Epic 2 - Tool execution info display on nodes
FR-3.2.1: Epic 4 - Dynamic spawning of Developer Nodes per story
FR-3.2.2: Epic 4 - Parallel processing of Developer Nodes
FR-3.2.3: Epic 4 - Conflict resolution for merge conflicts (Future)
FR-3.3.1: Epic 5 - Red Alert mode toggle
FR-3.3.2: Epic 5 - Adversarial Red Team agent squad
FR-3.3.3: Epic 5 - Threat assessment dashboard
FR-3.4.1: Epic 1 - Secure Gateway with Helmet.js and Rate Limiting
FR-3.4.2: Epic 1 - Tool whitelist enforcement + Basic file conflict detection
FR-3.4.3: Epic 1 - Docker integration for DevOps agent
FR-3.5.1: Epic 3 - Auto-ingestion of workspace files into Vector Store
FR-3.5.2: Epic 3 - Context injection into agent prompts
FR-3.5.3: Epic 3 - Persona configuration for custom System Prompts

## Recommended Execution Paths

### MVP Path (Core Functionality)
**Epic 1 → Epic 3 → Epic 4**
- Delivers core autonomous development capability
- Agents have context (RAG) and can execute in parallel (Swarm)
- Visualization (Epic 2) is optional but recommended for user experience

### Security-First Path
**Epic 1 → Epic 5 → (Epic 3 for enhanced analysis)**
- Enables security auditing immediately after foundation
- Epic 5 works with Epic 1 alone, but benefits significantly from Epic 3's code understanding
- Can add Epic 3 later to enhance vulnerability detection

### Full Experience Path (Recommended)
**Epic 1 → Epic 2 + Epic 3 (parallel) → Epic 4 → Epic 5**
- Epic 1 provides foundation
- Epic 2 and Epic 3 can start in parallel after Epic 1
- Epic 4 requires Epic 1 and Epic 3 (Epic 2 optional but recommended)
- Epic 5 can start after Epic 1, but better after Epic 3 for intelligent analysis

### Execution Timeline Notes
- **After Epic 1:** Epic 2 and Epic 3 can start in parallel
- **After Epic 3 completes:** Epic 4 can start (Epic 2 optional)
- **After Epic 1:** Epic 5 can start, but recommended to wait for Epic 3 for enhanced analysis
- **Epic 4's conflict resolution (FR-3.2.3):** Builds on Epic 1's basic file conflict detection

## Epic List

### Epic 1: Core Infrastructure & Security Foundation
Users can securely run NeuralDeck with a protected backend, secure tool execution, basic file conflict detection, shared file watcher service, and Docker deployment capabilities.
**FRs covered:** FR-3.4.1, FR-3.4.2 (enhanced with file conflict detection), FR-3.4.3
**Additional Infrastructure:** Shared file watcher service for Epic 2 and Epic 3 to prevent polling conflicts
**Dependencies:** None (foundation epic)
**Notes:** Must be completed before all other epics. Includes basic file-level conflict detection to prevent Epic 4 failures. Provides shared file watcher service to prevent conflicts between Epic 2 (visualization) and Epic 3 (RAG auto-ingestion).

### Epic 3: High-Compliance Context RAG
Users get intelligent, context-aware AI responses with automatic code understanding, relevant file injection, and customizable persona configuration. This enables all agent interactions to be contextually aware and customizable.
**FRs covered:** FR-3.5.1, FR-3.5.2, FR-3.5.3
**Dependencies:** Epic 1 (requires secure backend and shared file watcher service)
**Parallelization:** Can start in parallel with Epic 2 after Epic 1 is stable
**Notes:** Critical for agent effectiveness. Should be prioritized before visualization since agents need context to be useful. Includes all three RAG FRs: auto-ingestion, context injection, and persona configuration.

### Epic 2: Neural Circuit Visualization
Users can see the AI workflow as an interactive visual graph showing agent states, data flow, and tool execution. Provides immediate visual feedback and engagement.
**FRs covered:** FR-3.1.1, FR-3.1.2, FR-3.1.3
**Dependencies:** Epic 1 (requires backend API and shared file watcher service)
**Parallelization:** Can start in parallel with Epic 3 after Epic 1 is stable
**Notes:** Provides user engagement and feedback, but agents can function without it. Visualization enhances but doesn't block agent operations. Uses shared file watcher service from Epic 1 to monitor file system changes.

### Epic 4: Developer Swarm (Parallel Execution)
Users can execute multiple development stories simultaneously, dramatically reducing implementation time through parallel agent execution.
**FRs covered:** FR-3.2.1, FR-3.2.2, FR-3.2.3
**Dependencies:** Epic 1 (file conflict detection - required), Epic 3 (RAG for context - required)
**Benefits From:** Epic 2 (visualization provides feedback but not required for functionality)
**Notes:** Requires Epic 1 and Epic 3 to function. Epic 2 is optional but highly recommended for user experience. Epic 3 must be complete before starting Epic 4. Epic 4 will work without Epic 2, but users won't see parallel execution visually. Epic 4's conflict resolution (FR-3.2.3) builds on Epic 1's basic file conflict detection, adding merge conflict agent capabilities.

### Epic 5: War Room Security Suite
Users can audit their codebase for vulnerabilities and run adversarial security testing with Red Team agents.
**FRs covered:** FR-3.3.1, FR-3.3.2, FR-3.3.3
**Dependencies:** Epic 1 (security foundation - required)
**Benefits From:** Epic 3 (RAG code understanding significantly enhances security analysis capabilities)
**Notes:** Requires Epic 1 to function. Can be developed in parallel with Epic 2 and Epic 3 after Epic 1, but benefits significantly from Epic 3's code understanding capabilities for more intelligent vulnerability detection. Can follow Security-First Path (Epic 1 → Epic 5) for immediate security auditing, then add Epic 3 later for enhanced analysis.

## Epic 1: Core Infrastructure & Security Foundation

Users can securely run NeuralDeck with a protected backend, secure tool execution, basic file conflict detection, shared file watcher service, and Docker deployment capabilities.

### Story 1.1: Secure Backend Gateway

As a System Administrator,
I want the backend server to use security middleware (Helmet.js) and rate limiting,
So that the NeuralDeck system is protected against common web vulnerabilities and abuse.

**Acceptance Criteria:**

**Given** the NeuralDeck backend server is starting
**When** the server initializes
**Then** Fastify must be configured with `fastify-helmet` plugin enabled
**And** `fastify-rate-limit` plugin must be configured with appropriate limits (e.g., 100 requests per minute per IP)
**And** CORS must be configured via `fastify-cors` to allow frontend connections
**And** all security headers (X-Content-Type-Options, X-Frame-Options, etc.) must be set via Helmet

**Given** a client makes API requests to the backend
**When** the request rate exceeds the configured limit
**Then** the server must return HTTP 429 (Too Many Requests)
**And** the response must include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)

**Given** the server is running
**When** a request is made to any `/api/*` endpoint
**Then** all security headers from Helmet must be present in the response
**And** the server must log security events (rate limit violations, blocked requests)

### Story 1.2: Tool Execution Security

As a System Administrator,
I want the system to enforce a whitelist of allowed shell commands and prevent path traversal attacks,
So that malicious or destructive commands cannot be executed, protecting the user's system.

**Acceptance Criteria:**

**Given** an agent attempts to execute a shell command
**When** the command is submitted to the backend
**Then** the system must validate the command against a whitelist of allowed commands
**And** only commands in the whitelist (`npm install`, `git`, `ls`, and other approved commands) are permitted
**And** commands like `rm -rf /` or `rm -rf *` must be rejected with an error

**Given** a command includes file paths
**When** the command is processed
**Then** the system must validate that all file paths are within `process.cwd()`
**And** any path traversal attempts (e.g., `../../../etc/passwd`) must be blocked
**And** the system must return an error for path traversal attempts

**Given** a whitelisted command is executed
**When** the command completes
**Then** the system must log the command execution (command, arguments, exit code)
**And** the system must return stdout/stderr to the requesting agent
**And** failed commands (non-zero exit code) must be logged with error details

**Given** the system receives a command request
**When** the command is not in the whitelist
**Then** the system must reject the command with a clear error message
**And** the rejection must be logged as a security event
**And** no command execution must occur

### Story 1.3: File System Infrastructure

As a System Administrator,
I want a shared file watcher service and basic file conflict detection,
So that multiple system components can monitor file changes without conflicts, and parallel operations can detect file access conflicts.

**Acceptance Criteria:**

**Given** the backend server is running
**When** the system initializes
**Then** a shared file watcher service must be created and available to all components
**And** the file watcher must use Node.js `fs.watch` or `chokidar` library
**And** the file watcher must emit events for file creation, modification, and deletion

**Given** multiple components (Epic 2 visualization, Epic 3 RAG) need to monitor file changes
**When** they subscribe to the shared file watcher service
**Then** all subscribers must receive file change events
**And** the file watcher must prevent duplicate polling or multiple watchers on the same files
**And** file change events must include file path, event type (create/update/delete), and timestamp

**Given** two agents attempt to modify the same file simultaneously
**When** the first agent acquires a file lock
**Then** the second agent must be notified that the file is locked
**And** the system must track file locks with agent identifiers and timestamps
**And** file locks must automatically expire after a configurable timeout (e.g., 5 minutes)

**Given** a file is locked by an agent
**When** the agent completes its operation
**Then** the file lock must be released
**And** waiting agents must be notified that the file is available
**And** the system must log file lock acquisitions and releases

**Given** the file watcher service is active
**When** a file change occurs in the workspace
**Then** all subscribed components must receive the change event within 1 second
**And** the file watcher must handle rapid file changes without missing events
**And** the service must continue operating even if individual subscribers fail

### Story 1.4: Docker Integration

As a DevOps Engineer,
I want the DevOps agent to generate and test Dockerfiles,
So that deployment configurations can be created and validated automatically.

**Acceptance Criteria:**

**Given** the DevOps agent needs to create a Dockerfile
**When** the agent requests Dockerfile generation
**Then** the system must provide an API endpoint (e.g., `/api/docker/generate`) that accepts project configuration
**And** the endpoint must generate a valid Dockerfile based on project type (Node.js, Python, etc.)
**And** the generated Dockerfile must follow Docker best practices (multi-stage builds, minimal base images, etc.)

**Given** a Dockerfile has been generated
**When** the agent requests Dockerfile validation
**Then** the system must provide an API endpoint (e.g., `/api/docker/validate`) that tests the Dockerfile
**And** the validation must attempt to build the Docker image using `docker build`
**And** the validation must return build success/failure status and any error messages

**Given** a Dockerfile validation is requested
**When** the Docker build process runs
**Then** the system must execute the build in a sandboxed environment
**And** build output (stdout/stderr) must be captured and returned to the agent
**And** build failures must include specific error messages and line numbers

**Given** the Docker integration is active
**When** a Dockerfile is generated and validated
**Then** the system must store the Dockerfile in the project root or specified location
**And** the system must log Docker operations (generate, validate, build) for audit purposes
**And** the system must clean up temporary Docker images created during validation

## Epic 3: High-Compliance Context RAG

Users get intelligent, context-aware AI responses with automatic code understanding, relevant file injection, and customizable persona configuration. This enables all agent interactions to be contextually aware and customizable.

### Story 3.1: Auto-Ingestion Workspace Monitoring

As a Developer,
I want the system to automatically watch my workspace and ingest code files into a vector store,
So that agents have access to my codebase context without manual configuration.

**Acceptance Criteria:**

**Given** the RAG system is initialized
**When** the system starts
**Then** the system must subscribe to the shared file watcher service from Epic 1
**And** the system must monitor the workspace directory (`./`) for code file changes
**And** the system must track file types to ingest (e.g., `.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.json`)

**Given** a new code file is created or modified in the workspace
**When** the file watcher detects the change
**Then** the system must automatically chunk the file into semantic segments
**And** each chunk must be embedded using the local embedding model (TensorFlow.js Universal Encoder)
**And** the embeddings must be stored in the vector store (in-memory or LevelDB)

**Given** a file is deleted from the workspace
**When** the file watcher detects the deletion
**Then** the system must remove all chunks and embeddings for that file from the vector store
**And** the cleanup must complete within 5 seconds

**Given** the auto-ingestion system is running
**When** files are being processed
**Then** the system must handle large files (e.g., >10MB) by chunking them appropriately
**And** the system must continue processing other files even if one file fails
**And** file processing errors must be logged but not block the ingestion pipeline

**Given** the vector store contains embedded code chunks
**When** an agent requests context
**Then** the system must provide an API endpoint `/api/rag/ingest` to trigger manual ingestion if needed
**And** the endpoint must return ingestion status (files processed, chunks created, errors)

### Story 3.2: Context Injection into Agent Prompts

As a Developer,
I want agent prompts to be dynamically injected with relevant code snippets from my workspace,
So that agents have full visibility into my codebase and can make informed decisions without refusing due to lack of information.

**Acceptance Criteria:**

**Given** an agent needs to process a user request
**When** the agent prompt is being constructed
**Then** the system must query the vector store using `/api/rag/query` with the user's request as the search query
**And** the system must retrieve the top N most relevant code chunks (e.g., top 5-10 chunks)
**And** each chunk must include file path, code content, and relevance score

**Given** relevant code chunks are retrieved
**When** the agent prompt is assembled
**Then** the system must inject the code chunks into the prompt in a structured format
**And** each code snippet must be clearly labeled with its file path
**And** the total injected context must not exceed token limits (e.g., 4000 tokens for context, leaving room for response)

**Given** the context injection system is active
**When** an agent makes a request
**Then** the injected context must be relevant to the request topic
**And** the system must prioritize chunks from files that are most semantically similar to the request
**And** duplicate or highly similar chunks must be deduplicated

**Given** no relevant code chunks are found for a request
**When** the system attempts context injection
**Then** the agent prompt must still be sent without context injection
**And** the system must log that no relevant context was found
**And** the agent can proceed with general knowledge

**Given** context injection is performed
**When** the agent processes the prompt
**Then** the agent must have access to the injected code snippets in its context window
**And** the agent must be able to reference specific files and code sections in its response
**And** the system must log which chunks were injected for each request

### Story 3.3: Persona Configuration System

As a Developer,
I want to configure custom system prompts for agents (e.g., "Senior Engineer Mode"),
So that agents follow specific coding standards and instruction-following behaviors.

**Acceptance Criteria:**

**Given** a user wants to configure agent personas
**When** the user accesses persona configuration
**Then** the system must provide an API endpoint `/api/personas` to manage persona configurations
**And** the endpoint must support CRUD operations (Create, Read, Update, Delete) for personas
**And** each persona must have a name, description, and system prompt template

**Given** a persona is configured
**When** an agent is invoked
**Then** the system must allow selection of a persona for that agent
**And** the selected persona's system prompt must be prepended to the agent's prompt
**And** the persona prompt must override or enhance the default agent behavior

**Given** default personas are available
**When** the system initializes
**Then** the system must include at least one default persona (e.g., "Senior Engineer Mode")
**And** the default persona must enforce strict instruction following for coding tasks
**And** users must be able to modify or create new personas

**Given** a persona is active for an agent
**When** the agent processes a request
**Then** the agent's responses must reflect the persona's configured behavior
**And** the system must log which persona was used for each agent interaction
**And** persona effectiveness can be tracked and optimized

**Given** multiple personas are configured
**When** different agents are invoked
**Then** each agent can use a different persona independently
**And** persona configurations must be persisted (e.g., in a JSON file or database)
**And** persona changes must take effect immediately without server restart

## Epic 2: Neural Circuit Visualization

Users can see the AI workflow as an interactive visual graph showing agent states, data flow, and tool execution. Provides immediate visual feedback and engagement.

### Story 2.1: Visual State Machine with ReactFlow

As a User,
I want to see the BMAD workflow rendered as an interactive ReactFlow graph,
So that I can visualize the agent execution flow and understand the system's current state.

**Acceptance Criteria:**

**Given** the NeuralDeck application is loaded
**When** the user navigates to the Neural Circuit view
**Then** the system must render a ReactFlow graph with nodes representing agents (User Input -> Analyst -> PM -> Architect -> Scrum Master -> Swarm -> QA -> Security)
**And** each node must display the agent's name and current state
**And** nodes must be visually distinct based on state: IDLE (Dim), THINKING (Pulsing Cyan), WORKING (Rotating Spinner), DONE (Solid Green)

**Given** the ReactFlow graph is displayed
**When** the user interacts with the graph
**Then** the user must be able to pan and zoom the graph
**And** the user must be able to click on nodes to see details
**And** the graph must maintain its layout and position during state updates

**Given** agent states change
**When** an agent transitions between states (e.g., IDLE -> THINKING -> WORKING -> DONE)
**Then** the corresponding node must update its visual appearance immediately
**And** state transitions must be animated smoothly (e.g., color fade, pulse animation)
**And** the graph must remain responsive (60fps) even with multiple state changes

**Given** the graph contains multiple nodes
**When** the graph is rendered
**Then** nodes must be positioned using ReactFlow's automatic layout or custom positioning
**And** edges (connections) must be drawn between nodes showing the workflow flow
**And** the graph must follow the Cyberpunk 2099 aesthetic (Void Black background, Electric Cyan for active states)

**Given** the visualization system is active
**When** the backend reports agent state changes
**Then** the frontend must subscribe to state updates (via WebSocket or polling)
**And** the graph must update in real-time without full page refresh
**And** state updates must be synchronized with backend agent execution

### Story 2.2: Data Packet Animation

As a User,
I want to see visual "Data Packet" animations travel along edges when agents complete tasks,
So that I can understand how data flows between agents in the workflow.

**Acceptance Criteria:**

**Given** an agent completes a task
**When** the agent's state transitions to DONE
**Then** a visual "Data Packet" animation must appear at the source agent node
**And** the data packet must travel along the connecting edge to the next agent node
**And** the animation must use Cyberpunk aesthetic (glowing cyan/purple particles, trail effects)

**Given** a data packet animation is triggered
**When** the packet travels along an edge
**Then** the animation must complete within 1-2 seconds
**And** the packet must follow the edge path smoothly
**And** the animation must not block or delay other UI updates

**Given** multiple agents complete tasks simultaneously
**When** multiple data packets are triggered
**Then** each packet must animate independently along its respective edge
**And** packets must not overlap or interfere with each other
**And** the system must handle up to 10 concurrent packet animations without performance degradation

**Given** a data packet reaches its destination node
**When** the packet animation completes
**Then** the destination node must visually acknowledge receipt (e.g., brief glow, state change)
**And** the packet must disappear or fade out
**And** the next agent's state must transition appropriately (e.g., IDLE -> THINKING)

**Given** the data packet system is active
**When** agents are processing tasks
**Then** data packets must accurately represent the workflow progression
**And** packet animations must be optional (can be disabled for performance)
**And** the system must log packet animations for debugging

### Story 2.3: Tool Execution Info Display

As a User,
I want to see a "mini-log" on each node showing the last tool used and its status,
So that I can understand what actions each agent is performing.

**Acceptance Criteria:**

**Given** an agent node is displayed in the graph
**When** the agent executes a tool (e.g., `file_system.write`, `web.search`)
**Then** the node must display a "mini-log" showing the tool name
**And** the mini-log must show the tool's execution status (running, success, error)
**And** the mini-log must update in real-time as tools are executed

**Given** a tool execution completes
**When** the tool status is reported
**Then** the mini-log must display the final status (success with checkmark, error with X icon)
**And** the tool name must be truncated if too long (e.g., "file_system.w..." for long names)
**And** error status must be highlighted in red (Crimson Red `#ff003c`)

**Given** multiple tools are executed by an agent
**When** a new tool execution starts
**Then** the mini-log must update to show the most recent tool
**And** previous tool information must be accessible via hover or click
**And** the mini-log must maintain a history of the last 3-5 tool executions

**Given** a user hovers over or clicks an agent node
**When** the interaction occurs
**Then** the node must display an expanded tool log showing recent tool executions
**And** each tool log entry must include: tool name, timestamp, status, and brief result
**And** the expanded log must follow Cyberpunk aesthetic (glassmorphism panel, monospace font)

**Given** the tool execution info system is active
**When** agents are processing
**Then** tool information must be synchronized with backend tool execution logs
**And** the mini-log must update within 500ms of tool execution
**And** the system must handle rapid tool executions without missing updates

## Epic 4: Developer Swarm (Parallel Execution)

Users can execute multiple development stories simultaneously, dramatically reducing implementation time through parallel agent execution.

### Story 4.1: Dynamic Developer Node Spawning

As a User,
I want the system to automatically spawn Developer Nodes when the Scrum Master outputs a list of stories,
So that each story can be processed by a dedicated developer agent in parallel.

**Acceptance Criteria:**

**Given** the Scrum Master agent completes story creation
**When** the Scrum Master outputs a list of stories (Markdown files in `stories/` directory)
**Then** the system must detect the new story files using the shared file watcher service
**And** the system must parse each story file to extract story metadata (title, acceptance criteria)
**And** for each story file detected, the system must dynamically spawn one Developer Node

**Given** story files are detected
**When** Developer Nodes are spawned
**Then** each Developer Node must be added to the ReactFlow graph (if Epic 2 is available)
**And** each Developer Node must be assigned a unique identifier
**And** each Developer Node must be associated with its corresponding story file

**Given** Developer Nodes are spawned
**When** the nodes are created
**Then** each node must initialize in IDLE state
**Then** each node must display the story title or identifier
**And** the system must track which developer is working on which story

**Given** the dynamic spawning system is active
**When** new stories are added after initial spawn
**Then** the system must detect new story files and spawn additional Developer Nodes
**And** existing Developer Nodes must continue their work without interruption
**And** the system must handle story file deletions (remove corresponding Developer Nodes)

**Given** multiple stories are detected simultaneously
**When** Developer Nodes are spawned
**Then** all nodes must be created within 2 seconds of story detection
**And** node creation must not block other system operations
**And** the system must log node spawning events for monitoring

### Story 4.2: Parallel Processing Engine

As a User,
I want all Developer Nodes to execute their LLM calls in parallel,
So that multiple stories are implemented simultaneously, dramatically reducing total implementation time.

**Acceptance Criteria:**

**Given** multiple Developer Nodes are ready to process stories
**When** the swarm execution is triggered
**Then** all Developer Nodes must execute their LLM calls simultaneously using `Promise.all()` or independent async/await loops
**And** each Developer Node must process its assigned story independently
**And** no Developer Node must wait for another to complete before starting

**Given** parallel execution is active
**When** Developer Nodes are processing stories
**Then** each node must make independent API calls to `/api/chat` with its story context
**And** API calls must be executed concurrently, not sequentially
**And** the system must handle API rate limits gracefully (queue if needed, but maintain parallelism)

**Given** multiple developers are working in parallel
**When** they attempt to modify files
**Then** the file conflict detection system from Epic 1 must prevent simultaneous writes to the same file
**And** developers attempting to access locked files must wait or be notified
**And** the system must log file access conflicts for analysis

**Given** parallel execution completes
**When** all Developer Nodes finish their stories
**Then** the system must collect results from all nodes
**And** the system must report overall swarm execution time
**And** the system must verify that parallel execution took less than 2x the time of a single story (NFR-1)

**Given** the parallel processing engine is active
**When** errors occur in individual Developer Nodes
**Then** errors in one node must not stop other nodes from continuing
**And** failed nodes must be logged with error details
**And** the system must support retry mechanisms for failed nodes

### Story 4.3: Conflict Resolution System

As a User,
I want the system to detect and resolve merge conflicts when multiple developers edit the same file,
So that parallel development can proceed safely without data loss.

**Acceptance Criteria:**

**Given** two Developer Nodes attempt to modify the same file
**When** the second developer tries to acquire a file lock
**Then** the system must detect the conflict using Epic 1's file conflict detection
**And** the system must trigger a "Merge Conflict" agent to handle the resolution
**And** the second developer must be notified that the file is locked

**Given** a merge conflict is detected
**When** the Merge Conflict agent is triggered
**Then** the agent must analyze both versions of the file changes
**And** the agent must attempt automatic conflict resolution where possible
**And** if automatic resolution fails, the agent must flag the conflict for manual review

**Given** a merge conflict requires resolution
**When** the conflict is processed
**Then** the system must create a conflict resolution file or log entry
**And** the system must notify the user of the conflict
**And** the conflicting developers must be paused until resolution

**Given** the conflict resolution system is active
**When** conflicts are resolved
**Then** the resolved file must be saved
**And** both developers must be notified of the resolution
**And** developers can continue their work with the merged file

**Given** the conflict resolution system is implemented
**When** parallel development occurs
**Then** the system must minimize conflicts through intelligent file assignment
**And** conflict resolution must be logged for analysis and improvement
**And** the system must support both automatic and manual conflict resolution workflows

**Note:** This story implements FR-3.2.3 which is marked as "Future" in the PRD. It builds on Epic 1's basic file conflict detection, adding advanced merge conflict agent capabilities.

## Epic 5: War Room Security Suite

Users can audit their codebase for vulnerabilities and run adversarial security testing with Red Team agents.

### Story 5.1: Red Alert Mode Toggle

As a Security Analyst,
I want to toggle the UI to "Red Alert" mode with a red theme,
So that I can visually indicate when security auditing is active and create a focused security analysis environment.

**Acceptance Criteria:**

**Given** the NeuralDeck application is running
**When** the user activates Red Alert mode
**Then** the UI must toggle to a red theme (Crimson Red `#ff003c` as primary color)
**And** the background must shift to darker red tones (Void Black with red accents)
**And** all UI elements must reflect the red alert aesthetic

**Given** Red Alert mode is active
**When** the user navigates through the application
**Then** all panels, borders, and highlights must use red color scheme
**And** the Cyberpunk aesthetic must be maintained but with red instead of cyan
**And** the theme change must be immediate and smooth (no flicker or delay)

**Given** Red Alert mode toggle is available
**When** the user wants to activate it
**Then** the toggle must be accessible from the main UI (e.g., Tactical HUD or Command Palette)
**And** the toggle must be clearly labeled (e.g., "WAR ROOM MODE" or "RED ALERT")
**And** the toggle state must be persisted (remember user's preference)

**Given** Red Alert mode is active
**When** security agents are running
**Then** the red theme must reinforce the security-focused context
**And** security-related UI elements must be emphasized (threat indicators, vulnerability lists)
**And** the theme must create a distinct "war room" atmosphere

**Given** Red Alert mode can be toggled
**When** the user deactivates Red Alert mode
**Then** the UI must return to the default Cyberpunk theme (Electric Cyan)
**And** the transition must be smooth
**And** all security features must remain functional regardless of theme

### Story 5.2: Adversarial Red Team Agent Squad

As a Security Analyst,
I want to select and deploy a "Red Team" agent squad to audit code and attempt penetration testing,
So that I can identify security vulnerabilities through adversarial testing.

**Acceptance Criteria:**

**Given** the War Room Security Suite is active
**When** the user wants to run security auditing
**Then** the system must provide a "Red Team" agent squad selection interface
**And** the Red Team squad must consist of specialized security agents (e.g., Penetration Tester, Vulnerability Scanner, Code Auditor)
**And** each Red Team agent must have a distinct security-focused persona

**Given** a Red Team agent squad is selected
**When** the squad is deployed
**Then** each Red Team agent must analyze the codebase from an adversarial perspective
**And** agents must attempt to find security vulnerabilities (SQL injection, XSS, path traversal, etc.)
**And** agents must attempt "penetration testing" by trying to exploit potential weaknesses

**Given** Red Team agents are analyzing code
**When** they discover potential vulnerabilities
**Then** each finding must be logged with severity level (Critical/High/Medium/Low)
**And** findings must include: vulnerability type, file location, code snippet, potential impact
**And** findings must be reported in real-time to the threat assessment dashboard

**Given** Red Team agents are active
**When** they perform penetration testing attempts
**Then** agents must use safe testing methods that don't damage the codebase
**And** agents must log all testing attempts and results
**And** agents must respect the system's security boundaries (don't actually exploit, just test)

**Given** the Red Team agent squad is deployed
**When** agents complete their analysis
**Then** the system must compile all findings into a comprehensive security report
**And** the report must be accessible via the threat assessment dashboard
**And** the system must support re-running Red Team analysis on updated code

**Given** Epic 3 (RAG) is available
**When** Red Team agents analyze code
**Then** agents must use RAG context to understand code relationships and find deeper vulnerabilities
**And** agents must leverage code understanding to identify complex security issues
**And** analysis quality must be significantly enhanced compared to surface-level scanning

### Story 5.3: Threat Assessment Dashboard

As a Security Analyst,
I want a dashboard panel that shows identified vulnerabilities categorized by severity,
So that I can prioritize security fixes and understand the overall security posture of my codebase.

**Acceptance Criteria:**

**Given** Red Team agents have completed security analysis
**When** vulnerabilities are identified
**Then** the system must display a Threat Assessment Dashboard panel
**And** the dashboard must show vulnerabilities organized by severity: Critical, High, Medium, Low
**And** each vulnerability must display: type, location (file path), description, and recommended fix

**Given** the Threat Assessment Dashboard is displayed
**When** the user views the dashboard
**Then** vulnerabilities must be sorted by severity (Critical first)
**And** each severity category must have a distinct visual indicator (color, icon)
**And** the dashboard must show total counts for each severity level

**Given** vulnerabilities are displayed in the dashboard
**When** the user interacts with a vulnerability
**Then** clicking a vulnerability must show detailed information (code snippet, impact, remediation steps)
**And** the user must be able to mark vulnerabilities as "Reviewed", "Fixed", or "False Positive"
**And** vulnerability status changes must be persisted

**Given** the dashboard is active
**When** new vulnerabilities are discovered
**Then** the dashboard must update in real-time
**And** new vulnerabilities must be highlighted or animated to draw attention
**And** the severity counts must update automatically

**Given** the Threat Assessment Dashboard is displayed
**When** the user wants to export findings
**Then** the system must provide export functionality (e.g., JSON, CSV, PDF)
**And** the export must include all vulnerability details
**And** the export must be formatted for sharing with development teams

**Given** Epic 3 (RAG) is available
**When** vulnerabilities are displayed
**Then** the dashboard must show enhanced analysis results (deeper code understanding)
**And** vulnerability descriptions must reference related code sections
**And** remediation suggestions must be more contextually aware

## Epic 6: Production Hardening & Intelligence

Users get a production-ready application with codebase intelligence (RAG), persistent sessions, optimized performance, and hardened security for team deployment.

**Research Source:** [Comprehensive Analysis Report](./research-neuraldeck-comprehensive-analysis.md)
**Priority:** P0 (Critical for production readiness)
**Dependencies:** Epic 1, Epic 2, Epic 3, Epic 4, Epic 5 (all completed)
**Estimated Effort:** 22 days (2-3 sprints)

### Story 6.1: Codebase RAG Indexing System

As a Developer,
I want the system to automatically index my codebase and provide semantic search,
So that agents have deep project understanding and can make contextually-aware decisions.

**Acceptance Criteria:**

**Given** the NeuralDeck application is started
**When** the system initializes
**Then** the system must scan the workspace directory for all code files
**And** the system must chunk files into semantic segments (functions, classes, imports)
**And** chunks must be embedded using a local embedding model (e.g., TensorFlow.js Universal Encoder or OpenAI ada-002)
**And** embeddings must be stored in an in-memory vector store with optional persistence (LevelDB or IndexedDB)

**Given** the codebase is indexed
**When** a user or agent makes a request
**Then** the system must perform semantic search against the vector store
**And** the top-N most relevant code chunks must be retrieved (configurable, default 5-10)
**And** retrieved context must be injected into agent prompts automatically

**Given** files are created, modified, or deleted
**When** the file watcher detects changes
**Then** the index must be updated incrementally (not full re-index)
**And** deleted file chunks must be removed from the vector store
**And** modified file chunks must be re-embedded and updated
**And** index updates must complete within 5 seconds for single file changes

**Given** the RAG system is active
**When** the user queries project structure or code patterns
**Then** the system must return relevant code snippets with file paths
**And** agents must reference specific files and line numbers in responses
**And** the system must log RAG queries and retrieved chunks for debugging

**Given** the workspace contains large files (>10MB)
**When** those files are indexed
**Then** the system must chunk them appropriately (max 2000 tokens per chunk)
**And** the system must handle indexing errors gracefully without blocking other files
**And** the total index must support workspaces up to 10,000 files

**Priority:** P0
**Effort:** 5 days
**Dependencies:** Epic 1 (shared file watcher)

### Story 6.2: Conversation Persistence

As a Developer,
I want my chat conversations and agent sessions to persist across page refreshes,
So that I can resume work without losing context or having to re-explain my tasks.

**Acceptance Criteria:**

**Given** the user is having a conversation with agents
**When** messages are sent and received
**Then** all messages must be stored in IndexedDB (frontend) or backend database
**And** message storage must include: role, content, timestamp, agent identifier, metadata

**Given** the user refreshes the page or closes/reopens the browser
**When** the application loads
**Then** the system must restore the previous conversation history
**And** the conversation must appear in the same state as before refresh
**And** the active agent context must be restored

**Given** multiple conversation sessions exist
**When** the user views conversation history
**Then** the system must provide a session list showing recent conversations
**And** each session must display: start time, last message preview, participant agents
**And** the user must be able to switch between sessions or start a new one

**Given** a conversation session is restored
**When** the user continues the conversation
**Then** agents must have access to the previous context (within token limits)
**And** the system must summarize older messages if they exceed context limits
**And** conversation continuity must be maintained seamlessly

**Given** the persistence system is active
**When** storage limits are approached
**Then** the system must implement automatic cleanup of old sessions (configurable retention)
**And** the user must be warned before data is deleted
**And** critical conversations must be exportable (JSON format)

**Priority:** P0
**Effort:** 2 days
**Dependencies:** None

### Story 6.3: Performance Optimization - Code Splitting

As a Developer,
I want the application to load quickly with optimized bundle sizes,
So that I can start working immediately without waiting for large JavaScript bundles.

**Acceptance Criteria:**

**Given** the NeuralDeck application is built
**When** the production bundle is created
**Then** Three.js and 3D-related code must be in a separate chunk (lazy loaded)
**And** ReactFlow must be in a separate chunk
**And** the initial bundle must be <500KB (excluding vendor chunks)

**Given** the user navigates to a view that doesn't require 3D
**When** the view is rendered
**Then** TheConstruct and Three.js chunks must NOT be loaded
**And** only required chunks must be loaded for the current view
**And** chunk loading must use React.lazy() and Suspense with loading indicators

**Given** the user navigates to the 3D Construct view
**When** the view is requested
**Then** the Three.js chunk must load on demand
**And** a loading skeleton must be displayed during chunk loading
**And** the chunk must load within 2 seconds on a typical connection

**Given** heavy components are lazy loaded
**When** the components are rendered
**Then** Suspense fallbacks must match the Cyberpunk aesthetic
**And** loading states must not cause layout shifts
**And** error boundaries must catch and display chunk loading failures

**Given** the application is deployed
**When** Lighthouse performance is measured
**Then** LCP (Largest Contentful Paint) must be <2.5 seconds
**And** TTI (Time to Interactive) must be <3.5 seconds
**And** FID (First Input Delay) must be <100ms

**Priority:** P1
**Effort:** 2 days
**Dependencies:** None

### Story 6.4: Security Hardening

As a System Administrator,
I want the application to be secured against common web vulnerabilities,
So that API keys are protected and the system is safe for team deployment.

**Acceptance Criteria:**

**Given** the user configures LLM API keys
**When** keys are stored
**Then** API keys must be stored on the backend only (never in frontend localStorage)
**And** the frontend must use session tokens to authenticate with the backend
**And** session tokens must expire after configurable timeout (default 24 hours)

**Given** the backend serves API requests
**When** Content Security Policy is evaluated
**Then** CSP headers must be enabled in production mode
**And** CSP must allow only necessary resources (scripts, styles, connections)
**And** inline scripts must be prohibited (use nonces if needed)

**Given** state-changing API requests are made
**When** the request is processed
**Then** CSRF tokens must be validated for POST/PUT/DELETE requests
**And** invalid CSRF tokens must result in HTTP 403 response
**And** CSRF tokens must be rotated on session refresh

**Given** WebSocket connections are established
**When** a client connects to Socket.IO
**Then** the connection must require a valid JWT token
**And** unauthenticated connections must be rejected
**And** token validation must occur on every message (or connection handshake)

**Given** security-relevant events occur
**When** events are processed
**Then** the system must log: all file writes, command executions, authentication attempts
**And** logs must include: timestamp, user/agent identifier, action, result
**And** logs must be stored in a structured format (JSON) for analysis

**Given** the application is deployed
**When** a security scan is performed
**Then** OWASP ZAP or similar tool must report no Critical or High vulnerabilities
**And** all security headers must be present and correctly configured
**And** no sensitive data must be exposed in error messages

**Priority:** P1
**Effort:** 3 days
**Dependencies:** Epic 1 (builds on existing security)

### Story 6.5: List Virtualization

As a Developer,
I want long lists to render efficiently without performance degradation,
So that the UI remains responsive even with thousands of files or messages.

**Acceptance Criteria:**

**Given** the file explorer contains >100 files
**When** the file tree is rendered
**Then** the system must use virtualized rendering (react-window or react-virtualized)
**And** only visible items plus a small buffer must be in the DOM
**And** scrolling must be smooth (60fps) regardless of total file count

**Given** the chat history contains >100 messages
**When** the message list is rendered
**Then** messages must be virtualized
**And** scroll position must be maintained when new messages arrive
**And** scrolling to old messages must load them dynamically

**Given** the vulnerability findings list contains >50 items
**When** the ThreatDashboard is displayed
**Then** the findings list must be virtualized
**And** filtering by severity must update the virtual list efficiently
**And** expanding a finding must not cause re-render of all items

**Given** virtualized lists are active
**When** the user scrolls rapidly
**Then** items must load without visible blank spaces (overscan)
**And** scroll position must be accurate and stable
**And** memory usage must remain constant regardless of list size

**Given** any virtualized list is rendered
**When** keyboard navigation is used
**Then** focus must move correctly through virtualized items
**And** screen readers must announce list items correctly
**And** virtualization must not break accessibility

**Priority:** P1
**Effort:** 2 days
**Dependencies:** None

### Story 6.6: WebSocket Reconnection & Delta Updates

As a Developer,
I want WebSocket connections to recover gracefully from network interruptions,
So that I don't lose real-time updates or have to refresh the page.

**Acceptance Criteria:**

**Given** a WebSocket connection is established
**When** the connection is lost (network interruption)
**Then** the system must attempt automatic reconnection
**And** reconnection must use exponential backoff (1s, 2s, 4s, 8s, max 30s)
**And** the UI must display a reconnection indicator

**Given** reconnection is in progress
**When** the connection is re-established
**Then** the system must sync any missed state updates
**And** the UI must update to reflect current server state
**And** no data must be lost during the disconnection period

**Given** agents are actively working
**When** state updates are sent via WebSocket
**Then** only changed fields must be transmitted (delta updates)
**And** full state snapshots must only be sent on initial connection or resync
**And** bandwidth usage must be reduced by >50% compared to full updates

**Given** multiple components subscribe to WebSocket events
**When** updates arrive
**Then** only affected components must re-render
**And** the system must use event filtering to prevent unnecessary updates
**And** memory usage must not grow unboundedly with event history

**Given** the WebSocket connection has been disconnected for >5 minutes
**When** reconnection is attempted
**Then** the system must prompt the user to reload if state is too stale
**And** the system must provide a "force reconnect" option
**And** connection status must be visible in the UI at all times

**Priority:** P2
**Effort:** 2 days
**Dependencies:** None

### Story 6.7: Code Diff Visualization

As a Developer,
I want to see visual diffs of file changes proposed by agents,
So that I can review and approve changes before they are applied.

**Acceptance Criteria:**

**Given** an agent proposes a file modification
**When** the modification is presented to the user
**Then** the system must display a side-by-side or unified diff view
**And** additions must be highlighted in green
**And** deletions must be highlighted in red
**And** the diff must use syntax highlighting appropriate to the file type

**Given** a diff is displayed
**When** the user reviews the changes
**Then** the user must be able to scroll through all changes
**And** line numbers must be displayed for both old and new versions
**And** unchanged context lines must be shown around changes (3 lines default)

**Given** an agent proposes changes to multiple files
**When** the changes are presented
**Then** the system must show a file list with change summary
**And** clicking a file must show its diff
**And** the total lines added/removed must be displayed per file

**Given** a diff is approved by the user
**When** the user clicks "Apply"
**Then** the changes must be written to the file
**And** the file watcher must detect the change and update the index
**And** a confirmation message must be displayed

**Given** a diff is rejected by the user
**When** the user clicks "Reject"
**Then** no changes must be made to the file
**And** the agent must be notified of the rejection
**And** the rejection reason can optionally be provided

**Priority:** P2
**Effort:** 3 days
**Dependencies:** None

### Story 6.8: Checkpoint/Undo System

As a Developer,
I want the system to create checkpoints before agent modifications,
So that I can undo changes if an agent makes a mistake.

**Acceptance Criteria:**

**Given** an agent is about to modify a file
**When** the modification is initiated
**Then** the system must create a checkpoint of the file's current state
**And** the checkpoint must be stored with: file path, content, timestamp, agent identifier
**And** checkpoints must be stored in `.neuraldeck/checkpoints/` directory

**Given** checkpoints exist for a file
**When** the user wants to undo changes
**Then** the system must display a list of available checkpoints
**And** each checkpoint must show: timestamp, agent that made the change, change summary
**And** the user must be able to preview the checkpoint content before restoring

**Given** the user selects a checkpoint to restore
**When** the restore is initiated
**Then** the file must be reverted to the checkpoint state
**And** a new checkpoint must be created of the current state (before restore)
**And** the system must log the restore action

**Given** the checkpoint system is active
**When** storage limits are approached
**Then** old checkpoints must be automatically pruned (configurable retention)
**And** at least the last 10 checkpoints per file must be retained
**And** users must be able to manually delete checkpoints

**Given** Git is available in the workspace
**When** checkpoints are created
**Then** the system should optionally create Git commits for checkpoints
**And** checkpoint commits must use a standard message format
**And** the user can configure whether to use Git or file-based checkpoints

**Priority:** P2
**Effort:** 3 days
**Dependencies:** None

---

## Epic 6 Summary

| Story | Title | Priority | Effort | Status |
|-------|-------|----------|--------|--------|
| 6.1 | Codebase RAG Indexing System | P0 | 5 days | backlog |
| 6.2 | Conversation Persistence | P0 | 2 days | backlog |
| 6.3 | Performance Optimization - Code Splitting | P1 | 2 days | backlog |
| 6.4 | Security Hardening | P1 | 3 days | backlog |
| 6.5 | List Virtualization | P1 | 2 days | backlog |
| 6.6 | WebSocket Reconnection & Delta Updates | P2 | 2 days | backlog |
| 6.7 | Code Diff Visualization | P2 | 3 days | backlog |
| 6.8 | Checkpoint/Undo System | P2 | 3 days | backlog |

**Total Estimated Effort:** 22 days (2-3 sprints)

### Recommended Execution Order

**Sprint 1 (P0 - Critical):**
- Story 6.1: Codebase RAG Indexing System (5 days)
- Story 6.2: Conversation Persistence (2 days)
- Story 6.3: Performance Optimization - Code Splitting (2 days)

**Sprint 2 (P1 - Important):**
- Story 6.4: Security Hardening (3 days)
- Story 6.5: List Virtualization (2 days)
- Story 6.6: WebSocket Reconnection & Delta Updates (2 days)

**Sprint 3 (P2 - Enhancement):**
- Story 6.7: Code Diff Visualization (3 days)
- Story 6.8: Checkpoint/Undo System (3 days)

