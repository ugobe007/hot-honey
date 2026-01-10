#!/usr/bin/env node
/**
 * Approve All Discovered Startups
 * Processes all discovered startups and adds them to startup_uploads with 'approved' status
 * This is for bulk approval of the 808 waiting startups
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function approveAllDiscoveredStartups() {
  console.log('🚀 Starting bulk approval of discovered startups...\n');

  try {
    // Step 1: Fetch all unprocessed discovered startups
    console.log('📊 Fetching discovered startups...');
    const { data: discovered, error: fetchError } = await supabase
      .from('discovered_startups')
      .select('*')
      .or('imported_to_startups.is.null,imported_to_startups.eq.false')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching discovered startups:', fetchError);
      return;
    }

    if (!discovered || discovered.length === 0) {
      console.log('✅ No discovered startups to process!');
      return;
    }

    console.log(`✅ Found ${discovered.length} discovered startups to process\n`);

    // Stage mapping function (matching queue-processor-v16.js)
    const parseStageToNumeric = (stageInput) => {
      if (!stageInput) return null;
      if (typeof stageInput === 'number') return stageInput;
      
      const stageStr = String(stageInput).toLowerCase().trim();
      const STAGE_MAP = {
        'pre-seed': 0, 'preseed': 0, 'pre seed': 0, 'angel': 0,
        'seed': 1,
        'series a': 2, 'series-a': 2, 'seriesa': 2,
        'series b': 3, 'series-b': 3, 'seriesb': 3,
        'series c': 4, 'series-c': 4, 'seriesc': 4,
        'series d': 5, 'series-d': 5, 'seriesd': 5,
        'growth': 4, 'late': 4
      };
      
      if (STAGE_MAP[stageStr]) return STAGE_MAP[stageStr];
      if (stageStr.includes('series a')) return 2;
      if (stageStr.includes('series b')) return 3;
      if (stageStr.includes('series c')) return 4;
      if (stageStr.includes('series d')) return 5;
      if (stageStr.includes('seed')) return 1;
      if (stageStr.includes('pre-seed') || stageStr.includes('preseed')) return 0;
      return null;
    };

    // Step 2: Transform discovered startups to startup_uploads format
    console.log('🔄 Transforming data format...');
    const startupUploads = discovered.map(ds => {
      // Extract funding stage from multiple sources
      const fundingStage = ds.funding_stage || ds.stage || null;
      const stageNumeric = parseStageToNumeric(fundingStage);
      const raiseType = ds.funding_stage || ds.raise_type || fundingStage;
      
      return {
        name: ds.name || 'Unnamed Startup',
        description: ds.description || ds.pitch || null,
        tagline: ds.tagline || ds.description?.substring(0, 200) || null,
        website: ds.website || ds.url || null,
        linkedin: ds.linkedin || null,
        sectors: ds.sectors || ds.industries || [],
        stage: stageNumeric, // Convert to numeric (2 = Series A, 3 = Series B)
        raise_amount: ds.funding_amount || ds.raise_amount || null,
        raise_type: raiseType, // Keep original text for reference
        location: ds.location || null,
        source_type: 'url',
        source_url: ds.website || ds.url || null,
        extracted_data: {
          name: ds.name,
          description: ds.description,
          website: ds.website || ds.url,
          sectors: ds.sectors || ds.industries,
          stage: fundingStage, // Keep original text
          funding_stage: fundingStage, // Explicit funding stage
          funding_amount: ds.funding_amount || ds.raise_amount,
          location: ds.location,
          investors_mentioned: ds.investors_mentioned,
          original_source: 'discovered_startups',
          original_id: ds.id
        },
        status: 'approved', // Auto-approve for bulk import
        created_at: ds.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    console.log(`✅ Prepared ${startupUploads.length} startups for insertion\n`);

    // Step 3: Insert in batches to avoid timeouts
    const BATCH_SIZE = 50;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < startupUploads.length; i += BATCH_SIZE) {
      const batch = startupUploads.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(startupUploads.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} startups)...`);

      const { data: inserted, error: insertError } = await supabase
        .from('startup_uploads')
        .insert(batch)
        .select('id');

      if (insertError) {
        console.error(`❌ Error inserting batch ${batchNum}:`, insertError.message);
        totalErrors += batch.length;
      } else {
        console.log(`✅ Batch ${batchNum} inserted successfully (${inserted.length} startups)`);
        totalInserted += inserted.length;

        // Mark discovered startups as imported
        const discoveredIds = batch.map((_, idx) => discovered[i + idx].id);
        const { error: updateError } = await supabase
          .from('discovered_startups')
          .update({ 
            imported_to_startups: true, 
            imported_at: new Date().toISOString(),
            startup_id: inserted[0]?.id || null  // Link to first inserted startup (approximation)
          })
          .in('id', discoveredIds);

        if (updateError) {
          console.warn(`⚠️ Warning: Could not mark batch ${batchNum} as processed:`, updateError.message);
        }
      }

      // Small delay to avoid rate limiting
      if (i + BATCH_SIZE < startupUploads.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully inserted: ${totalInserted} startups`);
    console.log(`  ❌ Errors: ${totalErrors} startups`);
    console.log(`  📝 Total processed: ${startupUploads.length} startups\n`);

    // Step 4: Verify results
    console.log('🔍 Verifying results...');
    const { count: approvedCount } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    console.log(`✅ Total approved startups in database: ${approvedCount || 0}\n`);

    if (totalInserted > 0) {
      console.log('🎉 Bulk approval completed successfully!');
      console.log('🚀 Next step: Run queue processor to generate matches for new startups\n');
    } else {
      console.log('⚠️ No startups were inserted. Check errors above.\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
approveAllDiscoveredStartups();
