#!/usr/bin/env node
/**
 * AUTO MATCH REGENERATION
 * =======================
 * Runs every 4 hours to keep matches fresh.
 * Called by PM2 automation pipeline.
 * 
 * PM2: pm2 start match-regenerator.js --name match-regen --cron "0 0,4,8,12,16,20 * * *"
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Matching configuration
const CONFIG = {
  SECTOR_MATCH: 35,      // Increased: sector alignment is critical
  STAGE_MATCH: 20,
  GEO_MATCH: 10,
  INVESTOR_QUALITY: 20,  // Reduced slightly 
  STARTUP_QUALITY: 25,   // Increased: GOD score matters more
  MIN_MATCH_SCORE: 35,
  BATCH_SIZE: 500
};

// Sector synonyms
const SECTOR_SYNONYMS = {
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative ai'],
  'fintech': ['financial technology', 'payments', 'banking', 'insurtech'],
  'healthtech': ['health tech', 'digital health', 'healthcare', 'medtech', 'biotech'],
  'saas': ['software', 'b2b software', 'enterprise software', 'cloud'],
  'ecommerce': ['e-commerce', 'retail', 'marketplace', 'dtc'],
};

function normalizeStr(s) {
  if (!s) return '';
  if (typeof s === 'string') return s.toLowerCase().trim();
  if (Array.isArray(s)) return s.map(normalizeStr).join(' ');
  return String(s).toLowerCase().trim();
}

function calculateSectorMatch(startupSectors, investorSectors) {
  if (!startupSectors || !investorSectors) return 5;
  
  const normalize = (arr) => (Array.isArray(arr) ? arr : [arr]).map(normalizeStr);
  const sSectors = normalize(startupSectors);
  const iSectors = normalize(investorSectors);
  
  let matches = 0;
  for (const ss of sSectors) {
    for (const is of iSectors) {
      if (ss === is || ss.includes(is) || is.includes(ss)) {
        matches++;
        continue;
      }
      // Check synonyms
      for (const [key, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
        const allTerms = [key, ...synonyms];
        if (allTerms.some(t => ss.includes(t)) && allTerms.some(t => is.includes(t))) {
          matches++;
          break;
        }
      }
    }
  }
  
  return Math.min(matches * 10, CONFIG.SECTOR_MATCH);
}

function calculateStageMatch(startupStage, investorStages) {
  if (!startupStage || !investorStages) return 5;
  
  const normalize = (s) => normalizeStr(s).replace(/[-_\s]/g, '');
  const sStage = normalize(startupStage);
  const iStages = (Array.isArray(investorStages) ? investorStages : [investorStages]).map(normalize);
  
  if (iStages.some(is => is === sStage || is.includes(sStage) || sStage.includes(is))) {
    return CONFIG.STAGE_MATCH;
  }
  return 5;
}

function calculateInvestorQuality(score, tier) {
  const baseScore = (score || 5) * 2; // 0-20 from score
  const tierBonus = { elite: 5, strong: 3, solid: 1, emerging: 0 }[tier] || 0;
  return Math.min(baseScore + tierBonus, CONFIG.INVESTOR_QUALITY);
}

function calculateStartupQuality(godScore) {
  if (!godScore) return 8;
  // Map GOD score 40-100 to quality 10-25
  // This gives calibrated startups proper representation
  const normalized = Math.max(0, (godScore - 40) / 60); // 0-1 scale
  return Math.round(10 + normalized * 15); // 10-25 range
}

async function regenerateMatches() {
  const startTime = Date.now();
  console.log('\n' + '═'.repeat(60));
  console.log('🔄 AUTO MATCH REGENERATION');
  console.log('═'.repeat(60));
  console.log(`⏰ Started: ${new Date().toISOString()}\n`);
  
  try {
    // Get approved startups
    const { data: startups, error: sErr } = await supabase
      .from('startup_uploads')
      .select('id, name, sectors, stage, total_god_score')
      .eq('status', 'approved');
    
    if (sErr) throw new Error(`Startup fetch error: ${sErr.message}`);
    
    // Get investors
    const { data: investors, error: iErr } = await supabase
      .from('investors')
      .select('id, name, sectors, stage, investor_score, investor_tier');
    
    if (iErr) throw new Error(`Investor fetch error: ${iErr.message}`);
    
    console.log(`📊 Found ${startups.length} startups × ${investors.length} investors`);
    
    if (startups.length === 0 || investors.length === 0) {
      console.log('⚠️  No data to match');
      return;
    }
    
    // Delete old matches
    const { error: delErr } = await supabase
      .from('startup_investor_matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (delErr) console.warn('Delete warning:', delErr.message);
    console.log('🗑️  Cleared old matches\n');
    
    // Generate new matches
    const allMatches = [];
    let processed = 0;
    
    for (const startup of startups) {
      for (const investor of investors) {
        const sectorScore = calculateSectorMatch(startup.sectors, investor.sectors);
        const stageScore = calculateStageMatch(startup.stage, investor.stage);
        const investorQuality = calculateInvestorQuality(investor.investor_score, investor.investor_tier);
        const startupQuality = calculateStartupQuality(startup.total_god_score);
        
        const totalScore = sectorScore + stageScore + investorQuality + startupQuality;
        
        if (totalScore >= CONFIG.MIN_MATCH_SCORE) {
          allMatches.push({
            startup_id: startup.id,
            investor_id: investor.id,
            match_score: totalScore,
            confidence_level: totalScore >= 70 ? 'high' : totalScore >= 50 ? 'medium' : 'low',
            fit_analysis: {
              sector: sectorScore,
              stage: stageScore,
              investor_quality: investorQuality,
              startup_quality: startupQuality,
              tier: investor.investor_tier
            }
          });
        }
      }
      
      processed++;
      if (processed % 100 === 0) {
        process.stdout.write(`\r   Processed ${processed}/${startups.length} startups...`);
      }
    }
    
    console.log(`\n\n📦 Saving ${allMatches.length} matches...`);
    
    // Batch insert
    let saved = 0;
    for (let i = 0; i < allMatches.length; i += CONFIG.BATCH_SIZE) {
      const batch = allMatches.slice(i, i + CONFIG.BATCH_SIZE);
      
      // Use upsert to handle any duplicate key conflicts
      const { error: insErr } = await supabase
        .from('startup_investor_matches')
        .upsert(batch, { 
          onConflict: 'startup_id,investor_id',
          ignoreDuplicates: false 
        });
      
      if (insErr) {
        console.error(`   Batch ${Math.floor(i/CONFIG.BATCH_SIZE)+1} error:`, insErr.message);
      } else {
        saved += batch.length;
      }
      
      process.stdout.write(`\r   Saved ${saved}/${allMatches.length}`);
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n\n' + '═'.repeat(60));
    console.log('✅ MATCH REGENERATION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   Startups: ${startups.length}`);
    console.log(`   Investors: ${investors.length}`);
    console.log(`   Matches: ${saved}`);
    console.log(`   High confidence: ${allMatches.filter(m => m.confidence_level === 'high').length}`);
    console.log(`   Time: ${elapsed}s`);
    console.log('═'.repeat(60) + '\n');
    
    // Log to monitoring table (ignore errors)
    await supabase.from('system_logs').insert({
      event: 'match_regeneration',
      details: {
        startups: startups.length,
        investors: investors.length,
        matches: saved,
        elapsed_seconds: parseFloat(elapsed)
      }
    }).then(() => {}).catch(() => {}); // Ignore if table doesn't exist
    
  } catch (error) {
    console.error('❌ Match regeneration failed:', error.message);
    process.exit(1);
  }
}

// Run
regenerateMatches().then(() => {
  console.log('🏁 Done');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
