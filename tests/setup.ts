// Jest setup file
// Executes before all tests
import '@testing-library/jest-dom';

// Vite env vars: the custom transform (tests/transforms/vite-env.cjs) rewrites
// import.meta.env → process.env, so set the values Jest needs here.
process.env.VITE_API_BASE = 'http://localhost:3001/api';
process.env.VITE_SOCKET_URL = 'http://localhost:3001';
process.env.VITE_OPENCODE_URL = 'http://localhost:4096';

// Track console errors for test validation
(global as any).__consoleErrors = [];

// Polyfill ResizeObserver for ReactFlow
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  (global as any).__consoleErrors.push(args.join(' '));
  originalConsoleError(...args);
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
