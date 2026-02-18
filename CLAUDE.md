# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuralDeck is an AI Agent Workstation with a "Corporate Cyberpunk" aesthetic. It combines a React/Vite frontend with a Fastify backend for local LLM orchestration, multi-agent coordination, and file system management.

## Commands

```bash
# Development
node server.cjs              # Start backend (port 3001)
npm run dev                  # Start frontend with Vite (port 5173)
npm run dev:full             # Start both backend + frontend together

# Testing
npm test                     # Run Jest unit tests with coverage
npm run test:watch           # Jest watch mode
npm run test:p0              # Run only [P0] priority tests
npm run test:p1              # Run [P0] and [P1] priority tests
npm run test:e2e             # Run Playwright E2E tests (auto-starts servers)
npm run test:e2e:headed      # E2E with visible browser
npm run test:e2e:debug       # E2E with Playwright inspector
npm run test:burn-in         # Burn-in tests for changed files

# Run a single Jest test file
npx jest tests/components/MyComponent.test.tsx
# Run a single test by name
npx jest --testNamePattern='my test name'

# Run a single Playwright spec
npx playwright test tests/e2e/my-spec.spec.ts
# Run E2E tests tagged by category
npm run test:e2e:perf        # @perf tagged
npm run test:e2e:security    # @security tagged

# Build
npm run build                # Production build
npm run preview              # Preview production build
```

## Architecture

### Frontend (React 19 + Vite)

**Entry:** `src/index.tsx` -> `src/App.tsx`

**Context Provider hierarchy** (wraps `AppContent`):
- `UIProvider` (`src/contexts/UIContext.tsx`) - Adaptive UI state (mode: IDLE/CODING/ALERT)
- `ConversationProvider` (`src/contexts/ConversationContext.tsx`) - Chat messages, sessions, conversation history (uses `useReducer` + IndexedDB via `useConversationStorage`)
- `WorkspaceProvider` (`src/contexts/WorkspaceContext.tsx`) - Active workspace, file tree, CRUD operations on files/folders

**Views:** `App.tsx` uses a `view` state (`ViewMode` type) to switch between 12 views via `renderView()`. Heavy views (TheConstruct, CyberVerse, NeuralGrid, etc.) are lazy-loaded with `React.lazy()` + `ChunkErrorBoundary`.

**Real-time:** `useSocket` hook (`src/hooks/useSocket.ts`) connects to backend via Socket.IO for live agent state, phase changes, and delta updates. This replaced the earlier client-side `useNeuralAutonomy`.

**Multi-LLM:** Connection profiles stored in localStorage (`neural_profiles`) support multiple providers. CLI providers (claude-cli, gemini-cli, codex-cli, etc.) use command templates with `{{prompt}}` placeholders defined in `src/constants.ts`.

### Backend (Fastify - CommonJS)

**Entry:** `server.cjs` - all backend code is CommonJS (`.cjs`), while frontend is ESM.

**Key endpoints:**
- `/health` - Health check
- `/api/files` - List workspace files
- `/api/read`, `/api/write` - File operations (with `safePath()` traversal protection)
- `/api/chat` - LLM gateway via `providerAdapter.cjs` (routes to OpenAI-compatible, Gemini, Anthropic, CLI, or mock)
- `/api/mcp/call` - Tool execution with `ALLOWED_COMMANDS` whitelist
- `/api/workspaces/*` - Workspace CRUD via `workspaceService.cjs`
- `/api/docker/*` - Dockerfile generation and validation
- `/api/context/*` - RAG context ingestion and querying

**Server services** (`server/services/`):
- `providerAdapter.cjs` - Multi-provider LLM routing (OpenAI, Gemini, Anthropic, CLI, Ollama, mock)
- `workspaceService.cjs` - Workspace persistence in `.neuraldeck/` directory
- `socket.cjs` - Socket.IO broadcast for real-time state
- `fileWatcher.cjs` - FS change notifications
- `checkpointService.cjs` - File checkpoint/undo
- `hiveMemory.cjs` - Shared agent memory
- `reasoningService.cjs` - Chain-of-thought reasoning
- `codebaseIndexer.cjs` - RAG indexing
- `mcp-adapter.cjs` - Model Context Protocol tool execution

**Security libraries** (`server/lib/`): `encryption.cjs`, `securityLogger.cjs`, `rag.cjs`

### Agent System

- **Agent definitions:** `src/services/agent.ts` defines 16 agent personas (analyst, architect, developer, PM, QA, sec_auditor, red_teamer, etc.)
- **Agent cycle:** `runAgentCycle()` manages LLM interactions with tool-calling JSON format
- **Phases:** `NeuralPhase` type tracks workflow stages: idle -> analysis -> planning -> design -> architecture -> implementation -> testing -> review -> optimize -> deployment -> documentation -> finished
- **Red Team agents:** `pen_tester`, `vuln_scanner`, `code_auditor`, `red_teamer` for security analysis

### Vite Dev Proxy

Vite proxies `/api` and `/socket.io` to `http://localhost:3001`, so the frontend can call the backend without CORS issues in development.

## Conventions

### TypeScript
- Target ES2022, strict mode enabled
- Use `@/*` import alias for src root (mapped in tsconfig and jest config)
- Functional components with hooks only
- All new frontend code must be TypeScript

### Styling
- Tailwind CSS 4 with cyberpunk theme (neon cyan/magenta, glassmorphism, dark backgrounds)
- CSS variables: `--color-cyan`, `--color-magenta`, `--color-void`
- Framer Motion for animations
- Maintain dark mode aesthetic in all UI changes

### Backend Security
- Path traversal protection via `safePath()` in `server.cjs`
- Command whitelist (`ALLOWED_COMMANDS` array) for shell execution; interpreters (node, npm, python) only enabled when `ALLOW_INTERPRETERS=true`
- Dangerous command patterns always blocked (rm -rf /, mkfs, dd, etc.)
- JWT-based sessions with in-memory store; `JWT_SECRET` env var required in production
- Rate limiting enabled by default

### Testing
- Jest unit tests go in `tests/components/` (mirror source structure)
- Playwright E2E specs go in `tests/e2e/` (`.spec.ts` extension)
- Tag critical tests with `[P0]` in test name, important with `[P1]`
- Tag E2E tests with `@perf`, `@security`, or `@autonomy`
- Jest ignores E2E tests, `NeuralGrid.test.tsx` (ReactFlow+React 19 issue), and integration tests by default
- Jest test timeout is 120s; Playwright test timeout is 60s
- Test setup in `tests/setup.ts` polyfills ResizeObserver and mocks `import.meta.env`
- Coverage threshold: 50% across branches, functions, lines, statements

### Environment
- Create `.env.local` for local config (no `.env.example` - see `server.cjs` for available vars)
- `OPENAI_API_KEY` - for Vision AI features
- `GEMINI_API_KEY` / `GEMINI_BASE_URL` - for Gemini provider
- `PORT` - backend port (default 3001)
- `JWT_SECRET` - session signing key (auto-generated in dev, required in prod)
- `ALLOW_INTERPRETERS` - set `true` to enable npm/node/python in command execution
- `CORS_ORIGINS` / `SOCKET_CORS_ORIGINS` - comma-separated allowed origins
- `LLM_HOST_ALLOWLIST` / `LLM_ORIGIN_ALLOWLIST` - allowed LLM API hosts
