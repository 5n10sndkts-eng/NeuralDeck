# Story 3.3: Visual Input (Drag & Drop)

Status: Done

## Story

**As a** User
**I want to** drag images into the terminal
**So that** the agents can analyze UI mockups or error screenshots.

## Acceptance Criteria

1.  **Drop Zone:** The application interface handles file drag-over events with a "Visual Cortex Uplink" overlay using `VisionDropZone`.
2.  **Image Preview:** Dropped images are displayed in a dedicated `HoloPanel` preview window.
3.  **Analysis Simulation:** Upon drop, the system simulates a vision analysis process, logging steps like "Scanning pixels...", "Identifying components...", "OCR Extraction..." to the console/terminal.
4.  **Audio Feedback:** Play 'success' sound on valid drop, 'error' on invalid type. (Already in `VisionDropZone`, verify integration).

## Tasks / Subtasks

- [x] **Task 1: Integration (`App.tsx`)** (AC: 1)
    - [x] Wrap main content with `VisionDropZone`.
    - [x] Manage `droppedFile` state in `App` or `UIContext`.

- [x] **Task 2: Vision Preview UI** (AC: 2)
    - [x] Create `VisionPreview` component using `HoloPanel`.
    - [x] Show/Hide logic based on state.

- [x] **Task 3: Analysis Logic** (AC: 3)
    - [x] Implement `simulateVisionAnalysis` function.
    - [x] Connect logs to `message` state in `App.tsx`.

## Dev Notes
- `VisionDropZone.tsx` already exists. Reuse it.
- Use `URL.createObjectURL` for preview to avoid upload overhead during prototype.
