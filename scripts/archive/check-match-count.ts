#!/usr/bin/env node
/**
 * Check total match count in database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking match counts...\n');

  // Total matches
  const { count: total, error: totalError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error:', totalError);
    process.exit(1);
  }

  // Today's matches
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayCount, error: todayError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  // This week's matches
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: weekCount, error: weekError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString());

  // Check date distribution
  const { data: sampleMatches } = await supabase
    .from('startup_investor_matches')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(10);

  const { data: newestMatches } = await supabase
    .from('startup_investor_matches')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('📊 Match Counts:');
  console.log(`   Total: ${(total || 0).toLocaleString()}`);
  console.log(`   Today: ${(todayCount || 0).toLocaleString()}`);
  console.log(`   This Week: ${(weekCount || 0).toLocaleString()}`);
  console.log(`   Before Today: ${((total || 0) - (todayCount || 0)).toLocaleString()}`);

  if (sampleMatches && sampleMatches.length > 0) {
    const oldest = new Date(sampleMatches[0].created_at);
    const newest = newestMatches && newestMatches.length > 0 
      ? new Date(newestMatches[0].created_at)
      : new Date();
    
    console.log(`\n📅 Date Range:`);
    console.log(`   Oldest: ${oldest.toISOString()}`);
    console.log(`   Newest: ${newest.toISOString()}`);
    
    // Check if all matches have same date (within 1 day)
    const dateDiff = newest.getTime() - oldest.getTime();
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 1) {
      console.log(`\n⚠️  WARNING: All matches have the same date (within 1 day)`);
      console.log(`   This suggests created_at timestamps were reset or bulk updated`);
      console.log(`   All ${(total || 0).toLocaleString()} matches appear to be from today`);
    }
  }

  if (total && total < 300000) {
    console.log('\n⚠️  WARNING: Total matches is less than expected (380,000+)');
    console.log(`   Current: ${(total || 0).toLocaleString()}`);
    console.log(`   Expected: 380,000+`);
    console.log(`   Missing: ${(380000 - (total || 0)).toLocaleString()} matches`);
    console.log('\n   Possible causes:');
    console.log('   - Matches were deleted or archived');
    console.log('   - Table was reset/cleared');
    console.log('   - Matches are in a different table/view');
    console.log('   - Query is filtering results');
  }
}

main().catch(console.error);

