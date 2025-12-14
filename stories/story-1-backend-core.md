# Story 1: Initialize Fastify Backend Core

**Role:** Backend Developer
**Feature:** Core Server Infrastructure
**Status:** Done

## Description
Initialize the Node.js backend using **Fastify** as the replacement for Express. This server will act as the API Gateway for the Neural Grid.

## Technical Tasks
1.  [x] Initialize `server.js` (or `server/index.js`) with `fastify`.
2.  [x] Install dependencies: `fastify`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`.
3.  [x] Implement **Defensive Middleware**:
    *   Configure CORS to allow localhost:3000 (Frontend).
    *   Configure Helmet for security headers.
    *   Configure Rate Limiting (100 req/min).
4.  [x] Create **Unified LLM Gateway** route (`POST /api/chat`):
    *   Must accept `{ messages, config }`.
    *   Must proxy to `http://localhost:8000/v1` (Local) or OpenAI API based on config.
5.  [x] Create **File System API** (`GET /api/files`, `POST /api/read`, `POST /api/write`).
    *   **Security:** Verify `safePath` logic to prevent traversal.

## Acceptance Criteria
*   Running `node server.js` starts the server on Port 3001.
*   `curl http://localhost:3001/health` returns `{ status: "ONLINE" }`.
*   Shell commands and critical system ops are secured.
