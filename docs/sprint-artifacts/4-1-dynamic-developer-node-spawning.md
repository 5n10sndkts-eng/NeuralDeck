# Story 4.1: Dynamic Developer Node Spawning

Status: Done

## Story

**As a** User
**I want** the system to automatically spawn Developer Nodes when the Scrum Master outputs a list of stories
**So that** each story can be processed by a dedicated developer agent in parallel.

## Acceptance Criteria

1. **Given** the Scrum Master agent completes story creation
   **When** the Scrum Master outputs a list of stories (Markdown files in `stories/` directory)
   **Then** the system must detect the new story files using the shared file watcher service
   **And** the system must parse each story file to extract story metadata (title, acceptance criteria)
   **And** for each story file detected, the system must dynamically spawn one Developer Node

2. **Given** story files are detected
   **When** Developer Nodes are spawned
   **Then** each Developer Node must be added to the ReactFlow graph
   **And** each Developer Node must be assigned a unique identifier
   **And** each Developer Node must be associated with its corresponding story file

3. **Given** Developer Nodes are spawned
   **When** the nodes are created
   **Then** each node must initialize in IDLE state
   **And** each node must display the story title or identifier
   **And** the system must track which developer is working on which story

4. **Given** the dynamic spawning system is active
   **When** new stories are added after initial spawn
   **Then** the system must detect new story files and spawn additional Developer Nodes
   **And** existing Developer Nodes must continue their work without interruption
   **And** the system must handle story file deletions (remove corresponding Developer Nodes)

5. **Given** multiple stories are detected simultaneously
   **When** Developer Nodes are spawned
   **Then** all nodes must be created within 2 seconds of story detection
   **And** node creation must not block other system operations
   **And** the system must log node spawning events for monitoring

## Tasks / Subtasks

- [x] **Task 1: Story File Detection Service** (AC: 1, 4)
  - [x] Create `src/hooks/useStoryWatcher.ts` - file watcher for `stories/` directory
  - [x] Implement file detection using WebSocket events from backend (`story:created`, `story:deleted`)
  - [x] Parse story files to extract metadata (title, story ID, acceptance criteria count)
  - [x] Handle story file deletions and modifications
  - [x] Write unit tests for story metadata parsing (21 passing tests)

- [x] **Task 2: Developer Node Type for ReactFlow** (AC: 2, 3)
  - [x] Create `src/components/DeveloperNode.tsx` - custom ReactFlow node for developers
  - [x] Support dynamic positioning using dagre layout
  - [x] Display story title, status (IDLE/WORKING/DONE), and progress indicator
  - [x] Use same Cyberpunk aesthetic as existing AgentNode (Electric Cyan, glassmorphism)
  - [x] Write unit tests for DeveloperNode rendering (19 passing tests)

- [x] **Task 3: Swarm Node Manager** (AC: 2, 3, 5)
  - [x] Extend `src/hooks/useSwarm.ts` with `addDeveloperNode()` and `removeDeveloperNode()` methods
  - [x] Implement unique ID generation for spawned nodes (format: `dev-{storyId}-{timestamp}`)
  - [x] Track node-to-story associations in state
  - [x] Integrate with existing `useSocket` for real-time state updates
  - [x] Write unit tests for node management logic (16 passing tests)

- [x] **Task 4: NeuralGrid Integration** (AC: 2, 3, 4)
  - [x] Modify `src/components/NeuralGrid.tsx` to render dynamic DeveloperNodes
  - [x] Update dagre layout to accommodate variable number of developer nodes
  - [x] Connect swarm node to each developer node with edges
  - [x] Handle node additions/removals without disrupting existing nodes
  - [x] Display dev swarm status in overlay (node count, DONE/WORKING counts)

- [x] **Task 5: Backend Story Detection API** (AC: 1, 4)
  - [x] Add WebSocket event emission in `server.cjs` for story file changes
  - [x] Implement `/api/stories` endpoint to list current stories with metadata
  - [x] Ensure file watcher integrates with existing file system infrastructure
  - [x] Broadcast `story:created`, `story:updated`, `story:deleted` events via Socket.IO

- [x] **Task 6: Logging and Monitoring** (AC: 5)
  - [x] Add structured logging for node spawn events in useSwarm.ts
  - [x] Track spawn timing metrics with performance warnings (target: <2 seconds)
  - [x] Log story-to-developer associations for debugging
  - [x] Integrate with existing console output system

## Dev Notes

### Existing Infrastructure to Leverage

1. **useSwarm.ts** (77 LOC) - Already exists with basic node/edge management
   - Extends this with developer-specific node spawning
   - Current implementation uses logs to create nodes; enhance to use story files

2. **NeuralGrid.tsx** - Main ReactFlow visualization
   - Uses dagre for automatic layout
   - Existing node types: `agentNode` (AgentNode.tsx)
   - Add `developerNode` type to `nodeTypes` useMemo

3. **useSocket.ts** - WebSocket connection to backend
   - Existing events: `agent:state-change`, `tool:*`
   - Add events: `story:created`, `story:deleted`, `swarm:spawn`

4. **AgentNode.tsx** - Reference for node styling
   - Copy Cyberpunk styling patterns
   - States: IDLE, THINKING, WORKING, DONE

### Architecture Patterns to Follow

- **File Structure:** `src/components/` for UI, `src/hooks/` for state management
- **Naming:** PascalCase components, camelCase hooks with `use` prefix
- **State Management:** React hooks + WebSocket for real-time
- **Layout:** Dagre automatic layout with TB (top-bottom) direction

### Technical Constraints

- **ReactFlow Version:** Check `package.json` for version (ensure compatible with dynamic nodes)
- **Performance:** Must maintain 60fps with up to 10 concurrent developer nodes
- **Node Positioning:** Use dagre layout recalculation on node add/remove

### Testing Requirements

- Unit tests for:
  - Story metadata parsing (`useStoryWatcher.test.ts`)
  - DeveloperNode component (`DeveloperNode.test.tsx`)
  - Swarm node management (`useSwarm.test.ts`)
- Integration tests for:
  - Story detection API (`tests/e2e/story-detection.spec.ts`)
  - Full spawn flow with NeuralGrid

### References

- [Source: docs/epics.md#Story 4.1: Dynamic Developer Node Spawning]
- [Source: docs/architecture.md#The Swarm Engine]
- [Source: src/hooks/useSwarm.ts] - Existing swarm implementation
- [Source: src/components/NeuralGrid.tsx] - ReactFlow graph implementation
- [Source: src/components/AgentNode.tsx] - Reference for node styling

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Console logs prefixed with `[useSwarm]` for node spawning events
- Console logs prefixed with `[NeuralGrid]` for story-to-node integration
- Backend logs prefixed with `[STORIES]` for API and WebSocket events

### Completion Notes List

1. All 56 unit tests pass for Story 4-1 components
2. Build completes successfully with no TypeScript errors
3. DeveloperNode uses magenta accent color (#ff00ff) to distinguish from AgentNode (cyan)
4. Story file parsing supports Status values: done, in-progress, pending, ready-for-dev
5. Backend `/api/stories` endpoint returns metadata including task counts

### File List

**Created:**
- `src/hooks/useStoryWatcher.ts` - Story file detection hook with WebSocket integration
- `src/components/DeveloperNode.tsx` - Custom ReactFlow node for developer agents
- `tests/hooks/useStoryWatcher.test.ts` - 21 unit tests for story parsing
- `tests/hooks/useSwarm.test.ts` - 16 unit tests for swarm node management
- `tests/components/DeveloperNode.test.tsx` - 19 unit tests for component rendering

**Modified:**
- `src/hooks/useSwarm.ts` - Added DeveloperSwarmNode interface and node management methods
- `src/components/NeuralGrid.tsx` - Integrated DeveloperNode type and story watcher
- `server.cjs` - Added `/api/stories` endpoint and story:* WebSocket events

