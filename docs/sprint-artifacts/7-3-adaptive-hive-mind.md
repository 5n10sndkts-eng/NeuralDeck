# Story 7.3: Adaptive Hive Mind

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want agents to share context and learn from each other during a session,
So that the Swarm improves its efficiency as it works.

## Acceptance Criteria

### AC1: Hive Memory Storage
- [ ] Centralized in-memory store for shared keys/values (facts, potential bugs, file paths)
- [ ] Persistence optional (can be transient for session)
- [ ] Accessible by all agents (Mock/Simulated logic)

### AC2: Context Sharing
- [ ] Agents can "broadcast" discoveries to the Hive
- [ ] Agents can "query" the Hive for existing context before starting work
- [ ] Visual indicator in `TheOrchestrator` when Hive Memory is accessed

### AC3: Adaptive Learning (Simulation)
- [ ] "Learning" is simulated by agents checking the Hive Cache
- [ ] If a fact exists (e.g., "Login is broken"), new agents reference it instead of rediscovering

## Tasks / Subtasks

- [ ] Task 1: Create Hive Memory Service (Backend)
  - [ ] 1.1 Implement `server/services/hiveMemory.cjs` (Singleton Map-based store)
  - [ ] 1.2 Expose API endpoints: `GET /api/hive`, `POST /api/hive/learn`
- [ ] Task 2: Integrate with Reasoning Service
  - [ ] 2.1 Update `ReasoningService` to query Hive before generating breakdown
  - [ ] 2.2 Update `ReasoningService` to push key insights to Hive (heuristic: "found", "discovered", "bug")
- [ ] Task 3: Frontend Integration
  - [ ] 3.1 Create `HiveStatus` component in `TheOrchestrator`
  - [ ] 3.2 Visualize memory entries (key-value pairs)

## Dev Notes

### Architecture Compliance
- **Service Layer**: New service `hiveMemory.cjs`.
- **Performance**: In-memory Map is sufficient for session-based context.

### Project Structure Notes
- **API**: Keep it simple JSON key-value store.

### References
- **Epic Source**: `docs/epics.md` - Epic 7, Story 7.3

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash

### Debug Log References

- Implemented `HiveMemoryService` (Singleton)
- Integrated into `ReasoningService` (Simulated Learning)
- Validated API endpoints

### Completion Notes List

- Created centralized "Hive Memory" for shared context.
- Agents now "broadcast" key insights to the Hive asynchronously.
- Frontend includes a `HiveStatus` panel to visualize the "Collective Intelligence".
- Fully integrated with the Neural Orchestrator.

### File List

- `server/services/hiveMemory.cjs` (NEW)
- `src/components/HiveStatus.tsx` (NEW)
- `server.cjs` (MODIFIED)
- `server/services/reasoningService.cjs` (MODIFIED)
- `src/components/TheOrchestrator.tsx` (MODIFIED)
