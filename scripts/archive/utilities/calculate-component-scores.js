#!/usr/bin/env node
/**
 * CALCULATE AND STORE COMPONENT SCORES
 * 
 * Calculates team_score, traction_score, market_score, product_score, vision_score
 * for all startups using the GOD scoring service, then stores them in the database.
 * This enables Sequoia and A16Z algorithms to use their unique criteria.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Simplified component score calculation (doesn't require TypeScript service)
// This calculates scores directly from startup data

// Fallback credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Calculate component scores directly from startup data
 * This is a simplified version that doesn't require the TypeScript service
 */
function calculateComponentScoresFromData(startup) {
  const extractedData = startup.extracted_data || {};
  
  // TEAM SCORE (0-100)
  let teamScore = 30; // Base
  if (startup.technical_cofounders && startup.technical_cofounders > 0) teamScore += 25;
  if (startup.team_size && startup.team_size >= 3) teamScore += 15;
  if (startup.team_size && startup.team_size >= 10) teamScore += 10;
  if (extractedData.team && Array.isArray(extractedData.team) && extractedData.team.length > 0) {
    const hasFAANG = extractedData.team.some(t => 
      t.previousCompanies?.some(c => ['Google', 'Apple', 'Facebook', 'Amazon', 'Microsoft', 'Netflix'].includes(c))
    );
    if (hasFAANG) teamScore += 20;
  }
  teamScore = Math.min(teamScore, 100);
  
  // TRACTION SCORE (0-100)
  let tractionScore = 20; // Base
  if (startup.mrr && startup.mrr > 0) tractionScore += 20;
  if (startup.mrr && startup.mrr >= 10000) tractionScore += 15;
  if (startup.arr && startup.arr >= 100000) tractionScore += 20;
  if (startup.growth_rate_monthly && startup.growth_rate_monthly >= 10) tractionScore += 15;
  if (startup.customer_count && startup.customer_count >= 100) tractionScore += 10;
  tractionScore = Math.min(tractionScore, 100);
  
  // MARKET SCORE (0-100)
  let marketScore = 30; // Base
  const hotSectors = ['AI', 'ML', 'Fintech', 'Healthcare', 'Climate', 'Enterprise', 'SaaS'];
  if (startup.sectors?.some(s => hotSectors.some(h => String(s).includes(h)))) marketScore += 30;
  if (startup.sectors && startup.sectors.length >= 2) marketScore += 10;
  if (extractedData.market_size && extractedData.market_size > 10) marketScore += 20; // $10B+ TAM
  marketScore = Math.min(marketScore, 100);
  
  // PRODUCT SCORE (0-100)
  let productScore = 30; // Base
  if (startup.has_demo || extractedData.has_demo) productScore += 25;
  if (startup.is_launched || extractedData.is_launched) productScore += 25;
  if (extractedData.unique_ip) productScore += 20;
  productScore = Math.min(productScore, 100);
  
  // VISION SCORE (0-100)
  let visionScore = 30; // Base
  const visionKeywords = ['revolutionary', 'disrupt', 'transform', 'new category', 'contrarian'];
  const combinedText = `${startup.tagline || ''} ${startup.pitch || ''} ${startup.description || ''}`.toLowerCase();
  if (visionKeywords.some(k => combinedText.includes(k))) visionScore += 25;
  if (startup.stage && ['Pre-seed', 'Seed', 'Series A'].includes(startup.stage)) visionScore += 20;
  if (extractedData.contrarian_insight) visionScore += 15;
  visionScore = Math.min(visionScore, 100);
  
  // Calculate total GOD score (weighted average)
  const totalGodScore = Math.round(
    teamScore * 0.20 +
    tractionScore * 0.25 +
    marketScore * 0.20 +
    productScore * 0.20 +
    visionScore * 0.15
  );
  
  return {
    total_god_score: Math.min(totalGodScore, 100),
    team_score: teamScore,
    traction_score: tractionScore,
    market_score: marketScore,
    product_score: productScore,
    vision_score: visionScore
  };
}

async function calculateComponentScores() {
  console.log('📊 Calculating Component Scores for All Startups');
  console.log('='.repeat(60));
  
  // Get all approved startups
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved')
    .limit(1000);
  
  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('⚠️  No approved startups found');
    return;
  }
  
  console.log(`Found ${startups.length} startups to process\n`);
  
  let updated = 0;
  let skipped = 0;
  const batchSize = 50;
  
  for (let i = 0; i < startups.length; i += batchSize) {
    const batch = startups.slice(i, i + batchSize);
    
    for (const startup of batch) {
      try {
        // Calculate component scores directly from data
        const scores = calculateComponentScoresFromData(startup);
        
        // Update database
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update({
            total_god_score: scores.total_god_score,
            team_score: scores.team_score,
            traction_score: scores.traction_score,
            market_score: scores.market_score,
            product_score: scores.product_score,
            vision_score: scores.vision_score,
            updated_at: new Date().toISOString()
          })
          .eq('id', startup.id);
        
        if (updateError) {
          console.error(`❌ Error updating ${startup.name}:`, updateError.message);
          skipped++;
        } else {
          updated++;
          if (updated % 50 === 0) {
            console.log(`  ✅ Updated ${updated}/${startups.length}...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error processing ${startup.name}:`, err.message);
        skipped++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Complete! Updated: ${updated}, Skipped: ${skipped}`);
  console.log(`\nComponent scores are now available for Sequoia and A16Z algorithms`);
}

calculateComponentScores().catch(console.error);

