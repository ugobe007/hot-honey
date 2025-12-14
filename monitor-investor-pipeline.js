#!/usr/bin/env node
/**
 * Investor Pipeline Monitor
 * Shows real-time status of discovery and enrichment
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:Q9PM1qv1xwf0jFf@db.unkpogyhhjbvxxjvmxlt.supabase.co:5432/postgres' 
});

async function getStats() {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE last_enrichment_date IS NOT NULL) as enriched,
      COUNT(*) FILTER (WHERE partners IS NOT NULL) as has_partners,
      COUNT(*) FILTER (WHERE notable_investments IS NOT NULL) as has_investments,
      COUNT(*) FILTER (WHERE investment_thesis IS NOT NULL) as has_thesis,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as added_last_hour
    FROM investors
  `);
  
  return rows[0];
}

function checkDiscoveryProcess() {
  try {
    if (!fs.existsSync('investor-discovery.pid')) {
      return { running: false };
    }
    
    const pid = fs.readFileSync('investor-discovery.pid', 'utf-8').trim();
    
    try {
      execSync(`ps -p ${pid}`, { stdio: 'pipe' });
      return { running: true, pid };
    } catch {
      return { running: false, pid: null };
    }
  } catch {
    return { running: false };
  }
}

function getLogSummary() {
  try {
    if (!fs.existsSync('investor-discovery.log')) {
      return null;
    }
    
    const log = fs.readFileSync('investor-discovery.log', 'utf-8');
    
    // Extract summary info
    const newMatch = log.match(/New investors added: (\d+)/);
    const existedMatch = log.match(/Already existed: (\d+)/);
    const batchMatch = log.match(/Batch (\d+)\/(\d+)/g);
    
    const lastBatch = batchMatch ? batchMatch[batchMatch.length - 1] : null;
    
    return {
      newInvestors: newMatch ? parseInt(newMatch[1]) : 0,
      existed: existedMatch ? parseInt(existedMatch[1]) : 0,
      currentBatch: lastBatch || 'Starting...'
    };
  } catch {
    return null;
  }
}

async function main() {
  console.clear();
  
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║        💰 INVESTOR PIPELINE MONITOR                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  // Database stats
  const stats = await getStats();
  
  console.log('📊 DATABASE STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total Investors:        ${stats.total}`);
  console.log(`  Added (last hour):      ${stats.added_last_hour} 🔥`);
  console.log(`  Fully Enriched:         ${stats.enriched} (${Math.round(stats.enriched/stats.total*100)}%)`);
  console.log(`  Has Partners:           ${stats.has_partners}`);
  console.log(`  Has Investments:        ${stats.has_investments}`);
  console.log(`  Has Thesis:             ${stats.has_thesis}`);
  console.log(`  Needs Enrichment:       ${stats.total - stats.enriched} ⏳\n`);
  
  // Discovery process
  const discovery = checkDiscoveryProcess();
  const logSummary = getLogSummary();
  
  console.log('🔍 DISCOVERY PROCESS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (discovery.running) {
    console.log(`  Status:                 🟢 RUNNING (PID: ${discovery.pid})`);
    if (logSummary) {
      console.log(`  Progress:               ${logSummary.currentBatch}`);
      console.log(`  New investors found:    ${logSummary.newInvestors}`);
      console.log(`  Already existed:        ${logSummary.existed}`);
    }
    console.log(`\n  Monitor: tail -f investor-discovery.log`);
  } else {
    console.log(`  Status:                 ⚪ NOT RUNNING`);
    if (logSummary && (logSummary.newInvestors > 0 || logSummary.existed > 0)) {
      console.log(`  Last run added:         ${logSummary.newInvestors} investors`);
      console.log(`  Skipped (existed):      ${logSummary.existed}`);
    }
    console.log(`\n  Start: node discover-new-investors.js`);
  }
  
  console.log('\n📈 ENRICHMENT PROCESS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const needsEnrichment = stats.total - stats.enriched;
  
  if (needsEnrichment > 0) {
    console.log(`  Status:                 ⏳ READY`);
    console.log(`  Investors pending:      ${needsEnrichment}`);
    console.log(`  Estimated time:         ~${Math.ceil(needsEnrichment * 2 / 60)} minutes`);
    console.log(`\n  Start: node bulk-enrich-investors.js`);
  } else {
    console.log(`  Status:                 ✅ ALL ENRICHED`);
    console.log(`  All ${stats.total} investors have been enriched!`);
  }
  
  console.log('\n💡 NEXT STEPS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (discovery.running) {
    console.log('  1. ⏳ Wait for discovery to complete');
    console.log('  2. 🔄 Run enrichment: node bulk-enrich-investors.js');
  } else if (needsEnrichment > 0) {
    console.log('  1. 🚀 Run enrichment: node bulk-enrich-investors.js');
    console.log('  2. 🔄 Repeat until all enriched');
  } else {
    console.log('  1. ✅ Review startups: 421 pending in discovered_startups');
    console.log('  2. 🎯 Generate matches: node generate-matches-advanced.js');
    console.log('  3. 📊 Check workflow for connections');
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  Run `node monitor-investor-pipeline.js` to refresh              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  await pool.end();
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
