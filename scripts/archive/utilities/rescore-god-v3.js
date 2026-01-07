require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function scoreStartup(s) {
  const desc = (s.description || '').toLowerCase();
  const tagline = (s.tagline || '').toLowerCase();
  const pitch = (s.pitch || '').toLowerCase();
  const allText = desc + ' ' + tagline + ' ' + pitch + ' ' + (s.team || '').toLowerCase();
  const sectors = (s.sectors || []).map(x => (x || '').toLowerCase());
  
  // ============================================
  // 1. PMF / MARKET TIMING (0-25)
  // Are they on target? Ahead or behind the curve?
  // ============================================
  let pmfScore = 0;
  
  // Hot market signals (ahead of curve)
  const hotMarkets = ['ai', 'llm', 'genai', 'generative', 'automation', 'robotics', 'climate', 'cleantech', 'cyber', 'security'];
  const marketHits = hotMarkets.filter(m => allText.includes(m) || sectors.some(s => s.includes(m)));
  pmfScore += Math.min(marketHits.length * 3, 9); // Up to 9 pts for hot markets
  
  // Problem clarity signals
  if (allText.includes('problem') || allText.includes('pain point') || allText.includes('challenge')) pmfScore += 2;
  if (allText.includes('market') && (allText.includes('billion') || allText.includes('trillion'))) pmfScore += 4;
  if (allText.includes('enterprise') || allText.includes('b2b')) pmfScore += 3;
  if (allText.includes('consumer') || allText.includes('b2c')) pmfScore += 2;
  
  // Timing signals
  if (allText.includes('first') || allText.includes('pioneer') || allText.includes('leading')) pmfScore += 2;
  if (allText.includes('growing') || allText.includes('emerging')) pmfScore += 2;
  if (allText.includes('disrupting') || allText.includes('transforming')) pmfScore += 2;
  
  pmfScore = Math.min(pmfScore, 25);
  
  // ============================================
  // 2. FOUNDER INTENSITY (0-25)
  // Determination, learning, sharing, hustle
  // ============================================
  let founderScore = 0;
  
  // Hustle signals
  if (s.website) founderScore += 3; // Built something
  if (s.is_launched) founderScore += 4; // Shipped it
  if (s.has_demo) founderScore += 3; // Can show it
  if (s.deck_filename) founderScore += 2; // Serious about fundraising
  
  // Learning/sharing signals (blog, thought leadership)
  if (allText.includes('blog') || allText.includes('wrote') || allText.includes('published')) founderScore += 3;
  if (allText.includes('speaker') || allText.includes('conference') || allText.includes('podcast')) founderScore += 2;
  
  // Determination signals
  if (allText.includes('pivot') || allText.includes('iterate')) founderScore += 2; // Learns from failure
  if (allText.includes('bootstrap') || allText.includes('self-funded')) founderScore += 3; // Scrappy
  if (/serial entrepreneur|founded.*before|exited|sold.*company/i.test(allText)) founderScore += 5; // Done it before
  
  // Intensity from pedigree
  if (/yc|y combinator|techstars|500 startups|antler|founder institute/i.test(allText)) founderScore += 4;
  if (/stanford|mit|harvard|berkeley|cmu|caltech|oxford|cambridge/i.test(allText)) founderScore += 2;
  if (/google|meta|facebook|amazon|microsoft|apple|netflix|stripe|airbnb/i.test(allText)) founderScore += 3;
  
  founderScore = Math.min(founderScore, 25);
  
  // ============================================
  // 3. FUNDING VELOCITY (0-25)
  // Scrappy resourcefulness, momentum
  // ============================================
  let fundingScore = 0;
  
  // Actual funding data
  if (s.raise_amount > 10000000) fundingScore += 8;
  else if (s.raise_amount > 1000000) fundingScore += 5;
  else if (s.raise_amount > 100000) fundingScore += 3;
  else if (s.raise_amount > 0) fundingScore += 2;
  
  // Revenue signals (best funding is customer money!)
  if (s.mrr > 100000) fundingScore += 10;
  else if (s.mrr > 10000) fundingScore += 6;
  else if (s.mrr > 1000) fundingScore += 4;
  else if (s.mrr > 0) fundingScore += 2;
  
  if (s.arr > 0) fundingScore += 3;
  
  // Growth signals
  if (s.growth_rate_monthly > 20) fundingScore += 5;
  else if (s.growth_rate_monthly > 10) fundingScore += 3;
  
  // Text-based funding signals
  if (allText.includes('raised') || allText.includes('funding')) fundingScore += 2;
  if (allText.includes('revenue') || allText.includes('profitable')) fundingScore += 3;
  if (allText.includes('grant') || allText.includes('award')) fundingScore += 2; // Scrappy resources
  if (/sequoia|a16z|andreessen|benchmark|accel|greylock|khosla|founders fund/i.test(allText)) fundingScore += 4;
  
  fundingScore = Math.min(fundingScore, 25);
  
  // ============================================
  // 4. TEAM MAGNETISM (0-25)
  // Can they attract great talent?
  // ============================================
  let teamScore = 0;
  
  // Team size signals
  if (s.team_size >= 50) teamScore += 10;
  else if (s.team_size >= 20) teamScore += 8;
  else if (s.team_size >= 10) teamScore += 6;
  else if (s.team_size >= 5) teamScore += 4;
  else if (s.team_size >= 3) teamScore += 3;
  else if (s.team_size >= 2) teamScore += 2;
  else if (s.team_size >= 1) teamScore += 1;
  
  // Technical strength
  if (s.has_technical_cofounder) teamScore += 5;
  
  // Team quality signals from text
  if (/phd|doctorate|professor|researcher/i.test(allText)) teamScore += 3;
  if (/engineer|developer|architect/i.test(allText)) teamScore += 2;
  if (/cto|vp engineering|tech lead/i.test(allText)) teamScore += 3;
  if (/cmo|vp marketing|growth/i.test(allText)) teamScore += 2;
  if (/cfo|vp finance/i.test(allText)) teamScore += 2;
  
  // Advisors/board signals
  if (allText.includes('advisor') || allText.includes('board')) teamScore += 2;
  if (allText.includes('angel') || allText.includes('investor')) teamScore += 2;
  
  teamScore = Math.min(teamScore, 25);
  
  // ============================================
  // TOTAL GOD SCORE (0-100)
  // ============================================
  const total = pmfScore + founderScore + fundingScore + teamScore;
  
  return {
    total_god_score: total,
    market_score: pmfScore,      // PMF / Market Timing
    vision_score: founderScore,  // Founder Intensity
    traction_score: fundingScore, // Funding Velocity
    team_score: teamScore,       // Team Magnetism
    product_score: Math.round((pmfScore + founderScore) / 2) // Derived
  };
}

async function main() {
  console.log('\n🔥 GOD SCORE V3 - GRIT + Opportunity + Determination\n');
  console.log('Scoring dimensions:');
  console.log('  PMF/Market Timing (0-25): Are they on target?');
  console.log('  Founder Intensity (0-25): Determination & hustle');
  console.log('  Funding Velocity  (0-25): Scrappy resourcefulness');
  console.log('  Team Magnetism    (0-25): Attracting great talent\n');
  
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
          market_score: scores.market_score,
          vision_score: scores.vision_score,
          traction_score: scores.traction_score,
          team_score: scores.team_score,
          product_score: scores.product_score,
          updated_at: new Date().toISOString()
        })
        .eq('id', s.id);
      
      updated++;
    }
    
    console.log(`  ${updated} scored...`);
    offset += batchSize;
    if (startups.length < batchSize) break;
  }
  
  console.log(`\n✅ Done: ${updated} startups scored with GOD v3`);
}

main();
