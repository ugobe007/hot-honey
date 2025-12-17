#!/usr/bin/env node
/**
 * CALCULATE INVESTOR GOD SCORES
 * ==============================
 * Scores all investors using the VC GOD algorithm and saves to database.
 * 
 * Run: node calculate-investor-scores.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Calculate investor score (JavaScript version of investorScoringService.ts)
 */
function calculateInvestorScore(investor) {
  const signals = [];
  
  // ============================================
  // TRACK RECORD (0-3 points)
  // ============================================
  let trackRecordScore = 0;
  
  const investments = investor.total_investments || 0;
  if (investments >= 100) {
    trackRecordScore += 1.5;
    signals.push('Highly experienced: 100+ investments');
  } else if (investments >= 50) {
    trackRecordScore += 1.2;
    signals.push('Experienced: 50+ investments');
  } else if (investments >= 20) {
    trackRecordScore += 0.8;
    signals.push('Active investor: 20+ investments');
  } else if (investments >= 5) {
    trackRecordScore += 0.4;
    signals.push('Established: 5+ investments');
  }
  
  const exits = investor.successful_exits || 0;
  if (exits >= 20) {
    trackRecordScore += 1.0;
    signals.push('Exceptional track record: 20+ exits');
  } else if (exits >= 10) {
    trackRecordScore += 0.8;
    signals.push('Strong exits: 10+');
  } else if (exits >= 5) {
    trackRecordScore += 0.5;
    signals.push('Solid exits: 5+');
  } else if (exits >= 1) {
    trackRecordScore += 0.2;
    signals.push('Has exits');
  }
  
  // Exit rate bonus
  if (investments > 0 && exits > 0) {
    const exitRate = exits / investments;
    if (exitRate >= 0.2) {
      trackRecordScore += 0.5;
      signals.push(`High exit rate: ${(exitRate * 100).toFixed(0)}%`);
    }
  }
  
  trackRecordScore = Math.min(trackRecordScore, 3);
  
  // ============================================
  // ACTIVITY LEVEL (0-2 points)
  // ============================================
  let activityScore = 0;
  
  const pace = investor.investment_pace_per_year || 0;
  if (pace >= 20) {
    activityScore += 1.0;
    signals.push('High velocity: 20+ deals/year');
  } else if (pace >= 10) {
    activityScore += 0.7;
    signals.push('Active pace: 10+ deals/year');
  } else if (pace >= 5) {
    activityScore += 0.4;
  }
  
  if (investor.last_investment_date) {
    const lastInvestment = new Date(investor.last_investment_date);
    const monthsAgo = (Date.now() - lastInvestment.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsAgo <= 3) {
      activityScore += 1.0;
      signals.push('Very active: invested in last 3 months');
    } else if (monthsAgo <= 6) {
      activityScore += 0.7;
      signals.push('Active: invested in last 6 months');
    } else if (monthsAgo <= 12) {
      activityScore += 0.4;
      signals.push('Recent activity within 12 months');
    }
  }
  
  activityScore = Math.min(activityScore, 2);
  
  // ============================================
  // FUND HEALTH (0-2 points)
  // ============================================
  let fundHealthScore = 0;
  
  const fundSize = investor.active_fund_size || 0;
  if (fundSize >= 500000000) {
    fundHealthScore += 1.0;
    signals.push('Large fund: $500M+');
  } else if (fundSize >= 100000000) {
    fundHealthScore += 0.7;
    signals.push('Mid-size fund: $100M+');
  } else if (fundSize >= 20000000) {
    fundHealthScore += 0.4;
  }
  
  const dryPowder = investor.dry_powder_estimate || 0;
  if (dryPowder >= 100000000) {
    fundHealthScore += 1.0;
    signals.push('High dry powder: $100M+ available');
  } else if (dryPowder >= 20000000) {
    fundHealthScore += 0.6;
    signals.push('Capital available: $20M+');
  } else if (dryPowder >= 5000000) {
    fundHealthScore += 0.3;
  }
  
  if (fundSize === 0 && dryPowder === 0 && investments >= 10) {
    fundHealthScore += 0.5;
  }
  
  fundHealthScore = Math.min(fundHealthScore, 2);
  
  // ============================================
  // SECTOR EXPERTISE (0-1.5 points)
  // ============================================
  let expertiseScore = 0;
  
  const sectors = investor.sectors || [];
  if (sectors.length >= 1 && sectors.length <= 3) {
    expertiseScore += 1.0;
    signals.push(`Focused expertise: ${sectors.slice(0, 3).join(', ')}`);
  } else if (sectors.length <= 6) {
    expertiseScore += 0.6;
    signals.push('Broad sector coverage');
  } else if (sectors.length > 0) {
    expertiseScore += 0.3;
    signals.push('Generalist investor');
  }
  
  if (investor.investment_thesis && investor.investment_thesis.length > 100) {
    expertiseScore += 0.5;
    signals.push('Clear investment thesis');
  }
  
  expertiseScore = Math.min(expertiseScore, 1.5);
  
  // ============================================
  // RESPONSIVENESS (0-1.5 points)
  // ============================================
  let responsivenessScore = 0;
  
  const responseTime = investor.avg_response_time_days || 0;
  if (responseTime > 0 && responseTime <= 3) {
    responsivenessScore += 0.75;
    signals.push('Fast responder: <3 days');
  } else if (responseTime <= 7) {
    responsivenessScore += 0.5;
    signals.push('Good response time: <1 week');
  } else if (responseTime <= 14) {
    responsivenessScore += 0.25;
  }
  
  if (investor.decision_maker) {
    responsivenessScore += 0.5;
    signals.push('Decision maker: faster process');
  }
  
  if (investor.leads_rounds) {
    responsivenessScore += 0.25;
    signals.push('Leads rounds');
  }
  
  responsivenessScore = Math.min(responsivenessScore, 1.5);
  
  // ============================================
  // CALCULATE TOTAL & TIER
  // ============================================
  const total = Math.min(
    trackRecordScore + activityScore + fundHealthScore + expertiseScore + responsivenessScore,
    10
  );
  
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
      activity_level: Math.round(activityScore * 10) / 10,
      fund_health: Math.round(fundHealthScore * 10) / 10,
      sector_expertise: Math.round(expertiseScore * 10) / 10,
      responsiveness: Math.round(responsivenessScore * 10) / 10,
    },
    tier,
    signals,
  };
}

async function main() {
  console.log('\n🎯 INVESTOR GOD ALGORITHM - Scoring All VCs\n');
  console.log('=' .repeat(60));
  
  // Get all investors
  const { data: investors, error } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, firm, total_investments, successful_exits, 
             active_fund_size, dry_powder_estimate, investment_pace_per_year,
             last_investment_date, sectors, investment_thesis,
             avg_response_time_days, decision_maker, leads_rounds
      FROM investors
      ORDER BY total_investments DESC NULLS LAST
    `
  });
  
  if (error || !investors) {
    console.error('❌ Failed to fetch investors:', error);
    return;
  }
  
  console.log(`\n📊 Found ${investors.length} investors to score\n`);
  
  // Score distributions
  const tiers = { elite: 0, strong: 0, solid: 0, emerging: 0 };
  let updated = 0;
  let errors = 0;
  
  // Process in batches
  const batchSize = 50;
  for (let i = 0; i < investors.length; i += batchSize) {
    const batch = investors.slice(i, i + batchSize);
    
    for (const investor of batch) {
      try {
        const score = calculateInvestorScore(investor);
        tiers[score.tier]++;
        
        // Update database
        const updateQuery = `
          UPDATE investors 
          SET investor_score = ${score.total},
              investor_tier = '${score.tier}',
              score_breakdown = '${JSON.stringify(score.breakdown).replace(/'/g, "''")}',
              score_signals = ARRAY[${score.signals.map(s => `'${s.replace(/'/g, "''")}'`).join(',')}],
              last_scored_at = NOW()
          WHERE id = '${investor.id}'
        `;
        
        const { data: result, error: updateError } = await supabase.rpc('exec_sql_modify', {
          sql_query: updateQuery
        });
        
        if (updateError || (result && result.error)) {
          errors++;
          if (errors <= 3) console.log(`   ⚠️ Error updating ${investor.name}:`, updateError?.message || result?.error);
        } else {
          updated++;
        }
        
        // Log top investors
        if (i + batch.indexOf(investor) < 10) {
          console.log(`   🏆 ${investor.name || investor.firm}: ${score.total}/10 (${score.tier})`);
          console.log(`      Track: ${score.breakdown.track_record} | Activity: ${score.breakdown.activity_level} | Fund: ${score.breakdown.fund_health}`);
        }
        
      } catch (err) {
        errors++;
        if (errors <= 3) console.log(`   ❌ Error scoring ${investor.name}:`, err.message);
      }
    }
    
    // Progress update
    const progress = Math.min(i + batchSize, investors.length);
    process.stdout.write(`\r   Processing: ${progress}/${investors.length} (${Math.round(progress/investors.length*100)}%)`);
  }
  
  console.log('\n\n' + '=' .repeat(60));
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
