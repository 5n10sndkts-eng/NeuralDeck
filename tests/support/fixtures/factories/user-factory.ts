/**
 * User Factory - Test Data Generation
 * 
 * Follows data-factories.md pattern:
 * - Faker-based dynamic data (parallel-safe)
 * - Override pattern for explicit test intent
 * - Auto-cleanup tracking
 * - API-first seeding (fast, reliable)
 * 
 * Reference: _bmad/bmm/testarch/knowledge/data-factories.md
 */

import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

export type User = {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin' | 'moderator';
  createdAt?: Date;
  isActive?: boolean;
};

export class UserFactory {
  private createdUsers: string[] = [];
  private userApiAvailable = true;
  private request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Create user data with sensible defaults and overrides
   * Uses faker for parallel-safe unique values
   */
  createUserData(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: 'user',
      createdAt: new Date(),
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Create user via API (fast, parallel-safe)
   * Tracks created users for automatic cleanup
   */
  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const user = this.createUserData(overrides);

    if (!this.userApiAvailable) {
      this.createdUsers.push(user.id);
      return user;
    }

    // API call to create user when endpoint exists; fallback only for missing route.
    const response = await this.request.post('/api/users', {
      data: user,
      failOnStatusCode: false,
    });

    if (response.status() === 404) {
      this.userApiAvailable = false;
      this.createdUsers.push(user.id);
      return user;
    }

    if (!response.ok()) {
      throw new Error(`Failed to create user: ${response.status()}`);
    }

    const created = await response.json();
    this.createdUsers.push(created.id || user.id);
    return created;
  }

  /**
   * Cleanup all created users
   * Called automatically by fixture teardown
   */
  async cleanup(): Promise<void> {
    if (!this.userApiAvailable) {
      this.createdUsers = [];
      return;
    }

    for (const userId of this.createdUsers) {
      try {
        await this.request.delete(`/api/users/${userId}`, {
          failOnStatusCode: false,
        });
      } catch (error) {
        // Ignore cleanup errors (user may not exist)
        console.warn(`Failed to cleanup user ${userId}:`, error);
      }
    }
    this.createdUsers = [];
  }
}
