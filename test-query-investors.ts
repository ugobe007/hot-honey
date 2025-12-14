import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function queryInvestor() {
  console.log('\n🔍 QUERYING INVESTORS TABLE FOR GOOGLE VENTURES\n');
  
  const { data, error } = await supabase
    .from('investors')
    .select('id, name, firm, notable_investments, investment_thesis, sector_focus')
    .or('name.ilike.%Google Ventures%,firm.ilike.%Google Ventures%')
    .limit(1);
  
  if (error) {
    console.error('❌ ERROR:', error);
  } else {
    console.log('✅ RESULT:', JSON.stringify(data, null, 2));
    console.log('\n📊 ROW COUNT:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('\n📋 INVESTOR DETAILS:');
      console.log('  ID:', data[0].id);
      console.log('  Name:', data[0].name);
      console.log('  Firm:', data[0].firm);
      console.log('  Notable Investments:', data[0].notable_investments);
      console.log('  Investment Thesis:', data[0].investment_thesis);
      console.log('  Sector Focus:', data[0].sector_focus);
    }
  }
  
  // Also query for ANY investors
  console.log('\n\n🔍 QUERYING FOR ANY INVESTORS (FIRST 3)\n');
  const { data: allData, error: allError } = await supabase
    .from('investors')
    .select('id, name, firm, notable_investments')
    .limit(3);
    
  if (allError) {
    console.error('❌ ERROR:', allError);
  } else {
    console.log('✅ FOUND', allData?.length || 0, 'INVESTORS');
    console.log(JSON.stringify(allData, null, 2));
  }
}

queryInvestor().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
