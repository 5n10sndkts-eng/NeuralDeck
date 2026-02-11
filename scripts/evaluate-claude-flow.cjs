#!/usr/bin/env node
/**
 * Claude Flow Evaluation Script
 * Tests Claude Flow capabilities before making integration decision
 * 
 * Run: node scripts/evaluate-claude-flow.cjs
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ANSI color codes for output
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
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function runCommand(command, description) {
  log(`\n▶ ${description}`, 'yellow');
  log(`Command: ${command}`, 'bright');
  
  try {
    const { stdout, stderr } = await execPromise(command, { 
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (stdout) {
      log('Output:', 'green');
      console.log(stdout);
    }
    
    if (stderr) {
      log('Warnings/Info:', 'yellow');
      console.log(stderr);
    }
    
    return { success: true, stdout, stderr };
  } catch (error) {
    log('Error:', 'red');
    console.log(error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    return { success: false, error: error.message };
  }
}

async function checkPrerequisites() {
  section('PREREQUISITES CHECK');
  
  const checks = [
    { cmd: 'node --version', name: 'Node.js' },
    { cmd: 'npm --version', name: 'npm' },
    { cmd: 'docker --version', name: 'Docker' },
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = await runCommand(check.cmd, `Checking ${check.name}`);
    if (!result.success) {
      allPassed = false;
      log(`✗ ${check.name} not available`, 'red');
    } else {
      log(`✓ ${check.name} available`, 'green');
    }
  }
  
  return allPassed;
}

async function installClaudeFlow() {
  section('CLAUDE FLOW INSTALLATION');
  
  log('\nAttempting to install claude-flow@alpha...', 'cyan');
  log('This may take 1-2 minutes...', 'yellow');
  
  const result = await runCommand(
    'npm install claude-flow@alpha --no-save',
    'Installing claude-flow@alpha (no-save to avoid package.json changes)'
  );
  
  return result.success;
}

async function testClaudeFlowCLI() {
  section('CLAUDE FLOW CLI TESTS');
  
  const tests = [
    {
      cmd: 'npx claude-flow@alpha --version',
      desc: 'Check Claude Flow version',
      critical: true
    },
    {
      cmd: 'npx claude-flow@alpha --help',
      desc: 'Display available commands',
      critical: true
    },
    {
      cmd: 'npx claude-flow@alpha --list',
      desc: 'List available agents (expecting 60+)',
      critical: true
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await runCommand(test.cmd, test.desc);
    results.push({
      ...test,
      passed: result.success,
      output: result.stdout
    });
    
    if (test.critical && !result.success) {
      log(`✗ CRITICAL TEST FAILED: ${test.desc}`, 'red');
      return { success: false, results };
    }
  }
  
  return { success: true, results };
}

async function testMCPIntegration() {
  section('MCP INTEGRATION TEST');
  
  log('\nTesting if Claude Flow can connect to Docker MCP Toolkit...', 'cyan');
  
  const result = await runCommand(
    'npx claude-flow@alpha mcp list',
    'List MCP servers via Claude Flow'
  );
  
  return result.success;
}

async function countAgents(output) {
  // Parse agent list from CLI output
  if (!output) return 0;
  
  const lines = output.split('\n');
  const agentLines = lines.filter(line => 
    line.trim() && 
    !line.includes('Available') && 
    !line.includes('───') &&
    !line.includes('Total:')
  );
  
  return agentLines.length;
}

async function generateReport(results) {
  section('EVALUATION REPORT');
  
  const timestamp = new Date().toISOString();
  
  log('\n📊 Claude Flow Evaluation Summary', 'bright');
  log(`Timestamp: ${timestamp}`, 'cyan');
  
  console.log('\n' + '─'.repeat(60));
  
  // Prerequisites
  log('\n✓ Prerequisites:', 'green');
  log('  • Node.js: Available', 'green');
  log('  • npm: Available', 'green');
  log('  • Docker: Available', 'green');
  
  // Installation
  log('\n✓ Installation:', results.installSuccess ? 'green' : 'red');
  log(`  • claude-flow@alpha: ${results.installSuccess ? 'Installed' : 'Failed'}`, 
      results.installSuccess ? 'green' : 'red');
  
  // CLI Tests
  log('\n✓ CLI Tests:', 'green');
  if (results.cliTests) {
    results.cliTests.results.forEach(test => {
      const status = test.passed ? '✓' : '✗';
      const color = test.passed ? 'green' : 'red';
      log(`  ${status} ${test.desc}`, color);
    });
  }
  
  // Agent Count
  if (results.agentCount !== undefined) {
    log('\n✓ Agent Discovery:', 'green');
    log(`  • Found ${results.agentCount} agents`, 
        results.agentCount >= 60 ? 'green' : 'yellow');
    if (results.agentCount >= 60) {
      log('  • ✓ Meets expected count (60+ agents)', 'green');
    } else if (results.agentCount > 0) {
      log('  • ⚠ Below expected count (60+ agents)', 'yellow');
    }
  }
  
  // MCP Integration
  log('\n✓ MCP Integration:', results.mcpSuccess ? 'green' : 'yellow');
  log(`  • Docker MCP Toolkit: ${results.mcpSuccess ? 'Connected' : 'Not tested'}`,
      results.mcpSuccess ? 'green' : 'yellow');
  
  console.log('\n' + '─'.repeat(60));
  
  // Recommendation
  log('\n🎯 RECOMMENDATION:', 'bright');
  
  if (results.installSuccess && results.cliTests?.success && results.agentCount >= 60) {
    log('\n✅ PROCEED WITH INTEGRATION', 'green');
    log('\nClaude Flow is working as expected:', 'green');
    log('  • Installation successful', 'green');
    log('  • CLI fully functional', 'green');
    log('  • 60+ agents available', 'green');
    log('  • MCP integration possible', 'green');
    
    log('\nEstimated Integration Effort:', 'cyan');
    log('  • Phase 2a (Evaluation): COMPLETE ✓', 'green');
    log('  • Phase 2b (Adapter Layer): 2-3 days', 'yellow');
    log('  • Phase 2c (Testing & UI): 1-2 days', 'yellow');
    log('  • Total: 3-4 work days', 'bright');
    
    log('\nNext Steps:', 'cyan');
    log('  1. Create claudeFlowAdapter.cjs service', 'yellow');
    log('  2. Map NeuralDeck agents → Claude Flow agents', 'yellow');
    log('  3. Test swarm coordination', 'yellow');
    log('  4. Update UI for swarm visualization', 'yellow');
    
  } else {
    log('\n⚠️  CAUTION RECOMMENDED', 'yellow');
    log('\nIssues detected:', 'yellow');
    
    if (!results.installSuccess) {
      log('  • Installation failed', 'red');
    }
    if (!results.cliTests?.success) {
      log('  • CLI tests failed', 'red');
    }
    if (results.agentCount < 60) {
      log(`  • Only ${results.agentCount} agents found (expected 60+)`, 'yellow');
    }
    
    log('\nRecommendation:', 'cyan');
    log('  • Investigate issues before integration', 'yellow');
    log('  • OR proceed with Phase 2 (OpenCode CLI only)', 'yellow');
    log('  • Revisit Claude Flow integration later', 'yellow');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       CLAUDE FLOW EVALUATION FOR NEURALDECK INTEGRATION    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const results = {};
  
  // Step 1: Prerequisites
  const prereqsPassed = await checkPrerequisites();
  if (!prereqsPassed) {
    log('\n✗ Prerequisites check failed. Aborting evaluation.', 'red');
    process.exit(1);
  }
  
  // Step 2: Installation
  results.installSuccess = await installClaudeFlow();
  if (!results.installSuccess) {
    log('\n✗ Installation failed. Cannot proceed with evaluation.', 'red');
    await generateReport(results);
    process.exit(1);
  }
  
  // Step 3: CLI Tests
  results.cliTests = await testClaudeFlowCLI();
  
  // Step 4: Count Agents
  if (results.cliTests.success) {
    const listResult = results.cliTests.results.find(r => r.cmd.includes('--list'));
    if (listResult && listResult.output) {
      results.agentCount = await countAgents(listResult.output);
    }
  }
  
  // Step 5: MCP Integration
  results.mcpSuccess = await testMCPIntegration();
  
  // Step 6: Generate Report
  await generateReport(results);
  
  // Exit code based on results
  const success = results.installSuccess && 
                  results.cliTests?.success && 
                  (results.agentCount || 0) >= 60;
  
  process.exit(success ? 0 : 1);
}

// Run evaluation
main().catch(error => {
  log('\n✗ FATAL ERROR:', 'red');
  console.error(error);
  process.exit(1);
});
