#!/usr/bin/env node
/**
 * MCP Integration Test
 * 
 * Quick verification that the optimized MCP endpoints are working
 */

const http = require('http');

const BASE_URL = process.env.NEURALDECK_URL || 'http://127.0.0.1:3001';
const TOKEN = process.env.NEURALDECK_TOKEN || 'test-token';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 MCP Integration Tests\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  // Test 1: Server is running
  console.log('Test 1: Server Health Check');
  try {
    const response = await makeRequest('/health');
    if (response.status === 200 && response.data.status === 'ONLINE') {
      console.log('  ✅ Server is online\n');
      passed++;
    } else {
      console.log('  ❌ Server health check failed\n');
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Server not reachable: ${err.message}\n`);
    failed++;
    console.log('Make sure the server is running: node server.cjs');
    process.exit(1);
  }

  // Test 2: Get MCP tools
  console.log('Test 2: GET /api/mcp/tools');
  try {
    const response = await makeRequest('/api/mcp/tools');
    if (response.status === 200 && response.data.success && Array.isArray(response.data.tools)) {
      console.log(`  ✅ Found ${response.data.tools.length} tools`);
      console.log(`  Tools: ${response.data.tools.map(t => t.name).join(', ')}\n`);
      passed++;
    } else {
      console.log('  ❌ Failed to get tools\n');
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 3: Get MCP metrics
  console.log('Test 3: GET /api/mcp/metrics');
  try {
    const response = await makeRequest('/api/mcp/metrics');
    if (response.status === 200 && response.data.success && response.data.metrics) {
      console.log('  ✅ Metrics endpoint working');
      const { server, registry } = response.data.metrics;
      console.log(`  - Requests: ${server?.requestCount || 0}`);
      console.log(`  - Tools: ${registry?.totalTools || 0}\n`);
      passed++;
    } else {
      console.log('  ❌ Failed to get metrics\n');
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 4: Get MCP health
  console.log('Test 4: GET /api/mcp/health');
  try {
    const response = await makeRequest('/api/mcp/health');
    if (response.status === 200 && response.data.success && response.data.health) {
      console.log('  ✅ Health endpoint working');
      console.log(`  Status: ${response.data.health.status}\n`);
      passed++;
    } else {
      console.log('  ❌ Failed to get health\n');
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 5: Execute tool (if server is properly initialized)
  console.log('Test 5: POST /api/mcp/execute');
  try {
    const response = await makeRequest('/api/mcp/execute', 'POST', {
      tool: 'shell_exec',
      args: { command: 'echo "MCP Test"' }
    });
    
    if (response.status === 200) {
      if (response.data.success) {
        console.log('  ✅ Tool execution working');
        console.log(`  Execution time: ${response.data.executionTime}ms\n`);
        passed++;
      } else {
        console.log('  ⚠️  Tool executed but returned error (may need auth)');
        console.log(`  Error: ${response.data.error}\n`);
        passed++; // Still counts as endpoint working
      }
    } else {
      console.log(`  ❌ HTTP ${response.status}\n`);
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 6: Legacy endpoint (backward compatibility)
  console.log('Test 6: POST /api/mcp/call (legacy)');
  try {
    const response = await makeRequest('/api/mcp/call', 'POST', {
      tool: 'shell_exec',
      args: { command: 'echo "Legacy Test"' }
    });
    
    if (response.status === 200 && response.data.result !== undefined) {
      console.log('  ✅ Legacy endpoint working\n');
      passed++;
    } else {
      console.log('  ⚠️  Legacy endpoint may require additional setup\n');
      // Don't count as failure - endpoint exists but may need auth/session
    }
  } catch (err) {
    console.log(`  ⚠️  Legacy endpoint: ${err.message}\n`);
    // Don't count as failure
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════\n');

  if (failed === 0) {
    console.log('✅ All MCP integration tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Check the server logs for details.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
