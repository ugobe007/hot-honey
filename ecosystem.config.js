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
    }
  ]
};
