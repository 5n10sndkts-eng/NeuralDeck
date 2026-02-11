#!/usr/bin/env node
/**
 * Setup Script: Create OpenCode Sessions for NeuralDeck Agents
 * 
 * Purpose: Interactive script to help create OpenCode sessions for all 13 agents
 * Saves session IDs to .neuraldeck/session-cache.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const OPENCODE_CLI = '/Applications/OpenCode.app/Contents/MacOS/opencode-cli';
const SESSION_CACHE_PATH = path.join(__dirname, '..', '.neuraldeck', 'session-cache.json');
const AGENT_MAPPINGS_PATH = path.join(__dirname, '..', '.neuraldeck', 'agent-mappings.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 NeuralDeck OpenCode Session Setup\n');
console.log('=' .repeat(60));

// Load configurations
let agentMappings, sessionCache;

try {
  agentMappings = JSON.parse(fs.readFileSync(AGENT_MAPPINGS_PATH, 'utf-8'));
  sessionCache = JSON.parse(fs.readFileSync(SESSION_CACHE_PATH, 'utf-8'));
} catch (e) {
  console.error('❌ Error loading configuration files:', e.message);
  process.exit(1);
}

// Get OpenCode-routed agents
const openCodeAgents = Object.entries(agentMappings.mappings)
  .filter(([_, mapping]) => mapping.routing === 'opencode')
  .map(([neuraldeckId, mapping]) => ({
    neuraldeckId,
    opencodeAgent: mapping.opencode_agent,
    description: mapping.description,
    type: mapping.type
  }));

console.log(`\nFound ${openCodeAgents.length} agents requiring OpenCode sessions:\n`);

openCodeAgents.forEach((agent, idx) => {
  console.log(`${idx + 1}. ${agent.neuraldeckId} → ${agent.opencodeAgent} (${agent.type})`);
  console.log(`   ${agent.description}`);
});

console.log('\n' + '='.repeat(60));
console.log('\nThis script will guide you through creating OpenCode sessions.');
console.log('For each agent, you will need to:');
console.log('  1. Create a session using OpenCode CLI');
console.log('  2. Copy the session ID');
console.log('  3. Paste it here to save to cache\n');

console.log('Commands you\'ll use:');
console.log(`  opencode session create --agent <agent-name>`);
console.log(`  opencode session list\n`);

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupSessions() {
  for (const agent of openCodeAgents) {
    console.log('\n' + '-'.repeat(60));
    console.log(`\n📝 Setting up: ${agent.neuraldeckId}`);
    console.log(`   OpenCode agent: ${agent.opencodeAgent}`);
    console.log(`   Description: ${agent.description}\n`);

    // Check if session already exists
    if (sessionCache.sessions[agent.neuraldeckId]) {
      console.log(`⚠️  Session already exists: ${sessionCache.sessions[agent.neuraldeckId].session_id}`);
      const overwrite = await askQuestion('   Overwrite? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('   ⏭️  Skipped');
        continue;
      }
    }

    console.log(`\n1. Run this command in another terminal:`);
    console.log(`   ${OPENCODE_CLI} session create --agent ${agent.opencodeAgent}\n`);
    
    const sessionId = await askQuestion('2. Enter the session ID (or "skip" to skip): ');
    
    if (sessionId.toLowerCase() === 'skip') {
      console.log('   ⏭️  Skipped');
      continue;
    }

    if (!sessionId || sessionId.trim().length === 0) {
      console.log('   ❌ Invalid session ID, skipping...');
      continue;
    }

    // Save to cache
    sessionCache.sessions[agent.neuraldeckId] = {
      session_id: sessionId.trim(),
      opencode_agent: agent.opencodeAgent,
      created_at: new Date().toISOString(),
      type: agent.type
    };

    sessionCache.last_updated = new Date().toISOString();

    // Write to file
    fs.writeFileSync(
      SESSION_CACHE_PATH,
      JSON.stringify(sessionCache, null, 2),
      'utf-8'
    );

    console.log(`   ✅ Saved session: ${sessionId.trim()}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Session Setup Summary:\n');

  const totalAgents = openCodeAgents.length;
  const configuredAgents = Object.keys(sessionCache.sessions).length;

  console.log(`   Total OpenCode agents: ${totalAgents}`);
  console.log(`   Configured sessions: ${configuredAgents}`);
  console.log(`   Missing sessions: ${totalAgents - configuredAgents}\n`);

  if (configuredAgents === totalAgents) {
    console.log('✅ All sessions configured!\n');
  } else {
    console.log('⚠️  Some sessions not configured. You can run this script again later.\n');
  }

  console.log('Session cache saved to: .neuraldeck/session-cache.json\n');
  console.log('Next steps:');
  console.log('  1. Verify sessions: opencode session list');
  console.log('  2. Test a session: opencode session prompt <session-id> "Hello"');
  console.log('  3. Proceed to Phase 1: Backend Integration\n');

  rl.close();
}

// Check OpenCode CLI is available
try {
  execSync(`"${OPENCODE_CLI}" --version`, { encoding: 'utf-8' });
} catch (e) {
  console.error('❌ OpenCode CLI not found or not accessible');
  console.error('   Expected path:', OPENCODE_CLI);
  process.exit(1);
}

// Start interactive setup
(async () => {
  const proceed = await askQuestion('\nReady to begin? (y/n): ');
  if (proceed.toLowerCase() === 'y') {
    await setupSessions();
  } else {
    console.log('\nSetup cancelled.');
    rl.close();
  }
})();
