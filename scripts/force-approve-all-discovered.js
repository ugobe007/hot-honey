#!/usr/bin/env node
/**
 * Force Approve ALL Discovered Startups (Even if Already Imported)
 * Use this to process ALL 832 discovered startups, not just unimported ones
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function forceApproveAll() {
  console.log('🚀 Force approving ALL discovered startups (including already imported)...\n');

  try {
    // Fetch ALL discovered startups (ignore import status)
    console.log('📊 Fetching ALL discovered startups...');
    const { data: discovered, error: fetchError } = await supabase
      .from('discovered_startups')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching discovered startups:', fetchError);
      return;
    }

    if (!discovered || discovered.length === 0) {
      console.log('✅ No discovered startups found!');
      return;
    }

    console.log(`✅ Found ${discovered.length} total discovered startups\n`);

    // Filter out ones that already exist in startup_uploads by name/website
    console.log('🔍 Checking for duplicates in startup_uploads...');
    const { data: existingStartups } = await supabase
      .from('startup_uploads')
      .select('name, website');

    const existingNames = new Set(
      (existingStartups || []).map(s => s.name?.toLowerCase().trim()).filter(Boolean)
    );
    const existingWebsites = new Set(
      (existingStartups || []).map(s => s.website?.toLowerCase().trim()).filter(Boolean)
    );

    const toProcess = discovered.filter(ds => {
      const name = ds.name?.toLowerCase().trim();
      const website = ds.website?.toLowerCase().trim();
      
      // Skip if already exists by name or website
      if (name && existingNames.has(name)) {
        return false;
      }
      if (website && existingWebsites.has(website)) {
        return false;
      }
      return true;
    });

    console.log(`✅ After duplicate check: ${toProcess.length} startups to process\n`);

    if (toProcess.length === 0) {
      console.log('ℹ️  All discovered startups already exist in startup_uploads\n');
      return;
    }

    // Transform to startup_uploads format
    console.log('🔄 Transforming data format...');
    const startupUploads = toProcess.map(ds => ({
      name: ds.name || 'Unnamed Startup',
      description: ds.description || null,
      tagline: ds.description?.substring(0, 200) || null,
      website: ds.website || null,
      linkedin: null,
      sectors: ds.sectors || ds.industries || [],
      stage: ds.stage || ds.funding_stage || null,
      raise_amount: ds.funding_amount || ds.raise_amount || null,
      raise_type: ds.funding_stage || null,
      location: ds.location || null,
      source_type: 'url',
      source_url: ds.website || ds.article_url || null,
      extracted_data: {
        name: ds.name,
        description: ds.description,
        website: ds.website,
        sectors: ds.sectors || ds.industries,
        stage: ds.stage || ds.funding_stage,
        location: ds.location,
        funding_amount: ds.funding_amount,
        funding_stage: ds.funding_stage,
        investors_mentioned: ds.investors_mentioned,
        article_url: ds.article_url,
        article_title: ds.article_title,
        rss_source: ds.rss_source,
        original_source: 'discovered_startups',
        original_id: ds.id
      },
      status: 'approved',
      created_at: ds.created_at || ds.discovered_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log(`✅ Prepared ${startupUploads.length} startups for insertion\n`);

    // Insert in batches
    const BATCH_SIZE = 50;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < startupUploads.length; i += BATCH_SIZE) {
      const batch = startupUploads.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(startupUploads.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} startups)...`);

      const { data: inserted, error: insertError } = await supabase
        .from('startup_uploads')
        .insert(batch)
        .select('id, name');

      if (insertError) {
        // Check if it's a duplicate key error
        if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          console.log(`⚠️  Batch ${batchNum} contains duplicates, skipping...`);
          totalSkipped += batch.length;
        } else {
          console.error(`❌ Error inserting batch ${batchNum}:`, insertError.message);
        }
      } else {
        console.log(`✅ Batch ${batchNum} inserted successfully (${inserted.length} startups)`);
        totalInserted += inserted.length;

        // Mark as imported
        const discoveredIds = batch.map((_, idx) => toProcess[i + idx].id);
        const { error: updateError } = await supabase
          .from('discovered_startups')
          .update({ 
            imported_to_startups: true, 
            imported_at: new Date().toISOString()
          })
          .in('id', discoveredIds);

        if (updateError) {
          console.warn(`⚠️  Warning: Could not mark batch ${batchNum} as imported:`, updateError.message);
        }
      }

      // Small delay
      if (i + BATCH_SIZE < startupUploads.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully inserted: ${totalInserted} startups`);
    console.log(`  ⏭️  Skipped (duplicates): ${totalSkipped} startups`);
    console.log(`  📝 Total processed: ${startupUploads.length} startups\n`);

    // Verify results
    const { count: approvedCount } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    console.log(`✅ Total approved startups in database: ${approvedCount || 0}\n`);

    if (totalInserted > 0) {
      console.log('🎉 Force approval completed successfully!');
      console.log('🚀 Next step: Run queue processor to generate matches for new startups\n');
    } else {
      console.log('ℹ️  No new startups were inserted (all were duplicates)\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

forceApproveAll();
