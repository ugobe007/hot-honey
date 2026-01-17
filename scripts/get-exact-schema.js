const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getSchema() {
  // Execute raw SQL to get exact column definitions
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema='public'
        AND c.table_name='startup_uploads'
      ORDER BY c.ordinal_position;
    `
  });

  if (error) {
    console.log('RPC not available, using sample-based inference...');
    
    // Fallback: get sample and infer types
    const { data: sample } = await supabase.from('startup_uploads').select('*').limit(1);
    if (sample && sample[0]) {
      const keys = Object.keys(sample[0]);
      console.log(`\nstartup_uploads columns (${keys.length} total):\n`);
      console.log('column_name | inferred_type | sample_value');
      console.log('------------|---------------|-------------');
      keys.forEach(k => {
        const val = sample[0][k];
        let type = 'unknown';
        if (val === null) type = 'null';
        else if (Array.isArray(val)) type = 'array';
        else if (typeof val === 'object') type = 'jsonb';
        else type = typeof val;
        
        let preview = val === null ? 'NULL' : 
          typeof val === 'string' ? (val.length > 30 ? val.substring(0, 30) + '...' : val) :
          Array.isArray(val) ? `[${val.length} items]` :
          typeof val === 'object' ? '{...}' :
          String(val);
        
        console.log(`${k.padEnd(40)} | ${type.padEnd(13)} | ${preview}`);
      });
    }
  } else {
    console.log('Schema from information_schema:');
    console.table(data);
  }
}

getSchema().then(() => process.exit(0));
