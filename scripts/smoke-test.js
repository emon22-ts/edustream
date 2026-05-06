// scripts/smoke-test.js
// Basic smoke test - validates the app starts and responds to /health

const { spawn } = require('child_process');
const http = require('http');

console.log('[Smoke] Starting smoke test...');

// Skip if no env vars (CI without secrets)
if (!process.env.COSMOS_CONNECTION_STRING) {
  console.log('[Smoke] Skipping - no COSMOS_CONNECTION_STRING in environment');
  process.exit(0);
}

const server = spawn('node', ['src/server.js'], {
  env: { ...process.env, PORT: 3001 },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', d => output += d.toString());
server.stderr.on('data', d => output += d.toString());

setTimeout(() => {
  http.get('http://localhost:3001/api/health', res => {
    if (res.statusCode === 200) {
      console.log('[Smoke] ✅ Health check passed');
      server.kill();
      process.exit(0);
    } else {
      console.error('[Smoke] ❌ Health check returned', res.statusCode);
      console.error('[Smoke] Output:', output);
      server.kill();
      process.exit(1);
    }
  }).on('error', err => {
    console.error('[Smoke] ❌ Connection failed:', err.message);
    console.error('[Smoke] Output:', output);
    server.kill();
    process.exit(1);
  });
}, 5000);
