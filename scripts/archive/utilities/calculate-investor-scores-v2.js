#!/usr/bin/env node
/**
 * ENHANCED INVESTOR SCORING
 * =========================
 * Fixed scoring that works with available data + adds estimated metrics
 * for well-known VCs based on public information.
 * 
 * Run: node calculate-investor-scores-v2.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Known top-tier VCs with estimated fund data
const KNOWN_VCS = {
  // Tier 1 - Mega funds
  'sequoia capital': { fund_size: 8000000000, pace: 50, tier_boost: 3 },
  'andreessen horowitz': { fund_size: 7000000000, pace: 80, tier_boost: 3 },
  'a16z': { fund_size: 7000000000, pace: 80, tier_boost: 3 },
  'founders fund': { fund_size: 3000000000, pace: 30, tier_boost: 3 },
  'benchmark': { fund_size: 1000000000, pace: 15, tier_boost: 3 },
  'greylock': { fund_size: 1000000000, pace: 25, tier_boost: 3 },
  'accel': { fund_size: 3000000000, pace: 40, tier_boost: 3 },
  'lightspeed': { fund_size: 4000000000, pace: 50, tier_boost: 2.5 },
  'general catalyst': { fund_size: 4000000000, pace: 45, tier_boost: 2.5 },
  'kleiner perkins': { fund_size: 2000000000, pace: 30, tier_boost: 2.5 },
  'khosla ventures': { fund_size: 2500000000, pace: 35, tier_boost: 2.5 },
  'index ventures': { fund_size: 3000000000, pace: 40, tier_boost: 2.5 },
  'bessemer': { fund_size: 2500000000, pace: 40, tier_boost: 2.5 },
  
  // Tier 2 - Strong VCs
  'first round capital': { fund_size: 500000000, pace: 40, tier_boost: 2 },
  'initialized capital': { fund_size: 300000000, pace: 30, tier_boost: 2 },
  'precursor ventures': { fund_size: 100000000, pace: 25, tier_boost: 2 },
  'forerunner ventures': { fund_size: 500000000, pace: 20, tier_boost: 2 },
  'craft ventures': { fund_size: 1500000000, pace: 30, tier_boost: 2 },
  'y combinator': { fund_size: 1000000000, pace: 300, tier_boost: 3 },
  'sv angel': { fund_size: 300000000, pace: 50, tier_boost: 2 },
  'lowercase capital': { fund_size: 200000000, pace: 20, tier_boost: 2 },
  'felicis ventures': { fund_size: 600000000, pace: 30, tier_boost: 2 },
  'ggv capital': { fund_size: 2500000000, pace: 35, tier_boost: 2 },
  'tiger global': { fund_size: 10000000000, pace: 100, tier_boost: 2 },
  'coatue': { fund_size: 8000000000, pace: 60, tier_boost: 2 },
  'insight partners': { fund_size: 5000000000, pace: 50, tier_boost: 2 },
  
  // Tier 3 - Active seed/early
  'backstage capital': { fund_size: 30000000, pace: 30, tier_boost: 1.5 },
  '500 startups': { fund_size: 500000000, pace: 100, tier_boost: 1.5 },
  '500 global': { fund_size: 500000000, pace: 100, tier_boost: 1.5 },
  'techstars': { fund_size: 300000000, pace: 200, tier_boost: 1.5 },
  'plug and play': { fund_size: 200000000, pace: 150, tier_boost: 1.5 },
  'republic': { fund_size: 100000000, pace: 50, tier_boost: 1 },
  'susa ventures': { fund_size: 150000000, pace: 15, tier_boost: 1.5 },
  'floodgate': { fund_size: 200000000, pace: 15, tier_boost: 2 },
};

/**
 * Enhanced scoring that works with available data
 */
function calculateInvestorScore(investor) {
  const signals = [];
  
  // Check if this is a known VC
  const firmLower = (investor.firm || '').toLowerCase();
  const nameLower = (investor.name || '').toLowerCase();
  const knownVC = Object.entries(KNOWN_VCS).find(([key]) => 
    firmLower.includes(key) || nameLower.includes(key)
  );
  
  // Get estimated data for known VCs
  const fundSize = investor.active_fund_size || (knownVC ? knownVC[1].fund_size : 0);
  const pace = investor.investment_pace_per_year || (knownVC ? knownVC[1].pace : 0);
  const tierBoost = knownVC ? knownVC[1].tier_boost : 0;
  
  if (knownVC) {
    signals.push(`Known VC: ${knownVC[0]}`);
  }

  // ============================================
  // TRACK RECORD (0-4 points) - INCREASED WEIGHT
  // ============================================
  let trackRecordScore = 0;
  
  const investments = investor.total_investments || 0;
  if (investments >= 200) {
    trackRecordScore += 2.0;
    signals.push('Very high volume: 200+ investments');
  } else if (investments >= 100) {
    trackRecordScore += 1.7;
    signals.push('High volume: 100+ investments');
  } else if (investments >= 50) {
    trackRecordScore += 1.4;
    signals.push('Active: 50+ investments');
  } else if (investments >= 20) {
    trackRecordScore += 1.0;
    signals.push('Established: 20+ investments');
  } else if (investments >= 5) {
    trackRecordScore += 0.5;
    signals.push('Early stage investor');
  }
  
  const exits = investor.successful_exits || 0;
  if (exits >= 50) {
    trackRecordScore += 2.0;
    signals.push('Exceptional exits: 50+');
  } else if (exits >= 20) {
    trackRecordScore += 1.5;
    signals.push('Strong exits: 20+');
  } else if (exits >= 10) {
    trackRecordScore += 1.0;
    signals.push('Good exits: 10+');
  } else if (exits >= 5) {
    trackRecordScore += 0.6;
    signals.push('Some exits: 5+');
  } else if (exits >= 1) {
    trackRecordScore += 0.3;
    signals.push('Has exits');
  }
  
  trackRecordScore = Math.min(trackRecordScore, 4);

  // ============================================
  // FUND HEALTH (0-2 points)
  // ============================================
  let fundHealthScore = 0;
  
  if (fundSize >= 5000000000) {
    fundHealthScore += 2.0;
    signals.push('Mega fund: $5B+');
  } else if (fundSize >= 1000000000) {
    fundHealthScore += 1.5;
    signals.push('Large fund: $1B+');
  } else if (fundSize >= 500000000) {
    fundHealthScore += 1.2;
    signals.push('Mid fund: $500M+');
  } else if (fundSize >= 100000000) {
    fundHealthScore += 0.8;
    signals.push('Seed fund: $100M+');
  } else if (investments >= 50) {
    // Credit for active investors even without fund data
    fundHealthScore += 0.5;
  }

  // ============================================
  // ACTIVITY/PACE (0-1.5 points)
  // ============================================
  let activityScore = 0;
  
  if (pace >= 100) {
    activityScore += 1.5;
    signals.push('Very high pace: 100+ deals/year');
  } else if (pace >= 30) {
    activityScore += 1.2;
    signals.push('High pace: 30+ deals/year');
  } else if (pace >= 15) {
    activityScore += 0.8;
    signals.push('Active pace: 15+ deals/year');
  } else if (pace >= 5) {
    activityScore += 0.4;
  }

  // ============================================
  // SECTOR EXPERTISE (0-1.5 points)
  // ============================================
  let expertiseScore = 0;
  
  const sectors = investor.sectors || [];
  if (sectors.length >= 1 && sectors.length <= 3) {
    expertiseScore += 1.0;
    signals.push(`Focused: ${sectors.slice(0, 3).join(', ')}`);
  } else if (sectors.length <= 6) {
    expertiseScore += 0.6;
    signals.push('Broad coverage');
  } else if (sectors.length > 0) {
    expertiseScore += 0.3;
  }
  
  if (investor.investment_thesis && investor.investment_thesis.length > 100) {
    expertiseScore += 0.5;
    signals.push('Clear thesis');
  }
  
  expertiseScore = Math.min(expertiseScore, 1.5);

  // ============================================
  // INVESTOR PROFILE (0-1 point)
  // ============================================
  let profileScore = 0;
  
  if (investor.leads_rounds) {
    profileScore += 0.4;
    signals.push('Leads rounds');
  }
  if (investor.decision_maker) {
    profileScore += 0.3;
    signals.push('Decision maker');
  }
  if (investor.linkedin_url || investor.twitter_url) {
    profileScore += 0.2;
  }
  if (investor.bio && investor.bio.length > 50) {
    profileScore += 0.1;
  }
  
  profileScore = Math.min(profileScore, 1);

  // ============================================
  // TIER BOOST for known VCs
  // ============================================
  
  // ============================================
  // CALCULATE TOTAL & TIER
  // ============================================
  let rawTotal = trackRecordScore + fundHealthScore + activityScore + expertiseScore + profileScore + tierBoost;
  const total = Math.min(rawTotal, 10);
  
  let tier;
  if (total >= 8) {
    tier = 'elite';
  } else if (total >= 6) {
    tier = 'strong';
  } else if (total >= 4) {
    tier = 'solid';
  } else {
    tier = 'emerging';
  }
  
  return {
    total: Math.round(total * 10) / 10,
    breakdown: {
      track_record: Math.round(trackRecordScore * 10) / 10,
      fund_health: Math.round(fundHealthScore * 10) / 10,
      activity: Math.round(activityScore * 10) / 10,
      expertise: Math.round(expertiseScore * 10) / 10,
      profile: Math.round(profileScore * 10) / 10,
      tier_boost: tierBoost,
    },
    tier,
    signals,
  };
}

async function main() {
  console.log('\n🎯 ENHANCED INVESTOR SCORING v2\n');
  console.log('═'.repeat(60));
  console.log('This version:');
  console.log('  • Weights track record more heavily (we have this data)');
  console.log('  • Adds tier boost for known top VCs');
  console.log('  • Uses estimated fund data for major firms');
  console.log('═'.repeat(60));
  
  // Get all investors
  const { data: investors, error } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, firm, total_investments, successful_exits, 
             active_fund_size, dry_powder_estimate, investment_pace_per_year,
             last_investment_date, sectors, investment_thesis,
             avg_response_time_days, decision_maker, leads_rounds,
             linkedin_url, twitter_url, bio
      FROM investors
      ORDER BY total_investments DESC NULLS LAST
    `
  });
  
  if (error || !investors) {
    console.error('❌ Failed to fetch investors:', error);
    return;
  }
  
  console.log(`\n📊 Found ${investors.length} investors to score\n`);
  
  const tiers = { elite: 0, strong: 0, solid: 0, emerging: 0 };
  let updated = 0;
  let errors = 0;
  
  // Process investors
  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i];
    
    try {
      const score = calculateInvestorScore(investor);
      tiers[score.tier]++;
      
      // Update database
      const signalsArray = score.signals.length > 0 
        ? `ARRAY[${score.signals.map(s => `'${s.replace(/'/g, "''")}'`).join(',')}]`
        : 'ARRAY[]::TEXT[]';
      
      const updateQuery = `
        UPDATE investors 
        SET investor_score = ${score.total},
            investor_tier = '${score.tier}',
            score_breakdown = '${JSON.stringify(score.breakdown).replace(/'/g, "''")}',
            score_signals = ${signalsArray},
            last_scored_at = NOW()
        WHERE id = '${investor.id}'
      `;
      
      const { data: result, error: updateError } = await supabase.rpc('exec_sql_modify', {
        sql_query: updateQuery
      });
      
      if (updateError || (result && result.error)) {
        errors++;
      } else {
        updated++;
      }
      
      // Log top investors
      if (i < 15) {
        const tierEmoji = { elite: '🏆', strong: '💪', solid: '✓', emerging: '🌱' };
        console.log(`${tierEmoji[score.tier]} ${(investor.name || investor.firm).padEnd(30)} ${score.total.toFixed(1)}/10 (${score.tier})`);
        if (score.breakdown.tier_boost > 0) {
          console.log(`   Known VC boost: +${score.breakdown.tier_boost}`);
        }
      }
      
      // Progress
      if (i > 0 && i % 100 === 0) {
        process.stdout.write(`\r   Processing: ${i}/${investors.length}`);
      }
      
    } catch (err) {
      errors++;
    }
  }
  
  console.log('\n\n' + '═'.repeat(60));
  console.log('\n📊 SCORING COMPLETE\n');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('\n   TIER DISTRIBUTION:');
  console.log(`   🏆 Elite (8-10):   ${tiers.elite} (${(tiers.elite/investors.length*100).toFixed(1)}%)`);
  console.log(`   💪 Strong (6-8):   ${tiers.strong} (${(tiers.strong/investors.length*100).toFixed(1)}%)`);
  console.log(`   ✓  Solid (4-6):    ${tiers.solid} (${(tiers.solid/investors.length*100).toFixed(1)}%)`);
  console.log(`   🌱 Emerging (0-4): ${tiers.emerging} (${(tiers.emerging/investors.length*100).toFixed(1)}%)`);
  console.log('\n');
}

main().catch(console.error);
