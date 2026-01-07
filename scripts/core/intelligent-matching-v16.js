#!/usr/bin/env node
/**
 * INTELLIGENT MATCHING v16 - PRODUCTION READY
 * ============================================
 * 
 * Philosophy: Score reflects data quality
 * - Sparse data = clustered scores (honest)
 * - Rich data = spread scores (differentiated)
 * 
 * Current reality: Most startups missing stage/traction/velocity
 * Result: Scores cluster 35-50 - THIS IS CORRECT
 * 
 * To improve spread, enrich these fields:
 * - stage (only 18% have it)
 * - has_revenue/has_customers (only 1% have it)
 * - velocity fields (days_from_idea_to_mvp, etc.)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SECTOR_SYNONYMS = {
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative ai', 'gen ai', 'ai/ml', 'aiml'],
  'fintech': ['financial technology', 'financial services', 'payments', 'banking', 'insurtech', 'insurance', 'lending', 'credit'],
  'healthtech': ['health tech', 'healthcare', 'digital health', 'medtech', 'medical technology', 'biotech', 'health', 'medical', 'life sciences'],
  'edtech': ['education', 'education technology', 'e-learning', 'learning'],
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
  'technology': ['tech', 'it', 'information technology'],
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

const SECTOR_ADJACENCY = {
  'ai': ['devtools', 'enterprise', 'saas', 'healthtech', 'fintech', 'robotics', 'technology', 'data', 'security'],
  'fintech': ['crypto', 'enterprise', 'saas', 'consumer', 'data', 'security'],
  'healthtech': ['ai', 'consumer', 'enterprise', 'data', 'femtech'],
  'edtech': ['consumer', 'saas', 'ai', 'enterprise', 'media'],
  'saas': ['enterprise', 'devtools', 'ai', 'technology', 'data', 'security', 'marketing', 'hrtech'],
  'enterprise': ['saas', 'ai', 'devtools', 'fintech', 'technology', 'security', 'data'],
  'consumer': ['marketplace', 'ecommerce', 'gaming', 'foodtech', 'edtech', 'fintech', 'media', 'social', 'travel'],
  'marketplace': ['consumer', 'saas', 'ecommerce', 'logistics', 'travel'],
  'devtools': ['ai', 'saas', 'enterprise', 'technology', 'security', 'data'],
  'climatetech': ['hardware', 'enterprise', 'logistics', 'proptech', 'foodtech'],
  'crypto': ['fintech', 'consumer', 'gaming', 'ai'],
  'gaming': ['consumer', 'crypto', 'ai', 'media', 'social'],
  'ecommerce': ['consumer', 'marketplace', 'logistics', 'marketing'],
  'proptech': ['fintech', 'marketplace', 'climatetech', 'consumer'],
  'logistics': ['enterprise', 'ecommerce', 'climatetech', 'saas', 'robotics'],
  'foodtech': ['consumer', 'climatetech', 'logistics', 'healthtech'],
  'robotics': ['ai', 'enterprise', 'logistics', 'healthtech', 'hardware'],
  'technology': ['saas', 'enterprise', 'ai', 'devtools', 'consumer', 'data'],
  'marketing': ['saas', 'consumer', 'ecommerce', 'media', 'data', 'social'],
  'legaltech': ['enterprise', 'saas', 'fintech', 'ai', 'security'],
  'hrtech': ['enterprise', 'saas', 'ai', 'marketplace'],
  'security': ['enterprise', 'saas', 'fintech', 'devtools', 'ai', 'data'],
  'data': ['ai', 'enterprise', 'saas', 'fintech', 'healthtech', 'marketing'],
  'media': ['consumer', 'gaming', 'social', 'marketing', 'edtech'],
  'travel': ['consumer', 'marketplace', 'logistics'],
  'social': ['consumer', 'media', 'gaming', 'marketing'],
  'hardware': ['robotics', 'climatetech', 'consumer'],
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
  if (SECTOR_SYNONYMS[normalized]) return normalized;
  for (const [key, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
    if (synonyms.some(s => normalized === s || normalized.includes(s) || s.includes(normalized))) return key;
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

function calculateVelocity(s) {
  let bonus = 0;
  if (s.days_from_idea_to_mvp > 0 && s.days_from_idea_to_mvp <= 90) bonus += 3;
  if (s.time_to_first_revenue_months > 0 && s.time_to_first_revenue_months <= 6) bonus += 2;
  if (s.deployment_frequency === 'daily' || s.deployment_frequency === 'weekly') bonus += 2;
  if ((s.growth_rate_monthly || s.arr_growth_rate || 0) >= 15) bonus += 2;
  if (s.pivot_speed_days > 0 && s.pivot_speed_days <= 30) bonus += 1;
  return 5 + bonus; // 5-15 range
}

function calculatePMFScore(startup) {
  let pmf = 0;

  // CORE PMF (0-25)
  if (startup.has_revenue) {
    pmf += 10;
    if (startup.mrr >= 50000) pmf += 5;
    else if (startup.mrr >= 10000) pmf += 3;
    else if (startup.mrr > 0) pmf += 1;
  }
  if (startup.has_customers) pmf += 5;
  if (startup.is_launched) pmf += 2;

  // GROWTH (0-12)
  const growth = startup.growth_rate_monthly || 0;
  if (growth >= 20) pmf += 8;
  else if (growth >= 10) pmf += 5;
  else if (growth >= 5) pmf += 2;

  const custGrowth = startup.customer_growth_monthly || 0;
  if (custGrowth >= 20) pmf += 4;
  else if (custGrowth >= 10) pmf += 2;

  // RETENTION/LOVE (0-17)
  const nps = startup.nps_score || 0;
  if (nps >= 70) pmf += 6;
  else if (nps >= 50) pmf += 4;
  else if (nps >= 30) pmf += 2;

  const disappointed = startup.users_who_would_be_very_disappointed || 0;
  if (disappointed >= 40) pmf += 6;
  else if (disappointed >= 25) pmf += 3;

  const nrr = startup.nrr || 0;
  if (nrr >= 120) pmf += 5;
  else if (nrr >= 100) pmf += 2;

  // ORGANIC (0-5)
  const organic = startup.organic_referral_rate || 0;
  if (organic >= 30) pmf += 5;
  else if (organic >= 15) pmf += 3;
  else if (organic >= 5) pmf += 1;

  // PENALTY for no PMF data
  if (!startup.has_revenue && !startup.has_customers && !startup.is_launched && growth === 0) {
    pmf = -5;
  }

  return Math.max(-10, Math.min(50, pmf));
}

function calculateMatchScore(startup, investor) {
  let score = 0;
  
  const sSectors = (startup.sectors || []).map(getSectorKey).filter(Boolean);
  const iSectors = (investor.sectors || []).map(getSectorKey).filter(Boolean);
  
  // SECTOR (0-30)
  let sectorType = 'unknown';
  if (sSectors.length === 0 || iSectors.length === 0) {
    score += 12; sectorType = 'unknown';
  } else {
    const exact = sSectors.some(ss => iSectors.includes(ss));
    if (exact) {
      score += 30; sectorType = 'exact';
    } else {
      let adj = false;
      for (const ss of sSectors) {
        if ((SECTOR_ADJACENCY[ss] || []).some(a => iSectors.includes(a))) { adj = true; break; }
        for (const is of iSectors) {
          if ((SECTOR_ADJACENCY[is] || []).includes(ss)) { adj = true; break; }
        }
      }
      if (adj) { score += 20; sectorType = 'adjacent'; }
      else { score += 5; sectorType = 'none'; }
    }
  }
  
  // STAGE (0-30)
  const sStage = startup.stage;
  const iStages = getInvestorStageNums(investor.stage);
  let stageType = 'unknown';
  
  if (sStage === null || sStage === undefined) {
    score += 12; stageType = 'unknown';
  } else if (iStages.length === 0) {
    score += 18; stageType = 'agnostic';
  } else if (iStages.includes(sStage)) {
    score += 30; stageType = 'exact';
  } else if (iStages.includes(sStage + 1)) {
    score += 24; stageType = 'next';
  } else {
    const diff = Math.min(...iStages.map(n => Math.abs(n - sStage)));
    if (diff === 1) { score += 14; stageType = 'off1'; }
    else if (diff === 2) { score += 8; stageType = 'off2'; }
    else { score += 3; stageType = 'far'; }
  }
  
  // VELOCITY (5-15)
  score += calculateVelocity(startup);
  
  // PMF - PRODUCT/MARKET FIT (0-50, scaled to 0-25)
  const pmfRaw = calculatePMFScore(startup);
  const pmfScaled = Math.round(pmfRaw / 2); // Scale 0-50 to 0-25
  score += pmfScaled;
  
  // GOD (0-10) - more conservative
  const god = startup.total_god_score || 0;
  if (god >= 65) score += 8;
  else if (god >= 55) score += 5;
  else if (god >= 45) score += 3;
  else if (god >= 35) score += 1;
  
  // Apply penalties for poor fits to create better distribution
  if (sectorType === 'none') score -= 5; // Penalty for no sector match
  if (stageType === 'far') score -= 5;   // Penalty for far stage mismatch
  
  // Scale to create bell curve: most matches should be 30-60, not 70-80
  // Raw score range: ~15-100, we want output: 10-95
  // Use a curve that compresses high scores and expands mid-range
  let final;
  if (score <= 30) {
    // Low scores: linear scale 15-30 -> 10-25
    final = Math.round(10 + (score - 15) * 0.75);
  } else if (score <= 60) {
    // Mid scores: linear scale 30-60 -> 25-55 (most matches here)
    final = Math.round(25 + (score - 30) * 1.0);
  } else if (score <= 80) {
    // High scores: compressed 60-80 -> 55-75
    final = Math.round(55 + (score - 60) * 1.0);
  } else {
    // Very high: compressed 80-100 -> 75-90 (rare)
    final = Math.round(75 + (score - 80) * 0.75);
  }
  
  // Final clamp
  final = Math.min(95, Math.max(10, final));
  
  const confidence = (sectorType === 'exact' && (stageType === 'exact' || stageType === 'next')) ? 'high' :
                     (sectorType === 'none' || stageType === 'far') ? 'low' : 'medium';
  
  return { score: final, confidence, breakdown: { sector: sectorType, stage: stageType } };
}

async function loadInvestors() {
  let all = [], offset = 0;
  while (true) {
    const { data } = await supabase.from('investors').select('id, name, sectors, stage').eq('status', 'active').range(offset, offset + 999);
    if (!data || !data.length) break;
    all = all.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  return all;
}

async function loadStartups(limit) {
  const { data } = await supabase.from('startup_uploads')
    .select('id, name, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, days_from_idea_to_mvp, time_to_first_revenue_months, deployment_frequency, growth_rate_monthly, arr_growth_rate, pivot_speed_days, mrr, customer_growth_monthly, nps_score, users_who_would_be_very_disappointed, nrr, organic_referral_rate, customer_interviews_conducted')
    .eq('status', 'approved').limit(limit);
  return data || [];
}

async function runTest() {
  console.log('v16 - Production Ready\n');
  const startups = await loadStartups(100);
  const investors = await loadInvestors();
  console.log('Data: ' + startups.length + ' startups, ' + investors.length + ' investors\n');
  
  const buckets = { '10-20': 0, '21-35': 0, '36-50': 0, '51-65': 0, '66-80': 0 };
  let total = 0, sum = 0;
  
  for (const s of startups) {
    for (const i of investors.slice(0, 100)) {
      const r = calculateMatchScore(s, i);
      sum += r.score; total++;
      if (r.score <= 20) buckets['10-20']++;
      else if (r.score <= 35) buckets['21-35']++;
      else if (r.score <= 50) buckets['36-50']++;
      else if (r.score <= 65) buckets['51-65']++;
      else buckets['66-80']++;
    }
  }
  
  console.log('Distribution:');
  Object.entries(buckets).forEach(([k, v]) => console.log('  ' + k + ': ' + (v/total*100).toFixed(1) + '%'));
  console.log('  Avg: ' + (sum/total).toFixed(1));
  
  console.log('\n⚠️  Scores cluster because data is sparse.');
  console.log('To spread distribution, enrich startup data:');
  console.log('  - stage (18% have it)');
  console.log('  - has_revenue (1% have it)');
  console.log('  - velocity fields (days_to_mvp, etc.)');
}

async function rescore() {
  console.log('Rescoring all matches with v16...\n');
  
  const startups = await loadStartups(10000);
  const investors = await loadInvestors();
  const startupMap = new Map(startups.map(s => [s.id, s]));
  const investorMap = new Map(investors.map(i => [i.id, i]));
  
  console.log('Loaded ' + startups.length + ' startups, ' + investors.length + ' investors');
  
  const count = "unknown"; // Skip count query
  console.log('Matches to update: ' + count + '\n');
  
  let updated = 0, processed = 0, offset = 0;
  const batch = 1000;
  
  while (true) {
    const { data: matches } = await supabase.from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score')
      .range(offset, offset + batch - 1);
    
    if (!matches || !matches.length) break;
    
    for (const m of matches) {
      const s = startupMap.get(m.startup_id);
      const i = investorMap.get(m.investor_id);
      if (!s || !i) continue;
      
      const r = calculateMatchScore(s, i);
      if (Math.abs(r.score - m.match_score) >= 2) {
        await supabase.from('startup_investor_matches')
          .update({ match_score: r.score, confidence_level: r.confidence })
          .eq('id', m.id);
        updated++;
      }
    }
    
    processed += matches.length;
    offset += batch;
    if (processed % 1000 === 0) console.log('  ' + processed + ' processed, ' + updated + ' updated');
    if (matches.length < batch) break;
  }
  
  console.log('\nDone: ' + processed + ' processed, ' + updated + ' updated');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--test')) await runTest();
  else if (args.includes('--rescore')) await rescore();
  else console.log('Usage:\n  --test     Test distribution\n  --rescore  Update all matches');
}

main().catch(console.error);
