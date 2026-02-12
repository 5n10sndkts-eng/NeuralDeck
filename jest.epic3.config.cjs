const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  collectCoverage: false,
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: [
    '**/tests/e2e/voice-commands.test.ts',
    '**/tests/e2e/vision-pipeline.test.tsx',
    '**/tests/performance/audio-cpu-usage.test.ts',
  ],
};
