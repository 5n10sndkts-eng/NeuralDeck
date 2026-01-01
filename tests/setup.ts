// Jest setup file
// Executes before all tests
import '@testing-library/jest-dom';

// Mock import.meta.env for Vite environment variables
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE: 'http://localhost:3001/api',
        VITE_SOCKET_URL: 'http://localhost:3001',
      }
    }
  },
  writable: true,
  configurable: true,
});

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
