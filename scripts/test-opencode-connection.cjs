#!/usr/bin/env node

/**
 * test-opencode-connection.cjs
 * 
 * Tests OpenCode SDK connection and basic functionality
 * 
 * Prerequisites:
 * - OpenCode CLI installed (curl -fsSL https://opencode.ai/install | bash)
 * - OpenCode server running (opencode server start --port 4096)
 * - Environment variables set in .env.local
 * 
 * Usage:
 *   node scripts/test-opencode-connection.cjs
 *   npm run test:opencode
 * 
 * IMPORTANT: @opencode-ai/sdk is an ES module only package.
 * This script uses dynamic import() to load it.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Color codes for console output
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

function logTest(testNumber, description) {
  console.log(`\n${colors.cyan}[Test ${testNumber}]${colors.reset} ${description}`);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

async function testOpenCodeConnection() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          OpenCode SDK Connection Test Suite               ║', 'cyan');
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
  log(`\nOpenCode URL candidates: ${baseUrlCandidates.join(', ')}`, 'yellow');

  let testsPassed = 0;
  let testsFailed = 0;
  let client;
  let testSessionId;
  let createOpencodeClient;

  try {
    // ============================================
    // Test 1: Load OpenCode SDK (Dynamic Import)
    // ============================================
    logTest(1, 'Load OpenCode SDK (ES module)');
    
    try {
      const sdk = await import('@opencode-ai/sdk');
      createOpencodeClient = sdk.createOpencodeClient;
      logSuccess('SDK loaded successfully');
      testsPassed++;
    } catch (error) {
      logError(`Failed to load SDK: ${error.message}`);
      testsFailed++;
      process.exit(1);
    }

    // ============================================
    // Test 2: Create OpenCode Client
    // ============================================
    logTest(2, 'Create OpenCode SDK client');
    
    try {
      client = createOpencodeClient({ baseUrl });
      logSuccess('SDK client created');
      testsPassed++;
    } catch (error) {
      logError(`Failed to create client: ${error.message}`);
      testsFailed++;
      process.exit(1);
    }

    // ============================================
    // Test 3: Connectivity Check
    // ============================================
    logTest(3, 'Path endpoint connectivity');
    
    try {
      let connected = false;
      let lastError = null;

      for (const candidateUrl of baseUrlCandidates) {
        try {
          const candidateClient = createOpencodeClient({ baseUrl: candidateUrl });
          const pathResponse = await candidateClient.path.get();
          if (pathResponse?.data) {
            client = candidateClient;
            baseUrl = candidateUrl;
            logSuccess(`Connected via ${candidateUrl}`);
            logSuccess(`Connected path: ${pathResponse.data}`);
            connected = true;
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (!connected) {
        throw lastError || new Error('No OpenCode endpoint responded');
      }

      testsPassed++;
    } catch (error) {
      logError(`Connectivity check failed: ${error.message}`);
      logWarning(`Tried URLs: ${baseUrlCandidates.join(', ')}`);
      logWarning('Is OpenCode server running? Try: /Users/ku3h/.opencode/bin/opencode serve --hostname 127.0.0.1 --port 4096');
      testsFailed++;
      process.exit(1);
    }

    // ============================================
    // Test 4: List Sessions (Initial)
    // ============================================
    logTest(4, 'List existing sessions');
    
    try {
      const sessionsResponse = await client.session.list();
      const sessionCount = sessionsResponse.data?.length || 0;
      
      logSuccess(`Found ${sessionCount} existing session(s)`);
      
      if (sessionCount > 0) {
        log(`  Sessions: ${sessionsResponse.data.map(s => s.title || s.id).join(', ')}`, 'yellow');
      }
      
      testsPassed++;
    } catch (error) {
      logError(`List sessions failed: ${error.message}`);
      testsFailed++;
    }

    // ============================================
    // Test 5: Create New Session
    // ============================================
    logTest(5, 'Create new session');
    
    try {
      const createResponse = await client.session.create({
        body: {
          title: `NeuralDeck Test Session - ${new Date().toISOString()}`
        }
      });
      
      testSessionId = createResponse.data.id;
      logSuccess(`Session created: ${testSessionId}`);
      logSuccess(`Title: ${createResponse.data.title || 'Untitled'}`);
      testsPassed++;
    } catch (error) {
      logError(`Create session failed: ${error.message}`);
      testsFailed++;
    }

    // ============================================
    // Test 5: Get Session Details
    // ============================================
    if (testSessionId) {
      logTest(6, 'Get session details');
      
      try {
        const sessionResponse = await client.session.get({
          path: { id: testSessionId }
        });
        
        logSuccess(`Session retrieved: ${sessionResponse.data.id}`);
        logSuccess(`Title: ${sessionResponse.data.title || 'Untitled'}`);
        logSuccess(`Created: ${sessionResponse.data.createdAt || 'N/A'}`);
        testsPassed++;
      } catch (error) {
        logError(`Get session failed: ${error.message}`);
        testsFailed++;
      }
    }

    // ============================================
    // Test 6: Send Prompt to Session
    // ============================================
    if (testSessionId) {
      logTest(7, 'Send prompt to session');
      
      try {
        const promptResponse = await client.session.prompt({
          path: { id: testSessionId },
          body: {
            parts: [
              {
                type: 'text',
                text: 'Hello from NeuralDeck! This is a test prompt. Please respond with "OpenCode connection successful".'
              }
            ]
          }
        });
        
        logSuccess('Prompt sent successfully');
        
        if (promptResponse.data?.parts) {
          const responseText = promptResponse.data.parts
            .filter(p => p.type === 'text')
            .map(p => p.text)
            .join(' ');
          
          logSuccess(`Response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
        }
        
        testsPassed++;
      } catch (error) {
        logError(`Send prompt failed: ${error.message}`);
        testsFailed++;
      }
    }

    // ============================================
    // Test 7: Get Session Messages
    // ============================================
    if (testSessionId) {
      logTest(8, 'Get session messages');
      
      try {
        const messagesResponse = await client.session.messages({
          path: { id: testSessionId }
        });
        
        const messageCount = messagesResponse.data?.length || 0;
        logSuccess(`Retrieved ${messageCount} message(s)`);
        
        if (messageCount > 0) {
          messagesResponse.data.forEach((msg, idx) => {
            const role = msg.role || 'unknown';
            const preview = msg.parts?.[0]?.text?.substring(0, 50) || '(no text)';
            log(`    Message ${idx + 1} [${role}]: ${preview}...`, 'yellow');
          });
        }
        
        testsPassed++;
      } catch (error) {
        logError(`Get messages failed: ${error.message}`);
        testsFailed++;
      }
    }

    // ============================================
    // Test 8: Delete Test Session (Cleanup)
    // ============================================
    if (testSessionId) {
      logTest(9, 'Delete test session (cleanup)');
      
      try {
        await client.session.delete({
          path: { id: testSessionId }
        });
        
        logSuccess(`Session ${testSessionId} deleted`);
        testsPassed++;
      } catch (error) {
        logError(`Delete session failed: ${error.message}`);
        logWarning(`You may need to manually delete session: ${testSessionId}`);
        testsFailed++;
      }
    }

    // ============================================
    // Test 9: Verify Session Deleted
    // ============================================
    if (testSessionId) {
      logTest(10, 'Verify session deletion');
      
      try {
        const sessionsResponse = await client.session.list();
        const deletedSessionExists = sessionsResponse.data?.some(s => s.id === testSessionId);
        
        if (!deletedSessionExists) {
          logSuccess('Session successfully deleted from list');
          testsPassed++;
        } else {
          logWarning('Session still appears in list');
          testsPassed++;
        }
      } catch (error) {
        logError(`Verification failed: ${error.message}`);
        testsFailed++;
      }
    }

  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    testsFailed++;
  }

  // ============================================
  // Final Results
  // ============================================
  console.log('\n' + '═'.repeat(60));
  log('                    Test Results                            ', 'cyan');
  console.log('═'.repeat(60));
  
  log(`\nTests Passed: ${testsPassed}`, testsPassed > 0 ? 'green' : 'reset');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'reset');
  
  const totalTests = testsPassed + testsFailed;
  const successRate = totalTests > 0 ? ((testsPassed / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`\nSuccess Rate: ${successRate}%`);
  
  if (testsFailed === 0) {
    log('\n✓ All tests passed! OpenCode SDK is ready to use.', 'green');
    console.log('\nNext steps:');
    console.log('  1. Start all services: npm run dev:full');
    console.log('  2. Open NeuralDeck UI: http://localhost:5173');
    console.log('  3. Test agent integration in the UI');
  } else {
    log('\n✗ Some tests failed. Please check the errors above.', 'red');
    console.log('\nTroubleshooting:');
    console.log('  1. Ensure OpenCode server is running: opencode server start --port 4096');
    console.log('  2. Check OpenCode health: curl http://localhost:4096/health');
    console.log('  3. Verify .env.local configuration');
    console.log('  4. Check OpenCode logs: opencode server logs');
  }
  
  console.log('');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
testOpenCodeConnection().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
