# Sprint Change Proposal: CLI LLM Connections & LM Studio Fix

**Date:** 2026-01-01
**Initiated By:** Moe (via correct-course workflow)
**Scope Classification:** Moderate

---

## Section 1: Issue Summary

### Problem Statement
The NeuralDeck application needs to support multiple CLI-based AI tools for LLM connections. Currently, the system has:
- A generic `cli` provider type with a `cliCommand` template field
- HTTP-based providers (vllm, gemini, anthropic, openai) that route through the backend

**Requested Changes:**
1. Add Gemini CLI support
2. Add Claude Code CLI support
3. Add GitHub Copilot CLI support
4. Add Cursor Agent CLI support
5. Fix LM Studio local model connection (not working currently)

### Evidence
- User has LM Studio running locally but connections fail in the app
- The backend `/api/chat` endpoint (server.cjs:289-330) only handles HTTP-based OpenAI-compatible APIs
- No CLI execution logic exists for AI tools - the `cliCommand` field is captured but never executed

---

## Section 2: Impact Analysis

### Epic Impact
- **Epic 1 (Backend Core)**: Story 1-1 gateway needs CLI execution handler
- **Epic 3 (Omnipresence)**: May benefit from CLI tool integration for voice/vision features

### Story Impact
**Current Stories Affected:**
- Story 1-1: Secure Backend Gateway - needs CLI execution handler added
- Story 1-2: Tool Execution Security - CLI commands need whitelist handling

**New Stories Required:**
- Story X-1: CLI LLM Provider Support (add CLI execution to backend)
- Story X-2: LM Studio Provider Type (OpenAI-compatible local server)

### Artifact Conflicts

**types.ts (Line 27):**
```typescript
// OLD:
export type LlmProvider = 'vllm' | 'gemini' | 'anthropic' | 'cli' | 'copilot' | 'openai' | 'mock';

// NEW:
export type LlmProvider =
  | 'vllm'
  | 'gemini'
  | 'anthropic'
  | 'cli'
  | 'copilot'
  | 'openai'
  | 'mock'
  | 'lmstudio'        // OpenAI-compatible local server
  | 'claude-cli'      // Claude Code CLI
  | 'gemini-cli'      // Gemini CLI
  | 'copilot-cli'     // GitHub Copilot CLI
  | 'cursor-cli';     // Cursor Agent CLI
```

**TheConnections.tsx (Lines 113-119):**
```typescript
// OLD:
<select>
    <option value="vllm">OpenAI / vLLM / LocalAI</option>
    <option value="gemini">Google Gemini API</option>
    <option value="anthropic">Anthropic Claude API</option>
    <option value="cli">Local CLI (Ollama/Shell)</option>
    <option value="copilot">GitHub Copilot</option>
</select>

// NEW:
<select>
    <option value="vllm">OpenAI / vLLM / LocalAI</option>
    <option value="lmstudio">LM Studio (Local)</option>
    <option value="gemini">Google Gemini API</option>
    <option value="anthropic">Anthropic Claude API</option>
    <option value="cli">Local CLI (Ollama/Shell)</option>
    <option value="copilot">GitHub Copilot API</option>
    <option value="claude-cli">Claude Code CLI</option>
    <option value="gemini-cli">Gemini CLI</option>
    <option value="copilot-cli">GitHub Copilot CLI</option>
    <option value="cursor-cli">Cursor Agent CLI</option>
</select>
```

**server.cjs (After Line 330):**
New CLI execution handler needed for CLI-based providers.

### Technical Impact
1. **Backend CLI Execution**: Need `child_process.spawn` handler for CLI tools
2. **Security Whitelist**: CLI commands must be validated against ALLOWED_COMMANDS
3. **UI Dynamic Forms**: Each CLI provider needs specific configuration fields

---

## Section 3: Recommended Approach

### Chosen Path: Direct Adjustment
Modify existing code to add CLI provider support without restructuring.

### Rationale
- The codebase already has `cliCommand` field infrastructure
- Adding new provider types is additive, not breaking
- LM Studio is OpenAI-compatible, so minimal backend changes needed

### Implementation Plan

#### Phase 1: Fix LM Studio (Quick Win)
LM Studio uses OpenAI-compatible API. The issue is likely:
- Incorrect base URL (should be `http://localhost:1234/v1`)
- Missing model name configuration

**Fix:** Ensure `lmstudio` provider uses correct defaults:
- Base URL: `http://localhost:1234/v1`
- Model: User-specified from LM Studio UI

#### Phase 2: Add CLI Providers (Moderate)
1. Update `types.ts` with new provider types
2. Update `TheConnections.tsx` with provider options and dynamic forms
3. Add CLI execution handler in `server.cjs`

#### Phase 3: Security Review
- Validate CLI commands don't bypass security whitelist
- Add specific patterns for AI CLI tools

### Effort Estimate
- **Phase 1 (LM Studio)**: 30 minutes
- **Phase 2 (CLI Providers)**: 2-3 hours
- **Phase 3 (Security)**: 1 hour

### Risk Assessment
- **Low Risk**: Adding new provider types is non-breaking
- **Medium Risk**: CLI execution could introduce security concerns
- **Mitigation**: Use spawn with strict argument parsing, not shell execution

---

## Section 4: Detailed Change Proposals

### Proposal 4.1: types.ts - Add Provider Types

**File:** `src/types.ts`
**Line:** 27

```typescript
// OLD:
export type LlmProvider = 'vllm' | 'gemini' | 'anthropic' | 'cli' | 'copilot' | 'openai' | 'mock';

// NEW:
export type LlmProvider =
  | 'vllm'
  | 'lmstudio'
  | 'gemini'
  | 'anthropic'
  | 'cli'
  | 'copilot'
  | 'openai'
  | 'mock'
  | 'claude-cli'
  | 'gemini-cli'
  | 'copilot-cli'
  | 'cursor-cli';
```

**Rationale:** Distinct provider types allow for specific UI forms and backend handling per CLI tool.

---

### Proposal 4.2: TheConnections.tsx - Provider Selection

**File:** `src/components/TheConnections.tsx`
**Lines:** 108-120

Add new provider options to the dropdown and dynamic form sections for each CLI tool.

**Changes:**
1. Add dropdown options for each new provider
2. Add dynamic form section for LM Studio (Base URL + Model)
3. Add dynamic form sections for CLI tools (Command templates)

---

### Proposal 4.3: server.cjs - CLI Execution Handler

**File:** `server.cjs`
**After Line:** 330

Add a new handler for CLI-based providers:

```javascript
// CLI Provider Handler
if (['claude-cli', 'gemini-cli', 'copilot-cli', 'cursor-cli', 'cli'].includes(provider)) {
    const { cliCommand } = config || {};

    if (!cliCommand) {
        reply.code(400).send({ error: 'CLI command template required for CLI providers' });
        return;
    }

    // Build prompt from messages
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    // Replace template placeholder
    const command = cliCommand.replace('{{prompt}}', prompt.replace(/"/g, '\\"'));

    // Execute with spawn for security
    // ... implementation details
}
```

---

### Proposal 4.4: LM Studio Default Configuration

**File:** `src/components/TheConnections.tsx`

When user selects `lmstudio` provider, auto-populate:
- Base URL: `http://localhost:1234/v1`
- Show model input with hint: "Check LM Studio UI for model name"

---

## Section 5: Implementation Handoff

### Change Scope: Moderate
This change requires:
- Type updates (minor)
- UI component updates (moderate)
- Backend handler addition (moderate)

### Handoff Recipients
- **Primary:** Development team (dev agent)
- **Review:** Security auditor (sec_auditor agent) for CLI execution validation

### Success Criteria
1. [ ] LM Studio connection works with local models
2. [ ] Claude Code CLI can execute prompts via `claude` command
3. [ ] Gemini CLI can execute via `gemini` command
4. [ ] Copilot CLI can execute via `gh copilot` command
5. [ ] Cursor CLI can execute via `cursor` command
6. [ ] All CLI executions pass security whitelist validation
7. [ ] Test connection button works for all provider types

### Next Steps
1. User approves this proposal
2. Create story file for CLI LLM Support
3. Implement Phase 1 (LM Studio fix)
4. Implement Phase 2 (CLI providers)
5. Security review by sec_auditor
6. Integration testing

---

**Status:** Awaiting User Approval

🤖 Generated with [Claude Code](https://claude.com/claude-code)
