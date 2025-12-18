/**
 * PM2 ECOSYSTEM CONFIG
 * ====================
 * Production-ready process management for Hot Match.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 status
 *   pm2 logs
 *   pm2 stop all
 *   pm2 restart all
 */

module.exports = {
  apps: [
    // Main web server
    {
      name: 'hot-match-server',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    },
    
    // Master automation engine
    {
      name: 'automation-engine',
      script: 'automation-engine.js',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      instances: 1,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 10000,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // Continuous RSS scraper (optional - also in automation engine)
    {
      name: 'rss-scraper',
      script: 'continuous-scraper.js',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      instances: 1,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 30000,
      env: {
        NODE_ENV: 'production'
      },
      // Disabled by default since automation-engine handles this
      enabled: false
    },
    
    // Watchdog - Health monitoring & auto-fixes
    {
      name: 'watchdog',
      script: 'npx',
      args: 'tsx scripts/watchdog.ts',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      cron_restart: '*/5 * * * *',  // Every 5 minutes
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // Scraper manager
    {
      name: 'scraper',
      script: 'node',
      args: 'scripts/scraper-manager.js',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 60000,  // 1 minute between restarts
      watch: false
    },
    
    // GOD Score recalculator (hourly)
    {
      name: 'score-recalc',
      script: 'npx',
      args: 'tsx scripts/recalculate-scores.ts',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      cron_restart: '0 * * * *',  // Every hour
      autorestart: false,
      watch: false
    },
    
    // AI Agent - Intelligent monitoring & self-healing
    {
      name: 'ai-agent',
      script: 'npx',
      args: 'tsx scripts/ai-agent.ts',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      cron_restart: '*/15 * * * *',  // Every 15 minutes
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      }
    },
    
    // Daily Report Generator - Sends daily summary via Slack/Email
    {
      name: 'daily-report',
      script: 'npx',
      args: 'tsx scripts/daily-report.ts',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      cron_restart: '0 9 * * *',  // Every day at 9 AM
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // Automation Pipeline - Full discovery → scoring → matching
    {
      name: 'automation-pipeline',
      script: 'node',
      args: 'automation-pipeline.js',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      cron_restart: '0 */6 * * *',  // Every 6 hours
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // Match Regenerator - Keeps matches fresh every 4 hours
    {
      name: 'match-regen',
      script: 'node',
      args: 'match-regenerator.js',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      cron_restart: '0 0,4,8,12,16,20 * * *',  // Every 4 hours
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // System Guardian - Comprehensive health monitoring (10 min)
    {
      name: 'system-guardian',
      script: 'node',
      args: 'system-guardian.js',
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      cron_restart: '*/10 * * * *',  // Every 10 minutes
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};