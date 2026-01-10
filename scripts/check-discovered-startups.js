#!/usr/bin/env node
/**
 * Quick script to check discovered startups status
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
  console.log('📊 Checking discovered startups status...\n');
  
  // Total unimported
  const { count: unimported } = await supabase
    .from('discovered_startups')
    .select('id', { count: 'exact', head: true })
    .eq('imported_to_startups', false);
  
  // Total in last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: last24h } = await supabase
    .from('discovered_startups')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', yesterday);
  
  // Total imported today
  const { count: importedToday } = await supabase
    .from('discovered_startups')
    .select('id', { count: 'exact', head: true })
    .eq('imported_to_startups', true)
    .gte('imported_at', yesterday);
  
  console.log('📦 Unimported discovered startups:', unimported || 0);
  console.log('📊 Discovered in last 24h:', last24h || 0);
  console.log('✅ Imported in last 24h:', importedToday || 0);
  
  if (last24h > 0) {
    const rate = (last24h / 24).toFixed(1);
    console.log(`\n🚀 Rate: ${rate} startups/hour`);
    console.log(`   Projected daily: ${(rate * 24).toFixed(0)} startups/day`);
  }
}

checkStatus().catch(console.error);

