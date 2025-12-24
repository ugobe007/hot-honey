/**
 * Diagnose Scoring Data Availability
 * 
 * Analyzes what data is available for scoring to understand why components
 * are not differentiating. Shows which fields are missing that prevent
 * proper scoring of Traction, Market, and Product components.
 */

// Load environment variables FIRST
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseScoringData() {
  console.log('🔍 Diagnosing Scoring Data Availability\n');
  console.log('═'.repeat(70));

  // Get sample of startups
  // Note: market_size is not a direct column - it's in extracted_data
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, mrr, arr, growth_rate_monthly, customer_count, is_launched, has_demo, has_technical_cofounder, team_size, sectors, extracted_data')
    .not('total_god_score', 'is', null)
    .limit(100);

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }

  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups found.');
    return;
  }

  console.log(`\n✅ Analyzing ${startups.length} startups\n`);

  // Analyze data availability for each component
  const tractionFields = {
    'mrr': 0,
    'arr': 0,
    'growth_rate_monthly': 0,
    'customer_count': 0,
    'extracted_data.mrr': 0,
    'extracted_data.revenue': 0,
    'extracted_data.arr': 0,
    'extracted_data.growth_rate': 0,
    'extracted_data.growth_rate_monthly': 0,
    'extracted_data.customers': 0,
    'extracted_data.customer_count': 0
  };

  const marketFields = {
    'sectors': 0,
    'extracted_data.market_size': 0,
    'extracted_data.marketSize': 0,
    'extracted_data.industries': 0,
    'extracted_data.sectors': 0,
    'extracted_data.problem': 0,
    'extracted_data.solution': 0
  };

  const productFields = {
    'is_launched': 0,
    'has_demo': 0,
    'extracted_data.is_launched': 0,
    'extracted_data.has_demo': 0,
    'extracted_data.launched': 0
  };

  const teamFields = {
    'has_technical_cofounder': 0,
    'team_size': 0,
    'team_companies': 0,
    'extracted_data.team': 0
  };

  startups.forEach(startup => {
    const extracted = startup.extracted_data || {};
    
    // Traction data
    if (startup.mrr && startup.mrr > 0) tractionFields['mrr']++;
    if (startup.arr && startup.arr > 0) tractionFields['arr']++;
    if (startup.growth_rate_monthly && startup.growth_rate_monthly > 0) tractionFields['growth_rate_monthly']++;
    if (startup.customer_count && startup.customer_count > 0) tractionFields['customer_count']++;
    
    if (extracted.mrr && extracted.mrr > 0) tractionFields['extracted_data.mrr']++;
    if (extracted.revenue && extracted.revenue > 0) tractionFields['extracted_data.revenue']++;
    if (extracted.arr && extracted.arr > 0) tractionFields['extracted_data.arr']++;
    if (extracted.growth_rate && extracted.growth_rate > 0) tractionFields['extracted_data.growth_rate']++;
    if (extracted.growth_rate_monthly && extracted.growth_rate_monthly > 0) tractionFields['extracted_data.growth_rate_monthly']++;
    if (extracted.customers && extracted.customers > 0) tractionFields['extracted_data.customers']++;
    if (extracted.customer_count && extracted.customer_count > 0) tractionFields['extracted_data.customer_count']++;

    // Market data
    if (startup.sectors && startup.sectors.length > 0) marketFields['sectors']++;
    if (extracted.market_size) marketFields['extracted_data.market_size']++;
    if (extracted.marketSize) marketFields['extracted_data.marketSize']++;
    if (extracted.industries && extracted.industries.length > 0) marketFields['extracted_data.industries']++;
    if (extracted.sectors && extracted.sectors.length > 0) marketFields['extracted_data.sectors']++;
    if (extracted.problem && extracted.problem.length > 0) marketFields['extracted_data.problem']++;
    if (extracted.solution && extracted.solution.length > 0) marketFields['extracted_data.solution']++;

    // Product data
    if (startup.is_launched) productFields['is_launched']++;
    if (startup.has_demo) productFields['has_demo']++;
    if (extracted.is_launched) productFields['extracted_data.is_launched']++;
    if (extracted.has_demo) productFields['extracted_data.has_demo']++;
    if (extracted.launched) productFields['extracted_data.launched']++;

    // Team data
    if (startup.has_technical_cofounder) teamFields['has_technical_cofounder']++;
    if (startup.team_size && startup.team_size > 0) teamFields['team_size']++;
    if (extracted.team && Array.isArray(extracted.team) && extracted.team.length > 0) teamFields['extracted_data.team']++;
  });

  const total = startups.length;

  console.log('📊 TRACTION Data Availability:\n');
  Object.entries(tractionFields).forEach(([field, count]) => {
    const pct = (count / total) * 100;
    const bar = '█'.repeat(Math.floor(pct / 5));
    console.log(`   ${field.padEnd(30)}: ${count.toString().padStart(3)}/${total} (${pct.toFixed(1)}%) ${bar}`);
  });

  console.log('\n📊 MARKET Data Availability:\n');
  Object.entries(marketFields).forEach(([field, count]) => {
    const pct = (count / total) * 100;
    const bar = '█'.repeat(Math.floor(pct / 5));
    console.log(`   ${field.padEnd(30)}: ${count.toString().padStart(3)}/${total} (${pct.toFixed(1)}%) ${bar}`);
  });

  console.log('\n📊 PRODUCT Data Availability:\n');
  Object.entries(productFields).forEach(([field, count]) => {
    const pct = (count / total) * 100;
    const bar = '█'.repeat(Math.floor(pct / 5));
    console.log(`   ${field.padEnd(30)}: ${count.toString().padStart(3)}/${total} (${pct.toFixed(1)}%) ${bar}`);
  });

  console.log('\n📊 TEAM Data Availability:\n');
  Object.entries(teamFields).forEach(([field, count]) => {
    const pct = (count / total) * 100;
    const bar = '█'.repeat(Math.floor(pct / 5));
    console.log(`   ${field.padEnd(30)}: ${count.toString().padStart(3)}/${total} (${pct.toFixed(1)}%) ${bar}`);
  });

  // Analysis
  console.log('\n🔍 Analysis:\n');

  const tractionDataAvailable = Object.values(tractionFields).some(count => count > total * 0.1);
  const marketDataAvailable = Object.values(marketFields).some(count => count > total * 0.1);
  const productDataAvailable = Object.values(productFields).some(count => count > total * 0.1);

  if (!tractionDataAvailable) {
    console.log('❌ TRACTION: Very little data available (<10% of startups)');
    console.log('   → This explains why 97.2% score 0-20');
    console.log('   → Solution: Improve data extraction or use extracted_data');
  } else {
    console.log('✅ TRACTION: Some data available');
  }

  if (!marketDataAvailable) {
    console.log('❌ MARKET: Very little data available (<10% of startups)');
    console.log('   → This explains why 96.9% score 0-20');
    console.log('   → Solution: Improve data extraction or use extracted_data');
  } else {
    console.log('✅ MARKET: Some data available');
  }

  if (!productDataAvailable) {
    console.log('❌ PRODUCT: Very little data available (<10% of startups)');
    console.log('   → This explains why 96.9% score 0-20');
    console.log('   → Solution: Improve data extraction or use extracted_data');
  } else {
    console.log('✅ PRODUCT: Some data available');
  }

  // Check extracted_data usage
  const hasExtractedData = startups.filter(s => s.extracted_data && Object.keys(s.extracted_data).length > 0).length;
  console.log(`\n📦 extracted_data column: ${hasExtractedData}/${total} (${(hasExtractedData/total*100).toFixed(1)}%) have data`);
  
  if (hasExtractedData < total * 0.5) {
    console.log('   ⚠️  Less than 50% of startups have extracted_data');
    console.log('   → Consider running AI enrichment to populate this field');
  }

  console.log('\n💡 Recommendations:\n');
  console.log('1. Update toScoringProfile() in recalculate-scores.ts to use extracted_data');
  console.log('2. Run AI enrichment to populate missing fields');
  console.log('3. Consider adding fallback scoring logic for startups with minimal data');
  console.log('4. Review data extraction pipeline to capture more traction/market/product signals');
  console.log('');

  console.log('═'.repeat(70));
  console.log('\n✅ Diagnosis complete.\n');
}

// Main execution
async function main() {
  try {
    await diagnoseScoringData();
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { diagnoseScoringData };

