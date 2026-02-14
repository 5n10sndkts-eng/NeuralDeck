# NeuralDeck V3 Deep Integration

This directory contains the V3 Deep Integration implementation, transforming NeuralDeck into a specialized extension of agentic-flow@alpha.

## Overview

V3 Deep Integration eliminates 10,000+ duplicate lines of code by leveraging agentic-flow's optimized systems while maintaining 100% feature parity.

### Target Metrics

- **Code Reduction**: 15,000+ → <5,000 lines (66% reduction)
- **Flash Attention**: 2.49x-7.47x speedup
- **AgentDB Search**: 150x-12,500x improvement via HNSW indexing
- **Memory Usage**: 50-75% reduction
- **SONA Adaptation**: <0.05ms learning time

## Integration Phases

### Phase 1: Adapter Layer (Current) ✅
- Create wrapper interfaces for existing systems
- Track API usage for migration planning
- Maintain backward compatibility
- **Status**: In Progress

### Phase 2: System Migration (Week 2-4)
- Migrate SwarmEngine → agentic-flow swarm
- Migrate AgentCoordination → agentic-flow coordination
- Migrate MemorySystem → AgentDB
- Update all imports and references
- **Status**: Pending

### Phase 3: Feature Integration (Week 5-6)
- Integrate SONA learning modes (real-time, balanced, research, edge, batch)
- Enable Flash Attention for 2.49x-7.47x speedup
- Setup AgentDB coordination with 150x-12,500x search
- Configure MCP tools (213 builtin tools + 19 hook types)
- **Status**: Pending

### Phase 4: Cleanup & Optimization (Week 7)
- Remove deprecated code
- Verify code reduction target
- Run performance benchmarks
- Validate feature parity
- **Status**: Pending

## Usage

### Current (Phase 1)

The adapter layer is automatically initialized on app startup. It wraps existing systems and tracks usage for migration planning:

```typescript
import { V3SwarmAdapter, V3MemoryAdapter, migrationTracker } from './v3-integration';

// Wrap existing systems
const v3Swarm = new V3SwarmAdapter(existingSwarmEngine);
const v3Memory = new V3MemoryAdapter(existingMemorySystem);

// Track migration progress
const progress = migrationTracker.getProgress();
console.log(`Code reduction: ${progress.totalLines.reductionPercent}%`);
```

### Phase 2+ (After Migration)

Once agentic-flow packages are installed:

```typescript
import { initializeNeuralDeckV3 } from './v3-integration';

const { swarm, memory, attention } = await initializeNeuralDeckV3({
  sonaMode: 'balanced',
  flashAttention: true,
  agentDBDimensions: 1536
});

// Use unified systems
await swarm.coordinateNeuralDeckSwarm({
  agents: [...],
  topology: 'hierarchical-mesh',
  tasks: [...]
});
```

## Configuration

Edit `v3-integration.json` at project root to configure the integration:

```json
{
  "v3Integration": {
    "targetCodeReduction": {
      "from": 15000,
      "to": 5000
    },
    "phases": [
      {
        "name": "Phase 1: Adapter Layer",
        "status": "in-progress"
      }
    ]
  }
}
```

## Systems Being Migrated

| System | Current | Lines | Replacement | Status |
|--------|---------|-------|-------------|--------|
| SwarmEngine | src/services/swarmEngine.ts | 523 | @agentic-flow/swarm | pending |
| AgentCoordination | src/core/swarm/*.ts | 2,477 | @agentic-flow/swarm/coordination | pending |
| MemorySystem | src/core/memory/*.ts | TBD | @agentic-flow/memory/AgentDB | pending |
| TaskScheduler | TBD | TBD | @agentic-flow/task | pending |

## Features Being Integrated

| Feature | Package | Target | Status |
|---------|---------|--------|--------|
| SONA Learning | @agentic-flow/sona | <0.05ms adaptation | pending |
| Flash Attention | @agentic-flow/attention | 2.49x-7.47x speedup | pending |
| AgentDB | @agentic-flow/memory | 150x-12,500x search | pending |
| MCP Tools | @agentic-flow/mcp | 213 tools + 19 hooks | pending |

## Migration Tracking

The migration tracker logs API usage to identify which systems are most used:

```typescript
import { migrationTracker } from './v3-integration';

// Track API calls
migrationTracker.trackAPICall('swarm.coordinate');

// Get migration progress
const progress = migrationTracker.getProgress();
console.log(progress);
```

## Scripts

### npm Scripts

```bash
# Full integration pipeline
npm run v3:integration:full

# Individual phases
npm run v3:integration:init       # Initialize adapter layer
npm run v3:integration:adapter    # Create adapter layer
npm run v3:integration:migrate    # Migrate systems
npm run v3:integration:cleanup    # Remove deprecated code
npm run v3:integration:verify     # Verify integration

# Feature configuration
npm run v3:sona:set-mode          # Set SONA mode
npm run v3:flash-attention:enable # Enable Flash Attention
npm run v3:agentdb:setup          # Setup AgentDB

# Benchmarking
npm run v3:benchmark              # Run performance benchmarks
```

## Backward Compatibility

During Phase 1-2, all existing APIs remain functional:

- Existing imports continue to work
- Legacy system calls are wrapped
- Gradual migration path
- No breaking changes until Phase 4

## Timeline

- **Week 1**: Phase 1 - Adapter Layer ✅
- **Week 2-4**: Phase 2 - System Migration
- **Week 5-6**: Phase 3 - Feature Integration
- **Week 7**: Phase 4 - Cleanup & Optimization

## Related Documentation

- [agentic-flow Documentation](https://github.com/ruvnet/agentic-flow)
- [V3 Deep Integration Skill](../.claude/skills/v3-integration-deep/SKILL.md)
- [Migration Guide](./MIGRATION.md)
- [API Reference](./API.md)

## Contributing

When modifying systems marked for migration:
1. Check if the system has a V3 adapter
2. Update both legacy and adapter code
3. Run migration tracker to log usage
4. Test backward compatibility

## Support

For questions about V3 integration:
1. Check this README
2. Review migration tracking logs
3. Consult the adapter layer documentation
4. Open an issue with [V3] tag
