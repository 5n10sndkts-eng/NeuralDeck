# OpenCode Integration Setup Guide

## Overview

This guide covers the integration of OpenCode SDK into NeuralDeck, enabling multi-provider LLM support, MCP server access, and enhanced agent capabilities.

## Current Status: Phase 1 Complete (100%)

**All Phase 1 tasks completed:**
- ✅ Task 1: Install OpenCode SDK dependencies
- ✅ Task 2: Create `server/services/opencodeClient.cjs`
- ✅ Task 3: Create `server/services/providerAdapter.cjs`
- ✅ Task 4: Create `src/hooks/useOpenCodeClient.ts`
- ✅ Task 5: Create `opencode.jsonc` configuration
- ✅ Task 6: Update `.env.local` with OpenCode variables
- ✅ Task 7: Create `scripts/start-all.sh`
- ✅ Task 8: Create `scripts/stop-all.sh`
- ✅ Task 9: Create `scripts/test-opencode-connection.cjs`
- ✅ Task 10: Update `package.json` with OpenCode scripts

**Next Phase:** Phase 2 - Agent System Refactor (Week 3-4)

---

## Architecture

### 3-Process Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                     NeuralDeck System                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   Frontend   │      │   Backend    │      │ OpenCode │ │
│  │   (Vite)     │◄────►│  (Fastify)   │◄────►│  Server  │ │
│  │              │      │              │      │          │ │
│  │ Port 5173    │      │ Port 3001    │      │Port 4096 │ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│                                                             │
│  React 19 UI           OpenCode SDK          MCP Servers   │
│  useOpenCodeClient     opencodeClient.cjs    (9 servers)   │
│  WebSocket/HTTP        providerAdapter.cjs   163+ tools    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### LLM Provider Routing

```
NeuralDeck Agent Request
         ↓
  providerAdapter.cjs
         ↓
    ┌────┴────┬──────────┬──────────┐
    ↓         ↓          ↓          ↓
  Claude    Gemini    Ollama    Terminal
  (CLI)     (CLI)     (HTTP)    (aider, etc.)
    ↓         ↓          ↓          ↓
Strategic  Strategic  Tactical   Support
Agents     Agents     Agents     Tasks
```

---

## Installation & Setup

### Prerequisites

**System Requirements:**
- Node.js 18+ (for NeuralDeck)
- Docker (for MCP servers)
- macOS/Linux (OpenCode CLI support)

**Required API Keys:**
- OpenAI API key (for embeddings, optional)
- Anthropic API key (for Claude Desktop)
- Google Gemini API key (optional)
- GitHub Personal Access Token (for github-official MCP server)
- N8N API key (if using n8n MCP server)

### Step 1: Install OpenCode CLI

```bash
# Install OpenCode CLI
curl -fsSL https://opencode.ai/install | bash

# Verify installation
opencode --version

# Expected output: opencode vX.X.X
```

### Step 2: Configure Environment Variables

Edit `.env.local` in the project root:

```bash
# OpenCode Server
VITE_OPENCODE_URL=http://localhost:4096
OPENCODE_PORT=4096
OPENCODE_PROJECT_PATH=/Users/ku3h/neural deck/NeuralDeck

# LLM Provider API Keys
OPENAI_API_KEY=sk-proj-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GEMINI_API_KEY=your-gemini-key-here

# Ollama (Local LLM)
OLLAMA_BASE_URL=http://localhost:11434

# GitHub MCP Server
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your-github-token-here
# Get from: https://github.com/settings/tokens
# Required scopes: repo, workflow, read:org, read:user

# N8N MCP Server (Optional)
N8N_API_URL=http://localhost:5678
N8N_API_KEY=n8n_api_your-key-here

# MCP Features
MCP_ENABLE_OAUTH_INTERCEPTOR=true
MCP_ENABLE_TOOL_PREFIX=false
MCP_ENABLE_EMBEDDINGS=true

# MCP Servers (comma-separated, no spaces)
MCP_SERVERS_ENABLED=context7,fetch,n8n,playwright,sequentialthinking,github-official,npm-sentinel,docker,deepwiki
```

**Important:** Replace placeholder values with your actual API keys!

### Step 3: Install Node Dependencies

```bash
# Install all dependencies (includes @opencode-ai/sdk and @opencode-ai/plugin)
npm install
```

### Step 4: Start OpenCode Server

```bash
# Option 1: Use npm script (recommended)
npm run opencode:server

# Option 2: Direct command
opencode server start --port 4096 --config opencode.jsonc --daemon

# Verify server is running
curl http://localhost:4096/health

# Expected output: {"status":"ok"}
```

### Step 5: Test OpenCode Connection

```bash
# Run connection test suite
npm run test:opencode

# Expected output:
# ✓ SDK client created
# ✓ Health check passed
# ✓ Session created
# ✓ Prompt sent successfully
# ✓ Session deleted
# Success Rate: 100%
```

### Step 6: Start All Services

```bash
# Start all 3 processes (OpenCode + Backend + Frontend)
npm run dev:full

# This script will:
# 1. Check OpenCode CLI installation
# 2. Start OpenCode server (port 4096)
# 3. Start Fastify backend (port 3001)
# 4. Start Vite frontend (port 5173)
# 5. Wait for all health checks
# 6. Display final status
```

### Step 7: Stop All Services

```bash
# Stop all 3 processes
npm run stop:full

# Or manually:
bash scripts/stop-all.sh
```

---

## Available NPM Scripts

### OpenCode Management

```bash
# Start OpenCode server
npm run opencode:server

# Stop OpenCode server
npm run opencode:stop

# Initialize OpenCode CLI
npm run opencode:init

# View OpenCode logs
npm run opencode:logs

# Check OpenCode status
npm run opencode:status
```

### Development

```bash
# Start all services (OpenCode + Backend + Frontend)
npm run dev:full

# Stop all services
npm run stop:full

# Test OpenCode connection
npm run test:opencode

# Start only frontend (Vite)
npm run dev

# Start only backend (manual)
node server.cjs
```

### Testing

```bash
# Run all Jest tests
npm test

# Run E2E tests
npm run test:e2e

# Run OpenCode integration test
npm run test:opencode
```

---

## Verification Checklist

After setup, verify each component:

### 1. OpenCode CLI Installed
```bash
opencode --version
# Should output: opencode vX.X.X
```

### 2. OpenCode Server Running
```bash
curl http://localhost:4096/health
# Should output: {"status":"ok"}
```

### 3. MCP Servers Connected
```bash
# Check Docker MCP Toolkit status
docker mcp server ls

# Expected output (example):
# NAME             STATE    SECRETS
# context7         ✓ ready  -
# github-official  ✓ ready  ✓
# n8n              ✓ ready  ✓
# playwright       ✓ ready  -
# npm-sentinel     ✓ ready  -
# ...
```

### 4. OpenCode SDK Connection
```bash
npm run test:opencode
# Should pass all 9 tests
```

### 5. NeuralDeck Backend Running
```bash
curl http://localhost:3001/health
# Should output: {"status":"healthy"}
```

### 6. NeuralDeck Frontend Running
```bash
# Open in browser
open http://localhost:5173

# Should see NeuralDeck UI with cyberpunk theme
```

---

## Configuration Reference

### `opencode.jsonc` Structure

```jsonc
{
  "providers": {
    // Claude Desktop, Gemini, Ollama configurations
  },
  "mcpServers": {
    // 9 MCP servers (context7, github-official, n8n, etc.)
  },
  "agents": {
    // 16 NeuralDeck agents mapped to providers
    "architect": { "provider": "claude", "model": "claude-sonnet-4" },
    "developer": { "provider": "ollama", "model": "deepseek-coder-v2:latest" }
  },
  "tools": {
    // Global tool permissions and per-agent overrides
  },
  "rules": [
    // NeuralDeck coding guidelines from AGENTS.md
  ],
  "formatters": {
    // Prettier config for code formatting
  }
}
```

### Agent Classification

**Strategic Agents** (Use OpenCode sessions):
- `architect` - System design (Claude Sonnet 4)
- `analyst` - Code analysis (Claude Sonnet 4)
- `pm` - Project planning (Gemini 2.0 Flash)
- `ux_designer` - UI/UX design (Gemini 2.0 Flash)

**Tactical Agents** (Direct tool calls):
- `developer` - Code implementation (Ollama deepseek-coder-v2)
- `qa_engineer` - Testing (Ollama deepseek-coder-v2)
- `security_auditor` - Security review (Claude Sonnet 4)
- `code_reviewer` - Code review (Ollama deepseek-coder-v2)

**Support Agents**:
- `technical_writer` - Documentation (Gemini 2.0 Flash)
- `devops` - Infrastructure (Claude Sonnet 4)

---

## Troubleshooting

### OpenCode CLI Not Installed

**Error:** `bash: opencode: command not found`

**Solution:**
```bash
curl -fsSL https://opencode.ai/install | bash
source ~/.bashrc  # or ~/.zshrc
opencode --version
```

### OpenCode Server Won't Start

**Error:** `Failed to start OpenCode server`

**Solutions:**
1. Check if port 4096 is already in use:
   ```bash
   lsof -ti:4096
   # If output, kill the process: kill -9 $(lsof -ti:4096)
   ```

2. Check OpenCode logs:
   ```bash
   npm run opencode:logs
   ```

3. Try starting manually with verbose output:
   ```bash
   opencode server start --port 4096 --config opencode.jsonc --verbose
   ```

### MCP Server Connection Failed

**Error:** `github-official SECRETS ▲ required`

**Solution:** Set required API keys in `.env.local`:
```bash
# GitHub PAT required for github-official
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your-token-here

# N8N API key required for n8n
N8N_API_KEY=n8n_api_your-key-here
N8N_API_URL=http://localhost:5678
```

### SDK Connection Test Fails

**Error:** `Health check failed: connect ECONNREFUSED`

**Solutions:**
1. Verify OpenCode server is running:
   ```bash
   curl http://localhost:4096/health
   ```

2. Check `.env.local` has correct URL:
   ```bash
   VITE_OPENCODE_URL=http://localhost:4096
   ```

3. Restart OpenCode server:
   ```bash
   npm run opencode:stop
   npm run opencode:server
   ```

### Port Already in Use

**Error:** `Port 3001 already in use` or `Port 5173 already in use`

**Solution:**
```bash
# Stop all services
npm run stop:full

# Or manually kill processes
kill -9 $(lsof -ti:3001)  # Backend
kill -9 $(lsof -ti:5173)  # Frontend
kill -9 $(lsof -ti:4096)  # OpenCode

# Restart
npm run dev:full
```

### API Key Missing

**Error:** `ANTHROPIC_API_KEY not found`

**Solution:** Add all required API keys to `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
```

---

## File Structure

### New Files Created (Phase 1)

```
NeuralDeck/
├── opencode.jsonc                           # OpenCode configuration
├── .env.local                               # Environment variables (updated)
├── package.json                             # NPM scripts (updated)
│
├── server/
│   └── services/
│       ├── opencodeClient.cjs               # Backend SDK wrapper
│       └── providerAdapter.cjs              # Multi-provider routing
│
├── src/
│   └── hooks/
│       └── useOpenCodeClient.ts             # Frontend SDK hook
│
└── scripts/
    ├── start-all.sh                         # Unified startup script
    ├── stop-all.sh                          # Unified shutdown script
    └── test-opencode-connection.cjs         # Connection test suite
```

### Modified Files

- `.env.local` (lines 68-84: OpenCode integration section)
- `package.json` (lines 25-32: 8 new scripts)

---

## Next Steps: Phase 2 - Agent System Refactor

### Phase 2 Tasks (Week 3-4)

**Task 1:** Update `src/services/agent.ts`
- Modify `runAgentCycle()` to use OpenCode sessions for strategic agents
- Modify `runAgentCycle()` to use direct tool calls for tactical agents
- Integrate `opencodeClient` service

**Task 2:** Update `/api/chat` endpoint in `server.cjs`
- Replace direct LLM HTTP calls with `opencodeClient.sendPrompt()`
- Route to appropriate provider based on agent ID
- Maintain backward compatibility

**Task 3:** Create `config/agent-tools-mapping.json`
- Define which MCP tools each agent can access
- Map agents to LLM providers
- Configure session vs direct call mode

**Task 4:** Test Agent Execution
- Test Architect agent (strategic, Claude, sessions)
- Test Developer agent (tactical, Ollama, direct tools)
- Test multi-agent swarm coordination
- E2E test with full workflow

**Task 5:** Update NeuralDeck UI
- Display OpenCode session status in UI
- Show active LLM provider per agent
- Add session management controls

---

## Support & Resources

**OpenCode Documentation:**
- CLI Reference: https://opencode.ai/docs/cli
- SDK Reference: https://opencode.ai/docs/sdk
- MCP Servers: https://opencode.ai/docs/mcp

**NeuralDeck Documentation:**
- `AGENTS.md` - Coding guidelines
- `README.md` - Project overview
- `docs/` - Feature documentation

**Troubleshooting:**
- OpenCode GitHub Issues: https://github.com/anomalyco/opencode/issues
- NeuralDeck Wiki: (internal project wiki)

**Community:**
- OpenCode Discord: https://opencode.ai/discord
- NeuralDeck Team Chat: (internal chat)

---

## Changelog

### v0.1.0 - Phase 1 Complete (February 11, 2026)

**Added:**
- OpenCode SDK integration (`@opencode-ai/sdk`, `@opencode-ai/plugin`)
- Backend SDK wrapper (`server/services/opencodeClient.cjs`)
- Multi-provider routing (`server/services/providerAdapter.cjs`)
- Frontend SDK hook (`src/hooks/useOpenCodeClient.ts`)
- Comprehensive OpenCode configuration (`opencode.jsonc`)
- Unified startup/shutdown scripts (`scripts/start-all.sh`, `scripts/stop-all.sh`)
- Connection test suite (`scripts/test-opencode-connection.cjs`)
- 8 new NPM scripts for OpenCode management

**Modified:**
- `.env.local` - Added 17 OpenCode-related environment variables
- `package.json` - Added OpenCode scripts section

**Status:**
- Phase 1: ✅ 100% Complete (10/10 tasks)
- Phase 2: ⏸️ Ready to start
- Overall: 10% of 10-week integration plan complete

---

## License

NeuralDeck is proprietary software.  
OpenCode SDK is licensed under Apache 2.0.
