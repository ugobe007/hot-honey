/**
 * LINGUISTIC ORACLE - LOCAL INFERENCE VERSION
 * Uses pattern matching instead of Anthropic API
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function analyzeFounderLanguage(text, startupName) {
  console.log(`🔮 Analyzing: ${startupName}`);
  
  const textLower = text.toLowerCase();
  
  // 1. VISION CLARITY
  const visionHigh = ['discovered', 'realized', 'noticed', 'insight'].filter(w => textLower.includes(w)).length;
  const visionLow = ['trial and error', 'tested', 'pivoted'].filter(w => textLower.includes(w)).length;
  const vision_clarity = Math.min(100, 50 + (visionHigh * 15) - (visionLow * 10));
  
  // 2. PRONOUN BALANCE (I vs We)
  const iCount = (text.match(/\bI\b/g) || []).length;
  const weCount = (text.match(/\b[Ww]e\b/g) || []).length;
  const total = iCount + weCount;
  const ratio = total > 0 ? iCount / total : 0.5;
  const pronoun_balance = Math.max(0, 100 - Math.abs(ratio - 0.4) * 250);
  
  // 3. CUSTOMER INTIMACY
  const custHigh = ['customer told us', 'user feedback', 'interviewed'].filter(w => textLower.includes(w)).length;
  const customer_intimacy = Math.min(100, 50 + (custHigh * 20));
  
  // 4. MARKET POSITIONING
  const posHigh = ['unlike', 'competitor', 'different', 'unique'].filter(w => textLower.includes(w)).length;
  const market_positioning = Math.min(100, 50 + (posHigh * 15));
  
  // 5. PROOF POINTS
  const hasNumbers = (text.match(/\d+%|\d+x|\$\d+/g) || []).length;
  const proof_points = Math.min(100, 40 + (hasNumbers * 10));
  
  // 6. CONVICTION LANGUAGE
  const conviction = ['will', 'certain', 'confident'].filter(w => textLower.includes(w)).length;
  const hedges = ['might', 'maybe', 'hopefully'].filter(w => textLower.includes(w)).length;
  const conviction_language = Math.min(100, 50 + (conviction * 10) - (hedges * 15));
  
  // 7. BUZZWORD DENSITY (inverse)
  const buzzwords = ['synergy', 'paradigm', 'disruptive', 'revolutionary'].filter(w => textLower.includes(w)).length;
  const buzzword_density = Math.max(0, 100 - (buzzwords * 15));
  
  // 8. SPECIFICITY
  const specificWords = (text.match(/\d+/g) || []).length;
  const specificity_score = Math.min(100, 30 + (specificWords * 5));
  
  const overall_score = Math.round(
    (vision_clarity + pronoun_balance + customer_intimacy + market_positioning + 
     proof_points + conviction_language + buzzword_density + specificity_score) / 8
  );
  
  const green_flags = [];
  const red_flags = [];
  
  if (vision_clarity > 70) green_flags.push('Strong vision');
  if (customer_intimacy > 70) green_flags.push('Customer focus');
  if (conviction_language < 40) red_flags.push('Uncertain language');
  
  console.log(`✅ Score: ${overall_score}/100`);
  if (green_flags.length) console.log(`   🟢 ${green_flags.join(', ')}`);
  if (red_flags.length) console.log(`   🔴 ${red_flags.join(', ')}`);
  
  return {
    vision_clarity: Math.round(vision_clarity),
    pronoun_balance: Math.round(pronoun_balance),
    customer_intimacy: Math.round(customer_intimacy),
    market_positioning: Math.round(market_positioning),
    proof_points: Math.round(proof_points),
    conviction_language: Math.round(conviction_language),
    buzzword_density: Math.round(buzzword_density),
    specificity_score: Math.round(specificity_score),
    overall_score,
    green_flags,
    red_flags,
    analysis_summary: `${overall_score}/100`
  };
}

async function scoreAllStartups() {
  console.log('\n🔮 LINGUISTIC ORACLE - LOCAL\n');
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, description, pitch, tagline')
    .eq('status', 'approved')
    .not('description', 'is', null)
    .limit(100);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📊 Analyzing ${startups.length} startups\n`);
  
  let scored = 0;
  
  for (const startup of startups) {
    const text = [startup.description, startup.pitch, startup.tagline].filter(Boolean).join(' ');
    
    if (text.length < 50) continue;
    
    const analysis = analyzeFounderLanguage(text, startup.name);
    
    await supabase
      .from('startup_uploads')
      .update({
        founder_voice_score: analysis.overall_score,
        language_analysis: analysis
      })
      .eq('id', startup.id);
    
    scored++;
  }
  
  console.log(`\n✅ Scored: ${scored}`);
}

async function generateReport() {
  const { data } = await supabase
    .from('startup_uploads')
    .select('name, founder_voice_score, total_god_score')
    .not('founder_voice_score', 'is', null)
    .order('founder_voice_score', { ascending: false })
    .limit(20);
  
  if (!data || !data.length) {
    console.log('No data yet');
    return;
  }
  
  console.log('\n🏆 TOP 20:\n');
  data.forEach((s, i) => {
    console.log(`${i+1}. ${s.name}: ${s.founder_voice_score}/100`);
  });
}

const cmd = process.argv[2];
if (cmd === 'score') scoreAllStartups();
else if (cmd === 'report') generateReport();
