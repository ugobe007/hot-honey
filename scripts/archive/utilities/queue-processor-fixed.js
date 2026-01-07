#!/usr/bin/env node
/**
 * QUEUE PROCESSOR - FIXED
 * =======================
 * 
 * Fixes:
 * 1. Gets ALL investors (pagination)
 * 2. Creates matches for ALL investors (not just top 20)
 * 3. Uses intelligent matching algorithm v3
 * 4. Validates startup exists before processing
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BATCH_SIZE = 10; // Process 10 startups at a time
const POLL_INTERVAL = 10000; // 10 seconds
const MAX_ATTEMPTS = 3;

let isProcessing = false;
let totalProcessed = 0;
let totalErrors = 0;

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

// ============ SCORING FUNCTIONS ============

function calculateMatchScore(startup, investor) {
  let score = 0;
  
  // 1. SECTOR SCORE (0-25)
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
    // Check exact match
    const exactMatch = startupSectors.some(ss => investorSectors.includes(ss));
    if (exactMatch) {
      sectorScore = 25;
      sectorReason = 'exact_match';
    } else {
      // Check adjacent
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
  score += sectorScore;
  
  // 2. STAGE SCORE (0-15)
  const startupStage = startup.stage;
  const investorStageNums = getInvestorStageNums(investor.stage);
  
  let stageScore = 0;
  let stageReason = 'unknown';
  
  if (startupStage === null || startupStage === undefined) {
    stageScore = 5;
    stageReason = 'unknown_startup_stage';
  } else if (investorStageNums.length === 0) {
    stageScore = 8;
    stageReason = 'unknown_investor_stage';
  } else if (investorStageNums.includes(startupStage)) {
    stageScore = 15;
    stageReason = 'exact_stage';
  } else if (investorStageNums.includes(startupStage + 1)) {
    stageScore = 10;
    stageReason = 'ready_for_next';
  } else {
    const minDiff = Math.min(...investorStageNums.map(n => Math.abs(n - startupStage)));
    if (minDiff === 1) {
      stageScore = 5;
      stageReason = 'one_stage_off';
    } else {
      stageScore = 0;
      stageReason = 'stage_mismatch';
    }
  }
  score += stageScore;
  
  // 3. TRACTION SCORE (0-10)
  let tractionScore = 0;
  if (startup.has_revenue) tractionScore = 10;
  else if (startup.has_customers) tractionScore = 5;
  else if (startup.is_launched) tractionScore = 2;
  score += tractionScore;
  
  // 4. GOD SCORE BONUS (0-12)
  const godScore = startup.total_god_score || 0;
  let godBonus = 0;
  if (godScore >= 70) godBonus = 12;
  else if (godScore >= 60) godBonus = 8;
  else if (godScore >= 50) godBonus = 5;
  else if (godScore >= 40) godBonus = 2;
  score += godBonus;
  
  // 5. CHECK SIZE FIT (0-10)
  let checkScore = 5; // Default for unknown
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
  score += checkScore;
  
  // Determine confidence
  let confidence = 'medium';
  if (sectorReason === 'exact_match' && stageReason === 'exact_stage') {
    confidence = 'high';
  } else if (sectorReason === 'no_match' || stageReason === 'stage_mismatch') {
    confidence = 'low';
  }
  
  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
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
      .select('id, sectors, stage, check_size_min, check_size_max')
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

// Cache investors (reload every 10 minutes)
let cachedInvestors = null;
let investorsCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

async function getInvestors() {
  const now = Date.now();
  if (!cachedInvestors || now - investorsCacheTime > CACHE_TTL) {
    console.log('  📥 Loading investors...');
    cachedInvestors = await loadAllInvestors();
    investorsCacheTime = now;
    console.log(`  📥 Loaded ${cachedInvestors.length} investors`);
  }
  return cachedInvestors;
}

// ============ MATCH GENERATION ============

async function generateMatchesForStartup(startupId) {
  // Get startup
  const { data: startup, error: startupError } = await supabase
    .from('startup_uploads')
    .select('id, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, raise_amount')
    .eq('id', startupId)
    .single();
  
  if (startupError || !startup) {
    throw new Error(`Startup not found: ${startupId}`);
  }
  
  // Get all investors
  const investors = await getInvestors();
  
  if (!investors || investors.length === 0) {
    throw new Error('No active investors found');
  }
  
  // Generate matches for ALL investors
  const matches = [];
  
  for (const investor of investors) {
    const result = calculateMatchScore(startup, investor);
    
    matches.push({
      startup_id: startupId,
      investor_id: investor.id,
      match_score: result.score,
      confidence_level: result.confidence,
      status: 'suggested'
    });
  }
  
  // Insert in batches of 500
  let inserted = 0;
  for (let i = 0; i < matches.length; i += 500) {
    const batch = matches.slice(i, i + 500);
    const { error } = await supabase
      .from('startup_investor_matches')
      .upsert(batch, { onConflict: 'startup_id,investor_id' });
    
    if (error) {
      console.error(`  ⚠️  Batch insert error: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  
  console.log(`    ✅ Created ${inserted} matches`);
  return inserted;
}

// ============ JOB PROCESSING ============

async function processJob(job) {
  console.log(`  🎯 Processing: ${job.startup_id.slice(0, 8)}...`);
  
  try {
    // Mark as processing
    await supabase
      .from('matching_queue')
      .update({ status: 'processing', attempts: job.attempts + 1 })
      .eq('id', job.id);
    
    // Generate matches
    await generateMatchesForStartup(job.startup_id);
    
    // Mark as completed
    await supabase
      .from('matching_queue')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', job.id);
    
    totalProcessed++;
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    totalErrors++;
    
    const newStatus = job.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending';
    await supabase
      .from('matching_queue')
      .update({ status: newStatus, error: error.message })
      .eq('id', job.id);
    
    return false;
  }
}

async function processBatch() {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    // Get pending jobs
    const { data: jobs, error } = await supabase
      .from('matching_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);
    
    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      isProcessing = false;
      return;
    }
    
    console.log(`\n📦 Processing ${jobs.length} startups...`);
    
    for (const job of jobs) {
      await processJob(job);
    }
    
    console.log(`✅ Batch complete | Total: ${totalProcessed} processed, ${totalErrors} errors`);
  } catch (error) {
    console.error('❌ Batch error:', error.message);
  } finally {
    isProcessing = false;
  }
}

async function getQueueStats() {
  const [pending, processing, completed, failed] = await Promise.all([
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed')
  ]);
  
  return {
    pending: pending.count || 0,
    processing: processing.count || 0,
    completed: completed.count || 0,
    failed: failed.count || 0
  };
}

// ============ MAIN ============

async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 QUEUE PROCESSOR - FIXED');
  console.log('═'.repeat(60));
  console.log(`📦 Batch size: ${BATCH_SIZE} startups`);
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);
  console.log('');
  
  // Preload investors
  await getInvestors();
  
  // Show initial stats
  const stats = await getQueueStats();
  console.log('📊 Initial Queue Status:');
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Completed: ${stats.completed}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log('');
  
  // Initial run
  await processBatch();
  
  // Poll continuously
  setInterval(processBatch, POLL_INTERVAL);
  
  // Status update every 60 seconds
  setInterval(async () => {
    const stats = await getQueueStats();
    console.log(`\n📊 Status: ${stats.pending} pending | ${stats.completed} completed | ${stats.failed} failed`);
  }, 60000);
}

main().catch(console.error);
