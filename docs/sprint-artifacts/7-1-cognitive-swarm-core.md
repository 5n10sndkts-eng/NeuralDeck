# Story 7.1: Cognitive Swarm Core

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want the system to use "sequential thinking" for complex problem decomposition,
So that the Swarm can handle multi-step reasoning tasks autonomously.

## Acceptance Criteria

### AC1: Sequential Thinking Integration ✅ COMPLETED
- [x] System integrates with sequential thinking capability
- [x] User requests are decomposed into logical steps/thoughts
- [x] Each thought includes: thought content, needsMoreThoughts flag, thoughtNumber

**Implementation Notes:**
- **Approach**: LLM-based simulation via `ReasoningService` instead of direct MCP server calls
- **Rationale**: The `sequentialthinking` MCP server is available through Docker MCP Toolkit, but the implementation uses LLM prompting for sequential reasoning to maintain flexibility and reduce external dependencies
- **MCP Availability**: The `sequentialthinking` tool IS available via Docker MCP Toolkit (1 tool across 9 servers) and can be accessed via `docker mcp exec --name sequentialthinking` for advanced use cases
- **Current Implementation**: `server/services/reasoningService.cjs` uses LLM API calls with structured prompts to simulate sequential thinking behavior
- **Future Enhancement**: Could be refactored to use MCP `sequentialthinking` server directly for enhanced reasoning capabilities

### AC2: Role Assignment
- [ ] Each decomposed step is analyzed for required expertise
- [ ] Steps are assigned to specific agent roles (Analyst, Architect, Engineer, QA)
- [ ] Assignments are persisted with the thought data

### AC3: Orchestrator Data Feed
- [ ] Reasoning chain (thoughts + assignments) is exposed via state management (e.g., Zustand)
- [ ] Real-time updates are emitted when new thoughts are generated
- [ ] Data structure supports the Neural Graph visualization (Story 7.2)

## Tasks / Subtasks

- [ ] Task 1: Create Reasoning Service (Backend)
  - [ ] 1.1 Implement `server/services/reasoningService.cjs` to interface with MCP
  - [ ] 1.2 Define data models for `Thought` and `AgentAssignment`
  - [ ] 1.3 Implement logic to trigger `sequential-thinking` tool from user prompt
- [ ] Task 2: Implement Role Assignment Logic
  - [ ] 2.1 specific heuristic or LLM-based classifier to map thought content to Agent Roles
  - [ ] 2.2 Update `AgentProfile` type definition in `src/types/index.ts` (if needed)
- [ ] Task 3: State Management (Frontend/Shared)
  - [ ] 3.1 Update `src/hooks/useSwarm.ts` or create `src/store/swarmStore.ts` to hold reasoning chain
  - [ ] 3.2 Ensure state updates trigger React re-renders for UI consumption
- [ ] Task 4: Testing
  - [ ] 4.1 Unit tests for `ReasoningService` (mocking the MCP tool) in `server/services/__tests__`
  - [ ] 4.2 Integration test: mock user prompt -> verify thought chain generation

## Dev Notes

### Architecture Compliance
- **Service Layer**: Implement logic in `server/services/` (e.g., `reasoningService.cjs`) to keep the API layer clean.
- **State Management**: Use the existing `useSwarm` hook or extends it. If state becomes too complex, consider a dedicated Zustand store.
- **Testing**: Follow the pattern established in Story 6.8: co-locate backend tests in `server/services/__tests__/`.

### Project Structure Notes
- **MCP Integration**: Ensure the `sequential-thinking` tool is properly available to the backend context.
- **Types**: Share types between frontend and backend where possible/appropriate (or keep them synced).

### References
- **Epic Source**: `docs/epics.md` - Epic 7, Story 7.1
- **Previous Story**: `docs/sprint-artifacts/6-8-checkpoint-undo-system.md` (Reference for testing pattern)

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash

### Debug Log References

- Passed unit tests for `ReasoningService`
- Verified fallback logic when no API key is present

### Completion Notes List

- Implemented `ReasoningService` (Backend) with LLM/Mock bridging.
- Created `LLMService` factory in `server/lib/llm.cjs`.
- Exposed `/api/think` endpoint for sequential reasoning triggers.
- Frontend: Updated `useSwarm` to map "Thoughts" to `SwarmNode` visualization.
- Frontend: Added "Neural Uplink" input to `TheOrchestrator.tsx`.

### File List

- `server/lib/llm.cjs` (NEW)
- `server/services/reasoningService.cjs` (NEW)
- `server/services/__tests__/reasoningService.test.js` (NEW)
- `server.cjs` (MODIFIED)
- `src/services/api.ts` (MODIFIED)
- `src/hooks/useSwarm.ts` (MODIFIED)
- `src/components/TheOrchestrator.tsx` (MODIFIED)
