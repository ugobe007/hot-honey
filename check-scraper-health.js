#!/usr/bin/env node

/**
 * Scraper Health Check & Auto-Restart Script
 * 
 * This script:
 * 1. Checks if the scraper process is running
 * 2. Checks if the scraper is actually working (not stuck)
 * 3. Restarts the scraper if needed
 * 4. Can be run manually or as a cron job
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRAPER_PROCESS_NAME = 'continuous-scraper.js';
const SCRAPER_LOG_FILE = path.join(__dirname, 'scraper.log');
const SCRAPER_SCRIPT = path.join(__dirname, 'continuous-scraper.js');
const MAX_LOG_AGE_MINUTES = 35; // Should update at least every 30 min (RSS interval)

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkIfProcessRunning() {
  try {
    const result = execSync(`ps aux | grep ${SCRAPER_PROCESS_NAME} | grep -v grep`, { encoding: 'utf8' });
    const lines = result.trim().split('\n').filter(line => line.length > 0);
    
    if (lines.length > 0) {
      // Extract PID (second column)
      const pid = lines[0].trim().split(/\s+/)[1];
      return { running: true, pid, count: lines.length };
    }
    return { running: false, pid: null, count: 0 };
  } catch (error) {
    // grep returns exit code 1 when no matches found
    return { running: false, pid: null, count: 0 };
  }
}

function getLogAge() {
  try {
    if (!fs.existsSync(SCRAPER_LOG_FILE)) {
      return { exists: false, ageMinutes: Infinity, lastModified: null };
    }

    const stats = fs.statSync(SCRAPER_LOG_FILE);
    const now = new Date();
    const ageMs = now - stats.mtime;
    const ageMinutes = ageMs / 1000 / 60;

    return {
      exists: true,
      ageMinutes: Math.round(ageMinutes),
      lastModified: stats.mtime.toISOString(),
    };
  } catch (error) {
    return { exists: false, ageMinutes: Infinity, lastModified: null, error: error.message };
  }
}

function getLastLogLines(count = 10) {
  try {
    if (!fs.existsSync(SCRAPER_LOG_FILE)) {
      return [];
    }
    const result = execSync(`tail -n ${count} ${SCRAPER_LOG_FILE}`, { encoding: 'utf8' });
    return result.trim().split('\n');
  } catch (error) {
    return [];
  }
}

function checkForErrors() {
  const lastLines = getLastLogLines(50);
  const errors = lastLines.filter(line => 
    line.toLowerCase().includes('error') || 
    line.toLowerCase().includes('failed') ||
    line.toLowerCase().includes('exception')
  );
  return errors;
}

function killScraper(pid) {
  try {
    log(`🛑 Killing scraper process ${pid}...`, 'yellow');
    execSync(`kill ${pid}`);
    
    // Wait a moment and check if it's really dead
    setTimeout(() => {
      const check = checkIfProcessRunning();
      if (check.running) {
        log(`⚠️  Process still running, force killing...`, 'yellow');
        execSync(`kill -9 ${pid}`);
      }
    }, 2000);
    
    return true;
  } catch (error) {
    log(`❌ Error killing process: ${error.message}`, 'red');
    return false;
  }
}

function startScraper() {
  try {
    log(`🚀 Starting scraper...`, 'cyan');
    
    // Start the scraper as a background process
    const child = spawn('node', [SCRAPER_SCRIPT], {
      detached: true,
      stdio: ['ignore', 
              fs.openSync(SCRAPER_LOG_FILE, 'a'),
              fs.openSync(SCRAPER_LOG_FILE, 'a')
      ]
    });
    
    child.unref(); // Allow parent to exit
    
    log(`✅ Scraper started with PID ${child.pid}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error starting scraper: ${error.message}`, 'red');
    return false;
  }
}

function restartScraper(pid) {
  log('\n🔄 Restarting scraper...', 'yellow');
  
  if (pid) {
    killScraper(pid);
    // Wait for process to die
    setTimeout(() => {
      startScraper();
    }, 3000);
  } else {
    startScraper();
  }
}

function displayStatus(processInfo, logInfo, errors) {
  console.log('\n' + '='.repeat(60));
  log('🔍 SCRAPER HEALTH CHECK', 'cyan');
  console.log('='.repeat(60) + '\n');

  // Process Status
  log('📊 Process Status:', 'blue');
  if (processInfo.running) {
    log(`   ✅ Running (PID: ${processInfo.pid})`, 'green');
    if (processInfo.count > 1) {
      log(`   ⚠️  Warning: ${processInfo.count} instances running!`, 'yellow');
    }
  } else {
    log('   ❌ Not running', 'red');
  }

  // Log Status
  log('\n📝 Log Status:', 'blue');
  if (logInfo.exists) {
    log(`   ✅ Log file exists`, 'green');
    log(`   📅 Last updated: ${logInfo.lastModified}`, 'cyan');
    log(`   ⏰ Age: ${logInfo.ageMinutes} minutes ago`, 
        logInfo.ageMinutes > MAX_LOG_AGE_MINUTES ? 'yellow' : 'green');
  } else {
    log('   ❌ Log file not found', 'red');
  }

  // Error Check
  log('\n🚨 Error Status:', 'blue');
  if (errors.length > 0) {
    log(`   ⚠️  Found ${errors.length} error(s) in recent logs:`, 'yellow');
    errors.slice(0, 5).forEach(err => {
      log(`      ${err.substring(0, 80)}...`, 'red');
    });
  } else {
    log('   ✅ No recent errors', 'green');
  }

  // Recent Activity
  log('\n📄 Recent Log Activity:', 'blue');
  const recentLines = getLastLogLines(5);
  if (recentLines.length > 0) {
    recentLines.forEach(line => {
      console.log(`   ${line.substring(0, 100)}`);
    });
  } else {
    log('   (no log output)', 'yellow');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

function main() {
  const args = process.argv.slice(2);
  const autoFix = args.includes('--fix') || args.includes('-f');
  const forceRestart = args.includes('--restart') || args.includes('-r');

  log('🏥 Checking scraper health...', 'cyan');

  const processInfo = checkIfProcessRunning();
  const logInfo = getLogAge();
  const errors = checkForErrors();

  displayStatus(processInfo, logInfo, errors);

  // Determine if action needed
  let needsAction = false;
  let actionReason = '';

  if (!processInfo.running) {
    needsAction = true;
    actionReason = 'Process not running';
  } else if (processInfo.count > 1) {
    needsAction = true;
    actionReason = `Multiple instances running (${processInfo.count})`;
  } else if (logInfo.ageMinutes > MAX_LOG_AGE_MINUTES) {
    needsAction = true;
    actionReason = `Log hasn't updated in ${logInfo.ageMinutes} minutes (threshold: ${MAX_LOG_AGE_MINUTES})`;
  } else if (errors.length > 3) {
    needsAction = true;
    actionReason = `Multiple errors detected (${errors.length})`;
  }

  if (forceRestart) {
    needsAction = true;
    actionReason = 'Force restart requested';
  }

  // Take action if needed
  if (needsAction) {
    log(`\n⚠️  Issue detected: ${actionReason}`, 'yellow');
    
    if (autoFix) {
      log('🔧 Auto-fix enabled, restarting scraper...', 'cyan');
      restartScraper(processInfo.pid);
      
      // Wait and verify
      setTimeout(() => {
        log('\n✅ Verifying restart...', 'cyan');
        const newProcessInfo = checkIfProcessRunning();
        if (newProcessInfo.running) {
          log(`✅ Scraper successfully restarted (PID: ${newProcessInfo.pid})`, 'green');
        } else {
          log('❌ Failed to restart scraper', 'red');
          process.exit(1);
        }
      }, 5000);
      
    } else {
      log('\n💡 To automatically fix, run:', 'yellow');
      log('   node check-scraper-health.js --fix', 'cyan');
    }
  } else {
    log('✅ Scraper is healthy!', 'green');
  }

  // Usage info
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\nUsage:');
    console.log('  node check-scraper-health.js              Check status only');
    console.log('  node check-scraper-health.js --fix        Check and auto-restart if needed');
    console.log('  node check-scraper-health.js --restart    Force restart');
    console.log('\nOptions:');
    console.log('  --fix, -f       Automatically fix issues');
    console.log('  --restart, -r   Force restart scraper');
    console.log('  --help, -h      Show this help');
    console.log('\nCron Job Example (check every 10 minutes):');
    console.log('  */10 * * * * cd /path/to/hot-honey && node check-scraper-health.js --fix >> scraper-health.log 2>&1');
  }
}

// Run the health check
main();
