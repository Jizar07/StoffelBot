const { exec } = require('child_process');
const path = require('path');

// Set environment variables
process.env.PORT = '3140';
process.env.NODE_ENV = 'development';

// Start nodemon for auto-restart
const nodemonPath = path.join(__dirname, 'node_modules', '.bin', 'nodemon');
const child = exec(`"${nodemonPath}" app.js`, {
  cwd: __dirname,
  env: process.env
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('exit', (code) => {
  console.log(`Backend dev server exited with code ${code}`);
});