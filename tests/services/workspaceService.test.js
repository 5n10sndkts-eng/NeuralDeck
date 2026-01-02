/**
 * Tests for Workspace Service
 * Tests path validation and security checks
 */

const { workspaceService, NEURALDECK_DIR } = require('../../server/services/workspaceService.cjs');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('[P0] Workspace Service Security', () => {
    const testWorkspacePath = path.join(os.tmpdir(), 'neuraldeck-test-workspace');
    
    beforeAll(async () => {
        // Create test workspace directory
        await fs.mkdir(testWorkspacePath, { recursive: true });
        await fs.writeFile(path.join(testWorkspacePath, 'test.txt'), 'test content');
    });

    afterAll(async () => {
        // Clean up test workspace
        try {
            await fs.rm(testWorkspacePath, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    });

    test('should reject NeuralDeck source directory', async () => {
        const result = await workspaceService.validateWorkspacePath(NEURALDECK_DIR);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('NeuralDeck application directory');
    });

    test('should reject parent of NeuralDeck directory', async () => {
        const parent = path.dirname(NEURALDECK_DIR);
        const result = await workspaceService.validateWorkspacePath(parent);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('parent directory');
    });

    test('should reject system directories', async () => {
        const result = await workspaceService.validateWorkspacePath('/usr');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('system directory');
    });

    test('should reject node_modules directory', async () => {
        const nmPath = path.join(testWorkspacePath, 'node_modules');
        await fs.mkdir(nmPath, { recursive: true });
        
        const result = await workspaceService.validateWorkspacePath(nmPath);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('node_modules');
        
        await fs.rm(nmPath, { recursive: true });
    });

    test('should accept valid workspace directory', async () => {
        const result = await workspaceService.validateWorkspacePath(testWorkspacePath);
        expect(result.valid).toBe(true);
        expect(result.fileCount).toBeGreaterThan(0);
    });

    test('should detect non-existent paths', async () => {
        const result = await workspaceService.validateWorkspacePath('/nonexistent/path/12345');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not exist');
    });

    test('should add and retrieve workspaces', async () => {
        await workspaceService.init();
        
        const workspace = await workspaceService.addWorkspace(testWorkspacePath, 'Test Workspace');
        expect(workspace.id).toBeDefined();
        expect(workspace.path).toBe(testWorkspacePath);
        expect(workspace.name).toBe('Test Workspace');

        const workspaces = await workspaceService.getRecentWorkspaces();
        expect(workspaces.length).toBeGreaterThan(0);
        expect(workspaces[0].id).toBe(workspace.id);

        // Cleanup
        await workspaceService.removeWorkspace(workspace.id);
    });

    test('should activate and retrieve active workspace', async () => {
        await workspaceService.init();
        
        const workspace = await workspaceService.addWorkspace(testWorkspacePath, 'Test Active');
        await workspaceService.setActiveWorkspace(workspace.id);
        
        const active = await workspaceService.getActiveWorkspace();
        expect(active).toBeDefined();
        expect(active.id).toBe(workspace.id);

        // Cleanup
        await workspaceService.removeWorkspace(workspace.id);
    });
});
