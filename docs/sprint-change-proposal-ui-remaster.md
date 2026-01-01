# Sprint Change Proposal: Visual Remaster "Neon Prime"

**Date:** 2025-12-14
**Trigger:** User Request ("Modern, sleek, high-quality cyberpunk overhaul")
**Scope:** Major (UI/UX Redesign)

## 1. Issue Summary
The current UI is "Functional Cyberpunk" but lacks the premium, high-fidelity polish of modern "Sleek" interfaces. The user requested a complete overhaul to emphasize neon aesthetics, glassmorphism, and "wow" factor animations.

## 2. Impact Analysis
*   **PRD:** Section 5 (Design) is outdated. Needs deeper focus on motion and lighting.
*   **Code:** `index.css` relies on static hex codes. `CyberUI.tsx` components are too simple. `App.tsx` layout is rigid.
*   **Risk:** High effort in CSS/Animation tuning. Low risk to backend logic.

## 3. Recommended Approach (Hybrid)
We will treat this as **Story 5: Visual Remaster**, effectively replacing the work done in Story 2 (Frontend Foundation).
*   **Strategy:** "Rewrite & Replace". We will overhaul the base CSS variables first, then systematically upgrade components.

## 4. Detailed Design Proposals

### A. The "Neon Prime" Design System (`index.css`)
**Change:** Replace static HEX with HSL variables for dynamic opacity/glassmorphism.
```css
:root {
  --neon-cyan: 180 100% 50%;
  --neon-purple: 280 100% 50%;
  --void-bg: 240 10% 4%;
  --glass-border: 1px solid hsla(var(--neon-cyan) / 0.2);
}
```

### B. Component Upgrades (`CyberUI.tsx`)
**1. Holographic Cards:**
*   **Old:** Simple border + transparent background.
*   **New:** Backdrop-filter (blur), noise texture overlay, and dynamic border gradients.

**2. Interactive Elements:**
*   **Old:** Simple scale on hover.
*   **New:** "Glitch" text effect, magnetic cursor attraction, and "scanner" light sweep animations.

### C. The "Cockpit" Layout (`App.tsx`)
*   **Navigation:** Move from static sidebar to a floating "Dock".
*   **Header:** Add a "rhythmic" equalizer visualization synced to system activity.
*   **Background:** Add a WebGL-like animated grid floor (CSS perspective).

## 5. Implementation Plan (Story 5)
1.  **[CSS]** Implement `index.css` with HSL tokens and "Scanline/Grid" backgrounds.
2.  **[UI]** Upgrade `CyberButton`, `CyberPanel`, `CyberInput` in `CyberUI.tsx`.
3.  **[Layout]** Refactor `App.tsx` to use the new "Cockpit" structure.
4.  **[Polishing]** Add `framer-motion` layout transitions (AnimatePresence).

## 6. Handoff
*   **Route To:** Frontend Developer (The Designer Persona)
*   **Timeline:** Immediate execution.
