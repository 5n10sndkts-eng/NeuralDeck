# Story 2: Frontend Foundation & CyberUI Architecture

**Role:** Frontend Developer
**Feature:** UI/UX Framework
**Status:** Done

## Description
Set up the React application with the "Corporate Cyberpunk" design system.

## Technical Tasks
1.  [x] Verify Vite + React project structure.
2.  [x] Install **Tailwind CSS** and configure `tailwind.config.js`:
    *   Add colors: `void-black`, `electric-cyan`, `acid-purple`.
    *   Add animations: `glitch`, `scanline`.
3.  [x] Create `components/CyberUI.tsx` library:
    *   `CyberButton`: Button with cut corners and hover glow.
    *   `CyberPanel`: Glassmorphism container with neon borders.
    *   `CyberTerminal`: Display component for logs.
4.  [x] Implement **Main Layout** (`App.tsx`):
    *   Sidebar (Navigation).
    *   Top Bar (HUD: VRAM, Latency).
    *   Central Workspace (Graph/Editor split).

## Acceptance Criteria
*   App loads with dark "Void Black" background.
*   Buttons have distinct "Cyberpunk" hover states (glitch/glow).
*   Layout is responsive and creates the "Netrunner" feel.
