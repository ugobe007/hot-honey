require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function markLaunched() {
  // Get all T5 startups that have placeholder taglines (bulk imported)
  const { data, error } = await supabase
    .from('startup_uploads')
    .select('id, name, tagline')
    .eq('status', 'approved')
    .lt('total_god_score', 35)
    .limit(1000);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Found', data?.length || 0, 'T5 startups');
  
  let updated = 0;
  for (const s of (data || [])) {
    // These are real companies - mark them as launched
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({ is_launched: true, has_customers: true })
      .eq('id', s.id);
    
    if (updateError === null) updated++;
    if (updated % 100 === 0) console.log('Updated', updated, '...');
  }
  
  console.log('Total updated:', updated);
}

markLaunched();
