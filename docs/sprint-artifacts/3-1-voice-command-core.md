# Story 3.1: Voice Command Core

Status: Done

## Story

**As a** User
**I want to** speak commands using my microphone
**So that** I can control the system hands-free.

## Acceptance Criteria

1.  **Microphone Access:** System must request microphone permission upon activation trigger (e.g., Spacebar or Button).
2.  **Listening Visuals:** UI must visually indicate "Listening" state (e.g., waveform, pulse, or color shift in `TacticalHUD` or `HoloPanel`).
3.  **Transcription:** Real-time speech-to-text transcription must appear in the `CommandConsole` input area.
4.  **Execution:** Recognized commands should trigger the existing command execution pipeline (same as typing).
5.  **Error Handling:** Graceful handling of "Mic Denied" or "No Speech Detected" errors with cyber-themed feedback.

## Tasks / Subtasks

- [x] **Task 1: Voice Input Hook (`useVoiceInput.ts`)** (AC: 1, 5)
    - [x] Implement `useVoiceInput` hook using `window.webkitSpeechRecognition`.
    - [x] Handle permissions and error states (`not-allowed`, `no-speech`).
    - [x] Add TypeScript definitions for Web Speech API (if missing).
- [x] **Task 2: UI Visual Feedback** (AC: 2)
    - [x] Create `AudioWaveform` component (Cyberpunk aesthetic - use Canvas or CSS/Framer Motion).
    - [x] Integrate into `TacticalHUD` or `CyberMode` status bar.
- [x] **Task 3: Console Integration** (AC: 3, 4)
    - [x] Connect `useVoiceInput` to `CommandConsole` state.
    - [x] Auto-submit command on final result (optional, or wait for enter).

## Dev Notes

### Architecture Compliance
- **Core State:** Must use `useNeuralAutonomy` if this affects agent state (though this story is mostly Input layer).
- **Component Style:** Functional components only. Use `App.tsx` context or Props to pass voice state if needed.
- **Styling:** Use Tailwind. Avoid inline styles.
- **Visuals:** MUST be "Cyberpunk" (Neon, Dark, Tech). No generic microphone icons.

### Technical Spec (Web Speech API)
- **API:** `const recognition = new window.webkitSpeechRecognition();`
- **Config:** `recognition.continuous = false;`, `recognition.interimResults = true;`
- **Browser:** Targeted for Chrome/Edge (WebKit). Add graceful fallback check.

### References
- [Project Context](docs/project_context.md) - **CRITICAL: READ THIS FIRST**
- [Epic 3 Details](docs/epic-3-omnipresence.md#story-31-voice-command-core)
- [Architecture](docs/architecture.md)

## Dev Agent Guardrails

### 🚫 Anti-Patterns (DO NOT DO)
- **Do NOT** use an external library for Speech-to-Text (e.g., no paid APIs). Use Browser Native API.
- **Do NOT** create Class Components.
- **Do NOT** forget to clean up event listeners in `useEffect` return.
- **Do NOT** use `any` types for the recognition results. Define the interface.

### 🔒 Security
- Handle Permission Denied errors without crashing.

### ⚡ Performance
- Ensure the `AudioWaveform` visualization uses `requestAnimationFrame` (or `useFrame` if in R3F) to avoid main-thread jank.

## Dev Agent Record

### Context Reference
<!-- context-xml-will-be-inserted-here -->

### Agent Model Used
Todo

### Completion Notes List
- [x] Verified Mic Permissions
- [x] Verified Text Injection
- [x] [CodeReview] Fixed Type Safety in CommandPalette & useVoice
- [x] [CodeReview] Addressed Magic Numbers
- [x] [CodeReview] Improved Accessibility (ARIA labels)

## Senior Developer Review (AI)
- **Date:** 2025-12-16
- **Reviewer:** Antigravity (AI)
- **Outcome:** Approved
- **Findings:**
    - [Fixed] Untracked files (`useVoice.ts`, `VoiceVisualizer.tsx`) added to git.
    - [Fixed] Renamed `useVoice.ts` to `useVoiceInput.ts` to match spec.
    - [Fixed] Type Safety: Removed `any` from `CommandPalette`.

## Change Log

- 2025-12-28: Code review fix - Task checkbox cleanup
  - Fixed: Marked all Task 1 subtasks as complete (implementation verified in useVoiceInput.ts)
  - Fixed: Removed duplicate "Verified Mic Permissions" checkbox
  - Note: Hook exports `useVoice` but file named `useVoiceInput.ts` (minor naming inconsistency)
  - Reviewer: Amelia (Dev Agent) via adversarial code review
