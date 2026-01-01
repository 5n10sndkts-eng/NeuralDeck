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
| Status | ready-for-dev |

## Acceptance Criteria

### AC1: Message Storage
- [ ] All chat messages persist to IndexedDB with full ChatMessage metadata
- [ ] Messages restore correctly on page load with proper ordering
- [ ] Storage handles large conversations (500+ messages) without performance degradation
- [ ] Graceful fallback to localStorage if IndexedDB unavailable

### AC2: Session Management
- [ ] Conversations are grouped into named sessions
- [ ] Session metadata includes: id, title, createdAt, updatedAt, messageCount
- [ ] Users can switch between saved sessions from TheTerminal UI
- [ ] New session can be started, clearing current messages
- [ ] Sessions can be renamed and deleted

### AC3: Context Continuity
- [ ] Agent context restoration works within token limits
- [ ] Most recent N messages (configurable) are loaded for LLM context
- [ ] Older messages accessible for user reference but excluded from LLM calls
- [ ] Session summary available for agents to understand conversation history

### AC4: Storage Lifecycle
- [ ] Auto-cleanup of sessions older than configurable threshold (default: 30 days)
- [ ] Manual cleanup option in settings
- [ ] Storage usage indicator showing current/max capacity
- [ ] Export session to JSON for backup

## Tasks

### Task 1: Create useConversationStorage Hook
**File:** `src/hooks/useConversationStorage.ts` (NEW)

#### Subtasks:
- [ ] 1.1 Implement IndexedDB schema with Dexie.js wrapper
  - Database: `neuraldeck-conversations`
  - Tables: `sessions` (id, title, createdAt, updatedAt), `messages` (id, sessionId, ...ChatMessage fields)
- [ ] 1.2 Create CRUD operations for sessions
  - `createSession(title?: string): Promise<Session>`
  - `getSession(id: string): Promise<Session>`
  - `updateSession(id: string, updates: Partial<Session>): Promise<void>`
  - `deleteSession(id: string): Promise<void>`
  - `listSessions(): Promise<Session[]>`
- [ ] 1.3 Create message persistence operations
  - `addMessage(sessionId: string, message: ChatMessage): Promise<void>`
  - `getMessages(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]>`
  - `clearMessages(sessionId: string): Promise<void>`
- [ ] 1.4 Implement localStorage fallback detection and usage
- [ ] 1.5 Add storage quota monitoring and cleanup triggers

### Task 2: Create ConversationContext
**File:** `src/contexts/ConversationContext.tsx` (NEW)

#### Subtasks:
- [ ] 2.1 Define ConversationState interface
  ```typescript
  interface ConversationState {
    currentSessionId: string | null;
    sessions: Session[];
    messages: ChatMessage[];
    isLoading: boolean;
    storageType: 'indexeddb' | 'localstorage';
  }
  ```
- [ ] 2.2 Create ConversationProvider with reducer pattern
- [ ] 2.3 Implement context actions: loadSession, switchSession, newSession, addMessage
- [ ] 2.4 Add session persistence to localStorage for "last active session" restoration
- [ ] 2.5 Wire useConversationStorage hook into context

### Task 3: Integrate Persistence into App.tsx
**File:** `src/App.tsx` (MODIFY lines 71, 318-350)

#### Subtasks:
- [ ] 3.1 Wrap App with ConversationProvider
- [ ] 3.2 Replace `useState<ChatMessage[]>` with context consumption
- [ ] 3.3 Modify `handleSendMessage` to persist messages via context
- [ ] 3.4 Add session initialization on app mount
- [ ] 3.5 Ensure agent responses are persisted with full metadata

### Task 4: Add Session Management UI
**File:** `src/components/TheTerminal.tsx` (MODIFY)

#### Subtasks:
- [ ] 4.1 Add session selector dropdown/sidebar
- [ ] 4.2 Implement "New Session" button with confirmation if current has messages
- [ ] 4.3 Add session rename inline editing
- [ ] 4.4 Add session delete with confirmation modal
- [ ] 4.5 Show session metadata (message count, last updated)

### Task 5: Create ConversationHistory Component
**File:** `src/components/ConversationHistory.tsx` (NEW)

#### Subtasks:
- [ ] 5.1 Create sliding panel/modal for session list
- [ ] 5.2 Display sessions with title, date, message count, preview
- [ ] 5.3 Add search/filter capability
- [ ] 5.4 Implement session export to JSON
- [ ] 5.5 Add bulk delete for old sessions

### Task 6: Socket.IO Chat Event Integration
**File:** `src/hooks/useSocket.ts` (MODIFY lines 210-450)

#### Subtasks:
- [ ] 6.1 Add `chat:message` event listener for real-time sync
- [ ] 6.2 Add `chat:session` event for multi-tab session coordination
- [ ] 6.3 Emit message events when sending/receiving messages
- [ ] 6.4 Handle reconnection with message sync

### Task 7: Storage Lifecycle Management
**File:** `src/services/storageManager.ts` (NEW)

#### Subtasks:
- [ ] 7.1 Implement auto-cleanup scheduler (runs on app init)
- [ ] 7.2 Add configurable retention period (localStorage setting)
- [ ] 7.3 Create storage usage calculation utility
- [ ] 7.4 Add cleanup confirmation UI in settings

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
