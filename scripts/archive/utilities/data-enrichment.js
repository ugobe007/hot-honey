#!/usr/bin/env node
/**
 * DATA ENRICHMENT
 * ================
 * Infers missing stage/revenue/traction from available signals:
 * - stage from raise_amount, latest_funding_round
 * - has_revenue from arr, mrr, revenue_annual
 * - has_customers from customer_count, nps_score
 * - is_launched from has_demo, daily_active_users
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function inferStage(s) {
  // From latest_funding_round
  if (s.latest_funding_round) {
    const round = s.latest_funding_round.toLowerCase();
    if (round.includes('series a')) return 2;
    if (round.includes('series b')) return 3;
    if (round.includes('series c')) return 4;
    if (round.includes('seed')) return 1;
    if (round.includes('pre-seed') || round.includes('angel')) return 0;
  }
  
  // From raise_amount
  if (s.raise_amount) {
    if (s.raise_amount >= 20000000) return 3;  // $20M+ = Series B+
    if (s.raise_amount >= 5000000) return 2;   // $5M+ = Series A
    if (s.raise_amount >= 1000000) return 1;   // $1M+ = Seed
    return 0;  // Pre-seed
  }
  
  // From ARR
  if (s.arr) {
    if (s.arr >= 10000000) return 3;  // $10M ARR = Series B+
    if (s.arr >= 1000000) return 2;   // $1M ARR = Series A
    if (s.arr >= 100000) return 1;    // $100K ARR = Seed
    return 0;
  }
  
  // From team size
  if (s.team_size) {
    if (s.team_size >= 50) return 3;
    if (s.team_size >= 15) return 2;
    if (s.team_size >= 5) return 1;
  }
  
  return null;
}

async function enrichData() {
  console.log('🔍 Data Enrichment\n');
  
  const { data: startups } = await supabase.from('startup_uploads')
    .select('id, name, stage, has_revenue, has_customers, is_launched, raise_amount, latest_funding_round, arr, mrr, revenue_annual, customer_count, nps_score, has_demo, daily_active_users, weekly_active_users, team_size')
    .eq('status', 'approved');
  
  console.log('Found ' + startups.length + ' startups\n');
  
  let stageUpdates = 0, revenueUpdates = 0, customerUpdates = 0, launchUpdates = 0;
  
  for (const s of startups) {
    const updates = {};
    
    // 1. Infer stage
    if (s.stage === null || s.stage === undefined) {
      const inferred = inferStage(s);
      if (inferred !== null) {
        updates.stage = inferred;
        stageUpdates++;
      }
    }
    
    // 2. Infer has_revenue
    if (!s.has_revenue) {
      if ((s.arr && s.arr > 0) || (s.mrr && s.mrr > 0) || (s.revenue_annual && s.revenue_annual > 0)) {
        updates.has_revenue = true;
        revenueUpdates++;
      }
    }
    
    // 3. Infer has_customers
    if (!s.has_customers) {
      if ((s.customer_count && s.customer_count > 0) || (s.nps_score && s.nps_score > 0) || s.has_revenue) {
        updates.has_customers = true;
        customerUpdates++;
      }
    }
    
    // 4. Infer is_launched
    if (!s.is_launched) {
      if (s.has_demo || (s.daily_active_users && s.daily_active_users > 0) || 
          (s.weekly_active_users && s.weekly_active_users > 0) || s.has_customers) {
        updates.is_launched = true;
        launchUpdates++;
      }
    }
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('startup_uploads')
        .update(updates)
        .eq('id', s.id);
      
      if (error) console.log('  ❌ ' + s.name + ': ' + error.message);
    }
  }
  
  console.log('✅ Enrichment complete:');
  console.log('  - Stage inferred: ' + stageUpdates);
  console.log('  - has_revenue set: ' + revenueUpdates);
  console.log('  - has_customers set: ' + customerUpdates);
  console.log('  - is_launched set: ' + launchUpdates);
}

enrichData().catch(console.error);
