#!/usr/bin/env node
/**
 * INTELLIGENT MATCHING v5
 * =======================
 * 
 * Changes from v4:
 * 1. Base score of 15 - everyone starts here (benefit of the doubt)
 * 2. Unknown stage/sector gets reasonable points (not penalized for sparse data)
 * 3. Adjusted sigmoid - centers distribution around 45-50
 * 4. Stage tolerance remains tight for KNOWN mismatches
 * 
 * Target Distribution:
 *   0-20:   ~5%  (truly poor fit - confirmed mismatches)
 *   21-35:  ~15% (weak fit)
 *   36-50:  ~35% (moderate fit - includes unknowns)
 *   51-65:  ~30% (good fit)
 *   66-80:  ~15% (strong fit - confirmed matches)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============ SECTOR INTELLIGENCE ============

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
  'foodtech': ['food tech', 'food & beverage', 'agtech', 'agriculture'],
  'robotics': ['robots', 'automation', 'industrial automation'],
  'technology': ['tech', 'software', 'saas', 'enterprise']
};

const SECTOR_ADJACENCY = {
  'ai': ['devtools', 'enterprise', 'saas', 'healthtech', 'fintech', 'robotics', 'technology'],
  'fintech': ['crypto', 'enterprise', 'saas', 'insurtech', 'consumer'],
  'healthtech': ['biotech', 'ai', 'consumer', 'enterprise'],
  'edtech': ['consumer', 'saas', 'ai', 'enterprise'],
  'saas': ['enterprise', 'devtools', 'ai', 'b2b', 'technology'],
  'enterprise': ['saas', 'ai', 'devtools', 'fintech', 'technology'],
  'consumer': ['marketplace', 'ecommerce', 'gaming', 'foodtech', 'edtech', 'fintech'],
  'marketplace': ['consumer', 'saas', 'ecommerce', 'logistics'],
  'devtools': ['ai', 'saas', 'enterprise', 'infrastructure', 'technology'],
  'climatetech': ['hardware', 'enterprise', 'logistics', 'proptech', 'foodtech'],
  'crypto': ['fintech', 'consumer', 'gaming', 'ai'],
  'gaming': ['consumer', 'crypto', 'ai', 'entertainment'],
  'ecommerce': ['consumer', 'marketplace', 'logistics', 'retail'],
  'proptech': ['fintech', 'marketplace', 'climatetech', 'consumer'],
  'logistics': ['enterprise', 'ecommerce', 'climatetech', 'saas'],
  'foodtech': ['consumer', 'climatetech', 'logistics', 'healthtech'],
  'robotics': ['ai', 'enterprise', 'logistics', 'healthcare', 'hardware'],
  'technology': ['saas', 'enterprise', 'ai', 'devtools', 'consumer']
};

const STAGE_MAP = {
  'pre-seed': 0, 'angel': 0, 'seed': 1, 'series a': 2, 'series-a': 2,
  'series b': 3, 'series-b': 3, 'series c': 4, 'series-c': 4,
  'series d': 5, 'series-d': 5, 'growth': 5, 'late': 6, 'late stage': 6
};

// ============ HELPER FUNCTIONS ============

function normalizeSector(sector) {
  if (!sector) return '';
  return sector.toString().toLowerCase().trim();
}

function getSectorKey(sector) {
  const normalized = normalizeSector(sector);
  if (SECTOR_SYNONYMS[normalized]) return normalized;
  
  for (const [key, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
    if (synonyms.some(s => normalized.includes(s) || s.includes(normalized))) {
      return key;
    }
  }
  
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

/**
 * ADJUSTED SIGMOID COMPRESSION
 * Centers distribution around 45-50
 * 
 * - Scores 0-30: slight boost (poor matches stay low but not too low)
 * - Scores 30-50: linear zone
 * - Scores 50-72: compressed to 50-80
 */
function adjustScore(rawScore) {
  // Floor: minimum score is 8 (truly bad matches)
  if (rawScore < 15) {
    return Math.max(8, rawScore);
  }
  
  // Low scores get a small boost to avoid clustering at bottom
  if (rawScore < 30) {
    return Math.round(15 + (rawScore - 15) * 1.2);
  }
  
  // Mid range: linear
  if (rawScore <= 50) {
    return rawScore;
  }
  
  // High scores: sigmoid compression
  const threshold = 50;
  const maxOutput = 80;
  const scale = 12;
  
  const x = (rawScore - threshold) / scale;
  const sigmoid = 1 / (1 + Math.exp(-x));
  const compressed = threshold + (maxOutput - threshold) * (sigmoid - 0.5) * 2;
  
  return Math.round(compressed);
}

// ============ SCORING FUNCTIONS ============

function calculateMatchScore(startup, investor) {
  // BASE SCORE: 15 points
  // Philosophy: Unknown is not bad, it's just unknown
  let rawScore = 15;
  
  const startupSectors = (startup.sectors || []).map(getSectorKey).filter(Boolean);
  const investorSectors = (investor.sectors || []).map(getSectorKey).filter(Boolean);
  
  // 1. SECTOR SCORE (-5 to +20)
  // Can subtract from base if confirmed mismatch
  let sectorScore = 0;
  let sectorReason = 'unknown';
  
  if (startupSectors.length === 0 || investorSectors.length === 0) {
    // Unknown - neutral, keep base score
    sectorScore = 0;
    sectorReason = startupSectors.length === 0 ? 'unknown_startup' : 'unknown_investor';
  } else {
    const exactMatch = startupSectors.some(ss => investorSectors.includes(ss));
    if (exactMatch) {
      sectorScore = 20;
      sectorReason = 'exact_match';
    } else {
      let adjacent = false;
      for (const ss of startupSectors) {
        const adj = SECTOR_ADJACENCY[ss] || [];
        if (investorSectors.some(is => adj.includes(is))) {
          adjacent = true;
          break;
        }
      }
      if (adjacent) {
        sectorScore = 10;
        sectorReason = 'adjacent';
      } else {
        sectorScore = -5;  // Confirmed mismatch - penalize
        sectorReason = 'no_match';
      }
    }
  }
  rawScore += sectorScore;
  
  // 2. STAGE SCORE (-5 to +15)
  // Normalize startup stage to number (handle both string and numeric)
  let startupStageNum = null;
  if (startup.stage !== null && startup.stage !== undefined) {
    if (typeof startup.stage === 'string') {
      startupStageNum = STAGE_MAP[normalizeSector(startup.stage)];
    } else {
      startupStageNum = startup.stage;
    }
  }
  
  const investorStageNums = getInvestorStageNums(investor.stage);
  
  let stageScore = 0;
  let stageReason = 'unknown';
  
  if (startupStageNum === null || startupStageNum === undefined) {
    // Unknown startup stage - neutral
    stageScore = 0;
    stageReason = 'unknown_startup_stage';
  } else if (investorStageNums.length === 0) {
    // Investor invests in any stage - slight positive
    stageScore = 5;
    stageReason = 'investor_stage_agnostic';
  } else if (investorStageNums.includes(startupStageNum)) {
    stageScore = 15;
    stageReason = 'exact_stage';
  } else if (investorStageNums.includes(startupStageNum + 1)) {
    stageScore = 10;  // Startup ready for next round investor does
    stageReason = 'ready_for_next';
  } else {
    const minDiff = Math.min(...investorStageNums.map(n => Math.abs(n - startupStageNum)));
    if (minDiff === 1) {
      stageScore = 3;  // One stage off
      stageReason = 'one_stage_off';
    } else {
      stageScore = -5;  // Confirmed mismatch - penalize
      stageReason = 'stage_mismatch';
    }
  }
  rawScore += stageScore;
  
  // 3. TRACTION SCORE (0-10)
  let tractionScore = 0;
  if (startup.has_revenue) tractionScore = 10;
  else if (startup.has_customers) tractionScore = 6;
  else if (startup.is_launched) tractionScore = 3;
  rawScore += tractionScore;
  
  // 4. GOD SCORE BONUS (0-10)
  const godScore = startup.total_god_score || 0;
  let godBonus = 0;
  if (godScore >= 65) godBonus = 10;
  else if (godScore >= 55) godBonus = 7;
  else if (godScore >= 45) godBonus = 4;
  else if (godScore >= 35) godBonus = 2;
  rawScore += godBonus;
  
  // 5. CHECK SIZE FIT (0-7)
  let checkScore = 3;  // Default for unknown
  const raiseAmount = startup.raise_amount || 0;
  const minCheck = investor.check_size_min || 0;
  const maxCheck = investor.check_size_max || Infinity;
  
  if (raiseAmount > 0 && maxCheck < Infinity) {
    const idealMin = raiseAmount * 0.1;
    const idealMax = raiseAmount * 0.3;
    if (minCheck >= idealMin * 0.5 && maxCheck <= idealMax * 2) {
      checkScore = 7;
    } else if (maxCheck >= raiseAmount * 0.05 && minCheck <= raiseAmount * 0.5) {
      checkScore = 4;
    } else {
      checkScore = 0;
    }
  }
  rawScore += checkScore;
  
  // APPLY SCORE ADJUSTMENT
  const finalScore = adjustScore(rawScore);
  
  // Determine confidence
  let confidence = 'medium';
  if (sectorReason === 'exact_match' && (stageReason === 'exact_stage' || stageReason === 'ready_for_next')) {
    confidence = 'high';
  } else if (sectorReason === 'no_match' || stageReason === 'stage_mismatch') {
    confidence = 'low';
  }
  
  return {
    rawScore,
    score: Math.min(80, Math.max(8, finalScore)),
    confidence,
    breakdown: { sector: sectorReason, stage: stageReason }
  };
}

// ============ DATA LOADING ============

async function loadAllInvestors() {
  let investors = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('investors')
      .select('id, name, sectors, stage, check_size_min, check_size_max')
      .eq('status', 'active')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error('Error loading investors:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    
    investors = investors.concat(data);
    offset += batchSize;
    
    if (data.length < batchSize) break;
  }
  
  return investors;
}

async function loadStartups(limit = 5) {
  const { data, error } = await supabase
    .from('startup_uploads')
    .select('id, name, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, raise_amount')
    .eq('status', 'approved')
    .limit(limit);
  
  if (error) {
    console.error('Error loading startups:', error);
    return [];
  }
  return data || [];
}

// ============ TEST MODE ============

async function runTest() {
  console.log('═'.repeat(60));
  console.log('🧪 TESTING INTELLIGENT MATCHING v5');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Changes from v4:');
  console.log('  - Base score of 15 (benefit of the doubt)');
  console.log('  - Unknown stage/sector = neutral (0), not penalty');
  console.log('  - Confirmed mismatches get -5 penalty');
  console.log('  - Low scores boosted slightly to avoid bottom clustering');
  console.log('');
  
  const startups = await loadStartups(5);
  const investors = await loadAllInvestors();
  
  console.log(`Loaded ${startups.length} startups, ${investors.length} investors`);
  console.log('');
  
  // Test each startup against sample investors
  const sampleInvestors = investors.slice(0, 5);
  
  for (const startup of startups) {
    console.log(`\n📍 ${startup.name}`);
    console.log(`   Sectors: ${JSON.stringify(startup.sectors)}`);
    console.log(`   Stage: ${startup.stage}, GOD: ${startup.total_god_score}`);
    
    for (const investor of sampleInvestors) {
      const result = calculateMatchScore(startup, investor);
      const name = (investor.name || investor.id.slice(0, 8)).substring(0, 25);
      console.log(`   → ${name.padEnd(27)} Raw: ${result.rawScore.toString().padStart(2)} → Final: ${result.score.toString().padStart(2)} | ${result.breakdown.sector}, ${result.breakdown.stage}`);
    }
  }
  
  // Show distribution simulation
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SIMULATED DISTRIBUTION (100 startups × 100 investors)');
  console.log('═'.repeat(60));
  
  const moreStartups = await loadStartups(100);
  const moreInvestors = investors.slice(0, 100);
  
  const buckets = { '0-20': 0, '21-35': 0, '36-50': 0, '51-65': 0, '66-80': 0 };
  let total = 0;
  let sum = 0;
  
  for (const startup of moreStartups) {
    for (const investor of moreInvestors) {
      const result = calculateMatchScore(startup, investor);
      sum += result.score;
      total++;
      
      if (result.score <= 20) buckets['0-20']++;
      else if (result.score <= 35) buckets['21-35']++;
      else if (result.score <= 50) buckets['36-50']++;
      else if (result.score <= 65) buckets['51-65']++;
      else buckets['66-80']++;
    }
  }
  
  console.log('');
  console.log('Result:');
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = (count / total * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${range.padEnd(6)}: ${bar} ${pct}%`);
  });
  console.log(`  Average: ${(sum / total).toFixed(1)}`);
  
  console.log('');
  console.log('Target:');
  console.log('  0-20:   ~5%');
  console.log('  21-35:  ~15%');
  console.log('  36-50:  ~35%');
  console.log('  51-65:  ~30%');
  console.log('  66-80:  ~15%');
}

// ============ RESCORE MODE ============

async function rescoreAllMatches() {
  console.log('═'.repeat(60));
  console.log('🔄 RESCORING ALL MATCHES WITH v5 ALGORITHM');
  console.log('═'.repeat(60));
  
  // Load all startups
  console.log('\n📥 Loading startups...');
  let allStartups = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('startup_uploads')
      .select('id, name, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, raise_amount')
      .eq('status', 'approved')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allStartups = allStartups.concat(data);
    offset += 1000;
  }
  console.log(`   Loaded ${allStartups.length} startups`);
  
  // Load all investors
  console.log('📥 Loading investors...');
  const investors = await loadAllInvestors();
  console.log(`   Loaded ${investors.length} investors`);
  
  // Create lookup maps
  const startupMap = new Map(allStartups.map(s => [s.id, s]));
  const investorMap = new Map(investors.map(i => [i.id, i]));
  
  // Get total match count
  const { count: totalMatches } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total matches to rescore: ${totalMatches?.toLocaleString()}`);
  console.log('🔄 Rescoring...\n');
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  const batchSize = 1000;
  
  // Process in batches
  offset = 0;
  while (true) {
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error('Fetch error:', error.message);
      errors++;
      break;
    }
    if (!matches || matches.length === 0) break;
    
    // Calculate new scores
    const updates = [];
    for (const match of matches) {
      const startup = startupMap.get(match.startup_id);
      const investor = investorMap.get(match.investor_id);
      
      if (!startup || !investor) continue;
      
      const result = calculateMatchScore(startup, investor);
      
      // Only update if score changed significantly (>=3 points)
      if (Math.abs(result.score - match.match_score) >= 3) {
        updates.push({
          id: match.id,
          match_score: result.score,
          confidence_level: result.confidence
        });
      }
    }
    
    // Batch update
    if (updates.length > 0) {
      for (let i = 0; i < updates.length; i += 100) {
        const batch = updates.slice(i, i + 100);
        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('startup_investor_matches')
            .update({ match_score: update.match_score, confidence_level: update.confidence_level })
            .eq('id', update.id);
          
          if (updateError) {
            errors++;
          } else {
            updated++;
          }
        }
      }
    }
    
    processed += matches.length;
    offset += batchSize;
    
    // Progress
    const pct = Math.round(processed / totalMatches * 100);
    if (processed % 50000 === 0 || matches.length < batchSize) {
      console.log(`   ${pct}% | Processed ${processed.toLocaleString()} | Updated ${updated.toLocaleString()}`);
    }
    
    if (matches.length < batchSize) break;
  }
  
  console.log(`\n✅ Done!`);
  console.log(`   Processed: ${processed.toLocaleString()}`);
  console.log(`   Updated: ${updated.toLocaleString()}`);
  console.log(`   Errors: ${errors}`);
  
  // Show new distribution
  await showDistribution();
}

async function showDistribution() {
  console.log('\n📊 NEW DISTRIBUTION:');
  
  const { data } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(50000);
  
  if (!data) return;
  
  const buckets = { '0-20': 0, '21-35': 0, '36-50': 0, '51-65': 0, '66-80': 0 };
  let sum = 0;
  
  data.forEach(m => {
    const s = m.match_score || 0;
    sum += s;
    if (s <= 20) buckets['0-20']++;
    else if (s <= 35) buckets['21-35']++;
    else if (s <= 50) buckets['36-50']++;
    else if (s <= 65) buckets['51-65']++;
    else buckets['66-80']++;
  });
  
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = (count / data.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`   ${range.padEnd(6)}: ${bar} ${pct}%`);
  });
  console.log(`   Average: ${(sum / data.length).toFixed(1)}`);
  
  console.log('\n📎 Target Distribution:');
  console.log('   0-20:   ~5%  (poor fit)');
  console.log('   21-35:  ~15% (weak fit)');
  console.log('   36-50:  ~35% (moderate fit)');
  console.log('   51-65:  ~30% (good fit)');
  console.log('   66-80:  ~15% (strong fit)');
}

// ============ MAIN ============

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await runTest();
  } else if (args.includes('--rescore')) {
    await rescoreAllMatches();
  } else {
    console.log('Usage:');
    console.log('  node intelligent-matching-v5.js --test     Test algorithm with sample data');
    console.log('  node intelligent-matching-v5.js --rescore  Rescore all existing matches');
  }
}

main().catch(console.error);
