#!/usr/bin/env node
/**
 * CHECK GOD SCORES
 * ================
 * Diagnose GOD score distribution and find anomalies
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkGodScores() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 GOD SCORES DIAGNOSTIC');
  console.log('='.repeat(80));
  
  // Get all startups with GOD scores
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, vision_score, market_score, traction_score, team_score, product_score, status')
    .not('total_god_score', 'is', null)
    .order('total_god_score', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  const total = startups?.length || 0;
  const approved = startups?.filter(s => s.status === 'approved').length || 0;
  
  if (total === 0) {
    console.log('\n⚠️  No startups have GOD scores yet!');
    console.log('   Run: node scripts/core/god-score-v5-tiered.js');
    return;
  }
  
  // Calculate statistics
  const scores = startups?.map(s => s.total_god_score).filter(s => s !== null) || [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];
  
  // Count by score ranges
  const ranges = {
    '0-20': 0,
    '21-40': 0,
    '41-60': 0,
    '61-80': 0,
    '81-100': 0
  };
  
  scores.forEach(score => {
    if (score <= 20) ranges['0-20']++;
    else if (score <= 40) ranges['21-40']++;
    else if (score <= 60) ranges['41-60']++;
    else if (score <= 80) ranges['61-80']++;
    else ranges['81-100']++;
  });
  
  // Find anomalies
  const allSame = new Set(scores).size === 1;
  const tooManySame = scores.filter(s => s === scores[0]).length > total * 0.5;
  const allZero = scores.every(s => s === 0);
  const allHigh = scores.every(s => s >= 80);
  const allLow = scores.every(s => s <= 30);
  
  console.log(`\n📈 STATISTICS:`);
  console.log(`   Total scored: ${total}`);
  console.log(`   Approved: ${approved}`);
  console.log(`   Min score: ${min}`);
  console.log(`   Max score: ${max}`);
  console.log(`   Average: ${avg.toFixed(2)}`);
  console.log(`   Median: ${median}`);
  
  console.log(`\n📊 DISTRIBUTION:`);
  for (const [range, count] of Object.entries(ranges)) {
    const pct = ((count / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / total * 50));
    console.log(`   ${range.padEnd(8)}: ${count.toString().padStart(4)} (${pct}%) ${bar}`);
  }
  
  // Check for anomalies
  console.log(`\n🔍 ANOMALY DETECTION:`);
  if (allSame) {
    console.log(`   ⚠️  ALL SCORES ARE THE SAME: ${scores[0]}`);
    console.log(`      This suggests the scoring algorithm isn't differentiating startups.`);
  } else if (tooManySame) {
    console.log(`   ⚠️  ${scores.filter(s => s === scores[0]).length} startups have the same score (${scores[0]})`);
    console.log(`      This is ${((scores.filter(s => s === scores[0]).length / total) * 100).toFixed(1)}% of all startups.`);
  }
  
  if (allZero) {
    console.log(`   ❌ ALL SCORES ARE ZERO - Scoring algorithm may be broken`);
  } else if (allHigh) {
    console.log(`   ⚠️  ALL SCORES ARE HIGH (>=80) - May be too lenient`);
  } else if (allLow) {
    console.log(`   ⚠️  ALL SCORES ARE LOW (<=30) - May be too strict`);
  }
  
  // Check component scores
  const withComponents = startups?.filter(s => 
    s.vision_score !== null || 
    s.market_score !== null || 
    s.traction_score !== null || 
    s.team_score !== null
  ) || [];
  
  if (withComponents.length > 0) {
    console.log(`\n📋 COMPONENT SCORES:`);
    console.log(`   Startups with component scores: ${withComponents.length}`);
    
    const visionScores = withComponents.map(s => s.vision_score).filter(s => s !== null);
    const marketScores = withComponents.map(s => s.market_score).filter(s => s !== null);
    const tractionScores = withComponents.map(s => s.traction_score).filter(s => s !== null);
    const teamScores = withComponents.map(s => s.team_score).filter(s => s !== null);
    
    if (visionScores.length > 0) {
      const avg = visionScores.reduce((a, b) => a + b, 0) / visionScores.length;
      console.log(`   Vision: avg ${avg.toFixed(1)} (${visionScores.length} startups)`);
    }
    if (marketScores.length > 0) {
      const avg = marketScores.reduce((a, b) => a + b, 0) / marketScores.length;
      console.log(`   Market: avg ${avg.toFixed(1)} (${marketScores.length} startups)`);
    }
    if (tractionScores.length > 0) {
      const avg = tractionScores.reduce((a, b) => a + b, 0) / tractionScores.length;
      console.log(`   Traction: avg ${avg.toFixed(1)} (${tractionScores.length} startups)`);
    }
    if (teamScores.length > 0) {
      const avg = teamScores.reduce((a, b) => a + b, 0) / teamScores.length;
      console.log(`   Team: avg ${avg.toFixed(1)} (${teamScores.length} startups)`);
    }
  }
  
  // Show top and bottom scores
  console.log(`\n🏆 TOP 10 SCORES:`);
  startups?.slice(0, 10).forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.name.substring(0, 40).padEnd(40)} ${s.total_god_score}`);
  });
  
  console.log(`\n📉 BOTTOM 10 SCORES:`);
  startups?.slice(-10).reverse().forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.name.substring(0, 40).padEnd(40)} ${s.total_god_score}`);
  });
  
  // Check for specific issues
  const suspicious = startups?.filter(s => {
    // Same score as many others
    const sameScoreCount = startups.filter(ss => ss.total_god_score === s.total_god_score).length;
    return sameScoreCount > 10;
  }) || [];
  
  if (suspicious.length > 0) {
    const suspiciousScores = [...new Set(suspicious.map(s => s.total_god_score))];
    console.log(`\n⚠️  SUSPICIOUS SCORES (appearing >10 times):`);
    suspiciousScores.forEach(score => {
      const count = startups.filter(s => s.total_god_score === score).length;
      console.log(`   Score ${score}: ${count} startups`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 To recalculate scores:');
  console.log('   node scripts/core/god-score-v5-tiered.js');
  console.log('');
}

checkGodScores().catch(console.error);

