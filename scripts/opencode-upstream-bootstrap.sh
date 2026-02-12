#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"
UPSTREAM_REPO="${OPENCODE_UPSTREAM_REPO:-https://github.com/anomalyco/opencode.git}"
UPSTREAM_BRANCH="${OPENCODE_UPSTREAM_BRANCH:-dev}"

mkdir -p "$ROOT_DIR/external"

if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "[opencode-upstream] Cloning $UPSTREAM_REPO ($UPSTREAM_BRANCH)..."
  git clone --depth=1 --branch "$UPSTREAM_BRANCH" "$UPSTREAM_REPO" "$UPSTREAM_DIR"
else
  echo "[opencode-upstream] Existing clone found. Updating $UPSTREAM_BRANCH..."
  git -C "$UPSTREAM_DIR" fetch --depth=1 origin "$UPSTREAM_BRANCH"
  git -C "$UPSTREAM_DIR" checkout -B "$UPSTREAM_BRANCH" "origin/$UPSTREAM_BRANCH"
fi

"$ROOT_DIR/scripts/opencode-upstream-sync-agents.sh"
"$ROOT_DIR/scripts/opencode-upstream-apply-overlay.sh"
"$ROOT_DIR/scripts/opencode-upstream-export-patch.sh"

if command -v bun >/dev/null 2>&1; then
  BUN_BIN="$(command -v bun)"
elif [[ -x "$HOME/.bun/bin/bun" ]]; then
  BUN_BIN="$HOME/.bun/bin/bun"
else
  BUN_BIN=""
fi

if [[ -n "$BUN_BIN" ]]; then
  echo "[opencode-upstream] Installing upstream dependencies with bun..."
  (cd "$UPSTREAM_DIR" && "$BUN_BIN" install)
else
  echo "[opencode-upstream] Bun is not installed. Install bun to build upstream source."
fi

echo

echo "[opencode-upstream] Ready."
echo "  Upstream dir: $UPSTREAM_DIR"
echo "  Branch: $(git -C "$UPSTREAM_DIR" rev-parse --abbrev-ref HEAD)"
echo "  Commit: $(git -C "$UPSTREAM_DIR" rev-parse --short HEAD)"
echo
echo "Next steps:"
echo "  1) npm run upstream:dev"
echo "  2) npm run upstream:status"
