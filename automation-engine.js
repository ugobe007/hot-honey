#!/usr/bin/env node
/**
 * HOT MATCH AUTOMATION ENGINE
 * ===========================
 * Runs all data processes automatically on a schedule.
 * 
 * PROCESSES:
 * - RSS scraping (every 30 min)
 * - Startup discovery (every 2 hours)
 * - Investor scoring (every 6 hours)
 * - News-based score updates (every hour)
 * - Match generation (every 4 hours)
 * - Health checks (every 15 min)
 * 
 * Run: node automation-engine.js
 * Run as daemon: node automation-engine.js &
 * Run with PM2: pm2 start automation-engine.js --name "hot-match-automation"
 */

require('dotenv').config();
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Schedule intervals (in minutes)
  intervals: {
    rss_scrape: 30,           // Scrape RSS feeds (every 30 min)
    startup_discovery: 30,     // Discover new startups (every 30 min for 100+/day)
    investor_scoring: 360,     // Recalculate investor scores
    news_score_update: 60,     // Update scores from news
    match_generation: 60,      // Generate new matches (increased frequency for ML)
    health_check: 15,          // System health check
    embedding_generation: 180, // Generate embeddings
    auto_import: 15,           // Auto-import discovered startups (every 15 min)
    data_validation: 10080,    // Validate scraper data (weekly - 7 days * 24 hours * 60 min)
    enrichment_pipeline: 1440, // Run enrichment (daily - 24 hours * 60 min)
    exit_detection: 1440,      // Detect exits (daily - 24 hours * 60 min)
    portfolio_performance: 1440, // Update portfolio performance (daily - 24 hours * 60 min)
    funding_extraction: 120,   // Extract funding rounds (every 2 hours)
    market_intelligence: 1440,  // Calculate market intelligence metrics (daily)
    talent_matching: 360,      // Auto-match talent with startups (every 6 hours)
    smell_test_enrichment: 1440, // Enrich startups with YC smell tests (daily)
    component_scores: 1440,    // Calculate and store component scores (daily)
    investor_scraping: 360,    // Scrape investors from news sources and VC sites (every 6 hours)
  },
  
  // Logging
  logDir: './logs',
  logFile: 'automation.log',
  
  // Limits
  maxConcurrentJobs: 2,
  jobTimeout: 300000, // 5 minutes
  
  // Feature flags
  enabled: {
    rss_scrape: true,
    startup_discovery: true,
    investor_scoring: true,
    news_score_update: true,
    match_generation: true,
    health_check: true,
    embedding_generation: true,
    auto_import: true,
    data_validation: true,
    enrichment_pipeline: true,
    exit_detection: true,
    portfolio_performance: true,
    funding_extraction: true,
    market_intelligence: true,
    talent_matching: true,
    smell_test_enrichment: true,
    component_scores: true,
    investor_scraping: true,
  }
};

// ============================================
// STATE TRACKING
// ============================================
const state = {
  running: {},
  lastRun: {},
  stats: {
    started: new Date(),
    jobsCompleted: 0,
    jobsFailed: 0,
    errors: []
  }
};

// ============================================
// LOGGING
// ============================================
function ensureLogDir() {
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
  }
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  console.log(logLine);
  if (data) console.log('  ', data);
  
  // Also write to file
  try {
    ensureLogDir();
    const fileLine = data 
      ? `${logLine}\n  ${JSON.stringify(data)}\n`
      : `${logLine}\n`;
    fs.appendFileSync(path.join(CONFIG.logDir, CONFIG.logFile), fileLine);
  } catch (e) {
    // Ignore file errors
  }
}

// ============================================
// JOB DEFINITIONS
// ============================================
const JOBS = {
  rss_scrape: {
    name: 'RSS Scraping',
    command: 'node run-rss-scraper.js',
    timeout: 300000, // Increased to 5 minutes to handle multiple feeds
    description: 'Scrape RSS feeds for startup news'
  },
  
  startup_discovery: {
    name: 'Startup Discovery',
    command: 'node discover-startups-from-rss.js', // RSS discovery with AI extraction
    timeout: 600000, // 10 minutes (AI processing takes time)
    description: 'Discover new startups from RSS feeds (100+/day target)'
  },
  
  investor_scoring: {
    name: 'Investor Scoring',
    command: 'node calculate-investor-scores-v2.js',
    timeout: 120000,
    description: 'Calculate VC GOD scores'
  },
  
  news_score_update: {
    name: 'News Score Update',
    command: 'node update-scores-from-news.js',
    timeout: 120000,
    description: 'Update investor scores from news'
  },
  
  match_generation: {
    name: 'Match Generation',
    command: 'node generate-matches.js',
    timeout: 300000,
    description: 'Generate startup-investor matches'
  },
  
  health_check: {
    name: 'Health Check',
    command: 'node system-health-check.js',
    timeout: 60000,
    description: 'Check system health'
  },
  
  embedding_generation: {
    name: 'Embedding Generation',
    command: 'node generate-embeddings.js',
    timeout: 600000,
    description: 'Generate vector embeddings'
  },
  
  auto_import: {
    name: 'Auto-Import Startups',
    command: 'node auto-import-pipeline.js',
    timeout: 300000,
    description: 'Auto-import discovered startups (no manual approval)'
  },
  
  data_validation: {
    name: 'Data Validation',
    command: 'node validate-scraper-data.js',
    timeout: 120000,
    description: 'Validate scraper data quality and schema compliance'
  },
  
  enrichment_pipeline: {
    name: 'Data Enrichment',
    command: 'node run-all-enrichment.js',
    timeout: 600000, // 10 minutes (AI processing takes time)
    description: 'Enrich websites, locations, taglines, and pitches'
  },
  
  exit_detection: {
    name: 'Exit Detection',
    command: 'node detect-startup-exits.js',
    timeout: 600000, // 10 minutes (AI processing)
    description: 'Detect startup exits (acquisitions, mergers, IPOs)'
  },
  
  portfolio_performance: {
    name: 'Portfolio Performance',
    command: 'node update-investor-portfolio-performance.js',
    timeout: 300000, // 5 minutes
    description: 'Update investor portfolio performance metrics'
  },
  
  funding_extraction: {
    name: 'Funding Rounds Extraction',
    command: 'node extract-funding-rounds.js',
    timeout: 300000, // 5 minutes
    description: 'Extract funding rounds from RSS articles and save to funding_rounds table'
  },
  
  market_intelligence: {
    name: 'Market Intelligence',
    command: 'node calculate-market-intelligence.js',
    timeout: 300000, // 5 minutes
    description: 'Calculate and store market intelligence metrics (sector performance, founder patterns, funding velocity)'
  },
  
  talent_matching: {
    name: 'Talent Matching',
    command: 'node auto-match-talent.js',
    timeout: 300000, // 5 minutes
    description: 'Automatically match startups with available talent in the pool'
  },
  
  smell_test_enrichment: {
    name: 'YC Smell Test Enrichment',
    command: 'node enrich-smell-tests.js',
    timeout: 600000, // 10 minutes
    description: 'Enrich startups with YC smell test scores (lean, user passion, learning in public, inevitable, massive if works)'
  },
  
  component_scores: {
    name: 'Component Scores Calculation',
    command: 'node calculate-component-scores.js',
    timeout: 600000, // 10 minutes
    description: 'Calculate and store component scores (team, traction, market, product, vision) for Sequoia and A16Z algorithms'
  },
  
  investor_scraping: {
    name: 'Investor Mega Scraper',
    command: 'node investor-mega-scraper.js',
    timeout: 1800000, // 30 minutes (scraping multiple sources takes time)
    description: 'Scrape investors from news sources, VC sites, and investor directories'
  }
};

// ============================================
// JOB RUNNER
// ============================================
async function runJob(jobId) {
  const job = JOBS[jobId];
  if (!job) {
    log('error', `Unknown job: ${jobId}`);
    return false;
  }
  
  if (!CONFIG.enabled[jobId]) {
    log('debug', `Job disabled: ${job.name}`);
    return true;
  }
  
  if (state.running[jobId]) {
    log('warn', `Job already running: ${job.name}`);
    return false;
  }
  
  // Check concurrent job limit
  const runningCount = Object.values(state.running).filter(Boolean).length;
  if (runningCount >= CONFIG.maxConcurrentJobs) {
    log('warn', `Max concurrent jobs reached, skipping: ${job.name}`);
    return false;
  }
  
  state.running[jobId] = true;
  log('info', `▶️  Starting: ${job.name}`, { command: job.command });
  
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    try {
      const output = execSync(job.command, {
        encoding: 'utf-8',
        timeout: job.timeout,
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      state.lastRun[jobId] = new Date();
      state.stats.jobsCompleted++;
      state.running[jobId] = false;
      
      // Extract key stats from output
      const stats = extractStats(output);
      log('info', `✅ Completed: ${job.name} (${duration}s)`, stats);
      
      resolve(true);
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      state.stats.jobsFailed++;
      
      // Check if it's a timeout error
      const isTimeout = error.message?.includes('ETIMEDOUT') || 
                        error.message?.includes('timeout') ||
                        error.signal === 'SIGTERM';
      
      const errorMsg = isTimeout 
        ? `Timeout after ${(job.timeout / 1000).toFixed(0)}s - consider increasing timeout or checking network`
        : error.message?.substring(0, 200) || 'Unknown error';
      
      state.stats.errors.push({ job: jobId, error: errorMsg, time: new Date() });
      state.running[jobId] = false;
      
      log('error', `❌ Failed: ${job.name} (${duration}s)`, { 
        error: errorMsg,
        timeout: isTimeout ? 'YES' : 'NO'
      });
      
      resolve(false);
    }
  });
}

function extractStats(output) {
  const stats = {};
  
  // Try to extract common stats patterns
  const patterns = [
    { key: 'added', pattern: /(\d+)\s*added/i },
    { key: 'updated', pattern: /(\d+)\s*updated/i },
    { key: 'processed', pattern: /(\d+)\s*processed/i },
    { key: 'errors', pattern: /(\d+)\s*error/i },
    { key: 'articles', pattern: /(\d+)\s*articles/i },
    { key: 'investors', pattern: /(\d+)\s*investors/i },
    { key: 'startups', pattern: /(\d+)\s*startups/i },
  ];
  
  for (const { key, pattern } of patterns) {
    const match = output.match(pattern);
    if (match) stats[key] = parseInt(match[1]);
  }
  
  return Object.keys(stats).length > 0 ? stats : null;
}

// ============================================
// SCHEDULER
// ============================================
function shouldRunJob(jobId) {
  const interval = CONFIG.intervals[jobId];
  if (!interval) return false;
  
  const lastRun = state.lastRun[jobId];
  if (!lastRun) return true; // Never run before
  
  const elapsed = (Date.now() - lastRun.getTime()) / 60000; // minutes
  return elapsed >= interval;
}

async function checkAndRunJobs() {
  for (const jobId of Object.keys(JOBS)) {
    if (shouldRunJob(jobId)) {
      await runJob(jobId);
      
      // Small delay between jobs
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ============================================
// STATUS DISPLAY
// ============================================
function printStatus() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔥 HOT MATCH AUTOMATION ENGINE - STATUS');
  console.log('═'.repeat(60));
  
  const uptime = ((Date.now() - state.stats.started.getTime()) / 3600000).toFixed(1);
  console.log(`⏱️  Uptime: ${uptime} hours`);
  console.log(`✅ Jobs completed: ${state.stats.jobsCompleted}`);
  console.log(`❌ Jobs failed: ${state.stats.jobsFailed}`);
  
  console.log('\n📋 SCHEDULE:');
  for (const [jobId, job] of Object.entries(JOBS)) {
    const enabled = CONFIG.enabled[jobId] ? '✓' : '✗';
    const interval = CONFIG.intervals[jobId];
    const lastRun = state.lastRun[jobId];
    const lastRunStr = lastRun 
      ? `${((Date.now() - lastRun.getTime()) / 60000).toFixed(0)}m ago`
      : 'never';
    
    console.log(`   ${enabled} ${job.name.padEnd(20)} every ${interval}m | last: ${lastRunStr}`);
  }
  
  if (state.stats.errors.length > 0) {
    console.log('\n⚠️  RECENT ERRORS:');
    state.stats.errors.slice(-3).forEach(e => {
      console.log(`   ${e.job}: ${e.error?.substring(0, 50)}`);
    });
  }
  
  console.log('═'.repeat(60) + '\n');
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
function setupShutdown() {
  const shutdown = (signal) => {
    log('info', `Received ${signal}, shutting down...`);
    printStatus();
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n🔥 HOT MATCH AUTOMATION ENGINE\n');
  console.log('═'.repeat(60));
  console.log('Starting automated data pipeline...');
  console.log('Press Ctrl+C to stop\n');
  
  setupShutdown();
  ensureLogDir();
  
  // Print initial status
  printStatus();
  
  // Run initial jobs immediately
  log('info', '🚀 Running initial jobs...');
  
  // Run critical jobs first
  await runJob('health_check');
  await runJob('rss_scrape');
  await runJob('news_score_update');
  
  // Main loop - check every minute
  log('info', '⏰ Starting scheduler loop (checking every 60s)...\n');
  
  setInterval(async () => {
    await checkAndRunJobs();
  }, 60000); // Check every minute
  
  // Print status every 30 minutes
  setInterval(() => {
    printStatus();
  }, 1800000);
  
  // Keep process alive
  process.stdin.resume();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log('error', 'Fatal error:', { error: error.message });
    process.exit(1);
  });
}

module.exports = { runJob, CONFIG, JOBS };
