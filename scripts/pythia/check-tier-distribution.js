#!/usr/bin/env node
/**
 * Quick check: Tier distribution of recent company_blog snippets
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

async function checkTierDistribution() {
  console.log('\n📊 TIER DISTRIBUTION CHECK\n');
  console.log('='.repeat(60));
  
  // Check last 2 days
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data: snippets, error } = await supabase
    .from('pythia_speech_snippets')
    .select('tier, source_type, created_at')
    .eq('source_type', 'company_blog')
    .gte('created_at', twoDaysAgo.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`\n📈 Total company_blog snippets (last 2 days): ${snippets.length}\n`);
  
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  snippets.forEach(s => {
    tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1;
  });
  
  console.log('📊 Tier Distribution:');
  console.log(`   Tier 1 (earned): ${tierCounts[1] || 0} (${((tierCounts[1] / snippets.length) * 100).toFixed(1)}%)`);
  console.log(`   Tier 2 (semi-earned): ${tierCounts[2] || 0} (${((tierCounts[2] / snippets.length) * 100).toFixed(1)}%)`);
  console.log(`   Tier 3 (PR/marketed): ${tierCounts[3] || 0} (${((tierCounts[3] / snippets.length) * 100).toFixed(1)}%)\n`);
  
  // Show breakdown by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todaySnippets = snippets.filter(s => new Date(s.created_at) >= today);
  const yesterdaySnippets = snippets.filter(s => {
    const d = new Date(s.created_at);
    return d >= yesterday && d < today;
  });
  
  console.log('📅 By Date:');
  console.log(`   Today: ${todaySnippets.length} snippets`);
  console.log(`   Yesterday: ${yesterdaySnippets.length} snippets`);
  console.log(`   Earlier: ${snippets.length - todaySnippets.length - yesterdaySnippets.length} snippets\n`);
  
  // Show last 10 snippets with their tiers
  console.log('🔍 Last 10 snippets (newest first):');
  const recent = snippets.slice(0, 10);
  recent.forEach((s, i) => {
    const date = new Date(s.created_at).toISOString().split('T')[0];
    console.log(`   ${i + 1}. Tier ${s.tier} - ${date}`);
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
}

checkTierDistribution().catch(console.error);
