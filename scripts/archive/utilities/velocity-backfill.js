#!/usr/bin/env node
/**
 * VELOCITY BACKFILL
 * =================
 * Estimates velocity fields from available data:
 * - deployment_frequency from features_shipped_last_month
 * - growth signals from arr_growth_rate, customer_growth_monthly
 * - Sets reasonable defaults based on stage/traction
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function backfillVelocity() {
  console.log('🚀 Velocity Backfill\n');
  
  // Get startups missing velocity data
  const { data: startups } = await supabase.from('startup_uploads')
    .select('id, name, stage, is_launched, has_customers, has_revenue, features_shipped_last_month, deployment_frequency, arr_growth_rate, growth_rate_monthly, days_from_idea_to_mvp, time_to_first_revenue_months, created_at')
    .eq('status', 'approved');
  
  console.log('Found ' + startups.length + ' startups\n');
  
  let updated = 0;
  
  for (const s of startups) {
    const updates = {};
    
    // 1. Estimate deployment_frequency from features shipped
    if (!s.deployment_frequency || s.deployment_frequency === 'rarely') {
      const features = s.features_shipped_last_month || 0;
      if (features >= 20) updates.deployment_frequency = 'daily';
      else if (features >= 8) updates.deployment_frequency = 'weekly';
      else if (features >= 2) updates.deployment_frequency = 'monthly';
      else if (s.is_launched) updates.deployment_frequency = 'monthly';
    }
    
    // 2. Estimate growth rate if has customers/revenue but no rate
    if (!s.growth_rate_monthly && !s.arr_growth_rate) {
      if (s.has_revenue) updates.growth_rate_monthly = 15; // Conservative estimate
      else if (s.has_customers) updates.growth_rate_monthly = 10;
    }
    
    // 3. Estimate time_to_first_revenue from stage
    if (!s.time_to_first_revenue_months && s.has_revenue) {
      // Estimate based on stage
      if (s.stage === 0) updates.time_to_first_revenue_months = 6;  // pre-seed with revenue = fast
      else if (s.stage === 1) updates.time_to_first_revenue_months = 9;
      else if (s.stage === 2) updates.time_to_first_revenue_months = 12;
      else updates.time_to_first_revenue_months = 18;
    }
    
    // 4. Estimate days_from_idea_to_mvp from created_at and is_launched
    if (!s.days_from_idea_to_mvp && s.is_launched) {
      // If launched and stage is low, assume fast MVP
      if (s.stage === 0 || s.stage === 1) updates.days_from_idea_to_mvp = 60;
      else updates.days_from_idea_to_mvp = 120;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('startup_uploads')
        .update(updates)
        .eq('id', s.id);
      
      if (!error) {
        updated++;
        if (updated <= 10) {
          console.log('  ' + s.name + ': ' + JSON.stringify(updates));
        }
      }
    }
  }
  
  console.log('\n✅ Updated ' + updated + ' startups with velocity estimates');
}

backfillVelocity().catch(console.error);
