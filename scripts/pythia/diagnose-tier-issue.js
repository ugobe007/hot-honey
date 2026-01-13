#!/usr/bin/env node
/**
 * Diagnose why tier system shows 0% Tier 2
 * 
 * Run: node scripts/pythia/diagnose-tier-issue.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { classifyTier, hasPRMarkers, hasTier2Triggers } = require('./utils/tier-classifier');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('\n🔍 DIAGNOSING TIER SYSTEM\n');
  console.log('='.repeat(60));
  
  // 1. Check recent snippets
  console.log('\n1️⃣ Checking last 30 company_blog snippets:\n');
  const { data: recent, error: err1 } = await supabase
    .from('pythia_speech_snippets')
    .select('id, tier, created_at, text, source_type')
    .eq('source_type', 'company_blog')
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (err1) {
    console.error('❌ Error:', err1.message);
    return;
  }
  
  const tierCounts = {};
  recent.forEach(s => {
    tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1;
  });
  
  console.log(`Found ${recent.length} snippets`);
  console.log(`Tier distribution: Tier 1: ${tierCounts[1] || 0}, Tier 2: ${tierCounts[2] || 0}, Tier 3: ${tierCounts[3] || 0}`);
  
  // 2. Re-classify recent snippets to see what they SHOULD be
  console.log('\n2️⃣ Re-classifying last 10 snippets:\n');
  const samples = recent.slice(0, 10);
  
  samples.forEach((snippet, i) => {
    const actualTier = snippet.tier;
    const expectedTier = classifyTier('company_blog', 'company_blog', snippet.text);
    const prCount = hasPRMarkers(snippet.text);
    const hasHardness = hasTier2Triggers(snippet.text);
    
    const match = actualTier === expectedTier ? '✅' : '❌ MISMATCH';
    console.log(`\n${i + 1}. ${match} DB Tier: ${actualTier}, Expected: ${expectedTier}`);
    console.log(`   PR markers: ${prCount}, Has hardness: ${hasHardness}`);
    console.log(`   Preview: ${snippet.text.substring(0, 120).replace(/\n/g, ' ')}...`);
  });
  
  // 3. Check all snippets from last 2 days
  console.log('\n\n3️⃣ Checking all snippets from last 2 days:\n');
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data: allRecent, error: err2 } = await supabase
    .from('pythia_speech_snippets')
    .select('tier, source_type')
    .gte('created_at', twoDaysAgo.toISOString());
  
  if (err2) {
    console.error('❌ Error:', err2.message);
    return;
  }
  
  const allTierCounts = {};
  allRecent.forEach(s => {
    allTierCounts[s.tier] = (allTierCounts[s.tier] || 0) + 1;
  });
  
  console.log(`Total snippets (last 2 days): ${allRecent.length}`);
  console.log(`Tier distribution: Tier 1: ${allTierCounts[1] || 0}, Tier 2: ${allTierCounts[2] || 0}, Tier 3: ${allTierCounts[3] || 0}`);
  
  console.log('\n' + '='.repeat(60) + '\n');
}

diagnose().catch(console.error);
