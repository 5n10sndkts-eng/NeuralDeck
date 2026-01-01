# Story 6.6: WebSocket Reconnection & Delta Updates

## Story

**As a** Developer
**I want** WebSocket connections to recover gracefully from network interruptions
**So that** I don't lose real-time updates or have to refresh the page

## Status

| Field | Value |
|-------|-------|
| Epic | 6 - Production Hardening & Intelligence |
| Priority | P2 |
| Effort | 2 days |
| Status | ready-for-dev |

## Acceptance Criteria

### AC1: Automatic Reconnection
- [ ] Connection loss triggers automatic reconnection
- [ ] Exponential backoff: 1s, 2s, 4s, 8s, max 30s
- [ ] UI displays reconnection indicator
- [ ] Reconnection successful within 3 attempts for transient failures

### AC2: State Synchronization
- [ ] Missed state updates synced on reconnection
- [ ] UI reflects current server state after resync
- [ ] No data lost during disconnection period
- [ ] Resync completes within 2 seconds

### AC3: Delta Updates
- [ ] Only changed fields transmitted (not full state)
- [ ] Full snapshots only on initial connect or resync
- [ ] Bandwidth reduced >50% vs full updates
- [ ] Delta format efficient and parseable

### AC4: Selective Rendering
- [ ] Only affected components re-render on updates
- [ ] Event filtering prevents unnecessary updates
- [ ] Memory usage stable (no unbounded event history)
- [ ] React re-renders minimized via memoization

### AC5: Stale Connection Handling
- [ ] Disconnection >5 minutes prompts reload option
- [ ] "Force reconnect" button available
- [ ] Connection status always visible in UI
- [ ] Graceful degradation during offline periods

## Tasks

### Task 1: Enhance Socket.IO Reconnection
**File:** `src/hooks/useSocket.ts` (MODIFY)

#### Subtasks:
- [ ] 1.1 Configure reconnection with exponential backoff
  ```typescript
  const socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  });
  ```
- [ ] 1.2 Track connection state (connected, reconnecting, disconnected)
- [ ] 1.3 Emit connection state changes to UI
- [ ] 1.4 Handle max reconnection attempts gracefully

### Task 2: Create Connection Status Component
**File:** `src/components/ConnectionStatus.tsx` (NEW)

#### Subtasks:
- [ ] 2.1 Create status indicator (green dot/red dot/yellow dot)
- [ ] 2.2 Display current connection state
- [ ] 2.3 Show reconnection countdown during backoff
- [ ] 2.4 Add manual reconnect button
- [ ] 2.5 Position in Tactical HUD or header

### Task 3: Implement State Versioning
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [ ] 3.1 Add version counter to server state
- [ ] 3.2 Include version in all state updates
- [ ] 3.3 Track state history (last 100 updates)
- [ ] 3.4 Provide `/api/state/since/:version` endpoint for resync

### Task 4: Client State Resync
**File:** `src/hooks/useSocket.ts` (MODIFY)

#### Subtasks:
- [ ] 4.1 Store last received state version
- [ ] 4.2 Request missed updates on reconnection
  ```typescript
  socket.on('connect', () => {
    socket.emit('resync', { lastVersion: lastReceivedVersion });
  });
  ```
- [ ] 4.3 Apply missed updates in order
- [ ] 4.4 Request full state if too many updates missed

### Task 5: Implement Delta Updates
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [ ] 5.1 Create diff utility for state changes
  ```javascript
  function createDelta(oldState, newState) {
    // Return only changed fields
    return { changed: {...}, removed: [...] };
  }
  ```
- [ ] 5.2 Emit deltas instead of full state
- [ ] 5.3 Include state version in delta
- [ ] 5.4 Emit full snapshot on new connection

### Task 6: Client Delta Application
**File:** `src/hooks/useSocket.ts` (MODIFY)

#### Subtasks:
- [ ] 6.1 Create applyDelta utility
  ```typescript
  function applyDelta<T>(state: T, delta: Delta<T>): T {
    // Merge changed fields, remove deleted
  }
  ```
- [ ] 6.2 Handle both full state and delta updates
- [ ] 6.3 Validate delta version sequence
- [ ] 6.4 Request resync if version gap detected

### Task 7: Optimize Component Rendering
**File:** `src/contexts/` (MODIFY)

#### Subtasks:
- [ ] 7.1 Split global state into domain-specific contexts
- [ ] 7.2 Use selectors to subscribe to specific fields
- [ ] 7.3 Memoize derived data with useMemo
- [ ] 7.4 Add React.memo to frequently updating components
- [ ] 7.5 Profile and eliminate unnecessary re-renders

### Task 8: Stale Connection Handling
**File:** `src/hooks/useSocket.ts` (MODIFY)

#### Subtasks:
- [ ] 8.1 Track disconnection duration
- [ ] 8.2 Show "connection stale" warning after 5 minutes
- [ ] 8.3 Provide "Reload" and "Try Reconnect" options
- [ ] 8.4 Auto-disable real-time features when stale
- [ ] 8.5 Log disconnection events for debugging

## Dev Notes

### Architecture Compliance
- Build on existing useSocket hook
- Maintain Socket.IO event patterns
- Follow existing state management patterns

### Delta Format
```typescript
interface Delta<T> {
  version: number;
  timestamp: number;
  changes: Partial<T>;
  removals: string[]; // Keys removed
}
```

### State Versioning
```typescript
interface VersionedState {
  version: number;
  agents: Map<string, AgentState>;
  files: Map<string, FileState>;
  // ...
}
```

### Testing Requirements
- Simulate network interruptions (browser DevTools)
- Test reconnection with long disconnection periods
- Verify no memory leaks during reconnection cycles
- Load test with many simultaneous connections

### Performance Metrics
- Measure bandwidth before/after delta updates
- Profile re-render counts during updates
- Monitor memory usage over time

## References

- **Epic Source:** `docs/epics.md` - Epic 6, Story 6.6
- **Socket.IO Reconnection:** https://socket.io/docs/v4/client-options/#reconnection
- **Current Hook:** `src/hooks/useSocket.ts`
- **Server:** `server.cjs`

---

**Created:** 2026-01-01
**Workflow:** BMAD Create-Story v4.0
