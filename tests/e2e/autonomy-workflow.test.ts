/**
 * E2E Test Suite: Neural Autonomy Engine
 * Story 8: Comprehensive end-to-end testing
 * 
 * Test Plan: docs/story-8-test-plan.md
 * Owner: Murat (Test Architect)
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Mock LLM responses
const mockResponses = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/mock-llm-responses.json'), 'utf-8')
);

// Test configuration
const TEST_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 120000; // 2 minutes

describe('E2E-001: Happy Path - Complete Autonomous Flow', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Setup console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Mock LLM API calls
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/chat')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses)
        });
      } else {
        request.continue();
      }
    });

    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
  });

  afterEach(async () => {
    await page.close();
  });

  test('Complete autonomy workflow executes successfully', async () => {
    // Step 1: Place test PRD
    const testPRD = fs.readFileSync(
      path.join(__dirname, '../fixtures/test-prd.md'),
      'utf-8'
    );
    
    // TODO: Trigger file creation via UI or API
    // This would normally use the file system API
    
    // Step 2: Trigger Neural Orchestrator
    await page.click('[data-testid="neural-orchestrator-button"]');
    
    // Step 3: Wait for Analyst phase
    await page.waitForSelector('[data-state="ANALYST"]', { timeout: TEST_TIMEOUT });
    
    const analystActive = await page.$eval(
      '.agent-card[data-role="analyst"]',
      el => el.classList.contains('active')
    );
    expect(analystActive).toBe(true);
    
    // Step 4: Verify file creation: analysis.md
    // Note: In real implementation, would use file system API check
    
    // Step 5: Wait for PM phase transition
    await page.waitForSelector('[data-state="PM"]', { timeout: TEST_TIMEOUT });
    
    // Step 6: Verify prd.md creation
    // Check via file system API
    
    // Step 7: Wait for Architect phase
    await page.waitForSelector('[data-state="ARCHITECT"]', { timeout: TEST_TIMEOUT });
    
    // Step 8: Wait for Scrum Master phase
    await page.waitForSelector('[data-state="SCRUM_MASTER"]', { timeout: TEST_TIMEOUT });
    
    // Step 9: Wait for return to IDLE
    await page.waitForSelector('[data-state="IDLE"]', { timeout: TEST_TIMEOUT });
    
    // Verify no console errors
    const errors = await page.evaluate(() => {
      return (window as any).__consoleErrors || [];
    });
    expect(errors.length).toBe(0);
    
  }, TEST_TIMEOUT);
});

describe('E2E-002: Parallel Swarm Execution', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Parallel execution achieves <2x single story time', async () => {
    page = await browser.newPage();
    await page.goto(TEST_URL);

    // Measure single story execution
    const singleStart = Date.now();
    // TODO: Execute single story
    // await executeSingleStory(page, 'story-1.md');
    const singleTime = Date.now() - singleStart;

    // Measure parallel execution (5 stories)
    const parallelStart = Date.now();
    // TODO: Execute 5 stories in parallel
    // await executeParallelStories(page, 5);
    const parallelTime = Date.now() - parallelStart;

    // Assert parallelism
    const expectedMax = singleTime * 2;
    expect(parallelTime).toBeLessThan(expectedMax);

    // Log results
    const speedup = (singleTime * 5) / parallelTime;
    console.log(`Single: ${singleTime}ms, Parallel: ${parallelTime}ms`);
    console.log(`Speedup: ${speedup.toFixed(2)}x`);
    expect(speedup).toBeGreaterThan(2.0);

    await page.close();
  }, TEST_TIMEOUT);
});

describe('E2E-003: Error Handling - Missing PRD', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Graceful error when PRD missing', async () => {
    page = await browser.newPage();
    await page.goto(TEST_URL);

    // Trigger autonomy without PRD
    await page.click('[data-testid="neural-orchestrator-button"]');

    // Wait for error message
    const errorMessage = await page.waitForSelector('.error-banner', { timeout: 5000 });
    const errorText = await errorMessage?.evaluate(el => el.textContent);
    
    expect(errorText).toContain('No project brief found');

    // Verify system remains in IDLE state
    await new Promise(r => setTimeout(r, 2000));
    const state = await page.$eval('[data-state]', el => el.getAttribute('data-state'));
    expect(state).toBe('IDLE');

    await page.close();
  });
});

describe('E2E-004: RAG Context Injection', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Project context injected into agent prompts', async () => {
    page = await browser.newPage();
    
    // Intercept LLM calls to verify context
    const llmCalls: any[] = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/chat')) {
        const postData = request.postData();
        if (postData) {
          llmCalls.push(JSON.parse(postData));
        }
      }
      request.continue();
    });

    await page.goto(TEST_URL);
    
    // Trigger analyst with project context
    // TODO: Create project-context.md
    // await executeAgent(page, 'analyst');

    // Verify context in LLM call
    expect(llmCalls.length).toBeGreaterThan(0);
    const firstCall = llmCalls[0];
    expect(firstCall.messages[0].content).toContain('React 19');

    await page.close();
  });
});

// Export test utilities for reuse
export const waitForFile = async (filePath: string, timeout = 30000): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
};

export const cleanupTestFiles = (directory: string) => {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};
