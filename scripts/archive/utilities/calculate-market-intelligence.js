#!/usr/bin/env node
/**
 * MARKET INTELLIGENCE CALCULATOR
 * 
 * Automatically calculates and stores key market intelligence variables:
 * - Sector performance metrics
 * - Founder attribute patterns
 * - Funding velocity trends
 * - Talent trends
 * 
 * Run manually: node calculate-market-intelligence.js
 * Or via automation-engine.js (scheduled daily)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Fallback credentials (same as extract-funding-rounds.js)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const today = new Date().toISOString().split('T')[0];

/**
 * Calculate average GOD score by sector
 */
async function calculateSectorGODScores() {
  console.log('📊 Calculating sector GOD scores...');
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('sectors, total_god_score')
    .not('total_god_score', 'is', null)
    .eq('status', 'approved');

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }

  // Aggregate by sector
  const sectorStats = {};
  (startups || []).forEach(startup => {
    const sectors = startup.sectors || [];
    sectors.forEach(sector => {
      if (!sectorStats[sector]) {
        sectorStats[sector] = { sum: 0, count: 0 };
      }
      sectorStats[sector].sum += startup.total_god_score;
      sectorStats[sector].count += 1;
    });
  });

  // Store in key_variables_tracking
  for (const [sector, stats] of Object.entries(sectorStats)) {
    const avg = stats.sum / stats.count;
    
    await supabase
      .from('key_variables_tracking')
      .upsert({
        variable_name: 'avg_god_score',
        variable_category: 'startup_health',
        value: avg,
        sector: sector,
        measurement_date: today,
        sample_size: stats.count,
        calculation_method: 'Average of all approved startups in sector'
      }, {
        onConflict: 'variable_name,sector,stage,geography,measurement_date'
      });
    
    console.log(`  ✅ ${sector}: ${avg.toFixed(1)} (n=${stats.count})`);
  }
}

/**
 * Calculate founder attribute distributions
 */
async function calculateFounderPatterns() {
  console.log('👥 Calculating founder patterns...');
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('extracted_data, total_god_score')
    .not('extracted_data', 'is', null)
    .eq('status', 'approved');

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }

  const courageDistribution = { low: 0, moderate: 0, high: 0, exceptional: 0, unknown: 0 };
  const intelligenceDistribution = { low: 0, moderate: 0, high: 0, exceptional: 0, unknown: 0 };
  const courageScores = [];
  const intelligenceScores = [];

  (startups || []).forEach(startup => {
    const extracted = startup.extracted_data || {};
    const courage = extracted.founder_courage || 'unknown';
    const intelligence = extracted.founder_intelligence || 'unknown';

    courageDistribution[courage] = (courageDistribution[courage] || 0) + 1;
    intelligenceDistribution[intelligence] = (intelligenceDistribution[intelligence] || 0) + 1;

    if (startup.total_god_score) {
      if (courage !== 'unknown') {
        courageScores.push({ courage, score: startup.total_god_score });
      }
      if (intelligence !== 'unknown') {
        intelligenceScores.push({ intelligence, score: startup.total_god_score });
      }
    }
  });

  // Calculate averages
  const courageAverages = {};
  Object.keys(courageDistribution).forEach(courage => {
    const scores = courageScores.filter(s => s.courage === courage).map(s => s.score);
    if (scores.length > 0) {
      courageAverages[courage] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  });

  const intelligenceAverages = {};
  Object.keys(intelligenceDistribution).forEach(intelligence => {
    const scores = intelligenceScores.filter(s => s.intelligence === intelligence).map(s => s.score);
    if (scores.length > 0) {
      intelligenceAverages[intelligence] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  });

  // Store distributions
  await supabase
    .from('key_variables_tracking')
    .upsert({
      variable_name: 'founder_courage_distribution',
      variable_category: 'founder_attributes',
      value_json: courageDistribution,
      measurement_date: today,
      sample_size: startups?.length || 0,
      calculation_method: 'Count of startups by courage level'
    }, {
      onConflict: 'variable_name,sector,stage,geography,measurement_date'
    });

  await supabase
    .from('key_variables_tracking')
    .upsert({
      variable_name: 'founder_intelligence_distribution',
      variable_category: 'founder_attributes',
      value_json: intelligenceDistribution,
      measurement_date: today,
      sample_size: startups?.length || 0,
      calculation_method: 'Count of startups by intelligence level'
    }, {
      onConflict: 'variable_name,sector,stage,geography,measurement_date'
    });

  // Store averages
  for (const [level, avg] of Object.entries(courageAverages)) {
    await supabase
      .from('key_variables_tracking')
      .upsert({
        variable_name: `founder_courage_avg_god_score_${level}`,
        variable_category: 'founder_attributes',
        value: avg,
        measurement_date: today,
        sample_size: courageScores.filter(s => s.courage === level).length,
        calculation_method: `Average GOD score for ${level} courage founders`
      }, {
        onConflict: 'variable_name,sector,stage,geography,measurement_date'
      });
  }

  for (const [level, avg] of Object.entries(intelligenceAverages)) {
    await supabase
      .from('key_variables_tracking')
      .upsert({
        variable_name: `founder_intelligence_avg_god_score_${level}`,
        variable_category: 'founder_attributes',
        value: avg,
        measurement_date: today,
        sample_size: intelligenceScores.filter(s => s.intelligence === level).length,
        calculation_method: `Average GOD score for ${level} intelligence founders`
      }, {
        onConflict: 'variable_name,sector,stage,geography,measurement_date'
      });
  }

  console.log(`  ✅ Courage distribution:`, courageDistribution);
  console.log(`  ✅ Intelligence distribution:`, intelligenceDistribution);
}

/**
 * Calculate funding velocity by sector
 */
async function calculateFundingVelocity() {
  console.log('💰 Calculating funding velocity...');
  
  const { data: rounds, error } = await supabase
    .from('funding_rounds')
    .select('startup_id, date, round_type, startup_uploads!inner(sectors)')
    .order('date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching funding rounds:', error);
    return;
  }

  // Group by startup and calculate time between rounds
  const startupRounds = {};
  (rounds || []).forEach(round => {
    if (!startupRounds[round.startup_id]) {
      startupRounds[round.startup_id] = [];
    }
    startupRounds[round.startup_id].push(round);
  });

  // Calculate average days between rounds by sector
  const sectorVelocities = {};
  
  for (const [startupId, roundsList] of Object.entries(startupRounds)) {
    if (roundsList.length < 2) continue; // Need at least 2 rounds
    
    const startup = roundsList[0].startup_uploads;
    const sectors = startup?.sectors || [];
    
    // Calculate average days between rounds for this startup
    let totalDays = 0;
    let roundPairs = 0;
    
    for (let i = 1; i < roundsList.length; i++) {
      const daysDiff = Math.floor((new Date(roundsList[i].date) - new Date(roundsList[i-1].date)) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0) {
        totalDays += daysDiff;
        roundPairs++;
      }
    }
    
    if (roundPairs > 0) {
      const avgDays = totalDays / roundPairs;
      
      sectors.forEach(sector => {
        if (!sectorVelocities[sector]) {
          sectorVelocities[sector] = { sum: 0, count: 0 };
        }
        sectorVelocities[sector].sum += avgDays;
        sectorVelocities[sector].count += 1;
      });
    }
  }

  // Store averages
  for (const [sector, stats] of Object.entries(sectorVelocities)) {
    const avgDays = stats.sum / stats.count;
    
    await supabase
      .from('key_variables_tracking')
      .upsert({
        variable_name: 'avg_funding_velocity_days',
        variable_category: 'market_trends',
        value: avgDays,
        sector: sector,
        measurement_date: today,
        sample_size: stats.count,
        calculation_method: 'Average days between funding rounds'
      }, {
        onConflict: 'variable_name,sector,stage,geography,measurement_date'
      });
    
    console.log(`  ✅ ${sector}: ${avgDays.toFixed(0)} days between rounds (n=${stats.count})`);
  }
}

/**
 * Calculate overall market intelligence metrics
 */
async function calculateMarketIntelligence() {
  console.log('📈 Calculating market intelligence metrics...');
  
  // Get overall stats
  const { data: startups, error: startupsError } = await supabase
    .from('startup_uploads')
    .select('total_god_score, mrr, growth_rate_monthly, sectors, stage')
    .not('total_god_score', 'is', null)
    .eq('status', 'approved');

  if (startupsError) {
    console.error('❌ Error fetching startups:', startupsError);
    return;
  }

  const godScores = (startups || []).map(s => s.total_god_score).filter(s => s);
  const mrrs = (startups || []).map(s => s.mrr).filter(m => m && m > 0);
  const growthRates = (startups || []).map(s => s.growth_rate_monthly).filter(g => g && g > 0);

  const avgGODScore = godScores.length > 0 
    ? godScores.reduce((a, b) => a + b, 0) / godScores.length 
    : 0;
  const avgMRR = mrrs.length > 0 
    ? mrrs.reduce((a, b) => a + b, 0) / mrrs.length 
    : 0;
  const avgGrowthRate = growthRates.length > 0 
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length 
    : 0;

  // Store in market_intelligence table
  await supabase
    .from('market_intelligence')
    .insert({
      metric_type: 'sector_performance',
      metric_name: 'overall_market_health',
      metric_value: {
        avg_god_score: avgGODScore,
        avg_mrr: avgMRR,
        avg_growth_rate: avgGrowthRate,
        total_startups: startups?.length || 0
      },
      period_start: today,
      period_end: today,
      calculation_method: 'Aggregated from all approved startups',
      confidence_score: 0.9
    });

  console.log(`  ✅ Overall Market Health:`);
  console.log(`     Avg GOD Score: ${avgGODScore.toFixed(1)}`);
  console.log(`     Avg MRR: $${(avgMRR / 1000).toFixed(0)}K`);
  console.log(`     Avg Growth Rate: ${avgGrowthRate.toFixed(1)}% MoM`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Market Intelligence Calculation\n');
  console.log('═'.repeat(60));
  
  try {
    await calculateSectorGODScores();
    await calculateFounderPatterns();
    await calculateFundingVelocity();
    await calculateMarketIntelligence();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Market Intelligence calculation complete!');
  } catch (error) {
    console.error('\n❌ Error in market intelligence calculation:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };

