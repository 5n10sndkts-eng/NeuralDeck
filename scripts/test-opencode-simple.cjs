#!/usr/bin/env node

/**
 * Simple OpenCode SDK Connection Test
 * Tests basic connectivity and session creation
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testOpenCode() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       OpenCode SDK Simple Connection Test                 ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const baseUrlCandidates = Array.from(
    new Set(
      [
        process.env.OPENCODE_URL,
        process.env.VITE_OPENCODE_URL,
        'http://127.0.0.1:4096',
        'http://localhost:4096'
      ].filter(Boolean)
    )
  );
  let baseUrl = baseUrlCandidates[0];
  log(`\nOpenCode URL candidates: ${baseUrlCandidates.join(', ')}\n`, 'yellow');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Load SDK
    log('[Test 1] Load OpenCode SDK...', 'cyan');
    const sdk = await import('@opencode-ai/sdk');
    log('  ✓ SDK loaded', 'green');
    testsPassed++;

    // Test 2: Create client
    log('\n[Test 2] Create client...', 'cyan');
    let client = null;
    let connected = false;
    let lastError = null;

    for (const candidateUrl of baseUrlCandidates) {
      const candidateClient = sdk.createOpencodeClient({
        baseUrl: candidateUrl,
        directory: process.env.OPENCODE_PROJECT_PATH || process.cwd()
      });
      try {
        await candidateClient.path.get();
        client = candidateClient;
        baseUrl = candidateUrl;
        connected = true;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!connected || !client) {
      throw lastError || new Error('No OpenCode endpoint responded');
    }

    log(`  ✓ Client created and connected (${baseUrl})`, 'green');
    testsPassed++;

    // Test 3: Get config
    log('\n[Test 3] Get OpenCode config...', 'cyan');
    try {
      const configResult = await client.config.get();
      if (configResult.data) {
        log(`  ✓ Config retrieved`, 'green');
        log(`  Providers: ${Object.keys(configResult.data.providers || {}).join(', ') || 'none'}`, 'yellow');
        testsPassed++;
      } else {
        log('  ✗ No config data returned', 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`  ✗ Config failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 4: List sessions
    log('\n[Test 4] List existing sessions...', 'cyan');
    try {
      const sessionsResult = await client.session.list();
      const sessionCount = sessionsResult.data?.length || 0;
      log(`  ✓ Found ${sessionCount} session(s)`, 'green');
      testsPassed++;
    } catch (error) {
      log(`  ✗ List sessions failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 5: Create a test session
    log('\n[Test 5] Create test session...', 'cyan');
    try {
      const createResult = await client.session.create({
        body: {
          title: 'NeuralDeck Test Session',
          provider: 'claude',
          model: 'claude-sonnet-4-20250514'
        }
      });

      if (createResult.data && createResult.data.id) {
        log(`  ✓ Session created: ${createResult.data.id}`, 'green');
        testsPassed++;

        // Test 6: Delete the test session
        log('\n[Test 6] Clean up test session...', 'cyan');
        try {
          await client.session.delete({
            path: {
              id: createResult.data.id
            }
          });
          log('  ✓ Session deleted', 'green');
          testsPassed++;
        } catch (error) {
          log(`  ⚠ Delete failed: ${error.message}`, 'yellow');
          testsFailed++;
        }
      } else {
        log('  ✗ No session ID returned', 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`  ✗ Create session failed: ${error.message}`, 'red');
      log(`  Error details: ${JSON.stringify(error.response?.data || error)}`, 'yellow');
      testsFailed++;
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log(`║ Tests Passed: ${testsPassed}/6  Failed: ${testsFailed}/6                           ║`, testsPassed === 6 ? 'green' : 'yellow');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    process.exit(testsFailed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

testOpenCode();
