#!/usr/bin/env node
/**
 * BIAS MONITOR & ML DATA PIPELINE
 * ================================
 * 1. Detects scoring biases and logs them
 * 2. Exports training data for ML model
 * 3. Stores recommendations in database for tracking
 * 
 * Run: node bias-monitor-ml-pipeline.js
 * Schedule: Add to GitHub Actions for automated runs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Bias thresholds
const THRESHOLDS = {
  sectorImbalance: 0.3,      // 30% deviation from expected
  tierMismatch: 20,           // 20 point gap between tiers
  scoreClusteringMax: 0.6,    // 60% in one bucket is too clustered
  lowMatchRate: 0.4,          // Below 40% good fit rate
  vcGapMax: 25,               // Max 25 point gap from VC benchmarks
};

async function runBiasAnalysis() {
  console.log('\n🔍 BIAS MONITOR & ML PIPELINE');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Started:', new Date().toISOString());
  console.log('');

  const biasReport = {
    timestamp: new Date().toISOString(),
    biases: [],
    recommendations: [],
    metrics: {},
    mlDataExported: false,
  };

  // 1. SECTOR BIAS ANALYSIS
  console.log('📊 Analyzing sector biases...');
  const sectorBias = await analyzeSectorBias();
  biasReport.biases.push(...sectorBias.biases);
  biasReport.recommendations.push(...sectorBias.recommendations);
  biasReport.metrics.sectors = sectorBias.metrics;

  // 2. TIER DISTRIBUTION BIAS
  console.log('📊 Analyzing tier distribution...');
  const tierBias = await analyzeTierBias();
  biasReport.biases.push(...tierBias.biases);
  biasReport.recommendations.push(...tierBias.recommendations);
  biasReport.metrics.tiers = tierBias.metrics;

  // 3. SCORE CLUSTERING BIAS
  console.log('📊 Analyzing score clustering...');
  const scoreBias = await analyzeScoreClustering();
  biasReport.biases.push(...scoreBias.biases);
  biasReport.recommendations.push(...scoreBias.recommendations);
  biasReport.metrics.scores = scoreBias.metrics;

  // 4. MATCH QUALITY BIAS
  console.log('📊 Analyzing match quality...');
  const matchBias = await analyzeMatchQuality();
  biasReport.biases.push(...matchBias.biases);
  biasReport.recommendations.push(...matchBias.recommendations);
  biasReport.metrics.matches = matchBias.metrics;

  // 5. EXPORT ML TRAINING DATA
  console.log('📊 Exporting ML training data...');
  const mlExport = await exportMLTrainingData();
  biasReport.mlDataExported = mlExport.success;
  biasReport.mlDataPath = mlExport.path;
  biasReport.mlRecordCount = mlExport.recordCount;

  // 6. SAVE BIAS REPORT TO DATABASE
  console.log('📊 Saving bias report...');
  await saveBiasReport(biasReport);

  // 7. PRINT SUMMARY
  printSummary(biasReport);

  return biasReport;
}

async function analyzeSectorBias() {
  const biases = [];
  const recommendations = [];

  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('sectors, total_god_score')
    .eq('status', 'approved');

  const { data: investors } = await supabase
    .from('investors')
    .select('sectors')
    .not('sectors', 'eq', '{}');

  // Count sector distribution
  const startupSectors = {};
  const investorSectors = {};

  startups.forEach(s => {
    (s.sectors || []).forEach(sec => {
      const n = normalizeSector(sec);
      startupSectors[n] = (startupSectors[n] || 0) + 1;
    });
  });

  investors.forEach(i => {
    (i.sectors || []).forEach(sec => {
      const n = normalizeSector(sec);
      investorSectors[n] = (investorSectors[n] || 0) + 1;
    });
  });

  // Check for imbalances
  const allSectors = [...new Set([...Object.keys(startupSectors), ...Object.keys(investorSectors)])];
  
  for (const sector of allSectors) {
    const supply = startupSectors[sector] || 0;
    const demand = investorSectors[sector] || 0;
    
    if (supply > 10 && demand > 0) {
      const ratio = demand / supply;
      
      if (ratio > 3) {
        biases.push({
          type: 'sector_undersupply',
          sector,
          severity: 'high',
          message: `${sector}: High investor demand (${demand}) but low startup supply (${supply})`,
          ratio,
        });
        recommendations.push({
          type: 'sector_weight',
          action: 'increase',
          sector,
          currentWeight: 1.0,
          recommendedWeight: Math.min(ratio / 2, 2.0),
          reason: `Undersupply in ${sector}`,
        });
      } else if (ratio < 0.3) {
        biases.push({
          type: 'sector_oversupply',
          sector,
          severity: 'medium',
          message: `${sector}: Low investor interest (${demand}) vs startup supply (${supply})`,
          ratio,
        });
        recommendations.push({
          type: 'sector_weight',
          action: 'decrease',
          sector,
          currentWeight: 1.0,
          recommendedWeight: Math.max(ratio * 2, 0.5),
          reason: `Oversupply in ${sector}`,
        });
      }
    }
  }

  return {
    biases,
    recommendations,
    metrics: { startupSectors, investorSectors },
  };
}

async function analyzeTierBias() {
  const biases = [];
  const recommendations = [];

  const { data: investors } = await supabase
    .from('investors')
    .select('name, firm, check_size_min, check_size_max, sectors')
    .not('sectors', 'eq', '{}');

  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  
  const TIER_FIRMS = {
    1: ['sequoia', 'a16z', 'andreessen', 'benchmark', 'founders fund', 'general catalyst', 'greylock', 'accel'],
    2: ['first round', 'initialized', 'felicis', 'boldstart', 'craft', 'spark capital', 'nea', 'khosla'],
    3: ['pear', 'haystack', 'precursor', 'nextview', 'notation', 'lerer hippeau'],
    4: [],
  };

  investors.forEach(inv => {
    const name = (inv.name || '').toLowerCase();
    const firm = (inv.firm || '').toLowerCase();
    const checkSize = inv.check_size_min || inv.check_size_max || 0;
    
    let tier = 4;
    for (const [t, firms] of Object.entries(TIER_FIRMS)) {
      if (firms.some(f => name.includes(f) || firm.includes(f))) {
        tier = parseInt(t);
        break;
      }
    }
    if (tier === 4) {
      if (checkSize >= 5000000) tier = 1;
      else if (checkSize >= 1000000) tier = 2;
      else if (checkSize >= 250000) tier = 3;
    }
    
    tierCounts[tier]++;
  });

  const total = Object.values(tierCounts).reduce((a, b) => a + b, 0);
  
  // Check for tier imbalances
  if (tierCounts[1] < total * 0.05) {
    biases.push({
      type: 'tier_imbalance',
      tier: 1,
      severity: 'high',
      message: `Only ${tierCounts[1]} Tier 1 (Elite) investors (${Math.round(tierCounts[1]/total*100)}%)`,
    });
    recommendations.push({
      type: 'data_enrichment',
      action: 'add_tier1_investors',
      reason: 'Need more elite VC data for accurate matching',
    });
  }

  if (tierCounts[4] > total * 0.5) {
    biases.push({
      type: 'tier_imbalance',
      tier: 4,
      severity: 'medium',
      message: `${Math.round(tierCounts[4]/total*100)}% of investors are Tier 4 (Angels) - may skew matches`,
    });
  }

  return {
    biases,
    recommendations,
    metrics: { tierCounts, total },
  };
}

async function analyzeScoreClustering() {
  const biases = [];
  const recommendations = [];

  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('total_god_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);

  const scores = startups.map(s => s.total_god_score);
  const total = scores.length;

  const buckets = {
    'elite': scores.filter(s => s >= 55).length,
    'strong': scores.filter(s => s >= 45 && s < 55).length,
    'promising': scores.filter(s => s >= 38 && s < 45).length,
    'early': scores.filter(s => s < 38).length,
  };

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / total);
  const stdDev = Math.round(Math.sqrt(scores.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / total));

  // Check for clustering
  for (const [bucket, count] of Object.entries(buckets)) {
    const pct = count / total;
    if (pct > THRESHOLDS.scoreClusteringMax) {
      biases.push({
        type: 'score_clustering',
        bucket,
        severity: 'high',
        message: `${Math.round(pct * 100)}% of scores in "${bucket}" bucket - need more variance`,
        percentage: pct,
      });
      recommendations.push({
        type: 'scoring_adjustment',
        action: 'increase_variance',
        reason: `Too many scores clustered in ${bucket}`,
        suggestion: 'Adjust traction/team weights to differentiate better',
      });
    }
  }

  // Check for low variance
  if (stdDev < 10) {
    biases.push({
      type: 'low_variance',
      severity: 'medium',
      message: `Standard deviation only ${stdDev} - scores too similar`,
      stdDev,
    });
    recommendations.push({
      type: 'scoring_adjustment',
      action: 'increase_variance',
      reason: 'Scores not differentiated enough',
      suggestion: 'Increase weight multipliers for traction metrics',
    });
  }

  return {
    biases,
    recommendations,
    metrics: { buckets, avg, stdDev, total },
  };
}

async function analyzeMatchQuality() {
  const biases = [];
  const recommendations = [];

  // Get recent matches if they exist
  const { data: matches } = await supabase
    .from('startup_investor_matches')
    .select('match_score, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (!matches || matches.length === 0) {
    return { biases: [], recommendations: [], metrics: { noData: true } };
  }

  const scores = matches.map(m => m.match_score).filter(Boolean);
  const avgMatch = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const goodFits = scores.filter(s => s >= 60).length;
  const goodFitRate = goodFits / scores.length;

  if (goodFitRate < THRESHOLDS.lowMatchRate) {
    biases.push({
      type: 'low_match_rate',
      severity: 'high',
      message: `Only ${Math.round(goodFitRate * 100)}% good fits (60%+) - matching may be miscalibrated`,
      rate: goodFitRate,
    });
    recommendations.push({
      type: 'matching_adjustment',
      action: 'recalibrate_thresholds',
      reason: 'Low good fit rate',
      suggestion: 'Lower tier thresholds or increase sector bonuses',
    });
  }

  return {
    biases,
    recommendations,
    metrics: { avgMatch, goodFitRate, totalMatches: matches.length },
  };
}

async function exportMLTrainingData() {
  try {
    // Get comprehensive data for ML training
    const { data: startups } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score, sectors, stage, source_type, mrr, customer_count, team_size')
      .eq('status', 'approved')
      .limit(2000);

    const { data: investors } = await supabase
      .from('investors')
      .select('id, name, sectors, stage, check_size_min, check_size_max, firm')
      .not('sectors', 'eq', '{}')
      .limit(1000);

    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('startup_id, investor_id, match_score, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    // Build ML training dataset
    const trainingData = {
      timestamp: new Date().toISOString(),
      startups: startups.map(s => ({
        id: s.id,
        god_score: s.total_god_score,
        sectors: s.sectors,
        stage: s.stage,
        source_type: s.source_type,
        has_mrr: s.mrr > 0,
        has_customers: s.customer_count > 0,
        has_team: s.team_size > 1,
      })),
      investors: investors.map(i => ({
        id: i.id,
        sectors: i.sectors,
        stages: i.stage,
        check_size_min: i.check_size_min,
        check_size_max: i.check_size_max,
        tier: classifyTier(i),
      })),
      matches: matches || [],
      sector_weights: {
        'ai/ml': 2.0, 'saas': 2.0, 'fintech': 2.0, 'healthtech': 2.0,
        'consumer': 2.0, 'robotics': 2.0, 'crypto': 1.0,
        'cleantech': 0.5, 'gaming': 0.5, 'edtech': 0.5,
      },
    };

    // Save to file
    const outputDir = path.join(__dirname, 'ml-data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `training-data-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(trainingData, null, 2));

    // Also save to Supabase for the ML agent to access
    await supabase.from('ml_training_exports').upsert({
      exported_at: new Date().toISOString(),
      record_count: startups.length + investors.length,
      file_path: filepath,
      data_summary: {
        startups: startups.length,
        investors: investors.length,
        matches: matches?.length || 0,
      },
    }).then(() => {}).catch(() => {
      // Table might not exist, that's ok
      console.log('Note: ml_training_exports table not found, skipping DB save');
    });

    console.log(`   ✅ Exported ${startups.length} startups, ${investors.length} investors`);
    console.log(`   📁 Saved to: ${filepath}`);

    return {
      success: true,
      path: filepath,
      recordCount: startups.length + investors.length,
    };
  } catch (error) {
    console.error('Error exporting ML data:', error);
    return { success: false, error: error.message };
  }
}

async function saveBiasReport(report) {
  try {
    // Save to bias_reports table (create if needed)
    const { error } = await supabase.from('bias_reports').upsert({
      created_at: report.timestamp,
      biases: report.biases,
      recommendations: report.recommendations,
      metrics: report.metrics,
      ml_exported: report.mlDataExported,
    });

    if (error && error.code === '42P01') {
      console.log('   Note: bias_reports table not found, creating...');
      // Table doesn't exist - that's ok for now
    }
  } catch (error) {
    console.log('   Note: Could not save to bias_reports table');
  }
}

function printSummary(report) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📋 BIAS REPORT SUMMARY');
  console.log('════════════════════════════════════════════════════════════════\n');

  console.log('�� BIASES DETECTED:', report.biases.length);
  report.biases.forEach((b, i) => {
    const icon = b.severity === 'high' ? '🔴' : b.severity === 'medium' ? '🟡' : '🟢';
    console.log(`   ${i + 1}. ${icon} [${b.type}] ${b.message}`);
  });

  console.log('\n💡 RECOMMENDATIONS:', report.recommendations.length);
  report.recommendations.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.action}: ${r.reason}`);
    if (r.suggestion) console.log(`      → ${r.suggestion}`);
  });

  console.log('\n📊 KEY METRICS:');
  if (report.metrics.scores) {
    console.log(`   Avg GOD Score: ${report.metrics.scores.avg}`);
    console.log(`   Score StdDev: ${report.metrics.scores.stdDev}`);
  }
  if (report.metrics.tiers) {
    console.log(`   Tier Distribution: T1=${report.metrics.tiers.tierCounts[1]}, T2=${report.metrics.tiers.tierCounts[2]}, T3=${report.metrics.tiers.tierCounts[3]}, T4=${report.metrics.tiers.tierCounts[4]}`);
  }
  if (report.metrics.matches && !report.metrics.matches.noData) {
    console.log(`   Good Fit Rate: ${Math.round(report.metrics.matches.goodFitRate * 100)}%`);
  }

  console.log('\n📁 ML DATA EXPORT:', report.mlDataExported ? '✅ Success' : '❌ Failed');
  if (report.mlDataPath) {
    console.log(`   Path: ${report.mlDataPath}`);
    console.log(`   Records: ${report.mlRecordCount}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ Bias Monitor Complete');
  console.log('════════════════════════════════════════════════════════════════\n');
}

function normalizeSector(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml')) return 'AI/ML';
  if (s.includes('fintech') || s.includes('finance')) return 'FinTech';
  if (s.includes('health') || s.includes('medical')) return 'HealthTech';
  if (s.includes('saas') || s.includes('software')) return 'SaaS';
  if (s.includes('climate') || s.includes('clean')) return 'CleanTech';
  if (s.includes('gaming')) return 'Gaming';
  if (s.includes('edtech') || s.includes('education')) return 'EdTech';
  if (s.includes('consumer')) return 'Consumer';
  if (s.includes('robot')) return 'Robotics';
  return 'Other';
}

function classifyTier(investor) {
  const name = (investor.name || '').toLowerCase();
  const firm = (investor.firm || '').toLowerCase();
  const checkSize = investor.check_size_min || investor.check_size_max || 0;
  
  const TIER_FIRMS = {
    1: ['sequoia', 'a16z', 'andreessen', 'benchmark', 'founders fund'],
    2: ['first round', 'initialized', 'felicis', 'boldstart'],
    3: ['pear', 'haystack', 'precursor'],
  };

  for (const [tier, firms] of Object.entries(TIER_FIRMS)) {
    if (firms.some(f => name.includes(f) || firm.includes(f))) return parseInt(tier);
  }
  
  if (checkSize >= 5000000) return 1;
  if (checkSize >= 1000000) return 2;
  if (checkSize >= 250000) return 3;
  return 4;
}

// Run if called directly
runBiasAnalysis().catch(console.error);
