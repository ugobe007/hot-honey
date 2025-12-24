#!/usr/bin/env node
/**
 * Check daily reports in database for match counts
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
  console.log('🔍 Checking daily reports in database...\n');

  // Get recent daily reports - check all columns
  const { data: reports, error } = await supabase
    .from('ai_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  if (!reports || reports.length === 0) {
    console.log('⚠️  No daily reports found in database');
    return;
  }

  console.log(`📊 Found ${reports.length} recent logs:\n`);

  // Filter for reports with match counts
  const reportsWithMatches = reports.filter(r => {
    const output = r.output as any;
    const matches = output?.totalMatches || output?.matches?.total || 0;
    return matches > 0;
  });

  console.log(`📊 Found ${reportsWithMatches.length} logs with match data:\n`);

  for (const report of reportsWithMatches) {
    const date = new Date((report as any).created_at || (report as any).timestamp || '').toLocaleString();
    const output = report.output as any;
    const matches = output?.totalMatches || output?.matches?.total || 0;
    
    console.log(`📅 ${date}`);
    console.log(`   Matches: ${matches.toLocaleString()}`);
    if (output?.totalStartups) console.log(`   Startups: ${output.totalStartups.toLocaleString()}`);
    if (output?.totalInvestors) console.log(`   Investors: ${output.totalInvestors.toLocaleString()}`);
    console.log('');
  }

  // Check for 388,744 specifically
  const targetCount = 388744;
  const found = reportsWithMatches.find(r => {
    const output = r.output as any;
    const matches = output?.totalMatches || output?.matches?.total || 0;
    return matches === targetCount || (matches > 380000 && matches < 400000);
  });

  if (found) {
    console.log(`\n✅ Found report with ~388K matches:`);
    console.log(`   Date: ${new Date(found.created_at || '').toLocaleString()}`);
    console.log(`   Matches: ${(found.output as any)?.totalMatches || (found.output as any)?.matches?.total || 0}`);
  } else {
    console.log(`\n⚠️  No report found with 388,744 matches`);
    console.log(`   Checking if matches were deleted or table was reset...`);
  }
}

main().catch(console.error);

