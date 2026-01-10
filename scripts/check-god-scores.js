#!/usr/bin/env node
/**
 * CHECK GOD SCORES
 * ================
 * Quick script to view GOD score distribution and statistics
 * 
 * Usage: node scripts/check-god-scores.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkGodScores() {
  console.log('\n' + '🔥'.repeat(40));
  console.log('   GOD SCORE ANALYSIS');
  console.log('🔥'.repeat(40) + '\n');

  // 1. Overall Statistics
  const { count: totalApproved } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const { count: totalScored } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);

  const { count: totalUnscored } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .is('total_god_score', null);

  console.log('📊 OVERALL STATISTICS');
  console.log('─'.repeat(60));
  console.log(`   Total Approved Startups: ${totalApproved || 0}`);
  console.log(`   Scored: ${totalScored || 0}`);
  console.log(`   Unscored: ${totalUnscored || 0}`);
  const coverage = totalApproved > 0 ? ((totalScored / totalApproved) * 100).toFixed(1) : 0;
  console.log(`   Coverage: ${coverage}%`);
  console.log();

  // 2. Score Distribution
  const { data: scoredStartups } = await supabase
    .from('startup_uploads')
    .select('total_god_score, team_score, traction_score, market_score, product_score, vision_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);

  if (!scoredStartups || scoredStartups.length === 0) {
    console.log('⚠️  No scored startups found. Run the scoring script:');
    console.log('   node scripts/core/god-score-formula.js\n');
    return;
  }

  const scores = scoredStartups.map(s => s.total_god_score || 0);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Distribution buckets
  const excellent = scores.filter(s => s >= 80).length;
  const good = scores.filter(s => s >= 60 && s < 80).length;
  const average = scores.filter(s => s >= 40 && s < 60).length;
  const belowAverage = scores.filter(s => s < 40).length;

  console.log('📈 SCORE DISTRIBUTION');
  console.log('─'.repeat(60));
  console.log(`   Average: ${avg.toFixed(1)}`);
  console.log(`   Median: ${median}`);
  console.log(`   Range: ${min} - ${max}`);
  console.log();
  console.log('   Distribution:');
  console.log(`   🏆 Excellent (80-100): ${excellent} (${((excellent / scores.length) * 100).toFixed(1)}%)`);
  console.log(`   ✅ Good (60-79):      ${good} (${((good / scores.length) * 100).toFixed(1)}%)`);
  console.log(`   📊 Average (40-59):   ${average} (${((average / scores.length) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  Below Avg (<40):  ${belowAverage} (${((belowAverage / scores.length) * 100).toFixed(1)}%)`);
  console.log();

  // 3. Component Score Averages
  const teamScores = scoredStartups.map(s => s.team_score || 0).filter(s => s > 0);
  const tractionScores = scoredStartups.map(s => s.traction_score || 0).filter(s => s > 0);
  const marketScores = scoredStartups.map(s => s.market_score || 0).filter(s => s > 0);
  const productScores = scoredStartups.map(s => s.product_score || 0).filter(s => s > 0);
  const visionScores = scoredStartups.map(s => s.vision_score || 0).filter(s => s > 0);

  const avgTeam = teamScores.length > 0 ? teamScores.reduce((a, b) => a + b, 0) / teamScores.length : 0;
  const avgTraction = tractionScores.length > 0 ? tractionScores.reduce((a, b) => a + b, 0) / tractionScores.length : 0;
  const avgMarket = marketScores.length > 0 ? marketScores.reduce((a, b) => a + b, 0) / marketScores.length : 0;
  const avgProduct = productScores.length > 0 ? productScores.reduce((a, b) => a + b, 0) / productScores.length : 0;
  const avgVision = visionScores.length > 0 ? visionScores.reduce((a, b) => a + b, 0) / visionScores.length : 0;

  console.log('🧩 COMPONENT SCORE AVERAGES');
  console.log('─'.repeat(60));
  console.log(`   👥 Team:     ${avgTeam.toFixed(1)} (${teamScores.length} startups)`);
  console.log(`   📈 Traction: ${avgTraction.toFixed(1)} (${tractionScores.length} startups)`);
  console.log(`   🎯 Market:   ${avgMarket.toFixed(1)} (${marketScores.length} startups)`);
  console.log(`   ⚙️  Product:  ${avgProduct.toFixed(1)} (${productScores.length} startups)`);
  console.log(`   🔮 Vision:   ${avgVision.toFixed(1)} (${visionScores.length} startups)`);
  console.log();

  // 4. Top 10 Scored Startups
  const { data: topStartups } = await supabase
    .from('startup_uploads')
    .select('name, tagline, total_god_score, team_score, traction_score, market_score, product_score, vision_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .order('total_god_score', { ascending: false })
    .limit(10);

  if (topStartups && topStartups.length > 0) {
    console.log('🏆 TOP 10 SCORED STARTUPS');
    console.log('─'.repeat(60));
    topStartups.forEach((s, idx) => {
      console.log(`\n   ${idx + 1}. ${s.name}`);
      if (s.tagline) console.log(`      ${s.tagline}`);
      console.log(`      Total: ${s.total_god_score} | T:${s.team_score || 'N/A'} Tr:${s.traction_score || 'N/A'} M:${s.market_score || 'N/A'} P:${s.product_score || 'N/A'} V:${s.vision_score || 'N/A'}`);
    });
    console.log();
  }

  // 5. Recent Activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { count: recentScored } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .gte('updated_at', sevenDaysAgo);

  const { count: recentUnscored } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .is('total_god_score', null)
    .gte('created_at', sevenDaysAgo);

  console.log('📅 RECENT ACTIVITY (Last 7 Days)');
  console.log('─'.repeat(60));
  console.log(`   Newly Scored: ${recentScored || 0}`);
  console.log(`   Newly Added (Unscored): ${recentUnscored || 0}`);
  console.log();

  // 6. Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('─'.repeat(60));
  
  if (coverage < 50) {
    console.log('   ⚠️  Low coverage - Scoring pipeline may not be running');
    console.log('      Run: node scripts/core/god-score-formula.js');
  }
  
  if (avg < 30) {
    console.log('   ⚠️  Average score is very low - Check data quality or scoring algorithm');
  }
  
  if (avg > 80) {
    console.log('   ⚠️  Average score is very high - Algorithm may not be differentiating properly');
  }
  
  if (excellent === scores.length) {
    console.log('   ⚠️  All scores are excellent - Algorithm may need calibration');
  }
  
  if (belowAverage === scores.length) {
    console.log('   ⚠️  All scores are low - Check data quality');
  }

  if (coverage >= 50 && avg >= 30 && avg <= 80 && excellent < scores.length * 0.5) {
    console.log('   ✅ Scores look healthy!');
  }
  
  console.log();
}

checkGodScores().catch(console.error);

