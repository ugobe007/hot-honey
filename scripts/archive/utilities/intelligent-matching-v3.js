/**
 * INTELLIGENT MATCHING ALGORITHM v3
 * ==================================
 * 
 * Creates a proper bell curve distribution by:
 * 1. Sector matching with synonyms/adjacency
 * 2. Penalties for mismatches (not just lower bonuses)
 * 3. Stage alignment with investor preferences
 * 4. Raise amount vs check size fit
 * 5. Traction signals weighted by investor stage
 * 
 * Target Distribution:
 *   20-35: ~15% (poor fit)
 *   36-50: ~35% (weak fit)
 *   51-65: ~30% (good fit)
 *   66-80: ~15% (strong fit)
 *   81-95: ~5%  (exceptional)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============ SECTOR INTELLIGENCE ============

// Sector synonyms - different names for same thing
const SECTOR_SYNONYMS = {
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative ai', 'gen ai'],
  'fintech': ['financial technology', 'financial services', 'payments', 'banking', 'insurtech'],
  'healthtech': ['health tech', 'healthcare', 'digital health', 'medtech', 'medical technology', 'biotech'],
  'edtech': ['education', 'education technology', 'e-learning', 'learning'],
  'saas': ['software as a service', 'b2b saas', 'enterprise saas', 'software'],
  'enterprise': ['b2b', 'enterprise software', 'business software'],
  'consumer': ['b2c', 'consumer tech', 'consumer products', 'd2c', 'direct to consumer'],
  'marketplace': ['marketplaces', 'platform', 'two-sided marketplace'],
  'devtools': ['developer tools', 'dev tools', 'infrastructure', 'developer infrastructure'],
  'climatetech': ['climate tech', 'cleantech', 'clean tech', 'sustainability', 'green tech'],
  'crypto': ['web3', 'blockchain', 'defi', 'cryptocurrency'],
  'gaming': ['games', 'game tech', 'esports'],
  'ecommerce': ['e-commerce', 'retail tech', 'commerce'],
  'proptech': ['real estate tech', 'property tech', 'real estate'],
  'logistics': ['supply chain', 'fulfillment', 'shipping'],
  'foodtech': ['food tech', 'food & beverage', 'agtech', 'agriculture']
};

// Sector adjacency - related but not same
const SECTOR_ADJACENCY = {
  'ai': ['devtools', 'enterprise', 'saas', 'healthtech', 'fintech'],
  'fintech': ['crypto', 'enterprise', 'saas', 'insurtech'],
  'healthtech': ['biotech', 'ai', 'consumer', 'enterprise'],
  'edtech': ['consumer', 'saas', 'ai'],
  'saas': ['enterprise', 'devtools', 'ai', 'b2b'],
  'enterprise': ['saas', 'ai', 'devtools', 'fintech'],
  'consumer': ['marketplace', 'ecommerce', 'gaming', 'foodtech'],
  'marketplace': ['consumer', 'saas', 'ecommerce', 'logistics'],
  'devtools': ['ai', 'saas', 'enterprise', 'infrastructure'],
  'climatetech': ['hardware', 'enterprise', 'logistics', 'proptech'],
  'crypto': ['fintech', 'consumer', 'gaming'],
  'gaming': ['consumer', 'crypto', 'ai'],
  'ecommerce': ['consumer', 'marketplace', 'logistics'],
  'proptech': ['fintech', 'marketplace', 'climatetech'],
  'logistics': ['enterprise', 'ecommerce', 'climatetech'],
  'foodtech': ['consumer', 'climatetech', 'logistics']
};

// ============ STAGE MAPPING ============

const STAGE_MAP = {
  'pre-seed': 0,
  'angel': 0,
  'seed': 1,
  'series a': 2,
  'series-a': 2,
  'series b': 3,
  'series-b': 3,
  'series c': 4,
  'series-c': 4,
  'series d': 5,
  'series-d': 5,
  'growth': 5,
  'late': 6,
  'late stage': 6
};

// ============ HELPER FUNCTIONS ============

function normalizeSector(sector) {
  if (!sector) return '';
  return sector.toString().toLowerCase().trim();
}

function getSectorKey(sector) {
  const normalized = normalizeSector(sector);
  
  // Direct match
  if (SECTOR_SYNONYMS[normalized]) return normalized;
  
  // Check synonyms
  for (const [key, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
    if (synonyms.some(s => normalized.includes(s) || s.includes(normalized))) {
      return key;
    }
  }
  
  // Partial match on key
  for (const key of Object.keys(SECTOR_SYNONYMS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return key;
    }
  }
  
  return normalized;
}

function getInvestorStageNums(stages) {
  if (!stages) return [];
  const stageArray = Array.isArray(stages) ? stages : [stages];
  return stageArray
    .map(s => STAGE_MAP[normalizeSector(s)])
    .filter(n => n !== undefined);
}

// ============ SCORING FUNCTIONS ============

function calculateSectorScore(startup, investor) {
  const startupSectors = (startup.sectors || []).map(getSectorKey).filter(Boolean);
  const investorSectors = (investor.sectors || []).map(getSectorKey).filter(Boolean);
  
  if (startupSectors.length === 0) {
    return { score: 3, reason: 'unknown_startup_sectors' };
  }
  
  if (investorSectors.length === 0) {
    return { score: 5, reason: 'unknown_investor_sectors' };
  }
  
  // Check for exact match - HIGH reward
  for (const ss of startupSectors) {
    if (investorSectors.includes(ss)) {
      return { score: 35, reason: 'exact_match', match: ss };
    }
  }
  
  // Check for adjacent sectors - MODERATE reward
  for (const ss of startupSectors) {
    const adjacent = SECTOR_ADJACENCY[ss] || [];
    for (const is of investorSectors) {
      if (adjacent.includes(is)) {
        return { score: 15, reason: 'adjacent', startup: ss, investor: is };
      }
    }
  }
  
  // No match - PENALTY
  return { score: 0, reason: 'no_match' };
}

function calculateStageScore(startup, investor) {
  const startupStage = startup.stage;
  const investorStageNums = getInvestorStageNums(investor.stage);
  
  // Unknown startup stage = LOW score (don't assume match)
  if (startupStage === null || startupStage === undefined) {
    return { score: 5, reason: 'unknown_startup_stage' };
  }
  
  if (investorStageNums.length === 0) {
    return { score: 8, reason: 'unknown_investor_stage' };
  }
  
  // Normalize startup stage to number
  const startupStageStr = normalizeSector(startupStage);
  const startupStageNum = STAGE_MAP[startupStageStr] ?? 1;
  
  // Exact stage match
  if (investorStageNums.includes(startupStageNum)) {
    return { score: 20, reason: 'exact_stage' };
  }
  
  // Startup ready for next round (investor invests at next stage)
  if (investorStageNums.includes(startupStageNum + 1)) {
    return { score: 15, reason: 'ready_for_next' };
  }
  
  // One stage apart
  const minDiff = Math.min(...investorStageNums.map(n => Math.abs(n - startupStageNum)));
  if (minDiff === 1) {
    return { score: 8, reason: 'one_stage_off' };
  }
  
  // Two stages apart - PENALTY
  if (minDiff === 2) {
    return { score: 2, reason: 'two_stages_off' };
  }
  
  // More than two stages - STRONG PENALTY
  return { score: 0, reason: 'stage_mismatch' };
}

function calculateCheckSizeScore(startup, investor) {
  const raiseAmount = startup.raise_amount || 0;
  const minCheck = investor.check_size_min || 0;
  const maxCheck = investor.check_size_max || Infinity;
  
  if (raiseAmount === 0) {
    return { score: 5, reason: 'unknown_raise' };
  }
  
  // Ideal: investor check size is 10-30% of round
  const idealMin = raiseAmount * 0.1;
  const idealMax = raiseAmount * 0.3;
  
  // Check is within ideal range
  if (minCheck >= idealMin * 0.5 && maxCheck <= idealMax * 2) {
    return { score: 10, reason: 'ideal_check_size' };
  }
  
  // Check size overlaps with round
  if (maxCheck >= raiseAmount * 0.05 && minCheck <= raiseAmount * 0.5) {
    return { score: 6, reason: 'acceptable_check_size' };
  }
  
  // Check too small or too large
  return { score: 2, reason: 'check_size_mismatch' };
}

function calculateTractionScore(startup, investor) {
  const investorStageNums = getInvestorStageNums(investor.stage);
  const isEarlyStage = investorStageNums.length === 0 || Math.min(...investorStageNums) <= 1;
  
  let score = 0;
  let reasons = [];
  
  // Revenue is king
  if (startup.has_revenue) {
    score += isEarlyStage ? 12 : 15;
    reasons.push('has_revenue');
  } else if (startup.has_customers) {
    score += isEarlyStage ? 8 : 6;
    reasons.push('has_customers');
  } else if (startup.is_launched) {
    score += isEarlyStage ? 4 : 2;
    reasons.push('is_launched');
  } else {
    // Pre-launch - early stage investors okay with this
    score += isEarlyStage ? 2 : 0;
    reasons.push('pre_launch');
  }
  
  return { score: Math.min(15, score), reasons };
}

function calculateGodScoreBonus(startup) {
  const godScore = startup.total_god_score || 0;
  
  if (godScore >= 65) return { score: 15, tier: 'exceptional' };
  if (godScore >= 58) return { score: 12, tier: 'strong' };
  if (godScore >= 50) return { score: 8, tier: 'good' };
  if (godScore >= 40) return { score: 4, tier: 'moderate' };
  if (godScore >= 30) return { score: 2, tier: 'weak' };
  return { score: 0, tier: 'poor' };
}

// ============ MAIN SCORING FUNCTION ============

function calculateMatchScore(startup, investor) {
  const sectorResult = calculateSectorScore(startup, investor);
  const stageResult = calculateStageScore(startup, investor);
  const checkResult = calculateCheckSizeScore(startup, investor);
  const tractionResult = calculateTractionScore(startup, investor);
  const godResult = calculateGodScoreBonus(startup);
  
  // Base score starts at 0
  let totalScore = 0;
  
  // Add component scores
  totalScore += sectorResult.score;    // 0-35
  totalScore += stageResult.score;     // 0-20
  totalScore += checkResult.score;     // 0-10
  totalScore += tractionResult.score;  // 0-15
  totalScore += godResult.score;       // 0-15
  
  // Max possible: 100
  // Clamp to valid range
  totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));
  
  // Determine confidence
  let confidence = 'medium';
  if (sectorResult.reason === 'exact_match' && stageResult.reason === 'exact_stage') {
    confidence = 'high';
  } else if (sectorResult.reason === 'no_match' || stageResult.reason === 'stage_mismatch') {
    confidence = 'low';
  }
  
  return {
    score: totalScore,
    confidence,
    breakdown: {
      sector: sectorResult,
      stage: stageResult,
      checkSize: checkResult,
      traction: tractionResult,
      godScore: godResult
    }
  };
}

// ============ BATCH PROCESSING ============

async function loadAllData() {
  console.log('📥 Loading startups...');
  let startups = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('id, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, raise_amount')
      .eq('status', 'approved')
      .range(offset, offset + 999);
    if (error) { console.error('Startup error:', error); break; }
    if (!data || data.length === 0) break;
    startups = startups.concat(data);
    offset += 1000;
  }
  console.log(`   Loaded ${startups.length} startups`);
  
  console.log('📥 Loading investors...');
  let investors = [];
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('investors')
      .select('id, sectors, stage, check_size_min, check_size_max')
      .eq('status', 'active')
      .range(offset, offset + 999);
    if (error) { console.error('Investor error:', error); break; }
    if (!data || data.length === 0) break;
    investors = investors.concat(data);
    offset += 1000;
  }
  console.log(`   Loaded ${investors.length} investors`);
  
  return { startups, investors };
}

async function rescoreAllMatches() {
  console.log('═'.repeat(60));
  console.log('🔄 INTELLIGENT MATCHING v3');
  console.log('═'.repeat(60));
  console.log('');
  
  const { startups, investors } = await loadAllData();
  
  const startupMap = new Map(startups.map(s => [s.id, s]));
  const investorMap = new Map(investors.map(i => [i.id, i]));
  
  // Get total count first
  const { count: totalMatches } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total matches to process: ${(totalMatches || 0).toLocaleString()}`);
  
  let offset = 0;
  let updated = 0;
  let processed = 0;
  let skipped = 0;
  const batchSize = 1000; // Smaller batches for reliability
  
  console.log('🔄 Re-scoring matches...\n');
  
  while (offset < (totalMatches || 1500000)) {
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score')
      .range(offset, offset + batchSize - 1);
    
    if (error) { 
      console.error('Match error:', error); 
      // Retry once
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    if (!matches || matches.length === 0) break;
    
    const updates = [];
    
    for (const match of matches) {
      const startup = startupMap.get(match.startup_id);
      const investor = investorMap.get(match.investor_id);
      
      if (!startup || !investor) {
        skipped++;
        continue;
      }
      
      const result = calculateMatchScore(startup, investor);
      processed++;
      
      // Always update to ensure new scoring
      updates.push({
        id: match.id,
        match_score: result.score,
        confidence_level: result.confidence
      });
    }
    
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('startup_investor_matches')
        .upsert(updates);
      
      if (updateError) {
        console.error('Update error:', updateError.message);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        updated += updates.length;
      }
    }
    
    offset += batchSize;
    if (offset % 50000 === 0) {
      const pct = totalMatches ? Math.round(offset / totalMatches * 100) : 0;
      console.log(`   ${pct}% | Processed ${offset.toLocaleString()} | Updated ${updated.toLocaleString()}`);
    }
    
    if (matches.length < batchSize) break;
  }
  
  console.log(`\n✅ Done!`);
  console.log(`   Processed: ${processed.toLocaleString()}`);
  console.log(`   Updated: ${updated.toLocaleString()}`);
  console.log(`   Skipped: ${skipped.toLocaleString()}`);
  
  // Show distribution
  await showDistribution();
}

async function showDistribution() {
  console.log('\n📊 NEW DISTRIBUTION:');
  
  const { data: scores } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(50000);
  
  const buckets = {
    '0-20': 0,
    '21-35': 0,
    '36-50': 0,
    '51-65': 0,
    '66-80': 0,
    '81-100': 0
  };
  
  let sum = 0;
  let count = 0;
  
  for (const row of scores || []) {
    const sc = row.match_score || 0;
    sum += sc;
    count++;
    
    if (sc <= 20) buckets['0-20']++;
    else if (sc <= 35) buckets['21-35']++;
    else if (sc <= 50) buckets['36-50']++;
    else if (sc <= 65) buckets['51-65']++;
    else if (sc <= 80) buckets['66-80']++;
    else buckets['81-100']++;
  }
  
  for (const [range, cnt] of Object.entries(buckets)) {
    const pct = count > 0 ? (cnt / count * 100).toFixed(1) : 0;
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`   ${range.padEnd(7)}: ${bar} ${pct}%`);
  }
  
  console.log(`\n   Average: ${count > 0 ? (sum / count).toFixed(1) : 0}`);
  
  // Target comparison
  console.log('\n📎 Target Distribution:');
  console.log('   0-20:   ~5%  (poor fit)');
  console.log('   21-35:  ~15% (weak fit)');
  console.log('   36-50:  ~35% (moderate fit)');
  console.log('   51-65:  ~30% (good fit)');
  console.log('   66-80:  ~12% (strong fit)');
  console.log('   81-100: ~3%  (exceptional)');
}

// ============ TEST FUNCTION ============

async function testScoring() {
  console.log('═'.repeat(60));
  console.log('🧪 TESTING INTELLIGENT MATCHING');
  console.log('═'.repeat(60));
  console.log('');
  
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, raise_amount')
    .eq('status', 'approved')
    .limit(3);
  
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, sectors, stage, check_size_min, check_size_max')
    .eq('status', 'active')
    .limit(5);
  
  for (const startup of startups) {
    console.log(`\n📍 ${startup.name || startup.id.slice(0, 8)}`);
    console.log(`   Sectors: ${JSON.stringify(startup.sectors)}`);
    console.log(`   Stage: ${startup.stage}, GOD: ${startup.total_god_score}`);
    
    for (const investor of investors) {
      const result = calculateMatchScore(startup, investor);
      const invName = (investor.name || investor.id).slice(0, 25);
      console.log(`   → ${invName.padEnd(25)} Score: ${result.score.toString().padStart(2)} | Sector: ${result.breakdown.sector.reason}, Stage: ${result.breakdown.stage.reason}`);
    }
  }
}

// ============ MAIN ============

const args = process.argv.slice(2);

if (args.includes('--test')) {
  testScoring().catch(console.error);
} else {
  rescoreAllMatches().catch(console.error);
}

