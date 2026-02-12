# AGENTS.md - NeuralDeck Coding Agent Guidelines

This file provides comprehensive guidelines for AI coding agents (Claude, Copilot, Cursor, etc.) working in the NeuralDeck codebase.

## Project Overview

NeuralDeck is an AI Agent Workstation with a "Corporate Cyberpunk" aesthetic combining React 19/Vite frontend with Fastify backend for local LLM orchestration, multi-agent coordination, and file system management.

**Tech Stack:**
- Frontend: React 19, Vite 6.2, TypeScript 5.8, Tailwind CSS 4.1, Framer Motion 12
- Backend: Fastify 5.6 (CommonJS), Node.js, Socket.IO 4.8
- Testing: Jest 30 (unit), Playwright 1.48 (E2E)
- AI/ML: @xenova/transformers, LangChain

## Build & Development Commands

```bash
# Backend
node server.cjs                    # Start Fastify backend (port 3001)

# Frontend
npm run dev                        # Start Vite dev server (port 5173)
npm run build                      # Production build
npm run preview                    # Preview production build

# Testing - Unit Tests (Jest)
npm test                           # Run all tests with coverage
npm run test:watch                 # Watch mode for TDD
npm run test:p0                    # Run [P0] priority tests only
npm run test:p1                    # Run [P0] and [P1] tests
npm run test:integration           # Run integration tests

# Testing - Single Test File
npx jest path/to/test.test.ts                    # Run specific test file
npx jest --testNamePattern="test description"    # Run tests matching pattern
npx jest rateLimiter.test.ts                     # Example: run rate limiter tests

# Testing - E2E Tests (Playwright)
npm run test:e2e                   # Run all E2E tests
npm run test:e2e:headed            # Run with visible browser
npm run test:e2e:ui                # Run in UI mode
npm run test:e2e:debug             # Debug mode
npm run test:e2e:perf              # Performance tests only (@perf tag)
npm run test:e2e:security          # Security tests only (@security tag)
npm run test:e2e:autonomy          # Autonomy tests only (@autonomy tag)

# Testing - Specialized
npm run test:burn-in               # Burn-in tests for changed files
npm run test:ci                    # CI-style test run
npm run test:perf:k6               # k6 load tests

# Linting/Formatting
# Note: No ESLint/Prettier config found - rely on TypeScript compiler and editor defaults
```

## Code Style Guidelines

### TypeScript

**Target & Modules:**
- Target: ES2022 with strict mode
- Module system: ESNext (frontend), CommonJS (backend/server.cjs)
- Use `@/*` import alias for project root (configured in tsconfig.json and vite.config.ts)

**Type Safety:**
- All new code MUST be TypeScript (.ts/.tsx) - no .js files in src/
- Prefer explicit types; avoid `any` unless absolutely necessary
- Use centralized types from `src/types.ts`
- Interface for object shapes, type for unions/aliases

**Examples:**
```typescript
// Good - explicit types
import { AgentProfile, ChatMessage } from '@/src/types';

function processMessage(msg: ChatMessage): void {
  // implementation
}

// Bad - implicit any
function processMessage(msg) {  // ❌ implicit any
  // implementation
}
```

### Imports

**Order & Style:**
1. External dependencies (React, third-party)
2. Internal absolute imports (@/src/...)
3. Relative imports (./...)
4. Type-only imports last

**Prefer named exports over default exports** for better refactoring.

```typescript
// Good
import { useState, useEffect } from 'react';
import { AgentProfile, NeuralPhase } from '@/src/types';
import { sendChat } from '@/src/services/api';
import { LocalComponent } from './LocalComponent';

// Bad - mixing styles
import React from 'react';  // ❌ default import when named available
import type { AgentProfile } from '../types';  // ❌ relative when @ alias available
```

### Naming Conventions

- **Components:** PascalCase - `TheTerminal`, `VoiceVisualizer`, `AgentCard`
- **Hooks:** camelCase with `use` prefix - `useSocket`, `useSwarm`, `useNeuralAutonomy`
- **Services:** camelCase - `agentService`, `soundEffects`, `storageManager`
- **Types/Interfaces:** PascalCase - `ChatMessage`, `AgentProfile`, `ToolExecution`
- **Constants:** UPPER_SNAKE_CASE - `DEFAULT_RATE_LIMIT_CONFIG`, `ALLOWED_COMMANDS`
- **Files:** Match export - `useSocket.ts`, `AgentCard.tsx`, `types.ts`

### Component Structure

**Functional components only** - no class components.

```typescript
import { useState } from 'react';
import { AgentProfile } from '@/src/types';

interface AgentCardProps {
  agentId: AgentProfile;
  isActive: boolean;
  onSelect?: () => void;
}

export function AgentCard({ agentId, isActive, onSelect }: AgentCardProps) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      className="cyber-card"
      onMouseEnter={() => setHovered(true)}
    >
      {/* implementation */}
    </div>
  );
}
```

### Styling

**Tailwind CSS only** - no inline styles or CSS files for new code.

- Follow cyberpunk aesthetic: neon cyan/magenta, glassmorphism, dark backgrounds
- Use CSS variables: `--color-cyan`, `--color-magenta` (defined globally)
- Framer Motion for animations (slide, fade, scale patterns)

```tsx
// Good - Tailwind utilities
<div className="bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-lg p-4">

// Bad - inline styles
<div style={{ background: 'rgba(0,0,0,0.8)' }}>  // ❌
```

### Error Handling

**Backend (server.cjs):**
- Use try-catch blocks for all async operations
- Return proper HTTP status codes (400, 401, 403, 500)
- Log errors via Fastify logger
- Sanitize error messages before sending to client

**Frontend:**
- Use error boundaries for component errors
- Display user-friendly error messages
- Log errors to console for debugging

```typescript
// Good error handling
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error('User-friendly message');
}
```

### Security Best Practices

**Critical Rules:**
1. **Path Traversal:** Always use `safePath()` utility before file operations (backend)
2. **Command Injection:** Only allow commands in `ALLOWED_COMMANDS` array (server.cjs)
3. **Input Validation:** Validate and sanitize all user inputs
4. **Secrets:** Never commit `.env.local` or expose API keys in client code
5. **Rate Limiting:** Enabled by default on all API endpoints

## Testing Practices

### Test Organization

```
tests/
├── components/          # Component unit tests
├── contexts/            # Context provider tests
├── hooks/               # Custom hook tests
├── services/            # Service/utility tests
├── integration/         # Integration tests
├── e2e/                 # Playwright E2E tests
│   ├── performance/     # FPS and timing tests
│   ├── security/        # Security feature tests
│   └── autonomy/        # Full workflow tests
├── nfr/performance/     # k6 load tests
└── support/             # Fixtures and test helpers
```

### Test Guidelines

- **Priority tags:** Add `[P0]` for critical tests, `[P1]` for important tests
- **E2E tags:** Use `@perf`, `@security`, or `@autonomy` in test descriptions
- **Coverage:** Maintain above 50% (current thresholds in jest.config.cjs)
- **Mocking:** Mock external API calls and heavy dependencies
- **Test both:** Happy paths AND error conditions

```typescript
describe('RateLimiter', () => {
  it('[P0] should execute request immediately when under limit', async () => {
    // Test implementation
  });
  
  it('[P1] should handle concurrent requests properly', async () => {
    // Test implementation
  });
});
```

### File Structure

- **Components:** `src/components/` - UI components
- **Contexts:** `src/contexts/` - React context providers
- **Hooks:** `src/hooks/` - Custom React hooks
- **Services:** `src/services/` - Business logic, API clients
- **Types:** `src/types.ts` - Centralized type definitions
- **Backend:** `server.cjs` (main), `server/` (modules)
- **Tests:** Mirror source structure in `tests/` directory

## Key Architecture Patterns

### Frontend State Management

- **UIContext** (`src/contexts/UIContext.tsx`): Manages adaptive UI state (IDLE/CODING/ALERT modes)
- **useSocket** hook: Real-time backend communication via Socket.IO
- **ViewMode switching**: Rendered in `App.tsx`'s `renderView()`

### Agent System

- **Definitions:** `src/services/agent.ts` - 12 agent personas with system prompts
- **Phases:** `NeuralPhase` type tracks workflow (idle → analysis → planning → implementation → etc.)
- **Tool calling:** JSON format for LLM interactions

### Backend Endpoints

- `/health` - Health check
- `/api/files` - List workspace files
- `/api/read`, `/api/write` - File operations (with safePath protection)
- `/api/chat` - LLM gateway proxy
- `/api/mcp/call` - **Custom** tool execution gateway (NOT standard MCP protocol - see below)
- `/api/docker/*` - Dockerfile generation/validation

## MCP Integration (Docker MCP Toolkit)

NeuralDeck integrates with the **Docker MCP Toolkit** to provide 100+ external tools across 9 specialized servers. This is SEPARATE from the custom `/api/mcp/call` endpoint.

### Architecture

**Two Tool Systems:**

1. **Docker MCP Toolkit** (External - Standard MCP Protocol)
   - Official Model Context Protocol implementation
   - 9 MCP servers with 100+ tools
   - Accessed via `docker mcp` CLI or MCP client SDKs
   - Configured via environment variables in `.env.local`

2. **Custom Tool Gateway** (Internal - `/api/mcp/call`)
   - Custom REST endpoint in `server.cjs`
   - Command whitelist security (`ALLOWED_COMMANDS` array)
   - Used for sandboxed interpreter execution (node/python/npm)
   - NOT related to Model Context Protocol

### Enabled MCP Servers

Configure in `.env.local` → `MCP_SERVERS_ENABLED`:

| Server | Tools | Description | Configuration Required |
|--------|-------|-------------|------------------------|
| **context7** | 2 | Library documentation access (resolve-library-id, get-library-docs) | None |
| **deepwiki** | 1 | GitHub repository analysis and documentation extraction | None |
| **docker** | 1 | Container management and Dockerfile operations | None |
| **fetch** | 1 | Web content fetching and markdown conversion | None |
| **github-official** | 70+ | Full GitHub API (repos, issues, PRs, code search, actions) | **GITHUB_PERSONAL_ACCESS_TOKEN** |
| **n8n** | 42 | Workflow automation (create/update workflows, executions, nodes) | **N8N_API_KEY**, **N8N_API_URL** |
| **npm-sentinel** | 20 | NPM package analysis (security, quality, trends, dependencies) | None |
| **playwright** | 25 | Browser automation (navigate, click, screenshot, forms) | None |
| **sequentialthinking** | 1 | AI reasoning with dynamic chain-of-thought problem solving | None |

**Total: 163+ tools** across 9 servers (exact count varies by configuration)

### Environment Configuration

Add to `.env.local` (see `.env.example` for full template):

```bash
# GitHub API Access
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_****
# Scopes required: repo, workflow, read:org, read:user
# Get from: https://github.com/settings/tokens

# N8N Workflow Automation
N8N_API_URL=http://localhost:5678
N8N_API_KEY=n8n_api_****
# Get API key from: http://localhost:5678/settings/api

# MCP Features
MCP_ENABLE_OAUTH_INTERCEPTOR=true   # Auto GitHub OAuth flows
MCP_ENABLE_TOOL_PREFIX=false        # Disable "github_" prefixes
MCP_ENABLE_EMBEDDINGS=true          # Semantic search (requires OPENAI_API_KEY)

# Server List
MCP_SERVERS_ENABLED=context7,fetch,n8n,playwright,sequentialthinking,github-official,npm-sentinel,docker,deepwiki
```

### MCP Client Connection

NeuralDeck connects to the Docker MCP Toolkit via the **opencode** client (configured globally):

```bash
# Verify connection
docker mcp client ls
# Expected: opencode (connected)

# List available tools
docker mcp server ls

# Execute tools directly
docker mcp exec --name github_search_repositories --args '{"query": "react stars:>1000"}'
docker mcp exec --name npm_search --args '{"query": "typescript"}'
docker mcp exec --name n8n_list_workflows
```

### Advanced Features

**Enabled Features** (via `docker mcp feature enable`):

- **use-embeddings**: Semantic search for `mcp-find` tool discovery (requires `OPENAI_API_KEY`)
- **oauth-interceptor**: Automatic GitHub OAuth flow handling (background authentication)
- **dynamic-tools**: Runtime server management (mcp-find, mcp-add, mcp-remove)
- **mcp-oauth-dcr**: Dynamic Client Registration for OAuth flows

### Usage in AI Agents

AI agents can leverage MCP tools through the Docker MCP Toolkit client:

```typescript
// Example: Search GitHub repositories
const results = await mcpClient.callTool('github-official', 'search_repositories', {
  query: 'machine learning stars:>1000 language:python'
});

// Example: Analyze NPM package
const analysis = await mcpClient.callTool('npm-sentinel', 'npmScore', {
  packages: ['react', 'vue', 'angular']
});

// Example: Create N8N workflow
const workflow = await mcpClient.callTool('n8n', 'n8n_create_workflow', {
  name: 'Data Pipeline',
  nodes: [...],
  connections: {...}
});
```

### Security Considerations

1. **Secrets Management**: All API keys stored in `.env.local` (git-ignored)
2. **Server-Side Only**: MCP tools execute server-side, never exposed to frontend
3. **Rate Limiting**: GitHub API has rate limits (5000 req/hour authenticated)
4. **Scoped Access**: GitHub PAT should use minimal required scopes
5. **Command Whitelist**: Custom gateway (`/api/mcp/call`) has separate security via `ALLOWED_COMMANDS`

### Troubleshooting

```bash
# Check server status
docker mcp server ls
# Look for "STATE ✓ ready"

# Check client connection
docker mcp client ls
# Verify "opencode" is connected

# Test specific server
docker mcp exec --name n8n_health_check

# View server logs
docker mcp server logs github-official

# Restart server
docker mcp server restart n8n
```

**Common Issues:**

- **github-official "SECRETS ▲ required"**: Set `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env.local`
- **n8n connection failed**: Verify N8N is running (`docker ps`) and `N8N_API_URL` is correct
- **Tool not found**: Check `MCP_SERVERS_ENABLED` includes the required server
- **Rate limit exceeded**: GitHub API limits reset hourly; use authenticated requests

## Development Workflow

1. **Feature branches** from `main`
2. **TDD approach:** Write tests first when possible
3. **Run tests** before committing: `npm test && npm run test:e2e`
4. **Conventional commits:** Use `feat:`, `fix:`, `docs:`, `test:`, `refactor:` prefixes
5. **Update docs** if changing APIs or adding features
6. **Maintain aesthetic:** Keep cyberpunk theme in all UI changes

## Important Notes

- Project uses both ESM (frontend) and CommonJS (backend)
- No ESLint/Prettier configs - follow TypeScript compiler and this guide
- Centralize types in `src/types.ts` - don't create scattered type files
- Extract reusable logic into custom hooks
- Keep components small and focused (single responsibility)
- Add JSDoc comments for complex functions and public APIs
