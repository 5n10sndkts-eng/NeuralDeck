# Test Suite - NeuralDeck

This document covers both **E2E testing** (Playwright) and **unit/component testing** (Jest + React Testing Library).

---

## E2E Testing with Playwright

**Framework:** Playwright  
**Status:** ✅ Initialized  
**Configuration:** `playwright.config.ts`  
**Test Directory:** `tests/e2e/`

### Quick Start (E2E)

```bash
# Install dependencies (includes Playwright)
npm install

# Install Playwright browsers
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### E2E Test Architecture

**Directory Structure:**
```
tests/
├── e2e/                    # E2E test files
│   └── example.spec.ts     # Example test
├── support/                # Framework infrastructure (key pattern)
│   ├── fixtures/          # Test fixtures
│   │   ├── index.ts       # Merged fixtures
│   │   └── factories/     # Data factories
│   │       └── user-factory.ts
│   ├── helpers/           # Utility functions
│   └── page-objects/      # Page object models (optional)
└── README.md              # This file
```

**Fixture Pattern:**
- Pure functions → Fixture wrappers → `mergeTests` composition
- Auto-cleanup for all fixtures
- Single responsibility per fixture

**Data Factories:**
- Faker-based dynamic data (parallel-safe)
- Override pattern for explicit test intent
- API-first seeding (fast, reliable)

**Selector Strategy:**
- Always use `data-testid` attributes
- Avoid brittle CSS selectors or XPath

**Knowledge Base References:**
- `_bmad/bmm/testarch/knowledge/fixture-architecture.md` - Fixture patterns
- `_bmad/bmm/testarch/knowledge/data-factories.md` - Factory patterns
- `_bmad/bmm/testarch/knowledge/playwright-config.md` - Configuration

### Environment Configuration

Create `.env` from `.env.example` and configure:
```bash
TEST_ENV=local
BASE_URL=http://localhost:5173
API_URL=http://localhost:3001/api
```

### Example E2E Test

```typescript
import { test, expect } from '../support/fixtures';

test('should load homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NeuralDeck/i);
});
```

---

## Unit/Component Testing (Jest)

**Test Coverage:** Stories 9-11 (Voice Commands, Vision Pipeline, Audio Ambience)  
**Priority:** P0 (Critical Security & Performance)  
**Framework:** Jest + React Testing Library  
**Total Tests:** 28 P0 tests

### Quick Start (Unit Tests)

```bash
# Run all P0 tests (critical paths)
npm run test:p0

# Run specific feature tests
npm run test:voice    # Voice commands only
npm run test:vision   # Vision pipeline only
npm run test:audio    # Audio performance only

# Run all Epic 3 tests
npm run test:epic3

# Run with coverage
npm test -- --coverage
```

---

## Test Priority System

Tests are tagged with priority levels in test names:

- **[P0]** - Critical paths, security, data integrity (run on every commit)
- **[P1]** - Important features, medium risk (run on PR to main)
- **[P2]** - Edge cases, low risk (run nightly)
- **[P3]** - Exploratory, benchmarks (run on-demand)

### Example

```typescript
test('[P0] should never expose API keys in client-side code', async () => {
  // Test implementation
});
```

---

## Test Structure

All tests follow **Given-When-Then** format:

```typescript
test('[P0] should reject images larger than 10MB', async () => {
  // GIVEN VisionDropZone component
  render(<VisionDropZone onDrop={mockOnDrop} />);
  
  // WHEN dropping an 11MB image
  const largeFile = new File([...], 'large.png', { type: 'image/png' });
  fireEvent.drop(dropZone, dropEvent);
  
  // THEN should show error
  await waitFor(() => {
    expect(screen.getByText(/too large/i)).toBeInTheDocument();
  });
});
```

---

## Test Files

### E2E Tests

**`tests/e2e/voice-commands.test.ts`** (13 tests)
- Microphone permission handling (R-001)
- Offline failure handling (R-002)
- Voice command accuracy (R-008)
- Security: No unauthorized recording

**`tests/e2e/vision-pipeline.test.ts`** (16 tests)
- API key never exposed (R-003) **CRITICAL**
- Image upload size validation (R-004)
- Vision AI consent flow (R-006)
- File conflict detection (R-007)

### Performance Tests

**`tests/performance/audio-cpu-usage.test.ts`** (10 tests)
- Audio CPU usage <5% (R-005)
- State transition efficiency
- Resource cleanup
- Memory leak prevention

---

## Risk Coverage

| Risk ID | Category | Description | Test Count | Status |
|---------|----------|-------------|------------|--------|
| R-001 | SEC | Microphone permission bypass | 3 | ✅ Complete |
| R-002 | PERF | Offline failures | 3 | ✅ Complete |
| R-003 | SEC | **API key exposure** | 3 | ✅ Complete |
| R-004 | DATA | Large image crash | 3 | ✅ Complete |
| R-005 | PERF | Audio CPU usage | 10 | ✅ Complete |
| R-006 | SEC | Vision consent | 4 | ✅ Complete |
| R-007 | DATA | File overwrite | 5 | ✅ Complete |

**Total P0 Coverage:** 7/7 high-priority risks (100%)

---

## Mocks & Fixtures

### Web Speech API Mock

```typescript
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  
  start() { /* ... */ }
  stop() { /* ... */ }
  _simulateResult(transcript: string, confidence: number) { /* ... */ }
}
```

### AudioContext Mock

```typescript
audioContext = {
  createOscillator: jest.fn(() => ({ ... })),
  createGain: jest.fn(() => ({ ... })),
  suspend: jest.fn(),
  resume: jest.fn()
};
```

### Vision Analyzer Mock

```typescript
jest.mock('../../src/services/visionAnalyzer');
```

---

## Test Execution

### Local Development

```bash
# Watch mode (auto-run on file changes)
npm run test:watch

# Run specific test file
npm test tests/e2e/voice-commands.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="permission"
```

### CI/CD (Future)

```bash
# Pre-commit hook (P0 tests only)
npm run test:p0

# PR to main (P0 + P1 tests)
npm run test:p1

# Nightly regression (all tests)
npm test
```

---

## Quality Standards

### ✅ No Flaky Patterns

**Prohibited:**
```typescript
// ❌ Hard waits
await page.waitForTimeout(2000);

// ❌ Try-catch for test logic
try { await element.click(); } catch (e) { }

// ❌ Conditional flow
if (await element.isVisible()) { await element.click(); }
```

**Required:**
```typescript
// ✅ Explicit waits
await waitFor(() => {
  expect(element).toBeVisible();
});

// ✅ Deterministic assertions
await expect(element).toBeVisible();
await element.click();
```

### ✅ Self-Cleaning Tests

Every test cleans up its own data:

```typescript
beforeEach(() => {
  // Setup
  mockOnDrop = jest.fn();
});

afterEach(() => {
  // Cleanup
  jest.clearAllMocks();
});
```

### ✅ File Size Limits

- Maximum 500 lines per test file
- Split into multiple files if exceeded
- Group related tests in `describe` blocks

---

## Troubleshooting

### Tests Fail: Component Missing data-testid

**Problem:**
```
TestingLibraryElementError: Unable to find an element by: [data-testid="vision-drop-zone"]
```

**Solution:**
Add `data-testid` attribute to component:
```tsx
<div data-testid="vision-drop-zone" className="...">
  {/* ... */}
</div>
```

### Tests Fail: API Key Exposure

**Problem:**
```
Expected API key not to be in client code
```

**Solution:**
Move API calls to backend proxy:
```typescript
// ❌ Client-side (exposes key)
fetch('https://api.openai.com/v1/...', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

// ✅ Backend proxy (key hidden)
fetch('/api/vision/analyze', {
  method: 'POST',
  body: JSON.stringify({ image })
});
```

### Tests Fail: Permission Mock

**Problem:**
```
TypeError: navigator.permissions.query is not a function
```

**Solution:**
Mock is set up in beforeEach:
```typescript
Object.defineProperty(global.navigator, 'permissions', {
  writable: true,
  value: {
    query: jest.fn().mockResolvedValue({ state: 'granted' })
  }
});
```

---

## Next Steps

### Immediate (This Week)

1. ✅ **P0 tests generated** (28 tests)
2. ⏳ Fix R-003 (API key exposure) - **CRITICAL**
3. ⏳ Add `data-testid` attributes to components
4. ⏳ Implement consent dialog
5. ⏳ Run `npm run test:p0` and fix failures

### P1 Tests (Next Week)

6. ⏳ Generate 18 P1 tests (medium-priority risks)
7. ⏳ Safari compatibility tests
8. ⏳ localStorage quota tests
9. ⏳ Tailwind validation tests

### CI/CD (Week 2)

10. ⏳ Setup GitHub Actions workflow
11. ⏳ P0 tests on every commit
12. ⏳ P1 tests on PR to main
13. ⏳ Coverage reporting

---

## References

- **Test Design:** `docs/test-design-epic-3.md`
- **Automation Summary:** `docs/automation-summary.md`
- **Epic 3 Details:** `docs/epic-3-omnipresence.md`
- **Stories:** `stories/story-9-voice-command-core.md`, `story-10-visual-input-drag-drop.md`, `story-11-generative-sonic-ambience.md`

---

**Maintained by:** Test Architect (Murat)  
**Last Updated:** 2025-12-17  
**Test Framework:** Jest 30.2.0 + React Testing Library 16.3.1
