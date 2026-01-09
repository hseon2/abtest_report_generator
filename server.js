#!/usr/bin/env node

// Railway의 PORT 환경 변수를 명시적으로 사용하는 스크립트
const { spawn } = require('child_process');

const port = process.env.PORT || '3000';

console.log('=== Starting Next.js Server ===');
console.log(`PORT environment variable: ${process.env.PORT || 'not set (using default 3000)'}`);
console.log(`Starting Next.js on: 0.0.0.0:${port}`);

// 에러 핸들링
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

let nextProcess = null;

// SIGTERM 처리
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (nextProcess) {
    nextProcess.kill('SIGTERM');
  }
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (nextProcess) {
    nextProcess.kill('SIGINT');
  }
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

// Next.js 시작
nextProcess = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    PORT: port
  }
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  console.error('Error details:', err.message);
  process.exit(1);
});

nextProcess.on('exit', (code, signal) => {
  console.log(`Next.js process exited with code ${code} and signal ${signal}`);
  if (code !== null && code !== 0) {
    console.error(`Next.js exited with error code: ${code}`);
    process.exit(code);
  }
});

// 프로세스가 정상적으로 시작되었는지 확인
setTimeout(() => {
  if (nextProcess && nextProcess.pid) {
    console.log(`✓ Next.js server started successfully (PID: ${nextProcess.pid})`);
    console.log(`✓ Server listening on http://0.0.0.0:${port}`);
  } else {
    console.error('✗ Next.js process failed to start');
    process.exit(1);
  }
}, 2000);

