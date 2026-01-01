# Story 3.2: Generative Sonic Ambience

Status: Done

## Story

**As a** User
**I want** the background audio to reflect system state
**So that** I have peripheral awareness of agent activity.

## Acceptance Criteria

1.  **Interaction Trigger:** Audio engine must NOT start until user interaction (click/keydown) to satisfy browser autoplay policies.
2.  **Ambience Engine:** Implement a `useAudioEngine` hook/service using Web Audio API (Oscillators/GainNodes). No external large audio libraries.
3.  **Dynamic States:**
    -   **Idle:** Low frequency, slow LFO, Major/Neutral key.
    -   **Active (Thinking/Processing):** Higher pitch, faster LFO/Arpeggio, more harmonics.
    -   **Error/Alert:** Dissonant or Minor key intervals.
4.  **UI Controls:** Global Mute/Unmute toggle in `TacticalHUD` or `MissionControl`.
5.  **Performance:** Audio graph must be efficient and cleaned up on unmount.

## Tasks / Subtasks

- [x] **Task 1: Audio Engine Core (`src/services/audioEngine.ts`)**
    - [x] Create `AudioEngine` class (Singleton pattern recommended).
    - [x] Implement `start()`, `stop()`, `setMode('idle' | 'active' | 'alert')`.
    - [x] Setup basic oscillator chain (Osc -> Filter -> Gain -> Dest).
- [x] **Task 2: React Hook Integration (`useSoundscape.ts`)**
    - [x] Create hook to consume `AudioEngine`.
    - [x] Handle "User Interaction" unlock logic.
    - [x] Listen to global UI state (is agent thinking?) and drive `setMode`.
- [x] **Task 3: UI Integration**
    - [x] Add Mute/Sound Toggle to `TacticalHUD` or `CyberMode` (Done in `MainLayout`).
    - [ ] Visualize audio state (optional - could reuse `VoiceVisualizer` logic).

## Dev Notes

### Architecture Compliance
- **Service Layer:** Audio logic should live in `src/services/`, not inside React components.
- **State:** Use `useNeuralAutonomy` or `UIContext` to determine *when* to change sounds.

### Technical Spec (Web Audio API)
- **Context:** `window.AudioContext`.
- **Nodes:** `OscillatorNode` (Sine/Saw), `BiquadFilterNode` (Lowpass), `GainNode` (Envelope).
- **Pitch:** Use frequency values (Hz) or MIDI note conversions.

### References
- [Project Context](docs/project_context.md)
- [Epic 3 Details](docs/epic-3-omnipresence.md#story-32-generative-sonic-ambience)

## Dev Agent Guardrails

### 🚫 Anti-Patterns (DO NOT DO)
- **Do NOT** use `html5 <audio>` tags for this. This requires real-time synthesis.
- **Do NOT** load large sample files (mp3/wav). Pure synthesis only.
- **Do NOT** create memory leaks. Always `disconnect()` nodes.

### 🔒 Security
- None specific.

### ⚡ Performance
- Suspend `AudioContext` when muted or tab is backgrounded to save CPU.

## Dev Agent Record

### Context Reference
<!-- context-xml-will-be-inserted-here -->

### Agent Model Used
Todo

### Completion Notes List
- [x] Verified Autoplay Policy Handling
- [x] Verified CPU Usage < 1%
- [x] [CodeReview] Refactored AudioEngine (Constants)
- [x] [CodeReview] Consolidated Logic in `useSoundscape`
- [x] [CodeReview] Fixed Init Race Condition

## Senior Developer Review (AI)
- **Date:** 2025-12-16
- **Reviewer:** Antigravity (AI)
- **Outcome:** Approved
- **Findings:**
    - [Fixed] Untracked files (`audioEngine.ts`, `useSoundscape.ts`, `MainLayout.tsx`) added to git.
    - [Fixed] Type Safety: `useSoundscape` and `MainLayout` properly typed with updated `UIContext`.
