#!/usr/bin/env node
/**
 * INTELLIGENT MATCHING v4
 * =======================
 * 
 * Changes from v3:
 * 1. Tighter stage tolerance - being off by 1 stage now gives less credit
 * 2. Sigmoid compression - scores above 55 get compressed to spread distribution
 * 3. Maintains defensible scores - all points are earned, not suppressed
 * 
 * Target Distribution:
 *   0-20:   ~5%  (truly poor fit)
 *   21-35:  ~15% (weak fit)
 *   36-50:  ~35% (moderate fit)
 *   51-65:  ~30% (good fit)
 *   66-80:  ~15% (strong fit)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
  'ai': ['devtools', 'enterprise', 'saas', 'healthtech', 'fintech'],
  'fintech': ['crypto', 'enterprise', 'saas', 'insurtech'],
  'healthtech': ['biotech', 'ai', 'consumer', 'enterprise'],
  'edtech': ['consumer', 'saas', 'ai'],
  'saas': ['enterprise', 'devtools', 'ai', 'b2b'],
  'enterprise': ['saas', 'ai', 'devtools', 'fintech'],
  'consumer': ['marketplace', 'ecommerce', 'gaming', 'foodtech', 'edtech'],
  'marketplace': ['consumer', 'saas', 'ecommerce', 'logistics'],
  'devtools': ['ai', 'saas', 'enterprise', 'infrastructure'],
  'climatetech': ['hardware', 'enterprise', 'logistics', 'proptech'],
  'crypto': ['fintech', 'consumer', 'gaming'],
  'gaming': ['consumer', 'crypto', 'ai'],
  'ecommerce': ['consumer', 'marketplace', 'logistics'],
  'proptech': ['fintech', 'marketplace', 'climatetech'],
  'logistics': ['enterprise', 'ecommerce', 'climatetech'],
  'foodtech': ['consumer', 'climatetech', 'logistics'],
  'robotics': ['ai', 'enterprise', 'logistics', 'healthcare'],
  'technology': ['saas', 'enterprise', 'ai', 'devtools']
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
 * SIGMOID COMPRESSION
 * Compresses scores above threshold to spread the distribution
 * 
 * Formula: For scores > threshold:
 *   compressed = threshold + (maxOutput - threshold) * sigmoid((raw - threshold) / scale)
 * 
 * This keeps low/mid scores linear but compresses high scores
 */
function compressScore(rawScore) {
  const threshold = 50;  // Start compression above this
  const maxOutput = 80;  // Maximum compressed output
  const scale = 15;      // How aggressive the compression is
  
  if (rawScore <= threshold) {
    return rawScore;
  }
  
  // Sigmoid: 1 / (1 + e^(-x))
  const x = (rawScore - threshold) / scale;
  const sigmoid = 1 / (1 + Math.exp(-x));
  
  // Map sigmoid (0.5 to ~1) to (threshold to maxOutput)
  // When rawScore = threshold, sigmoid ≈ 0.5, output = threshold
  // When rawScore = 100, sigmoid ≈ 0.97, output ≈ maxOutput
  const compressed = threshold + (maxOutput - threshold) * (sigmoid - 0.5) * 2;
  
  return Math.round(compressed);
}

// ============ SCORING FUNCTIONS ============

function calculateMatchScore(startup, investor) {
  let rawScore = 0;
  
  // 1. SECTOR SCORE (0-25) - unchanged
  const startupSectors = (startup.sectors || []).map(getSectorKey).filter(Boolean);
  const investorSectors = (investor.sectors || []).map(getSectorKey).filter(Boolean);
  
  let sectorScore = 0;
  let sectorReason = 'unknown';
  
  if (startupSectors.length === 0) {
    sectorScore = 3;
    sectorReason = 'unknown_startup';
  } else if (investorSectors.length === 0) {
    sectorScore = 5;
    sectorReason = 'unknown_investor';
  } else {
    const exactMatch = startupSectors.some(ss => investorSectors.includes(ss));
    if (exactMatch) {
      sectorScore = 25;
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
      sectorScore = adjacent ? 10 : 0;
      sectorReason = adjacent ? 'adjacent' : 'no_match';
    }
  }
  rawScore += sectorScore;
  
  // 2. STAGE SCORE (0-15) - TIGHTENED
  // v3: exact=15, next=10, off_by_1=5
  // v4: exact=15, next=8, off_by_1=2, off_by_2+=0
  const startupStage = startup.stage;
  const investorStageNums = getInvestorStageNums(investor.stage);
  
  let stageScore = 0;
  let stageReason = 'unknown';
  
  if (startupStage === null || startupStage === undefined) {
    stageScore = 4;  // Reduced from 5
    stageReason = 'unknown_startup_stage';
  } else if (investorStageNums.length === 0) {
    stageScore = 6;  // Reduced from 8
    stageReason = 'unknown_investor_stage';
  } else if (investorStageNums.includes(startupStage)) {
    stageScore = 15;
    stageReason = 'exact_stage';
  } else if (investorStageNums.includes(startupStage + 1)) {
    stageScore = 8;  // Reduced from 10 - startup ready for next round
    stageReason = 'ready_for_next';
  } else {
    const minDiff = Math.min(...investorStageNums.map(n => Math.abs(n - startupStage)));
    if (minDiff === 1) {
      stageScore = 2;  // Reduced from 5 - one stage off (investor behind)
      stageReason = 'one_stage_off';
    } else {
      stageScore = 0;  // 2+ stages off = no credit
      stageReason = 'stage_mismatch';
    }
  }
  rawScore += stageScore;
  
  // 3. TRACTION SCORE (0-10) - unchanged
  let tractionScore = 0;
  if (startup.has_revenue) tractionScore = 10;
  else if (startup.has_customers) tractionScore = 5;
  else if (startup.is_launched) tractionScore = 2;
  rawScore += tractionScore;
  
  // 4. GOD SCORE BONUS (0-12) - unchanged
  const godScore = startup.total_god_score || 0;
  let godBonus = 0;
  if (godScore >= 70) godBonus = 12;
  else if (godScore >= 60) godBonus = 8;
  else if (godScore >= 50) godBonus = 5;
  else if (godScore >= 40) godBonus = 2;
  rawScore += godBonus;
  
  // 5. CHECK SIZE FIT (0-10) - unchanged
  let checkScore = 5;
  const raiseAmount = startup.raise_amount || 0;
  const minCheck = investor.check_size_min || 0;
  const maxCheck = investor.check_size_max || Infinity;
  
  if (raiseAmount > 0 && maxCheck < Infinity) {
    const idealMin = raiseAmount * 0.1;
    const idealMax = raiseAmount * 0.3;
    if (minCheck >= idealMin * 0.5 && maxCheck <= idealMax * 2) {
      checkScore = 10;
    } else if (maxCheck >= raiseAmount * 0.05 && minCheck <= raiseAmount * 0.5) {
      checkScore = 6;
    } else {
      checkScore = 2;
    }
  }
  rawScore += checkScore;
  
  // APPLY SIGMOID COMPRESSION
  const finalScore = compressScore(rawScore);
  
  // Determine confidence
  let confidence = 'medium';
  if (sectorReason === 'exact_match' && stageReason === 'exact_stage') {
    confidence = 'high';
  } else if (sectorReason === 'no_match' || stageReason === 'stage_mismatch') {
    confidence = 'low';
  }
  
  return {
    rawScore,
    score: Math.min(80, Math.max(0, finalScore)),  // Cap at 80 due to compression
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
  console.log('🧪 TESTING INTELLIGENT MATCHING v4');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Changes from v3:');
  console.log('  - Stage tolerance tightened (off_by_1: 5→2)');
  console.log('  - Sigmoid compression above 50 (max output: 80)');
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
      const name = investor.name || investor.id.slice(0, 8);
      console.log(`   → ${name.padEnd(30)} Raw: ${result.rawScore.toString().padStart(2)} → Final: ${result.score} | ${result.breakdown.sector}, ${result.breakdown.stage}`);
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
  console.log('🔄 RESCORING ALL MATCHES WITH v4 ALGORITHM');
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
    console.log('  node intelligent-matching-v4.js --test     Test algorithm with sample data');
    console.log('  node intelligent-matching-v4.js --rescore  Rescore all existing matches');
  }
}

main().catch(console.error);
