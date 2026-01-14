require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeCorrelations() {
  console.log('\n📊 LINGUISTIC ORACLE - CORRELATION ANALYSIS\n');
  
  const { data } = await supabase
    .from('startup_uploads')
    .select('name, founder_voice_score, total_god_score, latest_funding_amount, stage, language_analysis')
    .not('founder_voice_score', 'is', null)
    .order('founder_voice_score', { ascending: false });
  
  if (!data || !data.length) {
    console.log('No data');
    return;
  }
  
  // Calculate averages by score range
  const highVoice = data.filter(s => s.founder_voice_score >= 65);
  const midVoice = data.filter(s => s.founder_voice_score >= 55 && s.founder_voice_score < 65);
  const lowVoice = data.filter(s => s.founder_voice_score < 55);
  
  const avgGod = (arr) => arr.reduce((s, d) => s + (d.total_god_score || 0), 0) / arr.length;
  
  console.log('CORRELATION: Founder Voice Score vs GOD Score\n');
  console.log(`High Voice (65+): ${highVoice.length} startups, Avg GOD: ${avgGod(highVoice).toFixed(1)}`);
  console.log(`Mid Voice (55-64): ${midVoice.length} startups, Avg GOD: ${avgGod(midVoice).toFixed(1)}`);
  console.log(`Low Voice (<55): ${lowVoice.length} startups, Avg GOD: ${avgGod(lowVoice).toFixed(1)}`);
  
  console.log('\n\nTOP 10 - DETAILED BREAKDOWN:\n');
  
  data.slice(0, 10).forEach((s, i) => {
    const la = s.language_analysis || {};
    console.log(`${i+1}. ${s.name}`);
    console.log(`   Voice: ${s.founder_voice_score}/100 | GOD: ${s.total_god_score || 'N/A'}/100`);
    console.log(`   Stage: ${s.stage || 'Unknown'}`);
    console.log(`   Breakdown:`);
    console.log(`     Vision: ${la.vision_clarity || 0}, Pronouns: ${la.pronoun_balance || 0}`);
    console.log(`     Customer: ${la.customer_intimacy || 0}, Market: ${la.market_positioning || 0}`);
    console.log(`     Proof: ${la.proof_points || 0}, Conviction: ${la.conviction_language || 0}`);
    if (la.green_flags?.length) console.log(`   🟢 ${la.green_flags.join(', ')}`);
    if (la.red_flags?.length) console.log(`   🔴 ${la.red_flags.join(', ')}`);
    console.log('');
  });
  
  // Component analysis
  console.log('\nCOMPONENT AVERAGES (Top 20 vs All):\n');
  const top20 = data.slice(0, 20);
  const components = ['vision_clarity', 'pronoun_balance', 'customer_intimacy', 'market_positioning', 'proof_points', 'conviction_language', 'buzzword_density', 'specificity_score'];
  
  components.forEach(comp => {
    const top20Avg = top20.reduce((s, d) => s + (d.language_analysis?.[comp] || 0), 0) / top20.length;
    const allAvg = data.reduce((s, d) => s + (d.language_analysis?.[comp] || 0), 0) / data.length;
    const diff = top20Avg - allAvg;
    const arrow = diff > 0 ? '↑' : '↓';
    console.log(`${comp}: Top20=${top20Avg.toFixed(1)} | All=${allAvg.toFixed(1)} ${arrow}${Math.abs(diff).toFixed(1)}`);
  });
}

analyzeCorrelations();
