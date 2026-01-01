# Story 6.5: List Virtualization

## Story

**As a** Developer
**I want** long lists to render efficiently without performance degradation
**So that** the UI remains responsive even with thousands of files or messages

## Status

| Field | Value |
|-------|-------|
| Epic | 6 - Production Hardening & Intelligence |
| Priority | P1 |
| Effort | 2 days |
| Status | ready-for-dev |

## Acceptance Criteria

### AC1: File Explorer Virtualization
- [ ] File tree with >100 files uses virtualized rendering
- [ ] Only visible items plus buffer in DOM
- [ ] Scrolling smooth (60fps) regardless of file count
- [ ] Expand/collapse folders works correctly with virtualization

### AC2: Chat Message Virtualization
- [ ] Message list with >100 messages virtualized
- [ ] Scroll position maintained when new messages arrive
- [ ] Scrolling to old messages loads dynamically
- [ ] Variable height messages supported

### AC3: Threat Dashboard Virtualization
- [ ] Vulnerability findings list virtualized
- [ ] Filtering by severity updates list efficiently
- [ ] Expanding a finding doesn't re-render all items
- [ ] Sort operations maintain scroll position

### AC4: Scroll Performance
- [ ] Rapid scrolling shows no visible blank spaces (overscan)
- [ ] Scroll position accurate and stable
- [ ] Memory usage constant regardless of list size
- [ ] No jank during scroll (60fps maintained)

### AC5: Accessibility
- [ ] Keyboard navigation works through virtualized items
- [ ] Screen readers announce list items correctly
- [ ] Focus management works with virtualization
- [ ] ARIA attributes properly applied

## Tasks

### Task 1: Install Virtualization Library
**File:** `package.json` (MODIFY)

#### Subtasks:
- [ ] 1.1 Evaluate react-window vs react-virtualized
- [ ] 1.2 Install chosen library
  ```bash
  npm install react-window react-window-infinite-loader
  npm install -D @types/react-window
  ```
- [ ] 1.3 Add react-virtualized-auto-sizer for responsive sizing

### Task 2: Create VirtualizedList Component
**File:** `src/components/VirtualizedList.tsx` (NEW)

#### Subtasks:
- [ ] 2.1 Create base virtualized list wrapper
  ```typescript
  interface VirtualizedListProps<T> {
    items: T[];
    itemHeight: number | ((index: number) => number);
    renderItem: (item: T, index: number) => ReactNode;
    overscanCount?: number;
  }
  ```
- [ ] 2.2 Support fixed and variable height items
- [ ] 2.3 Add keyboard navigation support
- [ ] 2.4 Include ARIA live regions for screen readers
- [ ] 2.5 Apply Cyberpunk styling (scrollbar, glow effects)

### Task 3: Virtualize File Explorer
**File:** `src/components/TheGrid.tsx` (MODIFY)

#### Subtasks:
- [ ] 3.1 Replace standard list with VirtualizedList
- [ ] 3.2 Handle folder expand/collapse with dynamic sizing
- [ ] 3.3 Maintain selection state during virtualization
- [ ] 3.4 Implement efficient filtering without full re-render
- [ ] 3.5 Test with 1000+ file workspace

### Task 4: Virtualize Chat Messages
**File:** `src/components/TheTerminal.tsx` (MODIFY)

#### Subtasks:
- [ ] 4.1 Implement VariableSizeList for message heights
- [ ] 4.2 Auto-scroll to bottom on new messages
- [ ] 4.3 Implement "scroll to bottom" button when scrolled up
- [ ] 4.4 Cache measured heights for performance
- [ ] 4.5 Handle message grouping (agent thoughts, etc.)

### Task 5: Virtualize Threat Dashboard
**File:** `src/components/ThreatDashboard.tsx` (MODIFY)

#### Subtasks:
- [ ] 5.1 Virtualize vulnerability findings list
- [ ] 5.2 Implement expandable rows with height recalculation
- [ ] 5.3 Maintain filter state without resetting scroll
- [ ] 5.4 Sort without losing position
- [ ] 5.5 Test with 500+ findings

### Task 6: Performance Optimization
**Files:** Various

#### Subtasks:
- [ ] 6.1 Configure overscan count (5-10 items)
- [ ] 6.2 Implement item caching/memoization
- [ ] 6.3 Add windowed rendering for nested lists
- [ ] 6.4 Profile with React DevTools Profiler
- [ ] 6.5 Ensure no memory leaks during scroll

### Task 7: Testing
**Files:** Test files

#### Subtasks:
- [ ] 7.1 Unit test VirtualizedList component
- [ ] 7.2 Integration test with large datasets
- [ ] 7.3 Performance test (FPS during scroll)
- [ ] 7.4 Accessibility audit (screen reader testing)
- [ ] 7.5 Memory usage profiling

## Dev Notes

### Architecture Compliance
- Follow existing component patterns
- Use TypeScript generics for type safety
- Maintain Cyberpunk aesthetic in styling

### Library Choice: react-window
Chosen over react-virtualized because:
- Smaller bundle size (~6KB vs ~35KB)
- Simpler API
- Better TypeScript support
- Sufficient for our use cases

### Key Patterns
```typescript
// Fixed height items
<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {Row}
</FixedSizeList>

// Variable height items (messages)
<VariableSizeList
  height={400}
  itemCount={items.length}
  itemSize={getItemHeight}
  width="100%"
>
  {Row}
</VariableSizeList>
```

### Accessibility Requirements
- `role="listbox"` on container
- `role="option"` on items
- `aria-setsize` and `aria-posinset` for position
- Keyboard: Arrow keys, Home, End, Page Up/Down

### Testing Datasets
- Generate 1000 files for file explorer testing
- Generate 500 messages for chat testing
- Generate 200 vulnerabilities for dashboard testing

## References

- **Epic Source:** `docs/epics.md` - Epic 6, Story 6.5
- **react-window:** https://react-window.vercel.app/
- **Virtualization Guide:** https://web.dev/virtualize-long-lists-react-window/
- **Components:** `src/components/TheGrid.tsx`, `src/components/TheTerminal.tsx`

---

**Created:** 2026-01-01
**Workflow:** BMAD Create-Story v4.0
