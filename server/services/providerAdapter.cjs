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

const { exec, execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const openCodeService = require('./opencodeCLI.cjs');
const openCodeAdapter = require('./openCodeAdapter.cjs');

// Ensure we can find CLIs in standard locations (Homebrew, etc.)
const USER_HOME = process.env.HOME || process.env.USERPROFILE || '';
const EXTENDED_PATH = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  path.join(USER_HOME, '.local/bin'),
  process.env.PATH
].filter(Boolean).join(':');

const execOptions = {
  env: { ...process.env, PATH: EXTENDED_PATH },
  maxBuffer: 10 * 1024 * 1024 // 10MB buffer
};

class ProviderAdapter {
  constructor() {
    this.configPath = path.join(process.cwd(), 'opencode.jsonc');
    this.routingConfigPath = path.join(process.cwd(), '.neuraldeck', 'routing-config.json');
    this.config = null;
    this.routingConfig = null;
    this.useOpenCodeSDK = process.env.OPENCODE_USE_SDK === '1';
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
    const defaultOllamaModel = process.env.OLLAMA_DEFAULT_MODEL || 'deepseek';
    return {
      providers: {
        claude: { enabled: true, default: 'sonnet' },
        gemini: { enabled: true, default: 'flash' },
        ollama: { enabled: true, default: defaultOllamaModel }
      },
      agent: {
        architect: { provider: 'claude', model: 'sonnet' },
        developer: { provider: 'ollama', model: defaultOllamaModel },
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
  async callClaude(prompt, model = 'sonnet', options = {}) {
    const timeout = options.timeout || 60000;

    // 1. Try HTTP API if Key exists
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const modelMap = {
          'sonnet': 'claude-3-sonnet-20240229',
          'opus': 'claude-3-opus-20240229',
          'haiku': 'claude-3-haiku-20240307'
        };
        const targetModel = modelMap[model] || model;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Anthropic API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return {
          provider: 'claude',
          model,
          response: data.content?.[0]?.text || '',
          success: true
        };
      } catch (apiError) {
        console.warn(`[Claude] API failed, trying CLI: ${apiError.message}`);
      }
    }

    // 2. Fallback to CLI
    try {
      // Use execFile with argument array to prevent shell injection.
      // claude CLI accepts prompt via -p flag (non-interactive).
      const { stdout, stderr } = await execFileAsync('claude', ['-p', prompt], {
        ...execOptions,
        timeout
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
      const isInteractive = error.message.includes('interactive') || error.code === 'ETIMEDOUT';

      return {
        provider: 'claude',
        model,
        error: error.message,
        success: false,
        fallback: 'Set ANTHROPIC_API_KEY in .env or configure a valid CLI.'
      };
    }
  }

  /**
   * Call Gemini CLI
   * @param {string} prompt - Prompt text
   * @param {string} model - Model variant (pro, flash)
   * @returns {Promise<Object>} Response
   */
  async callGemini(prompt, model = 'flash', options = {}) {
    const timeout = options.timeout || 60000;
    try {
      // Map model names to Gemini API model IDs
      const modelMap = {
        'pro': 'gemini-2.0-pro',
        'flash': 'gemini-2.0-flash-exp'
      };

      const modelId = modelMap[model] || modelMap.flash;

      // Use execFile with argument array to prevent shell injection
      let stdout, stderr;

      try {
        const result = await execFileAsync('gemini', ['generate', '--model', modelId, prompt], {
          ...execOptions,
          timeout,
          env: {
            ...execOptions.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY
          }
        });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (cliError) {
        // Fallback to HTTP API if CLI fails or is missing
        if (!process.env.GEMINI_API_KEY) throw cliError;

        console.log(`[Gemini] CLI failed, falling back to HTTP API...`);
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
        const fetchRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!fetchRes.ok) throw new Error(`HTTP API Error: ${fetchRes.status} ${fetchRes.statusText}`);
        const data = await fetchRes.json();

        return {
          provider: 'gemini',
          model: modelId,
          response: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          success: true
        };
      }

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
  async callOllama(prompt, model = 'deepseek-coder:33b', options = {}) {
    const timeout = options.timeout || 60000;
    const allowModelRetry = options.retryModelLookup !== false;
    try {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        // If the configured model is missing, retry once with the first installed Ollama model.
        if (allowModelRetry && response.status === 404) {
          try {
            const tagsController = new AbortController();
            const tagsTimer = setTimeout(() => tagsController.abort(), Math.min(timeout, 10000));
            const tagsResponse = await fetch(`${ollamaUrl}/api/tags`, {
              signal: tagsController.signal
            }).finally(() => clearTimeout(tagsTimer));

            if (tagsResponse.ok) {
              const tags = await tagsResponse.json();
              const fallbackModel = tags?.models?.[0]?.name;
              if (fallbackModel && fallbackModel !== model) {
                return await this.callOllama(prompt, fallbackModel, {
                  ...options,
                  retryModelLookup: false
                });
              }
            }
          } catch {
            // Ignore lookup failures and fall through to original HTTP error.
          }
        }
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
  async callTerminalAgent(prompt, agentType = 'aider', options = {}) {
    const timeout = options.timeout;
    const adapters = {
      'aider': async (p) => {
        // Use execFile to prevent shell injection
        const { stdout } = await execFileAsync('aider', ['--no-git', '--message', p], { timeout: timeout || 120000 });
        return stdout.trim();
      },
      'code-interpreter': async (p) => {
        // Use execFile to prevent shell injection
        const { stdout } = await execFileAsync('python', ['-m', 'code_interpreter', 'execute', p], { timeout: timeout || 60000 });
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
  async routePrompt(prompt, agent, options = {}) {
    const config = await this.loadConfig();
    const agentConfig = this.getAgentConfig(agent, config);

    const provider = agentConfig.provider || 'claude';
    const model = agentConfig.model || 'sonnet';

    console.log(`Routing ${agent} to ${provider}/${model}`);

    switch (provider) {
      case 'claude':
        return await this.callClaude(prompt, model, options);
      case 'gemini':
        return await this.callGemini(prompt, model, options);
      case 'ollama':
        return await this.callOllama(prompt, model, options);
      case 'terminal-agents':
        return await this.callTerminalAgent(prompt, agentConfig.terminalAgent || 'aider', options);
      default:
        console.warn(`Unknown provider: ${provider}, falling back to claude`);
        return await this.callClaude(prompt, 'sonnet', options);
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
    const openCodeTimeout = options.timeout || routing?.rules?.opencode_timeout_ms || 120000;
    const localTimeout = options.timeout || routing?.rules?.local_timeout_ms || 60000;

    if (useOpenCode) {
      try {
        const model = options.model;
        let response;
        let transport = 'cli';
        let sdkError = null;

        if (this.useOpenCodeSDK) {
          try {
            const init = await openCodeAdapter.initialize();
            if (!init?.success) {
              throw new Error(init?.error || 'OpenCode SDK initialization failed');
            }

            const sdkResponse = await openCodeAdapter.sendPrompt(agentId, prompt, { timeout: openCodeTimeout, model });
            if (!sdkResponse?.success) {
              throw new Error(sdkResponse?.error || 'OpenCode SDK prompt failed');
            }

            response = {
              content: sdkResponse?.response?.content || JSON.stringify(sdkResponse?.response || {}),
              opencodeAgent: agentId,
              sessionId: sdkResponse?.sessionId || null,
              cachedSession: false,
              model
            };
            transport = 'sdk';
          } catch (error) {
            sdkError = error.message;
          }
        }

        if (!response) {
          response = await openCodeService.sendToNeuralDeckAgent(agentId, prompt, {
            timeout: openCodeTimeout,
            model
          });
          transport = 'cli';
        }

        const normalizedContent = String(response?.content || '').trim();
        const hasContent = normalizedContent.length > 0;

        return {
          success: hasContent,
          routing: 'opencode',
          fallbackUsed: false,
          content: response?.content || '',
          provider: 'opencode',
          model: response.model || options.model || null,
          error: hasContent ? undefined : 'OpenCode returned empty response',
          metadata: {
            agentId,
            opencodeAgent: response.opencodeAgent,
            sessionId: response.sessionId || null,
            cachedSession: response.cachedSession || false,
            transport,
            sdkFallbackReason: sdkError
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

        const fallbackResponse = await this.routePrompt(prompt, agentId, { timeout: localTimeout });
        const fallbackContent = String(fallbackResponse?.response || '').trim();
        const fallbackSuccess = !!fallbackResponse?.success && fallbackContent.length > 0;
        return {
          success: fallbackSuccess,
          routing: fallbackResponse?.provider || 'local',
          fallbackUsed: true,
          fallbackReason: error.message,
          content: fallbackResponse?.response || '',
          provider: fallbackResponse?.provider || 'local',
          model: fallbackResponse?.model || null,
          error: fallbackSuccess
            ? undefined
            : (fallbackResponse?.error || 'Fallback provider returned empty response'),
          notifyUI: !!routing?.fallback_notify_ui,
          metadata: {
            agentId,
            originalRouting: 'opencode'
          }
        };
      }
    }

    const localResponse = await this.routePrompt(prompt, agentId, { timeout: localTimeout });
    const localContent = String(localResponse?.response || '').trim();
    const localSuccess = !!localResponse?.success && localContent.length > 0;
    return {
      success: localSuccess,
      routing: localResponse?.provider || 'local',
      fallbackUsed: false,
      content: localResponse?.response || '',
      provider: localResponse?.provider || 'local',
      model: localResponse?.model || null,
      error: localSuccess
        ? undefined
        : (localResponse?.error || 'Local provider returned empty response'),
      metadata: {
        agentId,
        originalRouting: 'local'
      }
    };
  }

  /**
   * Run a swarm prompt across multiple agents.
   * Modes:
   * - broadcast: return all agent responses
   * - consensus: return all responses + best-effort consensus pick
   * @param {string} prompt - Prompt text
   * @param {string[]} agentIds - NeuralDeck agent IDs
   * @param {Object} options - Swarm options
   * @returns {Promise<Object>} Aggregated swarm result
   */
  async routeSwarm(prompt, agentIds = [], options = {}) {
    const mode = options.mode || 'broadcast';
    const timeout = options.timeout || 120000;
    const model = options.model;

    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return {
        success: false,
        mode,
        error: 'agentIds must be a non-empty array',
        responses: []
      };
    }

    const uniqueAgents = [...new Set(agentIds)];
    const settled = await Promise.all(
      uniqueAgents.map(async (agentId) => {
        try {
          const result = await this.routeToAgent(prompt, agentId, { timeout, model });
          return { agentId, ...result };
        } catch (error) {
          return {
            agentId,
            success: false,
            routing: 'error',
            fallbackUsed: false,
            provider: 'none',
            error: error.message
          };
        }
      })
    );

    const normalizedResponses = settled.map((entry) => {
      const content = String(entry?.content || '').trim();
      if (entry?.success && content.length === 0) {
        return {
          ...entry,
          success: false,
          error: entry.error || 'Provider returned empty response'
        };
      }
      return entry;
    });

    const successful = normalizedResponses.filter((entry) => !!entry.success);
    const failed = normalizedResponses.filter((entry) => !entry.success);

    if (mode !== 'consensus') {
      return {
        success: successful.length > 0,
        mode: 'broadcast',
        totalAgents: uniqueAgents.length,
        successCount: successful.length,
        failureCount: failed.length,
        responses: normalizedResponses
      };
    }

    // Best-effort consensus: pick the most frequent normalized response body.
    const frequency = new Map();
    for (const entry of successful) {
      const key = String(entry.content || '').trim().toLowerCase();
      if (!key) continue;
      const bucket = frequency.get(key) || { count: 0, sample: entry.content, agents: [] };
      bucket.count += 1;
      bucket.agents.push(entry.agentId);
      frequency.set(key, bucket);
    }

    let consensus = null;
    for (const bucket of frequency.values()) {
      if (!consensus || bucket.count > consensus.count) {
        consensus = bucket;
      }
    }

    return {
      success: successful.length > 0,
      mode: 'consensus',
      totalAgents: uniqueAgents.length,
      successCount: successful.length,
      failureCount: failed.length,
      responses: normalizedResponses,
      consensus: consensus
        ? {
          content: consensus.sample,
          count: consensus.count,
          agents: consensus.agents
        }
        : null
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
