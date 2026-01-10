/**
 * PYTH AI - DAILY REPORT GENERATOR
 * 
 * Generates comprehensive daily reports on:
 * - Startups discovered & approved
 * - Investors found & enriched
 * - Matches generated
 * - GOD scoring health
 * - System issues
 * 
 * Run: npx tsx scripts/daily-report.ts
 * Schedule: Daily at 9 AM via PM2 cron
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { sendSlackAlert, sendEmailAlert, Alert } from './notifications.js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

interface DailyStats {
  // Startups
  totalStartups: number;
  approvedStartups: number;
  pendingStartups: number;
  newStartupsToday: number;
  discoveredStartupsToday: number;
  
  // Investors
  totalInvestors: number;
  enrichedInvestors: number;
  newInvestorsToday: number;
  
  // Matches
  totalMatches: number;
  newMatchesToday: number;
  avgMatchScore: number;
  
  // GOD Scoring
  startupsWithScores: number;
  startupsWithoutScores: number;
  avgGODScore: number;
  lowScoreCount: number;
  highScoreCount: number;
  
  // System Health
  rssSourcesActive: number;
  rssSourcesFailed: number;
  agentRunsToday: number;
  fixesAppliedToday: number;
  escalationsToday: number;
  
  // Issues
  issues: string[];
}

async function gatherStats(): Promise<DailyStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  
  const stats: DailyStats = {
    totalStartups: 0,
    approvedStartups: 0,
    pendingStartups: 0,
    newStartupsToday: 0,
    discoveredStartupsToday: 0,
    totalInvestors: 0,
    enrichedInvestors: 0,
    newInvestorsToday: 0,
    totalMatches: 0,
    newMatchesToday: 0,
    avgMatchScore: 0,
    startupsWithScores: 0,
    startupsWithoutScores: 0,
    avgGODScore: 0,
    lowScoreCount: 0,
    highScoreCount: 0,
    rssSourcesActive: 0,
    rssSourcesFailed: 0,
    agentRunsToday: 0,
    fixesAppliedToday: 0,
    escalationsToday: 0,
    issues: []
  };

  // ============================================================================
  // STARTUP STATS
  // ============================================================================
  
  // Total startups
  const { count: totalStartups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  stats.totalStartups = totalStartups || 0;

  // Approved startups
  const { count: approvedStartups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  stats.approvedStartups = approvedStartups || 0;

  // Pending startups
  const { count: pendingStartups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  stats.pendingStartups = pendingStartups || 0;

  // New startups today
  const { count: newStartupsToday } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);
  stats.newStartupsToday = newStartupsToday || 0;

  // Discovered startups today
  const { count: discoveredToday } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);
  stats.discoveredStartupsToday = discoveredToday || 0;

  // ============================================================================
  // INVESTOR STATS
  // ============================================================================
  
  // Total investors
  const { count: totalInvestors } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  stats.totalInvestors = totalInvestors || 0;

  // Enriched investors (have sectors and stage)
  const { count: enrichedInvestors } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true })
    .not('sectors', 'is', null);
  stats.enrichedInvestors = enrichedInvestors || 0;

  // New investors today
  const { count: newInvestorsToday } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);
  stats.newInvestorsToday = newInvestorsToday || 0;

  // ============================================================================
  // MATCH STATS
  // ============================================================================
  
  // Total matches
  const { count: totalMatches } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  stats.totalMatches = totalMatches || 0;

  // New matches today
  const { count: newMatchesToday } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);
  stats.newMatchesToday = newMatchesToday || 0;

  // Average match score
  const { data: matchScores } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(1000);
  if (matchScores && matchScores.length > 0) {
    const avg = matchScores.reduce((sum, m) => sum + (m.match_score || 0), 0) / matchScores.length;
    stats.avgMatchScore = Math.round(avg);
  }

  // ============================================================================
  // GOD SCORING STATS
  // ============================================================================
  
  // Startups with scores
  const { count: withScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .not('total_god_score', 'is', null);
  stats.startupsWithScores = withScores || 0;

  // Startups without scores
  const { count: withoutScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .is('total_god_score', null)
    .eq('status', 'approved');
  stats.startupsWithoutScores = withoutScores || 0;

  // Average GOD score
  const { data: godScores } = await supabase
    .from('startup_uploads')
    .select('total_god_score')
    .not('total_god_score', 'is', null)
    .limit(1000);
  if (godScores && godScores.length > 0) {
    const avg = godScores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / godScores.length;
    stats.avgGODScore = Math.round(avg);
  }

  // Low scores (<50) and High scores (>80)
  const { count: lowScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .lt('total_god_score', 50);
  stats.lowScoreCount = lowScores || 0;

  const { count: highScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .gt('total_god_score', 80);
  stats.highScoreCount = highScores || 0;

  // ============================================================================
  // SYSTEM HEALTH
  // ============================================================================
  
  // RSS sources
  const { data: rssSources } = await supabase
    .from('rss_sources')
    .select('active');
  if (rssSources) {
    stats.rssSourcesActive = rssSources.filter(r => r.active).length;
    stats.rssSourcesFailed = rssSources.filter(r => !r.active).length;
  }

  // Agent runs today
  const { count: agentRuns } = await supabase
    .from('ai_logs')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'agent_report')
    .gte('created_at', todayISO);
  stats.agentRunsToday = agentRuns || 0;

  // Fixes applied today (from agent learning logs)
  const { data: learningLogs } = await supabase
    .from('ai_logs')
    .select('*')
    .eq('type', 'agent_learning')
    .eq('status', 'success')
    .gte('created_at', todayISO);
  stats.fixesAppliedToday = learningLogs?.length || 0;

  // Escalations today
  const { count: escalations } = await supabase
    .from('ai_logs')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'agent_escalation')
    .gte('created_at', todayISO);
  stats.escalationsToday = escalations || 0;

  // ============================================================================
  // IDENTIFY ISSUES
  // ============================================================================
  
  if (stats.startupsWithoutScores > 10) {
    stats.issues.push(`${stats.startupsWithoutScores} approved startups missing GOD scores`);
  }
  
  if (stats.pendingStartups > 50) {
    stats.issues.push(`${stats.pendingStartups} startups pending review`);
  }
  
  if (stats.rssSourcesFailed > 5) {
    stats.issues.push(`${stats.rssSourcesFailed} RSS sources are failing`);
  }
  
  if (stats.avgGODScore < 40) {
    stats.issues.push(`Average GOD score is low (${stats.avgGODScore})`);
  }
  
  if (stats.newMatchesToday === 0 && stats.approvedStartups > 100) {
    stats.issues.push('No new matches generated today');
  }
  
  const enrichmentRate = stats.totalInvestors > 0 
    ? Math.round((stats.enrichedInvestors / stats.totalInvestors) * 100) 
    : 0;
  if (enrichmentRate < 50) {
    stats.issues.push(`Only ${enrichmentRate}% of investors are enriched`);
  }

  return stats;
}

function formatReport(stats: DailyStats): string {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
📊 *PYTH AI DAILY REPORT*
${date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 *STARTUPS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total: ${stats.totalStartups.toLocaleString()}
• Approved: ${stats.approvedStartups.toLocaleString()}
• Pending Review: ${stats.pendingStartups}
• New Today: ${stats.newStartupsToday}
• Discovered (RSS): ${stats.discoveredStartupsToday}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 *INVESTORS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total: ${stats.totalInvestors.toLocaleString()}
• Enriched: ${stats.enrichedInvestors.toLocaleString()} (${Math.round((stats.enrichedInvestors / stats.totalInvestors) * 100)}%)
• New Today: ${stats.newInvestorsToday}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *MATCHES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total Matches: ${stats.totalMatches.toLocaleString()}
• New Today: ${stats.newMatchesToday}
• Avg Match Score: ${stats.avgMatchScore}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *GOD SCORING*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Scored: ${stats.startupsWithScores.toLocaleString()}
• Missing Scores: ${stats.startupsWithoutScores}
• Average Score: ${stats.avgGODScore}
• High Performers (>80): ${stats.highScoreCount}
• Needs Work (<50): ${stats.lowScoreCount}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *SYSTEM HEALTH*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• RSS Sources: ${stats.rssSourcesActive} active, ${stats.rssSourcesFailed} failed
• AI Agent Runs: ${stats.agentRunsToday}
• Auto-Fixes: ${stats.fixesAppliedToday}
• Escalations: ${stats.escalationsToday}

${stats.issues.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *ISSUES NEEDING ATTENTION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${stats.issues.map(i => `• ${i}`).join('\n')}
` : `
✅ *No critical issues detected*
`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

async function generateAndSendReport(): Promise<void> {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 PYTH AI DAILY REPORT GENERATOR');
  console.log('═'.repeat(60) + '\n');

  console.log('📈 Gathering statistics...');
  const stats = await gatherStats();

  console.log('📝 Formatting report...');
  const reportText = formatReport(stats);
  
  console.log('\n' + reportText + '\n');

  // Determine alert level
  const alertLevel: 'info' | 'warning' | 'critical' = 
    stats.issues.length > 3 ? 'critical' :
    stats.issues.length > 0 ? 'warning' : 'info';

  // Send to Slack
  console.log('📤 Sending to Slack...');
  const slackSent = await sendSlackAlert({
    level: alertLevel,
    title: 'pyth ai Daily Report',
    message: reportText,
    details: {
      startups: stats.totalStartups,
      investors: stats.totalInvestors,
      matches: stats.totalMatches,
      avgGODScore: stats.avgGODScore,
      issues: stats.issues.length
    }
  });
  console.log(slackSent ? '   ✅ Slack notification sent' : '   ⚠️  Slack not configured');

  // Send email
  console.log('📧 Sending email...');
  const emailSent = await sendEmailAlert({
    level: alertLevel,
    title: 'pyth ai Daily Report',
    message: reportText.replace(/\*/g, '').replace(/━/g, '-'),
    details: {
      startups: stats.totalStartups,
      investors: stats.totalInvestors,
      matches: stats.totalMatches,
      avgGODScore: stats.avgGODScore,
      issues: stats.issues
    }
  });
  console.log(emailSent ? '   ✅ Email sent' : '   ⚠️  Email not configured');

  // Save to database
  console.log('💾 Saving to database...');
  await supabase.from('ai_logs').insert({
    type: 'daily_report',
    input: { date: new Date().toISOString().split('T')[0] },
    output: stats,
    status: alertLevel === 'critical' ? 'error' : alertLevel === 'warning' ? 'warning' : 'success'
  });

  console.log('\n✅ Daily report complete!\n');
}

// Run
generateAndSendReport().catch(console.error);
