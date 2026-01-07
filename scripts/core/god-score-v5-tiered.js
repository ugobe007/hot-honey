require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Sector weights - hot markets get baseline boost
const SECTOR_WEIGHTS = {
  'ai': 15, 'ai/ml': 15, 'ml': 12, 'machine learning': 12, 'llm': 15, 'genai': 15,
  'fintech': 12, 'finance': 10,
  'healthtech': 12, 'health': 10, 'biotech': 12, 'medtech': 11,
  'climate': 12, 'cleantech': 12, 'energy': 10,
  'security': 12, 'cybersecurity': 12, 'cyber': 11,
  'enterprise': 10, 'b2b': 8, 'saas': 8,
  'devtools': 10, 'developer tools': 10, 'infrastructure': 9,
  'robotics': 12, 'automation': 10,
  'deeptech': 12, 'quantum': 12,
  'proptech': 8, 'edtech': 8, 'foodtech': 8,
  'consumer': 6, 'marketplace': 7, 'ecommerce': 6
};

function getDataTier(s) {
  const descLen = (s.description || '').length;
  const pitchLen = (s.pitch || '').length;
  const hasWebsite = s.website && s.website.length > 5;
  const hasMrr = s.mrr > 0;
  const hasCustomers = s.customer_count > 0;
  
  // Tier A: Rich data
  if (descLen > 100 || pitchLen > 100 || hasMrr || hasCustomers) {
    return 'A';
  }
  // Tier B: Some data
  if (descLen > 30 || pitchLen > 30 || hasWebsite) {
    return 'B';
  }
  // Tier C: Sparse
  return 'C';
}

function getSectorBonus(sectors) {
  let maxBonus = 0;
  for (const sector of (sectors || [])) {
    const s = (sector || '').toLowerCase();
    for (const [key, weight] of Object.entries(SECTOR_WEIGHTS)) {
      if (s.includes(key)) {
        maxBonus = Math.max(maxBonus, weight);
      }
    }
  }
  return maxBonus;
}

function scoreTierA(s) {
  // Full scoring for rich data startups
  const desc = (s.description || '').toLowerCase();
  const pitch = (s.pitch || '').toLowerCase();
  const allText = desc + ' ' + pitch + ' ' + (s.tagline || '').toLowerCase();
  
  let contentScore = 0, marketScore = 0, tractionScore = 0, teamScore = 0;
  
  // CONTENT (0-25)
  if (desc.length > 200) contentScore += 10;
  else if (desc.length > 100) contentScore += 7;
  else if (desc.length > 50) contentScore += 4;
  
  if (pitch.length > 200) contentScore += 8;
  else if (pitch.length > 100) contentScore += 5;
  else if (pitch.length > 50) contentScore += 3;
  
  if (s.website) contentScore += 4;
  if (s.deck_filename) contentScore += 3;
  
  // MARKET (0-25)
  marketScore += getSectorBonus(s.sectors);
  if (allText.includes('billion')) marketScore += 4;
  if (allText.includes('enterprise')) marketScore += 3;
  if (allText.includes('platform')) marketScore += 2;
  if (allText.includes('automat')) marketScore += 2;
  
  // TRACTION (0-25)
  if (s.mrr > 100000) tractionScore += 15;
  else if (s.mrr > 10000) tractionScore += 10;
  else if (s.mrr > 1000) tractionScore += 6;
  else if (s.mrr > 0) tractionScore += 3;
  
  if (s.customer_count > 100) tractionScore += 8;
  else if (s.customer_count > 10) tractionScore += 5;
  else if (s.customer_count > 0) tractionScore += 3;
  
  if (s.is_launched) tractionScore += 3;
  if (s.has_demo) tractionScore += 3;
  
  if (allText.includes('revenue')) tractionScore += 2;
  if (allText.includes('customer')) tractionScore += 2;
  if (/\d+k|\d+m/i.test(allText)) tractionScore += 2;
  
  // TEAM (0-25)
  if (s.team_size >= 20) teamScore += 10;
  else if (s.team_size >= 10) teamScore += 7;
  else if (s.team_size >= 5) teamScore += 5;
  else if (s.team_size >= 2) teamScore += 3;
  
  if (s.has_technical_cofounder) teamScore += 6;
  
  if (/google|meta|amazon|microsoft|apple|stripe/i.test(allText)) teamScore += 5;
  if (/stanford|mit|harvard|berkeley/i.test(allText)) teamScore += 4;
  if (/yc|y combinator|techstars/i.test(allText)) teamScore += 6;
  if (/sequoia|a16z|andreessen/i.test(allText)) teamScore += 5;
  if (/serial|exited|founded/i.test(allText)) teamScore += 4;
  
  return {
    total: Math.min(contentScore, 25) + Math.min(marketScore, 25) + Math.min(tractionScore, 25) + Math.min(teamScore, 25),
    content: Math.min(contentScore, 25),
    market: Math.min(marketScore, 25),
    traction: Math.min(tractionScore, 25),
    team: Math.min(teamScore, 25)
  };
}

function scoreTierB(s) {
  // Medium scoring - some data available
  const allText = ((s.description || '') + ' ' + (s.tagline || '') + ' ' + (s.pitch || '')).toLowerCase();
  
  let score = 15; // Baseline for Tier B
  
  // Sector bonus (0-15)
  score += getSectorBonus(s.sectors);
  
  // Content bonus (0-10)
  if ((s.description || '').length > 50) score += 5;
  if (s.website) score += 5;
  
  // Text signals (0-10)
  if (allText.includes('platform')) score += 2;
  if (allText.includes('ai') || allText.includes('automat')) score += 3;
  if (allText.includes('enterprise') || allText.includes('b2b')) score += 2;
  
  // Product signals
  if (s.is_launched) score += 3;
  
  const total = Math.min(score, 50); // Cap Tier B at 50
  
  return {
    total,
    content: Math.round(total * 0.3),
    market: Math.round(total * 0.4),
    traction: Math.round(total * 0.15),
    team: Math.round(total * 0.15)
  };
}

function scoreTierC(s) {
  // Sparse data - score based on sector only
  let score = 10; // Baseline for Tier C
  
  // Sector bonus (0-15)
  score += getSectorBonus(s.sectors);
  
  // Minimal signals
  if (s.website) score += 3;
  if (s.is_launched) score += 2;
  
  const total = Math.min(score, 35); // Cap Tier C at 35
  
  return {
    total,
    content: Math.round(total * 0.2),
    market: Math.round(total * 0.5),
    traction: Math.round(total * 0.15),
    team: Math.round(total * 0.15)
  };
}

async function main() {
  console.log('\n🔥 GOD SCORE V5 - TIERED SCORING\n');
  console.log('Tier A (Rich): Full scoring, up to 100 pts');
  console.log('Tier B (Some): Partial scoring, up to 50 pts');
  console.log('Tier C (Sparse): Sector-based, up to 35 pts\n');
  
  // Get total count first
  const { count: totalCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  console.log(`📊 Total approved startups to process: ${totalCount || 0}\n`);
  
  let offset = 0, updated = 0, failed = 0;
  const stats = { A: 0, B: 0, C: 0 };
  const batchSize = 50; // Reduced to 50 to avoid overwhelming Supabase
  
  while (true) {
    // Optimized query - only select essential columns to prevent timeout
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('id, name, description, tagline, pitch, website, sectors, stage, mrr, customer_count, team_size, is_launched, has_demo, has_technical_cofounder')
      .eq('status', 'approved')
      .range(offset, offset + batchSize - 1)
      .limit(batchSize);
    
    if (error) { 
      console.error('Query error:', error);
      break; 
    }
    if (!startups || startups.length === 0) break;
    
    for (const s of startups) {
      const tier = getDataTier(s);
      stats[tier]++;
      
      let scores;
      if (tier === 'A') scores = scoreTierA(s);
      else if (tier === 'B') scores = scoreTierB(s);
      else scores = scoreTierC(s);
      
      // Individual updates with error handling and retry logic
      let retries = 3;
      let success = false;
      
      while (retries > 0 && !success) {
        try {
          const updateResult = await supabase.from('startup_uploads').update({
            total_god_score: scores.total,
            vision_score: scores.content,
            market_score: scores.market,
            traction_score: scores.traction,
            team_score: scores.team,
            product_score: Math.round((scores.content + scores.traction) / 2),
            updated_at: new Date().toISOString()
          }).eq('id', s.id);
          
          // Check if response is HTML (error page) instead of JSON
          if (updateResult.error) {
            const errorMsg = updateResult.error.message || '';
            
            // Check if it's an HTML error page
            if (errorMsg.includes('<!DOCTYPE') || errorMsg.includes('<html') || errorMsg.includes('500')) {
              console.error(`⚠️  Supabase 500 error for ${s.name} - retrying... (${retries} attempts left)`);
              retries--;
              if (retries > 0) {
                // Exponential backoff: 2s, 4s, 8s
                await new Promise(r => setTimeout(r, 2000 * (4 - retries)));
                continue;
              } else {
                console.error(`❌ Failed after 3 retries: ${s.name}`);
              }
            } else {
              // Regular error
              console.error(`Error updating ${s.name}:`, errorMsg.substring(0, 100));
              break; // Don't retry for regular errors
            }
          } else {
            // Success!
            updated++;
            success = true;
          }
        } catch (err) {
          const errMsg = err.message || String(err);
          if (errMsg.includes('500') || errMsg.includes('Internal server')) {
            console.error(`⚠️  Exception for ${s.name} - retrying... (${retries} attempts left)`);
            retries--;
            if (retries > 0) {
              await new Promise(r => setTimeout(r, 2000 * (4 - retries)));
              continue;
            } else {
              console.error(`❌ Failed after 3 retries: ${s.name}`);
            }
          } else {
            console.error(`Exception updating ${s.name}:`, errMsg.substring(0, 100));
            break; // Don't retry for non-500 errors
          }
        }
      }
      
      // Rate limiting: small delay between updates to avoid overwhelming Supabase
      await new Promise(r => setTimeout(r, 100));
    }
    
    const processed = updated + failed;
    const pct = totalCount ? ((processed / totalCount) * 100).toFixed(1) : '?';
    console.log(`  ${updated} scored, ${failed} failed (${processed}/${totalCount || '?'} = ${pct}%)`);
    offset += batchSize;
    if (startups.length < batchSize) break;
    
    // Longer delay between batches to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const total = updated + failed;
  console.log(`\n✅ Done: ${updated} scored, ${failed} failed (${total} total)`);
  if (total > 0) {
    console.log(`\n📊 TIER DISTRIBUTION:`);
    console.log(`  Tier A (Rich):   ${stats.A} (${(stats.A/total*100).toFixed(1)}%)`);
    console.log(`  Tier B (Some):   ${stats.B} (${(stats.B/total*100).toFixed(1)}%)`);
    console.log(`  Tier C (Sparse): ${stats.C} (${(stats.C/total*100).toFixed(1)}%)`);
  }
}

main();
