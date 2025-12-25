require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSchema() {
  // Get one investor with all fields
  const { data: inv } = await s.from('investors').select('*').limit(1).single();
  
  console.log('INVESTOR TABLE COLUMNS:\n');
  Object.keys(inv).forEach(key => {
    const val = inv[key];
    const type = Array.isArray(val) ? 'array' : typeof val;
    const sample = val ? String(val).substring(0, 50) : 'NULL';
    console.log('  ' + key.padEnd(25) + type.padEnd(10) + sample);
  });
  
  // Check what data we need to add
  console.log('\n\nMISSING CRITICAL FIELDS:');
  console.log('  - firm_description: About the VC firm');
  console.log('  - investment_thesis: What they look for');
  console.log('  - fund_size: AUM');
  console.log('  - notable_investments: Portfolio companies');
  console.log('  - notable_exits: Successful exits');
  console.log('  - website: Firm website');
  console.log('  - founded_year: When firm started');
}

checkSchema();
