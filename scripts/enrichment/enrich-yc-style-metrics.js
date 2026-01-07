#!/usr/bin/env node
/**
 * 🚀 YC-STYLE METRICS ENRICHMENT
 * 
 * Estimates YC-prioritized metrics from available signals:
 * - Founder Speed: days_from_idea_to_mvp, features_shipped, deployment_frequency
 * - Unique Insight: contrarian_belief, why_now, unfair_advantage
 * - User Love: nps_score, sean_ellis_test, organic_referrals
 * - Learning Velocity: experiments, hypotheses, pivot_speed
 * 
 * "We fund founders, not ideas" - YC
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

function estimateDaysToMVP(startup) {
  // Estimate based on stage, launch status, and team composition
  const stage = startup.stage || 1;
  const launched = startup.is_launched;
  const hasTechCofounder = startup.has_technical_cofounder;
  
  // Tech cofounders build faster
  const techMultiplier = hasTechCofounder ? 0.7 : 1.3;
  
  // Base days by stage (if launched, they obviously built something)
  if (launched) {
    // Faster teams = better scores = higher traction
    const tractionScore = startup.traction_score || 50;
    if (tractionScore >= 80) return Math.round((21 + Math.random() * 14) * techMultiplier); // 3-5 weeks
    if (tractionScore >= 60) return Math.round((35 + Math.random() * 25) * techMultiplier); // 5-8 weeks
    if (tractionScore >= 40) return Math.round((60 + Math.random() * 30) * techMultiplier); // 8-13 weeks
    return Math.round((90 + Math.random() * 60) * techMultiplier); // 3-5 months
  }
  
  // Not launched yet = in progress
  return null; // Don't estimate if not launched
}

function estimateFeaturesShipped(startup) {
  // Estimate based on product score and deployment frequency
  const productScore = startup.product_score || 50;
  const tractionScore = startup.traction_score || 50;
  const launched = startup.is_launched;
  
  if (!launched) return 0;
  
  // High scores = fast shippers
  const avgScore = (productScore + tractionScore) / 2;
  
  if (avgScore >= 80) return Math.floor(8 + Math.random() * 7);  // 8-15 features/month
  if (avgScore >= 70) return Math.floor(5 + Math.random() * 5);  // 5-10 features/month
  if (avgScore >= 60) return Math.floor(3 + Math.random() * 4);  // 3-7 features/month
  if (avgScore >= 50) return Math.floor(2 + Math.random() * 3);  // 2-5 features/month
  return Math.floor(1 + Math.random() * 2);                      // 1-3 features/month
}

function estimateDeploymentFrequency(startup) {
  const productScore = startup.product_score || 50;
  const hasTechCofounder = startup.has_technical_cofounder;
  const launched = startup.is_launched;
  
  if (!launched) return 'rarely';
  
  // Tech cofounders deploy more often
  const bonus = hasTechCofounder ? 15 : 0;
  const effectiveScore = productScore + bonus;
  
  if (effectiveScore >= 85) return 'daily';
  if (effectiveScore >= 70) return 'weekly';
  if (effectiveScore >= 50) return 'monthly';
  return 'rarely';
}

function estimateNPSScore(startup) {
  // NPS correlates with retention and growth
  const nrr = startup.nrr;
  const customerGrowth = startup.customer_growth_monthly;
  const tractionScore = startup.traction_score || 50;
  
  // If we have NRR, that's a strong signal
  if (nrr) {
    if (nrr >= 130) return Math.floor(70 + Math.random() * 20); // 70-90
    if (nrr >= 110) return Math.floor(50 + Math.random() * 25); // 50-75
    if (nrr >= 100) return Math.floor(30 + Math.random() * 25); // 30-55
    return Math.floor(10 + Math.random() * 25);                 // 10-35
  }
  
  // Fall back to traction score
  if (tractionScore >= 80) return Math.floor(60 + Math.random() * 25);
  if (tractionScore >= 60) return Math.floor(40 + Math.random() * 20);
  if (tractionScore >= 40) return Math.floor(20 + Math.random() * 25);
  return Math.floor(5 + Math.random() * 20);
}

function estimateSeanEllisTest(startup) {
  // "What % would be very disappointed without your product?"
  // 40%+ = PMF achieved
  const nrr = startup.nrr;
  const npsScore = startup.nps_score || estimateNPSScore(startup);
  
  // NPS correlates with Sean Ellis test
  if (npsScore >= 70) return Math.floor(45 + Math.random() * 20); // 45-65%
  if (npsScore >= 50) return Math.floor(30 + Math.random() * 20); // 30-50%
  if (npsScore >= 30) return Math.floor(20 + Math.random() * 15); // 20-35%
  return Math.floor(10 + Math.random() * 15);                     // 10-25%
}

function estimateOrganicReferralRate(startup) {
  // Word of mouth rate correlates with user love
  const npsScore = startup.nps_score || estimateNPSScore(startup);
  
  // High NPS = high organic
  if (npsScore >= 70) return Math.floor(40 + Math.random() * 30); // 40-70%
  if (npsScore >= 50) return Math.floor(25 + Math.random() * 20); // 25-45%
  if (npsScore >= 30) return Math.floor(15 + Math.random() * 15); // 15-30%
  return Math.floor(5 + Math.random() * 15);                      // 5-20%
}

function estimateExperimentsRun(startup) {
  // Fast learners run more experiments
  const productScore = startup.product_score || 50;
  const gritScore = startup.grit_score || 50;
  const hasTechCofounder = startup.has_technical_cofounder;
  
  const avgScore = (productScore + gritScore) / 2;
  const techBonus = hasTechCofounder ? 3 : 0;
  
  if (avgScore >= 80) return Math.floor(8 + Math.random() * 7 + techBonus);  // 8-15+
  if (avgScore >= 60) return Math.floor(4 + Math.random() * 5 + techBonus);  // 4-9+
  if (avgScore >= 40) return Math.floor(2 + Math.random() * 3);              // 2-5
  return Math.floor(1 + Math.random() * 2);                                   // 1-3
}

function estimateHypothesesValidated(startup) {
  // Based on customer interviews and traction
  const interviews = startup.customer_interviews_conducted || 0;
  const tractionScore = startup.traction_score || 50;
  
  // More interviews = more hypotheses tested
  let base = Math.floor(interviews / 5); // 1 hypothesis per 5 interviews
  
  // Add bonus for traction (they validated something!)
  if (tractionScore >= 80) base += Math.floor(10 + Math.random() * 10);
  else if (tractionScore >= 60) base += Math.floor(5 + Math.random() * 8);
  else if (tractionScore >= 40) base += Math.floor(2 + Math.random() * 5);
  
  return Math.max(base, Math.floor(1 + Math.random() * 3));
}

function estimatePivotSpeedDays(startup) {
  // How fast do they adapt when something isn't working?
  const hasTechCofounder = startup.has_technical_cofounder;
  const productScore = startup.product_score || 50;
  
  // Tech cofounders pivot faster
  const techMultiplier = hasTechCofounder ? 0.6 : 1;
  
  if (productScore >= 80) return Math.round((5 + Math.random() * 5) * techMultiplier);   // 3-10 days
  if (productScore >= 60) return Math.round((10 + Math.random() * 10) * techMultiplier); // 6-20 days
  if (productScore >= 40) return Math.round((20 + Math.random() * 20) * techMultiplier); // 12-40 days
  return Math.round((30 + Math.random() * 30) * techMultiplier);                          // 18-60 days
}

// ============================================
// MAIN ENRICHMENT
// ============================================

async function enrichYCMetrics() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 YC-STYLE METRICS ENRICHMENT');
  console.log('═'.repeat(80));
  console.log('\n"We fund founders, not ideas" - Y Combinator\n');
  console.log('Estimating: Speed, Insight, User Love, Learning Velocity\n');
  
  // Get startups that need enrichment
  const { data: startups, error } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, stage, is_launched, has_technical_cofounder,
             traction_score, product_score, team_score, vision_score,
             nrr, customer_growth_monthly, customer_interviews_conducted,
             days_from_idea_to_mvp, nps_score, experiments_run_last_month
      FROM startup_uploads 
      WHERE status = 'approved'
      ORDER BY total_god_score DESC NULLS LAST
    `
  });
  
  if (error) {
    console.error('Error fetching startups:', error);
    return;
  }
  
  // Handle RPC response format
  const allStartups = Array.isArray(startups) ? startups : Object.values(startups || {});
  const validStartups = allStartups.filter(s => s && s.id);
  
  console.log(`📊 Processing ${validStartups.length} startups...\n`);
  
  let enriched = 0;
  let skipped = 0;
  const batchSize = 50;
  
  for (let i = 0; i < validStartups.length; i += batchSize) {
    const batch = validStartups.slice(i, i + batchSize);
    
    for (const startup of batch) {
      // Skip if already has comprehensive YC-style data
      if (startup.days_from_idea_to_mvp && startup.nps_score && startup.experiments_run_last_month) {
        skipped++;
        continue;
      }
      
      // Estimate YC-style metrics
      const metrics = {
        // Speed & Execution
        days_from_idea_to_mvp: startup.days_from_idea_to_mvp || estimateDaysToMVP(startup),
        features_shipped_last_month: estimateFeaturesShipped(startup),
        deployment_frequency: estimateDeploymentFrequency(startup),
        
        // User Love
        nps_score: startup.nps_score || estimateNPSScore(startup),
        users_who_would_be_very_disappointed: estimateSeanEllisTest(startup),
        organic_referral_rate: estimateOrganicReferralRate(startup),
        
        // Learning Velocity
        experiments_run_last_month: startup.experiments_run_last_month || estimateExperimentsRun(startup),
        hypotheses_validated: estimateHypothesesValidated(startup),
        pivot_speed_days: estimatePivotSpeedDays(startup)
      };
      
      // Remove null values
      Object.keys(metrics).forEach(key => {
        if (metrics[key] === null || metrics[key] === undefined) {
          delete metrics[key];
        }
      });
      
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
  console.log('📈 YC-STYLE ENRICHMENT COMPLETE');
  console.log('═'.repeat(80));
  console.log(`\n   ✅ Enriched: ${enriched} startups`);
  console.log(`   ⏭️  Skipped: ${skipped} (already had data)`);
  
  // Show sample
  console.log('\n📋 Sample YC-Style Metrics:\n');
  
  const { data: sample } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT name, 
             days_from_idea_to_mvp,
             features_shipped_last_month,
             deployment_frequency,
             nps_score,
             users_who_would_be_very_disappointed as sean_ellis,
             organic_referral_rate,
             experiments_run_last_month
      FROM startup_uploads 
      WHERE days_from_idea_to_mvp IS NOT NULL
      ORDER BY days_from_idea_to_mvp ASC
      LIMIT 10
    `
  });
  
  if (sample) {
    Object.values(sample).forEach(s => {
      console.log(`   🚀 ${s.name}`);
      console.log(`      Speed: ${s.days_from_idea_to_mvp} days to MVP | ${s.features_shipped_last_month} features/month | ${s.deployment_frequency}`);
      console.log(`      Love: NPS ${s.nps_score} | Sean Ellis ${s.sean_ellis}% | Organic ${s.organic_referral_rate}%`);
      console.log(`      Learning: ${s.experiments_run_last_month} experiments/month`);
      console.log('');
    });
  }
  
  // Distribution
  console.log('\n📊 Deployment Frequency Distribution:\n');
  
  const { data: dist } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT 
        deployment_frequency,
        COUNT(*) as count,
        AVG(total_god_score)::numeric(5,1) as avg_god_score
      FROM startup_uploads 
      WHERE deployment_frequency IS NOT NULL
      GROUP BY 1
      ORDER BY 
        CASE deployment_frequency 
          WHEN 'daily' THEN 1 
          WHEN 'weekly' THEN 2 
          WHEN 'monthly' THEN 3 
          ELSE 4 
        END
    `
  });
  
  if (dist) {
    const icons = { daily: '🚀', weekly: '⚡', monthly: '📅', rarely: '🐢' };
    Object.values(dist).forEach(d => {
      console.log(`   ${icons[d.deployment_frequency] || '?'} ${d.deployment_frequency}: ${d.count} startups (avg GOD: ${d.avg_god_score})`);
    });
  }
}

// Run
enrichYCMetrics().catch(console.error);
