import * as fsPromises from 'fs/promises';

jest.mock('../../server/services/opencodeCLI.cjs', () => ({
  sendToNeuralDeckAgent: jest.fn()
}));
jest.mock('../../server/services/openCodeAdapter.cjs', () => ({
  initialize: jest.fn(),
  sendPrompt: jest.fn()
}));

const providerAdapter = require('../../server/services/providerAdapter.cjs');
const openCodeService = require('../../server/services/opencodeCLI.cjs');
const openCodeAdapter = require('../../server/services/openCodeAdapter.cjs');

describe('ProviderAdapter OpenCode routing', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    providerAdapter.routingConfig = null;
    providerAdapter.useOpenCodeSDK = false;
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
    expect(result.metadata.transport).toBe('cli');
  });

  it('[P0] routeToAgent uses SDK when enabled and available', async () => {
    providerAdapter.useOpenCodeSDK = true;
    providerAdapter.routingConfig = {
      fallback_enabled: true,
      rules: {
        opencode_agents: ['architect'],
        opencode_timeout_ms: 120000
      }
    };

    openCodeAdapter.initialize.mockResolvedValue({ success: true });
    openCodeAdapter.sendPrompt.mockResolvedValue({
      success: true,
      sessionId: 'sdk-session',
      response: { content: 'sdk-result' }
    });

    const result = await providerAdapter.routeToAgent('prompt', 'architect');

    expect(result.success).toBe(true);
    expect(result.routing).toBe('opencode');
    expect(result.content).toBe('sdk-result');
    expect(result.metadata.transport).toBe('sdk');
    expect(openCodeService.sendToNeuralDeckAgent).not.toHaveBeenCalled();
  });

  it('[P0] routeToAgent falls back from SDK to CLI when SDK fails', async () => {
    providerAdapter.useOpenCodeSDK = true;
    providerAdapter.routingConfig = {
      fallback_enabled: true,
      rules: {
        opencode_agents: ['architect'],
        opencode_timeout_ms: 120000
      }
    };

    openCodeAdapter.initialize.mockResolvedValue({ success: false, error: 'Unauthorized' });
    openCodeService.sendToNeuralDeckAgent.mockResolvedValue({
      content: 'cli-result',
      opencodeAgent: 'plan',
      sessionId: 'cli-session',
      cachedSession: true
    });

    const result = await providerAdapter.routeToAgent('prompt', 'architect');

    expect(result.success).toBe(true);
    expect(result.routing).toBe('opencode');
    expect(result.content).toBe('cli-result');
    expect(result.metadata.transport).toBe('cli');
    expect(result.metadata.sdkFallbackReason).toContain('Unauthorized');
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

  it('[P1] routeSwarm broadcast aggregates responses', async () => {
    jest.spyOn(providerAdapter, 'routeToAgent')
      .mockResolvedValueOnce({ success: true, content: 'A', provider: 'opencode' })
      .mockResolvedValueOnce({ success: false, error: 'failed', provider: 'opencode' });

    const result = await providerAdapter.routeSwarm('prompt', ['architect', 'qa_engineer'], {
      mode: 'broadcast'
    });

    expect(result.mode).toBe('broadcast');
    expect(result.totalAgents).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.responses).toHaveLength(2);
  });

  it('[P1] routeSwarm consensus returns best-effort consensus', async () => {
    jest.spyOn(providerAdapter, 'routeToAgent')
      .mockResolvedValueOnce({ success: true, content: 'same output', provider: 'opencode' })
      .mockResolvedValueOnce({ success: true, content: 'same output', provider: 'opencode' })
      .mockResolvedValueOnce({ success: true, content: 'different output', provider: 'opencode' });

    const result = await providerAdapter.routeSwarm('prompt', ['architect', 'qa_engineer', 'devops'], {
      mode: 'consensus'
    });

    expect(result.mode).toBe('consensus');
    expect(result.success).toBe(true);
    expect(result.consensus).toBeTruthy();
    expect(result.consensus.count).toBe(2);
    expect(result.consensus.content).toBe('same output');
  });
});
