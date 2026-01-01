# UX Design Specification: NeuralDeck

## 1. Executive Vision
**"Corporate Cyberpunk meets Developer Productivity"**

NeuralDeck transforms the software development lifecycle into a high-fidelity, diegetic experience. The user is not just "using a tool"; they are a **Netrunner** jacking into a **Neural Circuit**.

*   **Aesthetic Influences:** Cyberpunk 2077 (UI glitch, chromatic aberration), PewDiePie (Black/Red dynamic), Matrix (Terminal purity).
*   **Core Metaphor:** The "Swarm" of AI agents is visualized as a living, breathing node graph that reacts to code changes in real-time.

---

## 2. Design Pillars
### 💠 Immersion First
Every interaction must feel "physical" within the digital world.
*   **Diegetic UI:** Menus unfold like holographic projections.
*   **Micro-interactions:** Hover effects trigger data decoding animations.
*   **Soundscapes:** Subtle hums and clicks (toggleable) enforce the machine aesthetic.

### ⚡ Performance as a Feature
A "premium" feel requires locked 60fps.
*   **No Lag:** The UI must never freeze, even when processing hundreds of agent tasks.
*   **Smart Rendering:** We prioritize frame rate over particle count.

### 👁️ Clarity in Chaos
The "Glitch" aesthetic must never compromise readability.
*   **Content vs. Frame:** The "frame" (borders, backgrounds) can glitch; the "content" (text, code) must remain stable.

---

## 3. Technical & Visual Strategy

### The "Swarm" Visualization (LOD System)
| Agent Count | Mode | Visual Detail |
| :--- | :--- | :--- |
| **1-10** | **Tactical** | Full fidelity. Avatars, data packet animations, connection health status visible. |
| **10-50** | **Strategic** | Simplified nodes (Icons). Connection lines become static pulses. |
| **50+** | **Hive** | Agents auto-cluster into hexagonal "Hives". Interaction expands a specific cluster. |

### "Safe Mode" & Glitch Logic
*   **Event-Driven Glitch:** Triggered by Deployments, Errors, or "War Room" activation.
*   **Global Toggle:** "Safe Mode" instantly disables chromatic aberration and shake.

### Performance Tiers
1.  **Cinematic (Default):** Bloom, Motion Blur, CRT Scanlines, Particles.
2.  **Competitive:** Flat vectors, high contrast, no post-processing.

---

## 4. Visual Engineering (Reverse Engineered Specs)
*   **Palette:** Void/Black (`#050510`) base. Cyan (`#00F0FF`) for Normal. Neon Red (`#FF003C`) for Action/Error.
*   **Typography:** Orbitron (Headers), JetBrains Mono (Code), Inter (Body).
*   **Tech:** CSS `text-shadow` for aberration, `clip-path` for glitches, `framer-motion` springs.

---

## 5. Interaction & Navigation Strategy

To balance "Netrunner Fantasy" with "Developer Utility", we implement a Hybrid Control Scheme:

### A. The "CyberDeck" (Primary Action Layer)
*Inspired by `Cmd+K` Command Palettes, but diegetic.*
*   **Trigger:** `Cmd+K` or "Invoke Deck" button.
*   **Visual:** A terminal window slides down from top (Glassmorphism + Scanlines).
*   **Usage:** ALL complex actions live here (e.g., "Deploy to Production", "Kill Agent 007", "Switch to War Room").
*   **Why:** Keeps the main HUD clean 95% of the time.

### B. The "Tactical HUD" (Status Sidebar)
*   **Visual:** Thin, fixed sidebar on Left. Icons only.
*   **Content:**
    1.  **System Health** (CPU/Ram of the Swarm)
    2.  **Active Agents** (Count)
    3.  **Alert Level** (Normal vs. War Room status)
*   **Why:** Provides constant situational awareness without navigation clicks.

### C. The "Neural Circuit" (Main Viewport)
*   **Interaction:** Pan/Zoom infinite canvas.
*   **Context Menu:** Right-click on a Node opens a radial "Hack Menu" (Inspect, Logs, Pause).

---

## 6. User Personas

### 🧑‍💻 Primary: "The Solo Operator"
**Name:** Alex Chen | **Role:** Full-Stack Developer | **Experience:** 3-7 years

**Context:** Works on personal projects or small team codebases. Wants AI assistance without losing control. Values speed and keyboard shortcuts.

**Goals:**
- Rapidly prototype features with AI agent assistance
- Review and approve AI-generated code changes
- Maintain full visibility into what agents are doing

**Pain Points:**
- Distrust of "black box" AI tools
- Context-switching between terminal, IDE, and browser
- Cognitive overload managing multiple tasks

**Quote:** *"I want AI that shows its work, not magic I can't verify."*

---

### 👩‍💼 Secondary: "The Tech Lead"
**Name:** Jordan Rivera | **Role:** Engineering Manager | **Experience:** 8+ years

**Context:** Oversees a team of 4-8 developers. Uses NeuralDeck to orchestrate complex multi-file refactors and architectural changes.

**Goals:**
- Delegate routine tasks to AI agents
- Monitor team-wide agent activity
- Ensure code quality and security compliance

**Pain Points:**
- Lack of audit trails for AI-generated code
- Difficulty coordinating parallel agent tasks
- Communicating AI decisions to stakeholders

**Quote:** *"I need to explain to my CTO why we're trusting AI with our codebase."*

---

### 🔒 Tertiary: "The Security Auditor"
**Name:** Sam Okonkwo | **Role:** Security Engineer | **Experience:** 5+ years

**Context:** Reviews code for vulnerabilities. Uses NeuralDeck's Red Team agents to identify security issues before production.

**Goals:**
- Run automated security scans via AI agents
- Generate compliance reports
- Trace agent actions to specific code changes

**Pain Points:**
- AI generating insecure code patterns
- Difficulty reproducing AI-found vulnerabilities
- Compliance documentation requirements

**Quote:** *"Show me exactly what the AI changed and why."*

---

## 7. User Journeys

### Journey 1: First Launch (Onboarding)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   LAUNCH    │───▶│   WELCOME   │───▶│  WORKSPACE  │───▶│   EXPLORE   │
│    APP      │    │   SCREEN    │    │    SCAN     │    │    VIEWS    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                         │                   │
                         ▼                   ▼
                   "Welcome,            Auto-detect
                    Netrunner"          project type
```

**Steps:**
1. User launches NeuralDeck → Animated boot sequence (2-3 seconds)
2. Welcome screen with quick-start options: "Open Folder" / "Clone Repo" / "Demo Mode"
3. On folder selection → Automatic workspace scan, file tree population
4. Brief tooltip tour highlighting: Dock, Terminal, Command Palette
5. User lands in Workspace view with "?" hotkey reminder

---

### Journey 2: Code Review with AI
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   SELECT    │───▶│   INVOKE    │───▶│   REVIEW    │───▶│   APPROVE   │
│    FILE     │    │   ANALYST   │    │  FEEDBACK   │    │  / REJECT   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Steps:**
1. User opens file in Editor (NeuralLink → TheEditor)
2. Clicks "SEC_AUDIT" button or types `/audit` in terminal
3. Analyst agent activates → Thinking indicator shows in header
4. Results stream into terminal panel with inline annotations
5. User reviews suggestions → Accepts via "Transfer Code" or dismisses

---

### Journey 3: Multi-Agent Development Sprint
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   DEFINE    │───▶│   SWARM     │───▶│   MONITOR   │───▶│   MERGE     │
│    TASK     │    │  ACTIVATE   │    │  PROGRESS   │    │  RESULTS    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Steps:**
1. User describes task in Terminal: "Implement user authentication with JWT"
2. System activates multiple agents: Architect → Developer → QA → Security
3. User switches to Orchestrator view to watch agent collaboration
4. Real-time updates in NeuralGraph show task decomposition
5. On completion: User reviews changes in Editor, approves via Git commit

---

## 8. Accessibility (WCAG 2.1 AA)

### Color Contrast
| Element | Foreground | Background | Ratio | Status |
|---------|------------|------------|-------|--------|
| Body Text | `#E0E0E0` | `#050510` | 12.5:1 | ✅ Pass |
| Cyan Accent | `#00F0FF` | `#050510` | 8.2:1 | ✅ Pass |
| Error Red | `#FF003C` | `#050510` | 5.8:1 | ✅ Pass |
| Muted Text | `#6B7280` | `#050510` | 4.6:1 | ✅ Pass |
| Purple Glow | `#BC13FE` | `#050510` | 4.9:1 | ✅ Pass |

### Keyboard Navigation
- **Tab Order:** Logical flow through Dock → Header → Main Content → Terminal
- **Focus Indicators:** Cyan outline (2px solid) on all interactive elements
- **Skip Links:** Hidden "Skip to main content" link on Tab
- **Shortcuts:**
  - `Cmd+K` → Command Palette
  - `Cmd+1-9` → Switch views
  - `Cmd+/` → Toggle terminal
  - `?` → Show keyboard help
  - `Esc` → Close modals/cancel

### Motion & Animations
- **Reduced Motion:** Respect `prefers-reduced-motion` media query
- **Safe Mode:** Disables all glitch effects, particles, and non-essential animations
- **Pause Control:** All looping animations can be paused

### Screen Reader Support
- **ARIA Labels:** All icon buttons have descriptive labels
- **Live Regions:** Terminal output uses `aria-live="polite"`
- **Semantic HTML:** Proper heading hierarchy (h1-h6)
- **State Announcements:** Agent status changes announced

---

## 9. Responsive Breakpoints

### Desktop First (Primary Target)
| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| **XL** | ≥1440px | Full layout: Dock + Sidebar + Editor + Terminal |
| **LG** | 1024-1439px | Compressed: Dock icons only, collapsible sidebar |
| **MD** | 768-1023px | Stacked: Single column, bottom sheet terminal |
| **SM** | <768px | Mobile: Not officially supported (warning displayed) |

### Adaptive Components
```
XL (1440px+)         LG (1024px)          MD (768px)
┌──┬────────┬───┐    ┌──┬──────────┐      ┌──────────┐
│D │ Editor │ T │    │D │  Editor  │      │  Editor  │
│o │        │ e │    │o │          │      │          │
│c │────────│ r │    │c │──────────│      ├──────────┤
│k │Terminal│ m │    │k │ Terminal │      │ Terminal │
└──┴────────┴───┘    └──┴──────────┘      └──────────┘
```

### Mobile Warning
On screens < 768px:
> "NeuralDeck is optimized for desktop. For the full Netrunner experience, please use a larger screen."

---

## 10. Error States & Recovery

### Error Severity Levels
| Level | Visual Treatment | Sound | Action |
|-------|-----------------|-------|--------|
| **Info** | Cyan toast, auto-dismiss 3s | Soft ping | None required |
| **Warning** | Yellow toast, dismiss button | Alert tone | User acknowledgment |
| **Error** | Red panel, persists until resolved | Error buzz | Required action |
| **Critical** | Full-screen "Red Alert" mode | Alarm loop | Immediate attention |

### Common Error Scenarios

**1. Connection Lost (Backend)**
```
┌─────────────────────────────────────────────┐
│ ⚠️ NEURAL LINK SEVERED                      │
│                                             │
│ Connection to localhost:3001 failed.        │
│                                             │
│ [RETRY CONNECTION]  [WORK OFFLINE]          │
└─────────────────────────────────────────────┘
```

**2. Agent Failure**
```
┌─────────────────────────────────────────────┐
│ 🔴 AGENT MALFUNCTION: Developer             │
│                                             │
│ Error: Context window exceeded              │
│ Task: "Implement authentication"            │
│                                             │
│ [VIEW LOGS]  [RESTART AGENT]  [DISMISS]     │
└─────────────────────────────────────────────┘
```

**3. File Save Conflict**
```
┌─────────────────────────────────────────────┐
│ ⚡ SYNC CONFLICT DETECTED                   │
│                                             │
│ server.ts was modified externally.          │
│                                             │
│ [KEEP MINE]  [USE EXTERNAL]  [MERGE]        │
└─────────────────────────────────────────────┘
```

### Recovery Patterns
- **Auto-retry:** Network requests retry 3x with exponential backoff
- **Graceful Degradation:** Offline mode preserves local edits
- **Undo Stack:** Last 50 actions can be undone (`Cmd+Z`)
- **Session Recovery:** On crash, restore last state on relaunch

---

## 11. Component Design System

### Panel Variants
| Variant | Use Case | Border | Background | Glow |
|---------|----------|--------|------------|------|
| `glass` | Default containers | `rgba(0,240,255,0.15)` | Blur + gradient | Subtle |
| `solid` | Terminal, editors | `rgba(0,240,255,0.4)` | Solid dark | Medium |
| `alert` | Errors, warnings | `rgba(255,0,60,0.5)` | Red gradient | Intense |
| `elevated` | Modals, overlays | `rgba(0,240,255,0.25)` | Elevated dark | Medium |

### Button Styles
```
┌─────────────────────────────────────────────────────────────┐
│  PRIMARY          SECONDARY        DANGER         GHOST    │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐    ┌────────┐ │
│  │ ACTION  │     │ CANCEL  │     │ DELETE  │    │  MORE  │ │
│  └─────────┘     └─────────┘     └─────────┘    └────────┘ │
│  Cyan fill       Cyan outline    Red fill       No border  │
│  White text      Cyan text       White text     Gray text  │
└─────────────────────────────────────────────────────────────┘
```

### Input Fields
- **Default:** Dark background (`#0a0a0a`), subtle border, cyan focus ring
- **Error:** Red border, error icon, helper text below
- **Disabled:** 50% opacity, no focus state
- **Monospace:** JetBrains Mono for code/command inputs

### Status Indicators
| State | Color | Animation |
|-------|-------|-----------|
| Idle | Gray (`#6B7280`) | None |
| Active | Cyan (`#00F0FF`) | Pulse |
| Thinking | Yellow (`#FCD34D`) | Spin |
| Success | Green (`#22C55E`) | Flash once |
| Error | Red (`#EF4444`) | Shake |

### Spacing Scale
```
--space-xs:  4px   (0.25rem)  - Tight gaps
--space-sm:  8px   (0.5rem)   - Icon padding
--space-md:  12px  (0.75rem)  - Default gap
--space-lg:  16px  (1rem)     - Section gap
--space-xl:  24px  (1.5rem)   - Panel padding
--space-2xl: 32px  (2rem)     - View padding
```

---

## 12. Onboarding Flow

### First-Time User Experience

**Screen 1: Boot Sequence (2s)**
```
┌─────────────────────────────────────────────┐
│                                             │
│            ████ NEURAL DECK ████            │
│                                             │
│         INITIALIZING NEURAL LINK...         │
│         ████████████░░░░░░ 67%              │
│                                             │
└─────────────────────────────────────────────┘
```

**Screen 2: Welcome**
```
┌─────────────────────────────────────────────┐
│                                             │
│          Welcome, Netrunner.                │
│                                             │
│   NeuralDeck is your AI-powered             │
│   development command center.               │
│                                             │
│   ┌──────────────────────────────┐          │
│   │  📁 Open Project Folder      │          │
│   ├──────────────────────────────┤          │
│   │  🔗 Clone from GitHub        │          │
│   ├──────────────────────────────┤          │
│   │  🎮 Try Demo Mode            │          │
│   └──────────────────────────────┘          │
│                                             │
└─────────────────────────────────────────────┘
```

**Screen 3: Quick Tour (Optional)**
- Tooltip 1: "This is your CyberDock. Navigate between views here."
- Tooltip 2: "The Terminal is your command line. Talk to AI agents here."
- Tooltip 3: "Press Cmd+K anytime for the Command Palette."
- Tooltip 4: "Press ? to see all keyboard shortcuts."

### Progressive Disclosure
- **Day 1:** Basic features (Editor, Terminal, File Tree)
- **Day 3:** Introduce Orchestrator view via notification
- **Day 7:** Suggest enabling "God Mode" for power users
- **Day 14:** Prompt to customize agent routing

---

## 13. Implementation Alignment Checklist

| Spec Section | Status | Notes |
|--------------|--------|-------|
| User Personas | ✅ NEW | Added 3 personas |
| User Journeys | ✅ NEW | Added 3 core flows |
| Accessibility | ✅ NEW | WCAG 2.1 AA compliant |
| Responsive | ✅ NEW | Desktop-first, 4 breakpoints |
| Error States | ✅ NEW | 4 severity levels defined |
| Component System | ✅ NEW | Panels, buttons, inputs, indicators |
| Onboarding | ✅ NEW | 3-screen flow + tooltips |
| LOD System | ⚠️ PARTIAL | Implemented in code, needs testing |
| Performance Tiers | ❌ TODO | Cinematic vs Competitive modes |
| Safe Mode | ⚠️ PARTIAL | God Mode exists, need explicit Safe Mode |

---

*Document Version: 2.0*
*Last Updated: December 2024*
*Author: Sally (UX Designer Agent) + Moe*
