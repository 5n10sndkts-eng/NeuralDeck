#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT_DIR/external/opencode-upstream"
OVERLAY_DIR="$ROOT_DIR/overlay/opencode-upstream"
PATCH_DIR="$ROOT_DIR/patches/opencode-upstream"
PATCH_FILE="$PATCH_DIR/neuraldeck-overlay.patch"

if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "[opencode-upstream] Upstream repo not found at $UPSTREAM_DIR"
  echo "[opencode-upstream] Run: npm run upstream:bootstrap"
  exit 1
fi

mkdir -p "$PATCH_DIR"

if [[ ! -d "$OVERLAY_DIR" ]]; then
  echo "[opencode-upstream] Overlay directory not found: $OVERLAY_DIR"
  exit 1
fi

OVERLAY_FILES=()
while IFS= read -r file; do
  OVERLAY_FILES+=("$file")
done < <(
  cd "$OVERLAY_DIR"
  find . -type f | sed 's#^\./##' | sort
)

if [[ "${#OVERLAY_FILES[@]}" -eq 0 ]]; then
  echo "[opencode-upstream] Overlay has no files to export"
  : > "$PATCH_FILE"
  exit 0
fi

(
  cd "$UPSTREAM_DIR"
  git add -N -- "${OVERLAY_FILES[@]}" 2>/dev/null || true
  git diff -- "${OVERLAY_FILES[@]}" > "$PATCH_FILE"
)

if [[ ! -s "$PATCH_FILE" ]]; then
  echo "[opencode-upstream] No overlay diff to export"
  exit 0
fi

echo "[opencode-upstream] Patch exported: $PATCH_FILE"
