#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CONFIG = {
  LEARNING_BATCH_SIZE: 100,
  SMOOTHING_BATCH_SIZE: 500,
  POLL_INTERVAL: 30000,
};

const SECTOR_SYNONYMS = {
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative ai'],
  'fintech': ['financial technology', 'financial services', 'payments', 'banking'],
  'healthtech': ['health tech', 'healthcare', 'digital health', 'medtech', 'biotech'],
  'edtech': ['education', 'education technology', 'e-learning'],
  'saas': ['software as a service', 'b2b saas', 'enterprise saas', 'software'],
  'enterprise': ['b2b', 'enterprise software', 'business software'],
  'consumer': ['b2c', 'consumer tech', 'd2c'],
  'climatetech': ['climate tech', 'cleantech', 'sustainability', 'green tech'],
  'crypto': ['web3', 'blockchain', 'defi'],
  'robotics': ['robots', 'automation'],
};

const STAGE_INDICATORS = {
  0: { keywords: ['pre-seed', 'idea', 'concept'], raise: [0, 500000] },
  1: { keywords: ['seed', 'mvp', 'early'], raise: [100000, 3000000] },
  2: { keywords: ['series a', 'growth', 'scaling'], raise: [2000000, 15000000] },
  3: { keywords: ['series b', 'expansion'], raise: [10000000, 50000000] },
  4: { keywords: ['series c', 'late stage'], raise: [30000000, 150000000] },
  5: { keywords: ['series d', 'pre-ipo'], raise: [50000000, 500000000] }
};

class InferenceEngine {
  static infer(startup) {
    const inferred = { ...startup };
    const changes = [];
    
    if (inferred.stage === null && inferred.raise_amount) {
      for (const [stage, config] of Object.entries(STAGE_INDICATORS)) {
        if (inferred.raise_amount >= config.raise[0] && inferred.raise_amount <= config.raise[1]) {
          inferred.stage = parseInt(stage);
          changes.push(`stage=${stage}`);
          break;
        }
      }
    }
    
    if (inferred.stage === null && inferred.latest_funding_round) {
      const round = inferred.latest_funding_round.toLowerCase();
      for (const [stage, config] of Object.entries(STAGE_INDICATORS)) {
        if (config.keywords.some(k => round.includes(k))) {
          inferred.stage = parseInt(stage);
          changes.push(`stage=${stage}`);
          break;
        }
      }
    }
    
    if ((!inferred.sectors || inferred.sectors.length === 0) && inferred.description) {
      const desc = (inferred.description + ' ' + (inferred.pitch || '')).toLowerCase();
      const inferredSectors = [];
      for (const [sector, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
        if (synonyms.some(s => desc.includes(s)) || desc.includes(sector)) {
          inferredSectors.push(sector);
        }
      }
      if (inferredSectors.length > 0) {
        inferred.sectors = inferredSectors.slice(0, 3);
        changes.push(`sectors=[${inferred.sectors.join(',')}]`);
      }
    }
    
    if (inferred.has_revenue === null && (inferred.revenue_annual > 0 || inferred.mrr > 0)) {
      inferred.has_revenue = true;
      changes.push('has_revenue=true');
    }
    
    if (inferred.has_customers === null && inferred.customer_count > 0) {
      inferred.has_customers = true;
      changes.push('has_customers=true');
    }
    
    if (inferred.is_launched === null && (inferred.has_revenue || inferred.has_customers)) {
      inferred.is_launched = true;
      changes.push('is_launched=true');
    }
    
    return { data: inferred, changes };
  }
}

class GodScoreCalculator {
  static calculate(startup) {
    let dataPoints = 0;
    let score = 30; // Base score
    
    if (startup.has_revenue === true) { score += 15; dataPoints++; }
    else if (startup.has_customers === true) { score += 10; dataPoints++; }
    else if (startup.is_launched === true) { score += 5; dataPoints++; }
    
    if (startup.stage !== null && startup.stage !== undefined) {
      score += Math.min(startup.stage * 3, 12);
      dataPoints++;
    }
    
    const sectors = startup.sectors || [];
    const hotSectors = ['ai', 'fintech', 'healthtech', 'climatetech', 'robotics'];
    if (sectors.some(s => hotSectors.some(h => s.toLowerCase().includes(h)))) {
      score += 8;
      dataPoints++;
    } else if (sectors.length > 0) {
      score += 3;
      dataPoints++;
    }
    
    if (startup.growth_rate_monthly > 0) {
      if (startup.growth_rate_monthly >= 20) score += 10;
      else if (startup.growth_rate_monthly >= 10) score += 6;
      else score += 3;
      dataPoints++;
    }
    
    if (startup.has_technical_cofounder === true) { score += 5; dataPoints++; }
    if (startup.first_time_founders === false) { score += 5; dataPoints++; }
    
    if (startup.customer_count >= 100) { score += 8; dataPoints++; }
    else if (startup.customer_count >= 10) { score += 4; dataPoints++; }
    
    if (dataPoints < 2 && startup.total_god_score) return null;
    
    return { total_god_score: Math.min(100, Math.max(0, Math.round(score))), data_points: dataPoints };
  }
}

class BatchPipeline {
  constructor() {
    this.stats = { processed: 0, inferred: 0, godUpdated: 0, godPreserved: 0, errors: 0 };
  }
  
  async getNextBatch(size) {
    const { data } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .or('stage.is.null,sectors.is.null')
      .order('updated_at', { ascending: true })
      .limit(size);
    
    if (!data || data.length === 0) {
      const { data: fallback } = await supabase
        .from('startup_uploads')
        .select('*')
        .eq('status', 'approved')
        .order('updated_at', { ascending: true })
        .limit(size);
      return fallback || [];
    }
    return data;
  }
  
  async processStartup(startup) {
    try {
      const { data: inferred, changes } = InferenceEngine.infer(startup);
      if (changes.length > 0) {
        this.stats.inferred++;
        console.log(`    📊 Inferred: ${changes.join(', ')}`);
      }
      
      const godResult = GodScoreCalculator.calculate(inferred);
      const oldScore = startup.total_god_score || 0;
      const update = { updated_at: new Date().toISOString() };
      
      if (inferred.stage !== startup.stage) update.stage = inferred.stage;
      if (JSON.stringify(inferred.sectors) !== JSON.stringify(startup.sectors)) update.sectors = inferred.sectors;
      if (inferred.has_revenue !== startup.has_revenue) update.has_revenue = inferred.has_revenue;
      if (inferred.has_customers !== startup.has_customers) update.has_customers = inferred.has_customers;
      if (inferred.is_launched !== startup.is_launched) update.is_launched = inferred.is_launched;
      
      if (godResult !== null) {
        const newScore = godResult.total_god_score;
        if (!oldScore || Math.abs(newScore - oldScore) >= 5) {
          update.total_god_score = newScore;
          this.stats.godUpdated++;
          console.log(`    🎯 GOD: ${oldScore} → ${newScore} (${godResult.data_points} pts)`);
        } else {
          this.stats.godPreserved++;
        }
      } else {
        this.stats.godPreserved++;
      }
      
      if (Object.keys(update).length > 1) {
        const { error } = await supabase.from('startup_uploads').update(update).eq('id', startup.id);
        if (error) { this.stats.errors++; return null; }
      }
      
      this.stats.processed++;
      return inferred;
    } catch (err) {
      this.stats.errors++;
      return null;
    }
  }
  
  async processBatch(size = CONFIG.LEARNING_BATCH_SIZE) {
    console.log(`\n📦 Processing batch of ${size} startups...`);
    const startups = await this.getNextBatch(size);
    if (startups.length === 0) { console.log('  No startups to process'); return; }
    
    console.log(`  Found ${startups.length} startups`);
    for (const startup of startups) {
      console.log(`  🎯 ${(startup.name || startup.id).slice(0, 30)}...`);
      await this.processStartup(startup);
    }
    
    console.log(`\n✅ Batch complete`);
    console.log(`   Processed: ${this.stats.processed} | Inferred: ${this.stats.inferred}`);
    console.log(`   GOD updated: ${this.stats.godUpdated} | Preserved: ${this.stats.godPreserved}`);
    console.log(`   Errors: ${this.stats.errors}`);
  }
  
  async runSmoothingPass() {
    console.log(`\n🔄 Smoothing pass...`);
    const { data } = await supabase
      .from('startup_uploads')
      .select('total_god_score, stage')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null)
      .limit(CONFIG.SMOOTHING_BATCH_SIZE);
    
    if (!data || data.length === 0) return;
    
    const scores = data.map(s => s.total_god_score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const median = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)];
    console.log(`  Stats: avg=${avg.toFixed(1)}, median=${median}, count=${scores.length}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous');
  const smooth = args.includes('--smooth');
  
  console.log('═'.repeat(60));
  console.log('🧠 INTELLIGENT BATCH PIPELINE v2');
  console.log('═'.repeat(60));
  
  const pipeline = new BatchPipeline();
  
  if (smooth) { await pipeline.runSmoothingPass(); return; }
  
  await pipeline.processBatch(CONFIG.LEARNING_BATCH_SIZE);
  
  if (continuous) {
    setInterval(() => pipeline.processBatch(CONFIG.LEARNING_BATCH_SIZE), CONFIG.POLL_INTERVAL);
    console.log(`\n⏱️  Running continuously every ${CONFIG.POLL_INTERVAL / 1000}s`);
  }
}

main().catch(console.error);
