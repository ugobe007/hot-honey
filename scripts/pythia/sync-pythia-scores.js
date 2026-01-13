#!/usr/bin/env node
/**
 * Sync Pythia Scores to startup_uploads
 * Copies the latest pythia_score from pythia_scores table to startup_uploads.pythia_score
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

async function syncPythiaScores() {
  console.log('\n🔄 SYNCING PYTHIA SCORES TO STARTUP_UPLOADS\n');
  
  // Get all startups that have pythia scores
  const { data: pythiaScores, error } = await supabase
    .from('pythia_scores')
    .select('entity_id, pythia_score, computed_at')
    .eq('entity_type', 'startup')
    .order('computed_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching Pythia scores:', error.message);
    return;
  }
  
  if (!pythiaScores || pythiaScores.length === 0) {
    console.log('⚠️  No Pythia scores found. Run: npm run pythia:score');
    return;
  }
  
  // Get latest score per entity
  const latestScores = new Map();
  for (const score of pythiaScores) {
    if (!latestScores.has(score.entity_id)) {
      latestScores.set(score.entity_id, score.pythia_score);
    }
  }
  
  console.log(`📊 Found ${latestScores.size} startups with Pythia scores\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const [entityId, pythiaScore] of latestScores.entries()) {
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({ pythia_score: pythiaScore })
      .eq('id', entityId);
    
    if (updateError) {
      console.error(`❌ Error updating startup ${entityId}:`, updateError.message);
      failed++;
    } else {
      updated++;
    }
    
    // Small delay
    if (updated % 50 === 0) {
      console.log(`   ${updated} updated...`);
    }
    
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log(`\n✅ Done: ${updated} updated, ${failed} failed\n`);
}

syncPythiaScores().catch(console.error);
