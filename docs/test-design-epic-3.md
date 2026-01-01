# Test Design: Epic 3 - Omnipresence

**Date:** 2025-12-17  
**Author:** Murat (Test Architect)  
**Reviewer:** Moe  
**Status:** Draft

---

## Executive Summary

**Scope:** Comprehensive test design for Epic 3 - Omnipresence (Stories 9-11)

**Risk Summary:**
- Total risks identified: 18
- High-priority risks (≥6): 7
- Critical categories: SEC (Security), PERF (Performance), DATA (Data Integrity)

**Coverage Summary:**
- P0 scenarios: 12 tests (24 hours)
- P1 scenarios: 18 tests (18 hours)
- P2/P3 scenarios: 22 tests (13.5 hours)
- **Total effort**: 55.5 hours (~7 days)

**Current Test Status:**
⚠️ **CRITICAL GAP:** Zero automated tests exist for Epic 3 features
- Voice commands: Manual testing only (Chrome/Edge/Safari)
- Vision pipeline: Manual testing only (image upload, GPT-4V analysis)
- Audio system: Manual testing only (ambient generation, SFX)

**Immediate Recommendation:**  
**Implement P0 scenarios FIRST** before considering Sprint 6 polish work. High-risk gaps in security and performance coverage.

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | SEC | Microphone permission bypass allows unauthorized audio recording | 2 | 3 | **6** | Implement permission validation on every voice activation + browser permission checks | Amelia (Dev) | Week 1 |
| R-002 | PERF | Web Speech API internet dependency causes offline failures in Chrome | 3 | 2 | **6** | Add offline detection + fallback message + localStorage caching of last recognized commands | Amelia | Week 1 |
| R-003 | SEC | GPT-4V API key exposed in client-side code or logs | 3 | 3 | **9** | Move API calls to backend proxy, never expose keys in frontend, audit all console.log statements | Barry (DevOps) | IMMEDIATE |
| R-004 | DATA | Large image uploads (>10MB) crash browser tab | 2 | 3 | **6** | Enforce strict file size validation BEFORE upload, add chunked upload for large files, implement worker thread for processing | Amelia | Week 1 |
| R-005 | PERF | Audio engine causes >5% CPU usage during swarm mode | 2 | 3 | **6** | Profile with Chrome DevTools, optimize oscillator count, implement audio worklet (not ScriptProcessorNode), add performance mode toggle | Amelia | Week 2 |
| R-006 | SEC | Vision AI processes PII/sensitive data in uploaded mockups without user consent | 2 | 3 | **6** | Add consent dialog before processing, implement local-only mode without GPT-4V, add data retention policy UI | Amelia | Week 1 |
| R-007 | DATA | Generated component code overwrites existing files without warning | 2 | 3 | **6** | Check for file conflicts before save, add confirmation dialog, implement versioning system, backup before overwrite | Amelia | Week 1 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-008 | PERF | Voice command accuracy <90% (currently 85%) degrades UX | 3 | 1 | **3** | Tune fuzzy matching threshold, expand command vocabulary, add training mode | Amelia |
| R-009 | TECH | Safari Web Speech API differences cause command parsing failures | 2 | 2 | **4** | Add Safari-specific polyfill, test extensively on Safari 16+, add browser detection | Amelia |
| R-010 | UX | Audio ambience distracts users instead of enhancing focus | 1 | 3 | **3** | User testing with focus group, add subtle presets, default to lower volume | Sally (UX) |
| R-011 | DATA | localStorage limit (5-10MB) exceeded by audio preferences + vision cache | 2 | 2 | **4** | Implement quota monitoring, prioritize critical data, add IndexedDB fallback | Amelia |
| R-012 | TECH | Generated component code doesn't match Tailwind config (custom colors missing) | 2 | 2 | **4** | Pass Tailwind config to componentGenerator, validate classes against config, add custom color mapping | Amelia |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-013 | OPS | Web Audio API unavailable in older browsers (IE11, old Safari) | 1 | 2 | **2** | Graceful degradation message, browser version detection |
| R-014 | UX | Voice visualizer waveform animation causes motion sickness | 1 | 1 | **1** | Add prefers-reduced-motion support, option to disable animation |
| R-015 | PERF | Monaco Editor for code preview increases bundle size | 1 | 2 | **2** | Lazy-load Monaco, code-split VisionPreview component |
| R-016 | BUS | Multi-language support missing (English-only voice commands) | 1 | 1 | **1** | Monitor user requests, add i18n if demand exists |
| R-017 | TECH | Levenshtein distance algorithm inefficient for large command sets | 1 | 1 | **1** | Optimize with memoization, consider trie-based matching |
| R-018 | OPS | No telemetry for voice/vision feature usage analytics | 1 | 1 | **1** | Add opt-in analytics, track command frequency, analyze failures |

### Risk Category Legend

- **TECH**: Technical/Architecture (integration complexity, scalability)
- **SEC**: Security (permissions, API keys, data exposure)
- **PERF**: Performance (CPU usage, API latency, offline scenarios)
- **DATA**: Data Integrity (file conflicts, localStorage limits, overwrites)
- **BUS**: Business Impact (UX harm, missing features, revenue)
- **OPS**: Operations (browser compatibility, monitoring, deployment)
- **UX**: User Experience (accessibility, motion sickness, distraction)

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|-----------|-----------|------------|-------|-------|
| Microphone permission handling | E2E | R-001 | 2 | QA | Test grant + deny scenarios |
| API key not exposed in client | E2E | R-003 | 1 | Security | Audit network tab, source code |
| Image upload size validation | E2E | R-004 | 2 | QA | Test <10MB pass, >10MB reject |
| File conflict detection | E2E | R-007 | 2 | QA | Test overwrite prevention |
| Voice command execution | E2E | R-002 | 3 | QA | Test online, offline, retry |
| Audio CPU usage <5% | Performance | R-005 | 1 | QA | Chrome DevTools profiling |
| Vision API consent flow | E2E | R-006 | 1 | QA | Test dialog appears, user can decline |

**Total P0**: 12 tests, 24 hours (2 hours per critical security/data test)

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|-----------|-----------|------------|-------|-------|
| Voice command accuracy >85% | Integration | R-008 | 4 | QA | Test all 18 command patterns |
| Safari Web Speech compatibility | E2E | R-009 | 3 | QA | Test on Safari 16, 17, 18 |
| Generated code Tailwind validation | Component | R-012 | 3 | DEV | Verify custom colors, spacing |
| localStorage quota monitoring | Integration | R-011 | 2 | DEV | Test quota exceeded scenario |
| Audio presets switch correctly | Component | R-010 | 3 | DEV | Focus, Energize, Calm, Silent |
| Vision preview rendering | Component | - | 3 | DEV | Test split-screen, code editor |

**Total P1**: 18 tests, 18 hours (1 hour per standard integration test)

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|-----------|-----------|------------|-------|-------|
| Voice visualizer animation | Component | R-014 | 2 | DEV | Test waveform, prefers-reduced-motion |
| Older browser graceful degradation | E2E | R-013 | 3 | QA | Test IE11, old Safari, show message |
| Monaco Editor lazy-loading | Performance | R-015 | 1 | DEV | Verify code-splitting works |
| Levenshtein algorithm performance | Unit | R-017 | 4 | DEV | Benchmark with 50+ commands |
| Multi-language detection | Unit | R-016 | 2 | DEV | Detect browser language, show message |
| Generated component export | Integration | - | 3 | QA | Test save to /Generated/, import |
| Audio state transitions | Integration | - | 4 | QA | IDLE→THINKING→WORKING→SWARM |
| Voice transcript display | Component | - | 2 | DEV | Test recognized text UI feedback |
| Vision API retry logic | Integration | - | 1 | DEV | Test 3 retry attempts on failure |

**Total P2**: 22 tests, 11 hours (0.5 hour per edge case test)

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|-----------|------------|-------|-------|
| Voice command response time <500ms | Performance | 1 | QA | Benchmark with DevTools |
| Vision analysis <30s average | Performance | 1 | QA | Measure GPT-4V API latency |
| Audio synthesis CPU profiling | Performance | 1 | DEV | Compare ScriptProcessor vs AudioWorklet |
| Accessibility keyboard navigation | E2E | 2 | QA | Tab through all controls |
| Error message clarity | UX | 1 | Sally | User test error scenarios |

**Total P3**: 6 tests, 2.5 hours (exploratory + benchmarks)

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] Voice toggle keyboard shortcut (Cmd+Shift+V) works (30s)
- [ ] Audio mute toggle (M key) works (15s)
- [ ] Image drag-drop zone appears (20s)
- [ ] App loads without console errors (45s)

**Total**: 4 scenarios (~2 min)

### P0 Tests (<15 min)

**Purpose**: Critical path validation, security gates

- [ ] Microphone permission requested on first voice activation (E2E, 1.5min)
- [ ] Microphone permission denial handled gracefully (E2E, 1min)
- [ ] API key not exposed in client source code (Security Audit, 2min)
- [ ] Image upload <10MB passes validation (E2E, 1min)
- [ ] Image upload >10MB rejected with error (E2E, 1min)
- [ ] Generated component doesn't overwrite existing file (E2E, 2min)
- [ ] File overwrite shows confirmation dialog (E2E, 1.5min)
- [ ] Voice commands work in online mode (E2E, 2min)
- [ ] Voice commands fail gracefully offline (E2E, 1.5min)
- [ ] Audio CPU usage <5% during swarm (Performance, 2min)
- [ ] Vision API consent dialog appears (E2E, 1min)
- [ ] User can decline vision processing (E2E, 1min)

**Total**: 12 scenarios (~17 min - **EXCEEDS TARGET**, optimize by parallelizing)

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] Voice command "show workspace" navigates correctly (2min)
- [ ] Voice command "activate analyst" triggers agent (2min)
- [ ] Voice command "open construct" switches view (2min)
- [ ] Voice command "help" shows command list (2min)
- [ ] Safari Web Speech API compatibility (5min - requires Safari test env)
- [ ] Generated code uses Tailwind custom colors (3min)
- [ ] Generated code spacing matches mockup (3min)
- [ ] localStorage quota warning triggers (2min)
- [ ] Audio preset "Focus" loads minimal ambience (2min)
- [ ] Audio preset "Energize" increases tempo (2min)
- [ ] Audio preset "Calm" uses deep drone (2min)
- [ ] Vision preview split-screen renders (2min)
- [ ] Code editor in preview functional (3min)

**Total**: 13 scenarios (~30 min)

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage, edge cases

- [ ] Voice visualizer waveform animation displays (2min)
- [ ] prefers-reduced-motion disables animation (2min)
- [ ] IE11 shows "browser not supported" message (3min)
- [ ] Old Safari shows Web Audio fallback (3min)
- [ ] Monaco Editor lazy-loads on vision preview (2min)
- [ ] Levenshtein distance handles 50+ commands (5min - benchmark)
- [ ] Multi-language browser shows English-only notice (2min)
- [ ] Generated component saves to /Generated/ (3min)
- [ ] IDLE→THINKING audio transition smooth (2min)
- [ ] THINKING→WORKING audio transition smooth (2min)
- [ ] WORKING→SWARM audio transition smooth (2min)
- [ ] Voice transcript displays recognized text (2min)
- [ ] Vision API retry on network failure (5min)
- [ ] Voice command response time <500ms (3min - benchmark)
- [ ] Vision analysis <30s (5min - benchmark)
- [ ] Audio CPU profiling ScriptProcessor vs Worklet (10min - deep dive)

**Total**: 16 scenarios (~53 min)

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 12 | 2.0 | 24 | Complex setup, security audits, permission flows |
| P1 | 18 | 1.0 | 18 | Standard E2E + Component tests |
| P2 | 22 | 0.5 | 11 | Edge cases, unit tests |
| P3 | 6 | 0.5 | 3 | Benchmarks, exploratory |
| **Total** | **58** | **-** | **56** | **~7 days (1 QA engineer)** |

### Prerequisites

**Test Data:**
- Voice command vocabulary fixture (18 patterns)
- Mock GPT-4V responses for vision tests (JSON fixtures)
- Sample mockup images (PNG, JPG, SVG) in `tests/fixtures/mockups/`
- Audio state machine test data (IDLE/THINKING/WORKING/SWARM)

**Tooling:**
- **Playwright** for E2E tests (voice, vision, audio)
- **Jest** for unit tests (voiceCommandParser, Levenshtein)
- **React Testing Library** for component tests
- **Puppeteer** for browser permission automation
- **Chrome DevTools Protocol** for CPU profiling

**Environment:**
- Microphone permission pre-granted in test browser
- GPT-4V API mock server (avoid API costs in tests)
- localhost:5173 dev server running
- Audio output muted in CI (prevent audio artifacts)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions - security/data critical)
- **P1 pass rate**: ≥95% (max 1 failure allowed with waiver)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (voice execution, vision pipeline, audio engine)
- **Security scenarios**: 100% (R-001, R-003, R-006 fully tested)
- **Browser compatibility**: Chrome/Edge/Safari latest 3 versions
- **Performance**: <5% CPU for audio, <30s vision analysis

### Non-Negotiable Requirements

- [ ] All P0 tests pass (12/12)
- [ ] No API keys exposed in client code (R-003)
- [ ] Microphone permission handled correctly (R-001)
- [ ] File size validation prevents crashes (R-004)
- [ ] Audio CPU usage within limits (R-005)
- [ ] Vision consent flow implemented (R-006)
- [ ] File conflict prevention working (R-007)

---

## Mitigation Plans

### R-003: GPT-4V API Key Exposed in Client (Score: 9) - **IMMEDIATE**

**Mitigation Strategy:**
1. Move all GPT-4V API calls to backend `/api/vision/analyze` endpoint
2. Backend reads API key from environment variable only
3. Implement rate limiting on backend endpoint (10 requests/min per user)
4. Audit ALL client-side code for hardcoded secrets (regex scan: `sk-.*`, `api_key`)
5. Add pre-commit hook to prevent API key commits
6. Remove API keys from git history if found

**Owner:** Barry (DevOps) + Amelia (Dev)  
**Timeline:** Within 48 hours  
**Status:** Planned  
**Verification:**
- [ ] Inspect Network tab: `/api/vision/analyze` called, no Authorization header visible
- [ ] Inspect source code: No API key strings in bundle.js
- [ ] Test with invalid backend API key: frontend shows "configuration error"
- [ ] Pre-commit hook rejects commits with pattern `sk-.*`

### R-001: Microphone Permission Bypass (Score: 6)

**Mitigation Strategy:**
1. Check `navigator.permissions.query({ name: 'microphone' })` before voice activation
2. If permission denied, show user-friendly error + link to browser settings
3. Add permission state listener to detect runtime revocations
4. Disable voice button UI if permission not granted
5. Re-request permission on each voice activation (don't cache indefinitely)

**Owner:** Amelia (Dev)  
**Timeline:** Week 1  
**Status:** Planned  
**Verification:**
- [ ] Browser denies mic access: voice button disabled
- [ ] Permission granted: voice activation works
- [ ] Permission revoked mid-session: voice mode exits gracefully

### R-004: Large Image Upload Crashes (Score: 6)

**Mitigation Strategy:**
1. Add file size check BEFORE FileReader reads file
2. Limit to 10MB (configurable via env variable)
3. For >10MB: show error "Image too large. Max size: 10MB"
4. Consider implementing chunked upload for future (not MVP)
5. Process images in Web Worker to prevent main thread blocking

**Owner:** Amelia (Dev)  
**Timeline:** Week 1  
**Status:** Planned  
**Verification:**
- [ ] Upload 11MB image: error displayed immediately
- [ ] Upload 9MB image: processing continues
- [ ] UI remains responsive during 10MB upload

### R-005: Audio Engine High CPU (Score: 6)

**Mitigation Strategy:**
1. Profile with Chrome DevTools Performance tab during swarm mode
2. Reduce oscillator count from 3 layers to 2 during swarm (trade-off: less rich sound)
3. Migrate from ScriptProcessorNode (deprecated) to AudioWorklet
4. Add "Performance Mode" toggle: disables high layer (1kHz-4kHz)
5. Implement audio pause when tab inactive (Page Visibility API)

**Owner:** Amelia (Dev)  
**Timeline:** Week 2  
**Status:** Planned  
**Verification:**
- [ ] Chrome DevTools CPU usage <5% during 10-agent swarm
- [ ] Performance Mode reduces CPU by ≥30%
- [ ] Audio pauses when tab backgrounded

### R-006: Vision AI Processes PII Without Consent (Score: 6)

**Mitigation Strategy:**
1. Add consent dialog before first image upload: "This feature analyzes your mockup using AI. Images may contain sensitive data. Proceed?"
2. Checkbox: "Process images locally only (no cloud AI)" → disables GPT-4V, shows warning
3. Add privacy policy link in dialog
4. Store consent preference in localStorage (don't ask again)
5. Add "Reset Consent" button in settings

**Owner:** Amelia (Dev)  
**Timeline:** Week 1  
**Status:** Planned  
**Verification:**
- [ ] First upload shows consent dialog
- [ ] User declines: upload cancelled
- [ ] User accepts: image processed
- [ ] Consent stored: dialog not shown on subsequent uploads

### R-007: Generated Component Overwrites Files (Score: 6)

**Mitigation Strategy:**
1. Before saving to `/Generated/`, check if file exists with `fs.existsSync()` (backend) or fetch (frontend)
2. If exists: show confirmation dialog "File exists. Overwrite?"
3. Add checkbox: "Create versioned copy instead" → appends timestamp to filename
4. Implement backup system: copy existing file to `/Generated/.backup/` before overwrite
5. Add "Restore from Backup" UI in file explorer

**Owner:** Amelia (Dev)  
**Timeline:** Week 1  
**Status:** Planned  
**Verification:**
- [ ] Generate component with existing name: confirmation shown
- [ ] User declines overwrite: file unchanged
- [ ] User accepts overwrite: backup created
- [ ] Versioned copy creates `Component_1234567890.tsx`

---

## Assumptions and Dependencies

### Assumptions

1. **Browser Support**: Target Chrome 90+, Edge 90+, Safari 16+ (no IE11 support)
2. **Internet Connectivity**: Voice commands may require online (Chrome Web Speech API limitation)
3. **GPT-4V API Access**: Assumes user has valid OpenAI API key (or local fallback disabled)
4. **Microphone Hardware**: User has working microphone (or voice feature disabled)
5. **Image Formats**: Mockups provided as PNG/JPG/SVG/PDF (no Figma/Sketch files directly)

### Dependencies

1. **Backend API Endpoint**: `/api/vision/analyze` must be implemented for R-003 mitigation - Required by Week 1
2. **Test Infrastructure**: Story 8 (E2E Testing) 60% complete - needs Playwright setup - Required before starting test development
3. **Mock Data**: GPT-4V mock server for CI tests - Required by Week 1
4. **Browser Permissions**: Automated Puppeteer microphone grant setup - Required by Week 1

### Risks to Plan

- **Risk**: GPT-4V API rate limits during testing (429 errors)
  - **Impact**: Tests fail intermittently, developers blocked
  - **Contingency**: Use mock server in CI, real API only for manual QA

- **Risk**: Safari Web Speech API behaves differently than Chrome (R-009)
  - **Impact**: 30% of users can't use voice commands
  - **Contingency**: Add Safari polyfill, fallback to typed commands

- **Risk**: Test development takes longer than 7 days (complex browser automation)
  - **Impact**: Delays Sprint 6 start
  - **Contingency**: Prioritize P0 tests first, defer P2/P3 to continuous improvement

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: John (PM) - Date: ______
- [ ] Tech Lead: Winston (Architect) - Date: ______
- [ ] QA Lead: Murat (Test Architect) - Date: ______
- [ ] Developer: Amelia (Dev) - Date: ______

**Comments:**

_[Space for stakeholder feedback]_

---

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (625 lines)
- `probability-impact.md` - Risk scoring methodology (604 lines)
- `test-levels-framework.md` - E2E vs API vs Component vs Unit (467 lines)
- `test-priorities-matrix.md` - P0-P3 automated prioritization (389 lines)
- `selective-testing.md` - Execution strategy (727 lines)
- `fixture-architecture.md` - Test data setup patterns (406 lines)

### Related Documents

- PRD: `docs/prd.md`
- Epic 3: `docs/epic-3-omnipresence.md`
- Architecture: `docs/architecture.md`
- UX Design: `docs/ux-design-specification.md`
- Story 9: `stories/story-9-voice-command-core.md`
- Story 10: `stories/story-10-visual-input-drag-drop.md`
- Story 11: `stories/story-11-generative-sonic-ambience.md`

### Test Scenarios Summary

**By Priority:**
- P0: 12 tests (critical security/data)
- P1: 18 tests (core features)
- P2: 22 tests (edge cases)
- P3: 6 tests (exploratory)

**By Test Level:**
- E2E: 28 tests (voice flow, vision flow, permissions)
- Component: 12 tests (UI components, audio presets)
- Integration: 10 tests (API calls, state transitions)
- Unit: 8 tests (Levenshtein, parsers)
- Performance: 4 tests (CPU profiling, benchmarks)
- Security: 2 tests (API key audit, permission bypass)

**By Risk Category:**
- SEC (Security): 8 tests
- PERF (Performance): 10 tests
- DATA (Data): 6 tests
- TECH (Technical): 8 tests
- UX (User Experience): 6 tests
- OPS (Operations): 4 tests

---

**Generated by**: BMad TEA Agent - Murat (Test Architect)  
**Workflow**: `_bmad/bmm/testarch/test-design`  
**Version**: 6.0 (BMad Module v6)  
**Execution Time**: ~12 minutes (risk assessment + coverage planning)
