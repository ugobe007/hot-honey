#!/usr/bin/env node
/**
 * INTELLIGENT MATCHING v15
 * ========================
 * 
 * FIX: Expanded sector synonyms to catch more real matches
 * - Added marketing, legaltech, etc.
 * - More adjacencies
 * - Better normalization
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// EXPANDED sector mapping
const SECTOR_SYNONYMS = {
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative ai', 'gen ai', 'ai/ml', 'aiml'],
  'fintech': ['financial technology', 'financial services', 'payments', 'banking', 'insurtech', 'insurance', 'lending', 'credit'],
  'healthtech': ['health tech', 'healthcare', 'digital health', 'medtech', 'medical technology', 'biotech', 'health', 'medical', 'life sciences'],
  'edtech': ['education', 'education technology', 'e-learning', 'learning', 'edtech'],
  'saas': ['software as a service', 'b2b saas', 'enterprise saas', 'software', 'cloud'],
  'enterprise': ['b2b', 'enterprise software', 'business software', 'business'],
  'consumer': ['b2c', 'consumer tech', 'consumer products', 'd2c', 'direct to consumer', 'consumer software', 'cpg'],
  'marketplace': ['marketplaces', 'platform', 'two-sided marketplace'],
  'devtools': ['developer tools', 'dev tools', 'infrastructure', 'developer infrastructure', 'api', 'developer'],
  'climatetech': ['climate tech', 'cleantech', 'clean tech', 'sustainability', 'green tech', 'energy', 'renewable'],
  'crypto': ['web3', 'blockchain', 'defi', 'cryptocurrency', 'nft'],
  'gaming': ['games', 'game tech', 'esports', 'game'],
  'ecommerce': ['e-commerce', 'retail tech', 'commerce', 'retail', 'shopping'],
  'proptech': ['real estate tech', 'property tech', 'real estate', 'housing'],
  'logistics': ['supply chain', 'fulfillment', 'shipping', 'transportation', 'delivery'],
  'foodtech': ['food tech', 'food & beverage', 'agtech', 'agriculture', 'food', 'restaurant'],
  'robotics': ['robots', 'automation', 'industrial automation', 'manufacturing'],
  'technology': ['tech', 'software', 'it', 'information technology'],
  'marketing': ['martech', 'marketing tech', 'advertising', 'adtech', 'ad tech', 'digital marketing', 'growth'],
  'legaltech': ['legal tech', 'legal', 'law', 'compliance', 'regtech'],
  'hrtech': ['hr tech', 'human resources', 'recruiting', 'talent', 'workforce', 'hiring'],
  'security': ['cybersecurity', 'cyber security', 'infosec', 'information security', 'data security'],
  'data': ['data analytics', 'analytics', 'big data', 'business intelligence', 'bi'],
  'media': ['entertainment', 'content', 'streaming', 'video', 'audio', 'music', 'publishing'],
  'travel': ['hospitality', 'tourism', 'travel tech', 'booking'],
  'social': ['social media', 'social network', 'community', 'networking'],
  'hardware': ['devices', 'iot', 'internet of things', 'electronics', 'sensors'],
  'femtech': ['female founders', 'women', 'womens health']
};

// Expanded adjacencies
const SECTOR_ADJACENCY = {
  'ai': ['devtools', 'enterprise', 'saas', 'healthtech', 'fintech', 'robotics', 'technology', 'data', 'security'],
  'fintech': ['crypto', 'enterprise', 'saas', 'insurtech', 'consumer', 'data', 'security'],
  'healthtech': ['biotech', 'ai', 'consumer', 'enterprise', 'data', 'femtech'],
  'edtech': ['consumer', 'saas', 'ai', 'enterprise', 'media'],
  'saas': ['enterprise', 'devtools', 'ai', 'technology', 'data', 'security', 'marketing', 'hrtech'],
  'enterprise': ['saas', 'ai', 'devtools', 'fintech', 'technology', 'security', 'data'],
  'consumer': ['marketplace', 'ecommerce', 'gaming', 'foodtech', 'edtech', 'fintech', 'media', 'social', 'travel'],
  'marketplace': ['consumer', 'saas', 'ecommerce', 'logistics', 'travel'],
  'devtools': ['ai', 'saas', 'enterprise', 'technology', 'security', 'data'],
  'climatetech': ['hardware', 'enterprise', 'logistics', 'proptech', 'foodtech', 'energy'],
  'crypto': ['fintech', 'consumer', 'gaming', 'ai'],
  'gaming': ['consumer', 'crypto', 'ai', 'media', 'social'],
  'ecommerce': ['consumer', 'marketplace', 'logistics', 'marketing'],
  'proptech': ['fintech', 'marketplace', 'climatetech', 'consumer'],
  'logistics': ['enterprise', 'ecommerce', 'climatetech', 'saas', 'robotics'],
  'foodtech': ['consumer', 'climatetech', 'logistics', 'healthtech'],
  'robotics': ['ai', 'enterprise', 'logistics', 'healthtech', 'hardware', 'manufacturing'],
  'technology': ['saas', 'enterprise', 'ai', 'devtools', 'consumer', 'data'],
  'marketing': ['saas', 'consumer', 'ecommerce', 'media', 'data', 'social'],
  'legaltech': ['enterprise', 'saas', 'fintech', 'ai', 'security'],
  'hrtech': ['enterprise', 'saas', 'ai', 'marketplace'],
  'security': ['enterprise', 'saas', 'fintech', 'devtools', 'ai', 'data'],
  'data': ['ai', 'enterprise', 'saas', 'fintech', 'healthtech', 'marketing'],
  'media': ['consumer', 'gaming', 'social', 'marketing', 'edtech'],
  'travel': ['consumer', 'marketplace', 'logistics'],
  'social': ['consumer', 'media', 'gaming', 'marketing'],
  'hardware': ['robotics', 'climatetech', 'iot', 'consumer'],
  'femtech': ['healthtech', 'consumer']
};

const STAGE_MAP = {
  'pre-seed': 0, 'angel': 0, 'seed': 1, 'series a': 2, 'series-a': 2,
  'series b': 3, 'series-b': 3, 'series c': 4, 'series-c': 4,
  'series d': 5, 'series-d': 5, 'growth': 5, 'late': 6, 'late stage': 6
};

function normalizeSector(sector) {
  if (!sector) return '';
  return sector.toString().toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

function getSectorKey(sector) {
  const normalized = normalizeSector(sector);
  if (!normalized) return '';
  
  // Direct match
  if (SECTOR_SYNONYMS[normalized]) return normalized;
  
  // Check synonyms
  for (const [key, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
    if (synonyms.some(s => normalized === s || normalized.includes(s) || s.includes(normalized))) {
      return key;
    }
  }
  
  // Partial match on keys
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
  return stageArray.map(s => STAGE_MAP[normalizeSector(s)]).filter(n => n !== undefined);
}

function calculateVelocityScore(startup) {
  let bonus = 0;
  let signals = [];
  
  const daysToMvp = startup.days_from_idea_to_mvp;
  if (daysToMvp > 0) {
    if (daysToMvp <= 30) { bonus += 4; signals.push('mvp<30d'); }
    else if (daysToMvp <= 60) { bonus += 3; signals.push('mvp<60d'); }
    else if (daysToMvp <= 90) { bonus += 2; }
    else if (daysToMvp <= 180) { bonus += 1; }
  }
  
  const monthsToRevenue = startup.time_to_first_revenue_months;
  if (monthsToRevenue > 0) {
    if (monthsToRevenue <= 3) { bonus += 3; signals.push('rev<3mo'); }
    else if (monthsToRevenue <= 6) { bonus += 2; }
    else if (monthsToRevenue <= 12) { bonus += 1; }
  }
  
  const deployFreq = startup.deployment_frequency;
  if (deployFreq === 'daily' || deployFreq === 'continuous') { bonus += 3; signals.push('ship:daily'); }
  else if (deployFreq === 'weekly') { bonus += 2; }
  else if (deployFreq === 'monthly') { bonus += 1; }
  
  const growthRate = startup.growth_rate_monthly || startup.arr_growth_rate || 0;
  if (growthRate >= 30) { bonus += 3; signals.push('growth>30%'); }
  else if (growthRate >= 15) { bonus += 2; }
  else if (growthRate >= 5) { bonus += 1; }
  
  const pivotSpeed = startup.pivot_speed_days;
  if (pivotSpeed > 0 && pivotSpeed <= 14) { bonus += 2; signals.push('pivot<2wk'); }
  else if (pivotSpeed > 0 && pivotSpeed <= 30) { bonus += 1; }
  
  return { score: 5 + bonus, signals };
}

function calculateMatchScore(startup, investor) {
  let score = 0;
  
  const startupSectors = (startup.sectors || []).map(getSectorKey).filter(Boolean);
  const investorSectors = (investor.sectors || []).map(getSectorKey).filter(Boolean);
  
  // SECTOR: 0 to 30
  let sectorReason = 'unknown';
  if (startupSectors.length === 0 || investorSectors.length === 0) {
    score += 12;
    sectorReason = 'unknown';
  } else {
    const exactMatch = startupSectors.some(ss => investorSectors.includes(ss));
    if (exactMatch) {
      score += 30;
      sectorReason = 'exact';
    } else {
      let adjacent = false;
      for (const ss of startupSectors) {
        const adj = SECTOR_ADJACENCY[ss] || [];
        if (investorSectors.some(is => adj.includes(is))) { adjacent = true; break; }
        // Also check reverse
        for (const is of investorSectors) {
          const invAdj = SECTOR_ADJACENCY[is] || [];
          if (invAdj.includes(ss)) { adjacent = true; break; }
        }
      }
      if (adjacent) {
        score += 20;
        sectorReason = 'adjacent';
      } else {
        score += 5;
        sectorReason = 'none';
      }
    }
  }
  
  // STAGE: 0 to 30
  const startupStage = startup.stage;
  const investorStageNums = getInvestorStageNums(investor.stage);
  let stageReason = 'unknown';
  
  if (startupStage === null || startupStage === undefined) {
    score += 12;
    stageReason = 'unknown';
  } else if (investorStageNums.length === 0) {
    score += 18;
    stageReason = 'agnostic';
  } else if (investorStageNums.includes(startupStage)) {
    score += 30;
    stageReason = 'exact';
  } else if (investorStageNums.includes(startupStage + 1)) {
    score += 24;
    stageReason = 'next';
  } else {
    const minDiff = Math.min(...investorStageNums.map(n => Math.abs(n - startupStage)));
    if (minDiff === 1) { score += 14; stageReason = 'off1'; }
    else if (minDiff === 2) { score += 8; stageReason = 'off2'; }
    else { score += 3; stageReason = 'far'; }
  }
  
  // VELOCITY: 5-20
  const vel = calculateVelocityScore(startup);
  score += vel.score;
  
  // TRACTION: 0-15
  if (startup.has_revenue) score += 15;
  else if (startup.has_customers) score += 9;
  else if (startup.is_launched) score += 4;
  
  // GOD: 0-10
  const god = startup.total_god_score || 0;
  if (god >= 65) score += 10;
  else if (god >= 55) score += 7;
  else if (god >= 45) score += 5;
  else if (god >= 35) score += 3;
  
  // Raw: ~10-105, scale to 10-80
  const finalScore = Math.min(80, Math.max(10, Math.round(10 + (score - 10) * 0.7)));
  
  let confidence = sectorReason === 'exact' && (stageReason === 'exact' || stageReason === 'next') ? 'high' : 
                   sectorReason === 'none' || stageReason === 'far' ? 'low' : 'medium';
  
  return { rawScore: score, score: finalScore, confidence, breakdown: { sector: sectorReason, stage: stageReason }, velocitySignals: vel.signals };
}

async function loadAllInvestors() {
  let investors = [], offset = 0;
  while (true) {
    const { data } = await supabase.from('investors').select('id, name, sectors, stage').eq('status', 'active').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    investors = investors.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  return investors;
}

async function loadStartups(limit) {
  const { data } = await supabase.from('startup_uploads')
    .select('id, name, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, days_from_idea_to_mvp, time_to_first_revenue_months, deployment_frequency, growth_rate_monthly, arr_growth_rate, pivot_speed_days')
    .eq('status', 'approved').limit(limit);
  return data || [];
}

async function runTest() {
  console.log('Testing v15 (expanded sectors)...');
  const startups = await loadStartups(100);
  const investors = await loadAllInvestors();
  console.log('Loaded ' + startups.length + ' startups, ' + investors.length + ' investors');
  
  // Debug sector matching
  console.log('\nSector matching samples:');
  for (const s of startups.slice(0, 3)) {
    const sKeys = (s.sectors || []).map(getSectorKey);
    console.log('  ' + s.name + ': ' + JSON.stringify(s.sectors) + ' -> ' + JSON.stringify(sKeys));
  }
  for (const i of investors.slice(0, 3)) {
    const iKeys = (i.sectors || []).map(getSectorKey);
    console.log('  ' + (i.name||'inv') + ': ' + JSON.stringify(i.sectors) + ' -> ' + JSON.stringify(iKeys));
  }
  
  const buckets = { '0-20': 0, '21-35': 0, '36-50': 0, '51-65': 0, '66-80': 0 };
  let total = 0, sum = 0;
  let sectorStats = { exact: 0, adjacent: 0, none: 0, unknown: 0 };
  
  for (const startup of startups) {
    for (const investor of investors.slice(0, 100)) {
      const result = calculateMatchScore(startup, investor);
      sum += result.score;
      total++;
      sectorStats[result.breakdown.sector]++;
      if (result.score <= 20) buckets['0-20']++;
      else if (result.score <= 35) buckets['21-35']++;
      else if (result.score <= 50) buckets['36-50']++;
      else if (result.score <= 65) buckets['51-65']++;
      else buckets['66-80']++;
    }
  }
  
  console.log('\nSector match breakdown:');
  Object.entries(sectorStats).forEach(([k, v]) => console.log('  ' + k + ': ' + (v/total*100).toFixed(1) + '%'));
  
  console.log('\nDistribution:');
  Object.entries(buckets).forEach(([range, count]) => {
    console.log('  ' + range + ': ' + (count/total*100).toFixed(1) + '%');
  });
  console.log('  Average: ' + (sum / total).toFixed(1));
  console.log('\nTarget: 0-20: ~5%, 21-35: ~15%, 36-50: ~35%, 51-65: ~30%, 66-80: ~15%');
}

async function main() {
  if (process.argv.includes('--test')) await runTest();
  else console.log('Usage: node intelligent-matching-v15.js --test');
}

main().catch(console.error);
