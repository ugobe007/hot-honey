#!/usr/bin/env node
/**
 * Advanced Matching Engine
 * Generates startup-investor matches using enriched VC data and GOD scores
 */

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.POSTGRES_URL });

// Matching weights
const WEIGHTS = {
  SECTOR_MATCH: 35,
  STAGE_MATCH: 25,
  GOD_SCORE: 20,
  PORTFOLIO_FIT: 15,
  RECENT_ACTIVITY: 5
};

function calculateSectorMatch(startupSectors, investorSectors) {
  if (!startupSectors || !investorSectors) return 0;
  
  const sArray = Array.isArray(startupSectors) ? startupSectors : [startupSectors];
  const iArray = Array.isArray(investorSectors) ? investorSectors : [investorSectors];
  
  const matches = sArray.filter(s => 
    iArray.some(i => 
      s.toLowerCase().includes(i.toLowerCase()) || 
      i.toLowerCase().includes(s.toLowerCase())
    )
  );
  
  return matches.length > 0 ? WEIGHTS.SECTOR_MATCH * (matches.length / sArray.length) : 0;
}

function calculateStageMatch(startupStage, investorStages) {
  if (!investorStages) return 0;
  
  const stages = Array.isArray(investorStages) ? investorStages : [investorStages];
  const startupStageStr = String(startupStage || 'seed').toLowerCase();
  
  // Stage mapping
  const stageMap = {
    'pre-seed': ['pre_seed', 'preseed', 'pre-seed', 'seed'],
    'seed': ['seed', 'pre-seed'],
    'series_a': ['series_a', 'series a', 'early'],
    'series_b': ['series_b', 'series b', 'growth'],
    'growth': ['growth', 'series_b', 'series_c']
  };
  
  for (const [key, variants] of Object.entries(stageMap)) {
    if (startupStageStr.includes(key) || variants.some(v => startupStageStr.includes(v))) {
      const hasMatch = stages.some(s => 
        String(s).toLowerCase().includes(key) || 
        variants.some(v => String(s).toLowerCase().includes(v))
      );
      if (hasMatch) return WEIGHTS.STAGE_MATCH;
    }
  }
  
  return 0;
}

function calculateGODScoreBonus(godScore) {
  if (!godScore || godScore < 50) return 0;
  
  // Higher GOD score = higher match potential
  return WEIGHTS.GOD_SCORE * ((godScore - 50) / 50);
}

function calculatePortfolioFit(portfolioSize, totalInvestments) {
  if (!portfolioSize && !totalInvestments) return 0;
  
  const size = portfolioSize || totalInvestments || 0;
  
  // Prefer active investors with medium-large portfolios
  if (size >= 50 && size <= 300) return WEIGHTS.PORTFOLIO_FIT;
  if (size > 300) return WEIGHTS.PORTFOLIO_FIT * 0.7; // Mega funds might be slower
  if (size >= 20) return WEIGHTS.PORTFOLIO_FIT * 0.5; // Smaller but active
  
  return 0;
}

function calculateRecentActivityBonus(startupCreatedAt) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return new Date(startupCreatedAt) > thirtyDaysAgo ? WEIGHTS.RECENT_ACTIVITY : 0;
}

async function generateMatches() {
  console.log('\n🎯 Advanced Matching Engine\n');
  console.log('═'.repeat(80));
  
  await client.connect();
  
  // Get startups with GOD scores
  const { rows: startups } = await client.query(`
    SELECT id, name, sectors, stage, total_god_score, created_at, status
    FROM startup_uploads
    WHERE status = 'approved'
    -- BUG FIX: Removed LIMIT 100 - must process ALL startups
  `);
  
  // Get enriched investors
  const { rows: investors } = await client.query(`
    SELECT id, name, firm, sectors, stage, total_investments, portfolio_size
    FROM investors
    WHERE sectors IS NOT NULL
  `);
  
  console.log(`\n📊 Found ${startups.length} startups and ${investors.length} investors\n`);
  
  let matchCount = 0;
  let highQualityMatches = 0;
  
  // BUG FIX: DO NOT delete existing matches - use upsert to preserve them
  // This prevents loss of matches when script only processes a subset
  console.log('💾 Using upsert to update matches (preserving all existing matches)\n');
  
  for (const startup of startups) {
    let startupMatches = 0;
    
    for (const investor of investors) {
      // Calculate match components
      const sectorScore = calculateSectorMatch(startup.sectors, investor.sectors);
      const stageScore = calculateStageMatch(startup.stage, investor.stage);
      const godBonus = calculateGODScoreBonus(startup.total_god_score);
      const portfolioScore = calculatePortfolioFit(investor.portfolio_size, investor.total_investments);
      const recentBonus = calculateRecentActivityBonus(startup.created_at);
      
      const totalScore = Math.round(sectorScore + stageScore + godBonus + portfolioScore + recentBonus);
      
      // Only create matches above threshold
      if (totalScore >= 30) {
        const confidence = totalScore >= 70 ? 'high' : totalScore >= 50 ? 'medium' : 'low';
        
        const reasons = [];
        if (sectorScore > 0) reasons.push(`Sector alignment (${Math.round(sectorScore)}pts)`);
        if (stageScore > 0) reasons.push(`Stage fit (${Math.round(stageScore)}pts)`);
        if (godBonus > 0) reasons.push(`Strong GOD score (${Math.round(godBonus)}pts)`);
        if (portfolioScore > 0) reasons.push(`Active portfolio (${Math.round(portfolioScore)}pts)`);
        
        // BUG FIX: Use INSERT ... ON CONFLICT to handle duplicates (upsert behavior)
        await client.query(`
          INSERT INTO startup_investor_matches 
          (startup_id, investor_id, match_score, confidence_level, match_reasoning, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (startup_id, investor_id) 
          DO UPDATE SET 
            match_score = EXCLUDED.match_score,
            confidence_level = EXCLUDED.confidence_level,
            match_reasoning = EXCLUDED.match_reasoning,
            updated_at = NOW()
          -- NOTE: created_at is NOT updated - preserves original creation time
        `, [startup.id, investor.id, totalScore, confidence, reasons.join('; ')]);
        
        matchCount++;
        startupMatches++;
        
        if (confidence === 'high') highQualityMatches++;
      }
    }
    
    if (startupMatches > 0) {
      console.log(`✓ ${startup.name}: ${startupMatches} matches generated`);
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Generated ${matchCount} total matches`);
  console.log(`🌟 ${highQualityMatches} high-confidence matches (70+ score)`);
  console.log(`📈 Average: ${Math.round(matchCount / startups.length)} matches per startup\n`);
  
  await client.end();
}

generateMatches().catch(console.error);
