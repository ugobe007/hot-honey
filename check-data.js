const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA'
);

async function checkData() {
  const { count: startupCount, error: startupError } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true });
  
  const { count: investorCount, error: investorError } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  console.log('Startups:', startupCount || 0, startupError ? 'ERROR: ' + startupError.message : '✅');
  console.log('Investors:', investorCount || 0, investorError ? 'ERROR: ' + investorError.message : '✅');
  
  const { data: sampleStartup } = await supabase.from('startups').select('*').limit(1);
  const { data: sampleInvestor } = await supabase.from('investors').select('*').limit(1);
  
  console.log('\nSample startup:', sampleStartup?.[0]?.name || 'NONE FOUND');
  console.log('Sample investor:', sampleInvestor?.[0]?.name || 'NONE FOUND');
}

checkData().catch(console.error);
