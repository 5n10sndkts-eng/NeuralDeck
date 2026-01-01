# Story 5.1: Red Alert Mode Toggle

Status: done

## Story

**As a** Security Analyst
**I want** to toggle the UI to "Red Alert" mode with a red theme
**So that** I can visually indicate when security auditing is active and create a focused security analysis environment.

## Acceptance Criteria

1. **Given** the NeuralDeck application is running
   **When** the user activates Red Alert mode
   **Then** the UI must toggle to a red theme (Crimson Red `#ff003c` as primary color)
   **And** the background must shift to darker red tones (Void Black with red accents)
   **And** all UI elements must reflect the red alert aesthetic

2. **Given** Red Alert mode is active
   **When** the user navigates through the application
   **Then** all panels, borders, and highlights must use red color scheme
   **And** the Cyberpunk aesthetic must be maintained but with red instead of cyan
   **And** the theme change must be immediate and smooth (no flicker or delay)

3. **Given** Red Alert mode toggle is available
   **When** the user wants to activate it
   **Then** the toggle must be accessible from the main UI (e.g., Tactical HUD or Command Palette)
   **And** the toggle must be clearly labeled (e.g., "WAR ROOM MODE" or "RED ALERT")
   **And** the toggle state must be persisted (remember user's preference)

4. **Given** Red Alert mode is active
   **When** security agents are running
   **Then** the red theme must reinforce the security-focused context
   **And** security-related UI elements must be emphasized (threat indicators, vulnerability lists)
   **And** the theme must create a distinct "war room" atmosphere

5. **Given** Red Alert mode can be toggled
   **When** the user deactivates Red Alert mode
   **Then** the UI must return to the default Cyberpunk theme (Electric Cyan)
   **And** the transition must be smooth
   **And** all security features must remain functional regardless of theme

## Tasks / Subtasks

- [x] **Task 1: Theme System Foundation** (AC: 1, 2)
  - [x] Create `ThemeMode` type: 'default' | 'war-room'
  - [x] Add Red Alert CSS variables to `src/index.css`
  - [x] Update Tailwind config with red theme colors
  - [x] Create CSS transition classes for smooth theme switching

- [x] **Task 2: UIContext Theme State** (AC: 3)
  - [x] Add `themeMode` state to `UIContext.tsx`
  - [x] Add `toggleWarRoomMode()` action
  - [x] Implement localStorage persistence for theme preference
  - [x] Export theme state and toggle function

- [x] **Task 3: Theme Application** (AC: 1, 2, 5)
  - [x] Add `data-theme` attribute to root element
  - [x] Create theme-aware CSS selectors
  - [x] Apply theme classes to App component
  - [x] Test smooth transitions between themes

- [x] **Task 4: War Room Toggle UI** (AC: 3, 4)
  - [x] Add "WAR ROOM" toggle to CommandPalette
  - [x] Add keyboard shortcut (Ctrl+Shift+W)
  - [x] Add visual indicator when War Room mode is active
  - [ ] Add toggle to CyberDock for quick access (optional enhancement)

- [x] **Task 5: Unit Tests** (AC: all)
  - [x] Test theme toggle functionality
  - [x] Test localStorage persistence
  - [x] Test CSS variable application
  - [x] Test transition smoothness

## Dev Notes

### Color Scheme - War Room Mode

**Primary Colors:**
- Crimson Red: `#ff003c` (replaces Electric Cyan `#00ffff`)
- Blood Orange: `#ff4500` (accent)
- Deep Red: `#8b0000` (secondary)
- Void Black: `#0a0000` (background with red tint)

**CSS Variable Mapping:**
```css
[data-theme="war-room"] {
  --color-primary: #ff003c;
  --color-primary-dim: #cc0030;
  --color-accent: #ff4500;
  --color-bg-void: #0a0000;
  --color-glow: rgba(255, 0, 60, 0.5);
}
```

### Existing Infrastructure

1. **UIContext** (`src/contexts/UIContext.tsx`):
   - Already manages `mode: IDLE | CODING | ALERT`
   - Can extend with `themeMode` state

2. **CommandPalette** (`src/components/CommandPalette.tsx`):
   - Keyboard shortcut system already exists
   - Can add War Room toggle command

3. **CyberDock** (`src/components/CyberDock.tsx`):
   - Bottom dock with quick actions
   - Good place for persistent toggle

### References

- [Source: docs/epics.md#Story 5.1]
- [Source: docs/ux-design-specification.md] - Color palette reference
- [Source: src/contexts/UIContext.tsx] - UI state management

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Console logs prefixed with `[Theme]` for theme switching events

### Completion Notes List

1. War Room theme CSS variables implemented with smooth transitions (AC: 1, 2)
2. `ThemeMode` type exported from UIContext with 'default' | 'war-room' values (AC: 1)
3. `toggleWarRoomMode()` and `setThemeMode()` functions in UIContext (AC: 3, 5)
4. localStorage persistence with key `neuraldeck-theme` (AC: 3)
5. `data-theme="war-room"` attribute applied to document root (AC: 1, 2)
6. CommandPalette toggle command: "Enter War Room Mode" / "Exit War Room Mode" (AC: 3)
7. Keyboard shortcut: Ctrl+Shift+W (AC: 3)
8. Visual indicator in CommandPalette footer when War Room active (AC: 4)
9. 13 unit tests covering all acceptance criteria (AC: all)
10. CSS transitions use `--theme-transition: 0.3s ease-in-out` for smooth switching (AC: 2, 5)

### File List

**Created:**
- `tests/contexts/UIContext.test.tsx` - 13 unit tests for War Room mode

**Modified:**
- `src/index.css` - Added War Room CSS variables, transitions, and theme-aware selectors
- `src/contexts/UIContext.tsx` - Added `ThemeMode`, theme state, `toggleWarRoomMode()`, persistence
- `src/components/CommandPalette.tsx` - Added War Room toggle command with keyboard shortcut
- `tailwind.config.js` - Added warroom color palette and neon-red shadow
