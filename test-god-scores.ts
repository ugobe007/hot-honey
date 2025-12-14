#!/usr/bin/env node
/**
 * Quick diagnostic script to verify GOD scores are flowing from DB to UI
 * Run with: npx tsx test-god-scores.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGodScores() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING GOD SCORE DATA FLOW');
  console.log('='.repeat(80) + '\n');

  // Test 1: Fetch from database
  console.log('1️⃣ Fetching startups from database...');
  const { data: dbStartups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, status, total_god_score, team_score, traction_score, market_score, product_score, vision_score, extracted_data')
    .eq('status', 'approved')
    .limit(5);

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  if (!dbStartups || dbStartups.length === 0) {
    console.log('⚠️ No approved startups found in database');
    return;
  }

  console.log(`✅ Found ${dbStartups.length} approved startups\n`);

  // Test 2: Check GOD scores
  console.log('2️⃣ GOD Score Analysis:');
  console.log('─'.repeat(80));
  
  dbStartups.forEach((startup, idx) => {
    console.log(`\n${idx + 1}. ${startup.name}`);
    console.log(`   ID: ${startup.id}`);
    console.log(`   Status: ${startup.status}`);
    console.log(`   📊 GOD SCORES:`);
    console.log(`      total_god_score: ${startup.total_god_score} (${typeof startup.total_god_score})`);
    console.log(`      team_score: ${startup.team_score}`);
    console.log(`      traction_score: ${startup.traction_score}`);
    console.log(`      market_score: ${startup.market_score}`);
    console.log(`      product_score: ${startup.product_score}`);
    console.log(`      vision_score: ${startup.vision_score}`);
    
    // Check extracted_data
    if (startup.extracted_data) {
      const extractedData = startup.extracted_data;
      console.log(`   📦 extracted_data:`);
      console.log(`      Keys: ${Object.keys(extractedData).join(', ')}`);
      if (extractedData.fivePoints) {
        console.log(`      fivePoints: ${extractedData.fivePoints.length} items`);
      }
    }
  });

  console.log('\n' + '─'.repeat(80));

  // Test 3: Check score distribution
  const scores = dbStartups.map(s => s.total_god_score).filter(s => s !== null && s !== undefined);
  if (scores.length > 0) {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    console.log('\n3️⃣ Score Statistics:');
    console.log(`   Min: ${min}`);
    console.log(`   Max: ${max}`);
    console.log(`   Average: ${avg.toFixed(1)}`);
    console.log(`   Non-null scores: ${scores.length}/${dbStartups.length}`);
  }

  // Test 4: Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('4️⃣ Diagnosis:');
  console.log('='.repeat(80));
  
  const hasScores = scores.length > 0;
  const hasHighScores = scores.some(s => s > 80);
  const allDefault = scores.every(s => s === 50);
  
  if (!hasScores) {
    console.log('❌ CRITICAL: No GOD scores found in database');
    console.log('   → Run scoring script to populate scores');
  } else if (allDefault) {
    console.log('⚠️ WARNING: All scores are default (50)');
    console.log('   → Scoring algorithm may not be running');
  } else if (hasHighScores) {
    console.log('✅ GOOD: Found high-quality scores (>80)');
    console.log('   → Database has proper GOD scores');
    console.log('   → If UI shows 50%, check store.ts field mapping');
  } else {
    console.log('⚠️ NOTICE: Scores exist but are in low range');
    console.log('   → May need score recalculation or enrichment');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

testGodScores().catch(console.error);
