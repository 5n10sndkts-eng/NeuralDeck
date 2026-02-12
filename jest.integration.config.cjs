const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  collectCoverage: false,
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: [
    '**/tests/**/*integration*.test.js',
    '**/tests/**/*integration*.test.ts',
    '**/tests/**/*integration*.test.tsx',
    '**/tests/docker-integration.test.js',
    '**/tests/server-security.test.js',
    '**/tests/command-security.test.js',
  ],
};
