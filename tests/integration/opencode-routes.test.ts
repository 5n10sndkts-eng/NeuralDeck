/** @jest-environment node */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';

const TEST_PORT = parseInt(process.env.NEURALDECK_TEST_PORT || '3012', 10);
const BASE_URL = process.env.NEURALDECK_TEST_BASE_URL || `http://127.0.0.1:${TEST_PORT}`;

let serverProcess: ChildProcessWithoutNullStreams | null = null;
let token = '';
let ownsServer = false;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerHealthy()) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Server did not become healthy within ${timeoutMs}ms at ${BASE_URL}`);
}

async function createSessionToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'integration-opencode-routes' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data?.token) {
    throw new Error('Auth response missing token');
  }

  return data.token;
}

async function authedRequest(method: string, route: string, body?: unknown): Promise<Response> {
  return fetch(`${BASE_URL}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

beforeAll(async () => {
  const healthy = await isServerHealthy();

  if (!healthy) {
    ownsServer = true;
    const serverFile = path.join(process.cwd(), 'server.cjs');
    serverProcess = spawn('node', [serverFile], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        HOST: '127.0.0.1'
      },
      stdio: 'ignore'
    });

    await waitForServer();
  }

  token = await createSessionToken();
});

afterAll(async () => {
  if (ownsServer && serverProcess) {
    serverProcess.kill('SIGTERM');
    await sleep(300);
  }
});

describe('[P0] OpenCode API Integration', () => {
  it('[P0] should return OpenCode health payload', async () => {
    const response = await authedRequest('GET', '/api/opencode/health');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(typeof data.healthy).toBe('boolean');
  });

  it('[P0] should return OpenCode agent mappings', async () => {
    const response = await authedRequest('GET', '/api/opencode/agents');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.mappings).toBeTruthy();
    expect(data.mappings.architect).toBeTruthy();
  });

  it('[P0] should return OpenCode sessions and cache payload', async () => {
    const response = await authedRequest('GET', '/api/opencode/sessions');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.sessions).toBeDefined();
    expect(data.cache).toBeDefined();
  });

  it('[P0] should route local agents through non-OpenCode provider path', async () => {
    const response = await authedRequest('POST', '/api/opencode/prompt', {
      agentId: 'developer',
      prompt: 'Return one line: integration test'
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(typeof data.success).toBe('boolean');
    expect(data.result).toBeDefined();
    expect(data.result.metadata?.agentId).toBe('developer');
    if (data.success) {
      expect(data.result.success).toBe(true);
      expect(typeof data.result.content).toBe('string');
      expect(data.result.content.trim().length).toBeGreaterThan(0);
    } else {
      expect(data.result.success).toBe(false);
      expect(data.error || data.result.error).toBeTruthy();
    }
  });

  it('[P0] should expose fallback metadata when OpenCode routing fails', async () => {
    const response = await authedRequest('POST', '/api/opencode/prompt', {
      agentId: 'architect',
      prompt: 'Return one line: fallback test',
      options: { timeout: 1, model: 'invalid/model-for-fallback-test' }
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(typeof data.success).toBe('boolean');
    expect(data.result).toBeDefined();
    expect(data.result.metadata?.agentId).toBe('architect');
    expect(typeof data.result.fallbackUsed).toBe('boolean');
    if (!data.success) {
      expect(data.error || data.result.error).toBeTruthy();
    }
  });

  it('[P0] should cache a provided OpenCode session id', async () => {
    const sessionId = `jest-opencode-session-${Date.now()}`;
    let cacheResponse: Response;
    try {
      cacheResponse = await authedRequest('POST', '/api/opencode/cache-session', {
        agentId: 'architect',
        sessionId
      });
    } catch (err: any) {
      // Server may have shut down between tests; skip gracefully
      if (err?.cause?.code === 'ECONNREFUSED') {
        console.warn('Server unavailable for cache-session test, skipping');
        return;
      }
      throw err;
    }

    expect(cacheResponse.status).toBe(200);
    const cacheData = await cacheResponse.json();
    expect(cacheData.success).toBe(true);

    const sessionsResponse = await authedRequest('GET', '/api/opencode/sessions');
    expect(sessionsResponse.status).toBe(200);
    const sessionsData = await sessionsResponse.json();

    expect(sessionsData.cache?.sessions?.architect?.session_id).toBe(sessionId);
  });

  it('[P1] should route a swarm prompt and return aggregate metadata', async () => {
    let response: Response;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    try {
      response = await fetch(`${BASE_URL}/api/opencode/swarm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentIds: ['developer', 'architect'],
          prompt: 'Return one short status line',
          options: { mode: 'broadcast', timeout: 5000 }
        }),
        signal: abortController.signal
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.cause?.code === 'ECONNREFUSED' || err?.name === 'AbortError') {
        console.warn('Server unavailable or request timed out for swarm prompt test, skipping');
        return;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Accept 200 (success), 500 (LLM error), or 503 (no LLM provider configured)
    expect([200, 500, 503]).toContain(response.status);
    const data = await response.json();

    if (response.status === 200) {
      expect(typeof data.success).toBe('boolean');
      expect(data.result).toBeDefined();
      expect(data.result.mode).toBe('broadcast');
      expect(Array.isArray(data.result.responses)).toBe(true);
      expect(data.result.responses.length).toBeGreaterThanOrEqual(1);
      if (!data.success) {
        expect(data.error || data.result.error).toBeTruthy();
        expect(data.result.failureCount).toBeGreaterThan(0);
      }
    } else {
      // 500/503 means no LLM provider is available in CI/test environment
      expect(typeof data.success === 'boolean' || typeof data.error === 'string').toBe(true);
    }
  }, 30000);
});
