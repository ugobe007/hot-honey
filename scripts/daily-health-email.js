#!/usr/bin/env node
/**
 * DAILY HEALTH EMAIL / SLACK ALERT
 * =================================
 * Sends a daily summary of system health via email/Slack.
 * This runs independently and catches issues that PM2 processes might miss.
 * 
 * Setup:
 *   1. Set SLACK_WEBHOOK_URL or ALERT_EMAIL in .env
 *   2. Add to cron: 0 9 * * * cd /path/to/pythai && node scripts/daily-health-email.js
 *   
 * Can also be triggered manually: node scripts/daily-health-email.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const ALERT_EMAIL = process.env.ALERT_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function collectHealthMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    alerts: [],
    warnings: [],
    ok: []
  };

  // 1. Check PM2 processes
  try {
    const pm2Status = execSync('pm2 jlist 2>/dev/null || echo "[]"').toString();
    const processes = JSON.parse(pm2Status);
    
    const criticalProcesses = ['rss-scraper', 'scraper', 'system-guardian'];
    for (const name of criticalProcesses) {
      const proc = processes.find(p => p.name === name);
      if (!proc || proc.pm2_env.status !== 'online') {
        metrics.alerts.push(`🔴 ${name} is ${proc ? proc.pm2_env.status : 'MISSING'}`);
      } else {
        metrics.ok.push(`✅ ${name} running`);
      }
    }
  } catch (e) {
    metrics.alerts.push(`🔴 PM2 check failed: ${e.message}`);
  }

  // 2. Check scraper activity (most important!)
  try {
    const { data: recentDiscoveries, count } = await supabase
      .from('discovered_startups')
      .select('created_at', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (count === 0) {
      metrics.alerts.push(`🔴 NO startups discovered in 24 hours!`);
    } else if (count < 5) {
      metrics.warnings.push(`⚠️ Only ${count} startups discovered in 24h (expected 10+)`);
    } else {
      metrics.ok.push(`✅ ${count} startups discovered in 24h`);
    }

    // Check when last startup was added
    if (recentDiscoveries?.[0]) {
      const lastDiscovery = new Date(recentDiscoveries[0].created_at);
      const hoursAgo = (Date.now() - lastDiscovery.getTime()) / (1000 * 60 * 60);
      if (hoursAgo > 12) {
        metrics.warnings.push(`⚠️ Last discovery was ${hoursAgo.toFixed(0)} hours ago`);
      }
    }
  } catch (e) {
    metrics.alerts.push(`🔴 Discovery check failed: ${e.message}`);
  }

  // 3. Check investor discovery
  try {
    const { count } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (count === 0) {
      metrics.warnings.push(`⚠️ No new investors discovered this week`);
    } else {
      metrics.ok.push(`✅ ${count} new investors this week`);
    }
  } catch (e) {
    // Non-critical
  }

  // 4. Check GOD Score health
  try {
    const { data: scores } = await supabase
      .from('startup_uploads')
      .select('total_god_score')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null);
    
    if (scores && scores.length > 0) {
      const avg = scores.reduce((a, b) => a + (b.total_god_score || 0), 0) / scores.length;
      const lowCount = scores.filter(s => (s.total_god_score || 0) < 50).length;
      const lowPercent = (lowCount / scores.length) * 100;
      
      if (avg < 45) {
        metrics.warnings.push(`⚠️ GOD Score avg is ${avg.toFixed(1)} (should be 45+)`);
      }
      if (lowPercent > 80) {
        metrics.warnings.push(`⚠️ ${lowPercent.toFixed(0)}% of startups have low GOD scores`);
      }
      metrics.ok.push(`✅ GOD Scores: avg ${avg.toFixed(1)}, ${scores.length} scored`);
    }
  } catch (e) {
    // Non-critical
  }

  // 5. Check inference coverage (new!)
  try {
    const { data: sample } = await supabase
      .from('discovered_startups')
      .select('sectors, funding_stage, has_revenue')
      .limit(100);
    
    if (sample) {
      const withSectors = sample.filter(s => s.sectors && s.sectors.length > 0).length;
      const coverage = (withSectors / sample.length) * 100;
      
      if (coverage < 10) {
        metrics.warnings.push(`⚠️ Only ${coverage.toFixed(0)}% of startups have sector data`);
      } else {
        metrics.ok.push(`✅ Inference coverage: ${coverage.toFixed(0)}%`);
      }
    }
  } catch (e) {
    // Non-critical
  }

  // 6. Check match count
  try {
    const { count } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true });
    
    if (count < 1000) {
      metrics.alerts.push(`🔴 Only ${count} matches exist (need 5000+)`);
    } else if (count < 5000) {
      metrics.warnings.push(`⚠️ Match count is ${count} (target: 5000+)`);
    } else {
      metrics.ok.push(`✅ ${count.toLocaleString()} matches`);
    }
  } catch (e) {
    // Non-critical
  }

  return metrics;
}

async function sendSlackAlert(metrics) {
  if (!SLACK_WEBHOOK_URL) return false;
  
  const hasAlerts = metrics.alerts.length > 0;
  const hasWarnings = metrics.warnings.length > 0;
  
  const emoji = hasAlerts ? '🚨' : hasWarnings ? '⚠️' : '✅';
  const status = hasAlerts ? 'ALERTS DETECTED' : hasWarnings ? 'Warnings' : 'All Systems OK';
  
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} pyth ai Daily Health: ${status}` }
    }
  ];

  if (metrics.alerts.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*🔴 Critical Alerts:*\n${metrics.alerts.join('\n')}` }
    });
  }

  if (metrics.warnings.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*⚠️ Warnings:*\n${metrics.warnings.join('\n')}` }
    });
  }

  if (metrics.ok.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*✅ Healthy:*\n${metrics.ok.join('\n')}` }
    });
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });
    return response.ok;
  } catch (e) {
    console.error('Slack alert failed:', e.message);
    return false;
  }
}

async function sendEmailAlert(metrics) {
  if (!ALERT_EMAIL) return false;
  
  // Use Resend API (simpler, no SMTP config needed)
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  const hasAlerts = metrics.alerts.length > 0;
  const hasWarnings = metrics.warnings.length > 0;
  
  const status = hasAlerts ? '🚨 ALERTS DETECTED' : hasWarnings ? '⚠️ Warnings' : '✅ All Systems OK';
  const subject = `pyth ai Health: ${status}`;
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: ${hasAlerts ? '#dc2626' : hasWarnings ? '#f59e0b' : '#16a34a'};">
        ${status}
      </h1>
      <p style="color: #666;">Health check at ${new Date().toLocaleString()}</p>
  `;
  
  if (metrics.alerts.length > 0) {
    html += `
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0;">
        <h3 style="color: #dc2626; margin: 0 0 8px 0;">🔴 Critical Alerts</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${metrics.alerts.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  if (metrics.warnings.length > 0) {
    html += `
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0;">
        <h3 style="color: #f59e0b; margin: 0 0 8px 0;">⚠️ Warnings</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${metrics.warnings.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  if (metrics.ok.length > 0) {
    html += `
      <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; margin: 16px 0;">
        <h3 style="color: #16a34a; margin: 0 0 8px 0;">✅ Healthy</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${metrics.ok.map(o => `<li>${o}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  html += `
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px;">
        pyth ai System Guardian • <a href="http://localhost:5173/admin/health">View Dashboard</a>
      </p>
    </div>
  `;

  // Try Resend first (recommended - free tier: 100 emails/day)
  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'pyth ai <alerts@resend.dev>',
          to: ALERT_EMAIL,
          subject: subject,
          html: html
        })
      });
      
      if (response.ok) return true;
      const err = await response.json();
      console.error('Resend failed:', err);
    } catch (e) {
      console.error('Resend error:', e.message);
    }
  }
  
  // Fallback to SMTP (Gmail, etc.)
  if (SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      });
      
      await transporter.sendMail({
        from: SMTP_USER,
        to: ALERT_EMAIL,
        subject: subject,
        html: html
      });
      return true;
    } catch (e) {
      console.error('SMTP failed:', e.message);
    }
  }
  
  console.log('⚠️ Email not sent - configure RESEND_API_KEY or SMTP credentials in .env');
  return false;
}

async function logToDatabase(metrics) {
  try {
    await supabase.from('ai_logs').insert({
      type: 'daily_health',
      action: 'health_check',
      status: metrics.alerts.length > 0 ? 'error' : metrics.warnings.length > 0 ? 'warning' : 'success',
      output: metrics
    });
  } catch (e) {
    console.error('Failed to log to database:', e.message);
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('    🏥 PYTH AI DAILY HEALTH CHECK');
  console.log('═'.repeat(60));
  console.log(`\n📅 ${new Date().toLocaleString()}\n`);

  const metrics = await collectHealthMetrics();

  // Print to console
  if (metrics.alerts.length > 0) {
    console.log('\n🔴 CRITICAL ALERTS:');
    metrics.alerts.forEach(a => console.log(`   ${a}`));
  }

  if (metrics.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    metrics.warnings.forEach(w => console.log(`   ${w}`));
  }

  if (metrics.ok.length > 0) {
    console.log('\n✅ HEALTHY:');
    metrics.ok.forEach(o => console.log(`   ${o}`));
  }

  // Send alerts
  if (SLACK_WEBHOOK_URL) {
    const sent = await sendSlackAlert(metrics);
    console.log(`\n📤 Slack alert: ${sent ? 'sent' : 'failed'}`);
  } else {
    console.log('\n💡 TIP: Set SLACK_WEBHOOK_URL in .env for Slack alerts');
  }

  // Send email
  if (ALERT_EMAIL) {
    const sent = await sendEmailAlert(metrics);
    console.log(`📧 Email to ${ALERT_EMAIL}: ${sent ? 'sent' : 'not sent (configure RESEND_API_KEY)'}`);
  }

  // Log to database
  await logToDatabase(metrics);

  // Summary
  const overall = metrics.alerts.length > 0 ? '🔴 ACTION REQUIRED' : 
                  metrics.warnings.length > 0 ? '⚠️ NEEDS ATTENTION' : 
                  '✅ ALL SYSTEMS GO';
  
  console.log('\n' + '═'.repeat(60));
  console.log(`    STATUS: ${overall}`);
  console.log('═'.repeat(60));

  // Exit with error code if critical alerts
  if (metrics.alerts.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Health check failed:', err);
  process.exit(1);
});
