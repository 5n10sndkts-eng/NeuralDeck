#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/.opencode/agents"
OVERLAY_DIR="$ROOT_DIR/overlay/opencode-upstream/.opencode/agent"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"

if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "[opencode-upstream] Upstream repo not found at $UPSTREAM_DIR"
  echo "[opencode-upstream] Run: npm run upstream:bootstrap"
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "[opencode-upstream] Source agent directory not found: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$OVERLAY_DIR"

synced=0
for file in "$SOURCE_DIR"/*.md; do
  if [[ ! -f "$file" ]]; then
    continue
  fi

  base="$(basename "$file")"

  # Skip documentation file, only sync actual agent definitions.
  if [[ "$base" == "README.md" ]]; then
    continue
  fi

  cp "$file" "$OVERLAY_DIR/$base"
  echo "[opencode-upstream] Synced agent into overlay: $base"
  synced=$((synced + 1))
done

echo "[opencode-upstream] Total synced agents: $synced"
