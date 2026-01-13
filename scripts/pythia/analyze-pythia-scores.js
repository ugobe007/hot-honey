#!/usr/bin/env node
/**
 * Analyze Pythia Scoring Results
 * Shows distribution, confidence, source mix, and impact on GOD scores
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzePythiaScores() {
  console.log('\n🔮 PYTHIA SCORING ANALYSIS');
  console.log('═'.repeat(70));
  
  try {
    // 1. Overall Statistics
    console.log('\n[1] OVERALL STATISTICS');
    console.log('─'.repeat(70));
    
    const { count: totalApproved } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    
    const { count: withPythia } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .not('pythia_score', 'is', null);
    
    const { count: withSnippets } = await supabase
      .from('pythia_speech_snippets')
      .select('entity_id', { count: 'exact', head: true });
    
    const { data: uniqueEntities } = await supabase
      .from('pythia_speech_snippets')
      .select('entity_id')
      .limit(10000);
    
    const uniqueEntityIds = new Set((uniqueEntities || []).map(e => e.entity_id));
    const uniqueWithSnippets = uniqueEntityIds.size;
    
    console.log(`✅ Total approved startups: ${totalApproved || 0}`);
    console.log(`   🔮 With Pythia scores: ${withPythia || 0} (${totalApproved > 0 ? ((withPythia / totalApproved) * 100).toFixed(1) : 0}%)`);
    console.log(`   📝 With snippets collected: ${uniqueWithSnippets}`);
    console.log(`   📊 Total snippets: ${withSnippets || 0}`);
    
    if (withPythia === 0) {
      console.log('\n⚠️  No Pythia scores found. Run: npm run pythia:score');
      return;
    }
    
    // 2. Pythia Score Distribution
    console.log('\n[2] PYTHIA SCORE DISTRIBUTION');
    console.log('─'.repeat(70));
    
    const { data: pythiaScores } = await supabase
      .from('startup_uploads')
      .select('pythia_score')
      .eq('status', 'approved')
      .not('pythia_score', 'is', null);
    
    const scores = (pythiaScores || []).map(s => s.pythia_score || 0);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    
    console.log(`\n📈 Score Statistics:`);
    console.log(`   Average: ${avg.toFixed(1)}`);
    console.log(`   Median: ${median}`);
    console.log(`   Range: ${min} - ${max}`);
    console.log(`   25th percentile: ${p25}`);
    console.log(`   75th percentile: ${p75}`);
    
    // Distribution buckets
    const buckets = [
      { label: 'Elite (80-100)', min: 80, max: 100 },
      { label: 'Excellent (70-79)', min: 70, max: 79 },
      { label: 'Good (60-69)', min: 60, max: 69 },
      { label: 'Average (50-59)', min: 50, max: 59 },
      { label: 'Below Avg (40-49)', min: 40, max: 49 },
      { label: 'Low (<40)', min: 0, max: 39 }
    ];
    
    console.log(`\n📊 Distribution by Category:`);
    console.log('   Category'.padEnd(25) + 'Count'.padEnd(10) + 'Percentage');
    console.log('   ' + '─'.repeat(50));
    
    buckets.forEach(bucket => {
      const count = scores.filter(s => s >= bucket.min && s <= bucket.max).length;
      const pct = (count / scores.length * 100).toFixed(1);
      console.log(`   ${bucket.label.padEnd(25)}${count.toString().padStart(5)}     ${pct}%`);
    });
    
    // 3. Confidence Scores
    console.log('\n[3] CONFIDENCE SCORES');
    console.log('─'.repeat(70));
    
    // Get latest scores from pythia_scores table
    const { data: latestScores } = await supabase
      .from('pythia_scores')
      .select('confidence, pythia_score, entity_id')
      .order('computed_at', { ascending: false });
    
    // Get unique latest scores per entity
    const latestByEntity = new Map();
    (latestScores || []).forEach(score => {
      if (!latestByEntity.has(score.entity_id)) {
        latestByEntity.set(score.entity_id, score);
      }
    });
    
    const confidences = Array.from(latestByEntity.values()).map(s => s.confidence || 0.1);
    
    if (confidences.length > 0) {
      const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      const minConf = Math.min(...confidences);
      const maxConf = Math.max(...confidences);
      const sortedConf = [...confidences].sort((a, b) => a - b);
      const medianConf = sortedConf[Math.floor(sortedConf.length / 2)];
      
      console.log(`\n📈 Confidence Statistics:`);
      console.log(`   Average: ${avgConf.toFixed(2)}`);
      console.log(`   Median: ${medianConf.toFixed(2)}`);
      console.log(`   Range: ${minConf.toFixed(2)} - ${maxConf.toFixed(2)}`);
      
      const confBuckets = [
        { label: 'High (0.70+)', min: 0.70, max: 0.95 },
        { label: 'Medium (0.50-0.69)', min: 0.50, max: 0.69 },
        { label: 'Low (0.30-0.49)', min: 0.30, max: 0.49 },
        { label: 'Very Low (<0.30)', min: 0.10, max: 0.29 }
      ];
      
      console.log(`\n📊 Confidence Distribution:`);
      console.log('   Category'.padEnd(25) + 'Count'.padEnd(10) + 'Percentage');
      console.log('   ' + '─'.repeat(50));
      
      confBuckets.forEach(bucket => {
        const count = confidences.filter(c => c >= bucket.min && c <= bucket.max).length;
        const pct = (count / confidences.length * 100).toFixed(1);
        console.log(`   ${bucket.label.padEnd(25)}${count.toString().padStart(5)}     ${pct}%`);
      });
    }
    
    // 4. Source Mix (Tier Distribution)
    console.log('\n[4] SOURCE MIX (TIER DISTRIBUTION)');
    console.log('─'.repeat(70));
    
    const { data: tierData } = await supabase
      .from('pythia_scores')
      .select('tier1_pct, tier2_pct, tier3_pct, entity_id, computed_at')
      .order('computed_at', { ascending: false });
    
    // Get latest tier data per entity
    const latestTierByEntity = new Map();
    (tierData || []).forEach(score => {
      if (!latestTierByEntity.has(score.entity_id)) {
        latestTierByEntity.set(score.entity_id, score);
      }
    });
    
    const tierDataArray = Array.from(latestTierByEntity.values());
    const avgTier1 = tierDataArray.length > 0 
      ? tierDataArray.reduce((sum, s) => sum + (s.tier1_pct || 0), 0) / tierDataArray.length 
      : 0;
    const avgTier2 = tierDataArray.length > 0 
      ? tierDataArray.reduce((sum, s) => sum + (s.tier2_pct || 0), 0) / tierDataArray.length 
      : 0;
    const avgTier3 = tierDataArray.length > 0 
      ? tierDataArray.reduce((sum, s) => sum + (s.tier3_pct || 0), 0) / tierDataArray.length 
      : 0;
    
    console.log(`\n📈 Average Source Mix:`);
    console.log(`   Tier 1 (Earned/Hard-to-fake): ${avgTier1.toFixed(1)}%`);
    console.log(`   Tier 2 (Semi-earned): ${avgTier2.toFixed(1)}%`);
    console.log(`   Tier 3 (PR/Marketed): ${avgTier3.toFixed(1)}%`);
    
    // Count entities by dominant tier
    const tier1Dominant = tierDataArray.filter(s => (s.tier1_pct || 0) >= 50).length;
    const tier2Dominant = tierDataArray.filter(s => (s.tier2_pct || 0) >= 50 && (s.tier1_pct || 0) < 50).length;
    const tier3Dominant = tierDataArray.filter(s => (s.tier3_pct || 0) >= 50 && (s.tier1_pct || 0) < 50 && (s.tier2_pct || 0) < 50).length;
    
    console.log(`\n📊 Dominant Tier Distribution:`);
    console.log(`   Tier 1 dominant (≥50%): ${tier1Dominant} (${(tier1Dominant / tierDataArray.length * 100).toFixed(1)}%)`);
    console.log(`   Tier 2 dominant (≥50%): ${tier2Dominant} (${(tier2Dominant / tierDataArray.length * 100).toFixed(1)}%)`);
    console.log(`   Tier 3 dominant (≥50%): ${tier3Dominant} (${(tier3Dominant / tierDataArray.length * 100).toFixed(1)}%)`);
    
    // 5. Component Scores (Constraint, Mechanism, Reality Contact)
    console.log('\n[5] COMPONENT SCORES');
    console.log('─'.repeat(70));
    
    const { data: componentData } = await supabase
      .from('pythia_scores')
      .select('constraint_score, mechanism_score, reality_contact_score, entity_id, computed_at')
      .order('computed_at', { ascending: false });
    
    const latestComponentByEntity = new Map();
    (componentData || []).forEach(score => {
      if (!latestComponentByEntity.has(score.entity_id)) {
        latestComponentByEntity.set(score.entity_id, score);
      }
    });
    
    const componentArray = Array.from(latestComponentByEntity.values());
    
    const constraintScores = componentArray.map(s => s.constraint_score || 0);
    const mechanismScores = componentArray.map(s => s.mechanism_score || 0);
    const realityScores = componentArray.map(s => s.reality_contact_score || 0);
    
    const avgConstraint = constraintScores.reduce((a, b) => a + b, 0) / constraintScores.length;
    const avgMechanism = mechanismScores.reduce((a, b) => a + b, 0) / mechanismScores.length;
    const avgReality = realityScores.reduce((a, b) => a + b, 0) / realityScores.length;
    
    console.log(`\n📈 Average Component Scores (0-10 scale):`);
    console.log(`   Constraint Language: ${avgConstraint.toFixed(2)}`);
    console.log(`   Mechanism Density: ${avgMechanism.toFixed(2)}`);
    console.log(`   Reality Contact: ${avgReality.toFixed(2)}`);
    
    // 6. Impact on GOD Scores
    console.log('\n[6] IMPACT ON GOD SCORES');
    console.log('─'.repeat(70));
    
    const { data: godComparison } = await supabase
      .from('startup_uploads')
      .select('total_god_score, pythia_score')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null);
    
    const withPythiaGod = (godComparison || []).filter(s => s.pythia_score != null);
    const withoutPythiaGod = (godComparison || []).filter(s => s.pythia_score == null);
    
    const avgGodWith = withPythiaGod.length > 0 
      ? withPythiaGod.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / withPythiaGod.length 
      : 0;
    const avgGodWithout = withoutPythiaGod.length > 0 
      ? withoutPythiaGod.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / withoutPythiaGod.length 
      : 0;
    
    console.log(`\n📈 GOD Score Comparison:`);
    console.log(`   With Pythia score: ${avgGodWith.toFixed(2)} (${withPythiaGod.length} startups)`);
    console.log(`   Without Pythia score: ${avgGodWithout.toFixed(2)} (${withoutPythiaGod.length} startups)`);
    console.log(`   Difference: ${(avgGodWith - avgGodWithout).toFixed(2)} points ${avgGodWith > avgGodWithout ? '↑' : '↓'}`);
    
    // Calculate expected Pythia contribution (10% weight)
    const avgPythiaContribution = withPythiaGod.length > 0
      ? withPythiaGod.reduce((sum, s) => sum + Math.round((s.pythia_score / 100) * 10), 0) / withPythiaGod.length
      : 0;
    
    console.log(`\n💡 Expected Pythia Contribution (10% weight):`);
    console.log(`   Average contribution: ${avgPythiaContribution.toFixed(2)} points`);
    
    // 7. Top Performers
    console.log('\n[7] TOP PERFORMERS');
    console.log('─'.repeat(70));
    
    const { data: topStartups } = await supabase
      .from('startup_uploads')
      .select('id, name, pythia_score, total_god_score')
      .eq('status', 'approved')
      .not('pythia_score', 'is', null)
      .order('pythia_score', { ascending: false })
      .limit(10);
    
    console.log(`\n🏆 TOP 10 STARTUPS BY PYTHIA SCORE:`);
    console.log('   Rank'.padEnd(6) + 'Name'.padEnd(35) + 'Pythia'.padEnd(10) + 'GOD Score');
    console.log('   ' + '─'.repeat(65));
    
    (topStartups || []).forEach((s, i) => {
      const name = s.name.length > 33 ? s.name.substring(0, 30) + '...' : s.name;
      console.log(`   ${(i + 1).toString().padStart(2)}. ${name.padEnd(35)}${s.pythia_score.toString().padStart(3)}/100   ${s.total_god_score || 'N/A'}`);
    });
    
    // 8. Snippet Statistics
    console.log('\n[8] SNIPPET COLLECTION STATISTICS');
    console.log('─'.repeat(70));
    
    const { data: snippetStats } = await supabase
      .from('pythia_speech_snippets')
      .select('source_type, tier');
    
    const totalSnippets = (snippetStats || []).length;
    const bySourceType = {};
    const byTier = { 1: 0, 2: 0, 3: 0 };
    
    (snippetStats || []).forEach(s => {
      bySourceType[s.source_type] = (bySourceType[s.source_type] || 0) + 1;
      byTier[s.tier] = (byTier[s.tier] || 0) + 1;
    });
    
    console.log(`\n📊 Total Snippets: ${totalSnippets}`);
    console.log(`\n📈 By Source Type:`);
    Object.entries(bySourceType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const pct = (count / totalSnippets * 100).toFixed(1);
        console.log(`   ${type.padEnd(25)}${count.toString().padStart(5)} (${pct}%)`);
      });
    
    console.log(`\n📈 By Tier:`);
    console.log(`   Tier 1 (Earned): ${byTier[1]} (${(byTier[1] / totalSnippets * 100).toFixed(1)}%)`);
    console.log(`   Tier 2 (Semi-earned): ${byTier[2]} (${(byTier[2] / totalSnippets * 100).toFixed(1)}%)`);
    console.log(`   Tier 3 (PR/Marketed): ${byTier[3]} (${(byTier[3] / totalSnippets * 100).toFixed(1)}%)`);
    
    // 9. Summary
    console.log('\n[9] SUMMARY');
    console.log('─'.repeat(70));
    
    console.log(`\n✅ Key Findings:`);
    console.log(`   • ${withPythia} startups have Pythia scores (${((withPythia / totalApproved) * 100).toFixed(1)}% coverage)`);
    console.log(`   • Average Pythia score: ${avg.toFixed(1)}/100`);
    console.log(`   • Average confidence: ${confidences.length > 0 ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2) : 'N/A'}`);
    console.log(`   • Source mix: ${avgTier1.toFixed(0)}% Tier 1, ${avgTier2.toFixed(0)}% Tier 2, ${avgTier3.toFixed(0)}% Tier 3`);
    console.log(`   • Pythia adds an average of ${avgPythiaContribution.toFixed(2)} points to GOD scores (10% weight)`);
    console.log(`   • Total snippets collected: ${totalSnippets}`);
    
    if (avgTier3 > 70) {
      console.log(`\n💡 Recommendation:`);
      console.log(`   Current data is mostly Tier 3 (marketed/PR). Collect more Tier 1 & 2 sources for better scores.`);
      console.log(`   Consider: podcast transcripts, forum posts, support threads, postmortems, investor letters.`);
    }
    
    console.log('\n' + '═'.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Error analyzing Pythia scores:', error.message);
    console.error(error);
    process.exit(1);
  }
}

analyzePythiaScores();
