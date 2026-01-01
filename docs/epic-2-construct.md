# Epic 2: The Construct (3D Visualization)

**Status:** Implemented (v2 - NEON PRIME)
**Feature Set:** "The Construct"
**Tech Stack:** `three.js`, `R3F`, `Post-Processing`

## Overview
The Construct is an immersive 3D interface for the NeuralDeck workstation. It visualizes the file system and agent swarm as a "Cyberpunk Data City", allowing users to navigate their project spatially.

## Architecture

### 1. The Canvas (`CyberVerse.tsx`)
*   **Engine:** Uses `react-three-fiber` (R3F) to bridge React state with the Three.js scene graph.
*   **Lighting:** High-contrast Neon spots (Cyan/Purple).
*   **Atmosphere:** Volumetric Fog + Starfield.

### 2. Post-Processing (v2 Remaster)
The "Neon Prime" look is achieved via a dedicated effect pipeline:
*   **Bloom:** Intense glow for all emissive materials.
*   **Chromatic Aberration:** Digital lens distortion.
*   **Scanlines:** Subtle CRT effect overlay.
*   **Noise:** Film/Digital grain for texture.

### 3. Data Representation
*   **Files:** Floating Holographic Nodes (Box Geometry).
*   **Directories:** Floating Holographic Nodes (Octahedron Geometry).
*   **Materials:** `MeshPhysicalMaterial` with high metalness and transmission (Glass/Hologram).
*   **Data Rain:** Vertical particle system simulating digital precipitation.
*   **Layout:** Spherical/Orbital layout for better spatial density.

### 4. Interaction Model
*   **Hover:** Nodes glow white and display 3D text labels.
*   **Click:** Opens file in editor + Haptic 'Click' sound.
*   **Navigation:** Auto-rotating camera with full orbit control.

## Integration
*   Accessed via the **Dock** (Server Icon).
*   Route: `'construct-3d'` in `App.tsx`.
