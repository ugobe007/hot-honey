const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA'
);

async function verifyData() {
  console.log('✅ CHECKING REAL DATA IN startup_uploads...\n');
  
  const { count } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total startups: ${count}`);
  
  // Get sample with GOD scores
  const { data: samples } = await supabase
    .from('startup_uploads')
    .select('name, status, total_god_score, created_at')
    .order('total_god_score', { ascending: false })
    .limit(5);
  
  console.log('\nTop 5 startups by GOD score:');
  samples?.forEach(s => {
    console.log(`  - ${s.name} (${s.status}): GOD Score ${s.total_god_score}`);
  });
  
  // Check status breakdown
  const { data: byStatus } = await supabase
    .from('startup_uploads')
    .select('status');
  
  const statusCounts = byStatus?.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nStatus breakdown:');
  Object.entries(statusCounts || {}).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
}

verifyData().catch(console.error);
