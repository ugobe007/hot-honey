#!/usr/bin/env node
/**
 * CHECK STARTUP DATA QUALITY
 * ==========================
 * Analyzes what data fields are populated in the startup_uploads table
 * to understand why GOD scores are so low
 * 
 * Usage: node scripts/check-startup-data-quality.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDataQuality() {
  console.log('\n' + '📊'.repeat(40));
  console.log('   STARTUP DATA QUALITY ANALYSIS');
  console.log('📊'.repeat(40) + '\n');

  // Sample 100 startups to check data completeness
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved')
    .limit(100);

  if (!startups || startups.length === 0) {
    console.log('No approved startups found.');
    return;
  }

  const total = startups.length;
  let hasArr = 0, hasMrr = 0, hasGrowth = 0, hasCustomers = 0;
  let hasTeamSize = 0, hasStage = 0, hasSectors = 0;
  let hasTagline = 0, hasDescription = 0, hasWebsite = 0;
  let hasExtractedData = 0;
  let arrTotal = 0, mrrTotal = 0, customerTotal = 0;

  startups.forEach(startup => {
    // Check key scoring fields
    if (startup.arr && startup.arr > 0) { hasArr++; arrTotal += startup.arr; }
    if (startup.mrr && startup.mrr > 0) { hasMrr++; mrrTotal += startup.mrr; }
    if (startup.growth_rate_monthly && startup.growth_rate_monthly > 0) { hasGrowth++; }
    if (startup.customer_count && startup.customer_count > 0) { hasCustomers++; customerTotal += startup.customer_count; }
    
    // Check team/stage fields
    if (startup.team_size && startup.team_size > 0) { hasTeamSize++; }
    if (startup.stage && startup.stage > 0) { hasStage++; }
    if (startup.sectors && Array.isArray(startup.sectors) && startup.sectors.length > 0) { hasSectors++; }
    
    // Check basic info
    if (startup.tagline) { hasTagline++; }
    if (startup.description) { hasDescription++; }
    if (startup.website) { hasWebsite++; }
    if (startup.extracted_data) { hasExtractedData++; }
  });

  console.log('📋 DATA COMPLETENESS (Sample of', total, 'startups)');
  console.log('─'.repeat(60));
  console.log(`\n💰 TRACTION DATA (Critical for scoring):`);
  console.log(`   ARR:               ${hasArr} (${((hasArr/total)*100).toFixed(1)}%) ${hasArr > 0 ? `- Avg: $${(arrTotal/hasArr/1000).toFixed(1)}K` : ''}`);
  console.log(`   MRR:               ${hasMrr} (${((hasMrr/total)*100).toFixed(1)}%) ${hasMrr > 0 ? `- Avg: $${(mrrTotal/hasMrr/1000).toFixed(1)}K` : ''}`);
  console.log(`   Growth Rate:       ${hasGrowth} (${((hasGrowth/total)*100).toFixed(1)}%)`);
  console.log(`   Customer Count:    ${hasCustomers} (${((hasCustomers/total)*100).toFixed(1)}%) ${hasCustomers > 0 ? `- Avg: ${(customerTotal/hasCustomers).toFixed(0)}` : ''}`);
  
  console.log(`\n👥 TEAM/STAGE DATA:`);
  console.log(`   Team Size:         ${hasTeamSize} (${((hasTeamSize/total)*100).toFixed(1)}%)`);
  console.log(`   Stage:             ${hasStage} (${((hasStage/total)*100).toFixed(1)}%)`);
  console.log(`   Sectors:           ${hasSectors} (${((hasSectors/total)*100).toFixed(1)}%)`);
  
  console.log(`\n📝 BASIC INFO:`);
  console.log(`   Tagline:           ${hasTagline} (${((hasTagline/total)*100).toFixed(1)}%)`);
  console.log(`   Description:       ${hasDescription} (${((hasDescription/total)*100).toFixed(1)}%)`);
  console.log(`   Website:           ${hasWebsite} (${((hasWebsite/total)*100).toFixed(1)}%)`);
  console.log(`   Extracted Data:    ${hasExtractedData} (${((hasExtractedData/total)*100).toFixed(1)}%)`);

  // Check extracted_data structure
  if (hasExtractedData > 0) {
    console.log(`\n🔍 EXTRACTED_DATA ANALYSIS:`);
    const withExtracted = startups.filter(s => s.extracted_data);
    const sample = withExtracted[0];
    if (sample && sample.extracted_data) {
      console.log(`   Sample keys: ${Object.keys(sample.extracted_data).slice(0, 10).join(', ')}`);
      
      // Check for common fields in extracted_data
      let hasExtractedArr = 0, hasExtractedMrr = 0, hasExtractedCustomers = 0;
      withExtracted.forEach(s => {
        const ext = s.extracted_data;
        if (ext.arr || ext.annual_recurring_revenue || ext.revenue) hasExtractedArr++;
        if (ext.mrr || ext.monthly_recurring_revenue) hasExtractedMrr++;
        if (ext.customers || ext.customer_count || ext.user_count) hasExtractedCustomers++;
      });
      
      console.log(`   Data in extracted_data:`);
      console.log(`     Revenue/ARR:    ${hasExtractedArr} (${((hasExtractedArr/withExtracted.length)*100).toFixed(1)}%)`);
      console.log(`     MRR:            ${hasExtractedMrr} (${((hasExtractedMrr/withExtracted.length)*100).toFixed(1)}%)`);
      console.log(`     Customers:      ${hasExtractedCustomers} (${((hasExtractedCustomers/withExtracted.length)*100).toFixed(1)}%)`);
    }
  }

  console.log(`\n💡 DIAGNOSIS:`);
  console.log('─'.repeat(60));
  
  if (hasArr < total * 0.1 && hasMrr < total * 0.1) {
    console.log('   ⚠️  CRITICAL: Most startups missing revenue data (ARR/MRR)');
    console.log('      → Traction scores will be very low');
    console.log('      → Solution: Run data enrichment or check if revenue data is in extracted_data');
  }
  
  if (hasGrowth < total * 0.1) {
    console.log('   ⚠️  Most startups missing growth rate data');
  }
  
  if (hasCustomers < total * 0.1) {
    console.log('   ⚠️  Most startups missing customer count data');
  }
  
  if (hasTeamSize < total * 0.5) {
    console.log('   ⚠️  Many startups missing team size data');
  }
  
  if (hasStage < total * 0.5) {
    console.log('   ⚠️  Many startups missing stage data → Scoring may use wrong weights');
  }

  if (hasExtractedData > total * 0.5 && hasArr < total * 0.1) {
    console.log(`\n   💡 RECOMMENDATION: Data may be in extracted_data but not mapped to root fields`);
    console.log('      → Check if enrichment script maps extracted_data to root fields');
    console.log('      → Or modify scoring script to read from extracted_data as fallback');
  }

  console.log();
}

checkDataQuality().catch(console.error);

