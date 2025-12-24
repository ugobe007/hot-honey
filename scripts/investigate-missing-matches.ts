#!/usr/bin/env node
/**
 * Investigate missing matches - check if they were deleted or table was reset
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
  console.log('🔍 Investigating missing matches...\n');
  console.log('Expected: 388,744 matches');
  console.log('Current: 167,949 matches');
  console.log('Missing: ~220,795 matches\n');

  // Check current count
  const { count: currentCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Current match count: ${(currentCount || 0).toLocaleString()}\n`);

  // Check date distribution
  const { data: dateSample } = await supabase
    .from('startup_investor_matches')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(10);

  const { data: newestSample } = await supabase
    .from('startup_investor_matches')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (dateSample && dateSample.length > 0 && newestSample && newestSample.length > 0) {
    const oldest = new Date(dateSample[0].created_at);
    const newest = new Date(newestSample[0].created_at);
    const daysDiff = (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24);

    console.log(`📅 Date Range:`);
    console.log(`   Oldest: ${oldest.toISOString()}`);
    console.log(`   Newest: ${newest.toISOString()}`);
    console.log(`   Span: ${daysDiff.toFixed(1)} days\n`);

    if (daysDiff < 1) {
      console.log('⚠️  WARNING: All matches have the same date!');
      console.log('   This suggests matches were bulk regenerated or timestamps were reset.\n');
    }
  }

  // Check for soft-deleted matches (if there's a deleted_at column)
  // Check for archived matches in a different table
  // Check if there's a matches_history table

  console.log('💡 Possible explanations:');
  console.log('   1. Matches were deleted (hard delete)');
  console.log('   2. Table was reset/truncated');
  console.log('   3. Matches were moved to an archive table');
  console.log('   4. The 388,744 count was from a different time/calculation');
  console.log('   5. Matches were regenerated and old ones deleted\n');

  console.log('🔍 Recommendations:');
  console.log('   - Check database backups for the 388,744 count');
  console.log('   - Check if there\'s a matches_history or matches_archive table');
  console.log('   - Review match generation logs from this morning');
  console.log('   - Check if upsert operations are deleting old matches');
}

main().catch(console.error);

