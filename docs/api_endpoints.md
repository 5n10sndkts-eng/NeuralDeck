# NeuralDeck API Endpoints

The NeuralDeck backend (`server.js`) provides a RESTful API for the frontend "Neural Grid" to interact with the local system and AI services.

## System & Diagnostics

### `GET /health`
Returns the operational status of the backend.
- **Response:** `200 OK`
  ```json
  {
    "status": "ONLINE",
    "uptime": 123.45,
    "timestamp": 1700000000000,
    "version": "2.0.0-CYBER"
  }
  ```

## File System Operations
*Note: All paths are relative to the workspace root and protected against traversal attacks.*

### `GET /api/files`
Recursively lists the file structure of the workspace.
- **Response:** `200 OK` (JSON Array of file objects)

### `POST /api/read`
Reads the content of a specific file.
- **Body:** `{ "filePath": "src/App.tsx" }`
- **Response:** `200 OK`
  ```json
  { "content": "..." }
  ```

### `POST /api/write`
Writes content to a file, creating directories if needed.
- **Body:** 
  ```json
  { 
    "filePath": "src/components/New.tsx",
    "content": "..." 
  }
  ```
- **Response:** `200 OK` `{ "success": true }`

## AI Services

### `POST /api/chat`
**Unified LLM Gateway**. Proxies requests to either local or cloud inference engines.
- **Body:**
  ```json
  {
    "messages": [{ "role": "user", "content": "Hello" }],
    "config": {
      "provider": "local", // or 'openai'
      "baseUrl": "http://localhost:8000/v1",
      "model": "llama3"
    }
  }
  ```
- **Response:** `200 OK` (Standard OpenAI Chat Completion format)

## OpenCode Integration APIs

These routes expose NeuralDeck's OpenCode routing layer (CLI-backed + fallback).

### `GET /api/opencode/health`
Returns OpenCode CLI health, version, and session count.

### `GET /api/opencode/agents`
Returns NeuralDeck-to-OpenCode agent mapping metadata from `.neuraldeck/agent-mappings.json`.

### `GET /api/opencode/sessions`
Returns active OpenCode sessions plus NeuralDeck local session cache.

### `POST /api/opencode/prompt`
Routes a single prompt through agent-aware routing.
- **Body:**
  ```json
  {
    "agentId": "architect",
    "prompt": "Design module boundaries for this feature",
    "options": {
      "timeout": 120000,
      "model": "claude/claude-sonnet-4-20250514"
    }
  }
  ```

### `POST /api/opencode/swarm`
Runs a prompt across multiple agents with broadcast or consensus aggregation.
- **Body:**
  ```json
  {
    "agentIds": ["architect", "qa_engineer", "devops"],
    "prompt": "Review this release plan and highlight blockers",
    "options": {
      "mode": "consensus",
      "timeout": 120000
    }
  }
  ```

### `POST /api/opencode/cache-session`
Caches a known OpenCode session id for a specific NeuralDeck agent.
- **Body:** `{ "agentId": "architect", "sessionId": "session_abc123" }`

## Tool Execution (Custom Gateway)

**IMPORTANT DISTINCTION:** This endpoint is a **custom tool execution gateway** and is NOT an implementation of the official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). For actual MCP integration with 163+ tools across 9 servers, see the [Docker MCP Toolkit](#docker-mcp-toolkit-integration) section below.

### `POST /api/mcp/call`
Executes server-side tools safely with command whitelist security.

**Security Model:**
- Whitelist-based command filtering (`ALLOWED_COMMANDS` array in `server.cjs`)
- Sandboxed interpreter execution (node/python/npm)
- No relation to Model Context Protocol

- **Body:** `{ "tool": "git_log", "args": { "count": 5 } }`

**Available Tools:**
- `git_log`: Retrieve commit history.
- `git_show`: Show file diffs/content at specific commits.
- `npm_install`: Install dependencies.
- `npm_uninstall`: Remove dependencies.
- `shell_exec`: Execute whitelisted commands (ls, pwd, etc.).

---

## Docker MCP Toolkit Integration

NeuralDeck integrates with the **official Model Context Protocol** via the [Docker MCP Toolkit](https://github.com/docker/mcp), providing 163+ tools across 9 specialized servers.

### Architecture Overview

**External MCP System** (Standard Protocol):
- Official MCP client/server implementation
- Accessed via `docker mcp` CLI or MCP client SDKs
- Configured via `.env.local` environment variables
- Runs as separate process, not through `/api/mcp/call`

### Enabled MCP Servers

| Server | Tools | Description | Configuration |
|--------|-------|-------------|---------------|
| **context7** | 2 | Library documentation access | None |
| **deepwiki** | 1 | GitHub repo analysis | None |
| **docker** | 1 | Container management | None |
| **fetch** | 1 | Web content fetching | None |
| **github-official** | 70+ | Full GitHub API | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| **n8n** | 42 | Workflow automation | `N8N_API_KEY`, `N8N_API_URL` |
| **npm-sentinel** | 20 | NPM security analysis | None |
| **playwright** | 25 | Browser automation | None |
| **sequentialthinking** | 1 | AI reasoning | None |

**Total: 163+ tools** (exact count varies by configuration)

### Environment Configuration

Required variables in `.env.local`:

```bash
# GitHub API Access (required for github-official)
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_****  # Get from: https://github.com/settings/tokens

# N8N Workflow Automation (required for n8n)
N8N_API_URL=http://localhost:5678
N8N_API_KEY=n8n_api_****  # Get from: http://localhost:5678/settings/api

# MCP Feature Flags
MCP_ENABLE_OAUTH_INTERCEPTOR=true   # Auto GitHub OAuth
MCP_ENABLE_TOOL_PREFIX=false        # Disable prefixes
MCP_ENABLE_EMBEDDINGS=true          # Semantic search (requires OPENAI_API_KEY)

# Enabled Servers
MCP_SERVERS_ENABLED=context7,fetch,n8n,playwright,sequentialthinking,github-official,npm-sentinel,docker,deepwiki
```

### CLI Usage

```bash
# Verify connection
docker mcp client ls
# Expected: opencode (connected)

# List available tools
docker mcp server ls

# Execute tools
docker mcp exec --name github_search_repositories --args '{"query": "react stars:>1000"}'
docker mcp exec --name npm_search --args '{"query": "typescript"}'
docker mcp exec --name n8n_list_workflows
```

### Integration in AI Agents

AI agents access MCP tools through the Docker MCP Toolkit client (TypeScript/JavaScript):

```typescript
import { MCPClient } from '@docker/mcp-client';

// Example: GitHub repository search
const results = await mcpClient.callTool('github-official', 'search_repositories', {
  query: 'machine learning stars:>1000 language:python'
});

// Example: NPM package analysis
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

### Security Model

1. **Secrets Storage**: All API keys in `.env.local` (git-ignored)
2. **Server-Side Execution**: MCP tools never exposed to frontend
3. **Rate Limiting**: GitHub API has 5000 req/hour (authenticated)
4. **Scoped Access**: GitHub PAT uses minimal required scopes (repo, workflow, read:org)
5. **Separate from Custom Gateway**: `/api/mcp/call` has independent security model

### Troubleshooting

```bash
# Check server status
docker mcp server ls  # Look for "STATE ✓ ready"

# Check client connection
docker mcp client ls  # Verify "opencode" is connected

# Test specific server
docker mcp exec --name n8n_health_check

# View server logs
docker mcp server logs github-official

# Restart server
docker mcp server restart n8n
```

**Common Issues:**
- **"SECRETS ▲ required"**: Set `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env.local`
- **n8n connection failed**: Verify N8N running (`docker ps`) and `N8N_API_URL` correct
- **Tool not found**: Check `MCP_SERVERS_ENABLED` includes required server
- **Rate limit exceeded**: GitHub limits reset hourly; use authenticated requests

For more details, see `AGENTS.md` → "MCP Integration" section.
