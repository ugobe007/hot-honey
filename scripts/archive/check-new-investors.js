#!/usr/bin/env node
/**
 * CHECK NEW INVESTORS
 * ===================
 * Quick check of recently added investors and their enrichment status
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkInvestors() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 INVESTOR DATABASE STATUS');
  console.log('='.repeat(80));
  
  // Get all investors
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, url, blog_url, firm_description_normalized, investment_firm_description, sectors, stage, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  const total = investors?.length || 0;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentlyAdded = investors?.filter(i => 
    i.created_at && new Date(i.created_at) > oneDayAgo
  ).length || 0;
  
  const withUrl = investors?.filter(i => i.url).length || 0;
  const withBlog = investors?.filter(i => i.blog_url).length || 0;
  const withDescription = investors?.filter(i => 
    i.firm_description_normalized || i.investment_firm_description
  ).length || 0;
  const withSectors = investors?.filter(i => 
    i.sectors && Array.isArray(i.sectors) && i.sectors.length > 0
  ).length || 0;
  const withStage = investors?.filter(i => 
    i.stage && Array.isArray(i.stage) && i.stage.length > 0
  ).length || 0;
  
  console.log(`\n📈 TOTALS:`);
  console.log(`   Total Investors: ${total}`);
  console.log(`   Added in last 24h: ${recentlyAdded}`);
  
  console.log(`\n📊 DATA COMPLETENESS:`);
  console.log(`   Has URL: ${withUrl} (${Math.round(withUrl/total*100)}%)`);
  console.log(`   Has Blog URL: ${withBlog} (${Math.round(withBlog/total*100)}%)`);
  console.log(`   Has Description: ${withDescription} (${Math.round(withDescription/total*100)}%)`);
  console.log(`   Has Sectors: ${withSectors} (${Math.round(withSectors/total*100)}%)`);
  console.log(`   Has Stage: ${withStage} (${Math.round(withStage/total*100)}%)`);
  
  const needsEnrichment = total - withDescription;
  console.log(`\n⚠️  NEEDS ENRICHMENT: ${needsEnrichment} (${Math.round(needsEnrichment/total*100)}%)`);
  
  if (recentlyAdded > 0) {
    console.log(`\n🆕 RECENTLY ADDED (last 24h):`);
    const recent = investors?.filter(i => 
      i.created_at && new Date(i.created_at) > oneDayAgo
    ).slice(0, 10) || [];
    
    recent.forEach((inv, idx) => {
      const hasData = (inv.url ? '✓' : '✗') + (inv.firm_description_normalized ? '✓' : '✗');
      console.log(`   ${idx + 1}. ${inv.name} ${hasData}`);
    });
  }
  
  console.log('\n💡 To enrich investors:');
  console.log('   node scripts/enrichment/enrich-investor-websites.js --limit 100');
  console.log('');
}

checkInvestors().catch(console.error);

