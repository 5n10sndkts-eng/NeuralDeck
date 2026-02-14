#!/usr/bin/env node

/**
 * V3 Integration Initialization Script
 * 
 * Sets up the V3 Deep Integration adapter layer and prepares for migration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 NeuralDeck V3 Integration Initialization');
console.log('==============================================\n');

// Check if v3-integration.json exists
const configPath = path.join(process.cwd(), 'v3-integration.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ v3-integration.json not found. Please ensure you are in the project root.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('Configuration loaded:');
console.log(`  Phase: ${config.v3Integration.phases.find(p => p.status === 'in-progress')?.name || 'Unknown'}`);
console.log(`  Target: ${config.v3Integration.targetCodeReduction.from} → ${config.v3Integration.targetCodeReduction.to} lines`);
console.log(`  Reduction: ${config.v3Integration.targetCodeReduction.reduction}\n`);

// Check v3-integration directory
const integrationDir = path.join(process.cwd(), 'src', 'v3-integration');
if (!fs.existsSync(integrationDir)) {
  console.error('❌ src/v3-integration directory not found.');
  process.exit(1);
}

console.log('✅ V3 integration directory exists\n');

// Verify key files exist
const requiredFiles = [
  'index.ts',
  'README.md'
];

console.log('Checking required files:');
let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(integrationDir, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing.');
  process.exit(1);
}

console.log('\n✅ All required files present\n');

// Check systems to migrate
console.log('Systems to migrate:');
config.v3Integration.systemsToMigrate.forEach(system => {
  console.log(`  • ${system.name} (${system.lines} lines) → ${system.replacement}`);
});

console.log('\nFeatures to integrate:');
config.v3Integration.featuresToIntegrate.forEach(feature => {
  console.log(`  • ${feature.name}: ${feature.status}`);
});

console.log('\n==============================================');
console.log('✅ V3 Integration initialization complete!');
console.log('');
console.log('Next steps:');
console.log('  1. Review v3-integration/README.md');
console.log('  2. Import V3 adapters in your code');
console.log('  3. Run: npm run v3:integration:adapter');
console.log('  4. Start migration when ready');
console.log('==============================================');
