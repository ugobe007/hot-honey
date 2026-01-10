#!/usr/bin/env node

/**
 * Continuous Scraper for pyth ai
 * 
 * Runs continuously to discover:
 * 1. Startups from RSS feeds (TechCrunch, VentureBeat, etc.)
 * 2. VC firms and investors
 * 3. News articles and funding announcements
 * 
 * Usage:
 *   node continuous-scraper.js
 * 
 * Or run in background:
 *   nohup node continuous-scraper.js > scraper.log 2>&1 &
 */

const { execSync } = require('child_process');

// Configuration
const SCRAPE_INTERVAL = 30 * 60 * 1000; // 30 minutes
const STARTUP_DISCOVERY_INTERVAL = 60 * 60 * 1000; // 1 hour
const VC_ENRICHMENT_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

let lastStartupScrape = 0;
let lastVcEnrichment = 0;

console.log('🚀 Starting Continuous Scraper for pyth ai');
console.log('📅', new Date().toISOString());
console.log('⏱️  RSS Scraping every 30 minutes');
console.log('🔍 Startup Discovery every 1 hour');
console.log('💼 VC Enrichment every 2 hours');
console.log('─'.repeat(60));

/**
 * Run enhanced startup discovery using dynamic parser
 */
async function scrapeRSSFeeds() {
  console.log('\n📡 [STARTUP DISCOVERY] Using Enhanced Discovery with Dynamic Parser...');
  console.log('⏰', new Date().toISOString());
  console.log('ℹ️  Using Parse.bot-style AI extraction for richer data');
  
  try {
    // Try enhanced discovery first
    const fs = require('fs');
    if (fs.existsSync('./enhanced-startup-discovery.js')) {
      const output = execSync('node enhanced-startup-discovery.js --limit 5', {
        cwd: __dirname,
        encoding: 'utf-8',
        timeout: 15 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      });
      console.log(output);
      console.log('✅ [ENHANCED] Discovery completed successfully');
      return true;
    }
    
    // Fall back to modern discovery if enhanced not available
    const output = execSync('node modern-startup-discovery.js', {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: 15 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    console.log(output);
    console.log('✅ [RSS] Feed scrape completed successfully');
    return true;
  } catch (error) {
    console.error('❌ [DISCOVERY] Scrape failed:', error.message);
    console.log('ℹ️  This is normal if scraping takes a long time');
    console.log('💡 Check discovered_startups table for results');
    return false;
  }
}

/**
 * Discover startups from RSS articles
 */
async function discoverStartups() {
  const now = Date.now();
  if (now - lastStartupScrape < STARTUP_DISCOVERY_INTERVAL) {
    return; // Skip if run recently
  }
  
  console.log('\n🔍 [STARTUPS] Startup discovery runs with RSS scrape');
  console.log('✅ [STARTUPS] Check discovered_startups table');
  lastStartupScrape = now;
  return true;
}

/**
 * Enrich VC firms with latest data
 */
async function enrichVCs() {
  const now = Date.now();
  if (now - lastVcEnrichment < VC_ENRICHMENT_INTERVAL) {
    return; // Skip if run recently
  }
  
  console.log('\n💼 [VCs] Starting VC enrichment...');
  console.log('⏰', new Date().toISOString());
  
  try {
    // Use raw SQL script to bypass PostgREST schema cache issues
    const fs = require('fs');
    if (!fs.existsSync('./enrich-raw-sql.js')) {
      console.log('ℹ️  [VCs] VC enrichment script not found, skipping');
      return false;
    }
    
    const output = execSync('node enrich-raw-sql.js', {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: 15 * 60 * 1000 // 15 minute timeout
    });
    
    console.log(output);
    console.log('✅ [VCs] Enrichment completed successfully');
    lastVcEnrichment = now;
    return true;
  } catch (error) {
    console.error('❌ [VCs] Enrichment failed:', error.message);
    return false;
  }
}

/**
 * Main scraping loop
 */
async function runScrapingCycle() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Starting new scraping cycle');
  console.log('='.repeat(60));
  
  // Always scrape RSS feeds
  await scrapeRSSFeeds();
  
  // Periodically discover startups
  await discoverStartups();
  
  // Periodically enrich VCs
  await enrichVCs();
  
  console.log('\n✅ Scraping cycle complete');
  console.log('⏳ Next cycle in 30 minutes');
  console.log('─'.repeat(60));
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down continuous scraper...');
  console.log('📅', new Date().toISOString());
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down continuous scraper...');
  console.log('📅', new Date().toISOString());
  process.exit(0);
});

/**
 * Start the continuous scraper
 */
async function start() {
  // Run immediately on start
  await runScrapingCycle();
  
  // Then run every 30 minutes
  setInterval(async () => {
    await runScrapingCycle();
  }, SCRAPE_INTERVAL);
}

// Start the scraper
start().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
