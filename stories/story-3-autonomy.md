# Story 3: Neural Autonomy Engine (The Circuit)

**Role:** Full Stack Developer
**Feature:** Autonomous Agent Logic
**Status:** Todo

## Description
Implement the `useNeuralAutonomy` hook and the ReactFlow visualization to drive the autonomous workflow.

## Technical Tasks
1.  [ ] Install `reactflow`.
2.  [ ] Create `hooks/useNeuralAutonomy.ts`:
    *   Implement State Machine: `IDLE` -> `ANALYST` -> `PM` -> `ARCHITECT`.
    *   Implement `pollFileSystem()`: Check for `project_brief.md`, `prd.md`, etc. via `/api/files`.
    *   Implement `triggerAgent()`: Call `/api/chat` with the specific Agent Persona.
3.  [ ] Create `components/NeuralGrid.tsx`:
    *   Render the fixed node layout (Analyst -> PM -> Arch -> Scrum).
    *   Visualize state changes (dim vs. active nodes).
    *   Visualize "Data Packets" (animated edges) when files are created.

## Acceptance Criteria
*   The Graph visualizes the current state of the project.
*   Manually creating `docs/prd.md` causes the PM node to mark as "DONE" and the Architect node to "ACTIVATE".
