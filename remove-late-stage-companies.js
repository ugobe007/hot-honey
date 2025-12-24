#!/usr/bin/env node
/**
 * REMOVE LATE-STAGE COMPANIES
 * 
 * Identifies and removes late-stage companies (like xAI, Substack) that
 * should only be tracked as investors (corporate VC), not as startups.
 * 
 * Run: node remove-late-stage-companies.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { shouldFilterCompany } = require('./utils/companyFilters');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function removeLateStageCompanies() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚫 REMOVING LATE-STAGE COMPANIES                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  let totalRemoved = 0;
  let totalChecked = 0;

  // 1. Check startup_uploads
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  CHECKING startup_uploads');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: uploads, error: uploadsError } = await supabase
    .from('startup_uploads')
    .select('id, name, description, extracted_data')
    .eq('status', 'approved')
    .limit(5000);

  if (uploadsError) {
    console.error(`❌ Error fetching startup_uploads: ${uploadsError.message}`);
  } else if (uploads && uploads.length > 0) {
    console.log(`📊 Checking ${uploads.length} approved startups...\n`);
    
    const toRemove = [];
    for (const startup of uploads) {
      totalChecked++;
      const name = startup.name;
      const description = startup.description || startup.extracted_data?.description || '';
      const fundingStage = startup.extracted_data?.funding_stage;
      
      const filterResult = shouldFilterCompany(name, description, fundingStage);
      
      if (filterResult.shouldFilter) {
        toRemove.push({
          id: startup.id,
          name: name,
          reason: filterResult.reason
        });
        console.log(`   🚫 ${name} - ${filterResult.reason}`);
      }
    }
    
    if (toRemove.length > 0) {
      console.log(`\n🗑️  Removing ${toRemove.length} late-stage companies from startup_uploads...`);
      
      for (const item of toRemove) {
        const { error: deleteError } = await supabase
          .from('startup_uploads')
          .delete()
          .eq('id', item.id);
        
        if (deleteError) {
          console.error(`   ❌ Error removing ${item.name}: ${deleteError.message}`);
        } else {
          totalRemoved++;
          console.log(`   ✅ Removed: ${item.name}`);
        }
      }
    } else {
      console.log('   ✅ No late-stage companies found in startup_uploads');
    }
  }

  // 2. Check discovered_startups
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  CHECKING discovered_startups');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: discovered, error: discoveredError } = await supabase
    .from('discovered_startups')
    .select('id, name, description, funding_stage')
    .limit(5000);

  if (discoveredError) {
    console.error(`❌ Error fetching discovered_startups: ${discoveredError.message}`);
  } else if (discovered && discovered.length > 0) {
    console.log(`📊 Checking ${discovered.length} discovered startups...\n`);
    
    const toRemove = [];
    for (const startup of discovered) {
      totalChecked++;
      const name = startup.name;
      const description = startup.description || '';
      const fundingStage = startup.funding_stage;
      
      const filterResult = shouldFilterCompany(name, description, fundingStage);
      
      if (filterResult.shouldFilter) {
        toRemove.push({
          id: startup.id,
          name: name,
          reason: filterResult.reason
        });
        console.log(`   🚫 ${name} - ${filterResult.reason}`);
      }
    }
    
    if (toRemove.length > 0) {
      console.log(`\n🗑️  Removing ${toRemove.length} late-stage companies from discovered_startups...`);
      
      for (const item of toRemove) {
        const { error: deleteError } = await supabase
          .from('discovered_startups')
          .delete()
          .eq('id', item.id);
        
        if (deleteError) {
          console.error(`   ❌ Error removing ${item.name}: ${deleteError.message}`);
        } else {
          totalRemoved++;
          console.log(`   ✅ Removed: ${item.name}`);
        }
      }
    } else {
      console.log('   ✅ No late-stage companies found in discovered_startups');
    }
  }

  // 3. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Checked: ${totalChecked} companies`);
  console.log(`🗑️  Removed: ${totalRemoved} late-stage companies`);
  console.log(`\n💡 Note: These companies can still be tracked as investors (corporate VC)`);
  console.log(`   if they make investments in other startups.\n`);
}

removeLateStageCompanies().catch(console.error);



