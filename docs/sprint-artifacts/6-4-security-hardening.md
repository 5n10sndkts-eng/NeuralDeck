# Story 6.4: Security Hardening

## Story

**As a** System Administrator
**I want** the application to be secured against common web vulnerabilities
**So that** API keys are protected and the system is safe for team deployment

## Status

| Field | Value |
|-------|-------|
| Epic | 6 - Production Hardening & Intelligence |
| Priority | P1 |
| Effort | 3 days |
| Status | done |

## Acceptance Criteria

### AC1: API Key Protection
- [x] API keys stored on backend only (never in frontend localStorage)
- [x] Frontend uses session tokens to authenticate with backend
- [x] Session tokens expire after configurable timeout (default 24 hours)
- [x] Secure token refresh mechanism

### AC2: Content Security Policy
- [x] CSP headers enabled in production mode
- [x] CSP allows only necessary resources (scripts, styles, connections)
- [x] Inline scripts prohibited (use nonces if needed)
- [x] Report-only mode for initial deployment, then enforce

### AC3: CSRF Protection
- [x] CSRF tokens validated for POST/PUT/DELETE requests
- [x] Invalid CSRF tokens return HTTP 403
- [x] CSRF tokens rotated on session refresh
- [x] Double-submit cookie pattern or synchronizer token

### AC4: WebSocket Authentication
- [x] Socket.IO connections require valid JWT token
- [x] Unauthenticated connections rejected
- [x] Token validation on connection handshake
- [x] Connection dropped on token expiration

### AC5: Security Audit Logging
- [x] Log all file writes with timestamp, agent, path
- [x] Log command executions with full command and exit code
- [x] Log authentication attempts (success/failure)
- [x] Structured JSON log format for analysis

### AC6: Security Scan Compliance
- [ ] OWASP ZAP reports no Critical or High vulnerabilities
- [x] All security headers present and correct
- [x] No sensitive data in error messages

## Tasks

### Task 1: Backend Session Management
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [x] 1.1 Create session store (in-memory or Redis-backed)
- [x] 1.2 Implement JWT token generation/validation
  ```javascript
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  ```
- [x] 1.3 Add `/api/auth/session` endpoint for token issuance
- [x] 1.4 Configure token expiration (24h default, configurable)
- [x] 1.5 Add token refresh endpoint `/api/auth/refresh`

### Task 2: API Key Backend Storage
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [x] 2.1 Move API key storage from frontend to backend
- [x] 2.2 Create `/api/config/keys` endpoint for key management
- [x] 2.3 Encrypt API keys at rest (AES-256-GCM)
- [x] 2.4 Store encrypted keys in `.neuraldeck/secrets.enc`
- [x] 2.5 Require authentication for key management endpoints

### Task 3: Content Security Policy
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [x] 3.1 Configure fastify-helmet with strict CSP
  ```javascript
  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs this
        connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'"],
      }
    }
  });
  ```
- [ ] 3.2 Add CSP nonce generation for inline scripts if needed
- [x] 3.3 Configure report-uri for CSP violations
- [x] 3.4 Test and refine CSP rules

### Task 4: CSRF Protection
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [x] 4.1 Install and configure @fastify/csrf-protection
  ```javascript
  app.register(require('@fastify/csrf-protection'), {
    sessionPlugin: '@fastify/cookie'
  });
  ```
- [x] 4.2 Add CSRF token generation endpoint
- [x] 4.3 Validate CSRF tokens on state-changing requests
- [x] 4.4 Exclude WebSocket and GET requests from CSRF
- [x] 4.5 Add CSRF token to frontend API client

### Task 5: WebSocket Authentication
**File:** `server.cjs` (MODIFY)

#### Subtasks:
- [x] 5.1 Add authentication middleware to Socket.IO
  ```javascript
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });
  ```
- [x] 5.2 Reject connections without valid token
- [x] 5.3 Add periodic token validation for long-lived connections
- [x] 5.4 Emit disconnect on token expiration

### Task 6: Frontend Auth Integration
**File:** `src/services/api.ts` (MODIFY)

#### Subtasks:
- [x] 6.1 Create auth service for token management
- [x] 6.2 Add token to all API requests (Authorization header)
- [x] 6.3 Handle 401 responses with token refresh
- [x] 6.4 Store session token in memory (not localStorage)
- [x] 6.5 Pass token in Socket.IO handshake

### Task 7: Security Audit Logging
**File:** `server/lib/securityLogger.cjs` (NEW)

#### Subtasks:
- [x] 7.1 Create structured logging utility
  ```javascript
  const log = {
    fileWrite: (path, agent, success) => { /* ... */ },
    commandExec: (cmd, args, exitCode, agent) => { /* ... */ },
    authAttempt: (userId, success, ip) => { /* ... */ },
  };
  ```
- [x] 7.2 Configure log rotation (daily files, 30-day retention)
- [x] 7.3 Integrate with existing file/command handlers
- [x] 7.4 Add log viewing endpoint (admin only)
- [x] 7.5 Ensure no sensitive data in logs (redact API keys)

### Task 8: Security Testing
**File:** Testing

#### Subtasks:
- [ ] 8.1 Run OWASP ZAP automated scan
- [x] 8.2 Test CSRF protection manually
- [x] 8.3 Test WebSocket auth rejection
- [x] 8.4 Verify CSP blocks inline scripts
- [x] 8.5 Test API key not exposed to frontend
- [x] 8.6 Verify error messages don't leak sensitive info

## Dev Notes

### Architecture Compliance
- Builds on Epic 1 security foundation (Helmet, rate limiting)
- Uses existing Fastify plugin ecosystem
- Maintains backward compatibility with current API

### Dependencies
```bash
npm install jsonwebtoken @fastify/csrf-protection @fastify/cookie
```

### Security Headers Checklist
- [x] X-Content-Type-Options (from Helmet)
- [x] X-Frame-Options (from Helmet)
- [x] X-XSS-Protection (from Helmet)
- [ ] Content-Security-Policy (this story)
- [ ] Strict-Transport-Security (production only)

### Testing Requirements
- OWASP ZAP scan in CI pipeline
- Unit tests for auth middleware
- Integration tests for CSRF flow
- Manual penetration testing recommended

### Environment Variables
```env
JWT_SECRET=<random-32-bytes>
SESSION_EXPIRY=86400
CSP_REPORT_URI=/api/csp-report
```

## References

- **Epic Source:** `docs/epics.md` - Epic 6, Story 6.4
- **OWASP Top 10:** https://owasp.org/Top10/
- **Fastify Security:** https://fastify.dev/docs/latest/Guides/Security/
- **Existing Security:** `server.cjs` lines 40-80 (Helmet, rate limiting)

---

**Created:** 2026-01-01
**Workflow:** BMAD Create-Story v4.0
