const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA'
);

async function checkTables() {
  console.log('🔍 Checking all tables...\n');
  
  const tables = [
    'startups',
    'startup_uploads', 
    'discovered_startups',
    'investors',
    'startup_investor_matches'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count} records`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
    }
  }
}

checkTables().catch(console.error);
