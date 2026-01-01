# Story 6.2: Conversation Persistence

## Story

**As a** NeuralDeck operator
**I want** my chat conversations to persist across page refreshes and browser sessions
**So that** I can resume work without losing context and access previous conversations for reference

## Status

| Field | Value |
|-------|-------|
| Epic | 6 - Developer Experience Polish |
| Priority | P0 |
| Effort | 2 days |
| Status | done |

## Acceptance Criteria

### AC1: Message Storage
- [x] All chat messages persist to IndexedDB with full ChatMessage metadata
- [x] Messages restore correctly on page load with proper ordering
- [x] Storage handles large conversations (500+ messages) without performance degradation
- [x] Graceful fallback to localStorage if IndexedDB unavailable

### AC2: Session Management
- [x] Conversations are grouped into named sessions
- [x] Session metadata includes: id, title, createdAt, updatedAt, messageCount
- [x] Users can switch between saved sessions from TheTerminal UI
- [x] New session can be started, clearing current messages
- [x] Sessions can be renamed and deleted

### AC3: Context Continuity
- [x] Agent context restoration works within token limits
- [x] Most recent N messages (configurable) are loaded for LLM context
- [x] Older messages accessible for user reference but excluded from LLM calls
- [x] Session summary available for agents to understand conversation history

### AC4: Storage Lifecycle
- [x] Auto-cleanup of sessions older than configurable threshold (default: 30 days)
- [x] Manual cleanup option in settings
- [x] Storage usage indicator showing current/max capacity
- [x] Export session to JSON for backup

## Tasks

### Task 1: Create useConversationStorage Hook
**File:** `src/hooks/useConversationStorage.ts` (NEW)

#### Subtasks:
- [x] 1.1 Implement IndexedDB schema with Dexie.js wrapper
  - Database: `neuraldeck-conversations`
  - Tables: `sessions` (id, title, createdAt, updatedAt), `messages` (id, sessionId, ...ChatMessage fields)
- [x] 1.2 Create CRUD operations for sessions
  - `createSession(title?: string): Promise<Session>`
  - `getSession(id: string): Promise<Session>`
  - `updateSession(id: string, updates: Partial<Session>): Promise<void>`
  - `deleteSession(id: string): Promise<void>`
  - `listSessions(): Promise<Session[]>`
- [x] 1.3 Create message persistence operations
  - `addMessage(sessionId: string, message: ChatMessage): Promise<void>`
  - `getMessages(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]>`
  - `clearMessages(sessionId: string): Promise<void>`
- [x] 1.4 Implement localStorage fallback detection and usage
- [x] 1.5 Add storage quota monitoring and cleanup triggers

### Task 2: Create ConversationContext
**File:** `src/contexts/ConversationContext.tsx` (NEW)

#### Subtasks:
- [x] 2.1 Define ConversationState interface
  ```typescript
  interface ConversationState {
    currentSessionId: string | null;
    sessions: Session[];
    messages: ChatMessage[];
    isLoading: boolean;
    storageType: 'indexeddb' | 'localstorage';
  }
  ```
- [x] 2.2 Create ConversationProvider with reducer pattern
- [x] 2.3 Implement context actions: loadSession, switchSession, newSession, addMessage
- [x] 2.4 Add session persistence to localStorage for "last active session" restoration
- [x] 2.5 Wire useConversationStorage hook into context

### Task 3: Integrate Persistence into App.tsx
**File:** `src/App.tsx` (MODIFY lines 71, 318-350)

#### Subtasks:
- [x] 3.1 Wrap App with ConversationProvider
- [x] 3.2 Replace `useState<ChatMessage[]>` with context consumption
- [x] 3.3 Modify `handleSendMessage` to persist messages via context
- [x] 3.4 Add session initialization on app mount
- [x] 3.5 Ensure agent responses are persisted with full metadata

### Task 4: Add Session Management UI
**File:** `src/components/TheTerminal.tsx` (MODIFY)

#### Subtasks:
- [x] 4.1 Add session selector dropdown/sidebar
- [x] 4.2 Implement "New Session" button with confirmation if current has messages
- [x] 4.3 Add session rename inline editing
- [x] 4.4 Add session delete with confirmation modal
- [x] 4.5 Show session metadata (message count, last updated)

### Task 5: Create ConversationHistory Component
**File:** `src/components/ConversationHistory.tsx` (NEW)

#### Subtasks:
- [x] 5.1 Create sliding panel/modal for session list
- [x] 5.2 Display sessions with title, date, message count, preview
- [x] 5.3 Add search/filter capability
- [x] 5.4 Implement session export to JSON
- [x] 5.5 Add bulk delete for old sessions

### Task 6: Socket.IO Chat Event Integration
**File:** `src/hooks/useSocket.ts` (MODIFY lines 210-450)

#### Subtasks:
- [x] 6.1 Add `chat:message` event listener for real-time sync
- [x] 6.2 Add `chat:session` event for multi-tab session coordination
- [x] 6.3 Emit message events when sending/receiving messages
- [x] 6.4 Handle reconnection with message sync

### Task 7: Storage Lifecycle Management
**File:** `src/services/storageManager.ts` (NEW)

#### Subtasks:
- [x] 7.1 Implement auto-cleanup scheduler (runs on app init)
- [x] 7.2 Add configurable retention period (localStorage setting)
- [x] 7.3 Create storage usage calculation utility
- [x] 7.4 Add cleanup confirmation UI in settings

## Dev Notes

### Architecture Compliance
- Follow existing localStorage pattern from `src/contexts/UIContext.tsx`
- Use same `ChatMessage` interface from `src/types.ts` - no modifications needed
- Context should be independent and not tightly coupled to App.tsx state

### File Structure
```
src/
├── contexts/
│   └── ConversationContext.tsx  (NEW)
├── hooks/
│   └── useConversationStorage.ts (NEW)
├── components/
│   └── ConversationHistory.tsx   (NEW)
├── services/
│   └── storageManager.ts         (NEW)
```

### Dependencies
- Consider adding `dexie` (IndexedDB wrapper) - lightweight, TypeScript-native
- Alternative: Use raw IndexedDB with idb-keyval for simpler needs

### Testing Requirements
- Unit tests for useConversationStorage hook (mock IndexedDB)
- Integration tests for context state management
- E2E test for message persistence across page refresh
- Storage quota limit testing

### Performance Considerations
- Lazy load older messages (pagination)
- Debounce message persistence (batch writes every 500ms)
- Virtual scrolling for large session lists
- IndexedDB transactions for bulk operations

### Security Notes
- Messages stored locally only - no server persistence
- Consider encryption option for sensitive conversations (future enhancement)
- Clear sessions on logout if user authentication added later

## References

- **Epic Source:** `docs/epics.md` - Epic 6, Story 6.2
- **Research:** `docs/research-llm-codebase-access.md` - RAG integration patterns
- **Existing Patterns:** `src/contexts/UIContext.tsx` - localStorage persistence example
- **Chat Architecture:** `src/App.tsx:71`, `src/services/api.ts`, `server.cjs:312-425`

---

**Created:** 2026-01-01
**Workflow:** BMAD Create-Story v4.0
