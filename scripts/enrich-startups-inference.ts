#!/usr/bin/env node
/**
 * STARTUP INFERENCE ENRICHMENT SCRIPT
 * ====================================
 * 
 * Uses AI to populate missing data in extracted_data for existing startups.
 * 
 * This is CRITICAL - without this data, the GOD scoring system is biased
 * because 94% of startups are missing traction/market/product data.
 * 
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... ANTHROPIC_API_KEY=... npx tsx scripts/enrich-startups-inference.ts [--limit 100] [--all]
 * 
 * Options:
 *   --limit N    Process N startups (default: 100)
 *   --all        Process all startups (ignores limit)
 *   --missing    Only process startups missing data (default: true)
 */

import 'dotenv/config';
import { batchEnrichStartups } from '../server/services/startupEnrichmentService';

const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 100;
const all = args.includes('--all');
const missingOnly = !args.includes('--no-missing');

async function main() {
  console.log('═'.repeat(70));
  console.log('    🤖 STARTUP INFERENCE ENRICHMENT');
  console.log('═'.repeat(70));
  console.log(`\n📊 Configuration:`);
  console.log(`   Limit: ${all ? 'ALL' : limit}`);
  console.log(`   Missing Only: ${missingOnly}`);
  console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is required');
    console.error('   Set it in .env or as environment variable');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    process.exit(1);
  }

  try {
    const result = await batchEnrichStartups(
      all ? 10000 : limit,
      missingOnly
    );

    console.log('\n✅ Enrichment complete!\n');
    
    if (result.enriched > 0) {
      console.log('🎯 Next Steps:');
      console.log('   1. Recalculate GOD scores: npx tsx scripts/recalculate-scores.ts');
      console.log('   2. Run component analysis: npx tsx scripts/analyze-god-components.ts');
      console.log('   3. Verify improvements in differentiation\n');
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

