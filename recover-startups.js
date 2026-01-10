const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA'
);

async function recoverStartups() {
  console.log('🔍 Fetching discovered startups...');
  
  // Get all discovered startups
  const { data: discovered, error: fetchError } = await supabase
    .from('discovered_startups')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching:', fetchError);
    return;
  }
  
  console.log(`✅ Found ${discovered.length} discovered startups`);
  
  // Transform to startups format
  const startups = discovered.map(d => ({
    name: d.name,
    description: d.description || d.summary,
    website: d.website || d.url,
    industry: d.industry || d.sector,
    stage: d.stage || 'Unknown',
    location: d.location,
    founded_year: d.founded_year,
    employee_count: d.employee_count,
    funding_raised: d.funding_raised,
    sectors: d.sectors || (d.industry ? [d.industry] : []),
    metadata: d.metadata || {},
    created_at: d.created_at,
    updated_at: new Date().toISOString()
  }));
  
  console.log('📝 Inserting startups in batches...');
  
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < startups.length; i += batchSize) {
    const batch = startups.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('startups')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Batch ${i / batchSize + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += data.length;
      console.log(`✅ Batch ${i / batchSize + 1}: ${data.length} startups inserted`);
    }
  }
  
  console.log('\n📊 Recovery Summary:');
  console.log(`✅ Successfully inserted: ${inserted}`);
  console.log(`❌ Errors: ${errors}`);
  
  // Verify
  const { count } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n🎯 Total startups in database: ${count}`);
}

recoverStartups().catch(console.error);
