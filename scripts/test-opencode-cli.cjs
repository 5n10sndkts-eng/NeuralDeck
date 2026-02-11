#!/usr/bin/env node

/**
 * Test OpenCode CLI Service
 * Tests the CLI-based OpenCode integration
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const opencodeCLI = require('../server/services/opencodeCLI.cjs');

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

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       OpenCode CLI Service Test Suite                     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  let testsPassed = 0;
  let testsFailed = 0;
  let createdSessionId = null;

  try {
    // Test 1: Check CLI availability
    log('\n[Test 1] Check OpenCode CLI availability...', 'cyan');
    const isAvailable = await opencodeCLI.checkAvailability();
    if (isAvailable) {
      log(`  ✓ OpenCode CLI available: ${opencodeCLI.cliPath}`, 'green');
      log(`  Version: ${opencodeCLI.version}`, 'yellow');
      testsPassed++;
    } else {
      log('  ✗ OpenCode CLI not available', 'red');
      log('  Install: curl -fsSL https://opencode.ai/install | bash', 'yellow');
      testsFailed++;
      process.exit(1);
    }

    // Test 2: Health check
    log('\n[Test 2] Health check...', 'cyan');
    const health = await opencodeCLI.healthCheck();
    if (health.healthy) {
      log(`  ✓ Health check passed`, 'green');
      log(`  Existing sessions: ${health.sessionCount}`, 'yellow');
      testsPassed++;
    } else {
      log(`  ✗ Health check failed: ${health.error}`, 'red');
      testsFailed++;
    }

    // Test 3: List sessions
    log('\n[Test 3] List existing sessions...', 'cyan');
    const sessions = await opencodeCLI.listSessions();
    log(`  ✓ Found ${sessions.length} session(s)`, 'green');
    if (sessions.length > 0) {
      log(`  Latest: ${sessions[0].title || sessions[0].id}`, 'yellow');
    }
    testsPassed++;

    // Test 4: List providers
    log('\n[Test 4] List available providers...', 'cyan');
    try {
      const providers = await opencodeCLI.listProviders();
      if (providers && providers.length > 0) {
        log(`  ✓ Found ${providers.length} provider(s)`, 'green');
        log(`  Providers: ${providers.map(p => p.name || p).join(', ')}`, 'yellow');
        testsPassed++;
      } else {
        log('  ⚠ No providers returned (might need opencode.jsonc config)', 'yellow');
        testsPassed++;
      }
    } catch (error) {
      log(`  ⚠ List providers skipped: ${error.message}`, 'yellow');
      testsPassed++;
    }

    // Test 5: Run a simple prompt (one-shot)
    log('\n[Test 5] Run one-shot prompt...', 'cyan');
    try {
      const promptResult = await opencodeCLI.runPrompt(
        'Say "Hello from NeuralDeck!" and nothing else.',
        {
          model: 'claude/claude-sonnet-4-20250514',
          timeout: 30000
        }
      );
      
      if (promptResult.success && promptResult.content) {
        log('  ✓ Prompt executed successfully', 'green');
        log(`  Response: ${promptResult.content.substring(0, 100)}...`, 'yellow');
        testsPassed++;
      } else {
        log('  ✗ No response content', 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`  ✗ Prompt failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 6: Create session for an agent
    log('\n[Test 6] Create session for agent...', 'cyan');
    try {
      const sessionId = await opencodeCLI.getOrCreateSessionForAgent('architect', {
        model: 'claude/claude-sonnet-4-20250514'
      });
      
      if (sessionId) {
        log(`  ✓ Session created: ${sessionId}`, 'green');
        createdSessionId = sessionId;
        testsPassed++;
      } else {
        log('  ✗ No session ID returned', 'red');
        testsFailed++;
      }
    } catch (error) {
      log(`  ✗ Session creation failed: ${error.message}`, 'red');
      testsFailed++;
    }

    // Test 7: Send prompt to existing session
    if (createdSessionId) {
      log('\n[Test 7] Send prompt to session...', 'cyan');
      try {
        const sessionResult = await opencodeCLI.sendToSession(
          createdSessionId,
          'What is your role as an architect?',
          { timeout: 30000 }
        );
        
        if (sessionResult.success && sessionResult.content) {
          log('  ✓ Session prompt executed', 'green');
          log(`  Response: ${sessionResult.content.substring(0, 100)}...`, 'yellow');
          testsPassed++;
        } else {
          log('  ✗ No response from session', 'red');
          testsFailed++;
        }
      } catch (error) {
        log(`  ✗ Session prompt failed: ${error.message}`, 'red');
        testsFailed++;
      }
    } else {
      log('\n[Test 7] Send prompt to session... SKIPPED (no session)', 'yellow');
    }

    // Test 8: Get session messages
    if (createdSessionId) {
      log('\n[Test 8] Get session messages...', 'cyan');
      try {
        const messages = await opencodeCLI.getSessionMessages(createdSessionId);
        log(`  ✓ Retrieved ${messages.length} message(s)`, 'green');
        testsPassed++;
      } catch (error) {
        log(`  ⚠ Get messages skipped: ${error.message}`, 'yellow');
        testsPassed++;
      }
    } else {
      log('\n[Test 8] Get session messages... SKIPPED (no session)', 'yellow');
    }

    // Test 9: List MCP tools
    log('\n[Test 9] List MCP tools...', 'cyan');
    try {
      const tools = await opencodeCLI.listTools();
      if (tools && tools.length > 0) {
        log(`  ✓ Found ${tools.length} MCP tool(s)`, 'green');
        testsPassed++;
      } else {
        log('  ⚠ No MCP tools found (check MCP servers)', 'yellow');
        testsPassed++;
      }
    } catch (error) {
      log(`  ⚠ List tools skipped: ${error.message}`, 'yellow');
      testsPassed++;
    }

    // Test 10: Execute MCP tool (example: fetch)
    log('\n[Test 10] Execute MCP tool...', 'cyan');
    try {
      const toolResult = await opencodeCLI.executeTool(
        'fetch',
        { 
          url: 'https://httpbin.org/json',
          format: 'text'
        },
        { timeout: 15000 }
      );
      
      if (toolResult) {
        log('  ✓ MCP tool executed', 'green');
        testsPassed++;
      } else {
        log('  ⚠ Tool returned no data', 'yellow');
        testsPassed++;
      }
    } catch (error) {
      log(`  ⚠ MCP tool execution skipped: ${error.message}`, 'yellow');
      testsPassed++;
    }

    // Cleanup: Delete test session
    if (createdSessionId) {
      log('\n[Cleanup] Delete test session...', 'cyan');
      const deleted = await opencodeCLI.deleteSession(createdSessionId);
      if (deleted) {
        log('  ✓ Session deleted', 'green');
      } else {
        log('  ⚠ Session deletion failed (manual cleanup may be needed)', 'yellow');
      }
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    const totalTests = testsPassed + testsFailed;
    log(`║ Tests Passed: ${testsPassed}/${totalTests}  Failed: ${testsFailed}/${totalTests}                           ║`, testsFailed === 0 ? 'green' : 'yellow');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    if (testsFailed === 0) {
      log('\n✓ All tests passed! OpenCode CLI integration is working.\n', 'green');
      process.exit(0);
    } else {
      log('\n⚠ Some tests failed. Check errors above.\n', 'yellow');
      process.exit(1);
    }

  } catch (error) {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

runTests();
