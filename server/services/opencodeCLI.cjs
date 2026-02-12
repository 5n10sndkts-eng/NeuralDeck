/**
 * OpenCode CLI Service
 * 
 * Provides a CLI-based interface to OpenCode for NeuralDeck backend.
 * Uses OpenCode CLI as a subprocess instead of SDK to avoid authentication issues.
 * 
 * Architecture:
 * - Strategic Agents (Architect, Analyst, PM): Use OpenCode sessions for full LLM conversations
 * - Tactical Agents (Developer, QA, Security): Use direct MCP tool calls for performance
 * 
 * Prerequisites:
 * - OpenCode CLI installed: curl -fsSL https://opencode.ai/install | bash
 * - Or OpenCode Desktop app with CLI at: /Applications/OpenCode.app/Contents/MacOS/opencode-cli
 * - API keys configured in .env.local
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

class OpenCodeCLIService {
  constructor() {
    this.cliPath = this.findOpenCodeCLI();
    this.projectPath = process.env.OPENCODE_PROJECT_PATH || process.cwd();
    this.sessionCache = new Map(); // Cache session IDs per agent
    this.agentMappingsPath = path.join(this.projectPath, '.neuraldeck', 'agent-mappings.json');
    this.sessionCachePath = path.join(this.projectPath, '.neuraldeck', 'session-cache.json');
    this._agentMappings = null;
    this._agentMappingsLoadedAt = 0;
    this.isAvailable = false;
    this.version = null;
  }

  /**
   * Load NeuralDeck agent mappings from configuration file
   * @private
   * @returns {Object|null} Parsed mapping file
   */
  _loadAgentMappings() {
    try {
      const raw = fs.readFileSync(this.agentMappingsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      this._agentMappings = parsed;
      this._agentMappingsLoadedAt = Date.now();
      return parsed;
    } catch (error) {
      console.warn(`[OpenCodeCLI] Could not load agent mappings: ${error.message}`);
      return null;
    }
  }

  /**
   * Get mapping details for a NeuralDeck agent
   * @param {string} agentId - NeuralDeck agent ID
   * @returns {Object|null} Agent mapping or null if not found
   */
  getAgentMapping(agentId) {
    if (!agentId) return null;

    const cacheExpired = (Date.now() - this._agentMappingsLoadedAt) > 5000;
    if (!this._agentMappings || cacheExpired) {
      this._loadAgentMappings();
    }

    return this._agentMappings?.mappings?.[agentId] || null;
  }

  /**
   * Load session cache JSON from disk into memory
   * @private
   * @returns {Object} Session cache data
   */
  _loadSessionCache() {
    try {
      if (!fs.existsSync(this.sessionCachePath)) {
        return { version: '1.0.0', last_updated: null, sessions: {} };
      }

      const raw = fs.readFileSync(this.sessionCachePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const sessions = parsed.sessions || {};

      this.sessionCache.clear();
      for (const [agentId, sessionData] of Object.entries(sessions)) {
        if (sessionData?.session_id) {
          this.sessionCache.set(agentId, sessionData.session_id);
        }
      }

      return parsed;
    } catch (error) {
      console.warn(`[OpenCodeCLI] Could not load session cache: ${error.message}`);
      return { version: '1.0.0', last_updated: null, sessions: {} };
    }
  }

  /**
   * Persist session cache JSON to disk
   * @private
   * @param {Object} cacheData - Cache data to save
   */
  _saveSessionCache(cacheData) {
    const next = cacheData || { version: '1.0.0', sessions: {} };
    if (!next.sessions) next.sessions = {};
    next.last_updated = new Date().toISOString();

    const cacheDir = path.dirname(this.sessionCachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(this.sessionCachePath, JSON.stringify(next, null, 2), 'utf-8');
  }

  /**
   * Get cached OpenCode session ID for a NeuralDeck agent
   * @param {string} agentId - NeuralDeck agent ID
   * @returns {string|null} Session ID if available
   */
  getCachedSessionId(agentId) {
    if (!agentId) return null;

    if (this.sessionCache.has(agentId)) {
      return this.sessionCache.get(agentId);
    }

    const cacheData = this._loadSessionCache();
    return cacheData.sessions?.[agentId]?.session_id || null;
  }

  /**
   * Cache OpenCode session ID for a NeuralDeck agent
   * @param {string} agentId - NeuralDeck agent ID
   * @param {string} sessionId - OpenCode session ID
   * @param {Object} meta - Optional metadata
   * @returns {boolean} Save status
   */
  cacheSessionId(agentId, sessionId, meta = {}) {
    if (!agentId || !sessionId) return false;

    try {
      const mapping = this.getAgentMapping(agentId);
      const cacheData = this._loadSessionCache();

      this.sessionCache.set(agentId, sessionId);
      cacheData.sessions[agentId] = {
        session_id: sessionId,
        opencode_agent: mapping?.opencode_agent || meta.opencodeAgent || null,
        created_at: meta.createdAt || new Date().toISOString(),
        type: mapping?.type || meta.type || null
      };

      this._saveSessionCache(cacheData);
      return true;
    } catch (error) {
      console.error(`[OpenCodeCLI] Failed to cache session for ${agentId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Find OpenCode CLI executable
   * @private
   * @returns {string} Path to opencode-cli
   */
  findOpenCodeCLI() {
    // Try different possible locations (prioritize Desktop app)
    const possiblePaths = [
      '/Applications/OpenCode.app/Contents/MacOS/opencode-cli', // Desktop app (macOS)
      path.join(process.env.HOME || '', '.local/bin/opencode'), // User install
      '/usr/local/bin/opencode', // Homebrew
      '/opt/homebrew/bin/opencode', // Homebrew (Apple Silicon)
      'opencode' // In PATH
    ];

    for (const cliPath of possiblePaths) {
      try {
        if (cliPath.includes('/') && fs.existsSync(cliPath)) {
          // Full path - verify it exists
          return cliPath;
        } else if (cliPath === 'opencode') {
          // PATH binary - return as-is (will be checked during availability test)
          return 'opencode';
        }
      } catch (error) {
        continue;
      }
    }

    // Default to 'opencode' and hope it's in PATH
    return 'opencode';
  }

  /**
   * Execute OpenCode CLI command
   * @private
   * @param {string} command - CLI command (without 'opencode' prefix)
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Parsed JSON output or raw stdout
   */
  async exec(command, options = {}) {
    const {
      parseJSON = true,
      timeout = 30000,
      cwd = this.projectPath,
      input = null
    } = options;

    const fullCommand = `${this.cliPath} ${command}`;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: { ...process.env }
      });

      // Check for errors in stderr
      if (stderr && !stderr.includes('Debugger attached')) {
        console.warn(`OpenCode CLI warning: ${stderr}`);
      }

      // Parse JSON output if requested
      if (parseJSON) {
        try {
          return JSON.parse(stdout.trim());
        } catch (parseError) {
          // Not JSON, return raw output
          return { success: true, output: stdout.trim() };
        }
      }

      return { success: true, output: stdout.trim() };
    } catch (error) {
      const errorMessage = error.stderr?.trim() || error.stdout?.trim() || error.message;
      
      // Log more detailed error for debugging
      if (process.env.DEBUG_OPENCODE) {
        console.error(`OpenCode CLI error details:
  Command: ${fullCommand}
  Exit code: ${error.code}
  Stdout: ${error.stdout || '(empty)'}
  Stderr: ${error.stderr || '(empty)'}
  Message: ${error.message}`);
      } else {
        console.error(`OpenCode CLI error: ${errorMessage}`);
      }
      
      throw new Error(`OpenCode CLI failed: ${errorMessage}`);
    }
  }

  /**
   * Check if OpenCode CLI is available
   * @returns {Promise<boolean>} Availability status
   */
  async checkAvailability() {
    try {
      const result = await this.exec('--version', { parseJSON: false, timeout: 5000 });
      this.version = result.output.trim();
      this.isAvailable = true;
      console.log(`✓ OpenCode CLI available: v${this.version}`);
      return true;
    } catch (error) {
      console.error('✗ OpenCode CLI not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Run a one-shot prompt with OpenCode
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Prompt options
   * @returns {Promise<Object>} Response from LLM
   */
  async runPrompt(prompt, options = {}) {
    const {
      model = 'claude/claude-sonnet-4-20250514',
      agent = null,
      sessionId = null,
      timeout = 120000
    } = options;

    // Escape prompt for shell
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');

    let command = `run "${escapedPrompt}" --model ${model}`;
    
    if (sessionId) {
      command += ` --session ${sessionId}`;
    }

    if (agent) {
      command += ` --agent ${agent}`;
    }

    const result = await this.exec(command, { parseJSON: false, timeout });
    return {
      success: true,
      content: result.output,
      model
    };
  }

  /**
   * Create a new session
   * @param {string} title - Session title
   * @param {Object} options - Session options
   * @returns {Promise<Object>} Session data
   */
  async createSession(title = 'NeuralDeck Session', options = {}) {
    const {
      model = 'claude/claude-sonnet-4-20250514',
      agent = null
    } = options;

    // OpenCode CLI doesn't expose "session create", so bootstrap via run.
    const initPrompt = `Session initialized: ${title}`;
    let command = `run "${initPrompt}" --model ${model}`;
    if (agent) command += ` --agent ${agent}`;

    try {
      await this.exec(command, { parseJSON: false, timeout: 30000 });
    } catch (error) {
      // Fallback: when run fails (auth/model/network), reuse an existing session if available.
      const existing = await this.listSessions();
      const latestExisting = existing[0];
      if (latestExisting?.id) {
        if (agent) this.sessionCache.set(agent, latestExisting.id);
        return {
          id: latestExisting.id,
          title: latestExisting.title || title,
          model,
          agent,
          reused: true
        };
      }
      throw new Error(`Session creation failed: ${error.message}`);
    }

    // Get most recent session after successful run.
    const sessions = await this.listSessions();
    const latestSession = sessions[0];
    if (!latestSession?.id) {
      throw new Error('Session creation failed: no session found after run');
    }

    if (agent) this.sessionCache.set(agent, latestSession.id);

    return {
      id: latestSession.id,
      title: latestSession.title || title,
      model,
      agent
    };
  }

  /**
   * List all sessions
   * @returns {Promise<Array>} Array of session objects
   */
  async listSessions() {
    try {
      // OpenCode CLI uses "session list" not "session ls"
      const result = await this.exec('session list', { parseJSON: false });
      
      // Parse the table output manually since --format json isn't supported
      const lines = result.output.split('\n');
      const sessions = [];
      
      for (let i = 2; i < lines.length; i++) { // Skip header and separator
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/\s{2,}/); // Split by 2+ spaces
        if (parts.length >= 3) {
          sessions.push({
            id: parts[0],
            title: parts[1],
            updated: parts[2]
          });
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('List sessions failed:', error.message);
      return [];
    }
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  async getSession(sessionId) {
    const sessions = await this.listSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteSession(sessionId) {
    try {
      await this.exec(`session delete ${sessionId}`, { parseJSON: false });
      
      // Remove from cache
      for (const [agent, cachedId] of this.sessionCache.entries()) {
        if (cachedId === sessionId) {
          this.sessionCache.delete(agent);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Delete session ${sessionId} failed:`, error.message);
      return false;
    }
  }

  /**
   * Get or create session for an agent
   * @param {string} agentId - Agent identifier
   * @param {Object} options - Session options
   * @returns {Promise<string>} Session ID
   */
  async getOrCreateSessionForAgent(agentId, options = {}) {
    // Check cache first
    if (this.sessionCache.has(agentId)) {
      const cachedSessionId = this.sessionCache.get(agentId);
      const session = await this.getSession(cachedSessionId);
      
      if (session) {
        return cachedSessionId;
      } else {
        // Session no longer exists, remove from cache
        this.sessionCache.delete(agentId);
      }
    }

    // Create new session
    const session = await this.createSession(`${agentId} Session`, {
      ...options,
      agent: agentId
    });

    return session.id;
  }

  /**
   * Execute MCP tool directly
   * @param {string} toolName - Tool name (e.g., 'github_search_repositories')
   * @param {Object} args - Tool arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Tool execution result
   */
  async executeTool(toolName, args = {}, options = {}) {
    const {
      server = null, // Auto-detect from tool name prefix
      timeout = 60000
    } = options;

    const argsEntries = Object.entries(args || {});
    const dockerArgs = argsEntries
      .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' ');

    const attempts = [];
    if (server) {
      attempts.push(`${this.cliPath} mcp exec --server ${server} --name ${toolName} --args '${JSON.stringify(args)}'`);
    }
    attempts.push(`${this.cliPath} mcp exec --name ${toolName} --args '${JSON.stringify(args)}'`);
    attempts.push(`docker mcp tools call ${toolName}${dockerArgs ? ` ${dockerArgs}` : ''}`);

    let lastError = null;
    for (const command of attempts) {
      try {
        const { stdout } = await execAsync(command, {
          cwd: this.projectPath,
          timeout,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env }
        });

        const output = (stdout || '').trim();
        try {
          return JSON.parse(output);
        } catch {
          return { success: true, output };
        }
      } catch (error) {
        lastError = error;
      }
    }

    const message = lastError?.stderr?.trim() || lastError?.stdout?.trim() || lastError?.message || 'Unknown tool execution failure';
    throw new Error(`MCP tool execution failed: ${message}`);
  }

  /**
   * List available MCP tools
   * @param {string} server - Optional server name filter
   * @returns {Promise<Array>} Array of tool definitions
   */
  async listTools(server = null) {
    const attempts = [
      `${this.cliPath} mcp server ls${server ? ` ${server}` : ''}`,
      `${this.cliPath} mcp tools ls${server ? ` ${server}` : ''}`,
      `docker mcp tools ls --format json`
    ];

    for (const command of attempts) {
      try {
        const { stdout } = await execAsync(command, {
          cwd: this.projectPath,
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env }
        });

        const output = (stdout || '').trim();
        if (!output) continue;

        // Try JSON first.
        try {
          const parsed = JSON.parse(output);
          if (Array.isArray(parsed)) return parsed;
          if (Array.isArray(parsed.tools)) return parsed.tools;
        } catch {
          // Parse text output fallback (best effort).
          const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
          const filtered = lines.filter(line => !line.toLowerCase().startsWith('tool call took:'));
          if (filtered.length > 0) {
            return filtered.map(name => ({ name }));
          }
        }
      } catch {
        // Try next command variant.
      }
    }

    console.error('List tools failed: no compatible MCP tooling command succeeded');
    return [];
  }

  /**
   * Send a prompt to an existing session
   * @param {string} sessionId - Session ID
   * @param {string} prompt - Prompt text
   * @param {Object} options - Prompt options
   * @returns {Promise<Object>} LLM response
   */
  async sendToSession(sessionId, prompt, options = {}) {
    const { timeout = 120000 } = options;

    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    const command = `run "${escapedPrompt}" --session ${sessionId}`;

    const result = await this.exec(command, { parseJSON: false, timeout });
    return {
      success: true,
      content: result.output,
      sessionId
    };
  }

  /**
   * Send a prompt to a NeuralDeck agent using OpenCode mappings and session cache
   * @param {string} agentId - NeuralDeck agent ID
   * @param {string} prompt - Prompt text
   * @param {Object} options - Prompt options
   * @returns {Promise<Object>} Agent response metadata
   */
  async sendToNeuralDeckAgent(agentId, prompt, options = {}) {
    const mapping = this.getAgentMapping(agentId);

    if (!mapping) {
      throw new Error(`No mapping found for agent: ${agentId}`);
    }

    if (mapping.routing !== 'opencode') {
      throw new Error(`Agent '${agentId}' is mapped to local routing, not OpenCode`);
    }

    const opencodeAgent = mapping.opencode_agent;
    const timeout = options.timeout || 120000;
    const model = options.model || 'claude/claude-sonnet-4-20250514';

    if (mapping.session_required) {
      const clearCachedSession = () => {
        this.sessionCache.delete(agentId);
        const cacheData = this._loadSessionCache();
        if (cacheData?.sessions?.[agentId]) {
          delete cacheData.sessions[agentId];
          this._saveSessionCache(cacheData);
        }
      };

      let sessionId = this.getCachedSessionId(agentId);

      if (sessionId) {
        const existing = await this.getSession(sessionId);
        if (!existing) {
          clearCachedSession();
          sessionId = null;
        }
      }

      if (!sessionId) {
        const created = await this.createSession(`${agentId} Session`, {
          model,
          agent: opencodeAgent
        });
        sessionId = created.id;
        this.cacheSessionId(agentId, sessionId, {
          opencodeAgent,
          type: mapping.type
        });
      }

      let response;
      try {
        response = await this.sendToSession(sessionId, prompt, { timeout });
      } catch (error) {
        const errorText = String(error?.message || '');
        const sessionRelatedFailure = /session/i.test(errorText) || /--session/.test(errorText);
        if (!sessionRelatedFailure) {
          throw error;
        }

        clearCachedSession();
        const created = await this.createSession(`${agentId} Session`, {
          model,
          agent: opencodeAgent
        });
        sessionId = created.id;
        this.cacheSessionId(agentId, sessionId, {
          opencodeAgent,
          type: mapping.type
        });
        response = await this.sendToSession(sessionId, prompt, { timeout });
      }

      return {
        ...response,
        agentId,
        opencodeAgent,
        routing: 'opencode',
        cachedSession: true
      };
    }

    const response = await this.runPrompt(prompt, {
      model,
      agent: opencodeAgent,
      timeout
    });

    return {
      ...response,
      agentId,
      opencodeAgent,
      routing: 'opencode',
      cachedSession: false
    };
  }

  /**
   * Get session history/messages
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Array of messages
   */
  async getSessionMessages(sessionId) {
    try {
      const result = await this.exec(`export ${sessionId}`, { parseJSON: true });
      return result.messages || [];
    } catch (error) {
      console.error(`Get messages for session ${sessionId} failed:`, error.message);
      return [];
    }
  }

  /**
   * Get available LLM providers and models
   * @returns {Promise<Array>} Array of providers
   */
  async listProviders() {
    try {
      const result = await this.exec('models', { parseJSON: false });
      
      // Parse the list of models (one per line)
      const models = result.output.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Group by provider (prefix before '/')
      const providers = {};
      models.forEach(model => {
        const parts = model.split('/');
        if (parts.length === 2) {
          const provider = parts[0];
          if (!providers[provider]) {
            providers[provider] = [];
          }
          providers[provider].push(model);
        }
      });
      
      return Object.keys(providers).map(name => ({
        name,
        models: providers[name]
      }));
    } catch (error) {
      console.error('List providers failed:', error.message);
      return [];
    }
  }

  /**
   * Check health/connectivity
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const isAvailable = await this.checkAvailability();
      
      if (!isAvailable) {
        return {
          healthy: false,
          error: 'OpenCode CLI not available',
          version: null
        };
      }

      const sessions = await this.listSessions();
      
      return {
        healthy: true,
        version: this.version,
        sessionCount: sessions.length,
        cliPath: this.cliPath
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        version: this.version
      };
    }
  }
}

// Export singleton instance
module.exports = new OpenCodeCLIService();
