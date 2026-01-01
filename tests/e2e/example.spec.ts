/**
 * Example E2E Test - NeuralDeck
 * 
 * This test demonstrates:
 * - Fixture usage (userFactory)
 * - Data-testid selector strategy
 * - Given-When-Then structure
 * - Proper assertions
 * 
 * Reference: _bmad/bmm/testarch/knowledge/test-quality.md
 */

import { test, expect } from '../support/fixtures';

test.describe('Example Test Suite', () => {
  test('should load homepage', async ({ page }) => {
    // GIVEN the application is running
    // WHEN navigating to the homepage
    await page.goto('/');

    // THEN the page should load successfully
    await expect(page).toHaveTitle(/NeuralDeck/i);
  });

  test('should demonstrate fixture usage with user factory', async ({ page, userFactory }) => {
    // GIVEN a test user created via factory
    const user = await userFactory.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });

    // WHEN navigating to user profile (example)
    // Note: Adjust this based on your actual application routes
    await page.goto('/');

    // THEN user data should be accessible
    // This is a template - adjust assertions based on your UI
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');

    // Cleanup happens automatically via fixture teardown
  });

  test('should use data-testid selectors', async ({ page }) => {
    // GIVEN the application is running
    await page.goto('/');

    // WHEN looking for elements
    // THEN use data-testid attributes (not brittle CSS selectors)
    // Example: await page.getByTestId('neural-grid').click();
    
    // This test is a template - add actual test logic based on your components
    await expect(page).toHaveURL(/.*localhost.*/);
  });
});
