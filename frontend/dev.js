const { exec } = require('child_process');
const path = require('path');

// Set environment variables
process.env.PORT = '3141';
process.env.NODE_ENV = 'development';

// Start Next.js dev server
const nextPath = path.join(__dirname, 'node_modules', '.bin', 'next');
const child = exec(`"${nextPath}" dev -p 3141`, {
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
  console.log(`Next.js dev server exited with code ${code}`);
});