require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * VC-INTEGRATED SCORING
 * =====================
 * Combines GOD score + Sector alignment + VC Tier realism
 * 
 * A 75% match means different things for different investors:
 * - Tier 1 (Sequoia): Very hard to get, need 80+ GOD
 * - Tier 2 (First Round): Achievable with 60+ GOD  
 * - Tier 3 (Emerging): Accessible with 45+ GOD
 * - Tier 4 (Angels): Open to 35+ GOD
 */

const TIER_THRESHOLDS = {
  1: { minGOD: 55, name: 'Elite', acceptanceRate: 0.02 },
  2: { minGOD: 45, name: 'Strong', acceptanceRate: 0.05 },
  3: { minGOD: 38, name: 'Emerging', acceptanceRate: 0.10 },
  4: { minGOD: 30, name: 'Angels', acceptanceRate: 0.20 }
};

const TIER_FIRMS = {
  1: ['sequoia', 'a16z', 'andreessen', 'benchmark', 'founders fund', 'general catalyst', 'greylock', 'accel', 'lightspeed', 'index', 'bessemer'],
  2: ['first round', 'initialized', 'felicis', 'boldstart', 'spark', 'nea', 'khosla', 'craft', 'lux', 'dcvc'],
  3: ['pear', 'haystack', 'precursor', 'nextview', 'notation', 'homebrew', 'compound'],
  4: []
};

function classifyTier(investor) {
  const name = (investor.name || '').toLowerCase();
  const firm = (investor.firm || '').toLowerCase();
  
  for (const [tier, firms] of Object.entries(TIER_FIRMS)) {
    if (firms.some(f => name.includes(f) || firm.includes(f))) {
      return parseInt(tier);
    }
  }
  
  const checkSize = investor.check_size_max || 0;
  if (checkSize >= 10000000) return 1;
  if (checkSize >= 2000000) return 2;
  if (checkSize >= 500000) return 3;
  return 4;
}

function calcVCIntegratedScore(startup, investor) {
  const god = startup.total_god_score || 45;
  const tier = classifyTier(investor);
  const tierInfo = TIER_THRESHOLDS[tier];
  
  // Base alignment score (sector + stage)
  const sSec = (startup.sectors || []).map(s => s.toLowerCase());
  const iSec = (investor.sectors || []).map(s => s.toLowerCase());
  let sectorMatch = 0;
  sSec.forEach(sec => {
    if (iSec.some(is => sec.includes(is) || is.includes(sec))) sectorMatch++;
  });
  const sectorScore = Math.min(sectorMatch * 8, 20);
  
  const iStages = (investor.stage || []).map(x => x.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const sStage = stageNames[startup.stage || 2] || 'seed';
  const stageScore = iStages.some(x => x.includes(sStage)) ? 10 : -5;
  
  // Raw match score
  const rawScore = god + sectorScore + stageScore;
  
  // VC Tier adjustment - penalize if startup below tier threshold
  let tierAdjustment = 0;
  if (god < tierInfo.minGOD) {
    // Startup is below this VC's typical threshold
    tierAdjustment = (tierInfo.minGOD - god) * -1.5;
  } else {
    // Startup meets/exceeds threshold - small bonus
    tierAdjustment = Math.min((god - tierInfo.minGOD) * 0.5, 10);
  }
  
  // Reachability factor (how likely to get a meeting)
  const reachability = tierInfo.acceptanceRate * 100; // 2-20%
  
  // Final scores
  const matchScore = Math.max(25, Math.min(rawScore + tierAdjustment, 95));
  const reachabilityScore = Math.round(reachability + (god - 45) + sectorMatch * 5);
  
  return {
    matchScore,
    reachabilityScore: Math.max(5, Math.min(reachabilityScore, 50)),
    tier,
    tierName: tierInfo.name,
    meetsThreshold: god >= tierInfo.minGOD
  };
}

async function demo() {
  console.log('VC-INTEGRATED SCORING DEMO\n');
  
  // Get sample startups
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, sectors, stage')
    .eq('status', 'approved')
    .order('total_god_score', { ascending: false })
    .limit(5);
  
  // Get investors from different tiers
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, firm, sectors, stage, check_size_max')
    .not('sectors', 'eq', '{}')
    .limit(100);
  
  // Classify investors by tier
  const byTier = { 1: [], 2: [], 3: [], 4: [] };
  investors.forEach(inv => {
    const tier = classifyTier(inv);
    if (byTier[tier].length < 3) byTier[tier].push(inv);
  });
  
  console.log('Sample scoring for top startup:\n');
  const startup = startups[0];
  console.log('Startup:', startup.name, '| GOD:', startup.total_god_score, '| Sectors:', (startup.sectors||[]).slice(0,2).join(', '));
  console.log('');
  console.log('Investor'.padEnd(35), 'Tier', 'Match', 'Reach', 'Meets Threshold?');
  console.log('-'.repeat(75));
  
  for (const tier of [1, 2, 3, 4]) {
    for (const inv of byTier[tier]) {
      const result = calcVCIntegratedScore(startup, inv);
      console.log(
        inv.name.substring(0, 34).padEnd(35),
        ('T' + result.tier).padEnd(5),
        (result.matchScore + '%').padEnd(6),
        (result.reachabilityScore + '%').padEnd(6),
        result.meetsThreshold ? 'Yes' : 'NO - below threshold'
      );
    }
  }
  
  console.log('\n\nSample for LOW GOD startup:\n');
  const lowStartup = startups[startups.length - 1];
  console.log('Startup:', lowStartup.name, '| GOD:', lowStartup.total_god_score);
  console.log('');
  
  for (const tier of [1, 2, 3, 4]) {
    for (const inv of byTier[tier].slice(0, 1)) {
      const result = calcVCIntegratedScore(lowStartup, inv);
      console.log(
        inv.name.substring(0, 34).padEnd(35),
        ('T' + result.tier).padEnd(5),
        (result.matchScore + '%').padEnd(6),
        (result.reachabilityScore + '%').padEnd(6),
        result.meetsThreshold ? 'Yes' : 'NO - below threshold'
      );
    }
  }
}

demo().catch(console.error);
