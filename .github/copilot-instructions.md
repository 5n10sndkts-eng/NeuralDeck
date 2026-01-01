# NeuralDeck - GitHub Copilot Instructions

## Project Overview

NeuralDeck is an AI Agent Workstation with a "Corporate Cyberpunk" aesthetic. It combines a React/Vite frontend with a Fastify backend for local LLM orchestration, multi-agent coordination, and file system management. The project emphasizes autonomous agent workflows, real-time state management via Socket.IO, and premium glassmorphic UI design.

## Tech Stack

- **Frontend**: React 19, Vite 6.2, TypeScript 5.8
- **Backend**: Fastify 5.6 (CommonJS), Node.js
- **Styling**: Tailwind CSS 4.1 with custom cyberpunk theme
- **Animations**: Framer Motion 12
- **State Management**: React Context API (UIProvider)
- **Real-time Communication**: Socket.IO 4.8
- **Testing**: Jest 30 (unit tests), Playwright 1.48 (E2E tests)
- **AI/ML**: @xenova/transformers for local embeddings

## Architecture

### Frontend Structure
- **Entry point**: `src/index.tsx` → `src/App.tsx`
- **Context**: `src/contexts/UIContext.tsx` manages adaptive UI state (IDLE/CODING/ALERT modes)
- **Hooks**: `src/hooks/useSocket.ts` for real-time backend communication
- **Views**: Switched via `ViewMode` type, rendered in `App.tsx`'s `renderView()`
- **Types**: Centralized in `src/types.ts` (AgentProfile, ViewMode, NeuralPhase, ChatMessage)

### Backend Structure
- **Entry point**: `server.cjs` (CommonJS Fastify server on port 3001)
- **Key endpoints**:
  - `/health` - Health check
  - `/api/files` - List workspace files
  - `/api/read`, `/api/write` - File operations with path traversal protection
  - `/api/chat` - LLM gateway (proxies to OpenAI-compatible APIs)
  - `/api/mcp/call` - Tool execution with command whitelist
  - `/api/docker/*` - Dockerfile generation and validation

### Agent System
- **Definitions**: `src/services/agent.ts` defines 12 agent personas (analyst, architect, developer, PM, etc.)
- **Orchestration**: `runAgentCycle()` manages LLM interactions with tool-calling JSON format
- **Workflow**: `NeuralPhase` type tracks stages (idle → analysis → planning → implementation → verification)

## Development Commands

```bash
# Backend
node server.cjs          # Start backend (port 3001)

# Frontend
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm test                 # Run Jest tests with coverage
npm run test:watch       # Jest in watch mode
npm run test:p0          # Run [P0] priority tests only
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:headed  # E2E with visible browser
npm run test:burn-in     # Burn-in tests for changed files
```

## Coding Conventions

### TypeScript
- Target ES2022 with strict mode enabled
- Use `@/*` import alias for `src` root directory
- Prefer functional components with hooks only (no class components)
- All new code must be TypeScript (no .js files in src/)
- Use explicit types; avoid `any` unless absolutely necessary

### Styling
- Use Tailwind CSS utility classes for all styling
- Follow cyberpunk aesthetic: neon colors (cyan, magenta), glassmorphism, dark backgrounds
- CSS variables: `--color-cyan`, `--color-magenta` for theme consistency
- Maintain dark mode aesthetic throughout the application
- Use Framer Motion for animations (slide, fade, scale patterns)

### File Organization
- Components go in `src/components/`
- Contexts go in `src/contexts/`
- Hooks go in `src/hooks/`
- Services go in `src/services/`
- Types go in `src/types.ts` (centralized)
- Tests mirror source structure in `tests/` directory

### Code Quality
- Write descriptive variable and function names
- Add JSDoc comments for complex functions and public APIs
- Prefer named exports over default exports for better refactoring
- Keep components small and focused (single responsibility)
- Extract reusable logic into custom hooks

## Security Best Practices

### Backend Security
- **Path traversal protection**: Always use `safePath()` utility in `server.cjs` before file operations
- **Command whitelist**: Only allow commands in `ALLOWED_COMMANDS` array for shell execution
- **Rate limiting**: Enabled by default on all API endpoints
- **Input validation**: Validate and sanitize all user inputs before processing
- **Environment variables**: Never commit `.env.local` or expose API keys

### Frontend Security
- Sanitize user input before rendering in UI
- Validate data received from backend before state updates
- Never expose sensitive configuration in client-side code

## Testing Practices

### Test Organization
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

### Testing Guidelines
- Add `[P0]` tag to critical tests, `[P1]` for important tests
- E2E tests use `@perf`, `@security`, or `@autonomy` tags
- Mock external API calls in unit tests
- Test both happy paths and error conditions
- Maintain test coverage above 70%

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Set `OPENAI_API_KEY` for Vision AI features (optional)
3. Set `PORT` for backend (defaults to 3001)
4. Run `npm install` to install dependencies
5. Start backend with `node server.cjs`
6. Start frontend with `npm run dev`

## Key Dependencies

- **@xenova/transformers**: Local embeddings and ML models
- **socket.io**: Real-time bidirectional communication
- **fastify**: High-performance web framework
- **framer-motion**: Animation library
- **reactflow**: Flow diagram visualization
- **lucide-react**: Icon library

## Development Workflow

1. Create feature branches from `main`
2. Write tests first (TDD approach preferred)
3. Implement minimal changes to pass tests
4. Run `npm test` and `npm run test:e2e` before committing
5. Use conventional commit messages (feat:, fix:, docs:, test:, etc.)
6. Update documentation if adding new features or changing APIs

## Important Notes

- The project uses both ESM (frontend) and CommonJS (backend)
- Agent definitions in `.github/agents/` are for internal tooling only
- CLAUDE.md provides additional context for Claude AI assistant
- Maintain the cyberpunk aesthetic in all UI changes
- Test security features thoroughly (path traversal, command injection prevention)
