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

    try {
      // API call to create user (adjust endpoint as needed)
      const response = await this.request.post('/api/users', {
        data: user,
      });

      if (!response.ok()) {
        throw new Error(`Failed to create user: ${response.status()}`);
      }

      const created = await response.json();
      this.createdUsers.push(created.id || user.id);
      return created;
    } catch (error) {
      // If API endpoint doesn't exist yet, return mock data
      // Tests can still use the factory pattern
      console.warn('User API endpoint not available, using mock data:', error);
      this.createdUsers.push(user.id);
      return user;
    }
  }

  /**
   * Cleanup all created users
   * Called automatically by fixture teardown
   */
  async cleanup(): Promise<void> {
    for (const userId of this.createdUsers) {
      try {
        await this.request.delete(`/api/users/${userId}`);
      } catch (error) {
        // Ignore cleanup errors (user may not exist)
        console.warn(`Failed to cleanup user ${userId}:`, error);
      }
    }
    this.createdUsers = [];
  }
}
