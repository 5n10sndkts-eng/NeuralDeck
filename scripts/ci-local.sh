#!/bin/bash
# Local CI Pipeline Mirror
# 
# Runs the same stages as CI locally for debugging
# Usage: ./scripts/ci-local.sh
#
# Reference: _bmad/bmm/testarch/knowledge/ci-burn-in.md

set -e  # Exit on error

echo "🔍 Running CI pipeline locally..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stage 1: Lint (if configured)
if grep -q '"lint"' package.json; then
  echo "📝 Stage 1: Lint"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  npm run lint || {
    echo "❌ Lint failed"
    exit 1
  }
  echo "✅ Lint passed"
  echo ""
else
  echo "⏭️  Stage 1: Lint (skipped - no lint script)"
  echo ""
fi

# Stage 2: E2E Tests
echo "🧪 Stage 2: E2E Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run test:e2e || {
  echo "❌ E2E tests failed"
  exit 1
}
echo "✅ E2E tests passed"
echo ""

# Stage 3: Burn-in (reduced iterations for local)
echo "🔥 Stage 3: Burn-in (3 iterations)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for i in {1..3}; do
  echo "🔄 Burn-in iteration $i/3"
  npm run test:e2e || {
    echo "❌ Burn-in failed on iteration $i"
    exit 1
  }
done
echo "✅ Burn-in passed (3/3)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Local CI pipeline passed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
