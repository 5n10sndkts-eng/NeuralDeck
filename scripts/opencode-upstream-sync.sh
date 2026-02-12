#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"
UPSTREAM_BRANCH="${OPENCODE_UPSTREAM_BRANCH:-dev}"

if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "[opencode-upstream] Upstream repo not found at $UPSTREAM_DIR"
  echo "[opencode-upstream] Run: npm run upstream:bootstrap"
  exit 1
fi

current_branch="$(git -C "$UPSTREAM_DIR" rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" != "$UPSTREAM_BRANCH" ]]; then
  echo "[opencode-upstream] Checking out branch $UPSTREAM_BRANCH"
  git -C "$UPSTREAM_DIR" checkout "$UPSTREAM_BRANCH"
fi

echo "[opencode-upstream] Pulling latest upstream ($UPSTREAM_BRANCH)..."
git -C "$UPSTREAM_DIR" pull --ff-only origin "$UPSTREAM_BRANCH"

"$ROOT_DIR/scripts/opencode-upstream-sync-agents.sh"
"$ROOT_DIR/scripts/opencode-upstream-apply-overlay.sh"
"$ROOT_DIR/scripts/opencode-upstream-export-patch.sh"

echo "[opencode-upstream] Sync complete at commit $(git -C "$UPSTREAM_DIR" rev-parse --short HEAD)"
