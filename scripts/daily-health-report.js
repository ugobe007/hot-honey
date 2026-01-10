#!/usr/bin/env node
/**
 * DAILY HEALTH REPORT
 * ===================
 * Automated daily system health summary
 * 
 * Runs all health checks and formats as summary report
 * Can be scheduled via cron or PM2
 * 
 * Usage:
 *   node scripts/daily-health-report.js
 *   node scripts/daily-health-report.js --email admin@example.com
 *   node scripts/daily-health-report.js --slack webhook-url
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in environment variables');
  console.error('   Required: VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   Required: SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Capture output from scripts
function runScriptAndCapture(scriptPath) {
  try {
    const output = execSync(`node ${scriptPath}`, { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

async function generateHealthReport() {
  const report = {
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    checks: {},
    summary: {},
    alerts: []
  };

  console.log('🔍 Generating Daily Health Report...\n');

  // 1. GOD Scores Check
  console.log('📊 Checking GOD scores...');
  const godScores = runScriptAndCapture('scripts/check-god-scores.js');
  report.checks.godScores = godScores;
  
  // Parse key metrics from GOD scores output
  const godMatch = godScores.output.match(/Average:\s+([\d.]+)/);
  const coverageMatch = godScores.output.match(/Coverage:\s+([\d.]+)%/);
  if (godMatch) report.summary.avgGodScore = parseFloat(godMatch[1]);
  if (coverageMatch) report.summary.scoringCoverage = parseFloat(coverageMatch[1]);

  // 2. Data Quality Check
  console.log('📋 Checking data quality...');
  const dataQuality = runScriptAndCapture('scripts/check-startup-data-quality.js');
  report.checks.dataQuality = dataQuality;
  
  // Parse data quality metrics
  const arrMatch = dataQuality.output.match(/ARR:\s+\d+\s+\(([\d.]+)%\)/);
  const mrrMatch = dataQuality.output.match(/MRR:\s+\d+\s+\(([\d.]+)%\)/);
  if (arrMatch) report.summary.arrCoverage = parseFloat(arrMatch[1]);
  if (mrrMatch) report.summary.mrrCoverage = parseFloat(mrrMatch[1]);

  // 3. Recent Deletions Check
  console.log('🗑️  Checking recent deletions...');
  const deletions = runScriptAndCapture('scripts/check-recent-deletions.js');
  report.checks.deletions = deletions;
  
  // Parse orphaned matches
  const orphanMatch = deletions.output.match(/Found (\d+) matches pointing to deleted investors/);
  if (orphanMatch) {
    const orphanCount = parseInt(orphanMatch[1]);
    report.summary.orphanedMatches = orphanCount;
    if (orphanCount > 100) {
      report.alerts.push({
        level: 'warning',
        message: `Found ${orphanCount} orphaned matches (investors deleted)`
      });
    }
  }

  // 4. Database Stats
  console.log('💾 Getting database stats...');
  const [startups, investors, matches] = await Promise.all([
    supabase.from('startup_uploads').select('id', { count: 'exact', head: true }),
    supabase.from('investors').select('id', { count: 'exact', head: true }),
    supabase.from('startup_investor_matches').select('id', { count: 'exact', head: true })
  ]);
  
  report.summary.totalStartups = startups.count || 0;
  report.summary.totalInvestors = investors.count || 0;
  report.summary.totalMatches = matches.count || 0;

  // 5. Check for low scores
  if (report.summary.avgGodScore && report.summary.avgGodScore < 30) {
    report.alerts.push({
      level: 'warning',
      message: `Average GOD score is low (${report.summary.avgGodScore.toFixed(1)}). Consider reviewing scoring algorithm.`
    });
  }

  // 6. Check coverage
  if (report.summary.scoringCoverage < 95) {
    report.alerts.push({
      level: 'warning',
      message: `Scoring coverage is ${report.summary.scoringCoverage.toFixed(1)}%. Some startups may need scoring.`
    });
  }

  // 7. Check data quality
  if (report.summary.arrCoverage < 5) {
    report.alerts.push({
      level: 'info',
      message: `Only ${report.summary.arrCoverage.toFixed(1)}% of startups have ARR data. Consider running enrichment.`
    });
  }

  return report;
}

function formatReport(report) {
  let output = `
╔════════════════════════════════════════════════════════════╗
║          🔥 PYTH AI - DAILY HEALTH REPORT                ║
║                   ${report.date}                        ║
╚════════════════════════════════════════════════════════════╝

📊 SYSTEM SUMMARY
────────────────────────────────────────────────────────────
   📈 Total Startups:    ${report.summary.totalStartups?.toLocaleString() || 'N/A'}
   💼 Total Investors:   ${report.summary.totalInvestors?.toLocaleString() || 'N/A'}
   🔗 Total Matches:     ${report.summary.totalMatches?.toLocaleString() || 'N/A'}
   🎯 Avg GOD Score:     ${report.summary.avgGodScore?.toFixed(1) || 'N/A'}
   ✅ Scoring Coverage:  ${report.summary.scoringCoverage?.toFixed(1) || 'N/A'}%

📋 DATA QUALITY
────────────────────────────────────────────────────────────
   💰 ARR Coverage:      ${report.summary.arrCoverage?.toFixed(1) || 'N/A'}%
   📈 MRR Coverage:      ${report.summary.mrrCoverage?.toFixed(1) || 'N/A'}%
   🔗 Orphaned Matches:  ${report.summary.orphanedMatches || 0}

🚨 ALERTS & RECOMMENDATIONS
────────────────────────────────────────────────────────────
`;

  if (report.alerts.length === 0) {
    output += '   ✅ All systems healthy!\n';
  } else {
    report.alerts.forEach(alert => {
      const emoji = alert.level === 'warning' ? '⚠️' : 'ℹ️';
      output += `   ${emoji} ${alert.message}\n`;
    });
  }

  output += `
📝 DETAILED REPORTS
────────────────────────────────────────────────────────────
   Full reports saved to: reports/daily-health-report-${new Date().toISOString().split('T')[0]}.txt
`;

  return output;
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.includes('--email') ? args[args.indexOf('--email') + 1] : null;
  const slackWebhook = args.includes('--slack') ? args[args.indexOf('--slack') + 1] : null;

  try {
    // Generate report
    const report = await generateHealthReport();
    
    // Format and display
    const formattedReport = formatReport(report);
    console.log(formattedReport);

    // Save to file
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportFile = path.join(reportsDir, `daily-health-report-${new Date().toISOString().split('T')[0]}.txt`);
    fs.writeFileSync(reportFile, formattedReport + '\n\n' + JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportFile}`);

    // TODO: Email integration (if nodemailer configured)
    if (email) {
      console.log(`\n📧 Email sending not yet implemented. Report saved to: ${reportFile}`);
    }

    // TODO: Slack integration
    if (slackWebhook) {
      console.log(`\n💬 Slack integration not yet implemented. Report saved to: ${reportFile}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating health report:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateHealthReport };

