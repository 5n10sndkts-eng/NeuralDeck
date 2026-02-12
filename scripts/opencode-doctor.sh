#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"

ok=0
warn=0
fail=0

check_ok() {
  echo "  [OK]   $1"
  ok=$((ok + 1))
}

check_warn() {
  echo "  [WARN] $1"
  warn=$((warn + 1))
}

check_fail() {
  echo "  [FAIL] $1"
  fail=$((fail + 1))
}

echo "[opencode-doctor] NeuralDeck OpenCode environment checks"
echo

if command -v node >/dev/null 2>&1; then
  check_ok "Node available: $(node --version)"
else
  check_fail "Node not found in PATH"
fi

if command -v npm >/dev/null 2>&1; then
  check_ok "npm available: $(npm --version)"
else
  check_fail "npm not found in PATH"
fi

if command -v bun >/dev/null 2>&1; then
  check_ok "Bun available: $(bun --version)"
elif [[ -x "$HOME/.bun/bin/bun" ]]; then
  check_ok "Bun available: $("$HOME/.bun/bin/bun" --version) (from \$HOME/.bun/bin/bun)"
else
  check_fail "Bun is required for upstream source workflow"
fi

if [[ -x "/Applications/OpenCode.app/Contents/MacOS/opencode-cli" ]]; then
  check_ok "OpenCode Desktop CLI found: /Applications/OpenCode.app/Contents/MacOS/opencode-cli"
elif command -v opencode >/dev/null 2>&1; then
  check_ok "OpenCode CLI found in PATH: $(command -v opencode)"
else
  check_warn "OpenCode CLI not found locally (CLI-backed routes may fall back)"
fi

if command -v docker >/dev/null 2>&1; then
  if docker mcp server ls --json >/dev/null 2>&1; then
    check_ok "Docker MCP is available and responding"
  else
    check_warn "Docker MCP command exists but server list failed"
  fi
else
  check_warn "Docker not found (MCP fallback tool routing unavailable)"
fi

if [[ -d "$UPSTREAM_DIR/.git" ]]; then
  check_ok "Upstream checkout present: $UPSTREAM_DIR"
else
  check_warn "Upstream checkout missing. Run: npm run upstream:bootstrap"
fi

echo
echo "[opencode-doctor] Summary: OK=$ok WARN=$warn FAIL=$fail"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi

