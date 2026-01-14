#!/usr/bin/env node
/**
 * CLEANUP NON-STARTUP COMPANIES
 * 
 * Identifies and removes established companies (like GitHub, Google, etc.) from startup_uploads
 * 
 * These are NOT startups:
 * - Public companies (GitHub, Microsoft, Google, etc.)
 * - Established tech companies
 * - Fortune 500 companies
 * - Companies that are too mature to be startups
 * 
 * Solution:
 * - Use companyFilters.js to identify non-startups
 * - Mark as 'rejected' in startup_uploads (safer than deletion)
 * - Also clean up discovered_startups table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { isPublicCompany, isMatureStartup, isClosedOrFailed } = require('../utils/companyFilters.js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findNonStartups(table = 'startup_uploads', statusFilter = 'approved') {
  console.log(`\n🔍 Finding non-startup companies in ${table}...\n`);
  
  try {
    // Get all companies (or approved ones)
    let query = supabase.from(table).select('id, name, tagline, description, pitch, status, website');
    
    if (table === 'startup_uploads' && statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    const { data: companies, error: fetchError } = await query;
    
    if (fetchError) throw fetchError;
    
    if (!companies || companies.length === 0) {
      console.log(`✅ No companies found in ${table}`);
      return [];
    }
    
    console.log(`📊 Total companies checked: ${companies.length}`);
    
    const nonStartups = [];
    
    for (const company of companies) {
      const name = company.name || '';
      const tagline = company.tagline || '';
      const description = company.description || '';
      const pitch = company.pitch || '';
      const website = company.website || '';
      
      const allText = `${name} ${tagline} ${description} ${pitch} ${website}`.toLowerCase();
      
      // Check if it's a non-startup
      let reason = '';
      
      if (isPublicCompany(name, allText)) {
        reason = 'Public company';
      } else if (isMatureStartup(name, allText, company)) {
        reason = 'Mature/established startup';
      } else if (isClosedOrFailed(name, allText)) {
        reason = 'Closed/failed company';
      }
      
      if (reason) {
        nonStartups.push({
          ...company,
          reason
        });
      }
    }
    
    console.log(`\n📈 Analysis:`);
    console.log(`   Total companies: ${companies.length}`);
    console.log(`   Non-startups found: ${nonStartups.length}`);
    console.log(`   Percentage: ${((nonStartups.length / companies.length) * 100).toFixed(1)}%`);
    
    // Group by reason
    const byReason = {};
    for (const company of nonStartups) {
      if (!byReason[company.reason]) {
        byReason[company.reason] = [];
      }
      byReason[company.reason].push(company.name);
    }
    
    console.log(`\n📊 Breakdown by category:`);
    for (const [reason, names] of Object.entries(byReason)) {
      console.log(`   ${reason}: ${names.length} companies`);
      if (names.length <= 10) {
        names.forEach(name => console.log(`      - ${name}`));
      } else {
        names.slice(0, 10).forEach(name => console.log(`      - ${name}`));
        console.log(`      ... and ${names.length - 10} more`);
      }
    }
    
    return nonStartups;
    
  } catch (error) {
    console.error('❌ Error finding non-startups:', error.message);
    throw error;
  }
}

async function removeNonStartups(table = 'startup_uploads', dryRun = true) {
  console.log('\n' + '='.repeat(60));
  console.log(dryRun ? '🔍 DRY RUN MODE - No changes will be made' : '🗑️  REMOVING NON-STARTUP COMPANIES');
  console.log('='.repeat(60));
  
  const nonStartups = await findNonStartups(table);
  
  if (nonStartups.length === 0) {
    console.log('\n✅ No non-startup companies found. Database is clean!\n');
    return;
  }
  
  if (dryRun) {
    console.log(`\n📋 Would mark ${nonStartups.length} companies as rejected`);
    console.log('\n💡 Run with --execute to actually remove them\n');
    return;
  }
  
  console.log(`\n🗑️  Marking ${nonStartups.length} companies as rejected...\n`);
  
  let updated = 0;
  let errors = 0;
  
  // Process in batches
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < nonStartups.length; i += BATCH_SIZE) {
    const batch = nonStartups.slice(i, i + BATCH_SIZE);
    const ids = batch.map(c => c.id);
    
    try {
      if (table === 'startup_uploads') {
        // Mark as rejected
        const { error } = await supabase
          .from('startup_uploads')
          .update({ 
            status: 'rejected',
            admin_notes: `Auto-rejected: ${batch[0].reason} (cleanup script)`
          })
          .in('id', ids);
        
        if (error) throw error;
      } else if (table === 'discovered_startups') {
        // Delete from discovered_startups (these haven't been imported yet)
        const { error } = await supabase
          .from('discovered_startups')
          .delete()
          .in('id', ids);
        
        if (error) throw error;
      }
      
      updated += batch.length;
      process.stdout.write(`   Processed ${updated}/${nonStartups.length} companies...\r`);
      
    } catch (error) {
      console.error(`\n   ❌ Error processing batch ${i / BATCH_SIZE + 1}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n\n✅ Cleanup complete!`);
  console.log(`   Processed: ${updated} companies`);
  console.log(`   Errors: ${errors}`);
  
  if (table === 'startup_uploads') {
    console.log(`   Status: Marked as 'rejected' (not deleted)\n`);
  } else {
    console.log(`   Status: Deleted from ${table}\n`);
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const table = args.includes('--discovered') ? 'discovered_startups' : 'startup_uploads';

removeNonStartups(table, dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
