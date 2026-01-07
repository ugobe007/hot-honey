require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function scoreStartup(s) {
  let vpScore = 0, probScore = 0, solScore = 0, teamScore = 0, invScore = 0;
  
  const desc = (s.description || '').toLowerCase();
  const tagline = (s.tagline || '').toLowerCase();
  const pitch = (s.pitch || '').toLowerCase();
  const allText = desc + ' ' + tagline + ' ' + pitch;
  const sectors = (s.sectors || []).map(x => (x || '').toLowerCase());
  const isAI = sectors.some(x => x.includes('ai') || x.includes('ml') || x.includes('machine learning'));
  
  // === VALUE PROP (0-20): How clear is the pitch? ===
  if (s.description && s.description.length > 100) vpScore += 4;
  else if (s.description && s.description.length > 50) vpScore += 2;
  
  if (s.tagline && s.tagline.length > 20) vpScore += 3;
  else if (s.tagline && s.tagline.length > 5) vpScore += 1;
  
  if (s.pitch && s.pitch.length > 200) vpScore += 5;
  else if (s.pitch && s.pitch.length > 50) vpScore += 2;
  
  // Clarity signals
  if (allText.includes('platform')) vpScore += 2;
  if (allText.includes('solution')) vpScore += 1;
  if (allText.includes('helps') || allText.includes('enables')) vpScore += 2;
  
  if (isAI) vpScore += 3; // AI bonus
  
  vpScore = Math.min(vpScore, 20);
  
  // === PROBLEM/MARKET (0-20): Big market signals ===
  if (allText.includes('billion')) probScore += 5;
  if (allText.includes('million')) probScore += 2;
  if (allText.includes('enterprise')) probScore += 4;
  if (allText.includes('b2b')) probScore += 3;
  if (allText.includes('saas')) probScore += 3;
  if (allText.includes('automate') || allText.includes('automation')) probScore += 3;
  if (allText.includes('ai-powered') || allText.includes('ai powered')) probScore += 3;
  
  // Sector-based market size
  if (sectors.some(x => x.includes('fintech') || x.includes('finance'))) probScore += 3;
  if (sectors.some(x => x.includes('health'))) probScore += 3;
  if (sectors.some(x => x.includes('enterprise'))) probScore += 3;
  
  probScore = Math.min(probScore, 20);
  
  // === SOLUTION/PRODUCT (0-20): What's built? ===
  if (s.is_launched) solScore += 5;
  if (s.has_demo) solScore += 4;
  if (s.website) solScore += 3;
  
  // Product maturity signals from text
  if (allText.includes('customers')) solScore += 3;
  if (allText.includes('users')) solScore += 2;
  if (allText.includes('launched')) solScore += 2;
  if (allText.includes('beta')) solScore += 1;
  if (allText.includes('production')) solScore += 2;
  
  if (isAI) solScore += 2; // AI solutions get bonus
  
  solScore = Math.min(solScore, 20);
  
  // === TEAM (0-20): Who's building? ===
  if (s.team_size >= 10) teamScore += 6;
  else if (s.team_size >= 5) teamScore += 4;
  else if (s.team_size >= 2) teamScore += 2;
  else if (s.team_size >= 1) teamScore += 1; // At least someone!
  
  if (s.has_technical_cofounder) teamScore += 5;
  
  // Team signals from text
  const teamText = allText + ' ' + (s.team || '').toLowerCase();
  if (/google|meta|facebook|amazon|microsoft|apple|netflix/i.test(teamText)) teamScore += 4;
  if (/stanford|mit|harvard|berkeley|cmu|caltech/i.test(teamText)) teamScore += 3;
  if (/yc|y combinator|techstars|500 startups/i.test(teamText)) teamScore += 4;
  if (/sequoia|a16z|andreessen|benchmark|accel/i.test(teamText)) teamScore += 3;
  if (/serial entrepreneur|founded|co-founded|exited/i.test(teamText)) teamScore += 4;
  if (/phd|doctorate|professor/i.test(teamText)) teamScore += 2;
  
  teamScore = Math.min(teamScore, 20);
  
  // === TRACTION/INVESTMENT (0-20): Growth signals ===
  if (s.mrr > 100000) invScore += 8;
  else if (s.mrr > 10000) invScore += 5;
  else if (s.mrr > 0) invScore += 3;
  
  if (s.arr > 1000000) invScore += 8;
  else if (s.arr > 100000) invScore += 5;
  else if (s.arr > 0) invScore += 3;
  
  if (s.customer_count > 100) invScore += 5;
  else if (s.customer_count > 10) invScore += 3;
  else if (s.customer_count > 0) invScore += 2;
  
  if (s.growth_rate_monthly > 20) invScore += 5;
  else if (s.growth_rate_monthly > 10) invScore += 3;
  
  // Funding signals
  if (s.raise_amount > 10000000) invScore += 5;
  else if (s.raise_amount > 1000000) invScore += 3;
  else if (s.raise_amount > 0) invScore += 2;
  
  // Traction signals from text
  if (allText.includes('revenue')) invScore += 2;
  if (allText.includes('profitable')) invScore += 3;
  if (allText.includes('growing')) invScore += 2;
  if (/\d+k|\d+m|\d+ customers|\d+ users/i.test(allText)) invScore += 2;
  
  invScore = Math.min(invScore, 20);
  
  const total = vpScore + probScore + solScore + teamScore + invScore;
  
  return {
    total_god_score: total,
    vision_score: vpScore,
    market_score: probScore,
    product_score: solScore,
    team_score: teamScore,
    traction_score: invScore
  };
}

async function main() {
  console.log('\n🔄 BATCH RESCORE ALL STARTUPS (v2)\n');
  
  let offset = 0, updated = 0;
  const batchSize = 500;
  
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
      
      await supabase
        .from('startup_uploads')
        .update({
          total_god_score: scores.total_god_score,
          vision_score: scores.vision_score,
          market_score: scores.market_score,
          product_score: scores.product_score,
          team_score: scores.team_score,
          traction_score: scores.traction_score,
          updated_at: new Date().toISOString()
        })
        .eq('id', s.id);
      
      updated++;
    }
    
    console.log(`  ${updated} updated...`);
    offset += batchSize;
    if (startups.length < batchSize) break;
  }
  
  console.log(`\n✅ Done: ${updated} startups rescored`);
}

main();
