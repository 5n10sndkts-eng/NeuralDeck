import * as fs from 'fs';

const opencodeCLI = require('../../server/services/opencodeCLI.cjs');

describe('OpenCodeCLIService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    opencodeCLI.sessionCache = new Map();
    opencodeCLI._agentMappings = null;
    opencodeCLI._agentMappingsLoadedAt = 0;
    opencodeCLI.agentMappingsPath = '/tmp/agent-mappings.json';
    opencodeCLI.sessionCachePath = '/tmp/session-cache.json';
  });

  it('[P0] getAgentMapping returns mapped agent', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        mappings: {
          architect: {
            opencode_agent: 'plan',
            routing: 'opencode',
            session_required: true
          }
        }
      })
    );

    const mapping = opencodeCLI.getAgentMapping('architect');
    expect(mapping).toBeTruthy();
    expect(mapping.opencode_agent).toBe('plan');
  });

  it('[P0] getCachedSessionId returns cached in-memory session', () => {
    opencodeCLI.sessionCache.set('architect', 'session-123');
    expect(opencodeCLI.getCachedSessionId('architect')).toBe('session-123');
  });

  it('[P0] _loadSessionCache returns default when file missing', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const cache = opencodeCLI._loadSessionCache();
    expect(cache.sessions).toEqual({});
  });

  it('[P0] cacheSessionId writes session metadata', () => {
    jest.spyOn(opencodeCLI, 'getAgentMapping').mockReturnValue({
      opencode_agent: 'plan',
      type: 'built-in'
    });
    jest.spyOn(opencodeCLI, '_loadSessionCache').mockReturnValue({
      version: '1.0.0',
      sessions: {}
    });
    const saveSpy = jest.spyOn(opencodeCLI, '_saveSessionCache').mockImplementation(() => {});

    const ok = opencodeCLI.cacheSessionId('architect', 'session-abc');

    expect(ok).toBe(true);
    expect(opencodeCLI.sessionCache.get('architect')).toBe('session-abc');
    expect(saveSpy).toHaveBeenCalled();
  });

  it('[P0] sendToNeuralDeckAgent uses cached session when required', async () => {
    jest.spyOn(opencodeCLI, 'getAgentMapping').mockReturnValue({
      opencode_agent: 'plan',
      routing: 'opencode',
      session_required: true,
      type: 'built-in'
    });
    jest.spyOn(opencodeCLI, 'getCachedSessionId').mockReturnValue('session-001');
    jest.spyOn(opencodeCLI, 'sendToSession').mockResolvedValue({
      success: true,
      content: 'ok',
      sessionId: 'session-001'
    });

    const result = await opencodeCLI.sendToNeuralDeckAgent('architect', 'hello');

    expect(result.success).toBe(true);
    expect(result.routing).toBe('opencode');
    expect(result.cachedSession).toBe(true);
    expect(result.opencodeAgent).toBe('plan');
  });

  it('[P1] sendToNeuralDeckAgent creates session when cache missing', async () => {
    jest.spyOn(opencodeCLI, 'getAgentMapping').mockReturnValue({
      opencode_agent: 'plan',
      routing: 'opencode',
      session_required: true,
      type: 'built-in'
    });
    jest.spyOn(opencodeCLI, 'getCachedSessionId').mockReturnValue(null);
    jest.spyOn(opencodeCLI, 'createSession').mockResolvedValue({ id: 'session-new' });
    const cacheSpy = jest.spyOn(opencodeCLI, 'cacheSessionId').mockReturnValue(true);
    jest.spyOn(opencodeCLI, 'sendToSession').mockResolvedValue({
      success: true,
      content: 'created',
      sessionId: 'session-new'
    });

    const result = await opencodeCLI.sendToNeuralDeckAgent('architect', 'hello');

    expect(result.success).toBe(true);
    expect(cacheSpy).toHaveBeenCalledWith(
      'architect',
      'session-new',
      expect.objectContaining({ opencodeAgent: 'plan', type: 'built-in' })
    );
  });

  it('[P0] sendToNeuralDeckAgent uses runPrompt when session not required', async () => {
    jest.spyOn(opencodeCLI, 'getAgentMapping').mockReturnValue({
      opencode_agent: 'qa-engineer',
      routing: 'opencode',
      session_required: false,
      type: 'custom'
    });
    jest.spyOn(opencodeCLI, 'runPrompt').mockResolvedValue({
      success: true,
      content: 'prompt-ok',
      model: 'm'
    });

    const result = await opencodeCLI.sendToNeuralDeckAgent('qa_engineer', 'test');

    expect(result.success).toBe(true);
    expect(result.cachedSession).toBe(false);
  });

  it('[P0] sendToNeuralDeckAgent rejects unknown mapping', async () => {
    jest.spyOn(opencodeCLI, 'getAgentMapping').mockReturnValue(null);
    await expect(opencodeCLI.sendToNeuralDeckAgent('unknown', 'x')).rejects.toThrow('No mapping found');
  });

  it('[P0] sendToNeuralDeckAgent rejects local-routed agent', async () => {
    jest.spyOn(opencodeCLI, 'getAgentMapping').mockReturnValue({
      routing: 'local',
      opencode_agent: 'build'
    });
    await expect(opencodeCLI.sendToNeuralDeckAgent('developer', 'x')).rejects.toThrow('mapped to local routing');
  });
});
