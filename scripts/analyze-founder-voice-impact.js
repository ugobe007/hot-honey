#!/usr/bin/env node
/**
 * Analyze Impact of Founder Voice Scores on GOD Scores
 * Shows how founder_voice_score affects total_god_score distribution
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeImpact() {
  console.log('\n📊 FOUNDER VOICE IMPACT ANALYSIS');
  console.log('═'.repeat(70));
  
  try {
    // 1. Overall statistics
    console.log('\n[1] OVERALL STATISTICS');
    console.log('─'.repeat(70));
    
    const { data: allStats, error: statsError } = await supabase
      .from('startup_uploads')
      .select('total_god_score, founder_voice_score, team_score, traction_score, market_score, product_score, vision_score')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null);
    
    if (statsError) throw statsError;
    
    const withVoice = (allStats || []).filter(s => s.founder_voice_score != null);
    const withoutVoice = (allStats || []).filter(s => s.founder_voice_score == null);
    
    console.log(`✅ Total startups with GOD scores: ${allStats.length}`);
    console.log(`   📊 With founder_voice_score: ${withVoice.length} (${(withVoice.length / allStats.length * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Without founder_voice_score: ${withoutVoice.length} (${(withoutVoice.length / allStats.length * 100).toFixed(1)}%)`);
    
    // 2. GOD Score distribution comparison
    console.log('\n[2] GOD SCORE DISTRIBUTION COMPARISON');
    console.log('─'.repeat(70));
    
    const godScoresWith = withVoice.map(s => s.total_god_score);
    const godScoresWithout = withoutVoice.map(s => s.total_god_score);
    
    const avgWith = godScoresWith.length > 0 ? godScoresWith.reduce((a, b) => a + b, 0) / godScoresWith.length : 0;
    const avgWithout = godScoresWithout.length > 0 ? godScoresWithout.reduce((a, b) => a + b, 0) / godScoresWithout.length : 0;
    const avgAll = allStats.map(s => s.total_god_score).reduce((a, b) => a + b, 0) / allStats.length;
    
    console.log(`\n📈 Average GOD Scores:`);
    console.log(`   With founder voice: ${avgWith.toFixed(2)}`);
    console.log(`   Without founder voice: ${avgWithout.toFixed(2)}`);
    console.log(`   Overall average: ${avgAll.toFixed(2)}`);
    console.log(`   Difference: ${(avgWith - avgWithout).toFixed(2)} points ${avgWith > avgWithout ? '↑' : '↓'}`);
    
    // Distribution buckets
    const buckets = [
      { label: 'Elite (90+)', min: 90, max: 100 },
      { label: 'Excellent (80-89)', min: 80, max: 89 },
      { label: 'Good (70-79)', min: 70, max: 79 },
      { label: 'Average (60-69)', min: 60, max: 69 },
      { label: 'Needs Work (<60)', min: 0, max: 59 }
    ];
    
    console.log(`\n📊 Distribution by Category:`);
    console.log('   Category'.padEnd(25) + 'With Voice'.padEnd(15) + 'Without Voice'.padEnd(15) + 'Total');
    console.log('   ' + '─'.repeat(70));
    
    buckets.forEach(bucket => {
      const withCount = godScoresWith.filter(s => s >= bucket.min && s <= bucket.max).length;
      const withoutCount = godScoresWithout.filter(s => s >= bucket.min && s <= bucket.max).length;
      const totalCount = withCount + withoutCount;
      const withPct = withVoice.length > 0 ? (withCount / withVoice.length * 100).toFixed(1) : '0.0';
      const withoutPct = withoutVoice.length > 0 ? (withoutCount / withoutVoice.length * 100).toFixed(1) : '0.0';
      const totalPct = allStats.length > 0 ? (totalCount / allStats.length * 100).toFixed(1) : '0.0';
      
      console.log(`   ${bucket.label.padEnd(25)}${withCount.toString().padStart(4)} (${withPct}%)  ${withoutCount.toString().padStart(4)} (${withoutPct}%)  ${totalCount.toString().padStart(4)} (${totalPct}%)`);
    });
    
    // 3. Founder Voice Score Impact (calculate expected boost)
    console.log('\n[3] FOUNDER VOICE IMPACT ANALYSIS');
    console.log('─'.repeat(70));
    
    const { data: withVoiceData, error: voiceError } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score, founder_voice_score, team_score, traction_score, market_score, product_score, vision_score')
      .eq('status', 'approved')
      .not('founder_voice_score', 'is', null)
      .not('total_god_score', 'is', null);
    
    if (voiceError) throw voiceError;
    
    // Calculate expected base score (without founder voice contribution)
    // Founder voice adds up to 12.5 points (12.5% of 100)
    const impactAnalysis = (withVoiceData || []).map(startup => {
      const voiceContribution = Math.round((startup.founder_voice_score / 100) * 12.5);
      // Estimate base score (total - voice contribution, but cap at tier limits)
      // We can't know the exact base without recalculating, but we can show the contribution
      return {
        ...startup,
        voice_contribution: voiceContribution,
        estimated_base: Math.max(0, startup.total_god_score - voiceContribution)
      };
    });
    
    const avgContribution = impactAnalysis.reduce((sum, s) => sum + s.voice_contribution, 0) / impactAnalysis.length;
    const maxContribution = Math.max(...impactAnalysis.map(s => s.voice_contribution));
    const minContribution = Math.min(...impactAnalysis.map(s => s.voice_contribution));
    
    console.log(`\n💡 Founder Voice Contribution Statistics:`);
    console.log(`   Average contribution: ${avgContribution.toFixed(2)} points`);
    console.log(`   Maximum contribution: ${maxContribution} points (${(maxContribution / 12.5 * 100).toFixed(1)}% of max)`);
    console.log(`   Minimum contribution: ${minContribution} points`);
    
    // Top beneficiaries (highest voice contributions)
    const topBeneficiaries = [...impactAnalysis]
      .sort((a, b) => b.voice_contribution - a.voice_contribution)
      .slice(0, 10);
    
    console.log(`\n🏆 TOP 10 STARTUPS BY FOUNDER VOICE CONTRIBUTION:`);
    console.log('   Rank'.padEnd(6) + 'Name'.padEnd(35) + 'Voice Score'.padEnd(14) + 'Contribution'.padEnd(14) + 'Total GOD');
    console.log('   ' + '─'.repeat(75));
    
    topBeneficiaries.forEach((s, i) => {
      const name = s.name.length > 33 ? s.name.substring(0, 30) + '...' : s.name;
      console.log(`   ${(i + 1).toString().padStart(2)}. ${name.padEnd(35)}${s.founder_voice_score.toString().padStart(3)}/100      +${s.voice_contribution.toString().padStart(2)} pts      ${s.total_god_score}`);
    });
    
    // 4. Correlation analysis
    console.log('\n[4] CORRELATION ANALYSIS');
    console.log('─'.repeat(70));
    
    // Group by founder voice score ranges
    const voiceRanges = [
      { label: 'High (70+)', min: 70, max: 100 },
      { label: 'Good (60-69)', min: 60, max: 69 },
      { label: 'Average (50-59)', min: 50, max: 59 },
      { label: 'Low (<50)', min: 0, max: 49 }
    ];
    
    console.log(`\n📈 Average GOD Score by Founder Voice Range:`);
    console.log('   Voice Range'.padEnd(20) + 'Count'.padEnd(10) + 'Avg GOD Score'.padEnd(15) + 'Avg Contribution');
    console.log('   ' + '─'.repeat(60));
    
    voiceRanges.forEach(range => {
      const inRange = impactAnalysis.filter(s => s.founder_voice_score >= range.min && s.founder_voice_score <= range.max);
      if (inRange.length > 0) {
        const avgGod = inRange.reduce((sum, s) => sum + s.total_god_score, 0) / inRange.length;
        const avgCont = inRange.reduce((sum, s) => sum + s.voice_contribution, 0) / inRange.length;
        console.log(`   ${range.label.padEnd(20)}${inRange.length.toString().padStart(5)}     ${avgGod.toFixed(2).padStart(6)}         +${avgCont.toFixed(2).padStart(5)} pts`);
      }
    });
    
    // 5. Summary
    console.log('\n[5] SUMMARY');
    console.log('─'.repeat(70));
    
    console.log(`\n✅ Key Findings:`);
    console.log(`   • ${withVoice.length} startups have founder voice scores analyzed`);
    console.log(`   • Founder voice adds an average of ${avgContribution.toFixed(2)} points to GOD scores`);
    console.log(`   • Startups with founder voice scores have ${(avgWith - avgWithout).toFixed(2)} point higher average GOD scores`);
    console.log(`   • Maximum boost: ${maxContribution} points (${(maxContribution / 12.5 * 100).toFixed(1)}% of 12.5% weight)`);
    
    if (withVoice.length < allStats.length) {
      console.log(`\n💡 Recommendation:`);
      console.log(`   Run 'npm run oracle:score' to analyze remaining ${withoutVoice.length} startups`);
    }
    
    console.log('\n' + '═'.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Error analyzing impact:', error.message);
    process.exit(1);
  }
}

analyzeImpact();
