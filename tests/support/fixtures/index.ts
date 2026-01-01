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

import { test as base } from '@playwright/test';
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
};

export const test = base.extend<TestFixtures>({
  userFactory: async ({ request }, use) => {
    const factory = new UserFactory(request);
    await use(factory);
    // Auto-cleanup: Delete all created users
    await factory.cleanup();
  },
});

export { expect } from '@playwright/test';
