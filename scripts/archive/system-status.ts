/**
 * HOT MATCH - SYSTEM STATUS SERVICE
 * 
 * Provides real-time system status for the Agent Dashboard
 * and other monitoring components.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastUpdated: string;
  
  services: {
    aiAgent: ServiceStatus;
    watchdog: ServiceStatus;
    scraper: ServiceStatus;
    godScoring: ServiceStatus;
    matchingEngine: ServiceStatus;
    investorEnrichment: ServiceStatus;
  };
  
  metrics: {
    totalStartups: number;
    totalInvestors: number;
    totalMatches: number;
    avgGODScore: number;
    newStartupsToday: number;
    newInvestorsToday: number;
    newMatchesToday: number;
  };
  
  issues: string[];
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  lastRun: string | null;
  runsToday: number;
  successRate: number;
  message?: string;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  
  const status: SystemStatus = {
    overall: 'unknown',
    lastUpdated: now.toISOString(),
    services: {
      aiAgent: await getServiceStatus('ai-agent', 'agent_report', 60), // 60 min threshold
      watchdog: await getServiceStatus('watchdog', 'watchdog', 10), // 10 min threshold
      scraper: await getServiceStatus('scraper', 'scraper', 30),
      godScoring: await getGODScoringStatus(),
      matchingEngine: await getMatchingEngineStatus(),
      investorEnrichment: await getServiceStatus('investor-enrichment', 'enrichment', 60)
    },
    metrics: await getMetrics(todayISO),
    issues: []
  };

  // Calculate overall status
  const services = Object.values(status.services);
  const errorCount = services.filter(s => s.status === 'error').length;
  const runningCount = services.filter(s => s.status === 'running').length;
  
  if (errorCount >= 2) {
    status.overall = 'critical';
  } else if (errorCount >= 1 || runningCount < 3) {
    status.overall = 'warning';
  } else {
    status.overall = 'healthy';
  }

  // Gather issues
  if (status.metrics.avgGODScore < 40) {
    status.issues.push('Average GOD score is low');
  }
  if (status.services.godScoring.status === 'error') {
    status.issues.push('GOD scoring system needs attention');
  }
  if (status.services.matchingEngine.status === 'error') {
    status.issues.push('Matching engine has issues');
  }

  return status;
}

async function getServiceStatus(name: string, logType: string, thresholdMinutes: number): Promise<ServiceStatus> {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get last run
  const { data: lastRun } = await supabase
    .from('ai_logs')
    .select('created_at, status')
    .eq('type', logType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Count runs today
  const { count: runsToday } = await supabase
    .from('ai_logs')
    .select('*', { count: 'exact', head: true })
    .eq('type', logType)
    .gte('created_at', today.toISOString());

  // Count successful runs today
  const { count: successToday } = await supabase
    .from('ai_logs')
    .select('*', { count: 'exact', head: true })
    .eq('type', logType)
    .eq('status', 'success')
    .gte('created_at', today.toISOString());

  const successRate = (runsToday && runsToday > 0) 
    ? Math.round((successToday || 0) / runsToday * 100) 
    : 100;

  // Determine status
  let status: 'running' | 'stopped' | 'error' | 'unknown' = 'unknown';
  let message = '';
  
  if (!lastRun) {
    status = 'unknown';
    message = 'No runs recorded';
  } else {
    const lastRunTime = new Date(lastRun.created_at);
    const minutesSinceLastRun = (now.getTime() - lastRunTime.getTime()) / (1000 * 60);
    
    if (minutesSinceLastRun <= thresholdMinutes) {
      status = lastRun.status === 'success' ? 'running' : 'error';
      message = `Last run ${Math.round(minutesSinceLastRun)} min ago`;
    } else {
      status = 'stopped';
      message = `No run in ${Math.round(minutesSinceLastRun)} min`;
    }
  }

  return {
    name,
    status,
    lastRun: lastRun?.created_at || null,
    runsToday: runsToday || 0,
    successRate,
    message
  };
}

async function getGODScoringStatus(): Promise<ServiceStatus> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check startups with scores
  const { count: withScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .not('total_god_score', 'is', null);

  // Check startups without scores
  const { count: withoutScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .is('total_god_score', null)
    .eq('status', 'approved');

  // Get average score
  const { data: scores } = await supabase
    .from('startup_uploads')
    .select('total_god_score')
    .not('total_god_score', 'is', null)
    .limit(500);

  const avgScore = scores && scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / scores.length
    : 0;

  // Determine status
  let status: 'running' | 'stopped' | 'error' | 'unknown' = 'running';
  let message = `${withScores || 0} scored, avg ${Math.round(avgScore)}`;

  if ((withoutScores || 0) > 20) {
    status = 'error';
    message = `${withoutScores} startups missing scores`;
  } else if (avgScore < 30) {
    status = 'error';
    message = `Low average score: ${Math.round(avgScore)}`;
  }

  return {
    name: 'GOD Scoring',
    status,
    lastRun: new Date().toISOString(),
    runsToday: 0, // Calculated on-demand
    successRate: Math.round((withScores || 0) / ((withScores || 0) + (withoutScores || 0)) * 100),
    message
  };
}

async function getMatchingEngineStatus(): Promise<ServiceStatus> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count total matches
  const { count: totalMatches } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  // Count matches today
  const { count: matchesToday } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  // Get average match score
  const { data: recentMatches } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .order('created_at', { ascending: false })
    .limit(100);

  const avgScore = recentMatches && recentMatches.length > 0
    ? recentMatches.reduce((sum, m) => sum + (m.match_score || 0), 0) / recentMatches.length
    : 0;

  // Determine status
  let status: 'running' | 'stopped' | 'error' | 'unknown' = 'running';
  let message = `${totalMatches || 0} total, ${matchesToday || 0} today`;

  if ((totalMatches || 0) === 0) {
    status = 'error';
    message = 'No matches in database';
  } else if (avgScore < 40) {
    status = 'error';
    message = `Low match quality: ${Math.round(avgScore)}%`;
  }

  return {
    name: 'Matching Engine',
    status,
    lastRun: new Date().toISOString(),
    runsToday: matchesToday || 0,
    successRate: Math.round(avgScore),
    message
  };
}

async function getMetrics(todayISO: string): Promise<SystemStatus['metrics']> {
  const [
    totalStartups,
    totalInvestors,
    totalMatches,
    newStartupsToday,
    newInvestorsToday,
    newMatchesToday,
    scores
  ] = await Promise.all([
    supabase.from('startup_uploads').select('*', { count: 'exact', head: true }),
    supabase.from('investors').select('*', { count: 'exact', head: true }),
    supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true }),
    supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('investors').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('startup_uploads').select('total_god_score').not('total_god_score', 'is', null).limit(500)
  ]);

  const avgGODScore = scores.data && scores.data.length > 0
    ? scores.data.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / scores.data.length
    : 0;

  return {
    totalStartups: totalStartups.count || 0,
    totalInvestors: totalInvestors.count || 0,
    totalMatches: totalMatches.count || 0,
    avgGODScore: Math.round(avgGODScore),
    newStartupsToday: newStartupsToday.count || 0,
    newInvestorsToday: newInvestorsToday.count || 0,
    newMatchesToday: newMatchesToday.count || 0
  };
}

// Export for API use
export async function getStatusJSON(): Promise<string> {
  const status = await getSystemStatus();
  return JSON.stringify(status, null, 2);
}

// CLI mode
if (require.main === module) {
  getSystemStatus()
    .then(status => {
      console.log('\n' + '═'.repeat(60));
      console.log('📊 HOT MATCH SYSTEM STATUS');
      console.log('═'.repeat(60));
      console.log(JSON.stringify(status, null, 2));
    })
    .catch(console.error);
}
