/**
 * PM2 Ecosystem Configuration
 * Manages all background processes for the application
 */

module.exports = {
  apps: [
    {
      name: 'hot-match-server',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'api-server',
      script: 'node',
      args: 'server/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ml-training-scheduler',
      script: 'node',
      args: 'scripts/cron/ml-training-scheduler.js --daemon',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        ML_TRAINING_SCHEDULE: '0 3 * * *' // Daily at 3 AM
      }
    },
    {
      name: 'rss-scraper',
      script: 'node',
      args: 'scripts/core/simple-rss-scraper.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      cron_restart: '*/30 * * * *', // Every 30 minutes
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // ========================================
    // PYTHIA PIPELINE (Forum signals → GOD scores)
    // ========================================
    {
      name: 'pythia-collector',
      script: 'scripts/pythia/collect-from-forums.js',
      args: '50',
      cwd: './',
      instances: 1,
      autorestart: false,  // Run once per cron cycle
      watch: false,
      max_memory_restart: '300M',
      cron_restart: '0 */2 * * *',  // Every 2 hours
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '.env.pyth'
      }
    },
    {
      name: 'pythia-scorer',
      script: 'scripts/pythia/score-entities.js',
      args: 'score startup 500',
      cwd: './',
      instances: 1,
      autorestart: false,  // Run once per cron cycle
      watch: false,
      max_memory_restart: '300M',
      cron_restart: '30 */2 * * *',  // Every 2 hours at :30
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'pythia-sync',
      script: 'scripts/pythia/sync-pythia-scores.js',
      cwd: './',
      instances: 1,
      autorestart: false,  // Run once per cron cycle
      watch: false,
      max_memory_restart: '200M',
      cron_restart: '45 */2 * * *',  // Every 2 hours at :45
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'system-guardian',
      script: 'scripts/archive/utilities/system-guardian.js',
      cwd: './',
      instances: 1,
      autorestart: false,
      watch: false,
      max_memory_restart: '200M',
      cron_restart: '*/10 * * * *',  // Every 10 minutes
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
