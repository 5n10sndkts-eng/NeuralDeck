# OpenCode Upstream Baseline (Fork-Style Foundation)

**Date:** February 11, 2026  
**Objective:** Shift NeuralDeck from "integration-only" to an upstream-first model (similar to Cursor on top of VS Code).

## What changed

1. Cloned OpenCode upstream source into:
   - `external/opencode-upstream`
2. Pinned local baseline to upstream:
   - Repo: `https://github.com/anomalyco/opencode`
   - Branch: `dev`
3. Added scripts to treat OpenCode as the base product and NeuralDeck as an overlay:
   - `scripts/opencode-upstream-bootstrap.sh`
   - `scripts/opencode-upstream-sync.sh`
   - `scripts/opencode-upstream-status.sh`
   - `scripts/opencode-upstream-sync-agents.sh`
   - `scripts/opencode-upstream-apply-overlay.sh`
   - `scripts/opencode-upstream-export-patch.sh`
   - `scripts/opencode-upstream-dev.sh`
4. Added npm commands:
   - `npm run upstream:bootstrap`
   - `npm run upstream:sync`
   - `npm run upstream:status`
   - `npm run upstream:agents:sync`
   - `npm run upstream:overlay:apply`
   - `npm run upstream:patch:export`
   - `npm run upstream:dev`

## Overlay strategy

- **Upstream base:** `external/opencode-upstream`
- **NeuralDeck customization layer:**
  - Legacy custom agent definitions in `/.opencode/agents`
  - Overlay source of truth in `/overlay/opencode-upstream`
  - Agent routing in `/.neuraldeck/agent-mappings.json`
  - Session routing/cache in backend OpenCode services
- **Sync mechanism:**
  - `upstream:agents:sync` copies legacy custom agents into overlay
  - `upstream:overlay:apply` applies overlay into upstream checkout
  - `upstream:patch:export` writes reproducible diff at `patches/opencode-upstream/neuraldeck-overlay.patch`

This keeps upstream history clean while enabling NeuralDeck-specific behavior on top.

## Daily workflow

1. Bootstrap or refresh upstream checkout:
   - `npm run upstream:bootstrap`
2. Pull latest upstream and re-apply overlay agents:
   - `npm run upstream:sync`
3. Verify current upstream commit:
   - `npm run upstream:status`
4. Export/update patch artifact:
   - `npm run upstream:patch:export`
5. Run OpenCode from upstream source:
   - `npm run upstream:dev`
6. Run OpenCode environment checks:
   - `npm run opencode:doctor`

## Next migration milestones

1. Move NeuralDeck UI/agent customizations into explicit patch sets against upstream packages.
2. Replace direct local wrappers with upstream package-level extensions where possible.
3. Introduce upstream patch tracking (series of patch files or a maintained fork branch) for reproducible upgrades.
4. Add CI jobs that validate overlay compatibility and scheduled upstream sync checks.
