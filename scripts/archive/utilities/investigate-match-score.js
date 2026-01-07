require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function investigate() {
  // Get LaunchDarkly's matches
  const { data: startup } = await s.from('startup_uploads')
    .select('id, name, total_god_score')
    .ilike('name', '%launchdarkly%')
    .single();

  console.log('LaunchDarkly GOD Score:', startup.total_god_score);

  const { data: matches } = await s.from('startup_investor_matches')
    .select('match_score, confidence_level, fit_analysis, investor_id')
    .eq('startup_id', startup.id);

  console.log('\nMatches in DB:');
  for (const m of (matches || [])) {
    console.log('  DB match_score:', m.match_score);
    console.log('  confidence:', m.confidence_level);
    console.log('  fit_analysis:', JSON.stringify(m.fit_analysis, null, 2));
    console.log('');
  }

  // Check if there's another score calculation
  console.log('\nChecking for combined score logic...');
  // The UI might be combining GOD score + match_score
  // LaunchDarkly GOD: 59, match_score: 35
  // 59 * 0.5 + 35 * 0.5 = 47 (close to 44%?)
  console.log('Possible combined: (GOD * 0.5) + (match * 0.5) =', (startup.total_god_score * 0.5) + (35 * 0.5));
}

investigate();
