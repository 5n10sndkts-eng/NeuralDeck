# Epic 4: Neural Orchestrator (Swarm Intelligence)

## Objective
Implement a multi-agent "Swarm Intelligence" system that visualizes and orchestrates complex problem-solving tasks. This replaces the single-threaded thought process with a parallelized, role-based agent workflow.

## Core Features
1.  **Swarm Core (Sequential Thinking Integration)**
    *   Utilize the `sequential-thinking` MCP to break down user requests.
    *   Map independent thought branches to specific Agents (Analyst, Architect, Engineer).
2.  **The Orchestrator UI (Visual)**
    *   A dynamic 3D/2D node graph representing active agents and their thoughts.
    *   Real-time updates as the `sequential-thinking` tool emits new steps.
3.  **Role-Based Delegation**
    *   **Analyst**: Breaks down the prompt.
    *   **Architect**: Designs the solution structure.
    *   **Engineer**: Generates the code.
    *   **Critic**: Reviews the output (Self-Correction).

## User Stories

### Story 4.1: Swarm Core Integration (Sequential Thinking MCP)
*   **As a** User
*   **I want** the system to break down my requests using sequential thinking
*   **So that** complex problems are decomposed into parallelizable agent tasks.
*   **Acceptance Criteria:**
    *   Integration with `sequential-thinking` MCP tool.
    *   User requests are decomposed into independent thought branches.
    *   Thought branches are mapped to specific agent roles (Analyst, Architect, Engineer).
    *   System handles MCP connection errors gracefully.

### Story 4.2: Neural Graph Visualization (Orchestrator UI)
*   **As a** User
*   **I want to** see how the AI is solving my problem in real-time
*   **So that** I understand the thought process and can see the "Thought Chain" grow.
*   **Acceptance Criteria:**
    *   Dynamic 3D/2D node graph representing active agents and their thoughts.
    *   Real-time updates as `sequential-thinking` tool emits new steps.
    *   Nodes display agent status (Thinking, Idle, Writing).
    *   Edges show dependencies between thoughts.
    *   Graph is interactive (zoom, pan, node selection).

### Story 4.3: Role-Based Agent Delegation
*   **As a** User
*   **I want to** assign specific sub-tasks to specialized agents
*   **So that** I can leverage each agent's expertise (e.g., "Ask the Architect to review this").
*   **Acceptance Criteria:**
    *   User can manually assign tasks to specific agents (Analyst, Architect, Engineer, Critic).
    *   System automatically routes tasks based on agent capabilities.
    *   Agent personas are distinct and evident in output.
    *   Agent status is visible in UI (AgentCard component).

## Technical Components
*   `useSwarm` Hook: Manages the connection to the `sequential-thinking` MCP and local state.
*   `NeuralGraph` Component: Visualizes thoughts as nodes and dependencies as edges.
*   `AgentCard`: Display for individual agent status (Thinking, Idle, Writing).

## Success Metrics
*   Integration with `sequential-thinking` tool.
*   Visual graph updates in real-time.
*   Distinct "personas" evident in the output.
