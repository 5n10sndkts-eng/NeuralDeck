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

## Tool Execution (MCP)

### `POST /api/mcp/call`
Executes server-side tools safely.
- **Body:** `{ "tool": "git_log", "args": { "count": 5 } }`

**Available Tools:**
- `git_log`: Retrieve commit history.
- `git_show`: Show file diffs/content at specific commits.
- `npm_install`: Install dependencies.
- `npm_uninstall`: Remove dependencies.
- `shell_exec`: Execute whitelisted commands (ls, pwd, etc.).
