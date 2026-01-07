import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8'
);

console.log('🔍 FIX 8: Querying investor notable_investments data...\n');

const { data, error } = await supabase
  .from('investors')
  .select('name, firm, notable_investments')
  .limit(3);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Investor Data:');
  data.forEach((investor, i) => {
    console.log(`\n${i + 1}. ${investor.name} (${investor.firm})`);
    console.log(`   notable_investments:`, investor.notable_investments);
  });
}
