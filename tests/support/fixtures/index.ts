/**
 * Test Fixtures - NeuralDeck
 * 
 * This file follows the fixture architecture pattern:
 * - Pure functions → Fixture wrappers → mergeTests composition
 * - Auto-cleanup for all fixtures
 * - Single responsibility per fixture
 * 
 * Reference: _bmad/bmm/testarch/knowledge/fixture-architecture.md
 */

import { test as base, type APIRequestContext } from '@playwright/test';
import { UserFactory } from './factories/user-factory';

/**
 * Extended test fixtures
 * Add new fixtures here following the pattern:
 * 1. Create pure function helper
 * 2. Wrap in fixture with auto-cleanup
 * 3. Add to TestFixtures type
 */
type TestFixtures = {
  userFactory: UserFactory;
  request: APIRequestContext;
};

export const test = base.extend<TestFixtures>({
  request: async ({ playwright }, use) => {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

    const bootstrap = await playwright.request.newContext({ baseURL: apiBaseUrl });
    let token: string | null = null;
    try {
      const sessionResponse = await bootstrap.post('/api/auth/session', {
        data: { userId: 'playwright-e2e' },
      });
      if (sessionResponse.ok()) {
        const payload = await sessionResponse.json();
        token = payload?.token || null;
      }
    } finally {
      await bootstrap.dispose();
    }

    const authed = await playwright.request.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    await use(authed);
    await authed.dispose();
  },

  userFactory: async ({ request }, use) => {
    const factory = new UserFactory(request);
    await use(factory);
    // Auto-cleanup: Delete all created users
    await factory.cleanup();
  },
});

export { expect } from '@playwright/test';
