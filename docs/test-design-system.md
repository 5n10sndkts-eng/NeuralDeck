# System-Level Test Design: NeuralDeck v2.0

**Date:** 2025-01-28
**Author:** TEA Agent (Test Architect)
**Status:** Draft
**Workflow:** `_bmad/bmm/testarch/test-design` (System-Level Mode)

---

## Executive Summary

**Scope:** System-level testability review for NeuralDeck v2.0 before implementation-readiness gate check.

**Architecture Type:** Monolithic Web Application (React frontend + Node.js/Fastify backend)

**Testability Assessment:**
- **Controllability:** PASS with CONCERNS
- **Observability:** PASS with CONCERNS
- **Reliability:** PASS with CONCERNS

**Critical Findings:**
- 3 high-priority testability concerns identified (score ≥6)
- NFR testing infrastructure requires setup (k6 for performance, Playwright for security/reliability)
- Test environment needs Docker Compose setup for integration testing

---

## Testability Assessment

### Controllability: PASS with CONCERNS

**Assessment:** System state can be controlled for testing, but some areas need attention.

**Strengths:**
- ✅ **File System Control:** Direct file I/O via backend API (`/api/files`) enables test data seeding
- ✅ **API Endpoints:** RESTful API design allows direct state manipulation without UI
- ✅ **Mockable Dependencies:** LLM gateway (`/api/chat`) can be mocked for deterministic testing
- ✅ **Command Whitelist:** Tool execution security (Story 1.2) enables controlled command testing

**Concerns:**
- ⚠️ **Agent State Machine:** `useNeuralAutonomy` hook polls file system - requires file watcher mocking or test fixtures
- ⚠️ **Parallel Execution:** Swarm engine (Epic 4) uses `Promise.all()` - needs test harness for concurrent execution validation
- ⚠️ **RAG Vector Store:** In-memory or LevelDB storage - requires test data factories for consistent embeddings

**Mitigation:**
- Create test fixtures for file system state (mock `fs.watch` events)
- Implement test harness for parallel execution timing validation
- Add RAG test data factories with pre-computed embeddings

**Risk Score:** 2 (Possible) × 2 (Degraded) = **4 (MONITOR)**

---

### Observability: PASS with CONCERNS

**Assessment:** System state can be inspected, but logging and metrics need enhancement.

**Strengths:**
- ✅ **Tool Execution Logs:** Mini-logs on nodes (Story 2.3) provide visibility into agent actions
- ✅ **File System Events:** Shared file watcher service (Story 1.3) emits events for state changes
- ✅ **API Responses:** REST endpoints return structured data for validation

**Concerns:**
- ⚠️ **Agent State Transitions:** No explicit state machine logging - transitions may be hard to trace
- ⚠️ **Performance Metrics:** NFR-8 (60fps) requires performance monitoring infrastructure
- ⚠️ **Error Tracking:** No structured error logging or monitoring integration (Sentry, etc.)

**Mitigation:**
- Add state transition logging to `useNeuralAutonomy` hook
- Implement performance monitoring (FPS tracking, React DevTools Profiler)
- Integrate error tracking (Sentry or similar) for production observability

**Risk Score:** 2 (Possible) × 2 (Degraded) = **4 (MONITOR)**

---

### Reliability: PASS with CONCERNS

**Assessment:** Tests can be isolated and parallelized, but cleanup and determinism need attention.

**Strengths:**
- ✅ **Stateless API:** REST endpoints are stateless, enabling parallel test execution
- ✅ **File System Isolation:** Each test can use isolated workspace directories
- ✅ **Component Isolation:** React components can be tested in isolation with React Testing Library

**Concerns:**
- ⚠️ **File Watcher Cleanup:** Shared file watcher service may leak subscriptions if not properly cleaned up
- ⚠️ **RAG State Persistence:** LevelDB persistence may cause test pollution if not reset between tests
- ⚠️ **Parallel Execution Race Conditions:** Swarm engine (Epic 4) may have race conditions in file conflict detection

**Mitigation:**
- Implement file watcher cleanup in test teardown
- Use in-memory vector store for tests (or reset LevelDB between tests)
- Add file lock timeout testing to validate conflict resolution

**Risk Score:** 2 (Possible) × 2 (Degraded) = **4 (MONITOR)**

---

## Architecturally Significant Requirements (ASRs)

ASRs are quality requirements that drive architecture decisions and pose testability challenges.

### ASR-1: Parallel Execution Performance (NFR-1)

**Requirement:** "Swarm" execution of 5 stories takes < 2x the time of a single story (proving parallelism).

**Architecture Impact:**
- Drives `Promise.all()` parallel execution design (Epic 4)
- Requires file conflict detection to prevent race conditions (Epic 1, Story 1.3)
- Influences test environment setup (need to measure execution time accurately)

**Testability Challenge:**
- Need to validate true parallelism (not sequential execution)
- Requires performance testing infrastructure (timing measurements)
- Must account for LLM API rate limits in test scenarios

**Risk Score:** 2 (Possible) × 3 (Critical) = **6 (MITIGATE)**

**Mitigation:**
- Implement performance test harness with timing validation
- Mock LLM API to eliminate rate limit variability
- Add CI/CD performance regression tests

**Owner:** QA Lead
**Timeline:** Before Epic 4 implementation

---

### ASR-2: UI Performance at Scale (NFR-8)

**Requirement:** Locked 60fps, UI must never freeze even when processing hundreds of agent tasks.

**Architecture Impact:**
- Drives LOD (Level of Detail) system for visualization (Epic 2)
- Influences React rendering strategy (ReactFlow optimization, Framer Motion performance)
- Requires performance monitoring and profiling infrastructure

**Testability Challenge:**
- Need to validate 60fps under load (hundreds of agent tasks)
- Requires browser performance testing (Lighthouse, React DevTools Profiler)
- Must test LOD system transitions (Tactical → Strategic → Hive modes)

**Risk Score:** 3 (Likely) × 3 (Critical) = **9 (BLOCK)**

**Mitigation:**
- Implement E2E performance tests with FPS monitoring
- Add Lighthouse CI integration for Core Web Vitals
- Create load test scenarios with 100+ simulated agent tasks
- Set up performance regression testing in CI

**Owner:** Frontend Lead
**Timeline:** Before Epic 2 completion

---

### ASR-3: Security Command Execution (FR-3.4.2)

**Requirement:** System MUST strictly enforce a whitelist of shell commands. No `rm -rf /` allowed.

**Architecture Impact:**
- Drives command whitelist middleware design (Story 1.2)
- Requires path traversal protection
- Influences tool execution API design

**Testability Challenge:**
- Need to test command injection prevention
- Must validate path traversal blocking
- Requires security testing (OWASP Top 10 validation)

**Risk Score:** 2 (Possible) × 3 (Critical) = **6 (MITIGATE)**

**Mitigation:**
- Implement security test suite (Playwright E2E + security tools)
- Add OWASP ZAP or Burp Suite integration
- Create negative test cases for command injection attempts

**Owner:** Security Lead
**Timeline:** Before Story 1.2 completion

---

### ASR-4: Autonomous Workflow (NFR-3)

**Requirement:** System can go from "PRD" to "5 Implemented Story Files" without human intervention.

**Architecture Impact:**
- Drives autonomous state machine design (`useNeuralAutonomy` hook)
- Requires file system monitoring and agent triggering logic
- Influences error handling and recovery mechanisms

**Testability Challenge:**
- Need to test complete autonomous workflow end-to-end
- Requires mock LLM responses for deterministic testing
- Must validate error recovery and retry mechanisms

**Risk Score:** 2 (Possible) × 3 (Critical) = **6 (MITIGATE)**

**Mitigation:**
- Implement E2E autonomy workflow test (Story 8 pattern)
- Create mock LLM response fixtures
- Add error injection testing for resilience validation

**Owner:** QA Lead
**Timeline:** Before Epic 4 completion

---

## Test Levels Strategy

Based on architecture (monolithic web app with React frontend + Node.js backend), recommend the following test level distribution:

### Recommended Distribution

- **Unit Tests:** 50% (business logic, utilities, pure functions)
- **Integration Tests:** 30% (API endpoints, service interactions, database operations)
- **E2E Tests:** 20% (critical user journeys, autonomous workflows, security validation)

### Rationale

**Unit Tests (50%):**
- Fast feedback for business logic (price calculations, data transformations)
- React component logic (hooks, utilities)
- Pure functions (RAG chunking, embedding generation)
- **Tools:** Jest + React Testing Library

**Integration Tests (30%):**
- API endpoint contracts (`/api/chat`, `/api/files`, `/api/rag/query`)
- Service interactions (file watcher → RAG ingestion)
- Database operations (vector store persistence)
- **Tools:** Playwright API testing, Jest with test database

**E2E Tests (20%):**
- Critical user journeys (autonomous workflow: PRD → Stories → Implementation)
- Security validation (command injection, path traversal)
- Performance validation (60fps, parallel execution timing)
- **Tools:** Playwright E2E, k6 (performance)

### Test Environment Needs

**Local Development:**
- Vite dev server (port 5173) for frontend
- Fastify backend (port 3001) for API
- Mock LLM gateway for deterministic testing

**CI/CD:**
- Docker Compose setup for full stack testing
- Isolated test workspaces per test run
- Performance testing infrastructure (k6)

**Staging:**
- Production-like environment for E2E validation
- Real LLM API integration (with rate limiting)
- Performance monitoring (Lighthouse, APM)

---

## NFR Testing Approach

### Security (SEC)

**Approach:** Playwright E2E + Security Tools

**Test Coverage:**
- Authentication/Authorization: Unauthenticated access blocked (Story 1.1)
- Command Injection: Whitelist enforcement (Story 1.2)
- Path Traversal: File access restricted to `process.cwd()` (Story 1.2)
- OWASP Top 10: SQL injection, XSS validation (if applicable)

**Tools:**
- Playwright E2E tests for auth/authz
- OWASP ZAP or Burp Suite for vulnerability scanning
- npm audit for dependency vulnerabilities

**Criteria:**
- ✅ PASS: All security tests green, no critical/high vulnerabilities
- ⚠️ CONCERNS: Minor gaps with mitigation plans
- ❌ FAIL: Critical exposure or missing controls

**Risk Score:** 2 (Possible) × 3 (Critical) = **6 (MITIGATE)**

---

### Performance (PERF)

**Approach:** k6 Load Testing + Playwright Performance Validation

**Test Coverage:**
- Parallel Execution Timing: NFR-1 (5 stories < 2x single story time)
- UI Performance: NFR-8 (60fps, no freezing with 100+ agent tasks)
- API Response Times: SLO targets (p95 < 500ms for API endpoints)
- Load Testing: System behavior under expected load

**Tools:**
- k6 for load/stress/spike testing
- Playwright for UI performance (FPS monitoring, Lighthouse)
- React DevTools Profiler for component performance

**SLO/SLA Targets:**
- API endpoints: p95 < 500ms, error rate < 1%
- UI rendering: 60fps maintained, no frame drops
- Parallel execution: < 2x single story time

**Criteria:**
- ✅ PASS: All SLO/SLA targets met with profiling evidence
- ⚠️ CONCERNS: Trending toward limits or missing baselines
- ❌ FAIL: SLO/SLA breached or resource leaks detected

**Risk Score:** 3 (Likely) × 3 (Critical) = **9 (BLOCK)** (ASR-2)

---

### Reliability (RELI)

**Approach:** Playwright E2E + API Tests

**Test Coverage:**
- Error Handling: Graceful degradation (500 errors → user-friendly messages)
- Retries: Transient failure recovery (3 attempts)
- Health Checks: `/api/health` endpoint monitoring
- Offline Handling: Network disconnection graceful degradation
- File Conflict Resolution: Epic 1 file locking, Epic 4 merge conflict handling

**Tools:**
- Playwright E2E for UI error handling
- API tests for retry logic and health checks
- Chaos engineering tools (optional) for resilience testing

**Criteria:**
- ✅ PASS: Error handling, retries, health checks verified
- ⚠️ CONCERNS: Partial coverage or missing telemetry
- ❌ FAIL: No recovery path or unresolved crash scenarios

**Risk Score:** 2 (Possible) × 2 (Degraded) = **4 (MONITOR)**

---

### Maintainability (MAINT)

**Approach:** CI Tools (Coverage, Duplication, Vulnerabilities)

**Test Coverage:**
- Test Coverage: ≥80% for critical paths
- Code Duplication: <5% threshold
- Vulnerability Scanning: No critical/high vulnerabilities
- Observability: Structured logging, error tracking (Sentry)

**Tools:**
- GitHub Actions for coverage/duplication checks
- npm audit for vulnerability scanning
- Playwright for observability validation (error tracking, telemetry headers)

**Criteria:**
- ✅ PASS: 80%+ coverage, <5% duplication, no critical vulnerabilities
- ⚠️ CONCERNS: 60-79% coverage, 5-10% duplication
- ❌ FAIL: <60% coverage, >10% duplication, critical vulnerabilities

**Risk Score:** 1 (Unlikely) × 2 (Degraded) = **2 (DOCUMENT)**

---

## Test Environment Requirements

### Local Development

**Frontend:**
- Vite dev server (port 5173)
- React 18+ with HMR
- Browser DevTools for debugging

**Backend:**
- Fastify server (port 3001)
- Node.js 20.11.0 (from `.nvmrc`)
- Mock LLM gateway for testing

**Test Infrastructure:**
- Playwright browsers installed
- Jest test runner
- Isolated test workspaces

### CI/CD Environment

**Docker Compose Setup:**
```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
  
  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=test
  
  test-runner:
    image: mcr.microsoft.com/playwright
    volumes:
      - ./tests:/tests
      - ./playwright-report:/playwright-report
```

**CI Pipeline Stages:**
1. **Install Dependencies:** npm ci with caching
2. **Lint:** ESLint, TypeScript checks
3. **Unit Tests:** Jest with coverage
4. **Integration Tests:** Playwright API tests
5. **E2E Tests:** Playwright E2E (sharded for parallel execution)
6. **Performance Tests:** k6 load testing
7. **Security Scan:** npm audit, OWASP ZAP

### Staging Environment

**Requirements:**
- Production-like configuration
- Real LLM API integration (with rate limiting)
- Performance monitoring (Lighthouse, APM)
- Error tracking (Sentry or similar)

---

## Testability Concerns

### High-Priority Concerns (Score ≥6)

#### CONCERN-1: UI Performance at Scale (ASR-2)

**Issue:** NFR-8 requires 60fps with 100+ agent tasks, but no performance testing infrastructure exists.

**Impact:** Critical - UI freezing would block user experience and violate core NFR.

**Mitigation:**
- Implement E2E performance tests with FPS monitoring
- Add Lighthouse CI integration
- Create load test scenarios with 100+ simulated agent tasks

**Owner:** Frontend Lead
**Timeline:** Before Epic 2 completion
**Risk Score:** 9 (BLOCK)

---

#### CONCERN-2: Parallel Execution Validation (ASR-1)

**Issue:** NFR-1 requires proving parallelism (< 2x single story time), but no performance test harness exists.

**Impact:** High - Core value proposition (parallel execution) cannot be validated.

**Mitigation:**
- Implement performance test harness with timing validation
- Mock LLM API to eliminate rate limit variability
- Add CI/CD performance regression tests

**Owner:** QA Lead
**Timeline:** Before Epic 4 implementation
**Risk Score:** 6 (MITIGATE)

---

#### CONCERN-3: Security Command Execution (ASR-3)

**Issue:** Command whitelist enforcement (Story 1.2) requires security testing, but no security test suite exists.

**Impact:** High - Security vulnerabilities could allow malicious command execution.

**Mitigation:**
- Implement security test suite (Playwright E2E + security tools)
- Add OWASP ZAP or Burp Suite integration
- Create negative test cases for command injection attempts

**Owner:** Security Lead
**Timeline:** Before Story 1.2 completion
**Risk Score:** 6 (MITIGATE)

---

### Medium-Priority Concerns (Score 3-4)

#### CONCERN-4: Agent State Machine Observability

**Issue:** `useNeuralAutonomy` hook state transitions lack explicit logging, making debugging difficult.

**Impact:** Medium - State machine failures may be hard to diagnose.

**Mitigation:**
- Add state transition logging to `useNeuralAutonomy` hook
- Implement state machine visualization for debugging

**Owner:** Frontend Lead
**Timeline:** During Epic 2 implementation
**Risk Score:** 4 (MONITOR)

---

#### CONCERN-5: RAG Vector Store Test Data

**Issue:** RAG system (Epic 3) requires test data factories with pre-computed embeddings for consistent testing.

**Impact:** Medium - RAG tests may be flaky without consistent test data.

**Mitigation:**
- Create RAG test data factories with pre-computed embeddings
- Use in-memory vector store for tests (or reset LevelDB between tests)

**Owner:** Backend Lead
**Timeline:** During Epic 3 implementation
**Risk Score:** 4 (MONITOR)

---

## Recommendations for Sprint 0

### Framework Setup (Already Complete ✅)

- ✅ Playwright E2E framework initialized (`playwright.config.ts`)
- ✅ Jest + React Testing Library configured
- ✅ Test fixtures architecture (`tests/support/fixtures/`)
- ✅ Data factories (`@faker-js/faker` integration)
- ✅ CI/CD pipeline (`.github/workflows/test.yml`)

### Immediate Actions Required

1. **Performance Testing Infrastructure** (ASR-2 - BLOCK)
   - Set up k6 for load testing
   - Implement FPS monitoring in Playwright E2E tests
   - Add Lighthouse CI integration
   - **Owner:** Frontend Lead
   - **Timeline:** Before Epic 2 completion

2. **Security Testing Suite** (ASR-3 - MITIGATE)
   - Create Playwright security test suite
   - Integrate OWASP ZAP or Burp Suite
   - Add command injection negative test cases
   - **Owner:** Security Lead
   - **Timeline:** Before Story 1.2 completion

3. **Performance Test Harness** (ASR-1 - MITIGATE)
   - Implement parallel execution timing validation
   - Mock LLM API for deterministic testing
   - Add CI/CD performance regression tests
   - **Owner:** QA Lead
   - **Timeline:** Before Epic 4 implementation

4. **Observability Enhancement** (CONCERN-4 - MONITOR)
   - Add state transition logging to `useNeuralAutonomy` hook
   - Implement error tracking (Sentry or similar)
   - Add structured logging with trace IDs
   - **Owner:** Frontend Lead
   - **Timeline:** During Epic 2 implementation

5. **Test Data Factories** (CONCERN-5 - MONITOR)
   - Create RAG test data factories with pre-computed embeddings
   - Implement file system test fixtures
   - Add mock LLM response fixtures for autonomy workflow tests
   - **Owner:** Backend Lead
   - **Timeline:** During Epic 3 implementation

### Test Environment Setup

1. **Docker Compose Configuration**
   - Create `docker-compose.test.yml` for CI/CD
   - Set up isolated test workspaces
   - Configure test database/vector store

2. **CI/CD Enhancements**
   - Add k6 performance test stage
   - Integrate security scanning (OWASP ZAP)
   - Add performance regression detection

3. **Staging Environment**
   - Set up production-like staging environment
   - Configure performance monitoring
   - Integrate error tracking (Sentry)

---

## Risk Summary

| Risk ID | Category | Description | Probability | Impact | Score | Action | Owner |
| ------- | -------- | ----------- | ---------- | ------ | ----- | ------ | ----- |
| ASR-2 | PERF | UI Performance at Scale (60fps with 100+ tasks) | 3 | 3 | 9 | BLOCK | Frontend Lead |
| ASR-1 | PERF | Parallel Execution Validation | 2 | 3 | 6 | MITIGATE | QA Lead |
| ASR-3 | SEC | Security Command Execution Testing | 2 | 3 | 6 | MITIGATE | Security Lead |
| ASR-4 | RELI | Autonomous Workflow Testing | 2 | 3 | 6 | MITIGATE | QA Lead |
| CONCERN-4 | OBS | Agent State Machine Observability | 2 | 2 | 4 | MONITOR | Frontend Lead |
| CONCERN-5 | DATA | RAG Vector Store Test Data | 2 | 2 | 4 | MONITOR | Backend Lead |

**Total Risks:** 6
**High-Priority (≥6):** 4
**Critical (9):** 1 (ASR-2 - UI Performance)

---

## Gate Decision Recommendation

**Current Status:** **CONCERNS**

**Rationale:**
- 1 critical blocker (ASR-2 - UI Performance) requires mitigation before Epic 2 completion
- 3 high-priority risks (ASR-1, ASR-3, ASR-4) require mitigation plans with owners and timelines
- Testability concerns are addressable but need immediate action

**Recommendation:**
- **Proceed with implementation** with the understanding that:
  1. ASR-2 (UI Performance) must be addressed before Epic 2 completion
  2. ASR-1, ASR-3, ASR-4 mitigation plans must be in place before respective epic implementations
  3. Medium-priority concerns (CONCERN-4, CONCERN-5) should be addressed during implementation

**Next Steps:**
1. Assign owners to all high-priority risks (ASR-1, ASR-2, ASR-3, ASR-4)
2. Set up performance testing infrastructure (k6, Lighthouse CI)
3. Create security test suite (Playwright + OWASP ZAP)
4. Implement performance test harness for parallel execution validation
5. Schedule follow-up review after Epic 2 completion to validate ASR-2 mitigation

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection guidance
- `nfr-criteria.md` - NFR validation approach
- `test-quality.md` - Quality standards and Definition of Done

### Related Documents

- PRD: `docs/prd.md`
- Architecture: `docs/architecture.md`
- Epics: `docs/epics.md`
- UX Design: `docs/ux-design-specification.md`

---

**Generated by:** BMad TEA Agent - Test Architect Module
**Workflow:** `_bmad/bmm/testarch/test-design` (System-Level Mode)
**Version:** 4.0 (BMad v6)
