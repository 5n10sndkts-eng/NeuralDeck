/**
 * Conflict Resolver Tests - Story 4-3
 * Tests for conflict detection, resolution, and management
 */

import {
    ConflictResolver,
    ConflictEvent,
    DeveloperChange,
    ConflictStatus,
    DEFAULT_CONFLICT_CONFIG,
    getConflictResolver,
    resetConflictResolver,
    getSmartFileAssignments,
} from '../../src/services/conflictResolver';

// Mock the API module
jest.mock('../../src/services/api', () => ({
    sendChat: jest.fn().mockResolvedValue({
        content: JSON.stringify({
            canMerge: true,
            mergedContent: 'merged content',
            strategy: 'combine',
            explanation: 'Successfully merged',
        }),
    }),
    readFile: jest.fn().mockResolvedValue('original content'),
    writeFile: jest.fn().mockResolvedValue(undefined),
}));

describe('ConflictResolver - Story 4-3', () => {
    let resolver: ConflictResolver;

    beforeEach(() => {
        resolver = new ConflictResolver();
    });

    afterEach(() => {
        resolver.reset();
        resetConflictResolver();
    });

    describe('DEFAULT_CONFLICT_CONFIG', () => {
        it('[P0] should have sensible defaults', () => {
            expect(DEFAULT_CONFLICT_CONFIG.enableAutoResolution).toBe(true);
            expect(DEFAULT_CONFLICT_CONFIG.maxAutoAttempts).toBe(2);
            expect(DEFAULT_CONFLICT_CONFIG.conflictFileExtension).toBe('.conflict');
            expect(DEFAULT_CONFLICT_CONFIG.notifyOnConflict).toBe(true);
        });
    });

    describe('Constructor', () => {
        it('[P0] should use default config', () => {
            const stats = resolver.getStats();
            expect(stats.totalConflicts).toBe(0);
            expect(stats.pending).toBe(0);
        });

        it('[P0] should accept custom config', () => {
            const customResolver = new ConflictResolver({
                enableAutoResolution: false,
                maxAutoAttempts: 5,
            });
            // Config is internal, but we can verify through behavior
            expect(customResolver.getStats().totalConflicts).toBe(0);
        });
    });

    describe('generateConflictId', () => {
        it('[P0] should generate unique IDs', async () => {
            const id1 = resolver.generateConflictId();
            await new Promise(resolve => setTimeout(resolve, 5)); // Small delay
            const id2 = resolver.generateConflictId();

            expect(id1).toMatch(/^conflict-\d+-[a-z0-9]+$/);
            expect(id2).toMatch(/^conflict-\d+-[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('detectConflict (AC: 1)', () => {
        it('[P0] should detect and register a conflict', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'content from A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'content from B',
                timestamp: Date.now(),
            };

            const conflict = await resolver.detectConflict(
                '/test/file.ts',
                developerA,
                developerB
            );

            expect(conflict.id).toMatch(/^conflict-/);
            expect(conflict.filePath).toBe('/test/file.ts');
            expect(conflict.status).toBe('pending');
            expect(conflict.developerA.nodeId).toBe('dev-1');
            expect(conflict.developerB.nodeId).toBe('dev-2');
        });

        it('[P0] should update stats on conflict detection', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'content A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'content B',
                timestamp: Date.now(),
            };

            await resolver.detectConflict('/test/file.ts', developerA, developerB);

            const stats = resolver.getStats();
            expect(stats.totalConflicts).toBe(1);
            expect(stats.pending).toBe(1);
            expect(stats.byFile.get('/test/file.ts')).toBe(1);
        });

        it('[P1] should call onConflictDetected callback', async () => {
            const callback = jest.fn();
            resolver.setCallbacks({ onConflictDetected: callback });

            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            await resolver.detectConflict('/test/file.ts', developerA, developerB);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                filePath: '/test/file.ts',
            }));
        });
    });

    describe('getConflict', () => {
        it('[P0] should retrieve conflict by ID', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            const conflict = await resolver.detectConflict('/test/file.ts', developerA, developerB);
            const retrieved = resolver.getConflict(conflict.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(conflict.id);
        });

        it('[P0] should return undefined for non-existent conflict', () => {
            const retrieved = resolver.getConflict('non-existent-id');
            expect(retrieved).toBeUndefined();
        });
    });

    describe('getAllConflicts', () => {
        it('[P0] should return all conflicts', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            await resolver.detectConflict('/test/file1.ts', developerA, developerB);
            await resolver.detectConflict('/test/file2.ts', developerA, developerB);

            const conflicts = resolver.getAllConflicts();
            expect(conflicts).toHaveLength(2);
        });
    });

    describe('getPendingConflicts', () => {
        it('[P0] should return only pending conflicts', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            await resolver.detectConflict('/test/file1.ts', developerA, developerB);
            const conflict2 = await resolver.detectConflict('/test/file2.ts', developerA, developerB);

            // Manually resolve one
            await resolver.resolveManually(conflict2.id, 'resolved content');

            const pending = resolver.getPendingConflicts();
            expect(pending).toHaveLength(1);
        });
    });

    describe('getConflictsByFile', () => {
        it('[P0] should filter conflicts by file path', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            await resolver.detectConflict('/test/file1.ts', developerA, developerB);
            await resolver.detectConflict('/test/file2.ts', developerA, developerB);

            const file1Conflicts = resolver.getConflictsByFile('/test/file1.ts');
            expect(file1Conflicts).toHaveLength(1);
        });
    });

    describe('getConflictsByDeveloper', () => {
        it('[P0] should filter conflicts by developer node ID', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };
            const developerC: DeveloperChange = {
                nodeId: 'dev-3',
                storyId: 'story-3',
                content: 'C',
                timestamp: Date.now(),
            };

            await resolver.detectConflict('/test/file1.ts', developerA, developerB);
            await resolver.detectConflict('/test/file2.ts', developerA, developerC);

            const dev1Conflicts = resolver.getConflictsByDeveloper('dev-1');
            expect(dev1Conflicts).toHaveLength(2); // Involved in both

            const dev2Conflicts = resolver.getConflictsByDeveloper('dev-2');
            expect(dev2Conflicts).toHaveLength(1); // Only in first
        });
    });

    describe('resolveManually (AC: 2, 4)', () => {
        it('[P0] should resolve conflict with provided content', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            const conflict = await resolver.detectConflict('/test/file.ts', developerA, developerB);
            const resolved = await resolver.resolveManually(conflict.id, 'merged content');

            expect(resolved.status).toBe('resolved');
            expect(resolved.resolution?.content).toBe('merged content');
            expect(resolved.resolution?.method).toBe('manual');
        });

        it('[P0] should update stats on manual resolution', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            const conflict = await resolver.detectConflict('/test/file.ts', developerA, developerB);
            await resolver.resolveManually(conflict.id, 'merged content');

            const stats = resolver.getStats();
            expect(stats.manualResolved).toBe(1);
            expect(stats.pending).toBe(0);
        });

        it('[P0] should throw for non-existent conflict', async () => {
            await expect(
                resolver.resolveManually('non-existent', 'content')
            ).rejects.toThrow('Conflict not found');
        });

        it('[P1] should call onConflictResolved callback', async () => {
            const callback = jest.fn();
            resolver.setCallbacks({ onConflictResolved: callback });

            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            const conflict = await resolver.detectConflict('/test/file.ts', developerA, developerB);
            await resolver.resolveManually(conflict.id, 'merged content');

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('clearResolved', () => {
        it('[P0] should remove resolved conflicts', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            const conflict1 = await resolver.detectConflict('/test/file1.ts', developerA, developerB);
            await resolver.detectConflict('/test/file2.ts', developerA, developerB);

            await resolver.resolveManually(conflict1.id, 'resolved');

            const cleared = resolver.clearResolved();
            expect(cleared).toBe(1);
            expect(resolver.getAllConflicts()).toHaveLength(1);
        });
    });

    describe('reset', () => {
        it('[P0] should clear all state', async () => {
            const developerA: DeveloperChange = {
                nodeId: 'dev-1',
                storyId: 'story-1',
                content: 'A',
                timestamp: Date.now(),
            };
            const developerB: DeveloperChange = {
                nodeId: 'dev-2',
                storyId: 'story-2',
                content: 'B',
                timestamp: Date.now(),
            };

            await resolver.detectConflict('/test/file.ts', developerA, developerB);

            resolver.reset();

            expect(resolver.getAllConflicts()).toHaveLength(0);
            const stats = resolver.getStats();
            expect(stats.totalConflicts).toBe(0);
        });
    });

    describe('Singleton getConflictResolver', () => {
        it('[P0] should return same instance', () => {
            resetConflictResolver();

            const resolver1 = getConflictResolver();
            const resolver2 = getConflictResolver();

            expect(resolver1).toBe(resolver2);
        });

        it('[P1] should accept initial config', () => {
            resetConflictResolver();

            const resolver = getConflictResolver({
                enableAutoResolution: false,
            });

            expect(resolver.getStats().totalConflicts).toBe(0);
        });
    });
});

describe('Smart File Assignments (AC: 5)', () => {
    it('[P0] should assign files based on conflict history', () => {
        const conflicts: ConflictEvent[] = [
            {
                id: 'c1',
                filePath: '/src/file1.ts',
                originalContent: '',
                developerA: { nodeId: 'dev-1', storyId: 's1', content: '', timestamp: 0 },
                developerB: { nodeId: 'dev-2', storyId: 's2', content: '', timestamp: 0 },
                status: 'resolved',
                createdAt: 0,
                updatedAt: 0,
                logs: [],
            },
            {
                id: 'c2',
                filePath: '/src/file1.ts',
                originalContent: '',
                developerA: { nodeId: 'dev-1', storyId: 's1', content: '', timestamp: 0 },
                developerB: { nodeId: 'dev-3', storyId: 's3', content: '', timestamp: 0 },
                status: 'resolved',
                createdAt: 0,
                updatedAt: 0,
                logs: [],
            },
        ];

        const files = ['/src/file1.ts', '/src/file2.ts'];
        const developers = ['dev-1', 'dev-2', 'dev-3'];

        const assignments = getSmartFileAssignments(conflicts, files, developers);

        // dev-1 has 2 conflicts with file1.ts, so file1 should go to dev-2 or dev-3
        const file1Assignee = assignments.get('/src/file1.ts');
        expect(file1Assignee).not.toBe('dev-1');
    });

    it('[P0] should handle empty conflict history', () => {
        const files = ['/src/file1.ts'];
        const developers = ['dev-1', 'dev-2'];

        const assignments = getSmartFileAssignments([], files, developers);

        expect(assignments.get('/src/file1.ts')).toBe('dev-1'); // First developer
    });
});
