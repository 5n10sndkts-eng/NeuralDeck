# NeuralDeck Verification & Quality Assurance

Comprehensive quality assurance system for NeuralDeck providing truth scoring, automated verification, and automatic rollback capabilities.

## Overview

The Verification & QA system ensures code quality and correctness through:

- **Truth Scoring** (0.0-1.0): Real-time reliability metrics for code, agents, and tasks
- **Verification Checks**: Automated validation of correctness, security, performance, style, and documentation
- **Automatic Rollback**: Instant reversion of changes that fail verification (default threshold: 0.95)
- **CI/CD Integration**: Export capabilities for continuous integration pipelines
- **Real-time Monitoring**: Live dashboards and watch modes for ongoing verification

## Features

### 1. Truth Scoring System

Track quality and reliability metrics across your codebase:

```typescript
import { initializeQA, getQA } from './verification';

// Initialize QA system
const qa = initializeQA({
  truthThreshold: 0.95,
  verificationThreshold: 0.95,
  autoRollback: true
});

// Record task completion quality
qa.recordTaskCompletion('task-123', 'coder-agent', true, 0.98);

// Get quality metrics
const metrics = qa.truthScoring.getMetrics('src/components');
console.log(`Overall score: ${metrics.overall}`);
console.log(`Trend: ${metrics.trend}`);
```

### 2. Automated Verification

Run comprehensive verification checks:

```typescript
// Run all verification checks
const report = await qa.runVerification();

if (report.passed) {
  console.log('✅ All checks passed');
} else {
  console.log('❌ Some checks failed:');
  for (const check of report.checks) {
    if (!check.passed) {
      console.log(`  - ${check.name}: ${check.message}`);
    }
  }
}

// Verify specific files
const fileReport = await qa.runVerification(['src/App.tsx', 'src/services/api.ts']);
```

### 3. Quality Gates

Check if code meets quality standards:

```typescript
const quality = await qa.checkQuality(['src/components']);

if (!quality.passed) {
  console.log('Issues found:');
  for (const issue of quality.issues) {
    console.log(`  - ${issue}`);
  }
}
```

### 4. Automatic Rollback

Create snapshots before changes and rollback if needed:

```typescript
// Create snapshot before making changes
const snapshotId = await qa.snapshot(['src/services/api.ts']);

// Make changes...

// Verify changes
const quality = await qa.checkQuality();

// Auto-rollback if quality check fails
if (!quality.passed && qa.config.autoRollback) {
  await qa.rollback.rollbackToLastGood();
}
```

### 5. Dashboard Data

Get quality dashboard data:

```typescript
const dashboard = qa.getDashboardData();

console.log(`
Quality Dashboard
=================
Truth Score: ${dashboard.truth.overall.toFixed(3)}
Trend: ${dashboard.truth.trend}
Issues: ${dashboard.issues.belowThreshold} components below threshold
Rollbacks: ${dashboard.rollbacks.total} total
`);
```

## Verification Categories

The system checks five quality categories:

1. **Correctness** (25%)
   - TypeScript compilation
   - Type safety
   - Logic validation

2. **Security** (25%)
   - Dangerous patterns (eval, innerHTML)
   - Hardcoded secrets
   - Vulnerability scanning

3. **Performance** (20%)
   - Anti-pattern detection
   - Algorithmic complexity
   - Memory usage patterns

4. **Style** (15%)
   - Code formatting
   - Naming conventions
   - Best practices

5. **Documentation** (15%)
   - JSDoc coverage
   - README completeness
   - Code comments

## CI/CD Integration

### GitHub Actions

```yaml
name: Quality Verification
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Verification
        run: |
          node scripts/verify.js
          
      - name: Check Quality Gates
        run: |
          node scripts/check-quality.js
          if [ $? -ne 0 ]; then
            echo "Quality gates failed"
            exit 1
          fi
```

### Export Metrics

```typescript
// Export for CI/CD systems
const ciMetrics = qa.exportForCI();
fs.writeFileSync('verification-metrics.json', JSON.stringify(ciMetrics, null, 2));
```

## Configuration

### Default Configuration

```typescript
const qa = initializeQA({
  truthThreshold: 0.95,        // Minimum truth score (0.0-1.0)
  verificationThreshold: 0.95,  // Minimum verification score (0.0-1.0)
  autoRollback: true,          // Enable automatic rollback
  enableDashboard: true        // Enable dashboard monitoring
});
```

### Custom Verification Checks

```typescript
import { VerificationSystem } from './verification';

const verification = new VerificationSystem();

// Register custom check
verification.registerCheck({
  name: 'Custom Pattern Check',
  category: 'style',
  weight: 0.1,
  check: async () => {
    // Your custom validation logic
    const passed = await validateCustomPattern();
    
    return {
      passed,
      score: passed ? 1.0 : 0.0,
      message: passed ? 'Custom pattern valid' : 'Custom pattern violation detected'
    };
  }
});
```

## Truth Score Interpretation

- **1.0-0.95**: Excellent ⭐ (production-ready)
- **0.94-0.85**: Good ✅ (acceptable quality)
- **0.84-0.75**: Warning ⚠️ (needs attention)
- **<0.75**: Critical ❌ (requires immediate action)

## Scripts

### Available Scripts

```bash
# Run verification
npm run verify

# Check quality gates
npm run verify:check

# Generate dashboard data
npm run verify:dashboard

# Export CI metrics
npm run verify:ci

# Watch mode (continuous monitoring)
npm run verify:watch
```

## Best Practices

1. **Set Appropriate Thresholds**
   - Use 0.99 for critical production code
   - Use 0.95 for standard code
   - Use 0.90 for experimental features

2. **Enable Auto-Rollback**
   - Prevents bad code from persisting
   - Maintains codebase quality
   - Automatic recovery

3. **Monitor Trends**
   - Track improvement over time
   - Not just current scores
   - Identify regressions early

4. **Integrate with CI/CD**
   - Make verification part of pipeline
   - Block merges on quality failures
   - Automated quality gates

5. **Use Watch Mode**
   - Get immediate feedback
   - During development
   - Continuous quality monitoring

## Troubleshooting

### Low Truth Scores

```typescript
// Get detailed breakdown
const metrics = qa.truthScoring.getMetrics('src/components');
console.log('Mean:', metrics.mean);
console.log('Standard Deviation:', metrics.standardDeviation);
console.log('Samples:', metrics.samples.length);
```

### Rollback Failures

```typescript
// View rollback history
const history = qa.rollback.getHistory();
for (const snapshot of history) {
  console.log(`${snapshot.id}: ${snapshot.verificationReport.passed ? '✅' : '❌'}`);
}
```

### Verification Timeouts

```typescript
// Verify specific files only
const report = await qa.runVerification(['src/critical-file.ts']);
```

## API Reference

See `src/verification/index.ts` for complete API documentation.

### Key Classes

- `QualityAssuranceManager` - Main QA system coordinator
- `TruthScoringSystem` - Truth scoring and metrics
- `VerificationSystem` - Automated verification checks
- `RollbackSystem` - Snapshot and rollback management

### Key Interfaces

- `TruthScore` - Individual truth score record
- `TruthMetrics` - Aggregated truth metrics
- `VerificationReport` - Complete verification results
- `RollbackSnapshot` - Rollback point data

## Integration with V3

The Verification & QA system integrates with V3 Deep Integration:

```typescript
import { initializeV3Integration } from './v3-integration';
import { initializeQA } from './verification';

// Initialize both systems
const v3 = await initializeV3Integration();
const qa = initializeQA();

// Use V3 features with quality tracking
const result = await v3.swarm.coordinateNeuralDeckSwarm({
  agents: [...],
  tasks: [...]
});

// Record quality of swarm execution
qa.recordTaskCompletion('swarm-task', 'v3-swarm', result.success, result.quality);
```

## Contributing

When adding verification checks:
1. Register in `VerificationSystem.registerDefaultChecks()`
2. Assign appropriate category and weight
3. Ensure check is fast (<100ms)
4. Add tests for the check
5. Document in this README

## Related Documentation

- [V3 Integration](../v3-integration/README.md)
- [Automated Code Review](../.github/AUTO_REVIEW_README.md)
- [Project Contributing Guide](../CONTRIBUTING.md)

---

**Version**: 1.0.0  
**Last Updated**: 2025-02-15  
**Maintainer**: NeuralDeck Team
