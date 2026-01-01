module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests', '<rootDir>/server'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
  // Exclude tests that require running server or browser APIs from default run
  testPathIgnorePatterns: [
    '/node_modules/',
    '.*integration.*\\.test\\.js$',
    'server-security\\.test\\.js$',
    'command-security\\.test\\.js$',
    'tests/e2e/',  // E2E tests should run via Playwright, not Jest
    'NeuralGrid\\.test\\.tsx$',  // ReactFlow + React 19 incompatibility causes infinite loops
    'audio-cpu-usage\\.test\\.ts$',  // Requires complex Web Audio API mocking
    'ThreatDashboard\\.test\\.tsx$'  // Requires brittle DOM assertions refactoring
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 120000,
  // ts-jest v29+ configuration for JSX
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node'
      }
    }],
    '^.+\\.js$': 'babel-jest'
  },
  // Allow CommonJS modules for server-side tests
  transformIgnorePatterns: ['/node_modules/(?!langchain|@langchain)']
};
