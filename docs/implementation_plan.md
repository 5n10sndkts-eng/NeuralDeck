# Implementation Plan - Story 3.3: Visual Input (Drag & Drop)

Integrate drag-and-drop capability for images, establishing the "Visual Cortex" of the system.

## User Review Required
> [!NOTE]
> This story mocks the actual computer vision analysis. Real analysis via OpenAI Vision API will be connected in a future story.

## Proposed Changes

### Core Integration
#### [MODIFY] [App.tsx](file:///Users/moe/NeuralDeckProjects/src/App.tsx)
- Import `VisionDropZone`.
- Wrap `MainLayout` with `VisionDropZone` to enable full-screen drop detection.
- Add state: `droppedFile` (File | null).
- Add handler: `handleFileDrop` (sets state, triggers analysis).

### Components
#### [NEW] [src/components/VisionPreview.tsx](file:///Users/moe/NeuralDeckProjects/src/components/VisionPreview.tsx)
- **Purpose:** Display the dropped image and simulated analysis logs.
- **UI:** Uses `HoloPanel` with `variant="glass"`.
- **Features:**
    -   Image preview (via `URL.createObjectURL`).
    -   "Scanning..." animation/overlay.
    -   Log output stream (e.g., "Identified pixels...", "Extracting UI elements...").
    -   Close button to clear state.

### State Management
#### [MODIFY] [src/contexts/UIContext.tsx](file:///Users/moe/NeuralDeckProjects/src/contexts/UIContext.tsx)
- (Optional) May need to expose `isDragActive` if we want global UI reaction, but `VisionDropZone` handles local state well. For now, local state in `App.tsx` is sufficient as it orchestrates the `VisionPreview` modal.

### Styles
- Ensure `z-index` of DropZone overlay is below `CommandPalette` but above `MainLayout`.

## Verification Plan

### Manual Verification
1.  **Drag Interaction:**
    -   Drag a `.png` or `.jpg` file over the window.
    -   **Verify:** "VISUAL CORTEX UPLINK" overlay appears.
    -   **Verify:** 'hover' sound plays.
2.  **Drop Event:**
    -   Drop the file.
    -   **Verify:** 'success' sound plays.
    -   **Verify:** `VisionPreview` panel appears.
3.  **Analysis Simulation:**
    -   Watch the preview panel.
    -   **Verify:** Text logs appear sequentially (Simulating CPU work).
    -   **Verify:** Final "Analysis Complete" message.
4.  **Close:**
    -   Click Close on preview.
    -   **Verify:** Panel disappears, state resets.
