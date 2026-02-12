#!/usr/bin/env node
/**
 * Phase 1 verification script for OpenCode backend routes.
 *
 * Validates:
 * - GET /api/opencode/health
 * - GET /api/opencode/agents
 * - GET /api/opencode/sessions
 * - POST /api/opencode/prompt
 * - POST /api/opencode/swarm
 * - POST /api/opencode/cache-session
 */

const { spawn } = require('child_process');
const path = require('path');

const USE_EXTERNAL_SERVER = process.env.NEURALDECK_USE_EXTERNAL_SERVER === '1';
const TEST_PORT = parseInt(process.env.NEURALDECK_TEST_PORT || '3012', 10);
const BASE_URL = USE_EXTERNAL_SERVER
  ? (process.env.NEURALDECK_API_URL || 'http://localhost:3001')
  : `http://127.0.0.1:${TEST_PORT}`;

let serverProcess = null;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerHealthy() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerHealthy()) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Server did not become healthy within ${timeoutMs}ms at ${BASE_URL}`);
}

async function ensureServer() {
  if (USE_EXTERNAL_SERVER) return;

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

async function cleanupServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await sleep(300);
  }
}

async function getAuthToken() {
  const response = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'phase1-tester' })
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

async function callRoute(token, method, path, body, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    return {
      ok: false,
      status: 408,
      payload: {
        error: error?.name === 'AbortError' ? 'Request timed out' : 'Request failed',
        message: error?.message || 'Unknown error'
      }
    };
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { raw: await response.text() };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

async function run() {
  await ensureServer();

  const checks = [];
  const token = await getAuthToken();

  checks.push({
    name: 'GET /api/opencode/health',
    result: await callRoute(token, 'GET', '/api/opencode/health'),
    validate: (result) => ({
      pass: result.payload?.success === true && typeof result.payload?.healthy === 'boolean',
      reason: result.payload?.error || 'Health payload missing success/healthy fields'
    })
  });

  checks.push({
    name: 'GET /api/opencode/agents',
    result: await callRoute(token, 'GET', '/api/opencode/agents'),
    validate: (result) => ({
      pass: result.payload?.success === true && !!result.payload?.mappings,
      reason: result.payload?.error || 'Agent mappings missing from response'
    })
  });

  checks.push({
    name: 'GET /api/opencode/sessions',
    result: await callRoute(token, 'GET', '/api/opencode/sessions'),
    validate: (result) => ({
      pass: result.payload?.success === true && Array.isArray(result.payload?.sessions),
      reason: result.payload?.error || 'Sessions response missing session array'
    })
  });

  checks.push({
    name: 'POST /api/opencode/prompt',
    result: await callRoute(token, 'POST', '/api/opencode/prompt', {
      agentId: 'developer',
      prompt: 'Return one short sentence describing your role.',
      options: { timeout: 20000 }
    }, 35000),
    validate: (result) => ({
      pass: result.payload?.success === true
        && result.payload?.result?.success === true
        && String(result.payload?.result?.content || '').trim().length > 0,
      reason: result.payload?.error
        || result.payload?.result?.error
        || 'Prompt response returned empty content'
    })
  });

  checks.push({
    name: 'POST /api/opencode/swarm',
    result: await callRoute(token, 'POST', '/api/opencode/swarm', {
      agentIds: ['developer', 'architect'],
      prompt: 'Return one short sentence describing current status.',
      options: { mode: 'broadcast', timeout: 12000 }
    }, 120000),
    validate: (result) => ({
      pass: result.payload?.success === true
        && result.payload?.result?.success === true
        && (result.payload?.result?.successCount || 0) > 0,
      reason: result.payload?.error
        || result.payload?.result?.error
        || 'Swarm response has zero successful agents'
    })
  });

  checks.push({
    name: 'POST /api/opencode/cache-session',
    result: await callRoute(token, 'POST', '/api/opencode/cache-session', {
      agentId: 'architect',
      sessionId: `phase1-test-${Date.now()}`
    }),
    validate: (result) => ({
      pass: result.payload?.success === true,
      reason: result.payload?.error || 'Cache session response did not succeed'
    })
  });

  console.log('\nOpenCode Backend Route Test Results\n');
  let passed = 0;

  for (const check of checks) {
    const transportPass = check.result.ok;
    const validation = check.validate
      ? check.validate(check.result)
      : { pass: true, reason: null };
    const passedCheck = transportPass && validation.pass;
    const mark = passedCheck ? 'PASS' : 'FAIL';
    if (passedCheck) passed += 1;
    console.log(`${mark} ${check.name} (${check.result.status})`);
    if (!transportPass) {
      console.log(`  Error: ${JSON.stringify(check.result.payload)}`);
    } else if (!validation.pass) {
      console.log(`  Error: ${validation.reason}`);
      if (check.result.payload?.result?.responses) {
        const failed = check.result.payload.result.responses
          .filter((entry) => !entry.success)
          .map((entry) => ({
            agentId: entry.agentId,
            provider: entry.provider,
            error: entry.error || entry.fallbackReason || 'Unknown failure'
          }));
        if (failed.length) {
          console.log(`  Failed agents: ${JSON.stringify(failed)}`);
        }
      }
    }
  }

  console.log(`\nSummary: ${passed}/${checks.length} routes passed\n`);

  await cleanupServer();
  process.exit(passed === checks.length ? 0 : 1);
}

run().catch((error) => {
  cleanupServer().catch(() => {});
  console.error('Test script failed:', error.message);
  process.exit(1);
});
