#!/usr/bin/env node
/**
 * 🚀 SALES VELOCITY ENRICHMENT
 * 
 * Estimates sales velocity metrics from available signals:
 * - funding_amount → ARR proxy
 * - mrr/revenue_annual → direct if available
 * - team_size → customer count proxy
 * - stage → time to revenue proxy
 * - traction_score → growth rate proxy
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ============================================
// ESTIMATION HEURISTICS
// ============================================

function estimateARR(startup) {
  // If we have direct data, use it
  if (startup.revenue_annual) return startup.revenue_annual;
  if (startup.mrr) return startup.mrr * 12;
  
  // Estimate from funding (typical startups have ARR = 10-30% of last round)
  if (startup.raise_amount) {
    const funding = startup.raise_amount;
    const stage = startup.stage || 1;
    
    // More mature companies have higher ARR/funding ratio
    const ratios = {
      0: 0.05,  // Pre-seed: 5%
      1: 0.10,  // Seed: 10%
      2: 0.20,  // Series A: 20%
      3: 0.40,  // Series B: 40%
      4: 0.60   // Growth: 60%
    };
    
    return Math.round(funding * (ratios[stage] || 0.10));
  }
  
  return null;
}

function estimateARRGrowth(startup) {
  // Use traction_score as growth indicator
  const traction = startup.traction_score || 50;
  
  // Map traction score to growth rate
  // High traction = likely growing fast
  if (traction >= 80) return 250 + Math.random() * 100; // 250-350%
  if (traction >= 70) return 150 + Math.random() * 100; // 150-250%
  if (traction >= 60) return 100 + Math.random() * 50;  // 100-150%
  if (traction >= 50) return 50 + Math.random() * 50;   // 50-100%
  if (traction >= 40) return 25 + Math.random() * 25;   // 25-50%
  return 10 + Math.random() * 15;                       // 10-25%
}

function estimateCustomerCount(startup) {
  // If we have ARR, estimate customer count
  const arr = estimateARR(startup);
  if (!arr) return null;
  
  // Average contract value varies by stage
  const stage = startup.stage || 1;
  const avgACVs = {
    0: 2000,    // Pre-seed: $2K ACV
    1: 5000,    // Seed: $5K ACV
    2: 15000,   // Series A: $15K ACV
    3: 50000,   // Series B: $50K ACV
    4: 100000   // Growth: $100K ACV
  };
  
  const acv = avgACVs[stage] || 5000;
  return Math.max(1, Math.round(arr / acv));
}

function estimateCustomerGrowthMonthly(startup) {
  // Growth rate strongly correlates with ARR growth
  const arrGrowth = estimateARRGrowth(startup);
  
  // Monthly growth = roughly (annual growth / 12) but with compounding
  // 100% annual ≈ 6% monthly, 200% annual ≈ 10% monthly
  if (arrGrowth >= 200) return 10 + Math.random() * 5;  // 10-15%
  if (arrGrowth >= 100) return 6 + Math.random() * 4;   // 6-10%
  if (arrGrowth >= 50) return 3 + Math.random() * 3;    // 3-6%
  return 1 + Math.random() * 2;                          // 1-3%
}

function estimateTimeToRevenue(startup) {
  // Based on stage and launch status
  const stage = startup.stage || 1;
  const launched = startup.is_launched;
  
  if (launched) {
    // If launched, estimate based on traction
    const traction = startup.traction_score || 50;
    if (traction >= 70) return 2 + Math.random() * 2;  // 2-4 months
    if (traction >= 50) return 4 + Math.random() * 4;  // 4-8 months
    return 8 + Math.random() * 6;                       // 8-14 months
  }
  
  // Not launched yet - estimate future
  if (stage === 0) return 12 + Math.random() * 6; // 12-18 months
  return 6 + Math.random() * 6;                    // 6-12 months
}

function estimateMonthsTo1MARR(startup) {
  const arr = estimateARR(startup);
  const arrGrowth = estimateARRGrowth(startup);
  
  if (!arr || arr <= 0) return null;
  
  // If already at $1M+, calculate how long it took (estimate)
  if (arr >= 1000000) {
    // High growth = got there faster
    if (arrGrowth >= 200) return 12 + Math.random() * 6;
    if (arrGrowth >= 100) return 18 + Math.random() * 6;
    return 24 + Math.random() * 12;
  }
  
  // Project time to $1M based on current ARR and growth
  // months = log(target/current) / log(1 + monthly_growth)
  const monthlyGrowth = Math.pow(1 + arrGrowth / 100, 1/12) - 1;
  const monthsNeeded = Math.log(1000000 / arr) / Math.log(1 + monthlyGrowth);
  
  return Math.round(Math.min(60, monthsNeeded)); // Cap at 5 years
}

function estimateLTVCAC(startup) {
  // Good companies have 3:1+ LTV/CAC
  const traction = startup.traction_score || 50;
  const team = startup.team_score || 50;
  
  // Stronger team + traction = better unit economics
  const score = (traction + team) / 2;
  
  if (score >= 80) return 5 + Math.random() * 3;   // 5-8:1
  if (score >= 70) return 4 + Math.random() * 2;   // 4-6:1
  if (score >= 60) return 3 + Math.random() * 1.5; // 3-4.5:1
  if (score >= 50) return 2 + Math.random() * 1;   // 2-3:1
  return 1 + Math.random() * 1;                    // 1-2:1
}

function estimateNRR(startup) {
  // Net Revenue Retention - SaaS key metric
  // >100% = customers expanding
  const traction = startup.traction_score || 50;
  const product = startup.product_score || 50;
  
  // Good product + traction = strong retention
  const score = (traction + product) / 2;
  
  if (score >= 80) return 130 + Math.random() * 20; // 130-150%
  if (score >= 70) return 115 + Math.random() * 15; // 115-130%
  if (score >= 60) return 105 + Math.random() * 10; // 105-115%
  if (score >= 50) return 95 + Math.random() * 10;  // 95-105%
  return 80 + Math.random() * 15;                   // 80-95%
}

function estimateSalesCycleDays(startup) {
  // Sales cycle depends on stage (proxy for deal size)
  const stage = startup.stage || 1;
  
  const cycles = {
    0: 7 + Math.random() * 14,    // Pre-seed: 7-21 days (small deals)
    1: 14 + Math.random() * 30,   // Seed: 14-44 days
    2: 30 + Math.random() * 30,   // Series A: 30-60 days
    3: 45 + Math.random() * 45,   // Series B: 45-90 days
    4: 60 + Math.random() * 60    // Growth: 60-120 days
  };
  
  return Math.round(cycles[stage] || cycles[1]);
}

// ============================================
// MAIN ENRICHMENT
// ============================================

async function enrichSalesVelocity() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 SALES VELOCITY ENRICHMENT');
  console.log('═'.repeat(80));
  console.log('\nEstimating sales velocity metrics from available signals...\n');
  
  // Get startups that need enrichment
  const { data: startups, error } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, stage, raise_amount, mrr, revenue_annual,
             traction_score, team_score, product_score, is_launched,
             arr, arr_growth_rate, customer_count, customer_growth_monthly
      FROM startup_uploads 
      WHERE status = 'approved'
      ORDER BY total_god_score DESC NULLS LAST
    `
  });
  
  if (error) {
    console.error('Error fetching startups:', error);
    return;
  }
  
  // Handle RPC response format (object with numeric keys)
  const allStartups = Array.isArray(startups) ? startups : Object.values(startups || {});
  
  // Filter out any invalid entries
  const validStartups = allStartups.filter(s => s && s.id);
  console.log(`📊 Processing ${validStartups.length} startups...\n`);
  
  let enriched = 0;
  let skipped = 0;
  const batchSize = 50;
  
  for (let i = 0; i < validStartups.length; i += batchSize) {
    const batch = validStartups.slice(i, i + batchSize);
    
    for (const startup of batch) {
      // Skip if already has comprehensive data
      if (startup.arr && startup.arr_growth_rate && startup.customer_count) {
        skipped++;
        continue;
      }
      
      // Estimate metrics - ensure integers where needed
      const metrics = {
        arr: startup.arr || estimateARR(startup),
        arr_growth_rate: startup.arr_growth_rate || Math.round(estimateARRGrowth(startup)),
        customer_count: startup.customer_count || estimateCustomerCount(startup),
        customer_growth_monthly: startup.customer_growth_monthly || Math.round(estimateCustomerGrowthMonthly(startup)),
        time_to_first_revenue_months: Math.round(estimateTimeToRevenue(startup)),
        months_to_1m_arr: estimateMonthsTo1MARR(startup) ? Math.round(estimateMonthsTo1MARR(startup)) : null,
        ltv_cac_ratio: Math.round(estimateLTVCAC(startup) * 10) / 10,
        nrr: Math.round(estimateNRR(startup)),
        sales_cycle_days: Math.round(estimateSalesCycleDays(startup))
      };
      
      // Update database
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update(metrics)
        .eq('id', startup.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${startup.name}:`, updateError.message);
      } else {
        enriched++;
      }
    }
    
    console.log(`   Processed ${Math.min(i + batchSize, validStartups.length)}/${validStartups.length}`);
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('📈 ENRICHMENT COMPLETE');
  console.log('═'.repeat(80));
  console.log(`\n   ✅ Enriched: ${enriched} startups`);
  console.log(`   ⏭️  Skipped: ${skipped} (already had data)`);
  
  // Show sample
  console.log('\n📋 Sample enriched data:\n');
  
  const { data: sample } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT name, arr, arr_growth_rate, customer_count, 
             customer_growth_monthly, nrr, ltv_cac_ratio,
             time_to_first_revenue_months, months_to_1m_arr
      FROM startup_uploads 
      WHERE arr IS NOT NULL
      ORDER BY arr_growth_rate DESC NULLS LAST
      LIMIT 10
    `
  });
  
  if (sample) {
    Object.values(sample).forEach(s => {
      console.log(`   ${s.name}`);
      console.log(`      ARR: $${(s.arr/1000).toFixed(0)}K | Growth: ${s.arr_growth_rate}%`);
      console.log(`      Customers: ${s.customer_count} | MoM Growth: ${s.customer_growth_monthly}%`);
      console.log(`      NRR: ${s.nrr}% | LTV/CAC: ${s.ltv_cac_ratio}x`);
      console.log('');
    });
  }
  
  // Distribution
  console.log('\n📊 ARR Growth Distribution:\n');
  
  const { data: dist } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT 
        CASE 
          WHEN arr_growth_rate >= 200 THEN '🚀 200%+ (Rocket)'
          WHEN arr_growth_rate >= 100 THEN '📈 100-200% (Fast)'
          WHEN arr_growth_rate >= 50 THEN '📊 50-100% (Solid)'
          ELSE '📉 <50% (Slow)'
        END as growth_tier,
        COUNT(*) as count
      FROM startup_uploads 
      WHERE arr_growth_rate IS NOT NULL
      GROUP BY 1
      ORDER BY 2 DESC
    `
  });
  
  if (dist) {
    Object.values(dist).forEach(d => {
      console.log(`   ${d.growth_tier}: ${d.count} startups`);
    });
  }
}

// Run
enrichSalesVelocity().catch(console.error);
