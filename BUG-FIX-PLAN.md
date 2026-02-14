# NeuralDeck Bug Fix Plan

> Generated from automated E2E browser audit (8 bugs identified, 6 confirmed, 1 partially confirmed, 1 visual-only)

---

## BUG-1: `/api/read` returns 404 during rapid view switching

**Severity:** Medium | **Priority:** P1 | **Confirmed:** Yes (18 of 18 requests returned 404)

### Root Cause
When views are switched rapidly, React components mount/unmount quickly. Some views (especially TheBoard/Kanban) call `readFile()` on mount via `useEffect`. Since `WORKSPACE_PATH = process.cwd()` is the NeuralDeck project directory, `safePath()` (line 431 in `server.cjs`) blocks these reads with "Access Denied: Cannot access NeuralDeck application files."

The `/api/read` endpoint (line 1208) catches this error and returns 404 with the Access Denied message. This is technically correct behavior (no workspace is active), but the flood of 404s during transitions is noisy and causes console errors.

### Fix

**File: `src/components/TheBoard.tsx` (line 20-61)**
```
// Before calling readFile(), check if there's an active workspace
// Add early return if no workspace is set
const loadStories = async () => {
    if (!files || files.length === 0) {
        setStories([]);
        setIsLoading(false);
        return;
    }
    // ... existing logic
};
```

**File: `src/services/api.ts`** — Add request deduplication / abort controller:
```
// Wrap readFile calls with AbortController so unmounting
// components cancel in-flight requests
export const readFile = async (path: string, signal?: AbortSignal) => {
    const resp = await fetch('/api/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ filePath: path }),
        signal,
    });
    // ...
};
```

**File: Each view component that calls readFile on mount** — Add cleanup:
```
useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
}, [deps]);
```

**File: `server.cjs` (line 1233)**
Change error code from 404 to 403 when safePath blocks access (it's not "not found", it's "forbidden"):
```
// Line 1233: Distinguish between ENOENT and Access Denied
if (e.message.includes('Access Denied')) {
    reply.code(403).send({ error: e.message });
} else {
    reply.code(404).send({ error: `File not found. ${e.message}` });
}
```

### Effort: ~2 hours

---

## BUG-2: Git view shows no empty-state message

**Severity:** Low | **Priority:** P2 | **Confirmed:** Yes (0 empty-state messages shown)

### Root Cause
`TheGitLog.tsx` calls `callMCPTool('git_log', ...)` on mount. When no git repo exists, the MCP tool call throws an error. The component sets `error` state with the error message (line 41), but the error banner (line 109-112) only shows a small red text — there is no prominent empty-state UI with guidance for the user.

Line 36 does set `setError("Repository Empty.")` when `parsedCommits.length === 0`, but if the MCP call itself throws (no git repo), the generic error message is shown instead.

### Fix

**File: `src/components/TheGitLog.tsx` (after line 113, inside the scroll area)**

Add an empty-state component when there are no commits and no loading:
```tsx
{!loading && commits.length === 0 && !error && (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <GitBranch size={48} style={{ color: 'rgba(255, 100, 50, 0.3)' }} />
        <div className="text-sm font-display uppercase tracking-wider" style={{ color: 'rgba(255, 100, 50, 0.6)' }}>
            No Repository Detected
        </div>
        <div className="text-[10px] font-mono max-w-xs" style={{ color: 'rgba(0, 240, 255, 0.4)' }}>
            Initialize a git repository in your workspace to view commit history.
            Run <code className="text-cyan-400">git init</code> to get started.
        </div>
    </div>
)}
```

Also improve the error state (line 109-112) to be more prominent when the error is about missing repo:
```tsx
{error && (
    <div className="flex flex-col items-center justify-center h-64 gap-3 px-8 text-center">
        <AlertCircle size={32} style={{ color: 'rgba(255, 100, 50, 0.5)' }} />
        <div className="text-xs font-mono" style={{ color: 'rgba(255, 100, 50, 0.7)' }}>
            {error}
        </div>
    </div>
)}
```

### Effort: ~30 minutes

---

## BUG-3: Kanban board intermittent empty render

**Severity:** Low | **Priority:** P3 | **Confirmed:** Partially (0/10 reproductions, intermittent)

### Root Cause
`TheBoard.tsx` loads stories from files in a `useEffect` on `[files]` dependency. The `files` prop may arrive as empty array on initial mount before the file tree loads, causing a brief empty flash. The component does handle this — it shows a loader and "NO ACTIVE PROTOCOLS" text — but the race condition between file tree loading and view switching can cause a brief frame where columns render with no data.

The `min-w-[320px]` on each column (line 96) also means that with 3 columns, the minimum width is 960px. At narrower viewports the rightmost column could clip.

### Fix

**File: `src/components/TheBoard.tsx` (line 19)**
Add a loading skeleton that persists until files are actually loaded:
```tsx
// Add a prop or context check for whether files have loaded
const [initialLoad, setInitialLoad] = useState(true);

useEffect(() => {
    const loadStories = async () => {
        setIsLoading(true);
        // ... existing logic
        setIsLoading(false);
        setInitialLoad(false);
    };
    loadStories();
}, [files]);
```

**File: `src/components/TheBoard.tsx` (line 96)**
Make columns responsive:
```tsx
// Change min-w-[320px] to min-w-[250px] sm:min-w-[320px]
<div className="flex-1 flex flex-col min-w-[250px] sm:min-w-[320px] max-w-[450px]">
```

**File: `src/components/TheBoard.tsx` (line 177)**
Add `overflow-x-auto` to the columns container:
```tsx
<div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-void)' }}>
    {/* ... header ... */}
    <div className="flex-1 flex overflow-x-auto">
        {renderColumn('BACKLOG', 'todo', ...)}
        {renderColumn('DEVELOPMENT', 'in-progress', ...)}
        {renderColumn('DEPLOYED', 'done', ...)}
    </div>
</div>
```

### Effort: ~1 hour

---

## BUG-4: Mobile header clipping at 375px viewport

**Severity:** Medium | **Priority:** P1 | **Confirmed:** Yes (SAVE at right=386px > 375px viewport, header scrollWidth=1393 > clientWidth=372)

### Root Cause
The editor header in `TheEditor.tsx` uses a `flex` layout with toolbar buttons (SEC_AUDIT, HISTORY, SAVE) that don't wrap or hide at narrow widths. The tab bar + toolbar combined exceed 375px. The outer container has `overflow-hidden` (line 85) so content is clipped rather than scrollable.

### Fix

**File: `src/components/TheEditor.tsx` (around line 87-147, the header area)**

Option A — Make the header toolbar responsive:
```tsx
{/* Editor Header */}
<div className="flex items-center min-h-[40px] overflow-x-auto" style={{...}}>
    {/* File tabs - scrollable */}
    <div className="flex items-center overflow-x-auto flex-shrink min-w-0">
        {openFiles.map(file => (
            // ... existing tab rendering
        ))}
    </div>
    <div className="flex-1 min-w-[8px]" />

    {/* Toolbar - prevent shrinking on desktop, collapse on mobile */}
    <div className="flex items-center gap-1 sm:gap-2 pb-1 pr-2 flex-shrink-0">
        {/* Hide SEC_AUDIT label on very small screens */}
        <CyberButton onClick={triggerScan} variant="danger" className="text-[9px] py-1 h-6" icon={<ShieldAlert size={10} />}>
            <span className="hidden sm:inline">{isScanning ? 'SCANNING...' : 'SEC_AUDIT'}</span>
        </CyberButton>
        <CyberButton onClick={() => setIsHistoryOpen(true)} variant="secondary" className="text-[9px] py-1 h-6" icon={<History size={10} />}>
            <span className="hidden sm:inline">HISTORY</span>
        </CyberButton>
        <CyberButton onClick={() => activeFile && onSave(activeFile, localContent)} variant="primary" className="text-[9px] py-1 h-6" icon={<Save size={10} />}>
            SAVE
        </CyberButton>
    </div>
</div>
```

This hides button labels at `<640px` while keeping icons visible. SAVE keeps its label since it's the primary action.

### Effort: ~1 hour

---

## BUG-5: Mobile sidebar button labels empty

**Severity:** Low | **Priority:** P3 | **Confirmed:** Revised (buttons ARE accessible by role, but some labels are empty strings)

### Root Cause
CyberDock sidebar buttons are accessible via `role="button"`, but at mobile widths some use icon-only rendering and the `aria-label` or text content may be empty. The `.dock-btn` CSS class selector also returned 0 elements, suggesting the actual class names differ.

### Fix

**File: `src/components/CyberDock.tsx`**
Ensure every dock button has an `aria-label` attribute:
```tsx
// For each navigation button, add explicit aria-label
<button
    aria-label={viewName}
    title={viewName}
    onClick={() => onViewChange(viewMode)}
    className="..."
>
    {icon}
    <span className="hidden md:inline text-[9px]">{label}</span>
</button>
```

### Effort: ~30 minutes

---

## BUG-6: Purple border artifacts in Immerse/Roundtable views

**Severity:** Low | **Priority:** P3 | **Confirmed:** Not reproduced via DOM (0 purple elements found)

### Root Cause
Visual artifacts likely come from WebGL canvas rendering (CyberVerse/Immerse uses Three.js or canvas) or CSS gradient transitions that produce purple fringing at viewport edges. These are not detectable via DOM computed styles.

### Fix

**File: `src/components/CyberVerse.tsx` (Immerse view)**
Add a clip mask or `overflow: hidden` to the canvas container:
```tsx
<div className="w-full h-full overflow-hidden" style={{
    backgroundColor: 'var(--color-void)',
    // Prevent canvas overflow artifacts
    clipPath: 'inset(0)',
}}>
    {/* Canvas content */}
</div>
```

**File: `src/components/TheRoundtable.tsx`**
Same treatment — ensure the view's root container clips:
```tsx
<div className="w-full h-full overflow-hidden relative" style={{
    clipPath: 'inset(0)',
}}>
```

### Effort: ~30 minutes (investigate canvas rendering if artifacts persist)

---

## BUG-7: SEC_AUDIT activates scan without active workspace

**Severity:** Medium | **Priority:** P1 | **Confirmed:** Yes (SCANNING=true, no error, no workspace)

### Root Cause
In `TheEditor.tsx` (line 55-63), `triggerScan` is a purely frontend animation. It sets `isScanning = true`, plays a sound, then after 2 seconds calls `onAudit(activeFile)`. There is no guard checking whether `activeFile` is set or whether a workspace is active.

When `activeFile` is falsy (no file open / no workspace), `onAudit(undefined)` is called, which either silently fails or triggers an error in the parent.

### Fix

**File: `src/components/TheEditor.tsx` (line 55-63)**
```tsx
const triggerScan = () => {
    if (isScanning) return;

    // Guard: require an active file to scan
    if (!activeFile) {
        // Could show a toast/notification here
        console.warn('[SEC_AUDIT] No active file to scan');
        return;
    }

    setIsScanning(true);
    SoundEffects.boot();
    setTimeout(() => {
        setIsScanning(false);
        onAudit(activeFile);
    }, 2000);
};
```

**File: `src/components/TheEditor.tsx` (line 138)**
Disable the button visually when no file is active:
```tsx
<CyberButton
    onClick={triggerScan}
    variant="danger"
    className="text-[9px] py-1 h-6"
    icon={<ShieldAlert size={10} />}
    disabled={!activeFile}
>
    {isScanning ? 'SCANNING...' : 'SEC_AUDIT'}
</CyberButton>
```

### Effort: ~30 minutes

---

## BUG-8: Checkpoint API safePath blocks workspace files

**Severity:** High | **Priority:** P0 | **Confirmed:** Yes (500 "Access Denied" even with active workspace)

### Root Cause
The checkpoint endpoints (`GET /api/checkpoints` line 1865, `POST /api/checkpoints` line 1979) call `safePath(filePath)` **without passing workspaceId**. This means they always resolve paths against `WORKSPACE_PATH = process.cwd()` (the NeuralDeck project directory), and `safePath` then blocks access because the resolved path starts with `NEURALDECK_DIR`.

Compare with `/api/read` (line 1216) and `/api/write` (line 1263) which DO pass `workspaceIdToUse` to `safePath()`. The checkpoint endpoints missed this pattern.

### Fix

**File: `server.cjs` (lines 1857-1873, GET /api/checkpoints)**
```javascript
fastify.get('/api/checkpoints', { preHandler: verifyToken }, async (request, reply) => {
    try {
        const { filePath, workspaceId } = request.query;

        if (!filePath) {
            return reply.code(400).send({ error: 'Missing filePath query parameter' });
        }

        // Match the pattern used by /api/read and /api/write
        const activeWorkspace = workspaceId ? null : await workspaceService.getActiveWorkspace();
        const workspaceIdToUse = workspaceId || activeWorkspace?.id || null;

        const cleanPath = safePath(filePath, workspaceIdToUse);
        const checkpoints = await checkpointService.getCheckpoints(cleanPath);

        return { checkpoints };
    } catch (e) {
        fastify.log.error(`[CHECKPOINT] Get error: ${e.message}`);
        reply.code(500).send({ error: e.message });
    }
});
```

**File: `server.cjs` (lines 1971-2001, POST /api/checkpoints)**
```javascript
fastify.post('/api/checkpoints', { preHandler: verifyToken }, async (request, reply) => {
    try {
        const { filePath, summary, workspaceId } = request.body;

        if (!filePath) {
            return reply.code(400).send({ error: 'Missing filePath' });
        }

        // Match the pattern used by /api/read and /api/write
        const activeWorkspace = workspaceId ? null : await workspaceService.getActiveWorkspace();
        const workspaceIdToUse = workspaceId || activeWorkspace?.id || null;

        const cleanPath = safePath(filePath, workspaceIdToUse);
        // ... rest unchanged
    } catch (e) {
        // ... error handling unchanged
    }
});
```

**Also apply to these checkpoint endpoints that likely have the same issue:**
- `POST /api/checkpoints/:checkpointId/restore` (line 1892)
- Any other endpoint calling `safePath()` without workspace context

### Effort: ~1 hour (+ verify all safePath call sites)

---

## Implementation Priority

| Priority | Bug | Effort | Impact |
|----------|-----|--------|--------|
| P0 | BUG-8: Checkpoint API safePath | 1h | Checkpoints completely broken for workspace files |
| P1 | BUG-1: /api/read 404 flood | 2h | Console errors, wasted network, degraded UX |
| P1 | BUG-4: Mobile header clipping | 1h | UI unusable at mobile widths |
| P1 | BUG-7: SEC_AUDIT without workspace | 30m | Misleading scan animation with no result |
| P2 | BUG-2: Git empty state | 30m | Poor UX when no git repo |
| P3 | BUG-3: Kanban empty render | 1h | Intermittent, affects narrow viewports |
| P3 | BUG-5: Sidebar button labels | 30m | Accessibility improvement |
| P3 | BUG-6: Purple border artifacts | 30m | Visual-only, not DOM-based |

**Total estimated effort: ~7 hours**

## Recommended Fix Order

1. **BUG-8** (P0) — Fix checkpoint `safePath` calls. One-line fix per endpoint, highest impact.
2. **BUG-7** (P1) — Add `activeFile` guard to `triggerScan()`. Quick fix.
3. **BUG-4** (P1) — Add responsive classes to editor header toolbar.
4. **BUG-1** (P1) — Add AbortController to view mount effects + fix error code 404->403.
5. **BUG-2** (P2) — Add empty-state UI to TheGitLog.
6. **BUG-3** (P3) — Add `overflow-x-auto` and reduce column `min-w`.
7. **BUG-5** (P3) — Add `aria-label` to CyberDock buttons.
8. **BUG-6** (P3) — Add `clipPath: inset(0)` to canvas containers.
