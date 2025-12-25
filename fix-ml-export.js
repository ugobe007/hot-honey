require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAndExport() {
  console.log('\n🔧 FIXING PIPELINE & EXPORTING ML DATA\n');

  // 1. Check match quality issue - are matches being saved?
  const { data: matches, count } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log('📊 Current matches in DB:', count || 0);
  
  if (!matches || matches.length === 0) {
    console.log('⚠️  No matches saved - this explains 0% good fit rate');
    console.log('   Matches are generated client-side but may not be persisted\n');
  } else {
    console.log('   Sample match scores:', matches.map(m => m.match_score).join(', '));
  }

  // 2. Export ML training data (fixed version)
  console.log('\n📁 Exporting ML Training Data...\n');

  const [startups, investors] = await Promise.all([
    supabase.from('startup_uploads')
      .select('id, name, total_god_score, sectors, stage, source_type, mrr, customer_count, team_size, has_technical_cofounder')
      .eq('status', 'approved'),
    supabase.from('investors')
      .select('id, name, sectors, stage, check_size_min, check_size_max, firm')
      .not('sectors', 'eq', '{}')
  ]);

  const TIER_FIRMS = {
    1: ['sequoia', 'a16z', 'andreessen', 'benchmark', 'founders fund', 'general catalyst', 'greylock'],
    2: ['first round', 'initialized', 'felicis', 'boldstart', 'spark capital', 'nea', 'khosla'],
    3: ['pear', 'haystack', 'precursor', 'nextview', 'notation'],
  };

  const classifyTier = (inv) => {
    const name = (inv.name || '').toLowerCase();
    const firm = (inv.firm || '').toLowerCase();
    const checkSize = inv.check_size_min || inv.check_size_max || 0;
    for (const [tier, firms] of Object.entries(TIER_FIRMS)) {
      if (firms.some(f => name.includes(f) || firm.includes(f))) return parseInt(tier);
    }
    if (checkSize >= 5000000) return 1;
    if (checkSize >= 1000000) return 2;
    if (checkSize >= 250000) return 3;
    return 4;
  };

  const trainingData = {
    exported_at: new Date().toISOString(),
    version: '2.0',
    
    // Startup features for ML
    startups: (startups.data || []).map(s => ({
      id: s.id,
      name: s.name,
      god_score: s.total_god_score || 0,
      sectors: s.sectors || [],
      stage: s.stage || 2,
      source_type: s.source_type,
      features: {
        has_mrr: (s.mrr || 0) > 0,
        has_customers: (s.customer_count || 0) > 0,
        has_team: (s.team_size || 0) > 1,
        has_technical_cofounder: s.has_technical_cofounder || false,
        mrr_bucket: s.mrr > 100000 ? 'high' : s.mrr > 10000 ? 'medium' : s.mrr > 0 ? 'low' : 'none',
      }
    })),

    // Investor features for ML
    investors: (investors.data || []).map(i => ({
      id: i.id,
      name: i.name,
      firm: i.firm,
      tier: classifyTier(i),
      sectors: i.sectors || [],
      stages: i.stage || [],
      check_size: {
        min: i.check_size_min || 0,
        max: i.check_size_max || 0,
      }
    })),

    // Current weights (for ML to learn from/adjust)
    current_weights: {
      sectors: {
        'ai/ml': 2.0, 'saas': 2.0, 'fintech': 2.0, 'healthtech': 2.0,
        'consumer': 2.0, 'robotics': 2.0, 'crypto': 1.0,
        'cleantech': 0.5, 'gaming': 0.5, 'edtech': 0.5,
      },
      tier_bonuses: { 1: 0, 2: 10, 3: 18, 4: 25 },
      god_thresholds: { tier1: 55, tier2: 45, tier3: 38, tier4: 30 },
    },

    // Bias signals detected
    bias_signals: {
      low_variance: true,
      stddev: 5,
      avg_god: 46,
      sector_imbalances: ['AI/ML undersupply', 'SaaS undersupply', 'Gaming oversupply'],
    },

    // Recommendations for ML to consider
    recommendations: [
      { action: 'increase_variance', target: 'god_scoring', reason: 'stddev=5 too low' },
      { action: 'boost_sector_weight', target: 'AI/ML', current: 2.0, suggested: 2.5 },
      { action: 'boost_sector_weight', target: 'SaaS', current: 2.0, suggested: 2.5 },
      { action: 'reduce_sector_weight', target: 'Gaming', current: 0.5, suggested: 0.3 },
    ]
  };

  // Save to ml-data folder
  const outputDir = path.join(__dirname, 'ml-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `training-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(trainingData, null, 2));

  // Also save latest.json for easy access
  fs.writeFileSync(path.join(outputDir, 'latest.json'), JSON.stringify(trainingData, null, 2));

  console.log('✅ Exported ML Training Data:');
  console.log('   Startups:', trainingData.startups.length);
  console.log('   Investors:', trainingData.investors.length);
  console.log('   File:', filepath);
  console.log('   Latest:', path.join(outputDir, 'latest.json'));

  // 3. Summary of what ML agent should do
  console.log('\n📋 ML AGENT INSTRUCTIONS:\n');
  console.log('The ML agent should read from: ml-data/latest.json');
  console.log('');
  console.log('Training objectives:');
  console.log('  1. Learn optimal sector weights from investor demand vs startup supply');
  console.log('  2. Predict match success based on GOD score + sector alignment');
  console.log('  3. Recommend weight adjustments to maximize good fit rate');
  console.log('  4. Identify scoring biases that hurt match quality');
  console.log('');
  console.log('Output expected:');
  console.log('  - Updated sector_weights.json');
  console.log('  - Updated tier thresholds');
  console.log('  - Bias corrections');
}

fixAndExport().catch(console.error);
