/**
 * Check what funding data we have available
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Looking for:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ') || 'none');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFundingData() {
  console.log('🔍 Checking funding data availability...\n');
  
  // Check funding_data table
  const { data: fundingData, error: fundingError, count: fundingCount } = await supabase
    .from('funding_data')
    .select('*', { count: 'exact', head: true });
  
  if (fundingError) {
    console.log('⚠️  funding_data table:', fundingError.message);
  } else {
    console.log(`📊 funding_data table: ${fundingCount || 0} records`);
  }
  
  // Get sample from funding_data
  const { data: sampleFunding, error: sampleError } = await supabase
    .from('funding_data')
    .select('company_name, amount, round_type, date, investors')
    .limit(5);
  
  if (sampleFunding && sampleFunding.length > 0) {
    console.log('\n📋 Sample funding records:');
    sampleFunding.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.company_name} - ${f.round_type} (${f.amount}) on ${f.date}`);
    });
  }
  
  // Check funding_rounds table
  const { data: roundsData, error: roundsError, count: roundsCount } = await supabase
    .from('funding_rounds')
    .select('*', { count: 'exact', head: true });
  
  if (roundsError) {
    console.log('\n⚠️  funding_rounds table:', roundsError.message);
  } else {
    console.log(`\n📊 funding_rounds table: ${roundsCount || 0} records`);
  }
  
  // Check startups with funding in extracted_data
  const { data: startupsWithFunding, error: startupsError } = await supabase
    .from('startup_uploads')
    .select('id, name, extracted_data')
    .not('extracted_data', 'is', null)
    .limit(10);
  
  if (startupsWithFunding) {
    const withFundingInfo = startupsWithFunding.filter(s => {
      const data = s.extracted_data;
      return data && (
        data.funding_amount || 
        data.latest_funding || 
        data.funding_round || 
        data.funding_history
      );
    });
    
    console.log(`\n📊 Startups with funding in extracted_data: ${withFundingInfo.length} (checked 10)`);
    if (withFundingInfo.length > 0) {
      console.log('\n📋 Sample:');
      withFundingInfo.slice(0, 3).forEach((s, i) => {
        const data = s.extracted_data;
        console.log(`   ${i + 1}. ${s.name}`);
        console.log(`      Funding: ${data.funding_amount || data.latest_funding || 'N/A'}`);
      });
    }
  }
  
  console.log('\n✨ Check complete!');
}

checkFundingData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

