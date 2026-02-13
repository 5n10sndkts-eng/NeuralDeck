/**
 * E2E Test: Terminal Chat Interactions
 *
 * Validates chat message sending, display, and LLM integration.
 * Tests mock the LLM endpoint to ensure deterministic results.
 * Priority: P0
 */

import { test, expect } from '../../support/fixtures';
import { createIsolatedWorkspace, cleanupIsolatedWorkspace, type E2EWorkspace } from '../../support/helpers/workspace';

test.describe('Terminal Chat', () => {
  let workspace: E2EWorkspace | null = null;

  // The terminal input selector - uses the CyberInput with dynamic placeholder
  const inputSelector = 'input[placeholder*="INSTRUCTION" i], input[placeholder*="COMMAND" i], .cyber-input';

  test('[P0] should display terminal with input field', async ({ page, request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-chat-input`);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: 'Workspace', exact: true }).click();
      await page.waitForTimeout(1_000);

      // THEN the terminal input should be visible
      const input = page.locator(inputSelector).last();
      await expect(input).toBeVisible({ timeout: 15_000 });
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should send a message and display it in chat', async ({ page, request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-chat-send`);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: 'Workspace', exact: true }).click();
      await page.waitForTimeout(1_000);

      // Mock the chat API to return a controlled response
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            role: 'assistant',
            content: 'Hello! I am the NeuralDeck assistant.',
            timestamp: Date.now(),
          }),
        });
      });

      // WHEN typing and sending a message
      const input = page.locator(inputSelector).last();
      await input.fill('Hello NeuralDeck');
      await input.press('Enter');

      // THEN the user message should appear
      await expect(page.locator('text=Hello NeuralDeck')).toBeVisible({ timeout: 10_000 });

      // AND the mocked assistant response should appear
      await expect(page.locator('text=Hello! I am the NeuralDeck assistant')).toBeVisible({ timeout: 15_000 });
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should handle LLM error gracefully', async ({ page, request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-chat-err`);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: 'Workspace', exact: true }).click();
      await page.waitForTimeout(1_000);

      // Mock a failed LLM response
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'LLM provider unreachable' }),
        });
      });

      const input = page.locator(inputSelector).last();
      await input.fill('test error handling');
      await input.press('Enter');

      // User message should still appear
      await expect(page.locator('text=test error handling')).toBeVisible({ timeout: 10_000 });

      // App should still be functional
      await expect(page.getByText('NEURAL DECK')).toBeVisible();
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });

  test('[P0] should not send empty messages', async ({ page, request }, testInfo) => {
    try {
      workspace = await createIsolatedWorkspace(request, `${testInfo.project.name}-chat-empty`);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: 'Workspace', exact: true }).click();
      await page.waitForTimeout(1_000);

      let apiCalled = false;
      await page.route('**/api/chat', async (route) => {
        apiCalled = true;
        await route.fulfill({ status: 200, body: '{}' });
      });

      // WHEN pressing Enter on empty input
      const input = page.locator(inputSelector).last();
      await input.press('Enter');
      await page.waitForTimeout(500);

      // THEN the API should NOT be called
      expect(apiCalled).toBe(false);
    } finally {
      await cleanupIsolatedWorkspace(request, workspace);
    }
  });
});
