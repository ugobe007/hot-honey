#!/usr/bin/env node
/**
 * INTELLIGENT MATCHING v13
 * ========================
 * 
 * FIX: Missing velocity data = neutral (not 0)
 * - If we have velocity signals, use them as bonus
 * - If no data, give baseline score
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

function normalizeSector(sector) {
  if (!sector) return '';
  return sector.toString().toLowerCase().trim();
}

function getSectorKey(sector) {
  const normalized = normalizeSector(sector);
  if (SECTOR_SYNONYMS[normalized]) return normalized;
  for (const [key, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
    if (synonyms.some(s => normalized.includes(s) || s.includes(normalized))) return key;
  }
  for (const key of Object.keys(SECTOR_SYNONYMS)) {
    if (normalized.includes(key) || key.includes(normalized)) return key;
  }
  return normalized;
}

function getInvestorStageNums(stages) {
  if (!stages) return [];
  const stageArray = Array.isArray(stages) ? stages : [stages];
  return stageArray.map(s => STAGE_MAP[normalizeSector(s)]).filter(n => n !== undefined);
}

/**
 * VELOCITY SCORE (0-15 bonus on top of 8 baseline)
 * Baseline 8 = no data (neutral)
 * 8-23 range based on signals
 */
function calculateVelocityScore(startup) {
  let bonus = 0;
  let signals = [];
  let hasAnyData = false;
  
  // 1. Speed to MVP (0-4)
  const daysToMvp = startup.days_from_idea_to_mvp;
  if (daysToMvp !== null && daysToMvp !== undefined && daysToMvp > 0) {
    hasAnyData = true;
    if (daysToMvp <= 30) { bonus += 4; signals.push('mvp<30d'); }
    else if (daysToMvp <= 60) { bonus += 3; signals.push('mvp<60d'); }
    else if (daysToMvp <= 90) { bonus += 2; signals.push('mvp<90d'); }
    else if (daysToMvp <= 180) { bonus += 1; signals.push('mvp<6mo'); }
  }
  
  // 2. Time to first revenue (0-3)
  const monthsToRevenue = startup.time_to_first_revenue_months;
  if (monthsToRevenue !== null && monthsToRevenue !== undefined && monthsToRevenue > 0) {
    hasAnyData = true;
    if (monthsToRevenue <= 3) { bonus += 3; signals.push('rev<3mo'); }
    else if (monthsToRevenue <= 6) { bonus += 2; signals.push('rev<6mo'); }
    else if (monthsToRevenue <= 12) { bonus += 1; signals.push('rev<12mo'); }
  }
  
  // 3. Deployment frequency (0-3)
  const deployFreq = startup.deployment_frequency;
  if (deployFreq && deployFreq !== 'rarely' && deployFreq !== 'never') {
    hasAnyData = true;
    if (deployFreq === 'daily' || deployFreq === 'continuous') { bonus += 3; signals.push('deploy:daily'); }
    else if (deployFreq === 'weekly') { bonus += 2; signals.push('deploy:weekly'); }
    else if (deployFreq === 'monthly') { bonus += 1; signals.push('deploy:monthly'); }
  }
  
  // 4. Growth rate (0-3)
  const growthRate = startup.growth_rate_monthly || startup.arr_growth_rate || 0;
  if (growthRate > 0) {
    hasAnyData = true;
    if (growthRate >= 30) { bonus += 3; signals.push('growth>30%'); }
    else if (growthRate >= 15) { bonus += 2; signals.push('growth>15%'); }
    else if (growthRate >= 5) { bonus += 1; signals.push('growth>5%'); }
  }
  
  // 5. Pivot speed (0-2)
  const pivotSpeed = startup.pivot_speed_days;
  if (pivotSpeed !== null && pivotSpeed !== undefined && pivotSpeed > 0) {
    hasAnyData = true;
    if (pivotSpeed <= 14) { bonus += 2; signals.push('pivot<2wk'); }
    else if (pivotSpeed <= 30) { bonus += 1; signals.push('pivot<1mo'); }
  }
  
  // Baseline: 8 (neutral if no data)
  // With data: 8 + bonus (up to 23)
  const baseline = 8;
  const score = baseline + bonus;
  
  return { score, bonus, signals, hasData: hasAnyData };
}

function calculateMatchScore(startup, investor) {
  let score = 0;
  
  const startupSectors = (startup.sectors || []).map(getSectorKey).filter(Boolean);
  const investorSectors = (investor.sectors || []).map(getSectorKey).filter(Boolean);
  
  // SECTOR: 0 to 22
  let sectorReason = 'unknown';
  if (startupSectors.length === 0 || investorSectors.length === 0) {
    score += 10;
    sectorReason = startupSectors.length === 0 ? 'unknown_startup' : 'unknown_investor';
  } else {
    const exactMatch = startupSectors.some(ss => investorSectors.includes(ss));
    if (exactMatch) {
      score += 22;
      sectorReason = 'exact_match';
    } else {
      let adjacent = false;
      for (const ss of startupSectors) {
        const adj = SECTOR_ADJACENCY[ss] || [];
        if (investorSectors.some(is => adj.includes(is))) { adjacent = true; break; }
      }
      if (adjacent) {
        score += 15;
        sectorReason = 'adjacent';
      } else {
        score += 4;
        sectorReason = 'no_match';
      }
    }
  }
  
  // STAGE: 0 to 22
  const startupStage = startup.stage;
  const investorStageNums = getInvestorStageNums(investor.stage);
  let stageReason = 'unknown';
  
  if (startupStage === null || startupStage === undefined) {
    score += 10;
    stageReason = 'unknown_startup_stage';
  } else if (investorStageNums.length === 0) {
    score += 14;
    stageReason = 'investor_stage_agnostic';
  } else if (investorStageNums.includes(startupStage)) {
    score += 22;
    stageReason = 'exact_stage';
  } else if (investorStageNums.includes(startupStage + 1)) {
    score += 18;
    stageReason = 'ready_for_next';
  } else {
    const minDiff = Math.min(...investorStageNums.map(n => Math.abs(n - startupStage)));
    if (minDiff === 1) {
      score += 11;
      stageReason = 'one_stage_off';
    } else if (minDiff === 2) {
      score += 6;
      stageReason = 'two_stages_off';
    } else {
      score += 3;
      stageReason = 'stage_mismatch';
    }
  }
  
  // VELOCITY: 8-23 (baseline 8 if no data)
  const velocityResult = calculateVelocityScore(startup);
  score += velocityResult.score;
  
  // TRACTION: 0-12
  if (startup.has_revenue) score += 12;
  else if (startup.has_customers) score += 7;
  else if (startup.is_launched) score += 3;
  
  // GOD SCORE: 0-8
  const godScore = startup.total_god_score || 0;
  if (godScore >= 65) score += 8;
  else if (godScore >= 55) score += 6;
  else if (godScore >= 45) score += 4;
  else if (godScore >= 35) score += 2;
  
  // CHECK SIZE: 0-6
  const raiseAmount = startup.raise_amount || 0;
  const minCheck = investor.check_size_min || 0;
  const maxCheck = investor.check_size_max || Infinity;
  if (raiseAmount > 0 && maxCheck < Infinity) {
    const idealMin = raiseAmount * 0.1, idealMax = raiseAmount * 0.3;
    if (minCheck >= idealMin * 0.5 && maxCheck <= idealMax * 2) score += 6;
    else if (maxCheck >= raiseAmount * 0.05 && minCheck <= raiseAmount * 0.5) score += 4;
    else score += 2;
  } else {
    score += 3;
  }
  
  // Raw range: ~15-93
  // Map to 10-80
  const minRaw = 15, maxRaw = 93;
  const minOut = 10, maxOut = 80;
  const normalized = minOut + ((score - minRaw) / (maxRaw - minRaw)) * (maxOut - minOut);
  const finalScore = Math.min(80, Math.max(10, Math.round(normalized)));
  
  let confidence = 'medium';
  if (sectorReason === 'exact_match' && (stageReason === 'exact_stage' || stageReason === 'ready_for_next')) confidence = 'high';
  else if (sectorReason === 'no_match' && stageReason === 'stage_mismatch') confidence = 'low';
  
  return { 
    rawScore: score, 
    score: finalScore, 
    confidence, 
    breakdown: { sector: sectorReason, stage: stageReason, velocity: velocityResult.score },
    velocitySignals: velocityResult.signals
  };
}

async function loadAllInvestors() {
  let investors = [], offset = 0;
  while (true) {
    const { data } = await supabase.from('investors').select('id, name, sectors, stage, check_size_min, check_size_max').eq('status', 'active').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    investors = investors.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  return investors;
}

async function loadStartups(limit = 5) {
  const { data } = await supabase.from('startup_uploads')
    .select('id, name, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, raise_amount, days_from_idea_to_mvp, time_to_first_revenue_months, deployment_frequency, growth_rate_monthly, arr_growth_rate, pivot_speed_days, features_shipped_last_month')
    .eq('status', 'approved')
    .limit(limit);
  return data || [];
}

async function runTest() {
  console.log('Testing v13 (velocity baseline = 8)...');
  const startups = await loadStartups(100);
  const investors = await loadAllInvestors();
  console.log('Loaded ' + startups.length + ' startups, ' + investors.length + ' investors');
  
  // Show velocity breakdown
  console.log('\nVelocity samples:');
  for (const s of startups.slice(0, 5)) {
    const v = calculateVelocityScore(s);
    const signalStr = v.signals.length > 0 ? v.signals.join(', ') : 'no data (baseline)';
    console.log('  ' + s.name.substring(0, 25).padEnd(27) + ' velocity: ' + v.score + '/23  [' + signalStr + ']');
  }
  
  const buckets = { '0-20': 0, '21-35': 0, '36-50': 0, '51-65': 0, '66-80': 0 };
  let total = 0, sum = 0;
  
  for (const startup of startups) {
    for (const investor of investors.slice(0, 100)) {
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
  
  console.log('\nDistribution:');
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = (count / total * 100).toFixed(1);
    console.log('  ' + range + ': ' + pct + '%');
  });
  console.log('  Average: ' + (sum / total).toFixed(1));
  console.log('\nTarget: 0-20: ~5%, 21-35: ~15%, 36-50: ~35%, 51-65: ~30%, 66-80: ~15%');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--test')) await runTest();
  else console.log('Usage: node intelligent-matching-v13.js --test');
}

main().catch(console.error);
