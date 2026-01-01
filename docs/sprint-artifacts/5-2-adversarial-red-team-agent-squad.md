# Story 5.2: Adversarial Red Team Agent Squad

Status: done

## Story

**As a** Security Analyst
**I want** to select and deploy a "Red Team" agent squad to audit code and attempt penetration testing
**So that** I can identify security vulnerabilities through adversarial testing.

## Acceptance Criteria

1. **Given** the War Room Security Suite is active
   **When** the user wants to run security auditing
   **Then** the system must provide a "Red Team" agent squad selection interface
   **And** the Red Team squad must consist of specialized security agents (e.g., Penetration Tester, Vulnerability Scanner, Code Auditor)
   **And** each Red Team agent must have a distinct security-focused persona

2. **Given** a Red Team agent squad is selected
   **When** the squad is deployed
   **Then** each Red Team agent must analyze the codebase from an adversarial perspective
   **And** agents must attempt to find security vulnerabilities (SQL injection, XSS, path traversal, etc.)
   **And** agents must attempt "penetration testing" by trying to exploit potential weaknesses

3. **Given** Red Team agents are analyzing code
   **When** they discover potential vulnerabilities
   **Then** each finding must be logged with severity level (Critical/High/Medium/Low)
   **And** findings must include: vulnerability type, file location, code snippet, potential impact
   **And** findings must be reported in real-time to the threat assessment dashboard

4. **Given** Red Team agents are active
   **When** they perform penetration testing attempts
   **Then** agents must use safe testing methods that don't damage the codebase
   **And** agents must log all testing attempts and results
   **And** agents must respect the system's security boundaries (don't actually exploit, just test)

5. **Given** the Red Team agent squad is deployed
   **When** agents complete their analysis
   **Then** the system must compile all findings into a comprehensive security report
   **And** the report must be accessible via the threat assessment dashboard
   **And** the system must support re-running Red Team analysis on updated code

## Tasks / Subtasks

- [x] **Task 1: Red Team Agent Definitions** (AC: 1)
  - [x] Add `pen_tester` agent to AGENT_DEFINITIONS
  - [x] Add `vuln_scanner` agent to AGENT_DEFINITIONS
  - [x] Add `code_auditor` agent to AGENT_DEFINITIONS
  - [x] Update AgentProfile type in types.ts

- [x] **Task 2: Vulnerability Types & Findings** (AC: 2, 3)
  - [x] Create `src/services/securityAnalyzer.ts`
  - [x] Define `VulnerabilityFinding` interface
  - [x] Define `VulnerabilitySeverity` type: 'Critical' | 'High' | 'Medium' | 'Low'
  - [x] Define `VulnerabilityType` enum (SQL_INJECTION, XSS, PATH_TRAVERSAL, etc.)
  - [x] Create `SecurityReport` interface

- [x] **Task 3: Red Team Engine** (AC: 2, 4)
  - [x] Create `RedTeamEngine` class in securityAnalyzer.ts
  - [x] Implement `deploySquad()` method
  - [x] Implement `analyzeFile()` method
  - [x] Implement `parseFindings()` method (safe testing - analysis only)
  - [x] Add progress callbacks for real-time updates

- [x] **Task 4: Security Report Generation** (AC: 3, 5)
  - [x] Create `SecurityReport` interface
  - [x] Implement `generateReport()` method
  - [x] Add findings aggregation by severity
  - [x] Add findings grouping by type and file

- [x] **Task 5: Backend API Endpoints** (AC: 3, 5)
  - [x] Add `/api/security/scan` endpoint to initiate scan
  - [x] Add `/api/security/findings/:scanId` endpoint to get findings
  - [x] Add `/api/security/report/:scanId` endpoint to get full report
  - [x] Add WebSocket events for real-time finding updates
  - [x] Add `/api/security/scan/:scanId/complete` endpoint
  - [x] Add `/api/security/scan/:scanId/cancel` endpoint

- [x] **Task 6: Unit Tests** (AC: all)
  - [x] Test Red Team agent definitions
  - [x] Test vulnerability type normalization
  - [x] Test severity normalization
  - [x] Test report generation
  - [x] Test utility functions

## Dev Notes

### Red Team Agent Personas

1. **Penetration Tester (pen_tester)**
   - Role: Offensive Security Specialist
   - Focus: Active exploitation attempts, bypass techniques
   - Color: `text-red-600`

2. **Vulnerability Scanner (vuln_scanner)**
   - Role: Automated Security Scanner
   - Focus: Pattern-based vulnerability detection (OWASP Top 10)
   - Color: `text-orange-500`

3. **Code Auditor (code_auditor)**
   - Role: Static Analysis Expert
   - Focus: Code review, security anti-patterns, insecure coding practices
   - Color: `text-yellow-500`

### Vulnerability Types (OWASP Top 10 + Custom)

```typescript
enum VulnerabilityType {
  SQL_INJECTION = 'SQL Injection',
  XSS = 'Cross-Site Scripting',
  PATH_TRAVERSAL = 'Path Traversal',
  COMMAND_INJECTION = 'Command Injection',
  INSECURE_DESERIALIZATION = 'Insecure Deserialization',
  BROKEN_AUTH = 'Broken Authentication',
  SENSITIVE_DATA_EXPOSURE = 'Sensitive Data Exposure',
  XXE = 'XML External Entities',
  BROKEN_ACCESS_CONTROL = 'Broken Access Control',
  SECURITY_MISCONFIGURATION = 'Security Misconfiguration',
  INSECURE_DEPENDENCY = 'Insecure Dependency',
  HARDCODED_SECRET = 'Hardcoded Secret',
  WEAK_CRYPTO = 'Weak Cryptography'
}
```

### Severity Definitions

- **Critical**: Exploitable remotely, no auth required, full system compromise
- **High**: Exploitable with some prerequisites, significant impact
- **Medium**: Limited exploitation, moderate impact
- **Low**: Informational, best practice violations

### Existing Infrastructure

1. **Agent System** (`src/services/agent.ts`):
   - Already has `red_teamer` and `sec_auditor` agents
   - Can add specialized Red Team variants

2. **War Room Theme** (Story 5-1):
   - UI already supports War Room mode
   - Red Team should activate when in War Room

### References

- [Source: docs/epics.md#Story 5.2]
- [Source: src/services/agent.ts] - Existing agent definitions
- OWASP Top 10 2021: https://owasp.org/Top10/

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Console logs prefixed with `[RedTeam]` for squad operations
- Console logs prefixed with `[Security]` for vulnerability findings

### Completion Notes List

1. Added `RedTeamAgent` type to `src/types.ts` with values: 'pen_tester', 'vuln_scanner', 'code_auditor', 'red_teamer' (AC: 1)
2. Added `VulnerabilityType`, `VulnerabilitySeverity`, `VulnerabilityFinding`, `SecurityReport` types (AC: 2, 3)
3. Created 3 specialized Red Team agents in `src/services/agent.ts`:
   - **Ghost (pen_tester)**: Attack simulation, exploit discovery, authentication bypass
   - **Sentinel (vuln_scanner)**: OWASP Top 10 pattern matching, dangerous function detection
   - **Cipher (code_auditor)**: Deep code review, trust boundary analysis, data flow tracking
4. Created `src/services/securityAnalyzer.ts` with `RedTeamEngine` class (AC: 1, 2, 4)
5. Implemented `VULNERABILITY_INFO` with 13 vulnerability types and CWE IDs (AC: 2)
6. Implemented finding parsing with type/severity normalization (AC: 3)
7. Added 11 backend API endpoints in `server.cjs` for security scanning (AC: 3, 5)
8. Implemented WebSocket events: `security:scan-started`, `security:finding-discovered`, `security:finding-updated`, `security:scan-completed`, `security:scan-cancelled` (AC: 4)
9. Created comprehensive unit tests in `tests/services/securityAnalyzer.test.ts` (AC: all)

### File List

**Created:**
- `src/services/securityAnalyzer.ts` - Red Team engine and vulnerability analysis (~500 lines)
- `tests/services/securityAnalyzer.test.ts` - Unit tests (~350 lines)

**Modified:**
- `src/services/agent.ts` - Added pen_tester, vuln_scanner, code_auditor agent definitions (~90 lines)
- `src/types.ts` - Added Red Team types (RedTeamAgent, VulnerabilityType, VulnerabilitySeverity, VulnerabilityFinding, SecurityReport) (~50 lines)
- `server.cjs` - Added Security Scanning API endpoints (~430 lines)
