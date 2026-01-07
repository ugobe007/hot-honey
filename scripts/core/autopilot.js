#!/usr/bin/env node

/**
 * Hot Match Autopilot
 * 
 * Consolidated monitoring and health management system.
 * Replaces: watchdog, system-guardian, god-score-monitor, match-health-monitor, daily-report
 * 
 * Usage:
 *   node scripts/core/autopilot.js           # Run once
 *   node scripts/core/autopilot.js --daemon  # Run continuously
 *   pm2 start scripts/core/autopilot.js --name autopilot -- --daemon
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  // Monitoring intervals (in milliseconds)
  healthCheckInterval: 5 * 60 * 1000,  // 5 minutes
  dailyReportHour: 8,                   // 8 AM local time
  
  // Thresholds
  minInvestorCount: 3000,
  minStartupCount: 900,
  minMatchCount: 50000,
  maxProcessRestarts: 10,
  
  // PM2 processes to monitor
  criticalProcesses: [
    'hot-match-server',
    'match-processor',
    'rss-scraper',
    'scraper',
    'orchestrator',
    'enrichment-pipeline'
  ],
  
  // Database
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

// Initialize Supabase
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// State tracking
let lastDailyReport = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

// Logging with timestamps
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    report: '📊'
  }[level] || 'ℹ️';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Check PM2 process status
async function checkPM2Status() {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    
    const status = {
      healthy: [],
      unhealthy: [],
      missing: []
    };
    
    for (const name of CONFIG.criticalProcesses) {
      const proc = processes.find(p => p.name === name);
      
      if (!proc) {
        status.missing.push(name);
      } else if (proc.pm2_env.status !== 'online') {
        status.unhealthy.push({
          name,
          status: proc.pm2_env.status,
          restarts: proc.pm2_env.restart_time
        });
      } else if (proc.pm2_env.restart_time > CONFIG.maxProcessRestarts) {
        status.unhealthy.push({
          name,
          status: 'unstable',
          restarts: proc.pm2_env.restart_time
        });
      } else {
        status.healthy.push(name);
      }
    }
    
    return status;
  } catch (error) {
    log('error', 'Failed to check PM2 status', { error: error.message });
    return null;
  }
}

// Check database health
async function checkDatabaseHealth() {
  try {
    const checks = {};
    
    // Check investors
    const { count: investorCount, error: invError } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true });
    
    if (invError) throw invError;
    checks.investors = {
      count: investorCount,
      healthy: investorCount >= CONFIG.minInvestorCount
    };
    
    // Check startups (using startup_uploads table)
    const { count: startupCount, error: startupError } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true });
    
    if (startupError) throw startupError;
    checks.startups = {
      count: startupCount,
      healthy: startupCount >= CONFIG.minStartupCount
    };
    
    // Check matches (using startup_investor_matches table)
    const { count: matchCount, error: matchError } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true });
    
    if (matchError) throw matchError;
    checks.matches = {
      count: matchCount,
      healthy: matchCount >= CONFIG.minMatchCount
    };
    
    // Check GOD scores distribution (from startup_uploads)
    const { data: godScores, error: godError } = await supabase
      .from('startup_uploads')
      .select('total_god_score')
      .not('total_god_score', 'is', null)
      .limit(1000);
    
    if (!godError && godScores && godScores.length > 0) {
      const scores = godScores.map(s => s.total_god_score).filter(s => s != null);
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        
        checks.godScores = {
          count: scores.length,
          avg: avg.toFixed(2),
          min,
          max,
          healthy: avg > 30 && avg < 70 // Reasonable distribution
        };
      }
    }
    
    return checks;
  } catch (error) {
    log('error', 'Failed to check database health', { error: error.message });
    return null;
  }
}

// Auto-recover unhealthy processes
async function recoverProcesses(unhealthy) {
  for (const proc of unhealthy) {
    try {
      log('warn', `Attempting to restart ${proc.name}...`);
      await execAsync(`pm2 restart ${proc.name}`);
      log('info', `Successfully restarted ${proc.name}`);
    } catch (error) {
      log('error', `Failed to restart ${proc.name}`, { error: error.message });
    }
  }
}

// Generate daily report
async function generateDailyReport() {
  log('report', '=== DAILY REPORT ===');
  
  const dbHealth = await checkDatabaseHealth();
  const pm2Status = await checkPM2Status();
  
  if (dbHealth) {
    log('report', 'Database Status:', {
      investors: dbHealth.investors?.count || 'unknown',
      startups: dbHealth.startups?.count || 'unknown',
      matches: dbHealth.matches?.count || 'unknown',
      godScoreAvg: dbHealth.godScores?.avg || 'unknown'
    });
  }
  
  if (pm2Status) {
    log('report', 'PM2 Status:', {
      healthy: pm2Status.healthy.length,
      unhealthy: pm2Status.unhealthy.length,
      missing: pm2Status.missing.length
    });
    
    if (pm2Status.unhealthy.length > 0) {
      log('warn', 'Unhealthy processes:', pm2Status.unhealthy);
    }
  }
  
  // Check data quality
  try {
    const { data: recentInvestors } = await supabase
      .from('investors')
      .select('name, url, bio, firm_description_normalized')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (recentInvestors) {
      const withUrl = recentInvestors.filter(i => i.url).length;
      const withBio = recentInvestors.filter(i => i.bio || i.firm_description_normalized).length;
      
      log('report', 'Recent Investor Data Quality:', {
        total: recentInvestors.length,
        withUrl: `${Math.round((withUrl / recentInvestors.length) * 100)}%`,
        withBio: `${Math.round((withBio / recentInvestors.length) * 100)}%`
      });
    }
  } catch (error) {
    log('warn', 'Could not check data quality', { error: error.message });
  }
  
  log('report', '=== END REPORT ===');
  lastDailyReport = new Date();
}

// Main health check
async function runHealthCheck() {
  log('info', 'Running health check...');
  
  try {
    // Check PM2
    const pm2Status = await checkPM2Status();
    
    if (pm2Status) {
      if (pm2Status.unhealthy.length > 0) {
        log('warn', `${pm2Status.unhealthy.length} unhealthy processes detected`);
        await recoverProcesses(pm2Status.unhealthy);
      }
      
      if (pm2Status.missing.length > 0) {
        log('error', `${pm2Status.missing.length} processes missing from PM2`);
      }
      
      if (pm2Status.healthy.length === CONFIG.criticalProcesses.length) {
        log('info', 'All processes healthy');
      }
    }
    
    // Check database
    const dbHealth = await checkDatabaseHealth();
    
    if (dbHealth) {
      const issues = [];
      
      if (!dbHealth.investors?.healthy) {
        issues.push(`Low investor count: ${dbHealth.investors?.count}`);
      }
      if (!dbHealth.startups?.healthy) {
        issues.push(`Low startup count: ${dbHealth.startups?.count}`);
      }
      if (!dbHealth.matches?.healthy) {
        issues.push(`Low match count: ${dbHealth.matches?.count}`);
      }
      
      if (issues.length > 0) {
        log('warn', 'Database issues detected:', issues);
      } else {
        log('info', 'Database healthy', {
          investors: dbHealth.investors?.count,
          startups: dbHealth.startups?.count,
          matches: dbHealth.matches?.count
        });
      }
    }
    
    // Reset failure counter on success
    consecutiveFailures = 0;
    
    // Check if daily report is due
    const now = new Date();
    const shouldRunDailyReport = 
      !lastDailyReport || 
      (now.getHours() === CONFIG.dailyReportHour && 
       now.getDate() !== lastDailyReport.getDate());
    
    if (shouldRunDailyReport) {
      await generateDailyReport();
    }
    
  } catch (error) {
    consecutiveFailures++;
    log('error', `Health check failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`, {
      error: error.message
    });
    
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      log('error', 'Too many consecutive failures - entering recovery mode');
      // Could add more aggressive recovery here
    }
  }
}

// Main daemon loop
async function runDaemon() {
  log('info', 'Autopilot starting in daemon mode...');
  log('info', `Health check interval: ${CONFIG.healthCheckInterval / 1000}s`);
  log('info', `Monitoring processes: ${CONFIG.criticalProcesses.join(', ')}`);
  
  // Initial health check
  await runHealthCheck();
  
  // Schedule regular health checks
  setInterval(runHealthCheck, CONFIG.healthCheckInterval);
  
  // Keep process alive
  process.on('SIGINT', () => {
    log('info', 'Autopilot shutting down...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('info', 'Autopilot shutting down...');
    process.exit(0);
  });
}

// Entry point
async function main() {
  const isDaemon = process.argv.includes('--daemon');
  
  if (isDaemon) {
    await runDaemon();
  } else {
    // Run once
    await runHealthCheck();
    await generateDailyReport();
    process.exit(0);
  }
}

main().catch(error => {
  log('error', 'Fatal error', { error: error.message });
  process.exit(1);
});
