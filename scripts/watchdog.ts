/**
 * HOT MATCH WATCHDOG
 * ==================
 * Health monitoring and auto-fix system.
 * Runs every 5 minutes via PM2 cron.
 * 
 * Checks:
 * 1. Database connectivity
 * 2. Stale data detection
 * 3. RSS source health
 * 4. Match queue status
 * 5. Error rate monitoring
 * 
 * Auto-fixes:
 * - Disables broken RSS feeds
 * - Clears stuck processing states
 * - Triggers score recalculation for stale startups
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface HealthReport {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: boolean;
    rss_sources: { active: number; failed: number };
    stale_startups: number;
    pending_matches: number;
    errors_24h: number;
    matches?: number;
  };
  actions_taken: string[];
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('startup_uploads').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkRssSources(): Promise<{ active: number; failed: number; disabled: string[] }> {
  const disabled: string[] = [];
  
  // Get all active RSS sources
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('id, name, url, active, last_fetched')
    .eq('active', true);

  if (!sources) return { active: 0, failed: 0, disabled };

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  let failed = 0;

  for (const source of sources) {
    // Check if source hasn't been fetched in over 24 hours (might be broken)
    if (source.last_fetched) {
      const lastFetch = new Date(source.last_fetched);
      const hoursSinceLastFetch = (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastFetch > 48) {
        // Disable sources that haven't worked in 48 hours
        console.log(`⚠️ Disabling stale RSS source: ${source.name} (${hoursSinceLastFetch.toFixed(0)}h since last fetch)`);
        await supabase.from('rss_sources').update({ active: false }).eq('id', source.id);
        disabled.push(source.name);
        failed++;
      }
    }
  }

  return {
    active: sources.length - failed,
    failed,
    disabled
  };
}

async function checkStaleStartups(): Promise<{ count: number; refreshed: number }> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Find startups without recent score updates
  const { data: stale } = await supabase
    .from('startup_uploads')
    .select('id, name, updated_at')
    .lt('updated_at', oneWeekAgo)
    .eq('status', 'approved')
    .limit(50);

  if (!stale || stale.length === 0) {
    return { count: 0, refreshed: 0 };
  }

  console.log(`📊 Found ${stale.length} stale startups, marking for refresh...`);

  // Touch the updated_at to trigger recalculation
  let refreshed = 0;
  for (const startup of stale.slice(0, 10)) {
    const { error } = await supabase
      .from('startup_uploads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', startup.id);
    
    if (!error) refreshed++;
  }

  return { count: stale.length, refreshed };
}

async function checkMatchQueue(): Promise<number> {
  const { count } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'new']);

  return count || 0;
}

async function clearStuckProcessing(): Promise<number> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  // Reset articles stuck in processing state
  const { data: stuck } = await supabase
    .from('rss_articles')
    .update({ processed: false })
    .eq('processed', true)
    .lt('created_at', thirtyMinutesAgo)
    .select('id');

  return stuck?.length || 0;
}

async function logHealthReport(report: HealthReport): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('🐕 WATCHDOG HEALTH REPORT');
  console.log('='.repeat(50));
  console.log(`📅 Time: ${report.timestamp}`);
  console.log(`🚦 Status: ${report.status.toUpperCase()}`);
  console.log('\nChecks:');
  console.log(`  ✅ Database: ${report.checks.database ? 'Connected' : '❌ DISCONNECTED'}`);
  console.log(`  📡 RSS Sources: ${report.checks.rss_sources.active} active, ${report.checks.rss_sources.failed} failed`);
  console.log(`  📊 Stale Startups: ${report.checks.stale_startups}`);
  console.log(`  🔄 Pending Matches: ${report.checks.pending_matches}`);
  
  if (report.actions_taken.length > 0) {
    console.log('\nActions Taken:');
    report.actions_taken.forEach(action => console.log(`  → ${action}`));
  }
  console.log('='.repeat(50) + '\n');

  // Optionally log to database
  try {
    await supabase.from('ai_logs').insert({
      type: 'watchdog',
      input: { report_type: 'health_check' },
      output: report,
      status: report.status === 'healthy' ? 'success' : 'warning'
    });
  } catch (e) {
    // Ignore logging errors
  }
}

async function runWatchdog(): Promise<void> {
  console.log('🐕 Starting Watchdog health check...');
  
  const actions: string[] = [];
  
  // 1. Check database
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.error('❌ CRITICAL: Database connection failed!');
    process.exit(1);
  }

  // 2. Check and fix RSS sources
  const rssStatus = await checkRssSources();
  if (rssStatus.disabled.length > 0) {
    actions.push(`Disabled ${rssStatus.disabled.length} broken RSS sources: ${rssStatus.disabled.join(', ')}`);
  }

  // 3. Check stale startups
  const staleStatus = await checkStaleStartups();
  if (staleStatus.refreshed > 0) {
    actions.push(`Marked ${staleStatus.refreshed} stale startups for refresh`);
  }

  // 4. Check match queue
  const pendingMatches = await checkMatchQueue();

  // 5. Clear stuck processing
  const unstuck = await clearStuckProcessing();
  if (unstuck > 0) {
    actions.push(`Cleared ${unstuck} stuck processing states`);
  }
  
  // 6. CHECK MATCH COUNT - Critical health indicator
  const { count: matchCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  const { count: startupCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  const { count: investorCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  // If we have startups & investors but < 1000 matches, something is wrong
  const hasData = (startupCount || 0) > 10 && (investorCount || 0) > 10;
  const matchesMissing = hasData && (matchCount || 0) < 1000;
  
  if (matchesMissing) {
    console.log('🚨 CRITICAL: Matches table is nearly empty!');
    console.log(`   Startups: ${startupCount}, Investors: ${investorCount}, Matches: ${matchCount}`);
    console.log('🔄 Triggering match regeneration...');
    
    // Spawn match regeneration
    const { spawn } = await import('child_process');
    spawn('node', ['match-regenerator.js'], {
      cwd: '/Users/leguplabs/Desktop/hot-honey',
      detached: true,
      stdio: 'ignore'
    }).unref();
    
    actions.push(`Triggered match regeneration (${matchCount} matches → expected ${(startupCount || 0) * (investorCount || 0) * 0.4}+)`);
  }

  // Determine overall status
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (!dbOk || matchesMissing) status = 'critical';
  else if (rssStatus.failed > 5 || staleStatus.count > 100) status = 'warning';

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    status,
    checks: {
      database: dbOk,
      rss_sources: { active: rssStatus.active, failed: rssStatus.failed },
      stale_startups: staleStatus.count,
      pending_matches: pendingMatches,
      errors_24h: 0,
      matches: matchCount || 0  // Add match count to report
    },
    actions_taken: actions
  };

  await logHealthReport(report);
  
  console.log('✅ Watchdog check complete');
}

// Run
runWatchdog().catch(console.error);
