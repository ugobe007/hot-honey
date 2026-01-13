#!/usr/bin/env node
/**
 * Debug script to check tier assignment for recent snippets
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

async function debugTierAssignment() {
  console.log('\n🔍 DEBUGGING TIER ASSIGNMENT\n');
  
  // Get the most recent 50 company_blog snippets
  const { data: snippets, error } = await supabase
    .from('pythia_speech_snippets')
    .select('id, entity_id, text, source_type, tier, context_label, created_at')
    .eq('source_type', 'company_blog')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`📊 Found ${snippets.length} recent company_blog snippets\n`);
  
  // Group by tier
  const byTier = { 1: [], 2: [], 3: [] };
  snippets.forEach(s => {
    byTier[s.tier] = byTier[s.tier] || [];
    byTier[s.tier].push(s);
  });
  
  console.log('📊 Tier Distribution (last 50):');
  console.log(`   Tier 1: ${(byTier[1] || []).length}`);
  console.log(`   Tier 2: ${(byTier[2] || []).length}`);
  console.log(`   Tier 3: ${(byTier[3] || []).length}\n`);
  
  // Show first 5 of each tier
  console.log('🔍 Sample snippets by tier:\n');
  
  [1, 2, 3].forEach(tier => {
    const samples = (byTier[tier] || []).slice(0, 5);
    if (samples.length > 0) {
      console.log(`\n--- Tier ${tier} (${samples.length} samples) ---`);
      samples.forEach((s, i) => {
        const preview = s.text.substring(0, 150).replace(/\n/g, ' ');
        console.log(`\n${i + 1}. Tier: ${s.tier}, Context: ${s.context_label || 'null'}`);
        console.log(`   Created: ${s.created_at}`);
        console.log(`   Preview: ${preview}...`);
      });
    }
  });
  
  console.log('\n');
}

debugTierAssignment().catch(console.error);
