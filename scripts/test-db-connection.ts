import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8'
);

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Test 1: SELECT from investors
  console.log('Test 1: SELECT from investors table');
  const { data: selectData, error: selectError } = await supabase
    .from('investors')
    .select('*')
    .limit(1);
  
  console.log('Data:', selectData);
  console.log('Error:', selectError);
  
  if (selectError) {
    console.error('❌ SELECT failed:', selectError.message);
    return;
  }
  
  console.log('✅ SELECT successful\n');
  
  // Test 2: INSERT one investor
  console.log('Test 2: INSERT one test investor');
  const { data: insertData, error: insertError } = await supabase
    .from('investors')
    .insert({
      name: 'Test VC ' + Date.now(),
      type: 'vc_firm',
      tagline: 'Test investor',
      description: 'Testing database insert',
      website: 'https://test.com',
      stage: ['seed'],
      sectors: ['Software'],
      check_size: '$1M - $5M',
      check_size_min: 1000000,
      check_size_max: 5000000,
      geography: 'US',
      portfolio_count: 0,
      exits: 0,
      unicorns: 0,
      notable_investments: []
    })
    .select();
  
  console.log('Inserted:', insertData);
  console.log('Error:', insertError);
  
  if (insertError) {
    console.error('❌ INSERT failed:', insertError.message);
    console.error('Details:', insertError);
    return;
  }
  
  console.log('✅ INSERT successful\n');
  
  // Test 3: Check what columns exist
  console.log('Test 3: Checking investors table schema');
  const { data: schemaData, error: schemaError } = await supabase
    .from('investors')
    .select('*')
    .limit(1);
  
  if (schemaData && schemaData.length > 0) {
    console.log('Available columns:', Object.keys(schemaData[0]));
  }
  
  console.log('\n✅ All tests passed!');
}

testConnection().catch(console.error);
