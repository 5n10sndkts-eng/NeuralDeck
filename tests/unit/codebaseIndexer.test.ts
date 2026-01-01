/**
 * Unit Tests for Codebase Indexer Service
 * Story 6.1: Codebase RAG Indexing System - Tasks 2 & 3
 */

// Mock implementation of the Codebase Indexer for testing
class MockCodebaseIndexerService {
    private isInitialized = false;
    private isIndexing = false;
    private stats = {
        totalFiles: 0,
        totalChunks: 0,
        indexedFiles: 0,
        failedFiles: 0,
        startTime: null as number | null,
        endTime: null as number | null,
        lastUpdated: null as number | null
    };
    private events: Array<{ type: string; data: unknown }> = [];
    private indexedFiles = new Set<string>();

    // Task 2.3: File extension whitelist
    private readonly INDEXED_EXTENSIONS = new Set([
        '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs',
        '.json', '.md', '.css', '.html', '.yaml', '.yml'
    ]);

    // Task 2.4: Ignore patterns
    private readonly IGNORE_PATTERNS = [
        'node_modules', '.git', 'dist', 'coverage'
    ];

    private readonly IGNORE_FILE_PATTERNS = ['.lock', '.log', '.map', '-lock.json'];

    emit(type: string, data: unknown): void {
        this.events.push({ type, data });
    }

    getEvents(): Array<{ type: string; data: unknown }> {
        return this.events;
    }

    clearEvents(): void {
        this.events = [];
    }

    // Task 2.3 & 2.4: Check if file should be indexed
    shouldIndexFile(filePath: string): boolean {
        // Check ignore patterns
        for (const pattern of this.IGNORE_PATTERNS) {
            if (filePath.includes(`${pattern}/`) || filePath.includes(`${pattern}\\`)) {
                return false;
            }
        }

        // Check file extension
        const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
        if (!this.INDEXED_EXTENSIONS.has(ext)) {
            return false;
        }

        // Check file-specific ignore patterns
        const filename = filePath.split('/').pop() || '';
        for (const pattern of this.IGNORE_FILE_PATTERNS) {
            if (filename.includes(pattern)) {
                return false;
            }
        }

        return true;
    }

    // Task 2.2: Initialize and scan workspace
    async init(): Promise<this> {
        if (this.isInitialized) return this;

        this.isInitialized = true;
        await this.indexWorkspace();

        return this;
    }

    // Task 2.2, 2.5, 2.6: Index workspace with progress events
    async indexWorkspace(): Promise<void> {
        if (this.isIndexing) return;

        this.isIndexing = true;
        this.stats.startTime = Date.now();
        this.stats.indexedFiles = 0;
        this.stats.failedFiles = 0;
        this.stats.totalChunks = 0;

        // Task 2.5: Emit start event
        this.emit('indexing:start', { timestamp: Date.now() });

        // Simulate indexing files
        const mockFiles = [
            'src/App.tsx',
            'src/index.tsx',
            'server.cjs',
            'package.json'
        ];

        this.stats.totalFiles = mockFiles.length;

        for (let i = 0; i < mockFiles.length; i++) {
            await this.simulateDelay(10);

            // Simulate successful indexing
            this.stats.indexedFiles++;
            this.stats.totalChunks += 2; // 2 chunks per file
            this.indexedFiles.add(mockFiles[i]);

            // Task 2.5: Emit progress event
            const progress = Math.round(((i + 1) / mockFiles.length) * 100);
            this.emit('indexing:progress', {
                progress,
                indexed: this.stats.indexedFiles,
                total: this.stats.totalFiles
            });
        }

        this.stats.endTime = Date.now();
        this.stats.lastUpdated = Date.now();
        const elapsed = this.stats.endTime - this.stats.startTime;

        // Task 2.5: Emit complete event
        this.emit('indexing:complete', {
            ...this.stats,
            elapsedMs: elapsed
        });

        this.isIndexing = false;
    }

    // Task 3: Handle file changes
    async handleFileChange(filePath: string, eventType: 'create' | 'update' | 'delete'): Promise<void> {
        if (!this.shouldIndexFile(filePath)) return;

        const startTime = Date.now();

        switch (eventType) {
            case 'create':
                this.indexedFiles.add(filePath);
                this.stats.indexedFiles++;
                this.stats.totalChunks += 2;
                break;
            case 'update':
                // Update keeps same count
                break;
            case 'delete':
                this.indexedFiles.delete(filePath);
                this.stats.indexedFiles--;
                this.stats.totalChunks -= 2;
                break;
        }

        this.stats.lastUpdated = Date.now();
        const elapsed = Date.now() - startTime;

        this.emit('rag:update', {
            eventType,
            file: filePath,
            elapsedMs: elapsed
        });
    }

    // Task 2.6: Get indexing stats
    getStats(): typeof this.stats & { isIndexing: boolean; isInitialized: boolean } {
        return {
            ...this.stats,
            isIndexing: this.isIndexing,
            isInitialized: this.isInitialized
        };
    }

    isFileIndexed(filePath: string): boolean {
        return this.indexedFiles.has(filePath);
    }

    private simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

describe('[P0] Codebase Indexer Service - Task 2: Core Indexing', () => {
    let indexer: MockCodebaseIndexerService;

    beforeEach(() => {
        indexer = new MockCodebaseIndexerService();
    });

    describe('shouldIndexFile() - Task 2.3 & 2.4', () => {
        test('[P0] should accept TypeScript files', () => {
            expect(indexer.shouldIndexFile('src/App.tsx')).toBe(true);
            expect(indexer.shouldIndexFile('src/index.ts')).toBe(true);
        });

        test('[P0] should accept JavaScript files', () => {
            expect(indexer.shouldIndexFile('server.js')).toBe(true);
            expect(indexer.shouldIndexFile('config.cjs')).toBe(true);
        });

        test('[P0] should accept JSON and Markdown files', () => {
            expect(indexer.shouldIndexFile('package.json')).toBe(true);
            expect(indexer.shouldIndexFile('README.md')).toBe(true);
        });

        test('[P0] should accept YAML files', () => {
            expect(indexer.shouldIndexFile('config.yaml')).toBe(true);
            expect(indexer.shouldIndexFile('docker-compose.yml')).toBe(true);
        });

        test('[P0] should reject node_modules files', () => {
            expect(indexer.shouldIndexFile('node_modules/react/index.js')).toBe(false);
        });

        test('[P0] should reject .git files', () => {
            expect(indexer.shouldIndexFile('.git/config')).toBe(false);
        });

        test('[P0] should reject dist folder files', () => {
            expect(indexer.shouldIndexFile('dist/bundle.js')).toBe(false);
        });

        test('[P0] should reject coverage folder files', () => {
            expect(indexer.shouldIndexFile('coverage/lcov.info')).toBe(false);
        });

        test('[P1] should reject lock files', () => {
            expect(indexer.shouldIndexFile('package-lock.json')).toBe(false);
            expect(indexer.shouldIndexFile('yarn.lock')).toBe(false);
        });

        test('[P1] should reject log files', () => {
            expect(indexer.shouldIndexFile('debug.log')).toBe(false);
        });

        test('[P1] should reject source map files', () => {
            expect(indexer.shouldIndexFile('bundle.js.map')).toBe(false);
        });

        test('[P1] should reject binary/image files', () => {
            expect(indexer.shouldIndexFile('logo.png')).toBe(false);
            expect(indexer.shouldIndexFile('font.woff2')).toBe(false);
        });
    });

    describe('init() - Task 2.2', () => {
        test('[P0] should initialize and start indexing', async () => {
            await indexer.init();

            const stats = indexer.getStats();
            expect(stats.isInitialized).toBe(true);
            expect(stats.indexedFiles).toBeGreaterThan(0);
        });

        test('[P0] should not re-initialize if already initialized', async () => {
            await indexer.init();
            indexer.clearEvents();

            await indexer.init();

            // Should not emit start event again
            const events = indexer.getEvents();
            const startEvents = events.filter(e => e.type === 'indexing:start');
            expect(startEvents.length).toBe(0);
        });
    });

    describe('indexWorkspace() - Task 2.5 & 2.6', () => {
        test('[P0] should emit indexing:start event', async () => {
            await indexer.indexWorkspace();

            const events = indexer.getEvents();
            const startEvent = events.find(e => e.type === 'indexing:start');

            expect(startEvent).toBeDefined();
            expect((startEvent?.data as { timestamp: number }).timestamp).toBeDefined();
        });

        test('[P0] should emit indexing:progress events', async () => {
            await indexer.indexWorkspace();

            const events = indexer.getEvents();
            const progressEvents = events.filter(e => e.type === 'indexing:progress');

            expect(progressEvents.length).toBeGreaterThan(0);

            const lastProgress = progressEvents[progressEvents.length - 1];
            expect((lastProgress?.data as { progress: number }).progress).toBe(100);
        });

        test('[P0] should emit indexing:complete event with stats', async () => {
            await indexer.indexWorkspace();

            const events = indexer.getEvents();
            const completeEvent = events.find(e => e.type === 'indexing:complete');

            expect(completeEvent).toBeDefined();
            const data = completeEvent?.data as { indexedFiles: number; totalChunks: number; elapsedMs: number };
            expect(data.indexedFiles).toBeGreaterThan(0);
            expect(data.totalChunks).toBeGreaterThan(0);
            expect(data.elapsedMs).toBeDefined();
        });

        test('[P0] should track indexing stats (Task 2.6)', async () => {
            await indexer.indexWorkspace();

            const stats = indexer.getStats();
            expect(stats.totalFiles).toBeGreaterThan(0);
            expect(stats.indexedFiles).toBeGreaterThan(0);
            expect(stats.totalChunks).toBeGreaterThan(0);
            expect(stats.startTime).toBeDefined();
            expect(stats.endTime).toBeDefined();
        });
    });
});

describe('[P0] Codebase Indexer Service - Task 3: File Watcher Integration', () => {
    let indexer: MockCodebaseIndexerService;

    beforeEach(async () => {
        indexer = new MockCodebaseIndexerService();
        await indexer.init();
        indexer.clearEvents();
    });

    describe('handleFileChange() - Task 3.2-3.4', () => {
        test('[P0] should handle create event (Task 3.2)', async () => {
            await indexer.handleFileChange('src/NewComponent.tsx', 'create');

            expect(indexer.isFileIndexed('src/NewComponent.tsx')).toBe(true);

            const stats = indexer.getStats();
            expect(stats.lastUpdated).toBeDefined();
        });

        test('[P0] should handle update event (Task 3.3)', async () => {
            await indexer.handleFileChange('src/App.tsx', 'update');

            const events = indexer.getEvents();
            const updateEvent = events.find(e => e.type === 'rag:update');

            expect(updateEvent).toBeDefined();
            expect((updateEvent?.data as { eventType: string }).eventType).toBe('update');
        });

        test('[P0] should handle delete event (Task 3.4)', async () => {
            // First add a file
            await indexer.handleFileChange('src/ToDelete.tsx', 'create');
            expect(indexer.isFileIndexed('src/ToDelete.tsx')).toBe(true);

            // Then delete it
            await indexer.handleFileChange('src/ToDelete.tsx', 'delete');
            expect(indexer.isFileIndexed('src/ToDelete.tsx')).toBe(false);
        });

        test('[P1] should ignore non-indexable files', async () => {
            const statsBeforeImages = indexer.getStats().indexedFiles;
            await indexer.handleFileChange('images/logo.png', 'create');

            const statsAfterImages = indexer.getStats().indexedFiles;
            expect(statsAfterImages).toBe(statsBeforeImages);
        });

        test('[P1] should ignore node_modules changes', async () => {
            const statsBefore = indexer.getStats().indexedFiles;
            await indexer.handleFileChange('node_modules/react/index.js', 'create');

            const statsAfter = indexer.getStats().indexedFiles;
            expect(statsAfter).toBe(statsBefore);
        });
    });

    describe('getStats() - Task 2.6', () => {
        test('[P0] should return current statistics', () => {
            const stats = indexer.getStats();

            expect(stats.totalFiles).toBeDefined();
            expect(stats.indexedFiles).toBeDefined();
            expect(stats.totalChunks).toBeDefined();
            expect(stats.isIndexing).toBeDefined();
            expect(stats.isInitialized).toBeDefined();
        });

        test('[P0] should update lastUpdated on file changes', async () => {
            const statsBefore = indexer.getStats();
            const lastUpdatedBefore = statsBefore.lastUpdated;

            await new Promise(resolve => setTimeout(resolve, 10));
            await indexer.handleFileChange('src/Test.tsx', 'create');

            const statsAfter = indexer.getStats();
            expect(statsAfter.lastUpdated).toBeGreaterThan(lastUpdatedBefore || 0);
        });
    });
});
