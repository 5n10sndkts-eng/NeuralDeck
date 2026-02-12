#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"
OVERLAY_DIR="$ROOT_DIR/overlay/opencode-upstream"

if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "[opencode-upstream] Upstream repo not found at $UPSTREAM_DIR"
  echo "[opencode-upstream] Run: npm run upstream:bootstrap"
  exit 1
fi

if [[ ! -d "$OVERLAY_DIR" ]]; then
  echo "[opencode-upstream] Overlay directory not found: $OVERLAY_DIR"
  exit 1
fi

rsync -a "$OVERLAY_DIR/" "$UPSTREAM_DIR/"

echo "[opencode-upstream] Applied overlay into upstream working tree"
