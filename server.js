// Railway에서 PORT 환경 변수를 명시적으로 사용하도록 하는 스크립트
const { spawn } = require('child_process');
const port = process.env.PORT || '3000';

console.log(`Starting Next.js server on port ${port}...`);

const next = spawn('next', ['start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  shell: true
});

next.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

next.on('exit', (code) => {
  console.log(`Next.js server exited with code ${code}`);
  process.exit(code);
});

