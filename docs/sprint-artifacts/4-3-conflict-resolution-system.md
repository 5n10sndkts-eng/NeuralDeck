# Story 4.3: Conflict Resolution System

Status: done

## Story

**As a** User
**I want** the system to detect and resolve merge conflicts when multiple developers edit the same file
**So that** parallel development can proceed safely without data loss.

## Acceptance Criteria

1. **Given** two Developer Nodes attempt to modify the same file
   **When** the second developer tries to acquire a file lock
   **Then** the system must detect the conflict using Epic 1's file conflict detection
   **And** the system must trigger a "Merge Conflict" agent to handle the resolution
   **And** the second developer must be notified that the file is locked

2. **Given** a merge conflict is detected
   **When** the Merge Conflict agent is triggered
   **Then** the agent must analyze both versions of the file changes
   **And** the agent must attempt automatic conflict resolution where possible
   **And** if automatic resolution fails, the agent must flag the conflict for manual review

3. **Given** a merge conflict requires resolution
   **When** the conflict is processed
   **Then** the system must create a conflict resolution file or log entry
   **And** the system must notify the user of the conflict
   **And** the conflicting developers must be paused until resolution

4. **Given** the conflict resolution system is active
   **When** conflicts are resolved
   **Then** the resolved file must be saved
   **And** both developers must be notified of the resolution
   **And** developers can continue their work with the merged file

5. **Given** the conflict resolution system is implemented
   **When** parallel development occurs
   **Then** the system must minimize conflicts through intelligent file assignment
   **And** conflict resolution must be logged for analysis and improvement
   **And** the system must support both automatic and manual conflict resolution workflows

## Tasks / Subtasks

- [x] **Task 1: Conflict Detection Service** (AC: 1)
  - [x] Create `src/services/conflictResolver.ts` - core conflict detection and resolution service
  - [x] Implement `ConflictEvent` interface for tracking conflicts
  - [x] Add conflict detection when file lock acquisition fails
  - [x] Create conflict queue for pending resolutions
  - [x] Write unit tests for conflict detection

- [x] **Task 2: Merge Conflict Agent** (AC: 1, 2)
  - [x] Add "merger" agent definition in `src/services/agent.ts`
  - [x] Implement `MergeConflictAgent` class in conflictResolver.ts
  - [x] Create system prompt for analyzing conflicting file changes
  - [x] Implement conflict analysis logic
  - [x] Write unit tests for merge agent

- [x] **Task 3: Automatic Conflict Resolution** (AC: 2, 4)
  - [x] Implement `resolveConflictAuto()` function using LLM
  - [x] Create merge strategy patterns (append, replace, combine)
  - [x] Add validation for resolved content
  - [x] Write unit tests for automatic resolution

- [x] **Task 4: Manual Resolution Workflow** (AC: 2, 3, 5)
  - [x] Create `ConflictResolutionFile` interface for conflict markers
  - [x] Implement `createConflictFile()` to generate conflict files with markers
  - [x] Add `resolveManually()` function for user-provided resolutions
  - [x] Write unit tests for manual workflow

- [x] **Task 5: Backend Conflict API** (AC: 1, 3, 4)
  - [x] Add `/api/conflicts` endpoint to list pending conflicts
  - [x] Add `/api/conflicts/:id` endpoint to get conflict details
  - [x] Add `/api/conflicts/:id/resolve` endpoint for manual resolution
  - [x] Add `/api/conflicts/:id/auto` endpoint for auto-resolution
  - [x] Add WebSocket events for conflict notifications (`conflict:detected`, `conflict:resolved`, `conflict:failed`)
  - [x] Write integration tests for API endpoints

- [x] **Task 6: Developer Node Integration** (AC: 1, 3)
  - [x] Update `swarmEngine.ts` to use conflict resolver on lock failures
  - [x] Implement developer pause/resume on conflict
  - [x] Add conflict notification callback to `executeDeveloperTask()`
  - [x] Write unit tests for integration

- [x] **Task 7: UI Conflict Notifications** (AC: 3, 4)
  - [x] Update `useSocket.ts` with conflict event types
  - [x] Create `ConflictAlert` component for displaying conflicts
  - [x] Add conflict status to `NeuralGrid.tsx`
  - [x] Implement manual resolution UI controls
  - [x] Write unit tests for UI components

- [x] **Task 8: Conflict Logging & Analytics** (AC: 5)
  - [x] Create conflict log structure for analysis
  - [x] Track conflict frequency by file/developer
  - [x] Implement smart file assignment suggestions
  - [x] Write unit tests for logging

## Dev Notes

### Existing Infrastructure to Leverage

1. **File Lock System (Story 1.3)**:
   - `server/services/fileWatcher.cjs` - Has `acquireLock()`, `releaseLock()`, `getLock()`, `getAllLocks()`
   - Events: `lockAcquired`, `lockReleased`, `lockExpired`
   - Lock timeout: 5 minutes

2. **Swarm Engine (Story 4-2)**:
   - `src/services/swarmEngine.ts` - Already checks file locks in `executeDeveloperTask()`
   - Uses `checkFileLock()`, `acquireFileLock()`, `releaseFileLock()`

3. **Agent System**:
   - `src/services/agent.ts` - AGENT_DEFINITIONS
   - Can add "merger" agent for conflict resolution

### Architecture Pattern

```typescript
interface ConflictEvent {
    id: string;
    filePath: string;
    developerA: { nodeId: string; content: string; timestamp: number };
    developerB: { nodeId: string; content: string; timestamp: number };
    status: 'pending' | 'auto-resolving' | 'manual-required' | 'resolved' | 'failed';
    resolution?: { content: string; method: 'auto' | 'manual'; resolvedAt: number };
}

// Conflict resolution flow:
// 1. Developer B attempts lock → fails (locked by A)
// 2. System creates ConflictEvent with both developers' content
// 3. Merge Conflict agent analyzes both versions
// 4. Auto-resolution attempted → success OR manual-required
// 5. Resolution saved, developers notified, work continues
```

### Merge Strategies

1. **Append**: New content from B added after A's content (non-overlapping additions)
2. **Replace**: B's changes replace A's (B has priority)
3. **Combine**: Intelligently merge both changes (LLM-assisted)
4. **Manual**: Create conflict file with markers for user resolution

### References

- [Source: docs/epics.md#Story 4.3: Conflict Resolution System]
- [Source: server/services/fileWatcher.cjs] - File locking infrastructure
- [Source: src/services/swarmEngine.ts] - Current lock checking in developer tasks

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Console logs prefixed with `[ConflictResolver]` for conflict detection events
- Console logs prefixed with `[MergeAgent]` for merge agent operations
- Backend logs prefixed with `[CONFLICT]` for API and resolution events

### Completion Notes List

1. All 21 unit tests pass for Story 4-3 components
2. Conflict detection service implemented with callback support (AC: 1)
3. "merger" agent added to AGENT_DEFINITIONS with merge conflict resolution prompt (AC: 1, 2)
4. Automatic resolution using `resolveAuto()` with LLM integration (AC: 2)
5. Manual resolution workflow with `resolveManually()` and conflict file creation (AC: 2, 3)
6. Backend API endpoints: `/api/conflicts/*` with WebSocket events (AC: 3, 4)
7. ConflictAlert UI component for displaying and resolving conflicts (AC: 3, 4)
8. Smart file assignment suggestions using `getSmartFileAssignments()` (AC: 5)
9. Conflict logging and statistics tracking for analysis (AC: 5)

### File List

**Created:**
- `src/services/conflictResolver.ts` - Core conflict detection and resolution service
- `src/components/ConflictAlert.tsx` - UI component for conflict notifications
- `tests/services/conflictResolver.test.ts` - Unit tests for conflict resolver

**Modified:**
- `src/services/agent.ts` - Added "merger" agent definition
- `src/services/swarmEngine.ts` - Integrated conflict resolver
- `src/hooks/useSocket.ts` - Added conflict event types
- `src/components/NeuralGrid.tsx` - Added conflict status display
- `server.cjs` - Added conflict API endpoints and WebSocket events
