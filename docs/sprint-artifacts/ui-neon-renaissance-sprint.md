# Sprint: NEON RENAISSANCE
## UI Design System Overhaul

**Sprint Goal:** Transform NeuralDeck UI from "functional dark theme" to "authentic Cyberpunk 2077 HUD experience"

**Created:** 2025-12-29
**Team:** Sally (UX), Winston (Arch), Amelia (Dev), John (PM), Bob (SM)
**Total Story Points:** 32

---

## Executive Summary

### The Problem
The current UI is approximately 40% of the way to achieving an authentic Cyberpunk 2077 aesthetic. While the foundational dark theme and color palette are in place, the interface lacks:
- **Intensity** - Neon effects are too subtle
- **Depth** - Flat 2D appearance instead of layered glass panels
- **Life** - Static elements with no animation or micro-interactions
- **Polish** - Inconsistent application across views

### The Vision
Users should feel like netrunners booting into a premium holographic neural interface. Every panel should glow, every interaction should feel tactile, every element should breathe with subtle animation.

### Success Metrics
- Visual consistency score: 95%+ across all views
- User perception: "This looks like Cyberpunk 2077"
- Performance: Maintain 60fps with all effects enabled

---

## Sprint Backlog

### Priority Legend
- **P0** = CRITICAL - Must complete for sprint success
- **P1** = HIGH - Should complete, significant impact
- **P2** = MEDIUM - Nice to have, polish items

---

## P0 STORIES (Critical Path)

### UI-001: Premium Glass Panel System
**Priority:** P0
**Story Points:** 5
**Assignee:** TBD

#### User Story
**As a** user viewing NeuralDeck
**I want** all panels to have authentic glass morphism with depth
**So that** the interface feels like a futuristic holographic display

#### Current State Analysis
- Panels use basic `backdrop-filter: blur(12px)`
- Single-layer backgrounds with low opacity
- No corner brackets or edge effects
- Inconsistent border styling across components

#### Acceptance Criteria
- [ ] **AC-001.1:** All panels use consistent glass gradient
  ```css
  background: linear-gradient(135deg,
    rgba(10, 10, 20, 0.8) 0%,
    rgba(5, 5, 15, 0.95) 100%
  );
  ```
- [ ] **AC-001.2:** Backdrop blur minimum 16px, up to 24px for prominent panels
- [ ] **AC-001.3:** SVG corner brackets on all major panels (4 corners)
  - Top-left: `L` shape pointing right and down
  - Top-right: `L` shape pointing left and down
  - Bottom-left: `L` shape pointing right and up
  - Bottom-right: `L` shape pointing left and up
  - Color: `rgba(0, 240, 255, 0.5)` with glow
- [ ] **AC-001.4:** Border glow using multi-layer box-shadow
  ```css
  box-shadow:
    0 0 1px rgba(0, 240, 255, 0.8),
    0 0 5px rgba(0, 240, 255, 0.4),
    0 0 10px rgba(0, 240, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  ```
- [ ] **AC-001.5:** Subtle inner highlight at top edge (light leak effect)
- [ ] **AC-001.6:** Panel variants: `default`, `elevated`, `inset`, `alert`
- [ ] **AC-001.7:** Consistent 1px border with contextual colors

#### Technical Notes
- Create `GlassPanel` component or update `HoloPanel`
- CSS custom properties for easy theming
- Consider performance with many panels on screen

#### Definition of Done
- [ ] Component created/updated with all variants
- [ ] Applied to: HoloPanel, CyberPanel, all view containers
- [ ] Visual regression test screenshots captured
- [ ] Performance verified (no frame drops)

---

### UI-002: Neon Glow Effects Library
**Priority:** P0
**Story Points:** 3
**Assignee:** TBD

#### User Story
**As a** developer implementing UI components
**I want** reusable CSS glow classes and utilities
**So that** neon effects are consistent and performant

#### Current State Analysis
- Glow effects exist but are inconsistent
- No standardized utility classes
- Some elements missing glow entirely
- Opacity levels too low for impact

#### Acceptance Criteria
- [ ] **AC-002.1:** Base glow utility classes
  ```css
  .glow-cyan { /* 4-layer cyan glow */ }
  .glow-purple { /* 4-layer purple glow */ }
  .glow-red { /* 4-layer red glow */ }
  .glow-green { /* 4-layer green glow */ }
  .glow-yellow { /* 4-layer yellow glow */ }
  ```
- [ ] **AC-002.2:** Each glow has 4 shadow layers
  ```css
  .glow-cyan {
    box-shadow:
      0 0 5px rgba(0, 240, 255, 0.6),
      0 0 10px rgba(0, 240, 255, 0.4),
      0 0 20px rgba(0, 240, 255, 0.3),
      0 0 40px rgba(0, 240, 255, 0.1);
  }
  ```
- [ ] **AC-002.3:** Text glow variants
  ```css
  .text-glow-cyan {
    text-shadow:
      0 0 5px rgba(0, 240, 255, 0.8),
      0 0 10px rgba(0, 240, 255, 0.5),
      0 0 20px rgba(0, 240, 255, 0.3);
  }
  ```
- [ ] **AC-002.4:** Animated pulse variants
  ```css
  .glow-pulse-cyan {
    animation: pulse-cyan 2s ease-in-out infinite;
  }
  ```
- [ ] **AC-002.5:** Hover intensification classes (1.5x glow on hover)
- [ ] **AC-002.6:** CSS custom properties for all colors
  ```css
  :root {
    --glow-cyan: 0, 240, 255;
    --glow-purple: 188, 19, 254;
    --glow-red: 255, 0, 60;
    --glow-green: 10, 255, 10;
    --glow-yellow: 255, 208, 0;
  }
  ```
- [ ] **AC-002.7:** Border glow variants for container edges

#### Technical Notes
- Add to `index.css` as utility classes
- Use CSS custom properties for easy theming
- Consider `will-change` for animated glows
- Test performance with multiple glowing elements

#### Definition of Done
- [ ] All utility classes implemented in index.css
- [ ] Documentation with examples
- [ ] Applied to at least 3 existing components as proof
- [ ] Performance verified

---

### UI-003: CRT Terminal Effect
**Priority:** P0
**Story Points:** 5
**Assignee:** TBD

#### User Story
**As a** user interacting with the terminal
**I want** an authentic CRT monitor aesthetic
**So that** I feel like I'm using retro-futuristic tech

#### Current State Analysis
- Terminal is a basic dark box
- No scanlines or CRT effects
- Text has minimal glow
- Missing the "old monitor" feel

#### Acceptance Criteria
- [ ] **AC-003.1:** Scanline overlay
  ```css
  .crt-scanlines::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
  }
  ```
- [ ] **AC-003.2:** Subtle screen curvature effect
  ```css
  .crt-screen {
    border-radius: 20px / 10px;
    overflow: hidden;
  }
  ```
- [ ] **AC-003.3:** Chromatic aberration on text (RGB split)
  ```css
  .crt-text {
    text-shadow:
      -1px 0 rgba(255, 0, 0, 0.3),
      1px 0 rgba(0, 255, 255, 0.3);
  }
  ```
- [ ] **AC-003.4:** Phosphor glow on terminal text
  ```css
  .terminal-text {
    color: #00f0ff;
    text-shadow:
      0 0 5px currentColor,
      0 0 10px currentColor;
  }
  ```
- [ ] **AC-003.5:** Subtle screen flicker animation
  ```css
  @keyframes crt-flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.98; }
  }
  ```
- [ ] **AC-003.6:** CRT vignette (darker corners)
  ```css
  .crt-vignette::after {
    background: radial-gradient(
      ellipse at center,
      transparent 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
  }
  ```
- [ ] **AC-003.7:** Optional static noise texture (toggle-able)
- [ ] **AC-003.8:** Apply to: TheTerminal, TheEditor, code display areas

#### Technical Notes
- Use CSS pseudo-elements for overlays
- Keep animations subtle (motion sensitivity)
- Provide toggle for users who prefer less effects
- Consider GPU acceleration for animations

#### Definition of Done
- [ ] CRT effect system created as reusable classes
- [ ] Applied to TheTerminal component
- [ ] Applied to TheEditor component
- [ ] Toggle mechanism implemented
- [ ] Performance verified (maintain 60fps)

---

## P1 STORIES (High Priority)

### UI-004: HUD Header Component
**Priority:** P1
**Story Points:** 3
**Assignee:** TBD

#### User Story
**As a** user navigating the application
**I want** section headers that look like HUD displays
**So that** I can quickly identify sections and their status

#### Acceptance Criteria
- [ ] **AC-004.1:** Bracketed design with animated brackets
  ```
  ┌─ SECTION_NAME ─────────────────────┐
  │ Subtitle / metadata here           │
  ```
- [ ] **AC-004.2:** Status indicator dot with contextual glow
  - Green pulse: Active/Online
  - Cyan static: Ready/Idle
  - Yellow pulse: Warning
  - Red pulse: Error/Alert
- [ ] **AC-004.3:** Monospace uppercase typography
  ```css
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  ```
- [ ] **AC-004.4:** Animated underline on section change
- [ ] **AC-004.5:** Subtitle support for metadata display
- [ ] **AC-004.6:** Size variants: `sm`, `md`, `lg`
- [ ] **AC-004.7:** Color variants matching section purpose

#### Definition of Done
- [ ] SectionHeader component created/updated
- [ ] Applied to all view headers
- [ ] Consistent across: Orchestrator, Workspace, Laboratory, etc.

---

### UI-005: Premium Button/Input Styling
**Priority:** P1
**Story Points:** 3
**Assignee:** TBD

#### User Story
**As a** user interacting with forms and actions
**I want** buttons and inputs that feel tactile and premium
**So that** every interaction feels satisfying

#### Acceptance Criteria
- [ ] **AC-005.1:** Button gradient background with shine sweep
  ```css
  .cyber-button {
    background: linear-gradient(135deg,
      rgba(0, 240, 255, 0.2) 0%,
      rgba(0, 240, 255, 0.1) 100%
    );
    position: relative;
    overflow: hidden;
  }
  .cyber-button::before {
    /* Animated shine sweep */
    background: linear-gradient(
      90deg, transparent,
      rgba(255,255,255,0.2),
      transparent
    );
    animation: shine-sweep 3s infinite;
  }
  ```
- [ ] **AC-005.2:** Multi-layer glow on focus/active
- [ ] **AC-005.3:** Size variants: `sm` (28px), `md` (36px), `lg` (44px)
- [ ] **AC-005.4:** Input focus glow with smooth 200ms transition
- [ ] **AC-005.5:** Animated placeholder (optional typing effect)
- [ ] **AC-005.6:** Clear button with hover glow
- [ ] **AC-005.7:** Disabled states maintain aesthetic
  ```css
  .cyber-button:disabled {
    opacity: 0.5;
    filter: grayscale(50%);
    cursor: not-allowed;
  }
  ```
- [ ] **AC-005.8:** Button variants: `primary`, `secondary`, `danger`, `ghost`

#### Definition of Done
- [ ] CyberButton component updated
- [ ] CyberInput component updated
- [ ] All existing buttons migrated
- [ ] Form elements consistent app-wide

---

### UI-006: Agent Card Redesign
**Priority:** P1
**Story Points:** 5
**Assignee:** TBD

#### User Story
**As a** user viewing the agent swarm
**I want** agent cards that look like holographic ID badges
**So that** each agent feels like a distinct digital entity

#### Acceptance Criteria
- [ ] **AC-006.1:** Holographic background with shimmer
  ```css
  .agent-card {
    background: linear-gradient(
      135deg,
      rgba(var(--agent-color), 0.15) 0%,
      rgba(var(--agent-color), 0.05) 50%,
      rgba(var(--agent-color), 0.1) 100%
    );
  }
  ```
- [ ] **AC-006.2:** Agent avatar with colored glow ring
  - Ring color matches agent type
  - Pulse animation when active
  - Static ring when idle
- [ ] **AC-006.3:** Agent-specific color coding
  ```javascript
  const AGENT_COLORS = {
    analyst: { primary: '#00f0ff', glow: 'cyan' },
    architect: { primary: '#bc13fe', glow: 'purple' },
    developer: { primary: '#0aff0a', glow: 'green' },
    qa_engineer: { primary: '#ffd000', glow: 'yellow' },
    // ... etc
  };
  ```
- [ ] **AC-006.4:** Status indicator with animation
  - "Standing By" = Cyan, slow pulse
  - "Working" = Green, fast pulse
  - "Error" = Red, urgent pulse
- [ ] **AC-006.5:** Hover lift effect
  ```css
  .agent-card:hover {
    transform: translateY(-2px);
    box-shadow: /* intensified glow */;
  }
  ```
- [ ] **AC-006.6:** Active state with animated border
- [ ] **AC-006.7:** Truncation handling for long names

#### Definition of Done
- [ ] AgentCard component redesigned
- [ ] Applied in Orchestrator view
- [ ] Applied in top header agent buttons
- [ ] Color system documented

---

## P2 STORIES (Polish)

### UI-007: Micro-animation System
**Priority:** P2
**Story Points:** 5
**Assignee:** TBD

#### User Story
**As a** user interacting with the interface
**I want** subtle animations that make the UI feel alive
**So that** the experience feels polished and premium

#### Acceptance Criteria
- [ ] **AC-007.1:** Page transition animations (fade + slide)
- [ ] **AC-007.2:** Panel entrance animations (scale + fade)
- [ ] **AC-007.3:** List item stagger animations
- [ ] **AC-007.4:** Loading state animations (skeleton + pulse)
- [ ] **AC-007.5:** Success/error feedback animations
- [ ] **AC-007.6:** Hover micro-interactions on all interactive elements
- [ ] **AC-007.7:** Framer Motion integration patterns
- [ ] **AC-007.8:** Reduced motion support (prefers-reduced-motion)

#### Definition of Done
- [ ] Animation utility library created
- [ ] Applied to at least 5 components
- [ ] Reduced motion fallbacks working
- [ ] Performance verified

---

### UI-008: Background Effects System
**Priority:** P2
**Story Points:** 3
**Assignee:** TBD

#### User Story
**As a** user viewing NeuralDeck
**I want** atmospheric background effects
**So that** the environment feels immersive and futuristic

#### Acceptance Criteria
- [ ] **AC-008.1:** Animated grid background
  ```css
  .cyber-grid {
    background-image:
      linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: grid-scroll 20s linear infinite;
  }
  ```
- [ ] **AC-008.2:** Floating particle effect (optional)
- [ ] **AC-008.3:** Gradient orbs in background (very subtle)
- [ ] **AC-008.4:** Noise texture overlay option
- [ ] **AC-008.5:** View-specific background variants
- [ ] **AC-008.6:** Performance toggle for low-end devices

#### Definition of Done
- [ ] Background system implemented
- [ ] Applied to main layout
- [ ] Performance toggle working
- [ ] No impact on content readability

---

## Technical Dependencies

### Required Before Sprint Start
1. Review current CSS architecture in `index.css`
2. Audit all component files for inline styles to migrate
3. Ensure Tailwind config has all required custom properties

### CSS Custom Properties to Add
```css
:root {
  /* Glow Colors */
  --glow-cyan: 0, 240, 255;
  --glow-purple: 188, 19, 254;
  --glow-red: 255, 0, 60;
  --glow-green: 10, 255, 10;
  --glow-yellow: 255, 208, 0;

  /* Glass Panel */
  --glass-bg-start: rgba(10, 10, 20, 0.8);
  --glass-bg-end: rgba(5, 5, 15, 0.95);
  --glass-border: rgba(0, 240, 255, 0.15);
  --glass-blur: 20px;

  /* Typography */
  --font-display: 'Orbitron', 'Rajdhani', sans-serif;
  --font-mono: 'Fira Code', 'JetBrains Mono', monospace;

  /* Spacing */
  --panel-padding: 1.25rem;
  --panel-gap: 1.5rem;
  --corner-bracket-size: 12px;
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation from effects | Medium | High | Use `will-change`, test on low-end devices |
| Inconsistent application | Medium | Medium | Create component library, enforce usage |
| Scope creep | High | Medium | Strict P0/P1/P2 adherence |
| Browser compatibility | Low | Medium | Test in Chrome, Firefox, Safari |

---

## Definition of Done (Sprint Level)

- [ ] All P0 stories completed and verified
- [ ] At least 80% of P1 stories completed
- [ ] Visual consistency across all 10 views
- [ ] No performance regressions (maintain 60fps)
- [ ] Code reviewed and merged
- [ ] Screenshots captured for documentation

---

## Appendix: View-by-View Checklist

### Views to Update
- [ ] **Workspace** - Editor + Terminal
- [ ] **Orchestrator** - Agent cards + Neural graph
- [ ] **Kanban** - Board columns + cards
- [ ] **Synapse** - Knowledge graph
- [ ] **Laboratory** - Agent sandbox
- [ ] **Construct** - Memory editor
- [ ] **Immerse** - TBD
- [ ] **Grid** - Node modules
- [ ] **Git** - Git log
- [ ] **System** - Settings

---

*Sprint created by BMAD Party Mode - Sally (UX), Winston (Arch), John (PM), Bob (SM)*
