# Story 6.7: Code Diff Visualization

## Story

**As a** Developer
**I want** to see visual diffs of file changes proposed by agents
**So that** I can review and approve changes before they are applied

## Status

| Field | Value |
|-------|-------|
| Epic | 6 - Production Hardening & Intelligence |
| Priority | P2 |
| Effort | 3 days |
| Status | ready-for-dev |

## Acceptance Criteria

### AC1: Diff View Display
- [ ] Side-by-side or unified diff view available
- [ ] Additions highlighted in green
- [ ] Deletions highlighted in red
- [ ] Syntax highlighting appropriate to file type

### AC2: Diff Navigation
- [ ] Scroll through all changes
- [ ] Line numbers for old and new versions
- [ ] Context lines shown (3 lines default, configurable)
- [ ] Jump to next/previous change

### AC3: Multi-File Changes
- [ ] File list with change summary
- [ ] Click file to show its diff
- [ ] Total lines added/removed per file
- [ ] Batch approve/reject all changes

### AC4: Apply/Reject Workflow
- [ ] "Apply" button writes changes to file
- [ ] File watcher detects change and updates index
- [ ] Confirmation message displayed
- [ ] "Reject" leaves file unchanged

### AC5: Rejection Handling
- [ ] Agent notified of rejection
- [ ] Optional rejection reason input
- [ ] Rejection logged for analysis
- [ ] Agent can propose alternatives

## Tasks

### Task 1: Install Diff Library
**File:** `package.json` (MODIFY)

#### Subtasks:
- [ ] 1.1 Evaluate diff libraries (diff, diff2html, react-diff-viewer)
- [ ] 1.2 Install chosen library
  ```bash
  npm install react-diff-viewer-continued
  npm install diff
  ```
- [ ] 1.3 Add syntax highlighting library (prism-react-renderer or similar)

### Task 2: Create DiffViewer Component
**File:** `src/components/DiffViewer.tsx` (NEW)

#### Subtasks:
- [ ] 2.1 Create base diff viewer component
  ```typescript
  interface DiffViewerProps {
    oldCode: string;
    newCode: string;
    fileName: string;
    language: string;
    onApply: () => void;
    onReject: (reason?: string) => void;
  }
  ```
- [ ] 2.2 Support split (side-by-side) and unified views
- [ ] 2.3 Add syntax highlighting integration
- [ ] 2.4 Apply Cyberpunk styling (dark theme, neon highlights)
- [ ] 2.5 Add line number display

### Task 3: Create MultiFileDiff Component
**File:** `src/components/MultiFileDiff.tsx` (NEW)

#### Subtasks:
- [ ] 3.1 Create file list sidebar
  ```typescript
  interface FileChange {
    path: string;
    oldContent: string;
    newContent: string;
    additions: number;
    deletions: number;
  }
  ```
- [ ] 3.2 Show additions/deletions count per file
- [ ] 3.3 Highlight currently selected file
- [ ] 3.4 Add "Apply All" and "Reject All" buttons
- [ ] 3.5 Track applied/rejected status per file

### Task 4: Integrate with Agent Workflow
**File:** `src/services/agent.ts` (MODIFY)

#### Subtasks:
- [ ] 4.1 Detect when agent proposes file changes
- [ ] 4.2 Capture old content before proposed change
- [ ] 4.3 Present diff to user instead of direct write
- [ ] 4.4 Wait for user approval before applying
- [ ] 4.5 Handle approval/rejection callbacks

### Task 5: Backend Diff Endpoint
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [ ] 5.1 Create `/api/diff/preview` endpoint
  ```javascript
  // POST { path, proposedContent }
  // Returns { oldContent, newContent, diff }
  ```
- [ ] 5.2 Create `/api/diff/apply` endpoint
- [ ] 5.3 Create `/api/diff/reject` endpoint
- [ ] 5.4 Log all diff decisions for audit

### Task 6: Add Diff Panel to UI
**File:** `src/components/TheEditor.tsx` (MODIFY)

#### Subtasks:
- [ ] 6.1 Add diff panel as modal or slide-out
- [ ] 6.2 Trigger diff panel when agent proposes changes
- [ ] 6.3 Queue multiple pending diffs
- [ ] 6.4 Show pending diff count in UI

### Task 7: Rejection Feedback Loop
**File:** Various

#### Subtasks:
- [ ] 7.1 Create rejection reason input dialog
- [ ] 7.2 Pass rejection reason to agent
- [ ] 7.3 Agent can use rejection context for next attempt
- [ ] 7.4 Log rejection reasons for improvement analysis

### Task 8: Testing
**Files:** Test files

#### Subtasks:
- [ ] 8.1 Unit test DiffViewer with various diff scenarios
- [ ] 8.2 Test multi-file diff navigation
- [ ] 8.3 Test apply/reject workflow end-to-end
- [ ] 8.4 Verify file watcher updates after apply
- [ ] 8.5 Accessibility testing (keyboard navigation)

## Dev Notes

### Architecture Compliance
- Integrate with existing file API (`/api/write`)
- Use existing agent event system
- Maintain Cyberpunk aesthetic

### Diff Library Choice: react-diff-viewer-continued
- Actively maintained fork
- Split/unified view support
- Syntax highlighting built-in
- Customizable styling

### Styling
```css
/* Cyberpunk diff colors */
.diff-added { background: rgba(0, 255, 100, 0.1); color: #00ff64; }
.diff-removed { background: rgba(255, 0, 60, 0.1); color: #ff003c; }
.diff-line-number { color: #00f0ff; opacity: 0.5; }
```

### Agent Integration Pattern
```typescript
// In agent workflow
const proposedChange = await generateCode();
const approved = await presentDiff(file.path, file.content, proposedChange);
if (approved) {
  await writeFile(file.path, proposedChange);
} else {
  // Handle rejection, possibly retry
}
```

### Testing Scenarios
- Simple single-line change
- Large multi-line changes
- File creation (no old content)
- File deletion
- Multiple files changed simultaneously

## References

- **Epic Source:** `docs/epics.md` - Epic 6, Story 6.7
- **react-diff-viewer:** https://github.com/praneshr/react-diff-viewer
- **Current Editor:** `src/components/TheEditor.tsx`
- **Agent Service:** `src/services/agent.ts`

---

**Created:** 2026-01-01
**Workflow:** BMAD Create-Story v4.0
