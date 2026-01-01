#!/bin/bash
# Security Hardening Test Script - Story 6-4

API_BASE="http://localhost:3001/api"

echo "========================================="
echo "Security Hardening Test Suite - Story 6-4"
echo "========================================="
echo ""

# Test 1: Health Check
echo "[TEST 1] Health Check..."
curl -s http://localhost:3001/health | jq . || echo "FAILED"
echo ""

# Test 2: Create Session
echo "[TEST 2] Create Session..."
SESSION_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/session" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user"}')
echo "$SESSION_RESPONSE" | jq .
TOKEN=$(echo "$SESSION_RESPONSE" | jq -r '.token')
REFRESH_TOKEN=$(echo "$SESSION_RESPONSE" | jq -r '.refreshToken')
echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 3: Get CSRF Token
echo "[TEST 3] Get CSRF Token..."
curl -s "${API_BASE}/auth/csrf-token" | jq .
echo ""

# Test 4: Access Protected Endpoint (Audit Logs)
echo "[TEST 4] Access Protected Endpoint (with auth)..."
curl -s "${API_BASE}/security/audit-logs?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.logs | length'
echo ""

# Test 5: Access Protected Endpoint (without auth)
echo "[TEST 5] Access Protected Endpoint (without auth) - Should fail..."
curl -s "${API_BASE}/security/audit-logs?limit=5" | jq .
echo ""

# Test 6: Refresh Token
echo "[TEST 6] Refresh Token..."
curl -s -X POST "${API_BASE}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq .
echo ""

# Test 7: List API Key Providers (authenticated)
echo "[TEST 7] List API Key Providers..."
curl -s "${API_BASE}/config/keys" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# Test 8: Logout
echo "[TEST 8] Logout..."
curl -s -X POST "${API_BASE}/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# Test 9: Try to use token after logout (should fail)
echo "[TEST 9] Use Token After Logout - Should fail..."
curl -s "${API_BASE}/security/audit-logs?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo "========================================="
echo "Test Suite Complete!"
echo "========================================="
