#!/usr/bin/env node
/**
 * Run V3 Swarm Performance Benchmarks
 *
 * Command-line tool for running and exporting benchmark results.
 */

const { runBenchmarkSuite, exportBenchmarkReport } = require('../src/services/swarmBenchmarks');

async function main() {
  const args = process.argv.slice(2);
  const iterations = parseInt(args[0]) || 100;
  const outputFile = args[1] || `.artifacts/benchmarks/v3-swarm-benchmark-${Date.now()}.json`;

  console.log(`\n🏃 V3 Swarm Performance Benchmarks`);
  console.log(`Iterations: ${iterations}`);
  console.log(`Output: ${outputFile}\n`);

  try {
    // Run benchmarks
    const suite = await runBenchmarkSuite(iterations);

    // Export results
    exportBenchmarkReport(suite, outputFile);

    // Exit with appropriate code
    const exitCode = suite.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

main();
