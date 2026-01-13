#!/usr/bin/env node
/**
 * Quick check: What tier are the most recent snippets?
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentTiers() {
  // Get the 30 most recent company_blog snippets
  const { data: snippets, error } = await supabase
    .from('pythia_speech_snippets')
    .select('id, tier, source_type, context_label, created_at, text')
    .eq('source_type', 'company_blog')
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`\n📊 Last 30 company_blog snippets:\n`);
  
  const byTier = {};
  snippets.forEach(s => {
    byTier[s.tier] = (byTier[s.tier] || 0) + 1;
  });
  
  console.log('Tier distribution:');
  Object.keys(byTier).sort().forEach(tier => {
    console.log(`  Tier ${tier}: ${byTier[tier]} snippets`);
  });
  
  console.log('\nFirst 10 snippets:');
  snippets.slice(0, 10).forEach((s, i) => {
    const preview = s.text.substring(0, 80).replace(/\n/g, ' ');
    console.log(`\n${i + 1}. Tier: ${s.tier}, Created: ${s.created_at}`);
    console.log(`   ${preview}...`);
  });
  
  console.log('\n');
}

checkRecentTiers().catch(console.error);
