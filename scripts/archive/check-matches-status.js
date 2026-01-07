#!/usr/bin/env node
/**
 * CHECK MATCHES STATUS
 * ====================
 * Quick diagnostic to see what matches exist and if they're being generated
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkMatches() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 MATCHES STATUS CHECK');
  console.log('='.repeat(80));
  
  // Check total matches
  const { count: totalCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  // Check suggested matches (what UI shows)
  const { count: suggestedCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'suggested')
    .gte('match_score', 35);
  
  // Check recent matches
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count: recentCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo.toISOString());
  
  // Get sample matches
  const { data: sampleMatches } = await supabase
    .from('startup_investor_matches')
    .select('id, match_score, status, created_at, startup_id, investor_id')
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .order('match_score', { ascending: false })
    .limit(10);
  
  // Check unique startups/investors
  const { data: allMatches } = await supabase
    .from('startup_investor_matches')
    .select('startup_id, investor_id')
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .limit(1000);
  
  const uniqueStartups = new Set((allMatches || []).map(m => m.startup_id).filter(Boolean));
  const uniqueInvestors = new Set((allMatches || []).map(m => m.investor_id).filter(Boolean));
  
  console.log(`\n📊 TOTALS:`);
  console.log(`   Total matches: ${totalCount || 0}`);
  console.log(`   Suggested (score >= 35): ${suggestedCount || 0}`);
  console.log(`   Created in last 24h: ${recentCount || 0}`);
  console.log(`   Unique startups: ${uniqueStartups.size}`);
  console.log(`   Unique investors: ${uniqueInvestors.size}`);
  
  if (sampleMatches && sampleMatches.length > 0) {
    console.log(`\n📋 SAMPLE MATCHES (top 10):`);
    sampleMatches.forEach((m, idx) => {
      const date = new Date(m.created_at);
      console.log(`   ${idx + 1}. Score: ${m.match_score} | Created: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    });
  } else {
    console.log(`\n⚠️  No matches found with status='suggested' and score >= 35`);
  }
  
  // Check if queue processor is needed
  const { count: approvedStartups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  const { count: activeInvestors } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  console.log(`\n📈 DATABASE:`);
  console.log(`   Approved startups: ${approvedStartups || 0}`);
  console.log(`   Active investors: ${activeInvestors || 0}`);
  
  const expectedMatches = (approvedStartups || 0) * Math.min(25, (activeInvestors || 0));
  console.log(`   Expected matches (25 per startup): ~${expectedMatches}`);
  
  if ((suggestedCount || 0) < 10) {
    console.log(`\n⚠️  WARNING: Very few matches found!`);
    console.log(`   You may need to run the queue processor:`);
    console.log(`   node scripts/core/queue-processor-v16.js`);
    console.log(`   or`);
    console.log(`   node scripts/populate-matching-queue.js`);
  }
  
  console.log('');
}

checkMatches().catch(console.error);

