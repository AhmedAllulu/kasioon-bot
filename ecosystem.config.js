module.exports = {
  apps: [{
    name: 'kasioon-bot',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3355
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3355
    },
    // Load environment variables from .env file
    env_file: '.env',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    // Ignore watch patterns
    ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Restart policy
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};

