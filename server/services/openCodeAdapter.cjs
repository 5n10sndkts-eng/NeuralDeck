/**
 * OpenCode SDK Adapter for NeuralDeck
 * 
 * This service wraps the OpenCode SDK to integrate OpenCode's agent system
 * directly into NeuralDeck, replacing the CLI-based approach with SDK-based integration.
 * 
 * Architecture:
 * - Creates embedded OpenCode server instance
 * - Manages sessions for each NeuralDeck agent
 * - Routes agent requests through OpenCode's session/prompt API
 * - Provides unified interface for multi-agent coordination
 * 
 * @author NeuralDeck Team
 * @version 2.0.0
 */

const path = require('path');
const fs = require('fs').promises;

class OpenCodeAdapter {
  constructor() {
    this.sdk = null; // Will be loaded dynamically
    this.client = null;
    this.server = null;
    this.sessions = new Map(); // agentId -> sessionId mapping
    this.config = null;
    this.isInitialized = false;
    this.workspaceRoot = process.cwd();
    
    // Agent configuration mapping
    this.agentProfiles = {
      architect: {
        name: 'architect',
        systemPrompt: 'You are a software architect focused on high-level system design and architecture decisions.',
        model: null // Will use default from config
      },
      analyst: {
        name: 'analyst',
        systemPrompt: 'You are a business analyst focused on requirements analysis and feasibility assessment.',
        model: null
      },
      pm: {
        name: 'pm',
        systemPrompt: 'You are a project manager focused on planning, task breakdown, and coordination.',
        model: null
      },
      developer: {
        name: 'developer',
        systemPrompt: 'You are a senior software developer focused on implementation and code quality.',
        model: null
      },
      qa_engineer: {
        name: 'qa_engineer',
        systemPrompt: 'You are a QA engineer focused on testing, quality assurance, and bug detection.',
        model: null
      },
      code_reviewer: {
        name: 'code_reviewer',
        systemPrompt: 'You are a code reviewer focused on code quality, best practices, and maintainability.',
        model: null
      },
      security_auditor: {
        name: 'security_auditor',
        systemPrompt: 'You are a security auditor focused on identifying vulnerabilities and security best practices.',
        model: null
      },
      ux_designer: {
        name: 'ux_designer',
        systemPrompt: 'You are a UX designer focused on user experience, interface design, and usability.',
        model: null
      },
      technical_writer: {
        name: 'technical_writer',
        systemPrompt: 'You are a technical writer focused on documentation, clarity, and knowledge management.',
        model: null
      },
      devops: {
        name: 'devops',
        systemPrompt: 'You are a DevOps engineer focused on deployment, CI/CD, and infrastructure.',
        model: null
      }
    };
  }

  /**
   * Initialize the OpenCode SDK and create embedded server
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    try {
      // Dynamically import ESM SDK
      if (!this.sdk) {
        console.log('[OpenCodeAdapter] Loading OpenCode SDK (ESM)...');
        this.sdk = await import('@opencode-ai/sdk/client');
      }

      const {
        port: optionPort,
        hostname: optionHostname,
        baseUrl: optionBaseUrl,
        workspaceRoot = this.workspaceRoot
      } = options;

      this.workspaceRoot = workspaceRoot;

      const envBaseUrl = process.env.OPENCODE_URL || process.env.VITE_OPENCODE_URL || '';
      const parsedPort = parseInt(String(optionPort ?? process.env.OPENCODE_PORT ?? ''), 10);
      const port = Number.isFinite(parsedPort) ? parsedPort : 4096;
      const hostname = optionHostname || process.env.OPENCODE_HOST || 'localhost';

      const candidateUrls = Array.from(
        new Set(
          [
            optionBaseUrl,
            envBaseUrl,
            `http://${hostname}:${port}`,
            'http://127.0.0.1:4096',
            'http://localhost:4096'
          ].filter(Boolean)
        )
      );

      let lastError = null;
      for (const candidateUrl of candidateUrls) {
        try {
          console.log('[OpenCodeAdapter] Connecting to OpenCode Desktop at:', candidateUrl);
          this.client = this.sdk.createOpencodeClient({
            baseUrl: candidateUrl
          });

          const pathInfo = await this.client.path.get();
          console.log('[OpenCodeAdapter] Successfully connected to OpenCode Desktop');
          console.log('[OpenCodeAdapter] Path:', pathInfo.data);
          this.isInitialized = true;
          return {
            success: true,
            mode: 'desktop',
            url: candidateUrl,
            path: pathInfo.data
          };
        } catch (error) {
          lastError = error;
          console.warn(`[OpenCodeAdapter] Connection attempt failed for ${candidateUrl}:`, error.message);
        }
      }

      return {
        success: false,
        error: `Cannot connect to OpenCode Desktop. Tried: ${candidateUrls.join(', ')}`,
        details: lastError?.message || 'Unknown connection error'
      };

    } catch (error) {
      console.error('[OpenCodeAdapter] Initialization failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Get or create a session for a specific agent
   */
  async getOrCreateSession(agentId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('OpenCodeAdapter not initialized. Call initialize() first.');
    }

    // Check if session already exists for this agent
    if (this.sessions.has(agentId)) {
      const sessionId = this.sessions.get(agentId);
      
      // Verify session still exists
      try {
        const session = await this.client.session.get({
          path: { sessionId }
        });
        
        if (session.data) {
          return {
            sessionId,
            exists: true,
            session: session.data
          };
        }
      } catch (error) {
        console.log(`[OpenCodeAdapter] Session ${sessionId} for agent ${agentId} no longer exists, creating new...`);
        this.sessions.delete(agentId);
      }
    }

    // Create new session
    const agentProfile = this.agentProfiles[agentId];
    if (!agentProfile) {
      throw new Error(`Unknown agent ID: ${agentId}`);
    }

    try {
      const sessionResponse = await this.client.session.create({
        body: {
          name: `NeuralDeck-${agentId}-${Date.now()}`,
          agent: agentProfile.name,
          model: options.model || agentProfile.model,
          message: agentProfile.systemPrompt
        }
      });

      if (!sessionResponse.data) {
        throw new Error('Failed to create session: ' + JSON.stringify(sessionResponse.error));
      }

      const sessionId = sessionResponse.data.id;
      this.sessions.set(agentId, sessionId);

      console.log(`[OpenCodeAdapter] Created session ${sessionId} for agent ${agentId}`);

      return {
        sessionId,
        exists: false,
        session: sessionResponse.data
      };
    } catch (error) {
      console.error(`[OpenCodeAdapter] Failed to create session for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Send a prompt to a specific agent (creates session if needed)
   */
  async sendPrompt(agentId, message, options = {}) {
    if (!this.isInitialized) {
      throw new Error('OpenCodeAdapter not initialized. Call initialize() first.');
    }

    try {
      // Get or create session for this agent
      const { sessionId } = await this.getOrCreateSession(agentId, options);

      // Send prompt to session
      const response = await this.client.session.prompt({
        path: { sessionId },
        body: {
          content: message,
          attachments: options.attachments || [],
          execute: options.execute !== false // Default to auto-execute
        }
      });

      if (!response.data) {
        throw new Error('Failed to send prompt: ' + JSON.stringify(response.error));
      }

      return {
        success: true,
        sessionId,
        messageId: response.data.id,
        response: response.data
      };
    } catch (error) {
      console.error(`[OpenCodeAdapter] Failed to send prompt to ${agentId}:`, error);
      return {
        success: false,
        error: error.message,
        agentId
      };
    }
  }

  /**
   * Send async prompt (non-blocking)
   */
  async sendPromptAsync(agentId, message, options = {}) {
    if (!this.isInitialized) {
      throw new Error('OpenCodeAdapter not initialized. Call initialize() first.');
    }

    try {
      const { sessionId } = await this.getOrCreateSession(agentId, options);

      const response = await this.client.session.promptAsync({
        path: { sessionId },
        body: {
          content: message,
          attachments: options.attachments || []
        }
      });

      return {
        success: true,
        sessionId,
        messageId: response.data?.id,
        status: 'pending'
      };
    } catch (error) {
      console.error(`[OpenCodeAdapter] Failed to send async prompt to ${agentId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get session messages (conversation history)
   */
  async getSessionMessages(agentId, options = {}) {
    if (!this.sessions.has(agentId)) {
      return { success: false, error: 'No session found for agent' };
    }

    try {
      const sessionId = this.sessions.get(agentId);
      const response = await this.client.session.messages({
        path: { sessionId },
        query: {
          limit: options.limit || 50,
          offset: options.offset || 0
        }
      });

      return {
        success: true,
        messages: response.data || [],
        sessionId
      };
    } catch (error) {
      console.error(`[OpenCodeAdapter] Failed to get messages for ${agentId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(agentId) {
    if (!this.sessions.has(agentId)) {
      return { success: false, error: 'No session found for agent' };
    }

    try {
      const sessionId = this.sessions.get(agentId);
      const response = await this.client.session.status({
        path: { sessionId }
      });

      return {
        success: true,
        status: response.data,
        sessionId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all active sessions
   */
  async listSessions() {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const response = await this.client.session.list();
      
      return {
        success: true,
        sessions: response.data || [],
        activeAgents: Array.from(this.sessions.keys())
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Abort a session
   */
  async abortSession(agentId) {
    if (!this.sessions.has(agentId)) {
      return { success: false, error: 'No session found for agent' };
    }

    try {
      const sessionId = this.sessions.get(agentId);
      await this.client.session.abort({
        path: { sessionId }
      });

      return {
        success: true,
        sessionId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(agentId) {
    if (!this.sessions.has(agentId)) {
      return { success: false, error: 'No session found for agent' };
    }

    try {
      const sessionId = this.sessions.get(agentId);
      await this.client.session.delete({
        path: { sessionId }
      });

      this.sessions.delete(agentId);

      return {
        success: true,
        sessionId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a tool/MCP call through OpenCode
   */
  async executeTool(toolId, args, options = {}) {
    if (!this.isInitialized) {
      throw new Error('OpenCodeAdapter not initialized');
    }

    try {
      // Get available tools
      const toolsResponse = await this.client.tool.list({
        query: {
          provider: options.provider || 'anthropic',
          model: options.model || 'claude-sonnet-4'
        }
      });

      const tools = toolsResponse.data || [];
      const tool = tools.find(t => t.id === toolId);

      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      // Tools are typically executed via session commands
      // For now, return tool info
      return {
        success: true,
        tool,
        message: 'Tool execution requires active session. Use sendPrompt() with tool calls.'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available providers and models
   */
  async getProviders() {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const response = await this.client.config.providers();
      
      return {
        success: true,
        providers: response.data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current configuration
   */
  async getConfig() {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const response = await this.client.config.get();
      
      return {
        success: true,
        config: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    try {
      // Abort all active sessions
      for (const agentId of this.sessions.keys()) {
        await this.abortSession(agentId);
      }

      // Close embedded server if running
      if (this.server) {
        this.server.close();
      }

      this.isInitialized = false;
      this.sessions.clear();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return {
          healthy: false,
          status: 'not_initialized'
        };
      }

      const projectInfo = await this.client.project.current();
      
      return {
        healthy: true,
        status: 'connected',
        mode: this.server ? 'embedded' : 'desktop',
        sessions: this.sessions.size,
        project: projectInfo.data
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        error: error.message
      };
    }
  }
}

// Singleton instance
const openCodeAdapter = new OpenCodeAdapter();

module.exports = openCodeAdapter;
