#!/usr/bin/env node
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

function calculateMatchScore(startup, investor) {
  let score = 25;
  
  const startupSectors = (startup.sectors || []).map(getSectorKey).filter(Boolean);
  const investorSectors = (investor.sectors || []).map(getSectorKey).filter(Boolean);
  
  let sectorReason = 'unknown';
  if (startupSectors.length === 0 || investorSectors.length === 0) {
    score += 5;
    sectorReason = startupSectors.length === 0 ? 'unknown_startup' : 'unknown_investor';
  } else {
    const exactMatch = startupSectors.some(ss => investorSectors.includes(ss));
    if (exactMatch) {
      score += 25;
      sectorReason = 'exact_match';
    } else {
      let adjacent = false;
      for (const ss of startupSectors) {
        const adj = SECTOR_ADJACENCY[ss] || [];
        if (investorSectors.some(is => adj.includes(is))) { adjacent = true; break; }
      }
      if (adjacent) {
        score += 12;
        sectorReason = 'adjacent';
      } else {
        score -= 8;
        sectorReason = 'no_match';
      }
    }
  }
  
  const startupStage = startup.stage;
  const investorStageNums = getInvestorStageNums(investor.stage);
  let stageReason = 'unknown';
  
  if (startupStage === null || startupStage === undefined) {
    score += 3;
    stageReason = 'unknown_startup_stage';
  } else if (investorStageNums.length === 0) {
    score += 10;
    stageReason = 'investor_stage_agnostic';
  } else if (investorStageNums.includes(startupStage)) {
    score += 20;
    stageReason = 'exact_stage';
  } else if (investorStageNums.includes(startupStage + 1)) {
    score += 12;
    stageReason = 'ready_for_next';
  } else {
    const minDiff = Math.min(...investorStageNums.map(n => Math.abs(n - startupStage)));
    if (minDiff === 1) {
      score += 4;
      stageReason = 'one_stage_off';
    } else if (minDiff === 2) {
      score -= 4;
      stageReason = 'two_stages_off';
    } else {
      score -= 8;
      stageReason = 'stage_mismatch';
    }
  }
  
  if (startup.has_revenue) score += 10;
  else if (startup.has_customers) score += 6;
  else if (startup.is_launched) score += 3;
  
  const godScore = startup.total_god_score || 0;
  if (godScore >= 65) score += 8;
  else if (godScore >= 55) score += 6;
  else if (godScore >= 45) score += 4;
  else if (godScore >= 35) score += 2;
  
  const raiseAmount = startup.raise_amount || 0;
  const minCheck = investor.check_size_min || 0;
  const maxCheck = investor.check_size_max || Infinity;
  if (raiseAmount > 0 && maxCheck < Infinity) {
    const idealMin = raiseAmount * 0.1, idealMax = raiseAmount * 0.3;
    if (minCheck >= idealMin * 0.5 && maxCheck <= idealMax * 2) score += 7;
    else if (maxCheck >= raiseAmount * 0.05 && minCheck <= raiseAmount * 0.5) score += 4;
  } else {
    score += 3;
  }
  
  const finalScore = Math.min(80, Math.max(10, score));
  
  let confidence = 'medium';
  if (sectorReason === 'exact_match' && (stageReason === 'exact_stage' || stageReason === 'ready_for_next')) confidence = 'high';
  else if (sectorReason === 'no_match' && (stageReason === 'stage_mismatch' || stageReason === 'two_stages_off')) confidence = 'low';
  
  return { rawScore: score, score: finalScore, confidence, breakdown: { sector: sectorReason, stage: stageReason } };
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
  const { data } = await supabase.from('startup_uploads').select('id, name, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, raise_amount').eq('status', 'approved').limit(limit);
  return data || [];
}

async function runTest() {
  console.log('Testing v8...');
  const startups = await loadStartups(100);
  const investors = await loadAllInvestors();
  console.log('Loaded ' + startups.length + ' startups, ' + investors.length + ' investors');
  
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
  
  console.log('\nResult:');
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
  else console.log('Usage: node intelligent-matching-v8.js --test');
}

main().catch(console.error);
