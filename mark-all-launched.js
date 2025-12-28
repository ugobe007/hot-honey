require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function markBatch() {
  let total = 0;
  
  for (let i = 0; i < 20; i++) {
    const { data } = await s.from('startup_uploads')
      .select('id')
      .eq('status', 'approved')
      .eq('is_launched', false)
      .limit(100);
    
    if (data === null || data.length === 0) break;
    
    for (const row of data) {
      await s.from('startup_uploads').update({ is_launched: true, has_customers: true }).eq('id', row.id);
      total++;
    }
    console.log('Batch', i + 1, '- Total updated:', total);
  }
  
  console.log('Done. Total:', total);
}

markBatch();
