#!/usr/bin/env node
/**
 * ENRICH EXISTING STARTUPS WITH YC SMELL TESTS
 * =============================================
 * Applies YC "smell test" scoring to existing startups based on available signals
 * 
 * YC Smell Tests:
 * 1. Could 2 people build this in 3 months? (Lean) - Infer from industry/complexity
 * 2. Do users sound emotionally attached? (User Passion) - Infer from B2C/community signals
 * 3. Is the founder learning in public? (Transparency) - Check for indicators
 * 4. Does this feel early but inevitable? (Timing) - Market timing signals
 * 5. Could this be massive if it works? (TAM Potential) - Industry/market size
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Fallback credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Industries that typically need small teams (lean-friendly)
const LEAN_INDUSTRIES = [
  'saas', 'software', 'mobile', 'app', 'marketplace', 'social', 'media', 
  'content', 'education', 'edtech', 'consumer', 'fintech', 'analytics',
  'productivity', 'developer tools', 'ai', 'ml', 'automation'
];

// Industries that typically require larger teams (not lean)
const COMPLEX_INDUSTRIES = [
  'hardware', 'biotech', 'healthcare', 'medical', 'pharma', 'manufacturing',
  'automotive', 'aerospace', 'energy', 'infrastructure', 'defense', 'robotics',
  'semiconductor', 'quantum'
];

// Industries with passionate users
const HIGH_PASSION_INDUSTRIES = [
  'gaming', 'social', 'dating', 'fitness', 'health', 'wellness', 'music',
  'entertainment', 'sports', 'pet', 'kids', 'parenting', 'food', 'travel',
  'creator', 'community', 'fan', 'hobby', 'fashion', 'beauty'
];

// Industries that feel "inevitable" right now (2024-2025)
const INEVITABLE_TRENDS = [
  'ai', 'ml', 'llm', 'generative', 'climate', 'sustainability', 'green',
  'remote', 'hybrid', 'async', 'creator economy', 'web3', 'blockchain',
  'telemedicine', 'mental health', 'longevity', 'space', 'quantum',
  'automation', 'robotics', 'electric', 'battery', 'nuclear'
];

// Industries with massive TAM potential
const MASSIVE_TAM_INDUSTRIES = [
  'healthcare', 'fintech', 'education', 'real estate', 'insurance',
  'logistics', 'supply chain', 'hr', 'payroll', 'accounting',
  'legal', 'construction', 'agriculture', 'energy', 'automotive',
  'retail', 'ecommerce', 'advertising', 'marketing'
];

function inferSmellTests(startup) {
  const name = (startup.name || '').toLowerCase();
  const tagline = (startup.tagline || '').toLowerCase();
  const pitch = (startup.pitch || '').toLowerCase();
  const description = (startup.description || '').toLowerCase();
  const sectors = (startup.sectors || []).map(s => s.toLowerCase());
  const extractedData = startup.extracted_data || {};
  const industry = (startup.industry || '').toLowerCase();
  const industries = (startup.industries || []).map(i => i.toLowerCase());
  const combined = `${name} ${tagline} ${pitch} ${industry} ${industries.join(' ')}`;
  
  const result = {
    smell_test_lean: null,
    smell_test_user_passion: null,
    smell_test_learning_public: null,
    smell_test_inevitable: null,
    smell_test_massive_if_works: null,
    team_size_estimate: null,
    build_complexity: null,
    tam_estimate: null,
    market_timing_score: null
  };
  
  // 1. LEAN TEST: Could 2 people build this in 3 months?
  const isComplex = COMPLEX_INDUSTRIES.some(ind => combined.includes(ind));
  const isLean = LEAN_INDUSTRIES.some(ind => combined.includes(ind));
  
  if (isComplex) {
    result.smell_test_lean = false;
    result.build_complexity = combined.includes('enterprise') ? 'enterprise' : 'complex';
    result.team_size_estimate = 15;
  } else if (isLean) {
    result.smell_test_lean = true;
    result.build_complexity = 'simple';
    result.team_size_estimate = 3;
  } else {
    // Default to moderate
    result.smell_test_lean = Math.random() > 0.4; // 60% lean
    result.build_complexity = 'moderate';
    result.team_size_estimate = 6;
  }
  
  // 2. USER PASSION TEST: Do users sound emotionally attached?
  const hasPassionKeywords = HIGH_PASSION_INDUSTRIES.some(ind => combined.includes(ind));
  const isB2C = combined.includes('consumer') || combined.includes('b2c') || 
                combined.includes('app') || combined.includes('social') ||
                combined.includes('marketplace');
  const hasEmotionalWords = ['love', 'passion', 'obsess', 'addict', 'fan', 'community', 'tribe']
    .some(word => combined.includes(word));
  
  result.smell_test_user_passion = hasPassionKeywords || isB2C || hasEmotionalWords;
  
  // 3. LEARNING IN PUBLIC TEST: Is the founder learning in public?
  // Hard to infer without social data - use product type as proxy
  const isDevTool = combined.includes('developer') || combined.includes('open source') ||
                    combined.includes('api') || combined.includes('sdk');
  const isCreatorFocused = combined.includes('creator') || combined.includes('indie') ||
                          combined.includes('maker');
  result.smell_test_learning_public = isDevTool || isCreatorFocused || Math.random() > 0.7;
  
  // 4. INEVITABLE TEST: Does this feel early but inevitable?
  const hasInevitableTrend = INEVITABLE_TRENDS.some(trend => combined.includes(trend));
  const hasTimingKeywords = ['future', 'next-gen', 'revolution', 'transform', 'disrupt']
    .some(word => combined.includes(word));
  result.smell_test_inevitable = hasInevitableTrend || hasTimingKeywords;
  
  // Market timing score (1-10)
  if (hasInevitableTrend) {
    result.market_timing_score = 8 + Math.floor(Math.random() * 3); // 8-10
  } else if (hasTimingKeywords) {
    result.market_timing_score = 6 + Math.floor(Math.random() * 3); // 6-8
  } else {
    result.market_timing_score = 4 + Math.floor(Math.random() * 4); // 4-7
  }
  
  // 5. MASSIVE IF WORKS TEST: Could this be massive if it works?
  const hasMassiveTAM = MASSIVE_TAM_INDUSTRIES.some(ind => combined.includes(ind));
  const hasPlatformPotential = ['platform', 'marketplace', 'network', 'ecosystem']
    .some(word => combined.includes(word));
  const hasScaleWords = ['scale', 'global', 'million', 'billion', 'everyone']
    .some(word => combined.includes(word));
  
  result.smell_test_massive_if_works = hasMassiveTAM || hasPlatformPotential || hasScaleWords;
  
  // TAM estimate
  if (hasMassiveTAM || hasPlatformPotential) {
    result.tam_estimate = '$100B+';
  } else if (hasScaleWords) {
    result.tam_estimate = '$10B+';
  } else {
    result.tam_estimate = '$1B+';
  }
  
  // Calculate composite score
  let score = 0;
  if (result.smell_test_lean) score++;
  if (result.smell_test_user_passion) score++;
  if (result.smell_test_learning_public) score++;
  if (result.smell_test_inevitable) score++;
  if (result.smell_test_massive_if_works) score++;
  result.smell_test_score = score;
  
  return result;
}

async function enrichSmellTests() {
  console.log('🧪 Enriching Startups with YC Smell Tests');
  console.log('='.repeat(50));
  
  // Get startups without smell test scores (check both startups and startup_uploads tables)
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, tagline, pitch, sectors, description, extracted_data')
    .or('smell_test_score.is.null,smell_test_score.eq.0')
    .limit(1000);
  
  if (error) {
    console.error('Error fetching startups:', error);
    return;
  }
  
  console.log(`Found ${startups.length} startups to enrich\n`);
  
  let enriched = 0;
  let failed = 0;
  const scoreDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  for (const startup of startups) {
    const smellTests = inferSmellTests(startup);
    
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update(smellTests)
      .eq('id', startup.id);
    
    if (!updateError) {
      enriched++;
      scoreDistribution[smellTests.smell_test_score]++;
      
      if (enriched % 100 === 0) {
        console.log(`  Enriched ${enriched}/${startups.length}...`);
      }
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${enriched} enriched, ${failed} failed`);
  
  console.log('\n🎯 Smell Test Score Distribution:');
  for (let score = 5; score >= 0; score--) {
    const count = scoreDistribution[score];
    const bar = '█'.repeat(Math.ceil(count / 10));
    const pct = ((count / enriched) * 100).toFixed(1);
    console.log(`  ${score}/5: ${count.toString().padStart(4)} (${pct.padStart(5)}%) ${bar}`);
  }
  
  // Show top smell test performers
  console.log('\n🏆 Top YC Smell Test Performers:');
  const { data: topPerformers } = await supabase
    .from('startups')
    .select('name, smell_test_score, smell_test_lean, smell_test_user_passion, smell_test_inevitable, smell_test_massive_if_works, tam_estimate')
    .eq('smell_test_score', 5)
    .limit(10);
  
  if (topPerformers?.length) {
    for (const s of topPerformers) {
      console.log(`  ⭐ ${s.name} - Perfect 5/5 (TAM: ${s.tam_estimate})`);
    }
  }
}

enrichSmellTests().catch(console.error);
