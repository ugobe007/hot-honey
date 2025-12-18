#!/usr/bin/env node
/**
 * ANALYZE INCOMPLETE STARTUPS
 * Find startups that need re-scraping or enrichment
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function analyze() {
  console.log('🔍 Analyzing discovered_startups data quality...\n');
  
  // Get all discovered startups
  const { data: all, count } = await supabase
    .from('discovered_startups')
    .select('id, name, source_url, website, description, extracted_data, funding_amount, sectors', { count: 'exact' });
  
  console.log(`Total discovered startups: ${count || all?.length}\n`);
  
  let missingWebsite = 0;
  let missingDescription = 0;
  let missingExtracted = 0;
  let hasSourceUrl = 0;
  let missingSectors = 0;
  let missingFunding = 0;
  const needsEnrichment = [];
  
  all?.forEach(s => {
    const noWebsite = !s.website;
    const noDescription = !s.description;
    const noExtracted = !s.extracted_data || Object.keys(s.extracted_data || {}).length === 0;
    const noSectors = !s.sectors || s.sectors.length === 0;
    const noFunding = !s.funding_amount;
    
    if (noWebsite) missingWebsite++;
    if (noDescription) missingDescription++;
    if (noExtracted) missingExtracted++;
    if (noSectors) missingSectors++;
    if (noFunding) missingFunding++;
    if (s.source_url) hasSourceUrl++;
    
    // Needs enrichment if missing critical fields
    if (noWebsite || noDescription || noExtracted) {
      needsEnrichment.push({
        id: s.id,
        name: s.name,
        source_url: s.source_url,
        website: s.website
      });
    }
  });
  
  console.log('📊 Data Quality Summary:');
  console.log(`  Missing website:      ${missingWebsite} (${(missingWebsite / all.length * 100).toFixed(1)}%)`);
  console.log(`  Missing description:  ${missingDescription} (${(missingDescription / all.length * 100).toFixed(1)}%)`);
  console.log(`  Missing extracted:    ${missingExtracted} (${(missingExtracted / all.length * 100).toFixed(1)}%)`);
  console.log(`  Missing sectors:      ${missingSectors} (${(missingSectors / all.length * 100).toFixed(1)}%)`);
  console.log(`  Missing funding:      ${missingFunding} (${(missingFunding / all.length * 100).toFixed(1)}%)`);
  console.log(`  Has source URL:       ${hasSourceUrl} (${(hasSourceUrl / all.length * 100).toFixed(1)}%)`);
  
  console.log(`\n🔧 Startups needing enrichment: ${needsEnrichment.length}`);
  
  // Show sample
  console.log('\n📝 Sample startups needing enrichment:');
  needsEnrichment.slice(0, 10).forEach(s => {
    console.log(`  - ${s.name || 'NO NAME'} | Website: ${s.website || 'MISSING'} | Source: ${s.source_url?.substring(0, 40) || 'NONE'}`);
  });
  
  return needsEnrichment;
}

analyze().then(() => {
  console.log('\n✅ Analysis complete');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
