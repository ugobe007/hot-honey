#!/usr/bin/env node
/**
 * Cleanup ML Recommendations with Identical Current/Proposed Values
 * Rejects recommendations where current_value === proposed_value (no actual changes)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Deep equality check for objects
 */
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

async function cleanupIdenticalRecommendations() {
  console.log('\n🧹 Cleaning up ML recommendations with identical current/proposed values...\n');
  
  // Fetch all pending recommendations
  const { data: recommendations, error } = await supabase
    .from('ml_recommendations')
    .select('id, title, status, current_value, proposed_value, recommendation_type')
    .eq('status', 'pending')
    .eq('recommendation_type', 'weight_change');
  
  if (error) {
    console.error('❌ Error fetching recommendations:', error.message);
    return;
  }
  
  if (!recommendations || recommendations.length === 0) {
    console.log('✅ No pending weight_change recommendations found.\n');
    return;
  }
  
  console.log(`📊 Found ${recommendations.length} pending weight_change recommendations\n`);
  
  const identicalRecommendations = [];
  
  // Check each recommendation
  for (const rec of recommendations) {
    if (rec.current_value && rec.proposed_value) {
      // Check if current and proposed values are identical
      if (deepEqual(rec.current_value, rec.proposed_value)) {
        identicalRecommendations.push(rec);
        console.log(`   ⚠️  Found identical values: ${rec.title} (ID: ${rec.id.substring(0, 8)}...)`);
        console.log(`      Current: ${JSON.stringify(rec.current_value)}`);
        console.log(`      Proposed: ${JSON.stringify(rec.proposed_value)}`);
      }
    }
  }
  
  if (identicalRecommendations.length === 0) {
    console.log('\n✅ No recommendations with identical values found. All recommendations have actual changes.\n');
    return;
  }
  
  console.log(`\n🔍 Found ${identicalRecommendations.length} recommendations with identical current/proposed values\n`);
  console.log('📋 Summary:');
  identicalRecommendations.forEach((rec, idx) => {
    console.log(`   ${idx + 1}. ${rec.title} (ID: ${rec.id.substring(0, 8)}...)`);
  });
  
  console.log('\n🔄 Rejecting these recommendations (they have no actual changes)...\n');
  
  // Reject all identical recommendations
  const idsToReject = identicalRecommendations.map(r => r.id);
  
  // Update each recommendation individually to preserve description
  let rejectedCount = 0;
  for (const rec of identicalRecommendations) {
    const { error: updateError } = await supabase
      .from('ml_recommendations')
      .update({ 
        status: 'rejected',
        description: `${rec.description || 'REJECTED'}\n\n[Auto-rejected: Recommendation had identical current and proposed values - no actual changes]`
      })
      .eq('id', rec.id);
    
    if (updateError) {
      console.error(`   ❌ Error rejecting ${rec.id.substring(0, 8)}...: ${updateError.message}`);
    } else {
      rejectedCount++;
    }
  }
  
  console.log(`✅ Successfully rejected ${rejectedCount}/${idsToReject.length} recommendations with identical values\n`);
  console.log('💡 Note: These recommendations were rejected because they proposed no actual changes to the algorithm weights.\n');
}

cleanupIdenticalRecommendations().catch(console.error);
