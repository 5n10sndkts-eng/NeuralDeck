import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration for NeuralDeck
 * 
 * This configuration follows TEA knowledge base patterns:
 * - Standardized timeouts (action 15s, navigation 30s, expect 10s, test 60s)
 * - Failure-only artifact capture (screenshots, videos, traces)
 * - HTML + JUnit reporters for CI integration
 * - Multi-browser support (chromium, firefox, webkit)
 * - Parallel execution with worker management
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],

  // Shared backend state makes strict parallelism flaky; run tests deterministically.
  fullyParallel: false,

  // Prevent .only() from blocking CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Worker configuration
  workers: 1,

  // Global test timeout: 60 seconds
  timeout: 60 * 1000,

  // Expect timeout: 10 seconds
  expect: {
    timeout: 10 * 1000,
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Shared settings for all tests
  use: {
    // Base URL (Vite dev server runs on port 5173)
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Action timeout: 15 seconds
    actionTimeout: 15 * 1000,

    // Navigation timeout: 30 seconds
    navigationTimeout: 30 * 1000,

    // Artifact capture (failure-only to save space)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Multi-browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server configuration (auto-start backend + frontend)
  webServer: [
    {
      command: 'env -u NO_COLOR -u FORCE_COLOR NEURAL_RATE_LIMIT_MAX=10000 node server.cjs',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
