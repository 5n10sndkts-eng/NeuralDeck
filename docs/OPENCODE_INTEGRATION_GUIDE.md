# OpenCode Integration Guide

This guide covers NeuralDeck's OpenCode integration architecture, routing behavior, API contracts, and operational checks.

## Overview

NeuralDeck uses hybrid agent routing:

- OpenCode for strategic/specialized agents
- Local providers for tactical/fast-response agents

Routing is agent-based and controlled by `.neuraldeck/routing-config.json` and `.neuraldeck/agent-mappings.json`.

## Components

Backend services:

- `server/services/opencodeCLI.cjs`
  - CLI availability checks
  - agent mapping lookup
  - session cache load/save
  - prompt routing to mapped OpenCode agents
- `server/services/providerAdapter.cjs`
  - provider fallback behavior
  - OpenCode-vs-local decisioning
  - route-level response metadata

Frontend components:

- `src/components/OpenCodeStatus.tsx`
  - health/session status widget in app header
- `src/components/AgentChat.tsx`
  - dedicated agent chat modal for OpenCode-routed personas

## API Endpoints

- `GET /api/opencode/health`
  - Returns CLI health and OpenCode availability
- `GET /api/opencode/agents`
  - Returns resolved agent mappings and summary stats
- `GET /api/opencode/sessions`
  - Returns OpenCode CLI sessions and local session cache snapshot
- `POST /api/opencode/prompt`
  - Routes prompts based on agent id and routing rules
- `POST /api/opencode/cache-session`
  - Persists a session id for a NeuralDeck agent

All endpoints require authenticated requests through the existing session token flow.

## Routing Behavior

1. Request enters `providerAdapter.routeToAgent(prompt, agentId, options)`.
2. `shouldUseOpenCode(agentId)` checks `.neuraldeck/routing-config.json`.
3. If OpenCode-routed:
   - `opencodeCLI.sendToNeuralDeckAgent(...)` resolves mapping and session behavior
   - If configured, session id is read from cache or created and cached
4. On OpenCode failure and fallback enabled:
   - request falls back to local `routePrompt(...)`
   - response includes `fallbackUsed: true` and `fallbackReason`

## Session Cache

Session cache file: `.neuraldeck/session-cache.json`

Cached shape:

```json
{
  "sessions": {
    "architect": {
      "session_id": "abc123",
      "opencode_agent": "plan",
      "created_at": "2026-02-11T00:00:00.000Z",
      "type": "built-in"
    }
  }
}
```

## Verification Commands

Backend route smoke test:

```bash
node scripts/test-backend-routes.cjs
```

Targeted OpenCode test suites:

```bash
npx jest tests/services/opencodeCLI.test.ts tests/services/providerAdapter.test.ts tests/integration/opencode-routes.test.ts
```

Frontend build check:

```bash
npm run build
```

## Common Issues

- OpenCode CLI not found:
  - ensure `/Applications/OpenCode.app/Contents/MacOS/opencode-cli` exists or `opencode` is in PATH
- Agent mapping missing:
  - verify `.neuraldeck/agent-mappings.json` contains `agentId`
- Session routing fails unexpectedly:
  - check `.neuraldeck/session-cache.json` for stale ids
  - use `GET /api/opencode/sessions` to compare cache vs CLI session list
- Fallback not triggered:
  - verify `fallback_enabled` is true in `.neuraldeck/routing-config.json`

## Notes

- OpenCode prompt routing returns metadata including routing source, fallback status, and mapped OpenCode agent.
- Local fallback behavior is preserved to avoid blocking tactical workflows during OpenCode outages.
