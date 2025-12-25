require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Public companies or too mature for VC matching
const PUBLIC_OR_MATURE = [
  'Palantir',        // NYSE: PLTR
  'Coinbase',        // NASDAQ: COIN
  'Stripe',          // Private but $95B valuation
  'Roblox',          // NYSE: RBLX
  'Square',          // NYSE: SQ (now Block)
  'Rocket Lab',      // NASDAQ: RKLB
  'Planet Labs',     // NYSE: PL
  'Spire Global',    // NYSE: SPIR
  'Desktop Metal',   // NYSE: DM
  'QuantumScape',    // NYSE: QS
  'Impossible Foods', // Mature, $4B+
  'Notion',          // Mature, $10B+
  'Anthropic',       // Mature, $60B+ valuation
  'SpaceX',          // Mature
  'OpenAI',          // Mature
  'Databricks',      // Mature
  'Figma',           // Acquired by Adobe
  'Ramp',            // Mature, $8B+
  'Brex',            // Mature, $12B
];

async function removeMature() {
  console.log('Removing public/mature companies from VC matching pool...\n');
  
  let removed = 0;
  
  for (const name of PUBLIC_OR_MATURE) {
    const { data } = await s.from('startup_uploads')
      .select('id, name')
      .ilike('name', name)
      .limit(1);
    
    if (data && data.length > 0) {
      await s.from('startup_uploads')
        .update({ status: 'rejected', admin_notes: 'Public or mature company - not suitable for VC matching' })
        .eq('id', data[0].id);
      
      console.log('Removed:', data[0].name);
      removed++;
    }
  }
  
  console.log('\nTotal removed:', removed);
  
  // Count remaining
  const { count } = await s.from('startup_uploads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  console.log('Remaining approved startups:', count);
}

removeMature();
