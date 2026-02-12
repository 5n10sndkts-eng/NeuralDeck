#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"

if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "[opencode-upstream] Upstream repo not found at $UPSTREAM_DIR"
  echo "[opencode-upstream] Run: npm run upstream:bootstrap"
  exit 1
fi

if command -v bun >/dev/null 2>&1; then
  BUN_BIN="$(command -v bun)"
elif [[ -x "$HOME/.bun/bin/bun" ]]; then
  BUN_BIN="$HOME/.bun/bin/bun"
else
  BUN_BIN=""
fi

if [[ -z "$BUN_BIN" ]]; then
  echo "[opencode-upstream] Bun is required to run upstream source"
  exit 1
fi

"$ROOT_DIR/scripts/opencode-upstream-sync-agents.sh"
"$ROOT_DIR/scripts/opencode-upstream-apply-overlay.sh"

echo "[opencode-upstream] Launching upstream dev CLI from source..."
cd "$UPSTREAM_DIR"
exec "$BUN_BIN" run dev
