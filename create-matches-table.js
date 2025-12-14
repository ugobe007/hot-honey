#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyMatchesTable() {
  console.log('🚀 Creating startup_investor_matches table...\n');
  
  const sql = fs.readFileSync('./supabase-matches-table.sql', 'utf8');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Table created successfully!\n');
  
  // Verify
  const { count, error: countError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.log('⚠️  Table created but verification failed:', countError.message);
  } else {
    console.log(`📊 Current matches: ${count}`);
  }
}

applyMatchesTable();
