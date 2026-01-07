#!/usr/bin/env node
/**
 * MONITOR: Match Health Check
 * 
 * Runs periodically to check match count health and alert on issues
 * Can be added to PM2 cron or run manually
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { checkMatchCount } from './safeguard-match-count';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function monitorMatchHealth() {
  console.log('\n🔍 Match Health Check');
  console.log('═'.repeat(60));
  console.log(`⏰ ${new Date().toISOString()}\n`);

  // Check current count
  const health = await checkMatchCount();
  console.log(health.message);

  // Get date distribution
  const { data: dateSample } = await supabase
    .from('startup_investor_matches')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);

  const { data: newestSample } = await supabase
    .from('startup_investor_matches')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (dateSample && dateSample.length > 0 && newestSample && newestSample.length > 0) {
    const oldest = new Date(dateSample[0].created_at);
    const newest = new Date(newestSample[0].created_at);
    const daysDiff = (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24);

    console.log(`\n📅 Date Range:`);
    console.log(`   Oldest: ${oldest.toISOString()}`);
    console.log(`   Newest: ${newest.toISOString()}`);
    console.log(`   Span: ${daysDiff.toFixed(1)} days`);

    if (daysDiff < 1) {
      console.log(`\n⚠️  WARNING: All matches have the same date (within 1 day)`);
      console.log(`   This suggests a bulk regeneration occurred.`);
      console.log(`   Verify match count is stable.\n`);
    }
  }

  // Get match count by status
  const { data: statusCounts } = await supabase
    .from('startup_investor_matches')
    .select('status');

  if (statusCounts) {
    const counts = statusCounts.reduce((acc: Record<string, number>, m) => {
      acc[m.status || 'unknown'] = (acc[m.status || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📊 Matches by Status:`);
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count.toLocaleString()}`);
    });
  }

  // Log to database (ignore errors if table doesn't exist)
  try {
    await supabase.from('ai_logs').insert({
      type: 'match_health_check',
      input: { timestamp: new Date().toISOString() },
      output: {
        match_count: health.current,
        safe: health.safe,
        message: health.message
      },
      status: health.safe ? 'success' : 'error'
    });
  } catch (error) {
    // Ignore if table doesn't exist or other errors
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  return health.safe;
}

// Run if called directly
if (require.main === module) {
  monitorMatchHealth()
    .then(safe => process.exit(safe ? 0 : 1))
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { monitorMatchHealth };

