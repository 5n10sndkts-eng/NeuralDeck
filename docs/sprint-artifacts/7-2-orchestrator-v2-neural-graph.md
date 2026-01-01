# Story 7.2: Orchestrator V2 (Neural Graph)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want an interactive, real-time 3D visualization of the agent "thought cloud",
So that I can intuitively understand the Swarm's logic and status.

## Acceptance Criteria

### AC1: 3D Visualization
- [ ] Replace SVG graph with 3D Canvas (React Three Fiber)
- [ ] Nodes are represented as 3D objects (spheres/cubes) floating in space
- [ ] Edges represent dependencies and flow between thoughts

### AC2: Interactive Controls
- [ ] User can zoom, pan, and rotate the camera (OrbitControls)
- [ ] Hovering a node displays detailed thought content
- [ ] Clicking a node simulates "focusing" on that thought

### AC3: Real-Time Updates
- [ ] Graph automatically updates when new thoughts are generated (from Story 7.1)
- [ ] New nodes animate into existence (fade in / scale up)
- [ ] Camera optionally adjusts to keep new activity in view

### AC4: Visual Aesthetics ("Neural" Feel)
- [ ] Glowing connections (Bloom effect)
- [ ] Particle effects or "impulses" traveling along edges
- [ ] Color-coding matches agent roles (Analyst=Cyan, Architect=Purple, etc.)

## Tasks / Subtasks

- [ ] Task 1: Setup React Three Fiber Environment
  - [ ] 1.1 Install dependencies (three, @react-three/fiber, @react-three/drei, @react-three/postprocessing)
  - [ ] 1.2 Scaffold `NeuralGraph3D.tsx` to replace `NeuralGraph.tsx`
- [ ] Task 2: Implement 3D Nodes and Edges
  - [ ] 2.1 Create `ThoughtNode` 3D component (Sphere/Mesh with Glow)
  - [ ] 2.2 Create `Synapse` 3D component (Line/Tube with animated texture)
  - [ ] 2.3 Implement 3D layout algorithm (Force-directed or Spiral)
- [ ] Task 3: Interaction & Camera
  - [ ] 3.1 specific `OrbitControls` configuration
  - [ ] 3.2 Implement Raycasting for Hover/Click events
- [ ] Task 4: Integration
  - [ ] 4.1 Update `TheOrchestrator.tsx` to use the new 3D component
  - [ ] 4.2 Verify real-time updates from `useSwarm`

## Dev Notes

### Architecture Compliance
- **Visualization Library**: Use `@react-three/fiber` as the standard for 3D in this project (Story 2.1 precedent).
- **Performance**: Use `InstancedMesh` if node count is expected to be high (>500), otherwise standard Mesh is fine for <100 thoughts.
- **Styling**: Match the specific "Cyberpunk/Void" aesthetic (Neon colors, dark backgrounds).

### Project Structure Notes
- **Component Location**: Keep 3D components in `src/components/Construct/` or `src/components/NeuralGraph/` if complex.

### References
- **Epic Source**: `docs/epics.md` - Epic 7, Story 7.2
- **Precedent**: `src/components/CyberVerse.tsx` (existing 3D environment)

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash

### Debug Log References

- Verified R3F dependency presence
- Implemented `NeuralGraph3D` container
- Created `ThoughtNode` with hover interactions

### Completion Notes List

- Replaced 2D generic graph with 3D React Three Fiber visualization.
- Implemented OrbitControls for full interactivity.
- Connected `useSwarm` nodes to 3D spheres.
- Added visual flair (Bloom, float animation) to match "Neural" aesthetic.

### File List

- `src/components/NeuralGraph3D.tsx` (NEW)
- `src/components/ThoughtNode.tsx` (NEW)
- `src/components/Synapse.tsx` (NEW)
- `src/components/TheOrchestrator.tsx` (MODIFIED)
