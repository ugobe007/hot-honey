#!/usr/bin/env node
/**
 * Cleanup Garbage Startups
 * 
 * Deletes garbage names from discovered_startups and startup_uploads
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Comprehensive list of garbage names
const GARBAGE_NAMES = [
  // Generic single words
  'Building', 'Modern', 'Inside', 'Outside', 'Show', 'Clicks', 'Click', 
  'Wellbeing', 'Healthcare', 'Fintech', 'Tech', 'AI', 'ML', 'SaaS', 
  'Data', 'Digital', 'Benefits', 'Tips', 'MVPs', 'MVP', 'Resource', 
  'Constraints', 'Leadership', 'Transit', 'Equity', 'Fusion', 'Dropout', 
  'Moved', 'Out', 'In', 'On', 'At', 'For', 'With', 'About', 'From', 'To',
  
  // Possessive forms
  "Healthcare's", "Nvidia's", "Obsidian's", "Equity's", "Sweden's", "Finland's",
  
  // Phrases
  "MVPs out", "Resource Constraints,", "Leadership Tips,", "I've Moved", 
  "Transit Tech", "Nvidia's AI", "Equity's 2026", "Show HN:", "build Givefront", 
  "'College dropout'", "Every fusion",
  
  // Numbers
  "100+", "100+ Digital",
  
  // Other garbage
  "Clicks", "Show", "Wellbeing", "Healthcare's", "100+"
];

async function cleanup() {
  console.log('🧹 Cleaning up garbage startup names...\n');
  
  // Clean discovered_startups
  console.log('📋 Cleaning discovered_startups...');
  const { count: discoveredBefore } = await supabase
    .from('discovered_startups')
    .select('id', { count: 'exact', head: true });
  
  const { error: discoveredError } = await supabase
    .from('discovered_startups')
    .delete()
    .in('name', GARBAGE_NAMES);
  
  if (discoveredError) {
    console.error('❌ Error cleaning discovered_startups:', discoveredError.message);
  } else {
    const { count: discoveredAfter } = await supabase
      .from('discovered_startups')
      .select('id', { count: 'exact', head: true });
    
    console.log(`   ✅ Deleted ${(discoveredBefore || 0) - (discoveredAfter || 0)} garbage entries`);
    console.log(`   📊 Remaining: ${discoveredAfter || 0}`);
  }
  
  // Clean startup_uploads (be more careful here - only delete obvious garbage)
  console.log('\n📋 Cleaning startup_uploads...');
  const obviousGarbage = GARBAGE_NAMES.filter(name => 
    name.length < 10 || 
    /^(Building|Modern|Inside|Show|Clicks|Wellbeing|Healthcare|Fintech|100\+)$/i.test(name)
  );
  
  const { count: uploadedBefore } = await supabase
    .from('startup_uploads')
    .select('id', { count: 'exact', head: true })
    .in('name', obviousGarbage);
  
  if ((uploadedBefore || 0) > 0) {
    const { error: uploadedError } = await supabase
      .from('startup_uploads')
      .delete()
      .in('name', obviousGarbage);
    
    if (uploadedError) {
      console.error('❌ Error cleaning startup_uploads:', uploadedError.message);
    } else {
      console.log(`   ✅ Deleted ${uploadedBefore || 0} obvious garbage entries`);
      console.log('   ⚠️  (Only deleted obvious single-word garbage from startup_uploads)');
    }
  } else {
    console.log('   ✅ No obvious garbage found in startup_uploads');
  }
  
  console.log('\n✅ Cleanup complete!');
}

cleanup().catch(console.error);


