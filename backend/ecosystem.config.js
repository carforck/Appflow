module.exports = {
  apps: [
    {
      name:         'alzak-backend',
      script:       'index.js',
      instances:    1,
      autorestart:  true,
      watch:        false,          // false en prod — PM2 no necesita watch
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
      },
      error_file:  './logs/pm2-error.log',
      out_file:    './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
