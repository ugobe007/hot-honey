#!/usr/bin/env node
/**
 * WORKFLOW HEALTH MONITOR
 * Checks all critical site workflows and notifies when fixes are needed
 * Run: node workflow-monitor.js
 * Schedule: Add to cron for automatic monitoring
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Notification settings
const NOTIFICATION_FILE = path.join(__dirname, 'workflow-alerts.log');
const CRITICAL_THRESHOLD = 3; // Number of critical issues before urgent alert

// Health check results
const results = {
  timestamp: new Date().toISOString(),
  passed: [],
  warnings: [],
  failures: [],
  critical: []
};

/**
 * Log result with color coding
 */
function logResult(status, category, message, details = null) {
  const icons = {
    pass: '✅',
    warn: '⚠️',
    fail: '❌',
    critical: '🚨'
  };
  
  const colors = {
    pass: '\x1b[32m',    // Green
    warn: '\x1b[33m',    // Yellow
    fail: '\x1b[31m',    // Red
    critical: '\x1b[35m', // Magenta
    reset: '\x1b[0m'
  };
  
  const icon = icons[status] || '•';
  const color = colors[status] || '';
  
  console.log(`${color}${icon} ${category}: ${message}${colors.reset}`);
  
  if (details) {
    console.log(`   ${JSON.stringify(details, null, 2)}`);
  }
  
  const entry = {
    category,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  if (status === 'pass') results.passed.push(entry);
  else if (status === 'warn') results.warnings.push(entry);
  else if (status === 'fail') results.failures.push(entry);
  else if (status === 'critical') results.critical.push(entry);
}

/**
 * Check 1: Database Connectivity
 */
async function checkDatabaseConnection() {
  console.log('\n📊 Checking Database Connection...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test connection
    const { data, error } = await supabase
      .from('investors')
      .select('count')
      .limit(1);
    
    if (error) {
      logResult('critical', 'Database', 'Connection failed', { error: error.message });
      return false;
    }
    
    logResult('pass', 'Database', 'Connection successful');
    return true;
  } catch (error) {
    logResult('critical', 'Database', 'Connection error', { error: error.message });
    return false;
  }
}

/**
 * Check 2: Data Quality - Investors
 */
async function checkInvestorDataQuality() {
  console.log('\n💼 Checking Investor Data Quality...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check total investors
    const { count: totalCount, error: countError } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    if (totalCount === 0) {
      logResult('critical', 'Investors', 'No investors in database - run scraper');
      return false;
    }
    
    logResult('pass', 'Investors', `Total count: ${totalCount}`);
    
    // Check for missing critical fields
    const { data: investors, error } = await supabase
      .from('investors')
      .select('id, name, bio, sectors, stage, checkSize, website')
      .limit(100);
    
    if (error) throw error;
    
    let missingBio = 0;
    let missingSectors = 0;
    let missingStage = 0;
    let missingCheckSize = 0;
    
    investors.forEach(inv => {
      if (!inv.bio) missingBio++;
      if (!inv.sectors || inv.sectors.length === 0) missingSectors++;
      if (!inv.stage || inv.stage.length === 0) missingStage++;
      if (!inv.checkSize) missingCheckSize++;
    });
    
    const sampleSize = investors.length;
    const bioPercent = ((sampleSize - missingBio) / sampleSize * 100).toFixed(1);
    const sectorsPercent = ((sampleSize - missingSectors) / sampleSize * 100).toFixed(1);
    const stagePercent = ((sampleSize - missingStage) / sampleSize * 100).toFixed(1);
    const checkSizePercent = ((sampleSize - missingCheckSize) / sampleSize * 100).toFixed(1);
    
    if (bioPercent < 50) {
      logResult('warn', 'Investors', `Only ${bioPercent}% have descriptions - run enrichment`);
    }
    
    if (sectorsPercent < 70) {
      logResult('warn', 'Investors', `Only ${sectorsPercent}% have sectors - run enrichment`);
    }
    
    if (stagePercent < 70) {
      logResult('warn', 'Investors', `Only ${stagePercent}% have stages - run enrichment`);
    }
    
    if (checkSizePercent < 60) {
      logResult('fail', 'Investors', `Only ${checkSizePercent}% have check sizes - critical for matching`);
    }
    
    if (bioPercent >= 50 && sectorsPercent >= 70 && stagePercent >= 70) {
      logResult('pass', 'Investors', 'Data quality acceptable');
    }
    
    return true;
  } catch (error) {
    logResult('fail', 'Investors', 'Quality check failed', { error: error.message });
    return false;
  }
}

/**
 * Check 3: Data Quality - Startups
 */
async function checkStartupDataQuality() {
  console.log('\n🚀 Checking Startup Data Quality...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check startup_uploads table
    const { count: totalCount, error: countError } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    if (totalCount === 0) {
      logResult('warn', 'Startups', 'No startups uploaded yet');
      return true;
    }
    
    logResult('pass', 'Startups', `Total count: ${totalCount}`);
    
    // Check for missing extracted_data
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('id, name, extracted_data, status')
      .limit(50);
    
    if (error) throw error;
    
    let missingExtractedData = 0;
    let pendingReview = 0;
    
    startups.forEach(startup => {
      if (!startup.extracted_data || Object.keys(startup.extracted_data).length < 5) {
        missingExtractedData++;
      }
      if (startup.status === 'pending') {
        pendingReview++;
      }
    });
    
    if (missingExtractedData > startups.length * 0.5) {
      logResult('fail', 'Startups', `${missingExtractedData}/${startups.length} missing enriched data - check scraper`);
    } else if (missingExtractedData > 0) {
      logResult('warn', 'Startups', `${missingExtractedData}/${startups.length} need enrichment`);
    } else {
      logResult('pass', 'Startups', 'Data quality good');
    }
    
    if (pendingReview > 10) {
      logResult('warn', 'Startups', `${pendingReview} startups pending review`);
    }
    
    return true;
  } catch (error) {
    logResult('fail', 'Startups', 'Quality check failed', { error: error.message });
    return false;
  }
}

/**
 * Check 4: Matching System Health
 */
async function checkMatchingSystem() {
  console.log('\n🎯 Checking Matching System...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check if matches exist
    const { count: matchCount, error: matchError } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true });
    
    if (matchError) {
      // Table might not exist
      logResult('warn', 'Matching', 'Match table not accessible or empty');
      return true;
    }
    
    if (matchCount === 0) {
      logResult('warn', 'Matching', 'No matches generated - run auto-match service');
      return true;
    }
    
    logResult('pass', 'Matching', `${matchCount} matches generated`);
    
    // Check match quality
    const { data: recentMatches, error } = await supabase
      .from('startup_investor_matches')
      .select('match_score, confidence_level')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    if (recentMatches && recentMatches.length > 0) {
      const avgScore = recentMatches.reduce((sum, m) => sum + (m.match_score || 0), 0) / recentMatches.length;
      
      if (avgScore < 50) {
        logResult('warn', 'Matching', `Average match score low: ${avgScore.toFixed(1)}% - check algorithm`);
      } else {
        logResult('pass', 'Matching', `Average match score: ${avgScore.toFixed(1)}%`);
      }
    }
    
    return true;
  } catch (error) {
    logResult('fail', 'Matching', 'System check failed', { error: error.message });
    return false;
  }
}

/**
 * Check 5: Environment Variables
 */
async function checkEnvironmentVariables() {
  console.log('\n🔐 Checking Environment Variables...');
  
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'VITE_OPENAI_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logResult('critical', 'Environment', 'Missing required variables', { missing });
    return false;
  }
  
  logResult('pass', 'Environment', 'All required variables set');
  
  // Check if keys are valid format
  if (!SUPABASE_URL.startsWith('https://')) {
    logResult('fail', 'Environment', 'VITE_SUPABASE_URL invalid format');
    return false;
  }
  
  return true;
}

/**
 * Check 6: Build Health
 */
async function checkBuildHealth() {
  console.log('\n🏗️  Checking Build Health...');
  
  try {
    // Check if dist folder exists
    const distPath = path.join(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      logResult('warn', 'Build', 'No production build found - run: npm run build');
      return true;
    }
    
    // Check dist age
    const distStats = fs.statSync(distPath);
    const ageHours = (Date.now() - distStats.mtimeMs) / (1000 * 60 * 60);
    
    if (ageHours > 24) {
      logResult('warn', 'Build', `Production build is ${ageHours.toFixed(1)} hours old - consider rebuilding`);
    } else {
      logResult('pass', 'Build', `Production build up to date (${ageHours.toFixed(1)}h old)`);
    }
    
    return true;
  } catch (error) {
    logResult('fail', 'Build', 'Health check failed', { error: error.message });
    return false;
  }
}

/**
 * Check 7: Critical Files
 */
async function checkCriticalFiles() {
  console.log('\n📁 Checking Critical Files...');
  
  const criticalFiles = [
    'src/components/MatchingEngine.tsx',
    'src/components/EnhancedInvestorCard.tsx',
    'src/services/matchingService.ts',
    'server/services/autoMatchService.ts',
    'server/services/startupScoringService.ts',
    'intelligent-scraper.js',
    '.env'
  ];
  
  let allExist = true;
  
  for (const file of criticalFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      logResult('critical', 'Files', `Missing critical file: ${file}`);
      allExist = false;
    }
  }
  
  if (allExist) {
    logResult('pass', 'Files', 'All critical files present');
  }
  
  return allExist;
}

/**
 * Check 8: Database Schema
 */
async function checkDatabaseSchema() {
  console.log('\n🗄️  Checking Database Schema...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const requiredTables = [
      'investors',
      'startup_uploads',
      'discovered_startups'
    ];
    
    for (const table of requiredTables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        logResult('critical', 'Schema', `Missing table: ${table}`);
        return false;
      }
    }
    
    logResult('pass', 'Schema', 'All required tables exist');
    return true;
  } catch (error) {
    logResult('fail', 'Schema', 'Schema check failed', { error: error.message });
    return false;
  }
}

/**
 * Generate notification summary
 */
function generateNotificationSummary() {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 WORKFLOW HEALTH SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\n⏰ Timestamp: ${results.timestamp}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`❌ Failures: ${results.failures.length}`);
  console.log(`🚨 Critical: ${results.critical.length}`);
  
  // Critical issues
  if (results.critical.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
    results.critical.forEach((item, i) => {
      console.log(`\n${i + 1}. ${item.category}: ${item.message}`);
      if (item.details) {
        console.log(`   Details: ${JSON.stringify(item.details)}`);
      }
    });
  }
  
  // Failures
  if (results.failures.length > 0) {
    console.log('\n❌ FAILURES REQUIRING ATTENTION:');
    results.failures.forEach((item, i) => {
      console.log(`${i + 1}. ${item.category}: ${item.message}`);
    });
  }
  
  // Warnings
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Action Recommended):');
    results.warnings.forEach((item, i) => {
      console.log(`${i + 1}. ${item.category}: ${item.message}`);
    });
  }
  
  // Overall status
  console.log('\n' + '═'.repeat(70));
  if (results.critical.length > 0) {
    console.log('🚨 STATUS: CRITICAL - IMMEDIATE ACTION REQUIRED');
  } else if (results.failures.length > 0) {
    console.log('❌ STATUS: DEGRADED - ACTION NEEDED');
  } else if (results.warnings.length > 0) {
    console.log('⚠️  STATUS: HEALTHY WITH WARNINGS');
  } else {
    console.log('✅ STATUS: ALL SYSTEMS HEALTHY');
  }
  console.log('═'.repeat(70) + '\n');
}

/**
 * Save notification to log file
 */
function saveNotificationLog() {
  const logEntry = {
    timestamp: results.timestamp,
    summary: {
      passed: results.passed.length,
      warnings: results.warnings.length,
      failures: results.failures.length,
      critical: results.critical.length
    },
    critical: results.critical,
    failures: results.failures,
    warnings: results.warnings
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(NOTIFICATION_FILE, logLine);
    console.log(`📝 Log saved to: ${NOTIFICATION_FILE}\n`);
  } catch (error) {
    console.error('Failed to save log:', error.message);
  }
}

/**
 * Send email alerts using Gmail
 */
async function sendEmailAlert(subject, body) {
  try {
    const nodemailer = require('nodemailer');
    
    // Create transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ALERT_EMAIL,
        pass: process.env.ALERT_EMAIL_PASSWORD
      }
    });
    
    // Send email
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL || 'Hot Match Workflow Monitor',
      to: 'ugobe07@gmail.com',
      subject: subject,
      html: body
    });
    
    console.log('✅ Email alert sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return false;
  }
}

/**
 * Format alert email HTML
 */
function formatEmailBody() {
  const statusEmoji = results.critical.length > 0 ? '🚨' : 
                     results.failures.length > 0 ? '❌' : 
                     results.warnings.length > 0 ? '⚠️' : '✅';
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .critical { background: #fee; border-left: 4px solid #dc3545; padding: 15px; margin: 10px 0; }
    .failure { background: #ffe; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; }
    .warning { background: #fff8e1; border-left: 4px solid #ff9800; padding: 15px; margin: 10px 0; }
    .pass { color: #28a745; font-weight: bold; }
    .timestamp { color: #666; font-size: 0.9em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${statusEmoji} Hot Match Workflow Monitor</h1>
    <p class="timestamp">Report generated: ${new Date(results.timestamp).toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>✅ Passed: <strong>${results.passed.length}</strong></p>
    <p>⚠️ Warnings: <strong>${results.warnings.length}</strong></p>
    <p>❌ Failures: <strong>${results.failures.length}</strong></p>
    <p>🚨 Critical: <strong>${results.critical.length}</strong></p>
  </div>
`;

  // Critical issues
  if (results.critical.length > 0) {
    html += '<h2>🚨 Critical Issues (Immediate Action Required)</h2>';
    results.critical.forEach((item, i) => {
      html += `
      <div class="critical">
        <h3>${i + 1}. ${item.category}</h3>
        <p>${item.message}</p>
        ${item.details ? `<p><code>${JSON.stringify(item.details)}</code></p>` : ''}
        <p class="timestamp">${new Date(item.timestamp).toLocaleString()}</p>
      </div>`;
    });
  }

  // Failures
  if (results.failures.length > 0) {
    html += '<h2>❌ Failures (Action Needed)</h2>';
    results.failures.forEach((item, i) => {
      html += `
      <div class="failure">
        <h3>${i + 1}. ${item.category}</h3>
        <p>${item.message}</p>
        ${item.details ? `<p><code>${JSON.stringify(item.details)}</code></p>` : ''}
      </div>`;
    });
  }

  // Warnings
  if (results.warnings.length > 0) {
    html += '<h2>⚠️ Warnings (Action Recommended)</h2>';
    results.warnings.forEach((item, i) => {
      html += `
      <div class="warning">
        <h3>${i + 1}. ${item.category}</h3>
        <p>${item.message}</p>
      </div>`;
    });
  }

  // Passed checks
  if (results.passed.length > 0) {
    html += '<h2 class="pass">✅ Healthy Systems</h2><ul>';
    results.passed.forEach(item => {
      html += `<li>${item.category}: ${item.message}</li>`;
    });
    html += '</ul>';
  }

  html += `
  <hr>
  <p style="color: #666; font-size: 0.9em;">
    This is an automated message from the Hot Match Workflow Monitor.<br>
    Log file: workflow-alerts.log<br>
    To disable notifications, update workflow-monitor.js
  </p>
</body>
</html>`;

  return html;
}

/**
 * Send alerts via email
 */
async function sendAlerts() {
  // Always send email if there are warnings, failures, or critical issues
  const shouldAlert = results.warnings.length > 0 || 
                      results.failures.length > 0 || 
                      results.critical.length > 0;
  
  if (!shouldAlert) {
    console.log('\n✅ All systems healthy - no alerts needed\n');
    return;
  }
  
  // Determine subject line
  let subject;
  if (results.critical.length >= CRITICAL_THRESHOLD) {
    subject = `🚨 URGENT: ${results.critical.length} Critical Issues - Hot Match`;
  } else if (results.critical.length > 0) {
    subject = `🚨 Critical Issue Detected - Hot Match`;
  } else if (results.failures.length > 0) {
    subject = `❌ ${results.failures.length} System Failure${results.failures.length > 1 ? 's' : ''} - Hot Match`;
  } else {
    subject = `⚠️ ${results.warnings.length} Warning${results.warnings.length > 1 ? 's' : ''} - Hot Match`;
  }
  
  console.log(`\n📧 Sending email alert: "${subject}"`);
  
  const emailBody = formatEmailBody();
  const sent = await sendEmailAlert(subject, emailBody);
  
  if (sent) {
    console.log('📬 Alert email delivered to: ugobe07@gmail.com\n');
  } else {
    console.log('⚠️ Email delivery failed - check ALERT_EMAIL settings\n');
  }
}

/**
 * Main monitoring function
 */
async function runHealthChecks() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           🔥 HOT MATCH WORKFLOW HEALTH MONITOR                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  try {
    // Run all checks
    await checkEnvironmentVariables();
    await checkCriticalFiles();
    await checkDatabaseConnection();
    await checkDatabaseSchema();
    await checkInvestorDataQuality();
    await checkStartupDataQuality();
    await checkMatchingSystem();
    await checkBuildHealth();
    
    // Generate summary
    generateNotificationSummary();
    
    // Save log
    saveNotificationLog();
    
    // Send alerts if critical
    await sendAlerts();
    
    // Exit with appropriate code
    if (results.critical.length > 0) {
      process.exit(2); // Critical issues
    } else if (results.failures.length > 0) {
      process.exit(1); // Failures
    } else {
      process.exit(0); // All good
    }
    
  } catch (error) {
    console.error('\n❌ Monitor crashed:', error);
    process.exit(3);
  }
}

// Run if called directly
if (require.main === module) {
  runHealthChecks();
}

module.exports = { runHealthChecks };
