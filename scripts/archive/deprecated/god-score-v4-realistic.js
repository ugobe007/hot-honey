require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function scoreStartup(s) {
  const desc = (s.description || '').toLowerCase();
  const tagline = (s.tagline || '').toLowerCase();
  const pitch = (s.pitch || '').toLowerCase();
  const allText = desc + ' ' + tagline + ' ' + pitch;
  const sectors = (s.sectors || []).map(x => (x || '').toLowerCase());
  
  // ============================================
  // 1. CONTENT QUALITY (0-25)
  // Do they have real pitch content?
  // ============================================
  let contentScore = 0;
  
  // Description quality
  if (desc.length > 200) contentScore += 8;
  else if (desc.length > 100) contentScore += 6;
  else if (desc.length > 50) contentScore += 4;
  else if (desc.length > 20) contentScore += 2;
  
  // Has real tagline (not just "Company - Sector company")
  const isGenericTagline = /^[\w\s\.]+ - \w+ company$/i.test(s.tagline || '');
  if (s.tagline && !isGenericTagline && s.tagline.length > 20) contentScore += 4;
  else if (s.tagline && s.tagline.length > 10) contentScore += 2;
  
  // Has pitch content
  if (pitch.length > 100) contentScore += 5;
  else if (pitch.length > 30) contentScore += 3;
  
  // Has website (legitimacy)
  if (s.website && s.website.length > 5) contentScore += 4;
  
  // Has deck
  if (s.deck_filename) contentScore += 4;
  
  contentScore = Math.min(contentScore, 25);
  
  // ============================================
  // 2. MARKET POSITIONING (0-25)
  // Hot sectors + clear positioning
  // ============================================
  let marketScore = 0;
  
  // Hot sector bonuses
  const hotSectors = {
    'ai': 6, 'ml': 5, 'ai/ml': 6, 'machine learning': 5,
    'fintech': 5, 'finance': 4,
    'healthtech': 5, 'health': 4, 'biotech': 5,
    'climate': 5, 'cleantech': 5, 'energy': 4,
    'security': 5, 'cybersecurity': 5, 'cyber': 5,
    'enterprise': 4, 'saas': 3, 'b2b': 4,
    'devtools': 4, 'developer': 3,
    'robotics': 5, 'automation': 4
  };
  
  for (const sector of sectors) {
    for (const [hot, pts] of Object.entries(hotSectors)) {
      if (sector.includes(hot)) {
        marketScore += pts;
        break;
      }
    }
  }
  marketScore = Math.min(marketScore, 12); // Cap sector bonus
  
  // Market signals from text
  if (allText.includes('billion') || allText.includes('trillion')) marketScore += 4;
  if (allText.includes('enterprise')) marketScore += 3;
  if (allText.includes('platform')) marketScore += 2;
  if (allText.includes('automat')) marketScore += 2;
  if (allText.includes('ai-powered') || allText.includes('ai powered')) marketScore += 2;
  
  marketScore = Math.min(marketScore, 25);
  
  // ============================================
  // 3. TRACTION SIGNALS (0-25)
  // Real data + text signals
  // ============================================
  let tractionScore = 0;
  
  // Hard data (if available)
  if (s.mrr > 100000) tractionScore += 12;
  else if (s.mrr > 10000) tractionScore += 8;
  else if (s.mrr > 0) tractionScore += 4;
  
  if (s.arr > 0) tractionScore += 3;
  
  if (s.customer_count > 100) tractionScore += 6;
  else if (s.customer_count > 10) tractionScore += 4;
  else if (s.customer_count > 0) tractionScore += 2;
  
  if (s.raise_amount > 5000000) tractionScore += 6;
  else if (s.raise_amount > 1000000) tractionScore += 4;
  else if (s.raise_amount > 0) tractionScore += 2;
  
  // Product signals
  if (s.is_launched) tractionScore += 3;
  if (s.has_demo) tractionScore += 3;
  
  // Text signals
  if (allText.includes('customer') || allText.includes('client')) tractionScore += 2;
  if (allText.includes('revenue') || allText.includes('profitable')) tractionScore += 3;
  if (allText.includes('raised') || allText.includes('funded')) tractionScore += 2;
  if (/\d+k|\d+m|\d+ users|\d+ customers/i.test(allText)) tractionScore += 3;
  
  tractionScore = Math.min(tractionScore, 25);
  
  // ============================================
  // 4. TEAM & CREDIBILITY (0-25)
  // ============================================
  let teamScore = 0;
  
  // Team size
  if (s.team_size >= 20) teamScore += 8;
  else if (s.team_size >= 10) teamScore += 6;
  else if (s.team_size >= 5) teamScore += 4;
  else if (s.team_size >= 2) teamScore += 2;
  
  if (s.has_technical_cofounder) teamScore += 5;
  
  // Credibility signals from text
  if (/google|meta|facebook|amazon|microsoft|apple|netflix|stripe/i.test(allText)) teamScore += 4;
  if (/stanford|mit|harvard|berkeley|cmu/i.test(allText)) teamScore += 3;
  if (/yc|y combinator|techstars|500 startups/i.test(allText)) teamScore += 5;
  if (/sequoia|a16z|andreessen|benchmark|accel/i.test(allText)) teamScore += 4;
  if (/serial|founded|exited/i.test(allText)) teamScore += 4;
  if (/phd|professor|researcher/i.test(allText)) teamScore += 2;
  
  teamScore = Math.min(teamScore, 25);
  
  // ============================================
  // TOTAL (0-100)
  // ============================================
  const total = contentScore + marketScore + tractionScore + teamScore;
  
  return {
    total_god_score: total,
    vision_score: contentScore,
    market_score: marketScore,
    traction_score: tractionScore,
    team_score: teamScore,
    product_score: Math.round((contentScore + tractionScore) / 2)
  };
}

async function main() {
  console.log('\n🔥 GOD SCORE V4 - Realistic Scoring\n');
  console.log('Dimensions:');
  console.log('  Content Quality  (0-25): Real pitch content');
  console.log('  Market Position  (0-25): Hot sectors + positioning');
  console.log('  Traction Signals (0-25): Revenue, customers, funding');
  console.log('  Team Credibility (0-25): Size, pedigree, backers\n');
  
  let offset = 0, updated = 0;
  const batchSize = 500;
  const samples = { low: [], mid: [], high: [] };
  
  while (true) {
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .range(offset, offset + batchSize - 1);
    
    if (error) { console.error(error); break; }
    if (!startups || startups.length === 0) break;
    
    for (const s of startups) {
      const scores = scoreStartup(s);
      
      await supabase.from('startup_uploads').update({
        total_god_score: scores.total_god_score,
        vision_score: scores.vision_score,
        market_score: scores.market_score,
        traction_score: scores.traction_score,
        team_score: scores.team_score,
        product_score: scores.product_score,
        updated_at: new Date().toISOString()
      }).eq('id', s.id);
      
      // Collect samples
      if (scores.total_god_score <= 15 && samples.low.length < 3) {
        samples.low.push({ name: s.name, score: scores.total_god_score, ...scores });
      } else if (scores.total_god_score >= 30 && scores.total_god_score <= 50 && samples.mid.length < 3) {
        samples.mid.push({ name: s.name, score: scores.total_god_score, ...scores });
      } else if (scores.total_god_score > 50 && samples.high.length < 3) {
        samples.high.push({ name: s.name, score: scores.total_god_score, ...scores });
      }
      
      updated++;
    }
    
    console.log(`  ${updated} scored...`);
    offset += batchSize;
    if (startups.length < batchSize) break;
  }
  
  console.log(`\n✅ Done: ${updated} startups`);
  
  console.log('\n📊 SAMPLES:');
  console.log('\nLow (sparse data):');
  samples.low.forEach(s => console.log(`  ${s.name}: ${s.score} (C:${s.vision_score} M:${s.market_score} T:${s.traction_score} Tm:${s.team_score})`));
  console.log('\nMid (some content):');
  samples.mid.forEach(s => console.log(`  ${s.name}: ${s.score} (C:${s.vision_score} M:${s.market_score} T:${s.traction_score} Tm:${s.team_score})`));
  console.log('\nHigh (rich content):');
  samples.high.forEach(s => console.log(`  ${s.name}: ${s.score} (C:${s.vision_score} M:${s.market_score} T:${s.traction_score} Tm:${s.team_score})`));
}

main();
