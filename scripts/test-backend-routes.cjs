#!/usr/bin/env node
/**
 * Phase 1 verification script for OpenCode backend routes.
 *
 * Validates:
 * - GET /api/opencode/health
 * - GET /api/opencode/agents
 * - GET /api/opencode/sessions
 * - POST /api/opencode/prompt
 * - POST /api/opencode/cache-session
 */

const BASE_URL = process.env.NEURALDECK_API_URL || 'http://localhost:3001';

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

async function callRoute(token, method, path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

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
  const checks = [];
  const token = await getAuthToken();

  checks.push({
    name: 'GET /api/opencode/health',
    result: await callRoute(token, 'GET', '/api/opencode/health')
  });

  checks.push({
    name: 'GET /api/opencode/agents',
    result: await callRoute(token, 'GET', '/api/opencode/agents')
  });

  checks.push({
    name: 'GET /api/opencode/sessions',
    result: await callRoute(token, 'GET', '/api/opencode/sessions')
  });

  checks.push({
    name: 'POST /api/opencode/prompt',
    result: await callRoute(token, 'POST', '/api/opencode/prompt', {
      agentId: 'architect',
      prompt: 'Return one short sentence describing your role.',
      options: { timeout: 20000 }
    })
  });

  checks.push({
    name: 'POST /api/opencode/cache-session',
    result: await callRoute(token, 'POST', '/api/opencode/cache-session', {
      agentId: 'architect',
      sessionId: `phase1-test-${Date.now()}`
    })
  });

  console.log('\nOpenCode Backend Route Test Results\n');
  let passed = 0;

  for (const check of checks) {
    const mark = check.result.ok ? 'PASS' : 'FAIL';
    if (check.result.ok) passed += 1;
    console.log(`${mark} ${check.name} (${check.result.status})`);
    if (!check.result.ok) {
      console.log(`  Error: ${JSON.stringify(check.result.payload)}`);
    }
  }

  console.log(`\nSummary: ${passed}/${checks.length} routes passed\n`);

  process.exit(passed === checks.length ? 0 : 1);
}

run().catch((error) => {
  console.error('Test script failed:', error.message);
  process.exit(1);
});
