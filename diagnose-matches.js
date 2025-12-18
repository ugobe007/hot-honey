#!/usr/bin/env node
/**
 * Diagnose match quality issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function diagnose() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 MATCH QUALITY DIAGNOSIS');
  console.log('═══════════════════════════════════════════════════');
  
  // Check startup data quality
  const { data: startups, count: startupCount } = await supabase
    .from('startups')
    .select('id, name, sectors, stage, funding_stage, location', { count: 'exact' });
  
  console.log('\n📊 Startup Data Quality (' + startupCount + ' total):');
  console.log('─────────────────────────────────────────────────');
  
  const missingSectors = startups.filter(s => !s.sectors || s.sectors.length === 0).length;
  const missingStage = startups.filter(s => !s.stage && !s.funding_stage).length;
  const missingLocation = startups.filter(s => !s.location).length;
  
  console.log('Missing sectors:', missingSectors, '(' + ((missingSectors/startupCount)*100).toFixed(1) + '%)');
  console.log('Missing stage:', missingStage, '(' + ((missingStage/startupCount)*100).toFixed(1) + '%)');
  console.log('Missing location:', missingLocation, '(' + ((missingLocation/startupCount)*100).toFixed(1) + '%)');
  
  // Check investor data quality
  const { data: investors, count: investorCount } = await supabase
    .from('investors')
    .select('id, name, sectors, stage, geography, check_size', { count: 'exact' });
  
  console.log('\n📊 Investor Data Quality (' + investorCount + ' total):');
  console.log('─────────────────────────────────────────────────');
  
  const invMissingSectors = investors.filter(i => !i.sectors || i.sectors.length === 0).length;
  const invMissingStage = investors.filter(i => !i.stage || i.stage.length === 0).length;
  const invMissingGeo = investors.filter(i => !i.geography).length;
  const invMissingCheck = investors.filter(i => !i.check_size).length;
  
  console.log('Missing sectors:', invMissingSectors, '(' + ((invMissingSectors/investorCount)*100).toFixed(1) + '%)');
  console.log('Missing stage:', invMissingStage, '(' + ((invMissingStage/investorCount)*100).toFixed(1) + '%)');
  console.log('Missing geography:', invMissingGeo, '(' + ((invMissingGeo/investorCount)*100).toFixed(1) + '%)');
  console.log('Missing check_size:', invMissingCheck, '(' + ((invMissingCheck/investorCount)*100).toFixed(1) + '%)');
  
  // Sample poor matches to understand why
  const { data: poorMatches } = await supabase
    .from('matches')
    .select('match_score, match_reasons, startup_id, investor_id')
    .lt('match_score', 40)
    .limit(5);
  
  console.log('\n🔬 Sample Poor Matches (score < 40):');
  console.log('─────────────────────────────────────────────────');
  
  for (const m of poorMatches || []) {
    const { data: startup } = await supabase
      .from('startups')
      .select('name, sectors, stage, funding_stage')
      .eq('id', m.startup_id)
      .single();
    
    const { data: investor } = await supabase
      .from('investors')
      .select('name, sectors, stage, geography')
      .eq('id', m.investor_id)
      .single();
    
    console.log('\nScore:', m.match_score);
    console.log('  Startup:', startup?.name || 'Unknown');
    console.log('    Sectors:', startup?.sectors?.slice(0, 3)?.join(', ') || 'NONE');
    console.log('    Stage:', startup?.stage || startup?.funding_stage || 'NONE');
    console.log('  Investor:', investor?.name || 'Unknown');
    console.log('    Sectors:', investor?.sectors?.slice(0, 3)?.join(', ') || 'NONE');
    console.log('    Stage:', investor?.stage?.slice(0, 3)?.join(', ') || 'NONE');
    console.log('  Match Reasons:', m.match_reasons?.join(', ') || 'NO REASONS STORED');
  }
  
  // Check current algorithm file
  console.log('\n═══════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════');
  
  if (missingSectors > startupCount * 0.3) {
    console.log('⚠️  HIGH missing sectors in startups - enrich startup data');
  }
  if (invMissingSectors > investorCount * 0.3) {
    console.log('⚠️  HIGH missing sectors in investors - enrich investor data');
  }
  console.log('\n📝 Suggested Algorithm Improvements:');
  console.log('  1. Increase base score for any match (currently too low)');
  console.log('  2. Add partial sector matching (not just exact)');
  console.log('  3. Give bonus for geographic proximity');
  console.log('  4. Filter out matches below threshold (e.g., 50)');
  console.log('  5. Recalculate with improved weights');
}

diagnose().catch(console.error);
