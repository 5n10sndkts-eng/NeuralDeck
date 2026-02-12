# NeuralDeck v2.0 (Neon Prime)

> "The Deck is your weapon. The Agents are your crew."

NeuralDeck is an AI agent workstation built with React, Vite, and Fastify. It combines a cyberpunk operator interface with local/remote model routing, multi-agent orchestration, and secure backend tooling.

## Features

- Neon Prime cockpit UI with animated, glassmorphic panels
- Multi-agent workflows across analysis, design, implementation, QA, and security
- OpenCode integration for strategic/specialized agent routing
- Local LLM fallback routing for tactical tasks
- File system, checkpoint, diff preview/apply, and workspace management APIs

## Prerequisites

- Node.js 18+
- npm 9+
- Optional OpenCode Desktop app + CLI for OpenCode-routed agents

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start backend:

```bash
node server.cjs
```

3. Start frontend:

```bash
npm run dev
```

4. Open the app:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/health`

## OpenCode Integration

NeuralDeck supports a hybrid agent model:

- OpenCode-routed agents (strategic/custom specialist roles)
- Local-routed agents (fast tactical execution)

Core config files:

- `.neuraldeck/agent-mappings.json`
- `.neuraldeck/routing-config.json`
- `.neuraldeck/session-cache.json`

Backend API routes:

- `GET /api/opencode/health`
- `GET /api/opencode/agents`
- `GET /api/opencode/sessions`
- `POST /api/opencode/prompt`
- `POST /api/opencode/swarm`
- `POST /api/opencode/cache-session`

See `docs/OPENCODE_INTEGRATION_GUIDE.md` for setup, routing behavior, and troubleshooting.

## Upstream-First OpenCode Workflow

NeuralDeck now tracks OpenCode upstream source directly under:

- `external/opencode-upstream` (upstream repo clone)

Commands:

```bash
npm run upstream:bootstrap
npm run upstream:sync
npm run upstream:status
npm run upstream:patch:export
npm run upstream:dev
```

NeuralDeck custom agents are synced from legacy `/.opencode/agents` into overlay and then applied to upstream via:

```bash
npm run upstream:agents:sync
npm run upstream:overlay:apply
```

Patch artifact export:

```bash
npm run upstream:patch:export
```

Environment/preflight checks:

```bash
npm run opencode:doctor
```

See `docs/OPENCODE_UPSTREAM_BASELINE.md` for the fork-style architecture and migration plan.

## Testing

Run core tests:

```bash
npm test
```

Run OpenCode route verification:

```bash
node scripts/test-backend-routes.cjs
```
