#!/usr/bin/env node
/**
 * OpenCode Adapter Test Suite
 * Tests the new SDK-based OpenCode integration
 * 
 * Run: node scripts/test-opencode-adapter.cjs
 */

const openCodeAdapter = require('../server/services/openCodeAdapter.cjs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

function test(name, status = 'pending') {
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '○';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  log(`${icon} ${name}`, color);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          OPENCODE SDK ADAPTER TEST SUITE FOR NEURALDECK           ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝', 'cyan');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Initialization
  section('TEST 1: Adapter Initialization');
  try {
    const initResult = await openCodeAdapter.initialize({
      workspaceRoot: path.resolve(__dirname, '..')
    });
    
    console.log('Init Result:', JSON.stringify(initResult, null, 2));
    
    if (initResult.success) {
      test('Initialize OpenCode adapter', 'pass');
      log(`  Mode: ${initResult.mode}`, 'green');
      log(`  URL: ${initResult.url}`, 'green');
      if (initResult.project) {
        log(`  Project: ${initResult.project.name || 'NeuralDeck'}`, 'green');
      }
      results.passed++;
    } else {
      test('Initialize OpenCode adapter', 'fail');
      log(`  Error: ${initResult.error}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('Initialize OpenCode adapter', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 2: Health Check
  section('TEST 2: Health Check');
  try {
    const health = await openCodeAdapter.healthCheck();
    console.log('Health:', JSON.stringify(health, null, 2));
    
    if (health.healthy) {
      test('Health check', 'pass');
      log(`  Status: ${health.status}`, 'green');
      log(`  Active sessions: ${health.sessions}`, 'green');
      results.passed++;
    } else {
      test('Health check', 'fail');
      log(`  Status: ${health.status}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('Health check', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 3: Get Providers
  section('TEST 3: Get Available Providers');
  try {
    const providers = await openCodeAdapter.getProviders();
    
    if (providers.success) {
      test('Get providers', 'pass');
      const providerList = providers.providers || [];
      log(`  Found ${providerList.length} providers`, 'green');
      
      if (providerList.length > 0) {
        log('\n  Available providers:', 'cyan');
        providerList.slice(0, 5).forEach(p => {
          log(`    - ${p.id}: ${(p.models || []).length} models`, 'yellow');
        });
        if (providerList.length > 5) {
          log(`    ... and ${providerList.length - 5} more`, 'yellow');
        }
      }
      results.passed++;
    } else {
      test('Get providers', 'fail');
      log(`  Error: ${providers.error}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('Get providers', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 4: Create Session for Developer Agent
  section('TEST 4: Create Session for Developer Agent');
  let devSessionId = null;
  try {
    const session = await openCodeAdapter.getOrCreateSession('developer');
    
    if (session.sessionId) {
      test('Create developer session', 'pass');
      devSessionId = session.sessionId;
      log(`  Session ID: ${session.sessionId}`, 'green');
      log(`  Exists: ${session.exists}`, 'yellow');
      results.passed++;
    } else {
      test('Create developer session', 'fail');
      results.failed++;
    }
  } catch (error) {
    test('Create developer session', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 5: Send Prompt to Developer Agent
  section('TEST 5: Send Prompt to Developer Agent');
  try {
    const prompt = 'What files are in the current project? Give me a brief summary.';
    log(`\nPrompt: "${prompt}"`, 'cyan');
    log('\nWaiting for response...', 'yellow');
    
    const response = await openCodeAdapter.sendPrompt('developer', prompt, {
      execute: true
    });
    
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (response.success) {
      test('Send prompt to developer', 'pass');
      log(`  Message ID: ${response.messageId}`, 'green');
      log(`  Session ID: ${response.sessionId}`, 'green');
      
      if (response.response && response.response.content) {
        log('\n  Response preview:', 'cyan');
        const preview = response.response.content.substring(0, 200);
        log(`  ${preview}...`, 'yellow');
      }
      results.passed++;
    } else {
      test('Send prompt to developer', 'fail');
      log(`  Error: ${response.error}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('Send prompt to developer', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 6: Get Session Messages
  section('TEST 6: Get Session Messages');
  try {
    const messages = await openCodeAdapter.getSessionMessages('developer', {
      limit: 10
    });
    
    if (messages.success) {
      test('Get session messages', 'pass');
      log(`  Message count: ${messages.messages.length}`, 'green');
      
      if (messages.messages.length > 0) {
        log('\n  Recent messages:', 'cyan');
        messages.messages.slice(0, 3).forEach((msg, idx) => {
          const preview = (msg.content || '').substring(0, 60);
          log(`    ${idx + 1}. ${msg.role}: ${preview}...`, 'yellow');
        });
      }
      results.passed++;
    } else {
      test('Get session messages', 'fail');
      log(`  Error: ${messages.error}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('Get session messages', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 7: List All Sessions
  section('TEST 7: List All Sessions');
  try {
    const sessionList = await openCodeAdapter.listSessions();
    
    if (sessionList.success) {
      test('List all sessions', 'pass');
      log(`  Total sessions: ${sessionList.sessions.length}`, 'green');
      log(`  Active agents: ${sessionList.activeAgents.join(', ')}`, 'green');
      results.passed++;
    } else {
      test('List all sessions', 'fail');
      log(`  Error: ${sessionList.error}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('List all sessions', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 8: Create Sessions for Multiple Agents
  section('TEST 8: Create Sessions for Multiple Agents');
  const testAgents = ['architect', 'qa_engineer', 'security_auditor'];
  let multiAgentSuccess = true;
  
  for (const agentId of testAgents) {
    try {
      const session = await openCodeAdapter.getOrCreateSession(agentId);
      if (session.sessionId) {
        log(`  ✓ ${agentId}: ${session.sessionId}`, 'green');
      } else {
        log(`  ✗ ${agentId}: Failed`, 'red');
        multiAgentSuccess = false;
      }
    } catch (error) {
      log(`  ✗ ${agentId}: ${error.message}`, 'red');
      multiAgentSuccess = false;
    }
  }
  
  if (multiAgentSuccess) {
    test('Create multi-agent sessions', 'pass');
    results.passed++;
  } else {
    test('Create multi-agent sessions', 'fail');
    results.failed++;
  }
  results.total++;

  // Test 9: Async Prompt
  section('TEST 9: Send Async Prompt');
  try {
    const asyncResponse = await openCodeAdapter.sendPromptAsync('qa_engineer', 
      'What testing frameworks are used in this project?'
    );
    
    if (asyncResponse.success) {
      test('Send async prompt', 'pass');
      log(`  Status: ${asyncResponse.status}`, 'green');
      log(`  Message ID: ${asyncResponse.messageId}`, 'green');
      results.passed++;
    } else {
      test('Send async prompt', 'fail');
      log(`  Error: ${asyncResponse.error}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('Send async prompt', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Test 10: Get Session Status
  section('TEST 10: Get Session Status');
  try {
    const status = await openCodeAdapter.getSessionStatus('developer');
    
    if (status.success) {
      test('Get session status', 'pass');
      console.log('  Status:', JSON.stringify(status.status, null, 2));
      results.passed++;
    } else {
      test('Get session status', 'fail');
      log(`  Error: ${status.error}`, 'red');
      results.failed++;
    }
  } catch (error) {
    test('Get session status', 'fail');
    log(`  Exception: ${error.message}`, 'red');
    results.failed++;
  }
  results.total++;

  // Cleanup
  section('CLEANUP');
  log('\nCleaning up test sessions...', 'yellow');
  
  // Note: We don't delete sessions in cleanup to allow inspection
  // Uncomment if you want automatic cleanup:
  // await openCodeAdapter.shutdown();

  // Summary
  section('TEST SUMMARY');
  log('\n📊 Results:', 'bright');
  log(`  Total: ${results.total}`, 'cyan');
  log(`  Passed: ${results.passed}`, 'green');
  log(`  Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`  Pass Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.passed === results.total ? 'green' : 'yellow');

  const grade = results.passed / results.total >= 0.9 ? 'A' : 
                results.passed / results.total >= 0.8 ? 'B+' :
                results.passed / results.total >= 0.7 ? 'B' :
                results.passed / results.total >= 0.6 ? 'C' : 'F';
  
  log(`  Grade: ${grade}`, grade === 'A' || grade === 'B+' ? 'green' : 'yellow');

  console.log('\n' + '='.repeat(70) + '\n');

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  log('\n✗ FATAL ERROR:', 'red');
  console.error(error);
  process.exit(1);
});
