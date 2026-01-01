/**
 * k6 Load Test: API Endpoints Under Load
 * 
 * ASR-2: UI Performance at Scale (Score: 9 - BLOCK)
 * Test ID: PERF-006
 * Priority: P0
 * 
 * Validates: API endpoints maintain performance under load (p95 < 500ms, error rate < 1%)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    errors: ['rate<0.01'],            // Error rate < 1%
    api_duration: ['p(95)<500'],      // API endpoints < 500ms
  },
};

export default function () {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

  // Test 1: Agent creation endpoint
  const createResponse = http.post(
    `${BASE_URL}/api/agents/create`,
    JSON.stringify({
      storyId: `story-${__VU}-${__ITER}`,
      agentType: 'developer',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  check(createResponse, {
    'agent creation status is 201': (r) => r.status === 201,
    'agent creation responds in <500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(createResponse.status !== 201);
  apiDuration.add(createResponse.timings.duration);

  // Test 2: File listing endpoint
  const filesResponse = http.get(`${BASE_URL}/api/files`);
  check(filesResponse, {
    'files status is 200': (r) => r.status === 200,
    'files responds in <500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(filesResponse.status !== 200);
  apiDuration.add(filesResponse.timings.duration);

  // Test 3: RAG query endpoint
  const ragResponse = http.post(
    `${BASE_URL}/api/rag/query`,
    JSON.stringify({
      query: 'test query',
      limit: 5,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  check(ragResponse, {
    'rag query status is 200': (r) => r.status === 200,
    'rag query responds in <1s': (r) => r.timings.duration < 1000, // RAG can be slower
  });
  errorRate.add(ragResponse.status !== 200);

  sleep(1); // Realistic think time
}
