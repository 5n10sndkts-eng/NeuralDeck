
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { CheckpointService } = require('../checkpointService.cjs');

describe('CheckpointService', () => {
    let tempDir;
    let service;
    const TEST_FILE = 'test-file.txt';

    beforeEach(async () => {
        // Create a unique temp directory for each test
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuraldeck-test-'));
        service = new CheckpointService(tempDir);
        await service.initialize();
    });

    afterEach(async () => {
        // Cleanup temp directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('Failed to cleanup temp dir:', e);
        }
    });

    test('should create a checkpoint', async () => {
        const content = 'initial content';
        const checkpoint = await service.createCheckpoint(TEST_FILE, content, 'test-agent', 'Initial save');

        expect(checkpoint).toBeDefined();
        expect(checkpoint.id).toBeDefined();
        expect(checkpoint.filePath).toBe(TEST_FILE);
        expect(checkpoint.agentId).toBe('test-agent');

        // Verify file exists on disk
        const storedContent = await service.getCheckpointContent(checkpoint.id);
        expect(storedContent).toBe(content);
    });

    test('should list checkpoints for a file', async () => {
        await service.createCheckpoint(TEST_FILE, 'v1', 'agent', 'v1');
        await new Promise(resolve => setTimeout(resolve, 10)); // Ensure timestamp diff
        await service.createCheckpoint(TEST_FILE, 'v2', 'agent', 'v2');

        const checkpoints = await service.getCheckpoints(TEST_FILE);
        expect(checkpoints).toHaveLength(2);
        expect(checkpoints[0].summary).toBe('v2'); // Newest first
        expect(checkpoints[1].summary).toBe('v1');
    });

    test('should restore a checkpoint', async () => {
        // Setup initial state
        const filePath = path.join(tempDir, TEST_FILE);
        await fs.writeFile(filePath, 'current content');

        // Create a checkpoint
        const checkpoint = await service.createCheckpoint(filePath, 'old content', 'agent', 'backup');

        // Restore
        const result = await service.restoreCheckpoint(checkpoint.id);

        expect(result.success).toBe(true);

        // precise delay to ensure fs flush
        await new Promise(resolve => setTimeout(resolve, 50));

        const restoredContent = await fs.readFile(filePath, 'utf-8');
        expect(restoredContent).toBe('old content');

        // Should have created a safety backup of 'current content'
        const newCheckpoints = await service.getCheckpoints(filePath);
        expect(newCheckpoints.length).toBeGreaterThan(1);
        expect(newCheckpoints[0].summary).toContain('Safety backup');
    });

    test('should delete a checkpoint', async () => {
        // Create enough checkpoints to allow deletion (min retention is 10 by default)
        // We need to override config to allow deletion with fewer files or create many
        service = new CheckpointService(tempDir, { minCheckpointsPerFile: 0 });
        await service.initialize();

        const checkpoint = await service.createCheckpoint(TEST_FILE, 'content', 'agent', 'save');

        await service.deleteCheckpoint(checkpoint.id);

        const checkpoints = await service.getCheckpoints(TEST_FILE);
        expect(checkpoints).toHaveLength(0);
    });

    test('should cleanup old checkpoints', async () => {
        const config = {
            maxAgeMs: 100, // 100ms retention
            minCheckpointsPerFile: 1,
            autoCleanupIntervalMs: 1000
        };
        service = new CheckpointService(tempDir, config);
        await service.initialize();

        // Create an old checkpoint
        const cp1 = await service.createCheckpoint(TEST_FILE, 'old', 'agent', 'old');
        // Manually backdate it
        service.index.checkpoints[cp1.id].timestamp = Date.now() - 1000;
        await service.saveIndex();

        // Create a new checkpoint (will be kept as minCheckpointsPerFile = 1)
        await service.createCheckpoint(TEST_FILE, 'new', 'agent', 'new');

        // Run cleanup
        const result = await service.cleanup();

        expect(result.deletedCount).toBeGreaterThan(0);
        const checkpoints = await service.getCheckpoints(TEST_FILE);
        expect(checkpoints).toHaveLength(1);
        expect(checkpoints[0].summary).toBe('new');
    });
});
