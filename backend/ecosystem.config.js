module.exports = {
  apps: [
    {
      name: 'ecommerce-api',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/dev/null',
      out_file: '/dev/null',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
