/**
 * Provider Adapter Service
 * 
 * Routes LLM prompts to different providers:
 * - Claude Desktop (via CLI)
 * - Gemini (via CLI)
 * - Ollama (local models)
 * - Terminal-based AI agents (aider, etc.)
 * 
 * This enables NeuralDeck to use multiple LLM providers simultaneously,
 * routing different agents to their optimal models.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);
const openCodeService = require('./opencodeCLI.cjs');

class ProviderAdapter {
  constructor() {
    this.configPath = path.join(process.cwd(), 'opencode.jsonc');
    this.routingConfigPath = path.join(process.cwd(), '.neuraldeck', 'routing-config.json');
    this.config = null;
    this.routingConfig = null;
  }

  /**
   * Load configuration from opencode.jsonc
   * @private
   */
  async loadConfig() {
    if (this.config) return this.config;
    
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      // Remove comments from JSONC
      const jsonString = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      this.config = JSON.parse(jsonString);
      return this.config;
    } catch (error) {
      console.warn('Could not load opencode.jsonc, using defaults');
      return this.getDefaultConfig();
    }
  }

  /**
   * Default configuration
   * @private
   */
  getDefaultConfig() {
    return {
      providers: {
        claude: { enabled: true, default: 'sonnet' },
        gemini: { enabled: true, default: 'flash' },
        ollama: { enabled: true, default: 'deepseek' }
      },
      agent: {
        architect: { provider: 'claude', model: 'sonnet' },
        developer: { provider: 'ollama', model: 'deepseek' },
        analyst: { provider: 'gemini', model: 'pro' },
        qa_engineer: { provider: 'claude', model: 'sonnet' },
        pm: { provider: 'claude', model: 'sonnet' }
      }
    };
  }

  /**
   * Call Claude Desktop CLI
   * @param {string} prompt - Prompt text
   * @param {string} model - Model variant (sonnet, opus)
   * @returns {Promise<Object>} Response
   */
  async callClaude(prompt, model = 'sonnet') {
    try {
      // Escape quotes in prompt
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      
      // Note: This assumes claude CLI is installed
      // User may need to install it separately
      const command = `echo "${escapedPrompt}" | claude chat`;
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      if (stderr && !stdout) {
        throw new Error(`Claude error: ${stderr}`);
      }
      
      return { 
        provider: 'claude', 
        model, 
        response: stdout.trim(),
        success: true
      };
    } catch (error) {
      console.error('Claude CLI error:', error.message);
      return { 
        provider: 'claude', 
        model, 
        error: error.message,
        success: false,
        fallback: 'Consider using OpenCode session instead'
      };
    }
  }

  /**
   * Call Gemini CLI
   * @param {string} prompt - Prompt text
   * @param {string} model - Model variant (pro, flash)
   * @returns {Promise<Object>} Response
   */
  async callGemini(prompt, model = 'flash') {
    try {
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      
      // Map model names to Gemini API model IDs
      const modelMap = {
        'pro': 'gemini-2.0-pro',
        'flash': 'gemini-2.0-flash-exp'
      };
      
      const modelId = modelMap[model] || modelMap.flash;
      
      // Note: This assumes gemini CLI is installed
      const command = `gemini generate --model ${modelId} "${escapedPrompt}"`;
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        env: { 
          ...process.env, 
          GEMINI_API_KEY: process.env.GEMINI_API_KEY 
        }
      });
      
      if (stderr && !stdout) {
        throw new Error(`Gemini error: ${stderr}`);
      }
      
      return { 
        provider: 'gemini', 
        model: modelId, 
        response: stdout.trim(),
        success: true
      };
    } catch (error) {
      console.error('Gemini CLI error:', error.message);
      return { 
        provider: 'gemini', 
        model, 
        error: error.message,
        success: false,
        fallback: 'Check GEMINI_API_KEY or use OpenCode session'
      };
    }
  }

  /**
   * Call Ollama (local models)
   * @param {string} prompt - Prompt text
   * @param {string} model - Model name (deepseek, llama3, codellama)
   * @returns {Promise<Object>} Response
   */
  async callOllama(prompt, model = 'deepseek-coder:33b') {
    try {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      
      const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return { 
        provider: 'ollama', 
        model, 
        response: data.choices?.[0]?.message?.content || '',
        success: true
      };
    } catch (error) {
      console.error('Ollama error:', error.message);
      return { 
        provider: 'ollama', 
        model, 
        error: error.message,
        success: false,
        fallback: 'Check if Ollama is running: ollama serve'
      };
    }
  }

  /**
   * Call terminal-based AI agent (aider, etc.)
   * @param {string} prompt - Prompt text
   * @param {string} agentType - Agent type (aider, code-interpreter)
   * @returns {Promise<Object>} Response
   */
  async callTerminalAgent(prompt, agentType = 'aider') {
    const adapters = {
      'aider': async (p) => {
        const escapedPrompt = p.replace(/"/g, '\\"');
        const command = `echo "${escapedPrompt}" | aider --no-git --message`;
        const { stdout } = await execAsync(command, { timeout: 120000 });
        return stdout.trim();
      },
      'code-interpreter': async (p) => {
        const escapedPrompt = p.replace(/"/g, '\\"');
        const command = `python -m code_interpreter execute "${escapedPrompt}"`;
        const { stdout } = await execAsync(command, { timeout: 60000 });
        return stdout.trim();
      }
    };
    
    try {
      const adapter = adapters[agentType];
      if (!adapter) {
        throw new Error(`Unknown terminal agent: ${agentType}`);
      }
      
      const response = await adapter(prompt);
      
      return { 
        provider: 'terminal-agent', 
        agentType, 
        response,
        success: true
      };
    } catch (error) {
      console.error(`Terminal agent error (${agentType}):`, error.message);
      return { 
        provider: 'terminal-agent', 
        agentType, 
        error: error.message,
        success: false,
        fallback: `Check if ${agentType} is installed`
      };
    }
  }

  /**
   * Route prompt to appropriate provider based on agent config
   * @param {string} prompt - Prompt text
   * @param {string} agent - Agent ID
   * @returns {Promise<Object>} Response
   */
  async routePrompt(prompt, agent) {
    const config = await this.loadConfig();
    const agentConfig = this.getAgentConfig(agent, config);
    
    const provider = agentConfig.provider || 'claude';
    const model = agentConfig.model || 'sonnet';
    
    console.log(`Routing ${agent} to ${provider}/${model}`);
    
    switch (provider) {
      case 'claude':
        return await this.callClaude(prompt, model);
      case 'gemini':
        return await this.callGemini(prompt, model);
      case 'ollama':
        return await this.callOllama(prompt, model);
      case 'terminal-agents':
        return await this.callTerminalAgent(prompt, agentConfig.terminalAgent || 'aider');
      default:
        console.warn(`Unknown provider: ${provider}, falling back to claude`);
        return await this.callClaude(prompt, 'sonnet');
    }
  }

  /**
   * Load agent routing configuration for OpenCode/local decisions
   * @returns {Promise<Object>} Routing configuration
   */
  async loadRoutingConfig() {
    if (this.routingConfig) return this.routingConfig;

    try {
      const content = await fs.readFile(this.routingConfigPath, 'utf-8');
      this.routingConfig = JSON.parse(content);
      return this.routingConfig;
    } catch (error) {
      console.warn('Could not load routing-config.json, using defaults');
      this.routingConfig = {
        routing_strategy: 'agent-based',
        fallback_enabled: true,
        fallback_notify_ui: true,
        rules: {
          opencode_agents: [],
          local_agents: [],
          opencode_timeout_ms: 120000,
          local_timeout_ms: 60000
        }
      };
      return this.routingConfig;
    }
  }

  /**
   * Determine whether an agent should route to OpenCode
   * @param {string} agentId - NeuralDeck agent ID
   * @returns {Promise<boolean>} True when OpenCode should handle the prompt
   */
  async shouldUseOpenCode(agentId) {
    const routing = await this.loadRoutingConfig();
    const openCodeAgents = routing?.rules?.opencode_agents || [];
    return openCodeAgents.includes(agentId);
  }

  /**
   * Route a prompt by NeuralDeck agent with OpenCode fallback logic
   * @param {string} prompt - Prompt text
   * @param {string} agentId - NeuralDeck agent ID
   * @param {Object} options - Routing options
   * @returns {Promise<Object>} Response metadata and content
   */
  async routeToAgent(prompt, agentId, options = {}) {
    const routing = await this.loadRoutingConfig();
    const useOpenCode = await this.shouldUseOpenCode(agentId);

    if (useOpenCode) {
      try {
        const response = await openCodeService.sendToNeuralDeckAgent(agentId, prompt, {
          timeout: options.timeout || routing?.rules?.opencode_timeout_ms || 120000,
          model: options.model
        });

        return {
          success: true,
          routing: 'opencode',
          fallbackUsed: false,
          content: response.content,
          provider: 'opencode',
          model: response.model || options.model || null,
          metadata: {
            agentId,
            opencodeAgent: response.opencodeAgent,
            sessionId: response.sessionId || null,
            cachedSession: response.cachedSession || false
          }
        };
      } catch (error) {
        if (!routing?.fallback_enabled) {
          return {
            success: false,
            routing: 'opencode',
            fallbackUsed: false,
            error: error.message,
            provider: 'opencode'
          };
        }

        const fallbackResponse = await this.routePrompt(prompt, agentId);
        return {
          success: !!fallbackResponse?.success,
          routing: fallbackResponse?.provider || 'local',
          fallbackUsed: true,
          fallbackReason: error.message,
          content: fallbackResponse?.response || '',
          provider: fallbackResponse?.provider || 'local',
          model: fallbackResponse?.model || null,
          notifyUI: !!routing?.fallback_notify_ui,
          metadata: {
            agentId,
            originalRouting: 'opencode'
          }
        };
      }
    }

    const localResponse = await this.routePrompt(prompt, agentId);
    return {
      success: !!localResponse?.success,
      routing: localResponse?.provider || 'local',
      fallbackUsed: false,
      content: localResponse?.response || '',
      provider: localResponse?.provider || 'local',
      model: localResponse?.model || null,
      metadata: {
        agentId,
        originalRouting: 'local'
      }
    };
  }

  /**
   * Get agent configuration
   * @param {string} agent - Agent ID
   * @param {Object} config - Config object (optional)
   * @returns {Object} Agent config
   */
  getAgentConfig(agent, config = null) {
    if (!config) {
      config = this.getDefaultConfig();
    }
    
    return config.agent?.[agent] || { 
      provider: 'claude', 
      model: 'sonnet' 
    };
  }

  /**
   * Test all provider connections
   * @returns {Promise<Object>} Test results
   */
  async testProviders() {
    const results = {};
    
    // Test Claude
    const claudeResult = await this.callClaude('Say "OK" if you can hear me', 'sonnet');
    results.claude = {
      available: claudeResult.success,
      error: claudeResult.error
    };
    
    // Test Gemini
    const geminiResult = await this.callGemini('Say "OK" if you can hear me', 'flash');
    results.gemini = {
      available: geminiResult.success,
      error: geminiResult.error
    };
    
    // Test Ollama
    const ollamaResult = await this.callOllama('Say "OK" if you can hear me', 'deepseek-coder:33b');
    results.ollama = {
      available: ollamaResult.success,
      error: ollamaResult.error
    };
    
    return results;
  }
}

// Export singleton instance
module.exports = new ProviderAdapter();
