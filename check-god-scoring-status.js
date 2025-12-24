#!/usr/bin/env node
/**
 * CHECK GOD SCORING & MATCH ENGINE STATUS
 * 
 * Shows:
 * - Total startups
 * - GOD scoring status
 * - Match engine pipeline status
 * 
 * Run: node check-god-scoring-status.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkGODScoringStatus() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     ⚡ GOD SCORING & MATCH ENGINE STATUS                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Total Startups
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 STARTUP TOTALS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { count: totalUploads, error: uploadsError } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const { count: totalDiscovered, error: discoveredError } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true });

  console.log(`   📤 Approved Uploads: ${totalUploads || 0}`);
  console.log(`   🔍 Discovered Startups: ${totalDiscovered || 0}`);
  console.log(`   📊 TOTAL STARTUPS: ${(totalUploads || 0) + (totalDiscovered || 0)}`);

  // 2. GOD Scoring Status
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('⚡ GOD SCORING STATUS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check startup_uploads with GOD scores
  const { data: scoredStartups, error: scoredError } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, team_score, traction_score, market_score, product_score, vision_score, extracted_data')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .gt('total_god_score', 0);

  const { data: unscoredStartups, error: unscoredError } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score')
    .eq('status', 'approved')
    .or('total_god_score.is.null,total_god_score.eq.0');

  const scoredCount = scoredStartups?.length || 0;
  const unscoredCount = unscoredStartups?.length || 0;
  const totalApproved = (totalUploads || 0);

  console.log(`   ✅ Scored by GOD: ${scoredCount}`);
  console.log(`   ⏳ Pending Scoring: ${unscoredCount}`);
  console.log(`   📊 Scoring Coverage: ${totalApproved > 0 ? Math.round((scoredCount / totalApproved) * 100) : 0}%`);

  // GOD Score Distribution
  if (scoredStartups && scoredStartups.length > 0) {
    const scores = scoredStartups
      .map(s => {
        // Check total_god_score column
        const score = s.total_god_score;
        return typeof score === 'number' && score > 0 ? score : null;
      })
      .filter(s => s !== null);

    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      
      // Score ranges
      const excellent = scores.filter(s => s >= 80).length;
      const good = scores.filter(s => s >= 60 && s < 80).length;
      const average = scores.filter(s => s >= 40 && s < 60).length;
      const below = scores.filter(s => s < 40).length;

      console.log(`\n   📈 GOD Score Distribution:`);
      console.log(`      Average: ${avg.toFixed(1)}`);
      console.log(`      Range: ${min} - ${max}`);
      console.log(`      Excellent (80+): ${excellent} (${Math.round(excellent/scores.length*100)}%)`);
      console.log(`      Good (60-79): ${good} (${Math.round(good/scores.length*100)}%)`);
      console.log(`      Average (40-59): ${average} (${Math.round(average/scores.length*100)}%)`);
      console.log(`      Below Average (<40): ${below} (${Math.round(below/scores.length*100)}%)`);
    }
  }

  // 3. Match Engine Pipeline Status
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 MATCH ENGINE PIPELINE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Total matches
  const { count: totalMatches, error: matchesError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  // Matches by startup (how many startups have matches)
  // Get all unique startup_ids by paginating through all matches
  let allStartupIds = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: matchesPage, error: matchesByStartupError } = await supabase
      .from('startup_investor_matches')
      .select('startup_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (matchesByStartupError || !matchesPage || matchesPage.length === 0) {
      hasMore = false;
      break;
    }
    
    allStartupIds = allStartupIds.concat(matchesPage.map(m => m.startup_id).filter(id => id !== null));
    
    // If we got less than pageSize, we've reached the end
    if (matchesPage.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
    
    // Safety limit to avoid infinite loops
    if (page > 200) {
      console.log('   ⚠️  Reached pagination limit (200k matches), using current count');
      hasMore = false;
    }
  }
  
  const uniqueStartupsWithMatches = new Set(allStartupIds).size;

  console.log(`   🎯 Total Matches Generated: ${totalMatches || 0}`);
  console.log(`   🚀 Startups with Matches: ${uniqueStartupsWithMatches}`);
  console.log(`   📊 Match Coverage: ${totalApproved > 0 ? Math.round((uniqueStartupsWithMatches / totalApproved) * 100) : 0}%`);

  // Recent matches (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const { count: recentMatches, error: recentMatchesError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgoISO);

  console.log(`   🕐 Recent Matches (7 days): ${recentMatches || 0}`);

  // Match quality distribution
  const { data: matchScores, error: matchScoresError } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(10000);

  if (matchScores && matchScores.length > 0) {
    const scores = matchScores.map(m => m.match_score).filter(s => s !== null);
    if (scores.length > 0) {
      const avgMatch = scores.reduce((a, b) => a + b, 0) / scores.length;
      const highMatches = scores.filter(s => s >= 70).length;
      const mediumMatches = scores.filter(s => s >= 50 && s < 70).length;
      const lowMatches = scores.filter(s => s < 50).length;

      console.log(`\n   📈 Match Quality Distribution:`);
      console.log(`      Average Match Score: ${avgMatch.toFixed(1)}`);
      console.log(`      High (70+): ${highMatches} (${Math.round(highMatches/scores.length*100)}%)`);
      console.log(`      Medium (50-69): ${mediumMatches} (${Math.round(mediumMatches/scores.length*100)}%)`);
      console.log(`      Low (<50): ${lowMatches} (${Math.round(lowMatches/scores.length*100)}%)`);
    }
  }

  // 4. Pipeline Readiness
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('⚙️  PIPELINE READINESS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Startups ready for matching (scored but no matches)
  const { data: readyForMatching, error: readyError } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .gt('total_god_score', 0)
    .limit(1000);

  if (readyForMatching && allStartupIds.length > 0) {
    const startupIdsWithMatches = new Set(allStartupIds);
    const readyIds = new Set(readyForMatching.map(s => s.id));
    const readyButNoMatches = readyForMatching.filter(s => !startupIdsWithMatches.has(s.id)).length;
    
    console.log(`   ✅ Scored & Ready for Matching: ${readyButNoMatches}`);
    console.log(`   ⏳ Pending GOD Scoring: ${unscoredCount}`);
  } else {
    console.log(`   ✅ Scored & Ready for Matching: ${scoredCount}`);
    console.log(`   ⏳ Pending GOD Scoring: ${unscoredCount}`);
  }

  // 5. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`   🚀 Total Startups: ${(totalUploads || 0) + (totalDiscovered || 0)}`);
  console.log(`   ⚡ GOD Scored: ${scoredCount} (${totalApproved > 0 ? Math.round((scoredCount / totalApproved) * 100) : 0}% of approved)`);
  console.log(`   🎯 In Match Pipeline: ${uniqueStartupsWithMatches} (${totalApproved > 0 ? Math.round((uniqueStartupsWithMatches / totalApproved) * 100) : 0}% of approved)`);
  console.log(`   📈 Total Matches: ${totalMatches || 0}`);

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Status check complete\n');
}

checkGODScoringStatus().catch(console.error);

