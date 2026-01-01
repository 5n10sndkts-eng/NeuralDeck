/**
 * E2E Security Test: Path Traversal Prevention
 * 
 * ASR-3: Security Command Execution (Score: 6 - MITIGATE)
 * Test ID: SEC-003
 * Priority: P0
 * 
 * Validates: Path traversal attempts are blocked
 */

import { test, expect } from '../../support/fixtures';

test('[P0] @security Path traversal prevention', async ({ page, request }) => {
  // GIVEN: Path traversal attempts
  const traversalPaths = [
    '../../../etc/passwd',
    '../../.env',
    '../.git/config',
    '/etc/passwd',
    'C:\\Windows\\System32\\config\\sam',
  ];

  // WHEN: Attempt to access files with traversal paths
  for (const path of traversalPaths) {
    const response = await request.get(`/api/files/read?path=${encodeURIComponent(path)}`);

    // THEN: Access must be blocked
    expect(response.status()).toBe(403); // Forbidden
    
    const result = await response.json();
    expect(result.error).toContain('outside workspace');
    expect(result.error).toContain('path traversal');
  }
  
  // Verify legitimate paths still work
  const validResponse = await request.get('/api/files/read?path=package.json');
  expect(validResponse.status()).toBe(200);
});
