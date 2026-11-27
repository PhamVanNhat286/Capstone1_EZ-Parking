'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');

const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const adminRoot = path.resolve(__dirname, '..');
const backendDir = path.join(adminRoot, 'backend');
const frontendDir = path.join(adminRoot, 'frontend');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [];
let shuttingDown = false;

function pipeWithPrefix(stream, prefix, target) {
  let buffer = '';
  stream.on('data', chunk => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      target.write(`${prefix} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer) target.write(`${prefix} ${buffer}\n`);
  });
}

function launch(name, cwd) {
  const isWin = process.platform === 'win32';
  const child = isWin
    ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run ${mode}`], {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      })
    : spawn(npmCmd, ['run', mode], {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });
  pipeWithPrefix(child.stdout, `[${name}]`, process.stdout);
  pipeWithPrefix(child.stderr, `[${name}]`, process.stderr);
  child.on('exit', code => {
    if (!shuttingDown && code && code !== 0) {
      console.error(`[${name}] Đã dừng với mã thoát ${code}.`);
      shutdown(code);
    }
  });
  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log(`[EZ-Space Admin] Đang khởi động Backend (Node.js :8000) và Frontend (Next.js :3002) ở chế độ "${mode}"...`);
launch('BACKEND', backendDir);
launch('FRONTEND', frontendDir);

