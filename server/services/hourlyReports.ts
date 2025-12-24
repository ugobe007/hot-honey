/**
 * HOURLY MATCH REPORT SERVICE
 * Generates and sends hourly reports on new matches and system activity
 */

import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hotmoneyhoney.com';

interface HourlyReport {
  timestamp: string;
  period: string;
  newStartups: number;
  newMatches: number;
  qualifiedStartups: number;
  pendingReview: number;
  topMatches: any[];
  systemHealth: {
    totalStartups: number;
    totalInvestors: number;
    totalMatches: number;
    avgMatchScore: number;
  };
}

/**
 * Generate hourly match report
 */
async function generateHourlyReport(): Promise<HourlyReport> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 GENERATING HOURLY REPORT - ${now.toISOString()}`);
  console.log('='.repeat(60));

  // Get new startups in last hour
  // SSOT: Use startup_uploads table (not 'startups')
  const { data: newStartups } = await supabase
    .from('startup_uploads')
    .select('id, name, status, created_at')
    .gte('created_at', oneHourAgo.toISOString());

  // Get new matches in last hour
  // SSOT: Use startup_investor_matches table and startup_uploads (not 'startups')
  const { data: newMatches } = await supabase
    .from('startup_investor_matches')
    .select(`
      id,
      match_score,
      startup:startup_uploads!startup_investor_matches_startup_id_fkey(name),
      investor:investors!startup_investor_matches_investor_id_fkey(name, firm)
    `)
    .gte('created_at', oneHourAgo.toISOString())
    .order('match_score', { ascending: false })
    .limit(10);

  // Get pending review count
  // SSOT: Use startup_uploads table (not 'startups')
  const { data: pendingStartups } = await supabase
    .from('startup_uploads')
    .select('id')
    .eq('status', 'pending');

  // Get qualified startups (approved + has matches)
  const { data: qualifiedStartups } = await supabase
    .from('startup_uploads')
    .select('id')
    .eq('status', 'approved')
    .gte('created_at', oneHourAgo.toISOString());

  // System health metrics
  // SSOT: Use startup_uploads table (not 'startups')
  const { data: allStartups } = await supabase.from('startup_uploads').select('id');
  const { data: allInvestors } = await supabase.from('investors').select('id');
  const { data: allMatches } = await supabase
    .from('investor_startup_matches')
    .select('match_score');

  const avgScore = allMatches?.length 
    ? Math.round(allMatches.reduce((sum, m) => sum + (m.match_score || 0), 0) / allMatches.length)
    : 0;

  const report: HourlyReport = {
    timestamp: now.toISOString(),
    period: `${oneHourAgo.toLocaleTimeString()} - ${now.toLocaleTimeString()}`,
    newStartups: newStartups?.length || 0,
    newMatches: newMatches?.length || 0,
    qualifiedStartups: qualifiedStartups?.length || 0,
    pendingReview: pendingStartups?.length || 0,
    topMatches: newMatches?.slice(0, 5).map((m: any) => ({
      startup: m.startup?.name || 'Unknown',
      investor: `${m.investor?.name || 'Unknown'} (${m.investor?.firm || 'N/A'})`,
      score: m.match_score
    })) || [],
    systemHealth: {
      totalStartups: allStartups?.length || 0,
      totalInvestors: allInvestors?.length || 0,
      totalMatches: allMatches?.length || 0,
      avgMatchScore: avgScore
    }
  };

  return report;
}

/**
 * Format report as console output
 */
function formatReportConsole(report: HourlyReport): void {
  console.log('\n📈 ACTIVITY SUMMARY');
  console.log('─'.repeat(60));
  console.log(`⏰ Period: ${report.period}`);
  console.log(`🆕 New Startups: ${report.newStartups}`);
  console.log(`🤝 New Matches: ${report.newMatches}`);
  console.log(`✅ Qualified Startups: ${report.qualifiedStartups}`);
  console.log(`⏳ Pending Review: ${report.pendingReview}`);

  if (report.topMatches.length > 0) {
    console.log('\n🔥 TOP MATCHES THIS HOUR:');
    report.topMatches.forEach((match, i) => {
      console.log(`  ${i + 1}. ${match.startup} ← ${match.investor} (${match.score}%)`);
    });
  }

  console.log('\n💊 SYSTEM HEALTH');
  console.log('─'.repeat(60));
  console.log(`📊 Total Startups: ${report.systemHealth.totalStartups}`);
  console.log(`💼 Total Investors: ${report.systemHealth.totalInvestors}`);
  console.log(`🤝 Total Matches: ${report.systemHealth.totalMatches}`);
  console.log(`📈 Avg Match Score: ${report.systemHealth.avgMatchScore}%`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Save report to database
 */
async function saveReport(report: HourlyReport): Promise<void> {
  const { error } = await supabase
    .from('match_reports')
    .insert({
      report_type: 'hourly',
      period_start: new Date(new Date(report.timestamp).getTime() - 60 * 60 * 1000).toISOString(),
      period_end: report.timestamp,
      metrics: {
        newStartups: report.newStartups,
        newMatches: report.newMatches,
        qualifiedStartups: report.qualifiedStartups,
        pendingReview: report.pendingReview,
        systemHealth: report.systemHealth
      },
      top_matches: report.topMatches,
      created_at: report.timestamp
    });

  if (error) {
    console.error('Failed to save report:', error);
  } else {
    console.log('✅ Report saved to database');
  }
}

/**
 * Send report notification (optional - email/slack)
 */
async function sendReportNotification(report: HourlyReport): Promise<void> {
  // TODO: Implement email/Slack notification
  // For now, just log
  if (report.newMatches > 0 || report.newStartups > 0) {
    console.log(`📧 Notification would be sent to ${ADMIN_EMAIL}`);
    console.log(`   ${report.newStartups} new startups, ${report.newMatches} new matches`);
  }
}

/**
 * Main hourly report job
 */
async function runHourlyReport(): Promise<void> {
  try {
    const report = await generateHourlyReport();
    formatReportConsole(report);
    await saveReport(report);
    await sendReportNotification(report);
  } catch (error) {
    console.error('❌ Hourly report failed:', error);
  }
}

/**
 * Schedule hourly reports
 * Runs at the top of every hour
 */
export function scheduleHourlyReports(): void {
  console.log('🕐 Scheduling hourly match reports...');
  
  // Run at the start of every hour (0 minutes)
  cron.schedule('0 * * * *', () => {
    console.log('\n⏰ HOURLY REPORT TRIGGERED');
    runHourlyReport();
  });

  console.log('✅ Hourly reports scheduled (every hour at :00)');
  
  // Run an immediate report on startup
  console.log('📊 Running initial report...');
  setTimeout(() => runHourlyReport(), 2000);
}

/**
 * Manual report trigger (for testing)
 */
export async function triggerManualReport(): Promise<HourlyReport> {
  const report = await generateHourlyReport();
  formatReportConsole(report);
  return report;
}

export default {
  scheduleHourlyReports,
  triggerManualReport,
  runHourlyReport
};
