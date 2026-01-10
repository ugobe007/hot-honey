#!/usr/bin/env node
/**
 * Fix Missing Series A/B Stages
 * Finds startups that should be Series A/B but have wrong or missing stage values
 * Updates them based on funding signals in extracted_data, raise_type, and funding_rounds
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Stage mapping (matching queue-processor-v16.js)
const STAGE_MAP = {
  'pre-seed': 0, 'preseed': 0, 'pre seed': 0,
  'angel': 0,
  'seed': 1,
  'series a': 2, 'series-a': 2, 'seriesa': 2, 'series a': 2,
  'series b': 3, 'series-b': 3, 'seriesb': 3, 'series b': 3,
  'series c': 4, 'series-c': 4, 'seriesc': 4, 'series c': 4,
  'series d': 5, 'series-d': 5, 'seriesd': 5, 'series d': 5,
  'growth': 4, 'late': 4
};

function parseStageToNumeric(stageInput) {
  if (!stageInput) return null;
  
  // If already numeric, return it
  if (typeof stageInput === 'number') return stageInput;
  
  const stageStr = String(stageInput).toLowerCase().trim();
  
  // Direct mapping
  if (STAGE_MAP[stageStr]) {
    return STAGE_MAP[stageStr];
  }
  
  // Pattern matching
  if (stageStr.includes('series a')) return 2;
  if (stageStr.includes('series b')) return 3;
  if (stageStr.includes('series c')) return 4;
  if (stageStr.includes('series d')) return 5;
  if (stageStr.includes('seed')) return 1;
  if (stageStr.includes('pre-seed') || stageStr.includes('preseed')) return 0;
  if (stageStr.includes('angel')) return 0;
  
  return null;
}

function inferStageFromAmount(amountStr) {
  if (!amountStr) return null;
  
  const cleaned = amountStr.toString().toLowerCase().replace(/[$,]/g, '').trim();
  const match = cleaned.match(/([\d.]+)\s*([kmb])?/);
  
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'm').toLowerCase();
  
  let amount = value;
  if (unit === 'k') amount = value / 1000;
  if (unit === 'b') amount = value * 1000;
  
  // Series A: typically $5M-$15M
  if (amount >= 5 && amount < 15) return 2;
  // Series B: typically $15M-$50M
  if (amount >= 15 && amount < 50) return 3;
  // Series C: typically $50M+
  if (amount >= 50 && amount < 200) return 4;
  // Series D+: $200M+
  if (amount >= 200) return 5;
  
  return null;
}

async function fixMissingStages() {
  console.log('🔍 Finding startups with missing Series A/B stages...\n');

  try {
    // Step 1: Get all approved startups
    const { data: startups, error: fetchError } = await supabase
      .from('startup_uploads')
      .select('id, name, stage, raise_type, raise_amount, extracted_data')
      .eq('status', 'approved')
      .limit(5000);

    if (fetchError) {
      console.error('❌ Error fetching startups:', fetchError);
      return;
    }

    console.log(`✅ Loaded ${startups.length} approved startups\n`);

    // Step 2: Check funding_rounds table for Series A/B data (if table exists)
    let fundingRounds = [];
    try {
      const { data, error } = await supabase
        .from('funding_rounds')
        .select('startup_id, round_type, amount')
        .or('round_type.ilike.%Series A%,round_type.ilike.%Series B%,round_type.ilike.%series_a%,round_type.ilike.%series_b%');
      
      if (!error && data) {
        fundingRounds = data;
      }
    } catch (err) {
      // Table might not exist, that's OK
      console.log('⚠️  funding_rounds table not accessible (may not exist)');
    }

    const fundingRoundsMap = new Map();
    if (fundingRounds) {
      fundingRounds.forEach(fr => {
        const roundType = (fr.round_type || '').toLowerCase();
        let stage = null;
        if (roundType.includes('series a')) stage = 2;
        if (roundType.includes('series b')) stage = 3;
        if (stage) {
          fundingRoundsMap.set(fr.startup_id, { stage, amount: fr.amount });
        }
      });
    }

    console.log(`✅ Found ${fundingRoundsMap.size} startups with Series A/B in funding_rounds\n`);

    // Step 3: Analyze each startup for missing signals
    const needsUpdate = [];
    let checked = 0;

    for (const startup of startups) {
      checked++;
      if (checked % 500 === 0) {
        console.log(`   Checked ${checked}/${startups.length} startups...`);
      }

      const extracted = startup.extracted_data || {};
      let shouldBeStage = null;
      let source = null;
      let evidence = null;

      // Check 1: funding_rounds table (most reliable)
      if (fundingRoundsMap.has(startup.id)) {
        const roundInfo = fundingRoundsMap.get(startup.id);
        shouldBeStage = roundInfo.stage;
        source = 'funding_rounds';
        evidence = `Round type in funding_rounds`;
      }
      // Check 2: extracted_data.funding_stage
      else if (extracted.funding_stage) {
        shouldBeStage = parseStageToNumeric(extracted.funding_stage);
        if (shouldBeStage && shouldBeStage >= 2) {
          source = 'extracted_data.funding_stage';
          evidence = extracted.funding_stage;
        }
      }
      // Check 3: extracted_data.round_type
      else if (extracted.round_type) {
        shouldBeStage = parseStageToNumeric(extracted.round_type);
        if (shouldBeStage && shouldBeStage >= 2) {
          source = 'extracted_data.round_type';
          evidence = extracted.round_type;
        }
      }
      // Check 4: raise_type field
      else if (startup.raise_type) {
        shouldBeStage = parseStageToNumeric(startup.raise_type);
        if (shouldBeStage && shouldBeStage >= 2) {
          source = 'raise_type';
          evidence = startup.raise_type;
        }
      }
      // Check 5: Infer from funding amount
      else if (extracted.funding_amount || startup.raise_amount) {
        const amount = extracted.funding_amount || startup.raise_amount;
        shouldBeStage = inferStageFromAmount(amount);
        if (shouldBeStage && shouldBeStage >= 2) {
          source = 'funding_amount_inference';
          evidence = amount;
        }
      }

      // If we found a Series A/B signal and current stage is wrong
      if (shouldBeStage && shouldBeStage >= 2 && startup.stage !== shouldBeStage) {
        needsUpdate.push({
          id: startup.id,
          name: startup.name,
          currentStage: startup.stage,
          shouldBeStage,
          source,
          evidence
        });
      }
    }

    console.log(`\n📊 Analysis Complete:\n`);
    console.log(`  Total startups checked: ${startups.length}`);
    console.log(`  Startups needing stage update: ${needsUpdate.length}\n`);

    if (needsUpdate.length === 0) {
      console.log('✅ All startups have correct stages!');
      return;
    }

    // Breakdown by target stage
    const seriesA = needsUpdate.filter(u => u.shouldBeStage === 2);
    const seriesB = needsUpdate.filter(u => u.shouldBeStage === 3);
    const seriesCPlus = needsUpdate.filter(u => u.shouldBeStage >= 4);

    console.log(`📈 Breakdown:`);
    console.log(`  Should be Series A (Stage 2): ${seriesA.length}`);
    console.log(`  Should be Series B (Stage 3): ${seriesB.length}`);
    console.log(`  Should be Series C+ (Stage 4+): ${seriesCPlus.length}\n`);

    // Show samples
    if (seriesA.length > 0) {
      console.log(`📋 Sample Series A Updates (First 10):`);
      seriesA.slice(0, 10).forEach(u => {
        console.log(`  - ${u.name}: ${u.currentStage || 'NULL'} → ${u.shouldBeStage} (${u.source}: ${u.evidence})`);
      });
      console.log();
    }

    if (seriesB.length > 0) {
      console.log(`📋 Sample Series B Updates (First 10):`);
      seriesB.slice(0, 10).forEach(u => {
        console.log(`  - ${u.name}: ${u.currentStage || 'NULL'} → ${u.shouldBeStage} (${u.source}: ${u.evidence})`);
      });
      console.log();
    }

    // Step 4: Ask for confirmation and update
    console.log(`🔧 Ready to update ${needsUpdate.length} startups...\n`);
    console.log('⚠️  This will update the stage field. Continue? (Ctrl+C to cancel, or wait 5 seconds...)');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Batch update
    const BATCH_SIZE = 50;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < needsUpdate.length; i += BATCH_SIZE) {
      const batch = needsUpdate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(needsUpdate.length / BATCH_SIZE);

      console.log(`📦 Updating batch ${batchNum}/${totalBatches} (${batch.length} startups)...`);

      // Update each startup individually (Supabase doesn't support bulk updates with different values easily)
      for (const update of batch) {
        const { error } = await supabase
          .from('startup_uploads')
          .update({ 
            stage: update.shouldBeStage,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (error) {
          console.error(`  ❌ ${update.name}: ${error.message}`);
          errors++;
        } else {
          updated++;
        }
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Successfully updated: ${updated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📝 Total processed: ${needsUpdate.length}\n`);

    // Step 5: Verify results
    console.log('🔍 Verifying updates...');
    const { count: seriesACount } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('stage', 2);

    const { count: seriesBCount } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('stage', 3);

    console.log(`✅ Final counts:`);
    console.log(`  Series A (Stage 2): ${seriesACount || 0}`);
    console.log(`  Series B (Stage 3): ${seriesBCount || 0}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixMissingStages();
