/**
 * OPTIMIZED LINGUISTIC ORACLE
 * Weights adjusted based on correlation analysis
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
  
  // Pronoun balance (IMPORTANT - weight 3x)
  const iCount = (text.match(/\bI\b/g) || []).length;
  const weCount = (text.match(/\b[Ww]e\b/g) || []).length;
  const total = iCount + weCount;
  const ratio = total > 0 ? iCount / total : 0.5;
  const pronoun_balance = Math.max(0, 100 - Math.abs(ratio - 0.4) * 250);
  
  // Proof points (CRITICAL - weight 4x)
  const numbers = (text.match(/\d+%|\d+x|\$\d+M?|\d+k users?/gi) || []).length;
  const metrics = (text.match(/\d+\+\s*(users|customers|companies|countries)/gi) || []).length;
  const proof_points = Math.min(100, 30 + (numbers * 8) + (metrics * 15));
  
  // Specificity (MOST IMPORTANT - weight 5x)
  const specificNumbers = (text.match(/\d+/g) || []).length;
  const namedEntities = (text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g) || []).length;
  const dates = (text.match(/\d{4}|january|february|march|april|may|june|july|august|september|october|november|december/gi) || []).length;
  const specificity_score = Math.min(100, 20 + (specificNumbers * 4) + (namedEntities * 6) + (dates * 10));
  
  // Customer intimacy (MODERATE - weight 2x)
  const custHigh = ['customer told us', 'users said', 'feedback showed', 'interviewed'].filter(w => textLower.includes(w)).length;
  const customer_intimacy = Math.min(100, 40 + (custHigh * 20));
  
  // De-weighted components (weight 0.5x each)
  const visionHigh = ['discovered', 'realized'].filter(w => textLower.includes(w)).length;
  const vision_clarity = Math.min(100, 50 + (visionHigh * 10));
  
  const posHigh = ['unlike', 'different'].filter(w => textLower.includes(w)).length;
  const market_positioning = Math.min(100, 50 + (posHigh * 10));
  
  const conviction = ['will', 'certain'].filter(w => textLower.includes(w)).length;
  const conviction_language = Math.min(100, 50 + (conviction * 10));
  
  const buzzwords = ['synergy', 'paradigm', 'disruptive'].filter(w => textLower.includes(w)).length;
  const buzzword_density = Math.max(0, 100 - (buzzwords * 20));
  
  // WEIGHTED OVERALL SCORE
  const overall_score = Math.round(
    (specificity_score * 5 + 
     proof_points * 4 + 
     pronoun_balance * 3 + 
     customer_intimacy * 2 + 
     vision_clarity * 0.5 + 
     market_positioning * 0.5 + 
     conviction_language * 0.5 + 
     buzzword_density * 0.5) / 15.5
  );
  
  const green_flags = [];
  if (specificity_score > 70) green_flags.push('Highly specific');
  if (proof_points > 70) green_flags.push('Strong proof points');
  if (pronoun_balance > 70) green_flags.push('Good team dynamic');
  
  console.log(`✅ Score: ${overall_score}/100`);
  if (green_flags.length) console.log(`   🟢 ${green_flags.join(', ')}`);
  
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
    analysis_summary: `Optimized: ${overall_score}/100`
  };
}

async function rescoreAll() {
  console.log('\n🔮 RE-SCORING WITH OPTIMIZED WEIGHTS\n');
  
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, description, pitch, tagline')
    .eq('status', 'approved')
    .not('description', 'is', null)
    .limit(100);
  
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
  
  console.log(`\n✅ Re-scored: ${scored}`);
}

rescoreAll();
