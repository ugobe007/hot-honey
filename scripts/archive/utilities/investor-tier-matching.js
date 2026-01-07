#!/usr/bin/env node
/**
 * INVESTOR TIER MATCHING SYSTEM
 * ==============================
 * Internal matching logic that considers investor tiers.
 * 
 * Tier 1: Elite VCs (Sequoia, a16z, Founders Fund, etc.)
 *         - Lead $10M+ rounds
 *         - Brand value, board seats, talent network
 *         - Very selective (1-2% acceptance)
 * 
 * Tier 2: Strong VCs (First Round, Initialized, Felicis, etc.)
 *         - Lead $2-10M rounds  
 *         - Good networks, operational support
 *         - Selective (3-5% acceptance)
 * 
 * Tier 3: Emerging/Specialist VCs
 *         - Lead $500K-2M rounds
 *         - Sector expertise, hands-on
 *         - More accessible (5-10% acceptance)
 * 
 * Tier 4: Angels/Scouts/Syndicates
 *         - $25K-500K checks
 *         - Personal networks, intros
 *         - Most accessible (10-20% acceptance)
 * 
 * KEY INSIGHT: A 45 GOD startup might be a poor fit for Sequoia (Tier 1)
 * but an EXCELLENT fit for a Tier 3 specialist fund in their sector.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ══════════════════════════════════════════════════════════════════════════════
// INVESTOR TIER DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

const TIER_DEFINITIONS = {
  1: {
    name: 'Elite',
    description: 'Top-tier VCs with massive brand, network, and check sizes',
    checkSizeMin: 5000000,
    checkSizeMax: 100000000,
    expectedGODMin: 65, // Recalibrated Dec 2025 - Only show elite startups to elite VCs
    acceptanceRate: 0.02,
    matchBonus: 0, // No bonus - hardest to match
    firms: [
      'sequoia', 'a16z', 'andreessen', 'benchmark', 'founders fund',
      'general catalyst', 'greylock', 'accel', 'lightspeed', 'index',
      'bessemer', 'insight', 'tiger global', 'coatue', 'addition'
    ]
  },
  2: {
    name: 'Strong',
    description: 'Established VCs with good track records and networks',
    checkSizeMin: 1000000,
    checkSizeMax: 15000000,
    expectedGODMin: 55, // Recalibrated Dec 2025 - Good startups for strong VCs
    acceptanceRate: 0.04,
    matchBonus: 10, // Slight bonus - more accessible
    firms: [
      'first round', 'initialized', 'felicis', 'boldstart', 'craft',
      'spark capital', 'nea', 'khosla', 'ggv', 'dcm', 'battery',
      'ivp', 'redpoint', 'menlo', 'foundation', 'uncork'
    ]
  },
  3: {
    name: 'Emerging/Specialist',
    description: 'Newer funds or sector specialists with hands-on approach',
    checkSizeMin: 250000,
    checkSizeMax: 5000000,
    expectedGODMin: 48, // Recalibrated Dec 2025 - Earlier stage startups welcome
    acceptanceRate: 0.08,
    matchBonus: 18, // Good bonus - more accessible
    firms: [
      'pear', 'haystack', 'precursor', 'nextview', 'notation',
      'lerer hippeau', 'compound', 'homebrew', 'cowboy', 'version one',
      'boost', '500 global', 'techstars', 'launch', 'soma'
    ]
  },
  4: {
    name: 'Angels/Scouts',
    description: 'Individual investors, scouts, and syndicates',
    checkSizeMin: 10000,
    checkSizeMax: 500000,
    expectedGODMin: 44, // Recalibrated Dec 2025 - Open to very early ideas
    acceptanceRate: 0.15,
    matchBonus: 25, // High bonus - most accessible
    firms: [] // Determined by individual investor patterns
  }
};

// Sector weights (hot sectors get bonus)
const SECTOR_WEIGHTS = {
  'ai/ml': 2.0, 'ai': 2.0, 'ml': 2.0,
  'saas': 2.0, 'fintech': 2.0, 'healthtech': 2.0, 'healthcare': 2.0,
  'consumer': 2.0, 'robotics': 2.0,
  'crypto': 1.0, 'web3': 1.0,
  'cleantech': 0.5, 'climate': 0.5, 'gaming': 0.5, 'edtech': 0.5
};

// ══════════════════════════════════════════════════════════════════════════════
// TIER CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════════════

function classifyInvestorTier(investor) {
  const name = (investor.name || '').toLowerCase();
  const firm = (investor.firm || '').toLowerCase();
  const checkSize = investor.check_size_min || investor.check_size_max || 0;
  
  // Check against known firm lists
  for (const [tier, def] of Object.entries(TIER_DEFINITIONS)) {
    if (def.firms.some(f => name.includes(f) || firm.includes(f))) {
      return parseInt(tier);
    }
  }
  
  // Infer from check size
  if (checkSize >= 5000000) return 1;
  if (checkSize >= 1000000) return 2;
  if (checkSize >= 250000) return 3;
  return 4;
}

// ══════════════════════════════════════════════════════════════════════════════
// TIERED MATCH SCORING
// ══════════════════════════════════════════════════════════════════════════════

function calculateTieredMatch(startup, investor) {
  const tier = classifyInvestorTier(investor);
  const tierDef = TIER_DEFINITIONS[tier];
  
  const godScore = startup.total_god_score || 40;
  const startupSectors = (startup.sectors || []).map(s => s.toLowerCase());
  const investorSectors = (investor.sectors || []).map(s => s.toLowerCase());
  
  // Base match from GOD score
  let baseMatch = godScore;
  
  // Sector alignment bonus (weighted)
  let sectorBonus = 0;
  startupSectors.forEach(sec => {
    if (investorSectors.some(is => sec.includes(is) || is.includes(sec))) {
      const weight = SECTOR_WEIGHTS[sec] || SECTOR_WEIGHTS[Object.keys(SECTOR_WEIGHTS).find(k => sec.includes(k))] || 1.0;
      sectorBonus += 8 * weight;
    }
  });
  sectorBonus = Math.min(sectorBonus, 32);
  
  // Stage alignment
  const investorStages = (investor.stage || []).map(s => s.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const startupStage = stageNames[startup.stage || 2] || 'seed';
  const stageBonus = investorStages.some(s => s.includes(startupStage)) ? 10 : 0;
  
  // TIER ADJUSTMENT - This is the key insight!
  // Lower tier investors get a bonus because they're more accessible
  const tierBonus = tierDef.matchBonus;
  
  // Tier fit check - penalize if startup is below investor's expected quality
  let tierFitPenalty = 0;
  if (godScore < tierDef.expectedGODMin) {
    tierFitPenalty = (tierDef.expectedGODMin - godScore) * 1.5;
  }
  
  // Calculate final scores
  const rawMatch = baseMatch + sectorBonus + stageBonus;
  const tier1Match = Math.min(rawMatch - tierFitPenalty, 99); // Elite VC match
  const tierAdjustedMatch = Math.min(rawMatch + tierBonus - Math.max(0, tierFitPenalty - tierBonus), 99); // Tier-adjusted match
  
  return {
    startup: startup.name,
    investor: investor.name,
    investorTier: tier,
    tierName: tierDef.name,
    godScore,
    sectorBonus,
    stageBonus,
    tierBonus,
    tierFitPenalty,
    tier1Match: Math.max(25, Math.round(tier1Match)), // What Tier 1 would score this
    tierAdjustedMatch: Math.max(25, Math.round(tierAdjustedMatch)), // Adjusted for this investor's tier
    isGoodFit: tierAdjustedMatch >= 60,
    recommendation: getTierRecommendation(tier, godScore, tierAdjustedMatch),
  };
}

function getTierRecommendation(tier, godScore, matchScore) {
  if (tier === 1 && godScore < 55) {
    return 'Consider Tier 2-3 investors first - higher success probability';
  }
  if (tier === 4 && godScore > 55) {
    return 'Startup may be overqualified - aim higher';
  }
  if (matchScore >= 80) {
    return 'Strong fit - prioritize outreach';
  }
  if (matchScore >= 60) {
    return 'Good fit - include in outreach list';
  }
  return 'Weak fit - lower priority';
}

// ══════════════════════════════════════════════════════════════════════════════
// FIND BEST MATCHES ACROSS TIERS
// ══════════════════════════════════════════════════════════════════════════════

async function findTieredMatches(startupId) {
  // Get startup
  const { data: startup } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('id', startupId)
    .single();
  
  if (!startup) return null;
  
  // Get all investors
  const { data: investors } = await supabase
    .from('investors')
    .select('*')
    .not('sectors', 'eq', '{}');
  
  // Calculate matches for each tier
  const matchesByTier = { 1: [], 2: [], 3: [], 4: [] };
  
  for (const investor of investors) {
    const match = calculateTieredMatch(startup, investor);
    matchesByTier[match.investorTier].push(match);
  }
  
  // Sort each tier by tierAdjustedMatch
  for (const tier of Object.keys(matchesByTier)) {
    matchesByTier[tier].sort((a, b) => b.tierAdjustedMatch - a.tierAdjustedMatch);
  }
  
  return {
    startup: startup.name,
    godScore: startup.total_god_score,
    sectors: startup.sectors,
    matchesByTier,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

async function runTierAnalysis() {
  console.log('\n🎯 INVESTOR TIER MATCHING SYSTEM');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Internal matching that considers investor accessibility tiers\n');
  
  // Get sample startups across GOD score range
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, sectors, stage')
    .eq('status', 'approved')
    .order('total_god_score', { ascending: false })
    .limit(100);
  
  // Get investors
  const { data: investors } = await supabase
    .from('investors')
    .select('*')
    .not('sectors', 'eq', '{}')
    .limit(200);
  
  // Classify investors by tier
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  investors.forEach(inv => {
    tierCounts[classifyInvestorTier(inv)]++;
  });
  
  console.log('📊 INVESTOR TIER DISTRIBUTION\n');
  Object.entries(TIER_DEFINITIONS).forEach(([tier, def]) => {
    console.log('Tier ' + tier + ' (' + def.name + '): ' + tierCounts[tier] + ' investors');
    console.log('   Check size: $' + (def.checkSizeMin/1000000).toFixed(1) + 'M - $' + (def.checkSizeMax/1000000).toFixed(0) + 'M');
    console.log('   Expected GOD: ' + def.expectedGODMin + '+');
    console.log('   Match bonus: +' + def.matchBonus + ' pts');
    console.log('');
  });
  
  // Show tiered matching for sample startups
  console.log('\n🔥 TIERED MATCH EXAMPLES\n');
  console.log('Startup'.padEnd(22) + 'GOD'.padStart(4) + '  T1 Match'.padStart(10) + '  T2 Match'.padStart(10) + '  T3 Match'.padStart(10) + '  Best Tier');
  console.log('─'.repeat(75));
  
  for (const startup of startups.slice(0, 15)) {
    // Find best match in each tier
    const tierMatches = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    for (const investor of investors) {
      const match = calculateTieredMatch(startup, investor);
      if (match.tierAdjustedMatch > tierMatches[match.investorTier]) {
        tierMatches[match.investorTier] = match.tierAdjustedMatch;
      }
    }
    
    // Determine best tier (highest match score)
    const bestTier = Object.entries(tierMatches).reduce((best, [tier, score]) => 
      score > best.score ? { tier, score } : best, { tier: '4', score: 0 });
    
    console.log(
      startup.name.substring(0, 21).padEnd(22) +
      (startup.total_god_score || 0).toString().padStart(4) +
      (tierMatches[1] + '%').padStart(10) +
      (tierMatches[2] + '%').padStart(10) +
      (tierMatches[3] + '%').padStart(10) +
      ('Tier ' + bestTier.tier + ' (' + bestTier.score + '%)').padStart(18)
    );
  }
  
  // Strategic recommendations
  console.log('\n\n📋 TIER MATCHING STRATEGY\n');
  
  const godRanges = [
    { min: 55, max: 100, label: 'Elite (55+)' },
    { min: 45, max: 54, label: 'Strong (45-54)' },
    { min: 38, max: 44, label: 'Promising (38-44)' },
    { min: 0, max: 37, label: 'Early (< 38)' },
  ];
  
  for (const range of godRanges) {
    const inRange = startups.filter(s => s.total_god_score >= range.min && s.total_god_score <= range.max);
    console.log(range.label + ': ' + inRange.length + ' startups');
    
    if (range.min >= 55) {
      console.log('   → Target: Tier 1-2 (Elite and Strong VCs)');
      console.log('   → Strategy: Lead with brand-name VCs, use warm intros');
    } else if (range.min >= 45) {
      console.log('   → Target: Tier 2-3 (Strong and Emerging VCs)');
      console.log('   → Strategy: Focus on sector specialists and operator funds');
    } else if (range.min >= 38) {
      console.log('   → Target: Tier 3-4 (Emerging VCs and Angels)');
      console.log('   → Strategy: Build traction, use angel rounds to prove model');
    } else {
      console.log('   → Target: Tier 4 (Angels and Accelerators)');
      console.log('   → Strategy: Get into accelerator or raise friends & family');
    }
    console.log('');
  }
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ Tier Analysis Complete');
  console.log('════════════════════════════════════════════════════════════════\n');
}

// Export for use in matching engine
module.exports = { 
  classifyInvestorTier, 
  calculateTieredMatch, 
  findTieredMatches,
  TIER_DEFINITIONS 
};

// Run if called directly
if (require.main === module) {
  runTierAnalysis().catch(console.error);
}
