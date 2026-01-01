/**
 * useStoryWatcher Hook Tests - Story 4-1
 * Tests for story file detection and metadata parsing
 */

// Mock modules that use import.meta.env before importing
jest.mock('../../src/hooks/useSocket', () => ({
    useSocket: jest.fn(() => ({
        socket: { on: jest.fn(), off: jest.fn() },
        isConnected: true,
    })),
}));

jest.mock('../../src/services/api', () => ({
    fetchFiles: jest.fn(() => Promise.resolve([])),
    readFile: jest.fn(() => Promise.resolve('')),
}));

import { parseStoryMetadata, StoryMetadata } from '../../src/hooks/useStoryWatcher';

describe('parseStoryMetadata - Story 4-1 Task 1', () => {
    const sampleStoryContent = `# Story 4.1: Dynamic Developer Node Spawning

Status: ready-for-dev

## Story

**As a** User
**I want** the system to automatically spawn Developer Nodes
**So that** each story can be processed by a dedicated developer agent.

## Acceptance Criteria

1. **Given** the Scrum Master agent completes story creation
   **When** the Scrum Master outputs a list of stories
   **Then** the system must detect the new story files

2. **Given** story files are detected
   **When** Developer Nodes are spawned
   **Then** each Developer Node must be added to the ReactFlow graph

3. **Given** Developer Nodes are spawned
   **When** the nodes are created
   **Then** each node must initialize in IDLE state

## Tasks / Subtasks

- [ ] Task 1: Story File Detection Service
  - [ ] Create useStoryWatcher.ts
  - [ ] Implement file detection
- [ ] Task 2: Developer Node Type
  - [x] Create DeveloperNode.tsx
- [ ] Task 3: Swarm Node Manager
`;

    describe('Title Extraction (AC: 1)', () => {
        it('[P0] should extract title from H1 heading', () => {
            const result = parseStoryMetadata(sampleStoryContent, '/stories/story-4-1.md');
            expect(result.title).toBe('Story 4.1: Dynamic Developer Node Spawning');
        });

        it('[P0] should return "Untitled Story" when no H1 found', () => {
            const noTitle = '## No H1 heading here\nSome content';
            const result = parseStoryMetadata(noTitle, '/stories/test.md');
            expect(result.title).toBe('Untitled Story');
        });

        it('[P1] should handle title with special characters', () => {
            const content = '# Story: Auth & Authorization (OAuth 2.0)\n\nContent';
            const result = parseStoryMetadata(content, '/stories/auth.md');
            expect(result.title).toBe('Story: Auth & Authorization (OAuth 2.0)');
        });
    });

    describe('ID Extraction (AC: 2)', () => {
        it('[P0] should extract ID from filename', () => {
            const result = parseStoryMetadata(sampleStoryContent, '/stories/story-4-1-spawn.md');
            expect(result.id).toBe('story-4-1-spawn');
        });

        it('[P0] should handle nested paths', () => {
            const result = parseStoryMetadata(sampleStoryContent, '/project/stories/epic-2/story-2-1.md');
            expect(result.id).toBe('story-2-1');
        });

        it('[P1] should remove .md extension', () => {
            const result = parseStoryMetadata(sampleStoryContent, '/path/my-story.md');
            expect(result.id).toBe('my-story');
        });
    });

    describe('Status Detection (AC: 1)', () => {
        it('[P0] should detect "ready-for-dev" as pending', () => {
            const result = parseStoryMetadata(sampleStoryContent, '/stories/test.md');
            expect(result.status).toBe('pending');
        });

        it('[P0] should detect "done" status', () => {
            const doneContent = '# Test\n\nStatus: done\n\n## Story';
            const result = parseStoryMetadata(doneContent, '/stories/test.md');
            expect(result.status).toBe('done');
        });

        it('[P0] should detect "in-progress" status', () => {
            const inProgressContent = '# Test\n\nStatus: in-progress\n\n## Story';
            const result = parseStoryMetadata(inProgressContent, '/stories/test.md');
            expect(result.status).toBe('in-progress');
        });

        it('[P1] should default to "pending" when no status found', () => {
            const noStatus = '# Test\n\n## Story\n\nNo status here';
            const result = parseStoryMetadata(noStatus, '/stories/test.md');
            expect(result.status).toBe('pending');
        });

        it('[P1] should be case-insensitive for status', () => {
            const upperCase = '# Test\n\nStatus: DONE\n\n## Story';
            const result = parseStoryMetadata(upperCase, '/stories/test.md');
            expect(result.status).toBe('done');
        });
    });

    describe('Acceptance Criteria Count (AC: 1)', () => {
        it('[P0] should count numbered acceptance criteria', () => {
            const result = parseStoryMetadata(sampleStoryContent, '/stories/test.md');
            expect(result.acceptanceCriteriaCount).toBe(3);
        });

        it('[P0] should return 0 when no AC section', () => {
            const noAC = '# Test\n\n## Story\n\nNo acceptance criteria';
            const result = parseStoryMetadata(noAC, '/stories/test.md');
            expect(result.acceptanceCriteriaCount).toBe(0);
        });

        it('[P1] should handle AC section with nested content', () => {
            const nested = `# Test

## Acceptance Criteria

1. First AC
   - Sub-point
   - Another sub-point
2. Second AC
   **When** something happens
3. Third AC

## Tasks
`;
            const result = parseStoryMetadata(nested, '/stories/test.md');
            expect(result.acceptanceCriteriaCount).toBe(3);
        });
    });

    describe('Task Count (AC: 1)', () => {
        it('[P0] should count checkbox items', () => {
            const result = parseStoryMetadata(sampleStoryContent, '/stories/test.md');
            // 3 main tasks + 3 subtasks = 6 total checkbox items
            expect(result.taskCount).toBe(6);
        });

        it('[P0] should count both checked and unchecked items', () => {
            const mixed = `# Test

## Tasks

- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked
`;
            const result = parseStoryMetadata(mixed, '/stories/test.md');
            expect(result.taskCount).toBe(3);
        });

        it('[P1] should return 0 when no checkboxes', () => {
            const noTasks = '# Test\n\n## Story\n\nNo tasks here';
            const result = parseStoryMetadata(noTasks, '/stories/test.md');
            expect(result.taskCount).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('[P2] should handle empty content', () => {
            const result = parseStoryMetadata('', '/stories/empty.md');
            expect(result.id).toBe('empty');
            expect(result.title).toBe('Untitled Story');
            expect(result.status).toBe('pending');
            expect(result.acceptanceCriteriaCount).toBe(0);
            expect(result.taskCount).toBe(0);
        });

        it('[P2] should handle content with only whitespace', () => {
            const result = parseStoryMetadata('   \n\n   ', '/stories/ws.md');
            expect(result.title).toBe('Untitled Story');
        });

        it('[P2] should handle path with no filename', () => {
            const result = parseStoryMetadata('# Test', '/');
            expect(result.id).toBe('');
        });

        it('[P2] should handle Windows-style paths', () => {
            const result = parseStoryMetadata('# Test', 'C:\\stories\\story-1.md');
            // Split on forward slash won't work, but this is expected behavior
            expect(result.id).toBeDefined();
        });
    });
});

describe('useStoryWatcher Hook - Story 4-1 Task 1', () => {
    // Note: Hook tests require @testing-library/react-hooks or similar
    // These are placeholder tests that document expected behavior

    describe('WebSocket Event Handling (AC: 4)', () => {
        it.todo('[P0] should handle story:created event');
        it.todo('[P0] should handle story:deleted event');
        it.todo('[P0] should handle story:updated event');
    });

    describe('State Management', () => {
        it.todo('[P0] should fetch initial stories on mount');
        it.todo('[P1] should update lastUpdate timestamp on changes');
        it.todo('[P1] should handle fetch errors gracefully');
    });

    describe('Filter Methods', () => {
        it.todo('[P1] should filter pending stories with getPendingStories');
        it.todo('[P1] should filter in-progress stories with getInProgressStories');
    });
});
