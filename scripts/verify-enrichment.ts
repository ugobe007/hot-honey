#!/usr/bin/env node
/**
 * Verify enriched startups in database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function main() {
  const { data, error } = await supabase
    .from('startup_uploads')
    .select('name, website, total_god_score, sectors, is_launched, has_demo')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📊 RECENTLY ENRICHED YC STARTUPS WITH REAL GOD SCORES:\n');
  console.log('Name'.padEnd(22) + 'GOD'.padEnd(6) + 'Live'.padEnd(6) + 'Demo'.padEnd(6) + 'Sectors');
  console.log('─'.repeat(70));
  
  for (const s of data || []) {
    const sectors = (s.sectors || []).slice(0, 2).join(', ');
    console.log(
      (s.name || 'Unknown').padEnd(22) +
      String(s.total_god_score || '?').padEnd(6) +
      (s.is_launched ? '✅' : '❌').padEnd(6) +
      (s.has_demo ? '✅' : '❌').padEnd(6) +
      sectors
    );
  }

  // Score distribution
  const scores = data?.map(s => s.total_god_score).filter(Boolean) || [];
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    console.log('\n📈 Score Distribution:');
    console.log(`   Min: ${min} | Max: ${max} | Avg: ${avg.toFixed(1)}`);
    console.log(`   Count at 55 (launched): ${scores.filter(s => s === 55).length}`);
    console.log(`   Count at 53-54 (not launched): ${scores.filter(s => s >= 53 && s < 55).length}`);
  }
  console.log('');
}

main();
