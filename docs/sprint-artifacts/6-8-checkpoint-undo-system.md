# Story 6.8: Checkpoint/Undo System

## Story

**As a** Developer
**I want** the system to create checkpoints before agent modifications
**So that** I can undo changes if an agent makes a mistake

## Status

| Field | Value |
|-------|-------|
| Epic | 6 - Production Hardening & Intelligence |
| Priority | P2 |
| Effort | 3 days |
| Status | done |

## Acceptance Criteria

### AC1: Automatic Checkpointing
- [ ] Checkpoint created before each file modification
- [ ] Checkpoint includes: file path, content, timestamp, agent identifier
- [ ] Checkpoints stored in `.neuraldeck/checkpoints/` directory
- [ ] Checkpoint creation is atomic and reliable

### AC2: Checkpoint Display
- [ ] List of available checkpoints for each file
- [ ] Each shows: timestamp, agent name, change summary
- [ ] Preview checkpoint content before restoring
- [ ] Chronological ordering (newest first)

### AC3: Restore Functionality
- [ ] One-click restore to selected checkpoint
- [ ] New checkpoint created before restore (safety net)
- [ ] Restore action logged
- [ ] File watcher triggers re-index after restore

### AC4: Storage Management
- [ ] Automatic pruning of old checkpoints (configurable retention)
- [ ] Minimum 10 checkpoints retained per file
- [ ] Manual checkpoint deletion available
- [ ] Storage usage monitoring

### AC5: Git Integration (Optional)
- [ ] Option to use Git commits for checkpoints
- [ ] Standard commit message format for checkpoint commits
- [ ] User configurable: Git vs file-based checkpoints
- [ ] Works correctly in non-Git directories

## Tasks

### Task 1: Create Checkpoint Service
**File:** `server/lib/checkpointService.cjs` (NEW)

#### Subtasks:
- [ ] 1.1 Create checkpoint directory structure
  ```
  .neuraldeck/
  └── checkpoints/
      ├── index.json  # Checkpoint index
      └── files/
          └── <hash>/
              └── <timestamp>.txt
  ```
- [ ] 1.2 Implement createCheckpoint function
  ```javascript
  async function createCheckpoint(filePath, content, agentId, summary) {
    const checkpoint = {
      id: uuid(),
      filePath,
      timestamp: Date.now(),
      agentId,
      summary,
      contentHash: hash(content),
    };
    // Store content and index entry
  }
  ```
- [ ] 1.3 Implement getCheckpoints(filePath)
- [ ] 1.4 Implement restoreCheckpoint(checkpointId)
- [ ] 1.5 Implement deleteCheckpoint(checkpointId)

### Task 2: Integrate with File Write API
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [ ] 2.1 Hook checkpoint creation into /api/write endpoint
  ```javascript
  app.post('/api/write', async (req, res) => {
    const oldContent = await fs.readFile(path).catch(() => null);
    if (oldContent) {
      await checkpointService.createCheckpoint(
        path, oldContent, agentId, 'Before agent modification'
      );
    }
    await fs.writeFile(path, content);
    // ...
  });
  ```
- [ ] 2.2 Extract agent identifier from request
- [ ] 2.3 Generate meaningful change summaries
- [ ] 2.4 Handle checkpoint creation failures gracefully

### Task 3: Create Checkpoint API Endpoints
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [ ] 3.1 GET `/api/checkpoints/:filePath` - List checkpoints
- [ ] 3.2 GET `/api/checkpoints/:checkpointId/content` - Preview content
- [ ] 3.3 POST `/api/checkpoints/:checkpointId/restore` - Restore checkpoint
- [ ] 3.4 DELETE `/api/checkpoints/:checkpointId` - Delete checkpoint
- [ ] 3.5 GET `/api/checkpoints/stats` - Storage usage stats

### Task 4: Create CheckpointPanel Component
**File:** `src/components/CheckpointPanel.tsx` (NEW)

#### Subtasks:
- [ ] 4.1 Create sliding panel or modal for checkpoint list
- [ ] 4.2 Display checkpoint list with metadata
  ```typescript
  interface CheckpointItem {
    id: string;
    timestamp: number;
    agentId: string;
    summary: string;
  }
  ```
- [ ] 4.3 Add preview pane for selected checkpoint
- [ ] 4.4 Add restore button with confirmation
- [ ] 4.5 Apply Cyberpunk styling (timeline visualization)

### Task 5: Add Checkpoint UI Trigger
**File:** `src/components/TheEditor.tsx` (MODIFY)

#### Subtasks:
- [ ] 5.1 Add "History" or "Checkpoints" button to editor toolbar
- [ ] 5.2 Load checkpoints for currently open file
- [ ] 5.3 Show checkpoint count badge
- [ ] 5.4 Integrate CheckpointPanel display

### Task 6: Implement Storage Cleanup
**File:** `server/lib/checkpointService.cjs` (MODIFY)

#### Subtasks:
- [ ] 6.1 Create cleanup scheduler (runs daily or on demand)
- [ ] 6.2 Implement retention policy
  ```javascript
  const config = {
    maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    minCheckpointsPerFile: 10,
    maxStorageMB: 500,
  };
  ```
- [ ] 6.3 Prune checkpoints exceeding age limit
- [ ] 6.4 Keep minimum checkpoints per file
- [ ] 6.5 Add manual "Clean Up" API endpoint

### Task 7: Git Integration (Optional)
**File:** `server/lib/checkpointService.cjs` (MODIFY)

#### Subtasks:
- [ ] 7.1 Detect if workspace is a Git repository
- [ ] 7.2 Create Git-based checkpoint option
  ```javascript
  async function createGitCheckpoint(filePath, summary) {
    await exec(`git add ${filePath}`);
    await exec(`git commit -m "[NeuralDeck Checkpoint] ${summary}"`);
  }
  ```
- [ ] 7.3 Restore using `git checkout` for Git checkpoints
- [ ] 7.4 Add user preference for checkpoint mode
- [ ] 7.5 Handle Git errors gracefully

### Task 8: Testing
**Files:** Test files

#### Subtasks:
- [ ] 8.1 Unit test checkpoint service CRUD operations
- [ ] 8.2 Integration test with file write API
- [ ] 8.3 Test restore functionality end-to-end
- [ ] 8.4 Test cleanup/pruning logic
- [ ] 8.5 Test Git integration (if implemented)

## Dev Notes

### Architecture Compliance
- Use existing file system APIs
- Follow backend service patterns
- Integrate with file watcher for index updates

### Checkpoint Index Schema
```json
{
  "version": 1,
  "checkpoints": {
    "abc123": {
      "filePath": "src/App.tsx",
      "timestamp": 1704067200000,
      "agentId": "developer",
      "summary": "Added routing logic",
      "contentFile": "files/abc123/1704067200000.txt"
    }
  }
}
```

### Storage Considerations
- Use file hashing to detect identical content
- Compress older checkpoints (optional)
- Store content as plain text for readability
- Index as JSON for fast lookups

### Safety Features
- Always create checkpoint before restore
- Never delete all checkpoints for a file
- Handle disk full errors gracefully
- Verify content integrity on restore

### Testing Scenarios
- Multiple rapid changes to same file
- Restore then continue editing
- Restore to very old checkpoint
- Checkpoint cleanup during active work

## References

- **Epic Source:** `docs/epics.md` - Epic 6, Story 6.8
- **File API:** `server.cjs` /api/write endpoint
- **Similar Pattern:** VS Code Local History extension
- **Git Integration:** simple-git library

---

**Created:** 2026-01-01
**Workflow:** BMAD Create-Story v4.0

## Dev Agent Record

### File List
- `server/services/checkpointService.cjs` (NEW) - Core service logic
- `server.cjs` (MODIFY) - Integrated checkpoint service and API/write hook
- `src/components/CheckpointPanel.tsx` (NEW) - Checkpoint UI
- `src/components/TheEditor.tsx` (MODIFY) - Integrated CheckpointPanel and History button
- `src/services/api.ts` (MODIFY) - Added checkpoint API client functions
- `server/services/__tests__/checkpointService.test.js` (NEW) - Unit tests

### Testing
- **Unit Tests**: Created `server/services/__tests__/checkpointService.test.js` covering AC1 (Creation), AC2 (Listing), AC3 (Restore), AC4 (Cleanup). All tests passed.
- **Manual Verification**: Verified UI integration in `TheEditor` and API endpoints.

### Change Log
- Implemented `CheckpointService` with file-based storage and index.
- Added automatic checkpointing to `/api/write` endpoint.
- Created `CheckpointPanel` with timeline view and preview/restore functionality.
- Integrated `History` button in Editor toolbar.
- Validated with unit tests.
