#!/usr/bin/env node

/**
 * Verification Script
 * 
 * Runs comprehensive verification checks and generates reports.
 */

import { initializeQA } from '../src/verification/index.js';

console.log('🔍 NeuralDeck Verification');
console.log('============================\n');

const qa = initializeQA();

// Run verification
const report = await qa.runVerification();

console.log(`Overall Score: ${(report.overallScore * 100).toFixed(1)}%`);
console.log(`Threshold: ${(report.threshold * 100).toFixed(1)}%`);
console.log(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Duration: ${report.duration}ms\n`);

console.log('Verification Checks:');
console.log('--------------------');

for (const check of report.checks) {
  const icon = check.passed ? '✅' : '❌';
  const score = (check.score * 100).toFixed(1);
  console.log(`${icon} ${check.name} (${check.category}): ${score}%`);
  if (!check.passed) {
    console.log(`   ${check.message}`);
  }
}

console.log('\n============================');

// Exit with appropriate code
process.exit(report.passed ? 0 : 1);
