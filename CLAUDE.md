# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuralDeck is an AI Agent Workstation with a "Corporate Cyberpunk" aesthetic. It combines React/Vite frontend with Fastify backend for local LLM orchestration, multi-agent coordination, and file system management.

## Commands

```bash
# Development
node server.cjs          # Start backend (port 3001)
npm run dev              # Start frontend with Vite (port 5173)

# Testing
npm test                 # Run Jest tests with coverage
npm run test:watch       # Jest watch mode
npm run test:p0          # Run only [P0] priority tests
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:headed  # E2E with visible browser
npm run test:burn-in     # Burn-in tests for changed files

# Build
npm run build            # Production build
npm run preview          # Preview production build
```

## Architecture

### Frontend (React 19 + Vite)
- **Entry:** `src/index.tsx` -> `src/App.tsx`
- **UIProvider context** (`src/contexts/UIContext.tsx`) manages adaptive UI state (mode: IDLE/CODING/ALERT)
- **useSocket hook** (`src/hooks/useSocket.ts`) connects to backend via Socket.IO for real-time agent state
- **Views** are switched via `ViewMode` type, rendered in `App.tsx`'s `renderView()`

### Backend (Fastify)
- **Entry:** `server.cjs` - CommonJS Fastify server
- **Endpoints:**
  - `/health` - Health check
  - `/api/files` - List workspace files
  - `/api/read`, `/api/write` - File operations with path traversal protection
  - `/api/chat` - LLM gateway (proxies to OpenAI-compatible APIs)
  - `/api/mcp/call` - Tool execution with command whitelist
  - `/api/docker/*` - Dockerfile generation and validation

### Agent System
- **Agent definitions:** `src/services/agent.ts` defines 12 agent personas (analyst, architect, developer, etc.)
- **Agent cycle:** `runAgentCycle()` manages LLM interactions with tool-calling JSON format
- **Phases:** `NeuralPhase` type tracks workflow stages (idle -> analysis -> planning -> implementation -> etc.)

### Key Types (`src/types.ts`)
- `AgentProfile` - Agent identity enum
- `ViewMode` - UI view states
- `NeuralPhase` - Workflow phase states
- `ChatMessage` - Message structure with optional agent metadata

## Conventions

### TypeScript
- Target ES2022, strict mode enabled
- Use `@/*` import alias for src root
- Functional components with hooks only

### Styling
- Tailwind CSS with cyberpunk theme (neon colors, glassmorphism)
- CSS variables: `--color-cyan`, `--color-magenta`
- Maintain dark mode aesthetic

### Backend Security
- Path traversal protection via `safePath()` in `server.cjs`
- Command whitelist for shell execution (ALLOWED_COMMANDS array)
- Rate limiting enabled

### Environment
- Copy `.env.example` to `.env.local`
- `OPENAI_API_KEY` for Vision AI features
- `PORT` defaults to 3001

## Test Structure

```
tests/
├── components/          # Component unit tests
├── e2e/                 # Playwright tests
│   ├── performance/     # FPS and timing tests
│   ├── security/        # Path traversal, command whitelist tests
│   └── autonomy/        # Full workflow tests
├── nfr/performance/     # k6 load tests
└── support/             # Fixtures and helpers
```
