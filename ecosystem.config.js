module.exports = {
  apps: [
    {
      name: 'dailywave-backend',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8020',
      cwd: './backend',
      interpreter: './backend/venv/bin/python',
      restart_delay: 4000,
      autorestart: true,
      watch: false
    },
    {
      name: 'dailywave-frontend',
      script: 'npx',
      args: 'serve -s dist -l 3020',
      cwd: './frontend',
      autorestart: true,
      watch: false
    }
  ]
};
