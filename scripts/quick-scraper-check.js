#!/usr/bin/env node
/**
 * Quick Scraper Check - No API calls, just checks processes and recent files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔍 QUICK SCRAPER STATUS CHECK\n');
console.log('═'.repeat(60));

// Check if scrapers are running
console.log('\n📋 Running Processes:');
try {
  const processes = execSync('ps aux | grep -E "node.*(scraper|discover|rss|automation)" | grep -v grep', { encoding: 'utf8' });
  if (processes.trim()) {
    console.log('✅ Found running scraper processes:');
    processes.split('\n').filter(Boolean).forEach(line => {
      const parts = line.split(/\s+/);
      const pid = parts[1];
      const cmd = line.substring(line.indexOf('node'));
      console.log(`   PID ${pid}: ${cmd.substring(0, 80)}`);
    });
  } else {
    console.log('❌ No scraper processes found running');
    console.log('   💡 Start scrapers with: npm run scrape');
  }
} catch (e) {
  console.log('⚠️  Could not check processes');
}

// Check for log files
console.log('\n📄 Log Files:');
const logFiles = [
  'scraper.log',
  'logs/automation.log',
  'logs/scraper.log'
];

logFiles.forEach(logPath => {
  if (fs.existsSync(logPath)) {
    const stats = fs.statSync(logPath);
    const size = (stats.size / 1024).toFixed(1);
    const modified = stats.mtime.toLocaleString();
    console.log(`   ✅ ${logPath} (${size}KB, modified: ${modified})`);
    
    // Show last few lines
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      if (lines.length > 0) {
        console.log(`      Last entry: ${lines[lines.length - 1].substring(0, 100)}`);
      }
    } catch (e) {
      // Ignore
    }
  }
});

// Check discovered_startups table via SQL (if we can read it)
console.log('\n💡 Recommendations:');
console.log('   1. Check Supabase dashboard → discovered_startups table');
console.log('   2. Run: node scripts/approve-all-discovered-startups.js (if any waiting)');
console.log('   3. Check RSS sources in Supabase → rss_sources table (active = true)');
console.log('   4. To discover new startups: node scripts/discover-more-startups.js --days=7');

console.log('\n');
