# Security Hardening - Story 6-4

## Overview

This document describes the security features implemented in Story 6-4 to protect the NeuralDeck application against common web vulnerabilities.

## Security Features

### 1. JWT-Based Authentication

All API endpoints requiring authentication use JWT (JSON Web Tokens) for session management.

**Creating a Session:**
```bash
curl -X POST http://localhost:3001/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"userId":"your-user-id"}'
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 86400,
  "userId": "your-user-id"
}
```

**Using the Token:**
```bash
curl http://localhost:3001/api/config/keys \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. API Key Management

API keys are now stored securely on the backend, encrypted at rest using AES-256-GCM.

**Set an API Key:**
```bash
curl -X POST http://localhost:3001/api/config/keys/openai \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-..."}'
```

**List Providers:**
```bash
curl http://localhost:3001/api/config/keys \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get API Key (Masked):**
```bash
curl http://localhost:3001/api/config/keys/openai \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Content Security Policy (CSP)

CSP headers are configured to prevent XSS and other injection attacks.

**Development Mode:**
- Report-only mode
- Allows inline scripts for Vite

**Production Mode:**
- Enforcement mode
- Strict script and style sources
- Blocks unauthorized connections

### 4. CSRF Protection

All state-changing requests (POST, PUT, DELETE, PATCH) require a CSRF token.

**Get CSRF Token:**
```bash
curl http://localhost:3001/api/auth/csrf-token
```

**Use CSRF Token:**
```bash
curl -X POST http://localhost:3001/api/write \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{"filePath":"test.txt","content":"Hello"}'
```

### 5. WebSocket Authentication

Socket.IO connections require a valid JWT token in the handshake.

**Frontend Example:**
```typescript
import { io } from 'socket.io-client';
import { authService } from './services/auth';

const socket = io('http://localhost:3001', {
  auth: {
    token: authService.getToken()
  }
});
```

### 6. Security Audit Logging

All security-sensitive operations are logged to `.neuraldeck/logs/security-audit.jsonl`.

**View Audit Logs:**
```bash
curl http://localhost:3001/api/security/audit-logs?limit=100 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Log Events:**
- FILE_WRITE / FILE_READ
- COMMAND_EXEC
- AUTH_ATTEMPT
- SESSION_CREATE / SESSION_REFRESH / SESSION_INVALIDATE
- API_KEY_OPERATION
- SOCKET_AUTH_SUCCESS / SOCKET_AUTH_FAILED

## Environment Configuration

Create a `.env.local` file with the following variables:

```bash
# JWT Configuration
JWT_SECRET=generate-with-openssl-rand-hex-32
SESSION_EXPIRY=86400

# Server Configuration
PORT=3001

# API Keys (stored securely via API endpoints)
# Do NOT put API keys in .env.local - use the API endpoints instead
```

**Generate JWT Secret:**
```bash
openssl rand -hex 32
```

## Frontend Integration

The frontend automatically handles authentication:

1. **Auth Service** (`src/services/auth.ts`):
   - Manages JWT tokens in memory (not localStorage)
   - Automatic token refresh
   - CSRF token management

2. **Socket Connection** (`src/hooks/useSocket.ts`):
   - Sends JWT token in handshake
   - Auto-reconnects with new token

3. **API Calls** (`src/services/api.ts`):
   - Uses auth service for authenticated requests
   - Automatically includes Authorization header
   - Handles 401 responses with token refresh

**Example:**
```typescript
import { authService } from './services/auth';

// Create session on app startup
await authService.createSession('anonymous');

// Make authenticated request
const response = await authService.fetch('/api/config/keys');
```

## Security Best Practices

### For Developers

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Use auth endpoints for API keys** - Don't hardcode in frontend
3. **Always use `authService.fetch()`** for authenticated requests
4. **Check `isAuthenticated()`** before accessing protected features

### For Deployment

1. **Set strong JWT_SECRET** - Use `openssl rand -hex 32`
2. **Enable HTTPS** - Set `NODE_ENV=production`
3. **Configure CORS** - Set `CORS_ORIGINS` environment variable
4. **Use Redis for sessions** - Replace in-memory Map with Redis
5. **Monitor audit logs** - Set up log aggregation
6. **Rotate API keys** - Use the API key endpoints
7. **Enable rate limiting** - Configure per-user limits

## Testing Security

Run the security test suite:

```bash
# Start server
node server.cjs

# In another terminal
./scripts/test-security.sh
```

## Troubleshooting

### "Authentication required" Error

**Cause:** No JWT token provided or token expired.

**Solution:**
```typescript
// Create new session
await authService.createSession();
```

### "Session expired or invalidated" Error

**Cause:** Session was invalidated or expired.

**Solution:**
```typescript
// Refresh token
await authService.refreshSession();

// Or create new session
await authService.logout();
await authService.createSession();
```

### WebSocket Connection Fails

**Cause:** No JWT token in handshake.

**Solution:**
```typescript
// Ensure auth service has valid token
if (!authService.isAuthenticated()) {
  await authService.createSession();
}

// Socket will auto-use token from auth service
```

### CSRF Token Validation Fails

**Cause:** Missing or invalid CSRF token.

**Solution:**
```typescript
// Auth service handles CSRF automatically
const response = await authService.fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

## Architecture Decisions

### Why JWT?

- Stateless authentication (scalable)
- Can be validated without database lookup
- Industry standard with good library support
- Easy to implement refresh tokens

### Why AES-256-GCM for API Keys?

- Authenticated encryption (integrity + confidentiality)
- NIST recommended
- Fast and secure
- No padding oracle attacks

### Why In-Memory Sessions?

- Fast access (no database round-trip)
- Simple for development
- Easy to migrate to Redis for production

### Why CSRF Protection?

- Prevents cross-site request forgery
- Required for session-based auth
- Complements JWT authentication

## Security Headers

The following headers are automatically set:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000 (production only)
```

## Rate Limiting

Default rate limits:
- 100 requests per minute per IP
- Applies to all endpoints
- Returns 429 Too Many Requests when exceeded

## Future Enhancements

- [ ] OAuth2 integration
- [ ] Two-factor authentication (2FA)
- [ ] API key rotation
- [ ] Per-user rate limiting
- [ ] Redis session store
- [ ] Security metrics dashboard
- [ ] Automated security scanning
- [ ] Penetration testing

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [Fastify Security](https://fastify.dev/docs/latest/Guides/Security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
