import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8'
);

console.log('🔍 Querying investor data structure...\n');

const { data, error } = await supabase
  .from('investors')
  .select('name, firm, bio, notable_investments, investment_thesis, sector_focus')
  .not('notable_investments', 'is', null)
  .limit(3);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Investor Data (with notable_investments):');
  console.log('='.repeat(80));
  
  data.forEach((investor, i) => {
    console.log(`\n${i + 1}. ${investor.name}${investor.firm ? ` @ ${investor.firm}` : ''}`);
    console.log(`   Bio: ${investor.bio || 'N/A'}`);
    console.log(`   Notable Investments:`, investor.notable_investments);
    console.log(`   Investment Thesis: ${investor.investment_thesis || 'N/A'}`);
    console.log(`   Sector Focus:`, investor.sector_focus);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Data Structure Summary:`);
  console.log(`   - name: ${typeof data[0]?.name} (${data[0]?.name})`);
  console.log(`   - firm: ${typeof data[0]?.firm} (${data[0]?.firm})`);
  console.log(`   - bio: ${typeof data[0]?.bio}`);
  console.log(`   - notable_investments: ${typeof data[0]?.notable_investments} (${Array.isArray(data[0]?.notable_investments) ? 'Array' : 'Object'})`);
  console.log(`   - investment_thesis: ${typeof data[0]?.investment_thesis}`);
  console.log(`   - sector_focus: ${typeof data[0]?.sector_focus} (${Array.isArray(data[0]?.sector_focus) ? 'Array' : 'Value'})`);
}
