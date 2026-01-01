# Story 5.3: Threat Assessment Dashboard

Status: done

## Story

**As a** Security Analyst
**I want** a dashboard panel that shows identified vulnerabilities categorized by severity
**So that** I can prioritize security fixes and understand the overall security posture of my codebase.

## Acceptance Criteria

1. **Given** Red Team agents have completed security analysis
   **When** vulnerabilities are identified
   **Then** the system must display a Threat Assessment Dashboard panel
   **And** the dashboard must show vulnerabilities organized by severity: Critical, High, Medium, Low
   **And** each vulnerability must display: type, location (file path), description, and recommended fix

2. **Given** the Threat Assessment Dashboard is displayed
   **When** the user views the dashboard
   **Then** vulnerabilities must be sorted by severity (Critical first)
   **And** each severity category must have a distinct visual indicator (color, icon)
   **And** the dashboard must show total counts for each severity level

3. **Given** vulnerabilities are displayed in the dashboard
   **When** the user interacts with a vulnerability
   **Then** clicking a vulnerability must show detailed information (code snippet, impact, remediation steps)
   **And** the user must be able to mark vulnerabilities as "Reviewed", "Fixed", or "False Positive"
   **And** vulnerability status changes must be persisted

4. **Given** the dashboard is active
   **When** new vulnerabilities are discovered
   **Then** the dashboard must update in real-time
   **And** new vulnerabilities must be highlighted or animated to draw attention
   **And** the severity counts must update automatically

5. **Given** the Threat Assessment Dashboard is displayed
   **When** the user wants to export findings
   **Then** the system must provide export functionality (e.g., JSON, CSV, PDF)
   **And** the export must include all vulnerability details
   **And** the export must be formatted for sharing with development teams

## Tasks / Subtasks

- [x] **Task 1: Sprint Artifact Document** (AC: all)
  - [x] Create story file with acceptance criteria
  - [x] Define tasks and subtasks

- [x] **Task 2: ThreatDashboard Component** (AC: 1, 2)
  - [x] Create `src/components/ThreatDashboard.tsx`
  - [x] Display severity summary cards (Critical, High, Medium, Low counts)
  - [x] List vulnerabilities grouped by severity
  - [x] Show vulnerability details (type, file path, description, remediation)
  - [x] Apply War Room red theme styling

- [x] **Task 3: Vulnerability Interaction** (AC: 3)
  - [x] Add expandable vulnerability cards with detailed info
  - [x] Show code snippet, impact, and remediation steps on click
  - [x] Implement status dropdown (Open, Reviewed, Fixed, False Positive)
  - [x] Persist status changes via API

- [x] **Task 4: Real-Time Updates** (AC: 4)
  - [x] Subscribe to WebSocket events (`security:finding-discovered`, etc.)
  - [x] Animate new vulnerabilities when added
  - [x] Auto-update severity counts
  - [x] Integrate with existing socket hook

- [x] **Task 5: Export Functionality** (AC: 5)
  - [x] Add export button with format dropdown
  - [x] Implement JSON export
  - [x] Implement CSV export
  - [x] Format exports for team sharing

- [x] **Task 6: Unit Tests** (AC: all)
  - [x] Test severity grouping logic
  - [x] Test vulnerability rendering
  - [x] Test status update functionality
  - [x] Test export functions

## Dev Notes

### Color Scheme (War Room Theme)

- **Critical**: `bg-red-600/20`, `text-red-600`, `border-red-600`
- **High**: `bg-orange-500/20`, `text-orange-500`, `border-orange-500`
- **Medium**: `bg-yellow-500/20`, `text-yellow-500`, `border-yellow-500`
- **Low**: `bg-blue-400/20`, `text-blue-400`, `border-blue-400`

### Existing Infrastructure

1. **Security Types** (`src/types.ts`):
   - `VulnerabilityFinding`, `VulnerabilitySeverity`, `VulnerabilityType`, `SecurityReport`

2. **Security Analyzer** (`src/services/securityAnalyzer.ts`):
   - `getSeverityColor()`, `getSeverityBgColor()`, `getVulnerabilityLabel()`
   - `VULNERABILITY_INFO` metadata

3. **Backend API** (`server.cjs`):
   - `GET /api/security/findings/:scanId` - Get findings
   - `PUT /api/security/findings/:scanId/:findingId` - Update finding status
   - `GET /api/security/report/:scanId` - Get full report

4. **WebSocket Events**:
   - `security:finding-discovered` - New finding
   - `security:finding-updated` - Status changed
   - `security:scan-completed` - Scan finished

### References

- [Source: docs/epics.md#Story 5.3]
- [Source: src/services/securityAnalyzer.ts] - Utility functions
- [Source: src/types.ts] - Security types

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Console logs prefixed with `[ThreatDash]` for dashboard operations

### Completion Notes List

1. Created `ThreatDashboard` component with full War Room aesthetic (AC: 1, 2)
2. Implemented severity summary cards with clickable filtering (AC: 2)
3. Added expandable vulnerability cards with detailed info (AC: 3)
4. Implemented status dropdown with API persistence (AC: 3)
5. Added WebSocket event handlers in `useSocket.ts` for real-time updates (AC: 4)
6. Implemented `addFinding` function exposed globally for WebSocket integration (AC: 4)
7. Added JSON and CSV export functionality with proper formatting (AC: 5)
8. Created comprehensive unit tests covering all acceptance criteria (AC: all)
9. Updated sprint-status.yaml to mark Epic 5 as complete

### File List

**Created:**
- `src/components/ThreatDashboard.tsx` - Main dashboard component (~450 lines)
- `tests/components/ThreatDashboard.test.tsx` - Unit tests (~350 lines)

**Modified:**
- `src/hooks/useSocket.ts` - Added security event types, state, and control functions (~130 lines added)
- `docs/sprint-artifacts/sprint-status.yaml` - Updated story and epic status
