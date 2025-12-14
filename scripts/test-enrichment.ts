#!/usr/bin/env tsx

/**
 * Test VC enrichment on Y Combinator
 * Quick test to verify scraping works
 */

import { supabase } from '../src/lib/supabase';
import { InvestorEnrichmentService } from '../src/lib/investorEnrichmentService';

async function testEnrichment() {
  console.log('🧪 Testing VC enrichment with Y Combinator...\n');
  
  try {
    // Find Y Combinator in database
    const { data: investor, error } = await supabase
      .from('investors')
      .select('id, name')
      .ilike('name', '%Y Combinator%')
      .single();
    
    if (error || !investor) {
      console.log('❌ Y Combinator not found in database');
      console.log('Please add Y Combinator to investors table first');
      process.exit(1);
    }
    
    console.log(`✅ Found: ${investor.name} (ID: ${investor.id})\n`);
    
    // Run enrichment
    console.log('🔍 Starting enrichment...\n');
    const result = await InvestorEnrichmentService.enrichInvestor(
      investor.id,
      investor.name
    );
    
    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 ENRICHMENT RESULTS');
    console.log('='.repeat(60) + '\n');
    
    if (result.success) {
      console.log('✅ Status: SUCCESS\n');
      console.log(`📰 News Articles: ${result.news || 0}`);
      console.log(`👥 Partners: ${result.partners || 0}`);
      console.log(`💼 Investments: ${result.investments || 0}`);
      console.log(`📝 Advice Articles: ${result.advice || 0}`);
      
      // Query to verify data was saved
      console.log('\n🔍 Verifying data in database...\n');
      
      const { data: partners } = await supabase
        .from('investor_partners')
        .select('name, title')
        .eq('investor_id', investor.id)
        .limit(5);
      
      if (partners && partners.length > 0) {
        console.log(`✅ Partners saved (showing first 5):`);
        partners.forEach(p => console.log(`   - ${p.name} (${p.title})`));
      }
      
      const { data: news } = await supabase
        .from('investor_news')
        .select('title, source')
        .eq('investor_id', investor.id)
        .limit(3);
      
      if (news && news.length > 0) {
        console.log(`\n✅ News articles saved (showing first 3):`);
        news.forEach(n => console.log(`   - ${n.title} (${n.source})`));
      }
      
      const { data: investments } = await supabase
        .from('investor_investments')
        .select('company_name, industries')
        .eq('investor_id', investor.id)
        .limit(5);
      
      if (investments && investments.length > 0) {
        console.log(`\n✅ Investments saved (showing first 5):`);
        investments.forEach(inv => console.log(`   - ${inv.company_name}`));
      }
      
    } else {
      console.log('❌ Status: FAILED');
      console.log(`Error: ${result.error}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Test complete!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testEnrichment().catch(console.error);
