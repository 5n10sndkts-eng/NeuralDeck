import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @security Path Traversal Prevention Tests
 * Validates that workspace validation prevents access to NeuralDeck source
 */
test.describe('@security Workspace Security', () => {
    const testWorkspacePath = path.join(os.tmpdir(), 'neuraldeck-e2e-test-workspace');
    const neuraldeckPath = path.resolve(__dirname, '../../..');

    test.beforeAll(async () => {
        // Create test workspace
        if (!fs.existsSync(testWorkspacePath)) {
            fs.mkdirSync(testWorkspacePath, { recursive: true });
        }
        fs.writeFileSync(path.join(testWorkspacePath, 'README.md'), '# Test Workspace');
    });

    test.afterAll(async () => {
        // Cleanup
        if (fs.existsSync(testWorkspacePath)) {
            fs.rmSync(testWorkspacePath, { recursive: true, force: true });
        }
    });

    test('[P0] should prevent NeuralDeck source directory as workspace', async ({ request }) => {
        const response = await request.post('http://localhost:3001/api/workspaces/validate', {
            data: { path: neuraldeckPath }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        expect(data.valid).toBe(false);
        expect(data.error).toContain('NeuralDeck');
    });

    test('[P0] should prevent parent of NeuralDeck directory', async ({ request }) => {
        const parent = path.dirname(neuraldeckPath);
        const response = await request.post('http://localhost:3001/api/workspaces/validate', {
            data: { path: parent }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        expect(data.valid).toBe(false);
        expect(data.error).toContain('parent directory');
    });

    test('[P0] should prevent system directories', async ({ request }) => {
        const response = await request.post('http://localhost:3001/api/workspaces/validate', {
            data: { path: '/usr' }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        expect(data.valid).toBe(false);
        expect(data.error).toContain('system directory');
    });

    test('[P0] should allow valid workspace directory', async ({ request }) => {
        const response = await request.post('http://localhost:3001/api/workspaces/validate', {
            data: { path: testWorkspacePath }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        expect(data.valid).toBe(true);
        expect(data.fileCount).toBeGreaterThan(0);
    });

    test('[P0] workspace creation and activation flow', async ({ request }) => {
        // Add workspace
        const addResponse = await request.post('http://localhost:3001/api/workspaces', {
            data: { 
                path: testWorkspacePath,
                name: 'E2E Test Workspace'
            }
        });

        expect(addResponse.ok()).toBeTruthy();
        const addData = await addResponse.json();
        
        expect(addData.workspace).toBeDefined();
        expect(addData.workspace.path).toBe(testWorkspacePath);
        expect(addData.workspace.name).toBe('E2E Test Workspace');
        
        const workspaceId = addData.workspace.id;

        // Activate workspace
        const activateResponse = await request.post(`http://localhost:3001/api/workspaces/${workspaceId}/activate`);
        expect(activateResponse.ok()).toBeTruthy();

        // Verify it's active
        const listResponse = await request.get('http://localhost:3001/api/workspaces');
        expect(listResponse.ok()).toBeTruthy();
        
        const listData = await listResponse.json();
        expect(listData.active).toBeDefined();
        expect(listData.active.id).toBe(workspaceId);

        // Cleanup - remove workspace
        const removeResponse = await request.delete(`http://localhost:3001/api/workspaces/${workspaceId}`);
        expect(removeResponse.ok()).toBeTruthy();
    });

    test('[P0] file operations should respect workspace boundaries', async ({ request }) => {
        // Add and activate workspace
        const addResponse = await request.post('http://localhost:3001/api/workspaces', {
            data: { path: testWorkspacePath, name: 'Boundary Test' }
        });
        const { workspace } = await addResponse.json();
        await request.post(`http://localhost:3001/api/workspaces/${workspace.id}/activate`);

        // Try to read file within workspace (should work)
        const readResponse = await request.post('http://localhost:3001/api/read', {
            data: { 
                filePath: 'README.md',
                workspaceId: workspace.id
            }
        });
        expect(readResponse.ok()).toBeTruthy();

        // Try path traversal outside workspace (should fail)
        const traversalResponse = await request.post('http://localhost:3001/api/read', {
            data: { 
                filePath: '../../server.cjs',
                workspaceId: workspace.id
            }
        });
        expect(traversalResponse.ok()).toBeFalsy();

        // Cleanup
        await request.delete(`http://localhost:3001/api/workspaces/${workspace.id}`);
    });
});
