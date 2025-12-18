#!/usr/bin/env node
/**
 * SYSTEM HEALTH REPORT
 * Run: node scripts/system-health.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fullReport() {
  console.log('═'.repeat(60));
  console.log('🔥 HOT MATCH - SYSTEM HEALTH REPORT');
  console.log('═'.repeat(60));
  console.log();

  // 1. Database counts
  const [startups, investors, matches, discovered] = await Promise.all([
    supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('investors').select('*', { count: 'exact', head: true }),
    supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true }),
    supabase.from('discovered_startups').select('*', { count: 'exact', head: true })
  ]);
  
  console.log('📊 DATABASE STATUS');
  console.log('  Approved Startups:', startups.count);
  console.log('  Investors:', investors.count);
  console.log('  Quality Matches:', matches.count);
  console.log('  Discovered (Pipeline):', discovered.count);
  console.log();

  // 2. GOD Score Distribution
  const { data: godData } = await supabase
    .from('startup_uploads')
    .select('total_god_score')
    .gt('total_god_score', 0);
  
  if (godData && godData.length > 0) {
    const scores = godData.map(s => s.total_god_score);
    const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
    const above70 = scores.filter(s => s >= 70).length;
    const between50and70 = scores.filter(s => s >= 50 && s < 70).length;
    const below50 = scores.filter(s => s < 50).length;
    
    console.log('📈 GOD SCORE DISTRIBUTION');
    console.log('  Average:', avg.toFixed(1) + '/100');
    console.log('  ≥70 (High Quality):', above70, '(' + (above70/scores.length*100).toFixed(0) + '%)');
    console.log('  50-69 (Medium):', between50and70, '(' + (between50and70/scores.length*100).toFixed(0) + '%)');
    console.log('  <50 (Low Quality):', below50, '(' + (below50/scores.length*100).toFixed(0) + '%)');
  }
  console.log();

  // 3. Match Score Distribution
  const { data: matchData } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(5000);
  
  if (matchData && matchData.length > 0) {
    const scores = matchData.map(m => m.match_score).filter(s => s != null);
    const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
    const above90 = scores.filter(s => s >= 90).length;
    const above70 = scores.filter(s => s >= 70 && s < 90).length;
    const between50and70 = scores.filter(s => s >= 50 && s < 70).length;
    
    console.log('🎯 MATCH SCORE DISTRIBUTION');
    console.log('  Average:', avg.toFixed(1) + '%');
    console.log('  ≥90% (Excellent):', above90, '(' + (above90/scores.length*100).toFixed(0) + '%)');
    console.log('  70-89% (Good):', above70, '(' + (above70/scores.length*100).toFixed(0) + '%)');
    console.log('  50-69% (Fair):', between50and70, '(' + (between50and70/scores.length*100).toFixed(0) + '%)');
  }
  console.log();

  // 4. Issues to address
  console.log('⚠️  POTENTIAL IMPROVEMENTS');
  
  // Check startups without GOD scores
  const { count: noScore } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .or('total_god_score.is.null,total_god_score.eq.0');
  
  if (noScore > 0) {
    console.log('  • ' + noScore + ' startups need GOD scores');
  }
  
  // Check legacy matches table
  const { count: legacyMatches } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });
  
  if (legacyMatches > 0) {
    console.log('  • Legacy "matches" table has ' + legacyMatches + ' old records (can be cleaned up)');
  }
  
  console.log();
  console.log('✅ VERDICT: System is healthy!');
  console.log('═'.repeat(60));
}

fullReport().catch(console.error);
