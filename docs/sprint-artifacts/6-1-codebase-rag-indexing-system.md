# Story 6.1: Codebase RAG Indexing System

## Story

**As a** Developer,
**I want** the system to automatically index my codebase and provide semantic search,
**So that** agents have deep project understanding and can make contextually-aware decisions.

**Priority:** P0 (Critical)
**Effort:** 5 days
**Epic:** Epic 6 - Production Hardening & Intelligence
**Dependencies:** Epic 1 (shared file watcher from Story 1.3)

---

## Acceptance Criteria

### AC1: Automatic Codebase Indexing on Startup

**Given** the NeuralDeck application is started
**When** the system initializes
**Then** the system must scan the workspace directory for all code files
**And** the system must chunk files into semantic segments (functions, classes, imports)
**And** chunks must be embedded using the local embedding model (Xenova/all-MiniLM-L6-v2)
**And** embeddings must be stored in an in-memory vector store with optional LevelDB persistence

### AC2: Semantic Search Retrieval

**Given** the codebase is indexed
**When** a user or agent makes a request
**Then** the system must perform semantic search against the vector store
**And** the top-N most relevant code chunks must be retrieved (configurable, default 5-10)
**And** retrieved context must be injected into agent prompts automatically

### AC3: Incremental Index Updates

**Given** files are created, modified, or deleted
**When** the file watcher detects changes
**Then** the index must be updated incrementally (not full re-index)
**And** deleted file chunks must be removed from the vector store
**And** modified file chunks must be re-embedded and updated
**And** index updates must complete within 5 seconds for single file changes

### AC4: Query Logging and Debugging

**Given** the RAG system is active
**When** the user queries project structure or code patterns
**Then** the system must return relevant code snippets with file paths
**And** agents must reference specific files and line numbers in responses
**And** the system must log RAG queries and retrieved chunks for debugging

### AC5: Scalability and Error Handling

**Given** the workspace contains large files (>10MB)
**When** those files are indexed
**Then** the system must chunk them appropriately (max 2000 tokens per chunk)
**And** the system must handle indexing errors gracefully without blocking other files
**And** the total index must support workspaces up to 10,000 files

---

## Tasks

### Task 1: Enhance RAG Service Foundation
**File:** `server/lib/rag.cjs`

- [x] **1.1** Existing prototype uses LangChain with `RecursiveCharacterTextSplitter` (chunk 1000, overlap 200)
- [ ] **1.2** Add `removeDocument(metadata.source)` method to delete chunks by source file
- [ ] **1.3** Add `updateDocument(content, metadata)` method that removes then re-ingests
- [ ] **1.4** Add `getStats()` method returning chunk count, file count, memory usage
- [ ] **1.5** Add `clear()` method to reset the vector store
- [ ] **1.6** Increase chunk size to 2000 tokens with 300 overlap for better context

### Task 2: Create Codebase Indexer Service
**File:** `server/services/codebaseIndexer.cjs` (new)

- [ ] **2.1** Create singleton `CodebaseIndexerService` class extending EventEmitter
- [ ] **2.2** Implement `init(logger)` method that scans workspace and indexes all code files
- [ ] **2.3** Define file extension whitelist: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.html`, `.cjs`, `.yaml`, `.yml`
- [ ] **2.4** Ignore patterns: `node_modules/`, `.git/`, `dist/`, `coverage/`, `*.lock`
- [ ] **2.5** Emit progress events: `indexing:start`, `indexing:progress`, `indexing:complete`
- [ ] **2.6** Track indexing stats: files indexed, chunks created, time elapsed

### Task 3: Integrate with File Watcher
**File:** `server/services/codebaseIndexer.cjs`

- [ ] **3.1** Subscribe to `FileWatcherService.fileChange` events
- [ ] **3.2** On `create` event: ingest new file via `rag.ingest()`
- [ ] **3.3** On `update` event: call `rag.updateDocument()`
- [ ] **3.4** On `delete` event: call `rag.removeDocument()`
- [ ] **3.5** Debounce rapid file changes (100ms) to batch updates
- [ ] **3.6** Log all incremental updates with timing

### Task 4: Create RAG Query API Endpoint
**File:** `server.cjs`

- [ ] **4.1** Add `GET /api/rag/search?q=<query>&k=<limit>` endpoint
- [ ] **4.2** Return `{ results: [{ content, source, score }], stats: { queryTime, totalChunks } }`
- [ ] **4.3** Add `GET /api/rag/stats` endpoint returning indexer statistics
- [ ] **4.4** Add `POST /api/rag/reindex` endpoint to force full re-index
- [ ] **4.5** Add request validation and error handling

### Task 5: Inject RAG Context into Agent Prompts
**File:** `server/agents/core.cjs`

- [ ] **5.1** Before LLM call, extract key terms from user message
- [ ] **5.2** Query RAG for relevant chunks (top 5-10)
- [ ] **5.3** Format chunks as context block: `## Relevant Codebase Context\n\n{chunks}`
- [ ] **5.4** Prepend context to agent system prompt
- [ ] **5.5** Add config flag to enable/disable RAG context injection
- [ ] **5.6** Log context injection details for debugging

### Task 6: Add Optional Persistence Layer
**File:** `server/lib/ragPersistence.cjs` (new)

- [ ] **6.1** Implement LevelDB-based persistence for vector store
- [ ] **6.2** Save index on shutdown via graceful shutdown hook
- [ ] **6.3** Load index on startup if persistence file exists
- [ ] **6.4** Add config flag `RAG_PERSIST=true|false` (default false)
- [ ] **6.5** Implement index versioning to handle schema changes

### Task 7: Frontend RAG Status Display
**File:** `src/components/TheOrchestrator.tsx`

- [ ] **7.1** Add RAG status indicator showing: indexed files count, chunk count
- [ ] **7.2** Show indexing progress during initial scan
- [ ] **7.3** Display "RAG Active" badge when context injection is enabled
- [ ] **7.4** Add tooltip showing last indexed timestamp

---

## Dev Notes

### Existing Infrastructure to Leverage

1. **RAG Prototype** (`server/lib/rag.cjs`):
   - Already uses LangChain with `RecursiveCharacterTextSplitter`
   - Uses `Xenova/all-MiniLM-L6-v2` (384-dim embeddings, fast on CPU)
   - In-memory `MemoryVectorStore` - needs persistence option

2. **File Watcher** (`server/services/fileWatcher.cjs`):
   - Singleton `FileWatcherService` with pub/sub pattern
   - Emits `fileChange` events with `{ filePath, relativePath, eventType, timestamp }`
   - Already ignores `node_modules/`, `.git/`, `dist/`

3. **Socket Broadcast** (`server/services/socket.cjs`):
   - Use `broadcast('rag:indexing', progress)` for real-time UI updates

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Embedding Model | `Xenova/all-MiniLM-L6-v2` | Already in prototype, runs on CPU, 384 dimensions |
| Chunk Size | 2000 tokens, 300 overlap | Balance context vs memory |
| Vector Store | MemoryVectorStore + optional LevelDB | Fast queries, optional persistence |
| Debounce | 100ms | Batch rapid saves without noticeable delay |

### Performance Targets

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Initial Index Time | <30s for 100 files | Log timing in `indexing:complete` event |
| Incremental Update | <5s per file | Log timing in file watcher callback |
| Query Latency | <100ms for top-10 | Log in API response |
| Memory Usage | <500MB for 10K files | Monitor with `process.memoryUsage()` |

### Test Plan

1. **Unit Tests** (`tests/unit/rag.test.js`):
   - Test `ingest()`, `query()`, `removeDocument()`, `updateDocument()`
   - Test chunking of large files (>10MB)
   - Test error handling for corrupt files

2. **Integration Tests** (`tests/integration/codebaseIndexer.test.js`):
   - Test full workspace indexing
   - Test file watcher integration (create/update/delete)
   - Test debouncing behavior

3. **E2E Tests** (`tests/e2e/rag-context.spec.ts`):
   - Test that agent responses include relevant codebase context
   - Test RAG status display in UI

### Security Considerations

- **Path Validation**: Use existing `safePath()` for all file reads
- **No External Calls**: Embeddings run locally (no API key leakage)
- **Memory Limits**: Cap total chunks to prevent DoS via large codebases

### Dependencies to Install

```bash
npm install leveldown levelup encoding-down
```

(LangChain and HuggingFace Transformers already installed in existing `rag.cjs`)

---

## Dev Agent Record

| Field | Value |
|-------|-------|
| Story Created | 2025-12-29 |
| Created By | SM Agent |
| Last Updated | 2025-12-29 |
| Status | ready-for-dev |
