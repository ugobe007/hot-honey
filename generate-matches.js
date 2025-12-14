#!/usr/bin/env node

/**
 * Generate Startup-Investor Matches
 * 
 * Creates matches between startups and investors based on:
 * - Industry/sector alignment
 * - Funding stage fit
 * - Investment thesis match
 * - Geographic preferences
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Simple matching algorithm
function calculateMatch(startup, investor) {
  let score = 0;
  let reasons = [];
  
  // Stage fit (30 points)
  const startupStage = (startup.investment || '').toLowerCase();
  const investorStages = (investor.investment_stage || '').toLowerCase();
  if (investorStages.includes('seed') && startupStage.includes('seed')) {
    score += 30;
    reasons.push('Stage fit: Both interested in Seed stage');
  } else if (investorStages.includes('series') && startupStage.includes('series')) {
    score += 30;
    reasons.push('Stage fit: Both interested in Series funding');
  } else if (investorStages.includes('early') && (startupStage.includes('seed') || startupStage.includes('pre'))) {
    score += 25;
    reasons.push('Stage fit: Early stage alignment');
  }
  
  // Sector fit (40 points) - basic keyword matching
  const startupSectors = [
    startup.value_proposition,
    startup.problem,
    startup.solution
  ].join(' ').toLowerCase();
  
  const investorSectors = (investor.investment_thesis || '').toLowerCase();
  
  const commonKeywords = ['ai', 'fintech', 'saas', 'healthcare', 'climate', 'crypto', 'b2b', 'enterprise'];
  let keywordMatches = 0;
  commonKeywords.forEach(keyword => {
    if (startupSectors.includes(keyword) && investorSectors.includes(keyword)) {
      keywordMatches++;
      reasons.push(`Sector match: ${keyword}`);
    }
  });
  
  score += Math.min(keywordMatches * 10, 40);
  
  // Investment amount fit (30 points)
  const hasInvestmentInfo = startup.investment && investor.typical_investment_size;
  if (hasInvestmentInfo) {
    score += 20;
    reasons.push('Investment data available for both parties');
  }
  
  // Bonus for recent activity (10 points)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (new Date(startup.created_at) > thirtyDaysAgo) {
    score += 10;
    reasons.push('Recent startup');
  }
  
  const confidence = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  
  return {
    score: Math.min(score, 100),
    confidence,
    reason: reasons.join('; ') || 'Basic compatibility match',
    stage_fit: score >= 25,
    sector_fit: keywordMatches > 0
  };
}

async function generateMatches() {
  console.log('🎯 Generating Startup-Investor Matches...\n');
  
  // Get all approved/published startups
  const { data: startups, error: startupsError } = await supabase
    .from('startups')
    .select('*')
    .in('status', ['approved', 'published', 'pending']);
  
  if (startupsError) {
    console.error('❌ Error fetching startups:', startupsError);
    return;
  }
  
  // Get all investors
  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('*');
  
  if (investorsError) {
    console.error('❌ Error fetching investors:', investorsError);
    return;
  }
  
  console.log(`📊 Found ${startups.length} startups and ${investors.length} investors`);
  console.log('🔄 Calculating matches...\n');
  
  const matches = [];
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  
  // Generate matches for each startup
  for (const startup of startups) {
    for (const investor of investors) {
      const match = calculateMatch(startup, investor);
      
      // Only save matches with score > 20
      if (match.score > 20) {
        matches.push({
          startup_id: startup.id,
          investor_id: investor.id,
          match_score: match.score,
          confidence_level: match.confidence,
          match_reason: match.reason,
          stage_fit: match.stage_fit,
          sector_fit: match.sector_fit,
          geography_fit: false,
          status: 'suggested',
          matched_by: 'god_algorithm',
          algorithm_version: '1.0'
        });
        
        if (match.confidence === 'high') highConfidence++;
        else if (match.confidence === 'medium') mediumConfidence++;
        else lowConfidence++;
      }
    }
  }
  
  console.log(`✅ Generated ${matches.length} potential matches:`);
  console.log(`   🟢 High confidence: ${highConfidence}`);
  console.log(`   🟡 Medium confidence: ${mediumConfidence}`);
  console.log(`   🔴 Low confidence: ${lowConfidence}`);
  
  if (matches.length === 0) {
    console.log('\n⚠️  No matches found. Check your data.');
    return;
  }
  
  // Insert matches into database
  console.log('\n💾 Saving matches to database...');
  
  const { data, error } = await supabase
    .from('startup_investor_matches')
    .insert(matches)
    .select();
  
  if (error) {
    console.error('❌ Error saving matches:', error);
    return;
  }
  
  console.log(`✅ Successfully saved ${data.length} matches!\n`);
  
  // Show statistics
  const { data: stats } = await supabase
    .from('match_statistics')
    .select('*')
    .single();
  
  if (stats) {
    console.log('📊 MATCH STATISTICS:');
    console.log(`   Total matches: ${stats.total_matches}`);
    console.log(`   Unique startups matched: ${stats.unique_startups_matched}`);
    console.log(`   Unique investors matched: ${stats.unique_investors_matched}`);
    console.log(`   Average match score: ${stats.avg_match_score?.toFixed(2)}`);
    console.log(`   High confidence matches: ${stats.high_confidence_matches}`);
  }
  
  // Show top matches
  const { data: topMatches } = await supabase
    .from('startup_investor_matches')
    .select(`
      *,
      startups(name),
      investors(name)
    `)
    .order('match_score', { ascending: false })
    .limit(5);
  
  if (topMatches && topMatches.length > 0) {
    console.log('\n🏆 TOP 5 MATCHES:');
    topMatches.forEach((match, i) => {
      console.log(`   ${i + 1}. ${match.startups.name} ↔ ${match.investors.name}`);
      console.log(`      Score: ${match.match_score} | Confidence: ${match.confidence_level}`);
      console.log(`      Reason: ${match.match_reason.substring(0, 80)}...`);
    });
  }
}

// Run the matching
generateMatches().catch(console.error);
