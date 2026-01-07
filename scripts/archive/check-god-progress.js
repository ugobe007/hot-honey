#!/usr/bin/env node
/**
 * QUICK GOD SCORE PROGRESS CHECK
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { count: total } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  const { count: scored } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);
  
  console.log(`\n📊 STATUS:`);
  console.log(`   Total approved: ${total || 0}`);
  console.log(`   Scored: ${scored || 0}`);
  console.log(`   Remaining: ${(total || 0) - (scored || 0)}`);
  console.log(`   Progress: ${total ? ((scored / total) * 100).toFixed(1) : 0}%\n`);
}

check().catch(console.error);

