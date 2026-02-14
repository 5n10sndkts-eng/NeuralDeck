# NeuralDeck Comprehensive Audit Report

> Generated 2026-02-14 | Covers security, frontend, architecture, and test coverage

---

## Executive Summary

| Area | Issues Found | Critical | High | Medium | Low |
|------|-------------|----------|------|--------|-----|
| **Server Security** | 18 | 4 | 6 | 5 | 3 |
| **Frontend Quality** | 78+ | 4 | 8 | 10 | 7 |
| **Architecture** | 22 | 3 | 5 | 8 | 6 |
| **Test Coverage** | ~38-45% overall | - | - | - | - |
| **Known Bugs** | 8 (from E2E) | 1 | 2 | 3 | 2 |
| **TOTAL** | **126+** | **11** | **19** | **23** | **16** |

**Verdict: NOT PRODUCTION-READY** until Critical issues are resolved.

---

## PART 1: CRITICAL SECURITY FINDINGS

### CRIT-1: Command Injection via CLI Gateway (server.cjs:2043-2091)
The `/api/chat` endpoint replaces `{{prompt}}` in CLI command templates with user input **without shell escaping**. A malicious prompt containing shell metacharacters (`; rm -rf /`) could execute arbitrary commands.

### CRIT-2: Socket.IO Authentication Bypass (server/services/socket.cjs:17,33-37)
`ALLOW_UNAUTHENTICATED_SOCKET=true` env var allows anonymous WebSocket connections, exposing all real-time agent events and state updates.

### CRIT-3: Race Condition / Symlink Attack (server.cjs:1677-1750)
File write operations validate paths with `safePath()` once, then write later. Between validation and write, an attacker could replace the file with a symlink to overwrite arbitrary files.

### CRIT-4: CSRF Not Enforced (server.cjs:584-589)
`@fastify/csrf-protection` is registered but **never used** in POST/PUT/DELETE route handlers. All state-changing endpoints are vulnerable to CSRF.

### CRIT-5: XSS in Editor (src/components/TheEditor.tsx:224)
`dangerouslySetInnerHTML` renders syntax-highlighted code without sanitization. Malicious file content like `</span><img src=x onerror="alert('xss')">` would execute.

### CRIT-6: JWT Secret Regenerated on Restart (server.cjs:108)
`JWT_SECRET` defaults to `crypto.randomBytes(32)` if not set via env. Every server restart invalidates all sessions. In production, this is a security anti-pattern.

---

## PART 2: HIGH-SEVERITY ISSUES

### Server Security (6 issues)
| # | Issue | Location |
|---|-------|----------|
| H-1 | CORS allows no-origin requests in dev | server.cjs:514-521 |
| H-2 | Docker command uses `exec()` not `spawn()` | server.cjs:2539-2545 |
| H-3 | Error messages leak internal URLs/paths | server.cjs:1235,2193 |
| H-4 | No file size limit on write operations | server.cjs:1297-1304 |
| H-5 | Git log arguments interpolated into string | server.cjs:2387-2407 |
| H-6 | Missing workspace context in checkpoint endpoints | server.cjs:1865,1979 (BUG-8) |

### Frontend (8 issues)
| # | Issue | Location |
|---|-------|----------|
| H-7 | No error boundary wrapping AppContent | src/App.tsx:785-880 |
| H-8 | ConversationContext.addMessage loses messages | src/contexts/ConversationContext.tsx:190 |
| H-9 | Memory leaks: uncleared intervals/listeners | src/App.tsx:274, useSocket.ts:721-730 |
| H-10 | Race condition: parallel file opens | src/App.tsx:308-320 |
| H-11 | WorkspaceContext state gap during load | src/contexts/WorkspaceContext.tsx:95-117 |
| H-12 | localStorage parsed without try-catch | src/App.tsx:125-132 |
| H-13 | File tree not keyboard-navigable | src/components/NeuralLink.tsx |
| H-14 | SEC_AUDIT fires without active file | src/components/TheEditor.tsx:55-63 (BUG-7) |

---

## PART 3: MEDIUM-SEVERITY ISSUES

### Server
- **M-1:** In-memory session storage grows unbounded (server.cjs:108,642)
- **M-2:** Pending diffs Map has no hard limit (server.cjs:1599-1849)
- **M-3:** Rate limiting is per-IP only, no per-user (server.cjs:540-568)
- **M-4:** Hardcoded internal IP in LLM_HOST_ALLOWLIST (server.cjs:75-77)
- **M-5:** No graceful shutdown (SIGTERM/SIGINT handlers missing)

### Frontend
- **M-6:** CommandPalette filters all files on every keystroke (CommandPalette.tsx:87)
- **M-7:** NeuralLink file tree re-renders all items on any change (NeuralLink.tsx:214)
- **M-8:** Mobile header clips at 375px (TheEditor.tsx toolbar) (BUG-4)
- **M-9:** /api/read returns 404 flood during rapid view switching (BUG-1)
- **M-10:** Git view shows no empty-state message (BUG-2)

### Architecture
- **M-11:** Vite `@` alias points to workspace root, not `src/` (vite.config.ts)
- **M-12:** server.cjs is 4,300+ lines - needs modularization
- **M-13:** No API schema validation (no OpenAPI spec)
- **M-14:** No env var validation at startup
- **M-15:** Dockerfile CMD and EXPOSE values are wrong

---

## PART 4: TEST COVERAGE GAPS

### Component Coverage: 13% (8 of 61 tested)
53 React components have **zero test coverage**, including:
- TheEditor (critical editor)
- TheOrchestrator (main view)
- WorkspaceManager (workspace management)
- ChunkErrorBoundary (error recovery)
- CommandPalette (navigation)

### API Endpoint Coverage: 38% (33 of 86 tested)
53 endpoints completely untested:
- Security scanning endpoints (11 endpoints)
- File locking endpoints (5 endpoints)
- RAG search/reindex (5 endpoints)
- Hive memory endpoints (2 endpoints)
- Agent/OpenCode endpoints (6 endpoints)

### Service Coverage: 53% (10 of 19 tested)
9 services with zero tests:
- `agent.ts` (446 LOC) - Agent persona definitions
- `agentTaskHandlers.ts` (503 LOC) - LLM task execution
- `api.ts` (753 LOC) - Core API wrapper
- `auth.ts` (237 LOC) - Authentication middleware

### Hook Coverage: 21% (3 of 14 tested)
11 untested hooks including:
- `useSocket.ts` (WebSocket communication)
- `useOpenCodeClient.ts` (agent integration)
- `useToolExecution.ts` (tool execution tracking)

### Security Control Coverage: 58%
Untested security controls:
- CORS origin enforcement
- CSRF token validation
- Rate limiting enforcement (E2E)
- Session timeout/hijacking
- Credential exposure in responses

---

## PART 5: ARCHITECTURAL CONCERNS

### Data Persistence Risk
- All session state is in-memory (lost on restart)
- localStorage used without encryption for sensitive data
- No database layer configured
- No write-ahead logging for crash recovery
- Dexie/IndexedDB installed but unused

### Error Recovery Gaps
- No circuit breaker for failing LLM providers
- No retry logic for transient API failures
- No offline mode when backend is down
- WebSocket disconnect has no user notification
- No sync queue for offline changes

### Dependency Concerns
- Extraneous packages: `fs@0.0.1-security`, `path@0.12.7`, `url@0.11.4`
- Four separate LangChain modules (potential redundancy)
- Full three-fiber ecosystem loaded for limited 3D usage
- `skipLibCheck: true` in tsconfig hides dependency type errors

### Type Safety
- 10+ `as any` casts across components (NeuralLink, CommandPalette, FolderBrowser, CyberUI)
- `catch (e: any)` instead of `catch (e: unknown)` throughout
- TheGitLog uses `useState<any[]>([])` for commits
- No runtime type validation for API responses

---

## PART 6: KNOWN BUGS (from E2E)

| Bug | Severity | Status | Description |
|-----|----------|--------|-------------|
| BUG-8 | P0/High | Open | Checkpoint API uses safePath without workspace context |
| BUG-1 | P1/Med | Open | /api/read returns 403s during rapid view switching |
| BUG-4 | P1/Med | Open | Editor header toolbar clips at 375px mobile width |
| BUG-7 | P1/Med | Open | SEC_AUDIT scan triggers with no active file/workspace |
| BUG-2 | P2/Low | Open | Git view shows no guidance when no repo exists |
| BUG-3 | P3/Low | Open | Kanban board briefly renders empty on mount |
| BUG-5 | P3/Low | Open | Sidebar buttons lack aria-labels at mobile width |
| BUG-6 | P3/Low | Open | Purple border artifacts in Immerse/Roundtable (visual only) |

---

## PART 7: REMEDIATION PRIORITY

### Phase 1 - Block Production (Immediate)
1. Fix CLI gateway command injection (CRIT-1)
2. Remove ALLOW_UNAUTHENTICATED_SOCKET (CRIT-2)
3. Add symlink detection before file writes (CRIT-3)
4. Enforce CSRF on all POST endpoints (CRIT-4)
5. Sanitize dangerouslySetInnerHTML in TheEditor (CRIT-5)
6. Require JWT_SECRET via env in production (CRIT-6)
7. Fix checkpoint safePath (BUG-8/H-6)

### Phase 2 - Pre-Release (1-2 weeks)
1. Add error boundary to AppContent (H-7)
2. Fix ConversationContext message loss (H-8)
3. Add file size limits on write endpoints (H-4)
4. Add AbortController to view mount effects (M-9/BUG-1)
5. Enforce CORS in development mode (H-1)
6. Add graceful shutdown handlers (M-5)
7. Fix mobile header overflow (BUG-4)
8. Disable SEC_AUDIT without active file (BUG-7)

### Phase 3 - Quality Sprint (2-4 weeks)
1. Add unit tests for top 10 untested components
2. Add E2E tests for untested API endpoints
3. Replace `as any` casts with proper types
4. Modularize server.cjs into route modules
5. Add OpenAPI schema + validation
6. Fix Vite `@` alias to point to `src/`
7. Add env validation at startup
8. Add keyboard navigation to file tree
9. Memoize heavy list renders (NeuralLink, CommandPalette)
10. Add Git view empty-state UI (BUG-2)

---

## Positive Controls Found

- Path traversal protection (`safePath()`) is well-implemented
- Command whitelisting (`ALLOWED_COMMANDS`) is restrictive
- Dangerous pattern blocking regex is comprehensive
- JWT authentication is properly implemented with session tracking
- Helmet security headers (CSP, HSTS) properly configured
- Rate limiting enabled with configurable thresholds
- Process isolation via `spawn()` with `shell:false` for most commands
- Comprehensive security event logging infrastructure
- Multi-browser E2E test suite (Chromium/Firefox/WebKit)
- P0/P1 test priority tagging for CI gating
