---
story: 8
title: "E2E Autonomy Testing - Detailed Test Plan"
type: test-plan
priority: high
owner: Murat (Test Architect)
created: 2025-12-17T03:33:39.000Z
---

# Story 8: E2E Autonomy Testing - Comprehensive Test Plan

## Executive Summary

**Objective:** Validate the complete autonomous workflow from PRD ingestion through swarm execution

**Scope:** End-to-end testing of Neural Autonomy Engine state machine, file generation, and parallel execution

**Risk Level:** HIGH - Core functionality of NeuralDeck depends on this working correctly

**Test Duration:** 3 days (as estimated in Story 8)

---

## Test Strategy

### Testing Pyramid

```
        /\
       /E2E\      <- Focus here (Story 8)
      /------\
     /  INT   \   <- Integration tests
    /----------\
   /   UNIT     \ <- Unit tests (covered by dev)
  /--------------\
```

**Our Focus:** E2E layer - testing complete workflows as user would experience them

### Test Approach

1. **Automated E2E Tests** (Primary)
   - Headless browser testing (Puppeteer/Playwright)
   - Mock LLM API responses for consistency
   - Assert file system state at each stage

2. **Manual Validation** (Secondary)
   - Visual verification of UI state transitions
   - Performance profiling
   - Cross-browser compatibility

3. **Performance Testing** (Tertiary)
   - Parallel execution timing
   - Resource usage monitoring

---

## Test Environment Setup

### Prerequisites

```bash
# Install test dependencies
npm install --save-dev jest @types/jest
npm install --save-dev puppeteer @types/puppeteer
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev msw  # Mock Service Worker for API mocking
```

### Mock Data Preparation

**Test Fixtures:**
- `tests/fixtures/test-prd.md` - Sample PRD document
- `tests/fixtures/mock-llm-responses.json` - Canned LLM responses
- `tests/fixtures/expected-outputs/` - Expected file outputs at each stage

### Test Database/State

- Mock file system using `memfs` or `mock-fs`
- In-memory state for autonomy engine
- Mock LLM API with consistent responses

---

## Test Scenarios

### Scenario 1: Happy Path - Complete Autonomous Flow

**Test ID:** E2E-001  
**Priority:** P0 (Critical)  
**Risk:** If this fails, core feature is broken

**Preconditions:**
- App loaded in test browser
- Mock LLM API ready
- Clean file system state

**Test Steps:**

1. **Setup**
   ```javascript
   // Place test PRD in docs/
   fs.writeFileSync('docs/project_brief.md', TEST_PRD_CONTENT);
   ```

2. **Trigger Autonomy**
   ```javascript
   // Simulate auto-detect or manual trigger
   await page.click('[data-testid="neural-orchestrator-button"]');
   ```

3. **Verify Analyst Phase**
   ```javascript
   await page.waitForSelector('[data-state="ANALYST"]');
   expect(await page.$eval('.agent-card[data-role="analyst"]', el => el.className))
     .toContain('active');
   ```

4. **Assert File Created: analysis.md**
   ```javascript
   await waitForFile('docs/analysis.md');
   const analysisContent = fs.readFileSync('docs/analysis.md', 'utf-8');
   expect(analysisContent).toContain('MARKET ANALYSIS');
   ```

5. **Verify PM Phase Transition**
   ```javascript
   await page.waitForSelector('[data-state="PM"]');
   ```

6. **Assert File Created: prd.md**
   ```javascript
   await waitForFile('docs/prd.md');
   const prdContent = fs.readFileSync('docs/prd.md', 'utf-8');
   expect(prdContent).toContain('PRODUCT REQUIREMENTS');
   ```

7. **Verify Architect Phase**
   ```javascript
   await page.waitForSelector('[data-state="ARCHITECT"]');
   await waitForFile('docs/architecture.md');
   ```

8. **Verify Scrum Master Phase**
   ```javascript
   await page.waitForSelector('[data-state="SCRUM_MASTER"]');
   await waitForFile('docs/stories/');
   const stories = fs.readdirSync('docs/stories/');
   expect(stories.length).toBeGreaterThan(0);
   ```

9. **Verify State Returns to IDLE**
   ```javascript
   await page.waitForSelector('[data-state="IDLE"]', { timeout: 60000 });
   ```

**Expected Result:**
- All intermediate files created
- State machine completes full cycle
- Zero console errors
- Total execution time <5 minutes

**Cleanup:**
```javascript
afterEach(() => {
  // Clean up generated files
  fs.rmSync('docs/', { recursive: true, force: true });
});
```

---

### Scenario 2: Parallel Swarm Execution

**Test ID:** E2E-002  
**Priority:** P0 (Critical)  
**Acceptance Criterion:** 5 stories execute in <2x single story time

**Preconditions:**
- Complete flow from Scenario 1 executed
- 5 story files exist in docs/stories/

**Test Steps:**

1. **Baseline: Measure Single Story Time**
   ```javascript
   const startSingle = Date.now();
   await executeStory('story-1.md');
   const singleStoryTime = Date.now() - startSingle;
   ```

2. **Trigger Swarm Mode**
   ```javascript
   await page.click('[data-testid="swarm-mode-toggle"]');
   ```

3. **Measure Parallel Execution**
   ```javascript
   const startParallel = Date.now();
   await executeStories([
     'story-1.md',
     'story-2.md',
     'story-3.md',
     'story-4.md',
     'story-5.md'
   ]);
   const parallelTime = Date.now() - startParallel;
   ```

4. **Assert Parallelism Achieved**
   ```javascript
   const expectedMax = singleStoryTime * 2;
   expect(parallelTime).toBeLessThan(expectedMax);
   
   // Log for analysis
   console.log(`Single: ${singleStoryTime}ms, Parallel: ${parallelTime}ms`);
   console.log(`Speedup: ${(singleStoryTime * 5 / parallelTime).toFixed(2)}x`);
   ```

5. **Verify All Story Outputs**
   ```javascript
   const implementations = fs.readdirSync('src/components/Generated/');
   expect(implementations.length).toBe(5);
   ```

**Expected Result:**
- Parallel execution < 2x single story time
- All 5 stories complete successfully
- No race conditions or file conflicts

---

### Scenario 3: Error Handling - Missing PRD

**Test ID:** E2E-003  
**Priority:** P1 (High)  
**Purpose:** Verify graceful degradation

**Test Steps:**

1. **Start with no PRD file**
   ```javascript
   // Ensure docs/project_brief.md does NOT exist
   ```

2. **Trigger Autonomy**
   ```javascript
   await page.click('[data-testid="neural-orchestrator-button"]');
   ```

3. **Assert Error State**
   ```javascript
   const errorMessage = await page.$eval('.error-banner', el => el.textContent);
   expect(errorMessage).toContain('No project brief found');
   ```

4. **Verify State Machine Stops**
   ```javascript
   await page.waitForTimeout(2000);
   const state = await page.$eval('[data-state]', el => el.dataset.state);
   expect(state).toBe('IDLE');
   ```

**Expected Result:**
- User-friendly error message
- State machine doesn't crash
- System remains responsive

---

### Scenario 4: RAG Context Injection

**Test ID:** E2E-004  
**Priority:** P1 (High)  
**Purpose:** Verify agents receive project context

**Test Steps:**

1. **Create Mock Project Context**
   ```javascript
   fs.writeFileSync('docs/project-context.md', `
   # Project: NeuralDeck
   ## Tech Stack
   - React 19
   - Tailwind CSS
   - Fastify backend
   `);
   ```

2. **Trigger Analyst**
   ```javascript
   await executeAgent('analyst');
   ```

3. **Capture LLM Request**
   ```javascript
   const llmRequest = await interceptLLMCall();
   expect(llmRequest.messages[0].content).toContain('React 19');
   expect(llmRequest.messages[0].content).toContain('Tailwind CSS');
   ```

4. **Verify Context Used in Output**
   ```javascript
   const analysis = fs.readFileSync('docs/analysis.md', 'utf-8');
   expect(analysis).toContain('React 19');
   ```

**Expected Result:**
- Project context successfully injected
- Agents reference existing tech stack
- High compliance with instructions

---

### Scenario 5: State Persistence & Recovery

**Test ID:** E2E-005  
**Priority:** P2 (Medium)  
**Purpose:** Verify workflow can resume after crash

**Test Steps:**

1. **Start Workflow**
   ```javascript
   await startAutonomy();
   await waitForState('PM');
   ```

2. **Simulate Crash**
   ```javascript
   await page.reload();
   ```

3. **Verify State Recovery**
   ```javascript
   const state = await getAutonomyState();
   expect(state.currentPhase).toBe('PM');
   expect(state.completedPhases).toContain('ANALYST');
   ```

4. **Resume Workflow**
   ```javascript
   await resumeAutonomy();
   await waitForCompletion();
   ```

**Expected Result:**
- State persisted to localStorage/session
- Workflow resumes from last checkpoint
- No duplicate file creation

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Single Story Execution | <60 seconds | Timer in test |
| Parallel Speedup | >2.5x | Comparison test |
| Memory Usage | <500 MB | Chrome DevTools |
| File I/O Operations | <100 writes | Mock fs counter |
| State Transition Time | <500ms | Performance API |

### Performance Test Script

```javascript
describe('Performance Benchmarks', () => {
  test('Parallel execution achieves 2.5x speedup', async () => {
    const singleTime = await measureSingleStoryExecution();
    const parallelTime = await measureParallelExecution(5);
    
    const speedup = (singleTime * 5) / parallelTime;
    expect(speedup).toBeGreaterThan(2.5);
  });
});
```

---

## Test Data & Fixtures

### Mock LLM Responses

**File:** `tests/fixtures/mock-llm-responses.json`

```json
{
  "analyst": {
    "content": "# Market Analysis\n\n## Target Market\nDevelopers building AI applications...",
    "role": "assistant"
  },
  "pm": {
    "content": "# Product Requirements Document\n\n## FR-1: Core Features...",
    "role": "assistant"
  },
  "architect": {
    "content": "# Technical Architecture\n\n## System Design...",
    "role": "assistant"
  }
}
```

### Test PRD Template

**File:** `tests/fixtures/test-prd.md`

```markdown
# Project Brief: Test Application

## Vision
Build a test application for E2E validation

## Features
- Feature 1: User authentication
- Feature 2: Dashboard
- Feature 3: Data visualization

## Technical Requirements
- React frontend
- Node.js backend
- PostgreSQL database
```

---

## Test Execution Plan

### Day 1: Setup & Happy Path
- Setup test environment
- Implement E2E-001 (Happy Path)
- Validate test infrastructure

### Day 2: Parallel Execution & Edge Cases
- Implement E2E-002 (Parallel Swarm)
- Implement E2E-003 (Error Handling)
- Implement E2E-004 (RAG Context)

### Day 3: Performance & Documentation
- Implement E2E-005 (State Recovery)
- Run performance benchmarks
- Document test results
- Create test report

---

## Test Report Template

**File:** `docs/testing/e2e-autonomy-report.md`

```markdown
# E2E Autonomy Test Report

## Test Execution Summary
- **Date:** 2025-12-XX
- **Tester:** Murat (Test Architect)
- **Environment:** Chrome 120, Node.js 20
- **Test Suite:** Story 8 E2E Tests

## Results

| Test ID | Scenario | Status | Duration | Notes |
|---------|----------|--------|----------|-------|
| E2E-001 | Happy Path | ✅ PASS | 4m 32s | All files created |
| E2E-002 | Parallel Swarm | ✅ PASS | 2m 10s | 2.8x speedup achieved |
| E2E-003 | Error Handling | ✅ PASS | 15s | Graceful error message |
| E2E-004 | RAG Context | ✅ PASS | 45s | Context injected correctly |
| E2E-005 | State Recovery | ✅ PASS | 1m 20s | Resumed from PM phase |

## Performance Metrics
- Single Story: 58 seconds
- Parallel (5 stories): 103 seconds
- Speedup: 2.82x
- Memory Peak: 420 MB

## Issues Found
None blocking. All acceptance criteria met.

## Recommendations
- Consider caching LLM responses for faster iteration
- Add progress indicators for long-running operations
- Implement retry logic for transient failures
```

---

## Acceptance Criteria Validation

### Story 8 AC Checklist

- [ ] E2E test suite passes 100%
- [ ] All intermediate files created correctly
- [ ] Parallel execution verified (<2x single story time)
- [ ] Test documentation published
- [ ] Zero console errors during tests
- [ ] All state transitions logged and validated

---

## Murat's Sign-Off Criteria

**Test plan is complete when:**
1. All 5 test scenarios implemented
2. Performance benchmarks passing
3. Test report generated
4. Code coverage >80% for autonomy engine
5. Winston reviews test architecture
6. Amelia confirms tests pass in CI/CD

---

**Murat's Notes:** This test plan follows risk-based testing principles. E2E-001 and E2E-002 are critical path (P0). The others validate edge cases and robustness. Expect 2-3 iterations to get all tests green. Tests first, AI implements, suite validates.
