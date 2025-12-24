#!/usr/bin/env node
/**
 * BACKFILL INFERENCE DATA
 * 
 * Runs the inference extractor on existing discovered_startups
 * that have descriptions but missing inference fields.
 * 
 * This populates: sectors, funding_stage, team_signals, grit_signals,
 * has_technical_cofounder, is_launched, has_revenue, etc.
 * 
 * Usage:
 *   node scripts/backfill-inference-data.js [--limit 100]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { extractInferenceData } = require('../lib/inference-extractor');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Parse command line args
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const BATCH_LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 500;

async function backfillInferenceData() {
  console.log('═'.repeat(65));
  console.log('    🧠 BACKFILL INFERENCE DATA');
  console.log('═'.repeat(65));
  console.log(`\n📊 Processing up to ${BATCH_LIMIT} startups...\n`);

  // Get startups that have descriptions but missing inference data
  const { data: startups, error } = await supabase
    .from('discovered_startups')
    .select('id, name, description, article_url, funding_amount, funding_stage, sectors')
    .or('sectors.is.null,funding_stage.is.null')
    .not('description', 'is', null)
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }

  console.log(`📋 Found ${startups.length} startups to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < startups.length; i++) {
    const startup = startups[i];
    
    // Use description as the text to extract from
    const textToAnalyze = [
      startup.name,
      startup.description
    ].filter(Boolean).join('. ');

    if (!textToAnalyze || textToAnalyze.length < 20) {
      skipped++;
      continue;
    }

    try {
      // Run inference extraction
      const inference = extractInferenceData(textToAnalyze, startup.article_url || '');

      if (!inference) {
        skipped++;
        continue;
      }

      // Build update object - only update fields that were extracted
      const updateData = {};
      
      // Only update if we found new data and field is empty
      if (inference.sectors?.length > 0 && (!startup.sectors || startup.sectors.length === 0)) {
        updateData.sectors = inference.sectors;
      }
      if (inference.funding_stage && !startup.funding_stage) {
        updateData.funding_stage = inference.funding_stage;
      }
      if (inference.funding_amount && !startup.funding_amount) {
        updateData.funding_amount = inference.funding_amount;
      }
      if (inference.lead_investor) {
        updateData.lead_investor = inference.lead_investor;
      }
      if (inference.has_technical_cofounder) {
        updateData.has_technical_cofounder = true;
      }
      if (inference.is_launched) {
        updateData.is_launched = true;
      }
      if (inference.has_revenue) {
        updateData.has_revenue = true;
      }
      if (inference.has_customers) {
        updateData.has_customers = true;
        if (inference.customer_count) {
          updateData.customer_count = inference.customer_count;
        }
      }
      if (inference.team_signals?.length > 0) {
        updateData.team_signals = inference.team_signals;
      }
      if (inference.grit_signals?.length > 0) {
        updateData.grit_signals = inference.grit_signals.map(g => g.signal || g);
      }
      if (inference.credential_signals?.length > 0) {
        updateData.credential_signals = inference.credential_signals;
      }
      if (inference.execution_signals?.length > 0) {
        updateData.execution_signals = inference.execution_signals;
      }
      if (inference.founders?.length > 0) {
        updateData.founders = inference.founders;
      }

      // Only update if we have something to update
      if (Object.keys(updateData).length === 0) {
        skipped++;
        continue;
      }

      // Update the record
      const { error: updateError } = await supabase
        .from('discovered_startups')
        .update(updateData)
        .eq('id', startup.id);

      if (updateError) {
        errors++;
        if (errors <= 5) {
          console.log(`  ❌ ${startup.name}: ${updateError.message}`);
        }
      } else {
        updated++;
        // Show progress every 50 records
        if (updated % 50 === 0 || updated <= 10) {
          const fields = Object.keys(updateData).join(', ');
          console.log(`  ✅ [${updated}] ${startup.name} - ${fields}`);
        }
      }

    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.log(`  ❌ ${startup.name}: ${err.message}`);
      }
    }

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${startups.length} processed...\n`);
    }
  }

  console.log('\n' + '═'.repeat(65));
  console.log('    📊 BACKFILL COMPLETE');
  console.log('═'.repeat(65));
  console.log(`\n  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`\n  Total processed: ${startups.length}`);
  console.log('═'.repeat(65));
}

// Also backfill startup_uploads
async function backfillStartupUploads() {
  console.log('\n\n═'.repeat(65));
  console.log('    🧠 BACKFILL STARTUP_UPLOADS');
  console.log('═'.repeat(65));

  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, description, tagline, sectors')
    .or('sectors.is.null,has_technical_cofounder.is.null')
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('❌ Error fetching startup_uploads:', error.message);
    return;
  }

  console.log(`\n📋 Found ${startups.length} startup_uploads to process\n`);

  let updated = 0;
  let skipped = 0;

  for (const startup of startups) {
    // Combine all text fields for analysis
    const textToAnalyze = [
      startup.name,
      startup.tagline,
      startup.description
    ].filter(Boolean).join('. ');

    if (!textToAnalyze || textToAnalyze.length < 20) {
      skipped++;
      continue;
    }

    const inference = extractInferenceData(textToAnalyze, '');
    if (!inference) {
      skipped++;
      continue;
    }

    const updateData = {};
    
    if (inference.sectors?.length > 0 && (!startup.sectors || startup.sectors.length === 0)) {
      updateData.sectors = inference.sectors;
    }
    if (inference.has_technical_cofounder) {
      updateData.has_technical_cofounder = true;
    }
    if (inference.is_launched) {
      updateData.is_launched = true;
    }
    if (inference.has_revenue) {
      updateData.has_revenue = true;
    }
    if (inference.team_signals?.length > 0) {
      updateData.team_signals = inference.team_signals;
    }
    if (inference.grit_signals?.length > 0) {
      updateData.grit_signals = inference.grit_signals.map(g => g.signal || g);
    }
    if (inference.execution_signals?.length > 0) {
      updateData.execution_signals = inference.execution_signals;
    }

    if (Object.keys(updateData).length === 0) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update(updateData)
      .eq('id', startup.id);

    if (!updateError) {
      updated++;
      if (updated % 50 === 0 || updated <= 5) {
        console.log(`  ✅ [${updated}] ${startup.name}`);
      }
    }
  }

  console.log(`\n  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
}

// Main
async function main() {
  const startTime = Date.now();
  
  await backfillInferenceData();
  await backfillStartupUploads();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Total time: ${duration}s`);
  
  // Trigger GOD score recalculation reminder
  console.log('\n💡 TIP: Run GOD score recalculation to update scores:');
  console.log('   npx tsx scripts/recalculate-scores.ts');
}

main().catch(console.error);
