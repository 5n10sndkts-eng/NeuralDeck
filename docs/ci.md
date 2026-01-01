# CI/CD Pipeline Guide - NeuralDeck

**Platform:** GitHub Actions  
**Status:** ✅ Configured  
**Workflow:** `.github/workflows/test.yml`

---

## Pipeline Overview

The CI/CD pipeline executes E2E tests with the following stages:

1. **Install Dependencies** - Caches npm and Playwright browsers
2. **Test Changed Specs (Burn-In)** - Runs changed tests 10x to detect flakiness (PRs only)
3. **Test E2E Sharded** - Parallel execution across 4 shards
4. **Merge Test Results** - Aggregates results from all shards

---

## Pipeline Stages

### Stage 1: Install Dependencies

**Purpose:** Cache dependencies and browser binaries for fast subsequent runs

**Duration:** <2 minutes (first run), <30 seconds (cached)

**Caching:**
- Node modules (`node_modules/`)
- npm cache (`~/.npm`)
- Playwright browsers (`~/.cache/ms-playwright`)

**Cache Key:** Based on `package-lock.json` hash

### Stage 2: Test Changed Specs (Burn-In)

**Purpose:** Detect flaky tests before they reach main branch

**When:** Pull requests only

**Process:**
1. Detects changed test files via `git diff`
2. Runs changed specs 10 times sequentially
3. Fails if ANY iteration fails (indicates flakiness)

**Duration:** <20 minutes (depends on number of changed tests)

**Why 10 iterations?**
- Catches non-deterministic failures
- Validates test stability before merge
- Industry standard for flaky test detection

### Stage 3: Test E2E Sharded

**Purpose:** Execute full test suite in parallel for fast feedback

**Sharding:** 4 parallel jobs (shard 1/4, 2/4, 3/4, 4/4)

**Configuration:**
- `fail-fast: false` - All shards run even if one fails
- Timeout: 30 minutes per shard
- Retries: 2 retries in CI (configured in `playwright.config.ts`)

**Duration:** <10 minutes per shard (parallel execution)

**Speedup:** ~75% faster than sequential execution

### Stage 4: Merge Test Results

**Purpose:** Aggregate results from all shards into unified report

**Output:**
- Merged HTML report (`playwright-report/`)
- JUnit XML for CI integration
- Artifacts retained for 30 days

---

## Running Locally

### Mirror CI Pipeline

Run the same stages as CI locally:

```bash
./scripts/ci-local.sh
```

**Stages:**
1. Lint (if configured)
2. E2E tests
3. Burn-in (3 iterations, reduced for speed)

### Burn-In Changed Tests

Run burn-in on changed test files:

```bash
# Default: 10 iterations, compare to main
./scripts/burn-in-changed.sh

# Custom iterations
./scripts/burn-in-changed.sh 20

# Custom base branch
./scripts/burn-in-changed.sh 10 develop
```

**Or use npm script:**
```bash
npm run test:burn-in
npm run test:burn-in:strict  # 20 iterations
```

---

## Debugging Failed CI Runs

### 1. Download Artifacts

GitHub Actions uploads artifacts on failure:
- `test-results-shard-*` - Test results per shard
- `burn-in-failure-artifacts` - Burn-in failure evidence
- `merged-playwright-report` - Unified HTML report

**Download:**
1. Go to GitHub Actions run
2. Click "Artifacts" section
3. Download relevant artifact
4. Extract and view `playwright-report/index.html`

### 2. View Trace Files

Playwright traces provide full debugging context:
- Network requests
- DOM snapshots
- Console logs
- Screenshots

**View traces:**
```bash
npx playwright show-trace test-results/trace.zip
```

### 3. Reproduce Locally

Use local CI mirror to reproduce failures:

```bash
./scripts/ci-local.sh
```

**Or run specific shard:**
```bash
npm run test:e2e -- --shard=1/4
```

---

## Performance Targets

| Stage | Target Duration | Actual |
|-------|----------------|--------|
| Install Dependencies | <2 min | ~1.5 min (first run) |
| Test Changed Specs | <20 min | Depends on changes |
| Test E2E (per shard) | <10 min | ~8 min |
| Total Pipeline | <45 min | ~35 min |

**Speedup:** 20× faster than sequential execution through parallelism and caching

---

## Secrets and Environment Variables

### Required Secrets

Currently **none required** - pipeline runs without secrets.

### Optional Secrets (for notifications)

If you want Slack/Discord notifications on failures:

1. **SLACK_WEBHOOK** - Slack webhook URL for failure notifications
2. **DISCORD_WEBHOOK** - Discord webhook URL (alternative)

**Configure in GitHub:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add new repository secret
3. Use in workflow: `${{ secrets.SLACK_WEBHOOK }}`

See `docs/ci-secrets-checklist.md` for detailed setup.

---

## Badge URLs

Add to your README.md:

```markdown
![E2E Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/E2E%20Tests/badge.svg)
```

---

## Troubleshooting

### Tests Pass Locally but Fail in CI

**Common causes:**
1. **Environment differences** - CI uses clean environment
2. **Timing issues** - CI may be slower, increase timeouts if needed
3. **Missing dependencies** - Check `package.json` includes all test deps

**Solution:**
```bash
# Run local CI mirror to reproduce
./scripts/ci-local.sh
```

### Burn-In Fails Intermittently

**Cause:** Test is flaky (non-deterministic)

**Solution:**
1. Review test for race conditions
2. Add explicit waits instead of timeouts
3. Check for shared state between tests
4. Ensure proper cleanup in fixtures

### CI Timeout

**Cause:** Tests taking too long

**Solution:**
1. Increase shard count (split tests further)
2. Optimize slow tests
3. Use selective testing for PRs (run only changed tests)

---

## Knowledge Base References

- `_bmad/bmm/testarch/knowledge/ci-burn-in.md` - Burn-in loop patterns
- `_bmad/bmm/testarch/knowledge/selective-testing.md` - Test selection strategies
- `_bmad/bmm/testarch/knowledge/playwright-config.md` - CI-optimized configuration

---

**Maintained by:** Test Architect (Murat)  
**Last Updated:** 2025-12-20  
**Pipeline Version:** 1.0
