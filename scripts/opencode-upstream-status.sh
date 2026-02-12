#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"

if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "[opencode-upstream] Upstream repo not found at $UPSTREAM_DIR"
  echo "[opencode-upstream] Run: npm run upstream:bootstrap"
  exit 1
fi

echo "Upstream repository status"
echo "  Path: $UPSTREAM_DIR"
echo "  Branch: $(git -C "$UPSTREAM_DIR" rev-parse --abbrev-ref HEAD)"
echo "  Commit: $(git -C "$UPSTREAM_DIR" rev-parse HEAD)"
echo "  Remote: $(git -C "$UPSTREAM_DIR" remote get-url origin)"
echo

git -C "$UPSTREAM_DIR" status --short --branch
