/**
 * OpenCode Client Service
 * 
 * Provides a centralized interface to the OpenCode SDK for NeuralDeck backend.
 * Handles session management, prompt routing, and tool execution.
 * 
 * Architecture:
 * - Strategic Agents (Architect, Analyst, PM): Use OpenCode sessions for full LLM conversations
 * - Tactical Agents (Developer, QA, Security): Use direct tool calls for performance
 * 
 * IMPORTANT: @opencode-ai/sdk is an ES module only package.
 * We use dynamic import() to load it in this CommonJS module.
 */

// Lazy-loaded SDK reference
let createOpencodeClient = null;

class OpenCodeService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.baseUrl = process.env.OPENCODE_URL || 'http://localhost:4096';
    this.sessionCache = new Map(); // Cache sessions per agent
    this.sdkLoaded = false;
  }

  /**
   * Load OpenCode SDK dynamically (ES module)
   * @private
   */
  async loadSDK() {
    if (!createOpencodeClient) {
      const sdk = await import('@opencode-ai/sdk');
      createOpencodeClient = sdk.createOpencodeClient;
      this.sdkLoaded = true;
    }
  }

  /**
   * Connect to OpenCode server
   * @param {string} baseUrl - OpenCode server URL
   * @returns {Promise<boolean>} Connection status
   */
  async connect(baseUrl = null) {
    if (baseUrl) this.baseUrl = baseUrl;
    
    try {
      // Load SDK if not already loaded
      await this.loadSDK();
      
      this.client = createOpencodeClient({ 
        baseUrl: this.baseUrl,
        throwOnError: false 
      });
      
      const pathResult = await this.client.path.get();
      this.isConnected = Boolean(pathResult?.data);
      
      if (this.isConnected) {
        console.log(`✓ OpenCode connected: ${this.baseUrl}`);
      }
      
      return this.isConnected;
    } catch (error) {
      console.error('OpenCode connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Ensure connection is active
   * @private
   */
  async ensureConnected() {
    if (!this.sdkLoaded) {
      await this.loadSDK();
    }
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.isConnected) {
      throw new Error('OpenCode server not available');
    }
  }

  /**
   * Create a new OpenCode session
   * @param {string} title - Session title
   * @param {string} agent - Agent ID (optional)
   * @returns {Promise<Object>} Session data
   */
  async createSession(title = 'NeuralDeck Session', agent = null) {
    await this.ensureConnected();
    
    try {
      const result = await this.client.session.create({ 
        body: { 
          title,
          metadata: { 
            agent,
            neuraldeck: true,
            timestamp: Date.now(),
            version: '1.0.0'
          }
        } 
      });
      
      if (agent) {
        this.sessionCache.set(agent, result.data.id);
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to create session:', error.message);
      throw error;
    }
  }

  /**
   * Get cached session for an agent
   * @param {string} agent - Agent ID
   * @returns {Promise<string|null>} Session ID or null
   */
  async getCachedSession(agent) {
    if (this.sessionCache.has(agent)) {
      const sessionId = this.sessionCache.get(agent);
      
      // Verify session still exists
      try {
        await this.client.session.get({ path: { id: sessionId } });
        return sessionId;
      } catch (error) {
        // Session no longer exists, remove from cache
        this.sessionCache.delete(agent);
        return null;
      }
    }
    return null;
  }

  /**
   * Send a prompt to an OpenCode session
   * @param {string} sessionId - Session ID
   * @param {string} message - Message to send
   * @param {string} agent - Agent ID (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response data
   */
  async sendPrompt(sessionId, message, agent = null, options = {}) {
    await this.ensureConnected();
    
    const parts = [{ type: 'text', text: message }];
    
    // Strategic agents use full LLM conversation (sessions)
    if (this.isStrategicAgent(agent)) {
      const providerConfig = this.getProviderConfig(agent);
      
      return await this.client.session.prompt({
        path: { id: sessionId },
        body: {
          model: providerConfig.model,
          parts,
          ...options
        }
      });
    }
    
    // Tactical agents add context without triggering response (noReply=true)
    // They use direct tool calls for actual work
    if (this.isTacticalAgent(agent)) {
      return await this.client.session.prompt({
        path: { id: sessionId },
        body: { 
          noReply: true, 
          parts,
          ...options
        }
      });
    }
    
    // Default: full LLM response
    return await this.client.session.prompt({
      path: { id: sessionId },
      body: { parts, ...options }
    });
  }

  /**
   * Execute a tool directly (no LLM involved)
   * @param {string} tool - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async executeToolDirect(tool, args = {}) {
    await this.ensureConnected();
    
    try {
      switch (tool) {
        // Built-in file operations
        case 'read':
        case 'read_file':
          return await this.client.file.read({ query: { path: args.path } });
        
        case 'find_files':
          return await this.client.find.files({ 
            query: { 
              query: args.query,
              type: args.type,
              limit: args.limit || 50
            } 
          });
        
        case 'search_code':
        case 'find_text':
          return await this.client.find.text({ 
            query: { pattern: args.pattern } 
          });
        
        case 'find_symbols':
          return await this.client.find.symbols({ 
            query: { query: args.query } 
          });
        
        case 'file_status':
          return await this.client.file.status({ 
            query: args.path ? { path: args.path } : {} 
          });
        
        // For write and bash, we need a session
        case 'write':
        case 'write_file':
        case 'bash':
        case 'shell':
          return { 
            type: 'requires_session',
            message: 'This tool requires a session context. Use sendPrompt() instead.'
          };
        
        default:
          // Unknown tool
          return { 
            error: 'Unknown tool',
            tool,
            availableTools: [
              'read', 'find_files', 'search_code', 'find_symbols', 'file_status'
            ]
          };
      }
    } catch (error) {
      console.error(`Tool execution failed (${tool}):`, error.message);
      return { error: error.message, tool };
    }
  }

  /**
   * List all available sessions
   * @returns {Promise<Array>} List of sessions
   */
  async listSessions() {
    await this.ensureConnected();
    
    try {
      const result = await this.client.session.list();
      return result.data || [];
    } catch (error) {
      console.error('Failed to list sessions:', error.message);
      return [];
    }
  }

  /**
   * Get session details
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  async getSession(sessionId) {
    await this.ensureConnected();
    
    try {
      const result = await this.client.session.get({ path: { id: sessionId } });
      return result.data;
    } catch (error) {
      console.error(`Failed to get session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get session messages
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Messages
   */
  async getSessionMessages(sessionId) {
    await this.ensureConnected();
    
    try {
      const result = await this.client.session.messages({ path: { id: sessionId } });
      return result.data || [];
    } catch (error) {
      console.error(`Failed to get messages for session ${sessionId}:`, error.message);
      return [];
    }
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteSession(sessionId) {
    await this.ensureConnected();
    
    try {
      await this.client.session.delete({ path: { id: sessionId } });
      
      // Remove from cache
      for (const [agent, cachedId] of this.sessionCache.entries()) {
        if (cachedId === sessionId) {
          this.sessionCache.delete(agent);
          break;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error.message);
      return false;
    }
  }

  /**
   * Check if agent is strategic (uses sessions for LLM conversations)
   * @param {string} agent - Agent ID
   * @returns {boolean}
   */
  isStrategicAgent(agent) {
    const strategicAgents = ['architect', 'analyst', 'pm', 'ux_designer'];
    return strategicAgents.includes(agent);
  }

  /**
   * Check if agent is tactical (uses direct tool calls)
   * @param {string} agent - Agent ID
   * @returns {boolean}
   */
  isTacticalAgent(agent) {
    const tacticalAgents = ['developer', 'qa_engineer', 'security_auditor', 'code_reviewer'];
    return tacticalAgents.includes(agent);
  }

  /**
   * Get provider configuration for an agent
   * @param {string} agent - Agent ID
   * @returns {Object} Provider config
   */
  getProviderConfig(agent) {
    // Default provider mapping
    const providerMap = {
      'architect': { 
        providerID: 'anthropic', 
        modelID: 'claude-3-5-sonnet-20241022' 
      },
      'developer': { 
        providerID: 'ollama', 
        modelID: 'deepseek-coder:33b' 
      },
      'analyst': { 
        providerID: 'gemini', 
        modelID: 'gemini-2.0-pro' 
      },
      'qa_engineer': { 
        providerID: 'anthropic', 
        modelID: 'claude-3-5-sonnet-20241022' 
      },
      'pm': { 
        providerID: 'openai', 
        modelID: 'gpt-4-turbo-preview' 
      }
    };
    
    return providerMap[agent] || { 
      providerID: 'anthropic', 
      modelID: 'claude-3-5-sonnet-20241022' 
    };
  }

  /**
   * Get health status
   * @returns {Promise<Object>} Health data
   */
  async getHealth() {
    try {
      if (!this.client) {
        await this.connect();
      }
      const pathResult = await this.client.path.get();
      return {
        connected: this.isConnected,
        baseUrl: this.baseUrl,
        path: pathResult?.data,
        healthy: this.isConnected
      };
    } catch (error) {
      return {
        connected: false,
        baseUrl: this.baseUrl,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new OpenCodeService();
