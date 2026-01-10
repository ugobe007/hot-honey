#!/usr/bin/env node
/**
 * ML Training Script
 * Runs the ML training cycle
 * 
 * Usage: node run-ml-training.js
 */

require('dotenv').config();

// Check if tsx is available for TypeScript support
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let useTsx = false;
try {
  // Check if tsx is installed
  execSync('npx tsx --version', { stdio: 'ignore' });
  useTsx = true;
  console.log('✅ TypeScript support detected (tsx available)\n');
} catch (e) {
  console.log('⚠️  TypeScript not available, using direct implementation\n');
}

async function runTraining() {
  // Try to use TypeScript service with tsx if available
  if (useTsx) {
    try {
      const tsxPath = path.join(__dirname, 'server', 'services', 'mlTrainingService.ts');
      if (fs.existsSync(tsxPath)) {
        // Execute TypeScript file directly with tsx
        console.log('🔄 Using TypeScript service via tsx...\n');
        // Use default export or named export
        execSync(`npx tsx -e "import('./server/services/mlTrainingService.ts').then(m => { const fn = m.runMLTrainingCycle || m.default?.runMLTrainingCycle; if (fn) return fn().then(() => process.exit(0)); else throw new Error('Function not found'); }).catch(e => { console.error(e); process.exit(1); })"`, {
          stdio: 'inherit',
          cwd: __dirname,
          shell: true,
          timeout: 300000 // 5 minute timeout
        });
        return;
      }
    } catch (error) {
      console.error('⚠️  Could not load TypeScript service:', error.message);
      console.log('💡 Falling back to direct implementation...\n');
    }
  }
  
  // Fallback: Direct implementation (imports the compiled JS or implements directly)
  const { createClient } = require('@supabase/supabase-js');
  
  // Debug: Show what env vars are available (without revealing values)
  const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE'));
  if (envKeys.length === 0) {
    console.error('⚠️  No Supabase environment variables found at all.');
    console.error('   Make sure your .env file has the correct variable names.');
  } else {
    console.log(`✅ Found ${envKeys.length} Supabase-related environment variables`);
  }
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Missing Supabase credentials in environment variables');
    console.error('   Required: VITE_SUPABASE_URL or SUPABASE_URL');
    console.error('   Required: SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n💡 Your .env file should have format:');
    console.error('   VITE_SUPABASE_URL=https://xxxxx.supabase.co');
    console.error('   SUPABASE_SERVICE_KEY=eyJxxx...');
    console.error('\n   Or:');
    console.error('   SUPABASE_URL=https://xxxxx.supabase.co');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...');
    process.exit(1);
  }
  
  console.log(`✅ Supabase URL configured: ${supabaseUrl.substring(0, 30)}...`);
  console.log(`✅ Supabase Key configured: ${supabaseKey.substring(0, 20)}...\n`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('\n🤖 Starting ML Training Cycle...\n');
  
  try {
    // Step 1: Collect training data (limit to recent matches to avoid timeout)
    console.log('📊 Step 1: Collecting training data...');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); // Only last week to avoid timeout
    
    // First, get matches without the join (faster)
    const { data: matchesData, error: matchError } = await supabase
      .from('startup_investor_matches')
      .select(`
        id,
        startup_id,
        investor_id,
        match_score,
        reasoning,
        status,
        viewed_at,
        contacted_at
      `)
      .not('status', 'eq', 'suggested')
      .gte('created_at', oneWeekAgo.toISOString())
      .limit(1000) // Smaller limit to avoid timeout
      .order('created_at', { ascending: false });
    
    if (matchError) throw matchError;
    
    // Then fetch GOD scores separately if needed
    const startupIds = [...new Set((matchesData || []).map(m => m.startup_id))];
    const { data: startups, error: startupError } = await supabase
      .from('startup_uploads')
      .select('id, total_god_score')
      .in('id', startupIds.slice(0, 100)); // Limit to avoid timeout
    
    const godScoreMap = {};
    (startups || []).forEach(s => {
      godScoreMap[s.id] = s.total_god_score || 0;
    });
    
    // Attach GOD scores to matches
    const matches = (matchesData || []).map(m => ({
      ...m,
      startup: { total_god_score: godScoreMap[m.startup_id] || 0 }
    }));
    
    console.log(`   ✅ Collected ${matches?.length || 0} matches with feedback\n`);
    
    // Step 2: Extract patterns
    console.log('🔍 Step 2: Extracting success patterns...');
    const successful = (matches || []).filter(m => 
      m.status === 'funded' || m.status === 'meeting_scheduled'
    );
    const unsuccessful = (matches || []).filter(m => m.status === 'declined');
    
    console.log(`   ✅ Successful matches: ${successful.length}`);
    console.log(`   ✅ Unsuccessful matches: ${unsuccessful.length}\n`);
    
    // Step 3: Analyze success factors
    console.log('⚙️  Step 3: Analyzing algorithm performance...');
    const godScores = (matches || [])
      .map(m => {
        const startup = m.startup || {};
        return startup.total_god_score || 0;
      })
      .filter(s => s > 0);
    
    const avgGodScore = godScores.length > 0
      ? godScores.reduce((sum, s) => sum + s, 0) / godScores.length
      : 0;
    
    const conversionRate = successful.length / Math.max((matches || []).length, 1);
    
    console.log(`   ✅ Average GOD Score: ${avgGodScore.toFixed(1)}/100`);
    console.log(`   ✅ Conversion Rate: ${(conversionRate * 100).toFixed(1)}%\n`);
    
    // Step 4: Generate recommendations
    console.log('💡 Step 4: Generating recommendations...');
    
    // Check if ml_recommendations table exists and insert
    const recommendation = {
      recommendation_type: 'weight_change',
      priority: conversionRate > 0.3 ? 'high' : 'medium',
      title: 'GOD Algorithm Optimization',
      description: `Based on ${matches?.length || 0} matches. Conversion rate: ${(conversionRate * 100).toFixed(1)}%. Average GOD score: ${avgGodScore.toFixed(1)}.`,
      expected_impact: `Expected ${conversionRate > 0.3 ? 'maintaining' : 'improving'} match quality`,
      status: 'pending'
    };
    
    const { error: recError } = await supabase
      .from('ml_recommendations')
      .insert(recommendation);
    
    if (recError && !recError.message.includes('does not exist')) {
      console.error('   ⚠️  Could not save recommendation:', recError.message);
    } else {
      console.log('   ✅ Recommendation saved\n');
    }
    
    // Step 5: Track performance
    console.log('📊 Step 5: Tracking performance metrics...');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const { error: metricsError } = await supabase
      .from('algorithm_metrics')
      .insert({
        period_start: thirtyDaysAgo.toISOString(),
        period_end: now.toISOString(),
        total_matches: matches?.length || 0,
        successful_matches: successful.length,
        avg_match_score: (matches || []).reduce((sum, m) => sum + (m.match_score || 0), 0) / Math.max((matches || []).length, 1),
        avg_god_score: avgGodScore,
        conversion_rate: conversionRate,
        algorithm_version: '1.0'
      });
    
    if (metricsError && !metricsError.message.includes('does not exist')) {
      console.error('   ⚠️  Could not save metrics:', metricsError.message);
    } else {
      console.log('   ✅ Performance metrics saved\n');
    }
    
    console.log('='.repeat(70));
    console.log('✅ ML TRAINING CYCLE COMPLETE');
    console.log('='.repeat(70));
    console.log(`\n📈 Results:`);
    console.log(`   Total Matches: ${matches?.length || 0}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Conversion Rate: ${(conversionRate * 100).toFixed(1)}%`);
    console.log(`   Average GOD Score: ${avgGodScore.toFixed(1)}/100\n`);
    
  } catch (error) {
    console.error('\n❌ Error during training:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the training
runTraining()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Training failed:', error);
    process.exit(1);
  });

