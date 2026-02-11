import fsPromises from 'fs/promises';

jest.mock('../../server/services/opencodeCLI.cjs', () => ({
  sendToNeuralDeckAgent: jest.fn()
}));

const providerAdapter = require('../../server/services/providerAdapter.cjs');
const openCodeService = require('../../server/services/opencodeCLI.cjs');

describe('ProviderAdapter OpenCode routing', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    providerAdapter.routingConfig = null;
  });

  it('[P0] shouldUseOpenCode returns true when agent is in opencode list', async () => {
    providerAdapter.routingConfig = {
      rules: {
        opencode_agents: ['architect']
      }
    };

    const result = await providerAdapter.shouldUseOpenCode('architect');
    expect(result).toBe(true);
  });

  it('[P0] loadRoutingConfig falls back to defaults when file missing', async () => {
    jest.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('ENOENT'));

    const config = await providerAdapter.loadRoutingConfig();
    expect(config.rules.opencode_timeout_ms).toBe(120000);
    expect(config.fallback_enabled).toBe(true);
  });

  it('[P0] routeToAgent routes to OpenCode on configured agent', async () => {
    providerAdapter.routingConfig = {
      fallback_enabled: true,
      fallback_notify_ui: true,
      rules: {
        opencode_agents: ['architect'],
        opencode_timeout_ms: 120000
      }
    };

    openCodeService.sendToNeuralDeckAgent.mockResolvedValue({
      content: 'openCode-result',
      opencodeAgent: 'plan',
      sessionId: 's1',
      cachedSession: true,
      model: 'claude/claude-sonnet-4-20250514'
    });

    const result = await providerAdapter.routeToAgent('prompt', 'architect');

    expect(result.success).toBe(true);
    expect(result.routing).toBe('opencode');
    expect(result.content).toBe('openCode-result');
    expect(result.metadata.opencodeAgent).toBe('plan');
  });

  it('[P0] routeToAgent falls back to local provider when OpenCode fails', async () => {
    providerAdapter.routingConfig = {
      fallback_enabled: true,
      fallback_notify_ui: true,
      rules: {
        opencode_agents: ['architect'],
        local_agents: ['developer']
      }
    };

    openCodeService.sendToNeuralDeckAgent.mockRejectedValue(new Error('OpenCode down'));
    jest.spyOn(providerAdapter, 'routePrompt').mockResolvedValue({
      success: true,
      provider: 'ollama',
      model: 'deepseek-coder:33b',
      response: 'fallback-response'
    });

    const result = await providerAdapter.routeToAgent('prompt', 'architect');

    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(result.provider).toBe('ollama');
    expect(result.content).toBe('fallback-response');
    expect(result.notifyUI).toBe(true);
  });

  it('[P0] routeToAgent uses local route for non-opencode agents', async () => {
    providerAdapter.routingConfig = {
      fallback_enabled: true,
      rules: {
        opencode_agents: ['architect'],
        local_agents: ['developer']
      }
    };

    jest.spyOn(providerAdapter, 'routePrompt').mockResolvedValue({
      success: true,
      provider: 'claude',
      model: 'sonnet',
      response: 'local-path'
    });

    const result = await providerAdapter.routeToAgent('prompt', 'developer');

    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(result.provider).toBe('claude');
    expect(result.content).toBe('local-path');
  });

  it('[P1] routeToAgent returns error if OpenCode fails and fallback disabled', async () => {
    providerAdapter.routingConfig = {
      fallback_enabled: false,
      rules: {
        opencode_agents: ['architect']
      }
    };

    openCodeService.sendToNeuralDeckAgent.mockRejectedValue(new Error('hard failure'));

    const result = await providerAdapter.routeToAgent('prompt', 'architect');

    expect(result.success).toBe(false);
    expect(result.provider).toBe('opencode');
    expect(result.fallbackUsed).toBe(false);
    expect(result.error).toContain('hard failure');
  });
});
