#!/usr/bin/env node
/**
 * STARTUP STATS & GOD SCORE TRENDS
 * 
 * Shows:
 * - Recent startup discoveries
 * - GOD score distribution
 * - GOD score trends over time
 * - Match generation stats
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials');
  console.error('\nPlease ensure your .env file contains:');
  console.error('  - VITE_SUPABASE_URL (or SUPABASE_URL)');
  console.error('  - SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  console.error('\nThe .env file should be in the project root directory.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function formatNumber(num) {
  return num.toLocaleString();
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function checkDiscoveredStartups() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}📊 DISCOVERED STARTUPS${colors.reset}`);
  console.log('═'.repeat(70));
  
  // Total discovered
  const { count: totalDiscovered } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true });
  
  // Recent (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent24h } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);
  
  // Last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recent7d } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);
  
  // Imported vs not imported
  const { count: imported } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .eq('imported_to_startups', true);
  
  const { count: notImported } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .eq('imported_to_startups', false);
  
  console.log(`\n${colors.cyan}Total Discovered:${colors.reset} ${colors.bright}${formatNumber(totalDiscovered || 0)}${colors.reset}`);
  console.log(`  ${colors.green}✅ Imported:${colors.reset} ${formatNumber(imported || 0)}`);
  console.log(`  ${colors.yellow}⏳ Pending Import:${colors.reset} ${formatNumber(notImported || 0)}`);
  console.log(`\n${colors.cyan}Recent Activity:${colors.reset}`);
  console.log(`  Last 24 hours: ${colors.bright}${formatNumber(recent24h || 0)}${colors.reset} startups`);
  console.log(`  Last 7 days: ${colors.bright}${formatNumber(recent7d || 0)}${colors.reset} startups`);
  
  // Recent discoveries list
  const { data: recent } = await supabase
    .from('discovered_startups')
    .select('name, created_at, imported_to_startups')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (recent && recent.length > 0) {
    console.log(`\n${colors.cyan}Most Recent Discoveries:${colors.reset}`);
    recent.forEach((s, i) => {
      const status = s.imported_to_startups ? '✅' : '⏳';
      const date = formatDate(s.created_at);
      console.log(`  ${i + 1}. ${status} ${s.name} (${date})`);
    });
  }
}

async function checkApprovedStartups() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}🚀 APPROVED STARTUPS (startup_uploads)${colors.reset}`);
  console.log('═'.repeat(70));
  
  // Total approved
  const { count: totalApproved } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  // Recent (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent24h } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('created_at', oneDayAgo);
  
  // Last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recent7d } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('created_at', sevenDaysAgo);
  
  console.log(`\n${colors.cyan}Total Approved:${colors.reset} ${colors.bright}${formatNumber(totalApproved || 0)}${colors.reset}`);
  console.log(`\n${colors.cyan}Recent Activity:${colors.reset}`);
  console.log(`  Last 24 hours: ${colors.bright}${formatNumber(recent24h || 0)}${colors.reset} startups`);
  console.log(`  Last 7 days: ${colors.bright}${formatNumber(recent7d || 0)}${colors.reset} startups`);
}

async function checkGodScoreDistribution() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}⚡ GOD SCORE DISTRIBUTION${colors.reset}`);
  console.log('═'.repeat(70));
  
  // Get all approved startups with GOD scores
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('total_god_score, created_at')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);
  
  if (error || !startups || startups.length === 0) {
    console.log(`\n${colors.yellow}⚠️  No startups with GOD scores found${colors.reset}`);
    return;
  }
  
  const scores = startups.map(s => s.total_god_score || 0);
  const total = scores.length;
  const avg = scores.reduce((a, b) => a + b, 0) / total;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const median = scores.sort((a, b) => a - b)[Math.floor(total / 2)];
  
  // Distribution buckets
  const buckets = {
    elite: scores.filter(s => s >= 85).length,
    high: scores.filter(s => s >= 70 && s < 85).length,
    medium: scores.filter(s => s >= 50 && s < 70).length,
    low: scores.filter(s => s < 50).length,
  };
  
  console.log(`\n${colors.cyan}Statistics:${colors.reset}`);
  console.log(`  Total scored: ${colors.bright}${formatNumber(total)}${colors.reset}`);
  console.log(`  Average: ${colors.bright}${avg.toFixed(1)}${colors.reset}/100`);
  console.log(`  Median: ${colors.bright}${median}${colors.reset}/100`);
  console.log(`  Range: ${colors.bright}${min}${colors.reset} - ${colors.bright}${max}${colors.reset}`);
  
  console.log(`\n${colors.cyan}Distribution:${colors.reset}`);
  console.log(`  🏆 Elite (85+): ${colors.bright}${buckets.elite}${colors.reset} (${((buckets.elite/total)*100).toFixed(1)}%)`);
  console.log(`  🔥 High (70-84): ${colors.bright}${buckets.high}${colors.reset} (${((buckets.high/total)*100).toFixed(1)}%)`);
  console.log(`  ⚡ Medium (50-69): ${colors.bright}${buckets.medium}${colors.reset} (${((buckets.medium/total)*100).toFixed(1)}%)`);
  console.log(`  📊 Low (<50): ${colors.bright}${buckets.low}${colors.reset} (${((buckets.low/total)*100).toFixed(1)}%)`);
}

async function checkGodScoreTrends() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}📈 GOD SCORE TRENDS${colors.reset}`);
  console.log('═'.repeat(70));
  
  // Get startups grouped by creation date
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('total_god_score, created_at')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000);
  
  if (error || !startups || startups.length === 0) {
    console.log(`\n${colors.yellow}⚠️  No data for trend analysis${colors.reset}`);
    return;
  }
  
  // Group by day
  const dailyStats = {};
  startups.forEach(s => {
    const date = new Date(s.created_at).toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { scores: [], count: 0 };
    }
    dailyStats[date].scores.push(s.total_god_score);
    dailyStats[date].count++;
  });
  
  // Calculate averages for last 7 days
  const dates = Object.keys(dailyStats).sort().reverse().slice(0, 7);
  
  if (dates.length === 0) {
    console.log(`\n${colors.yellow}⚠️  No recent data for trend analysis${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.cyan}Last 7 Days Average GOD Scores:${colors.reset}`);
  dates.forEach(date => {
    const stats = dailyStats[date];
    const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    const count = stats.count;
    const emoji = avg >= 80 ? '🏆' : avg >= 70 ? '🔥' : avg >= 60 ? '⚡' : '📊';
    console.log(`  ${emoji} ${date}: ${colors.bright}${avg.toFixed(1)}${colors.reset}/100 (${count} startups)`);
  });
  
  // Overall trend
  const recentAvg = dates.slice(0, 3).reduce((sum, date) => {
    const stats = dailyStats[date];
    const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    return sum + avg;
  }, 0) / Math.min(3, dates.length);
  
  const olderAvg = dates.slice(3, 6).length > 0 ? dates.slice(3, 6).reduce((sum, date) => {
    const stats = dailyStats[date];
    const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    return sum + avg;
  }, 0) / dates.slice(3, 6).length : recentAvg;
  
  const trend = recentAvg - olderAvg;
  const trendEmoji = trend > 2 ? '📈' : trend < -2 ? '📉' : '➡️';
  const trendColor = trend > 2 ? colors.green : trend < -2 ? colors.yellow : colors.reset;
  
  console.log(`\n${colors.cyan}Trend:${colors.reset} ${trendEmoji} ${trendColor}${trend > 0 ? '+' : ''}${trend.toFixed(1)}${colors.reset} points (recent vs older)`);
}

async function checkMatches() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}🎯 MATCH GENERATION STATS${colors.reset}`);
  console.log('═'.repeat(70));
  
  // Total matches
  const { count: totalMatches } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  // Recent matches (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent24h } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);
  
  // Match quality distribution
  const { data: matches } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(10000);
  
  if (matches && matches.length > 0) {
    const scores = matches.map(m => m.match_score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highQuality = scores.filter(s => s >= 70).length;
    const mediumQuality = scores.filter(s => s >= 50 && s < 70).length;
    const lowQuality = scores.filter(s => s < 50).length;
    
    console.log(`\n${colors.cyan}Total Matches:${colors.reset} ${colors.bright}${formatNumber(totalMatches || 0)}${colors.reset}`);
    console.log(`  Last 24 hours: ${colors.bright}${formatNumber(recent24h || 0)}${colors.reset} matches`);
    console.log(`\n${colors.cyan}Match Quality:${colors.reset}`);
    console.log(`  Average score: ${colors.bright}${avgScore.toFixed(1)}${colors.reset}/100`);
    console.log(`  🔥 High (70+): ${colors.bright}${highQuality}${colors.reset} (${((highQuality/matches.length)*100).toFixed(1)}%)`);
    console.log(`  ⚡ Medium (50-69): ${colors.bright}${mediumQuality}${colors.reset} (${((mediumQuality/matches.length)*100).toFixed(1)}%)`);
    console.log(`  📊 Low (<50): ${colors.bright}${lowQuality}${colors.reset} (${((lowQuality/matches.length)*100).toFixed(1)}%)`);
  } else {
    console.log(`\n${colors.yellow}⚠️  No matches found${colors.reset}`);
  }
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}${colors.magenta}🔥 HOT MATCH - STARTUP STATS & GOD SCORE ANALYSIS${colors.reset}`);
  console.log('═'.repeat(70));
  console.log(`⏰ ${new Date().toLocaleString()}\n`);
  
  try {
    await checkDiscoveredStartups();
    await checkApprovedStartups();
    await checkGodScoreDistribution();
    await checkGodScoreTrends();
    await checkMatches();
    
    console.log('\n' + '═'.repeat(70));
    console.log(`${colors.green}✅ Analysis Complete${colors.reset}`);
    console.log('═'.repeat(70) + '\n');
    
  } catch (error) {
    console.error(`\n${colors.yellow}❌ Error:${colors.reset}`, error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

