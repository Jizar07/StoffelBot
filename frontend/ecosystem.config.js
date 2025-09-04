module.exports = {
  apps: [{
    name: 'stoffel-bot-frontend',
    script: './start.js',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3141
    }
  }, {
    name: 'stoffel-bot-frontend-dev',
    script: './dev.js',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3141
    }
  }]
}