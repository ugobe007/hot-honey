#!/usr/bin/env node
/**
 * Check data availability for charts and estimate collection time
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('📊 Chart Data Availability Analysis\n');
  console.log('═'.repeat(70));

  // Check current data
  const { count: totalStartups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const { count: withExtracted } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('extracted_data', 'is', null);

  const { count: withScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);

  // Check date ranges
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: recentUpdates } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('updated_at', thirtyDaysAgo.toISOString());

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { count: weekUpdates } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('updated_at', sevenDaysAgo.toISOString());

  // Check matches
  const { count: totalMatches } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  console.log('\n📈 Current Data Status:');
  console.log(`   Total Approved Startups: ${(totalStartups || 0).toLocaleString()}`);
  console.log(`   With extracted_data: ${(withExtracted || 0).toLocaleString()} (${totalStartups ? ((withExtracted || 0) / totalStartups * 100).toFixed(1) : 0}%)`);
  console.log(`   With GOD Scores: ${(withScores || 0).toLocaleString()} (${totalStartups ? ((withScores || 0) / totalStartups * 100).toFixed(1) : 0}%)`);
  console.log(`   Updated in last 30 days: ${(recentUpdates || 0).toLocaleString()}`);
  console.log(`   Updated in last 7 days: ${(weekUpdates || 0).toLocaleString()}`);
  console.log(`   Total Matches: ${(totalMatches || 0).toLocaleString()}`);

  // Inference enrichment schedule
  const INFERENCE_RUNS_PER_DAY = 12; // Every 2 hours
  const STARTUPS_PER_RUN = 100;
  const STARTUPS_PER_DAY = INFERENCE_RUNS_PER_DAY * STARTUPS_PER_RUN;

  console.log('\n⏱️  Data Collection Timeline:\n');

  // GOD Score Trend Chart (needs 30 days)
  const daysForGODTrend = 30;
  const dataPointsNeeded = 20; // At least 20 data points for meaningful trend
  const currentDataPoints = recentUpdates || 0;
  const daysRemaining = Math.max(0, daysForGODTrend - (currentDataPoints > 0 ? 1 : daysForGODTrend));
  
  console.log('1. GOD Score Trend Chart (30-day view):');
  console.log(`   Current data points: ${currentDataPoints > 0 ? 'Some' : 'None'}`);
  console.log(`   Time to meaningful data: ${currentDataPoints > 0 ? '1-2 days' : `${daysForGODTrend} days`}`);
  console.log(`   Status: ${currentDataPoints > 0 ? '✅ Can show current data' : '⏳ Needs 30 days of updates'}`);

  // Inference Coverage Chart (needs 7 days)
  const daysForCoverage = 7;
  console.log('\n2. Inference Data Coverage Chart (7-day view):');
  console.log(`   Current data points: ${weekUpdates || 0}`);
  console.log(`   Time to meaningful data: ${weekUpdates && weekUpdates > 0 ? 'Available now' : `${daysForCoverage} days`}`);
  console.log(`   Status: ${weekUpdates && weekUpdates > 0 ? '✅ Can show current data' : '⏳ Needs 7 days of updates'}`);

  // Match Quality Chart (works with current data)
  console.log('\n3. Match Quality Chart:');
  console.log(`   Current matches: ${(totalMatches || 0).toLocaleString()}`);
  console.log(`   Time to meaningful data: Available now`);
  console.log(`   Status: ${totalMatches && totalMatches > 1000 ? '✅ Ready' : '⚠️  Limited data'}`);

  // Inference Impact Chart (needs enriched startups)
  const startupsNeedingEnrichment = (totalStartups || 0) - (withExtracted || 0);
  const daysToEnrichAll = startupsNeedingEnrichment > 0 
    ? Math.ceil(startupsNeedingEnrichment / STARTUPS_PER_DAY)
    : 0;
  
  console.log('\n4. Inference Impact Chart:');
  console.log(`   Startups needing enrichment: ${startupsNeedingEnrichment.toLocaleString()}`);
  console.log(`   Enrichment rate: ${STARTUPS_PER_DAY.toLocaleString()} startups/day`);
  console.log(`   Time to enrich all: ${daysToEnrichAll > 0 ? `${daysToEnrichAll} days` : 'Complete'}`);
  console.log(`   Status: ${withExtracted && withExtracted > 100 ? '✅ Can show impact' : '⏳ Needs more enriched startups'}`);

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📅 Summary Timeline:\n');
  
  if (totalStartups && totalStartups > 0) {
    console.log('✅ Immediate (Available Now):');
    console.log('   - Match Quality Chart (if matches exist)');
    if (weekUpdates && weekUpdates > 0) {
      console.log('   - Inference Coverage Chart (7-day view)');
    }
    
    console.log('\n⏳ Short-term (1-7 days):');
    if (!weekUpdates || weekUpdates === 0) {
      console.log('   - Inference Coverage Chart: 7 days');
    }
    if (startupsNeedingEnrichment > 0) {
      console.log(`   - Inference Impact Chart: ${Math.min(daysToEnrichAll, 7)} days for meaningful data`);
    }
    
    console.log('\n📊 Medium-term (7-30 days):');
    if (!recentUpdates || recentUpdates === 0) {
      console.log('   - GOD Score Trend Chart: 30 days for full trend');
    } else {
      console.log('   - GOD Score Trend Chart: Building (will improve over 30 days)');
    }
  } else {
    console.log('⚠️  No approved startups found in database.');
    console.log('   Charts will show "No data available" until startups are added.');
  }

  console.log('\n💡 Tips:');
  console.log('   - Charts will show available data immediately');
  console.log('   - Trends improve as more data accumulates');
  console.log('   - Inference enrichment runs every 2 hours (100 startups/run)');
  console.log('   - GOD scores recalculate when data is enriched');
  console.log('   - Match generation creates new matches continuously');
}

main().catch(console.error);

