#!/usr/bin/env node
/**
 * ENHANCED MATCHING ENGINE v2
 * ===========================
 * Uses both Startup GOD scores and Investor GOD scores to create
 * higher quality matches. Elite investors matched to high-potential startups.
 * 
 * NEW FORMULA:
 *   Final Score = (Fit Score × 0.6) + (Investor Quality Boost × 0.25) + (Startup Quality × 0.15)
 * 
 * Where:
 *   - Fit Score: Sector + Stage + Geography alignment
 *   - Investor Quality Boost: Based on investor_score (0-10)
 *   - Startup Quality: Based on total_god_score
 * 
 * Run: node generate-matches-v2.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Matching configuration
const CONFIG = {
  // Fit score weights (sum = 60)
  SECTOR_MATCH: 30,
  STAGE_MATCH: 20,
  GEO_MATCH: 10,
  
  // Quality score weights (sum = 40)
  INVESTOR_QUALITY: 25,  // NEW: Investor GOD score contribution
  STARTUP_QUALITY: 15,   // Startup GOD score contribution
  
  // Thresholds
  MIN_MATCH_SCORE: 35,
  HIGH_CONFIDENCE: 70,
  MEDIUM_CONFIDENCE: 50,
  
  // Investor tier boost factors
  TIER_BOOSTS: {
    elite: 1.2,     // +20% boost for elite investors
    strong: 1.1,    // +10% boost
    solid: 1.0,     // No boost
    emerging: 0.9   // -10% (prioritize better investors)
  }
};

// Sector synonyms for better matching
const SECTOR_SYNONYMS = {
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative ai'],
  'fintech': ['financial technology', 'payments', 'banking', 'insurtech', 'neobank'],
  'healthtech': ['health tech', 'digital health', 'healthcare', 'medtech', 'biotech'],
  'saas': ['software', 'b2b software', 'enterprise software', 'cloud'],
  'ecommerce': ['e-commerce', 'retail', 'marketplace', 'dtc', 'd2c'],
  'edtech': ['education technology', 'ed-tech', 'learning'],
  'proptech': ['real estate tech', 'property technology'],
  'cleantech': ['clean technology', 'climate tech', 'sustainability', 'greentech'],
  'logistics': ['supply chain', 'shipping', 'delivery', 'fulfillment'],
  'cybersecurity': ['security', 'infosec', 'information security']
};

function normalizeSector(sector) {
  if (!sector) return '';
  const lower = sector.toLowerCase().trim();
  
  // Check for synonyms
  for (const [key, synonyms] of Object.entries(SECTOR_SYNONYMS)) {
    if (lower === key || synonyms.some(s => lower.includes(s) || s.includes(lower))) {
      return key;
    }
  }
  return lower;
}

function calculateSectorMatch(startupSectors, investorSectors) {
  if (!startupSectors || !investorSectors) return 0;
  
  const sArray = (Array.isArray(startupSectors) ? startupSectors : [startupSectors])
    .map(normalizeSector)
    .filter(Boolean);
  const iArray = (Array.isArray(investorSectors) ? investorSectors : [investorSectors])
    .map(normalizeSector)
    .filter(Boolean);
  
  if (sArray.length === 0 || iArray.length === 0) return 0;
  
  // Count matches
  const matches = sArray.filter(s => iArray.some(i => s === i || s.includes(i) || i.includes(s)));
  
  if (matches.length === 0) return 0;
  
  // Score based on match quality
  const matchRatio = matches.length / sArray.length;
  return CONFIG.SECTOR_MATCH * Math.min(matchRatio * 1.2, 1); // Up to 20% bonus for multiple matches
}

function calculateStageMatch(startupStage, investorStages) {
  if (!investorStages) return 0;
  
  const stages = Array.isArray(investorStages) ? investorStages : [investorStages];
  const startupStageStr = String(startupStage || 'seed').toLowerCase();
  
  // Stage mapping with flexibility
  const stageGroups = {
    early: ['pre-seed', 'preseed', 'pre_seed', 'seed', 'angel', 'idea'],
    growth: ['series_a', 'series a', 'series_b', 'series b', 'early growth'],
    late: ['series_c', 'series c', 'series_d', 'growth', 'late stage', 'expansion']
  };
  
  let startupGroup = null;
  for (const [group, variants] of Object.entries(stageGroups)) {
    if (variants.some(v => startupStageStr.includes(v))) {
      startupGroup = group;
      break;
    }
  }
  
  if (!startupGroup) startupGroup = 'early'; // Default to early stage
  
  // Check if investor invests in this stage group
  const investorGroupMatch = stages.some(s => {
    const sLower = String(s).toLowerCase();
    return stageGroups[startupGroup]?.some(v => sLower.includes(v));
  });
  
  return investorGroupMatch ? CONFIG.STAGE_MATCH : 0;
}

function calculateGeoMatch(startupLocation, investorGeo) {
  if (!startupLocation || !investorGeo) return CONFIG.GEO_MATCH * 0.5; // Partial credit if unknown
  
  const sLoc = startupLocation.toLowerCase();
  const iGeo = Array.isArray(investorGeo) ? investorGeo.join(' ').toLowerCase() : investorGeo.toLowerCase();
  
  // Global investors get partial credit
  if (iGeo.includes('global') || iGeo.includes('worldwide')) return CONFIG.GEO_MATCH * 0.8;
  
  // Direct location match
  if (iGeo.includes(sLoc) || sLoc.includes(iGeo)) return CONFIG.GEO_MATCH;
  
  // US/North America matching
  const usLocations = ['us', 'usa', 'united states', 'san francisco', 'new york', 'boston', 'austin', 'seattle', 'la', 'los angeles'];
  if (usLocations.some(l => sLoc.includes(l)) && usLocations.some(l => iGeo.includes(l))) {
    return CONFIG.GEO_MATCH * 0.9;
  }
  
  return CONFIG.GEO_MATCH * 0.3; // Small credit for potential remote investment
}

function calculateInvestorQualityScore(investorScore, investorTier) {
  if (!investorScore) return 0;
  
  // Normalize investor score (0-10) to (0-25) contribution
  let qualityScore = (investorScore / 10) * CONFIG.INVESTOR_QUALITY;
  
  // Apply tier boost
  const boost = CONFIG.TIER_BOOSTS[investorTier] || 1.0;
  qualityScore *= boost;
  
  return Math.min(qualityScore, CONFIG.INVESTOR_QUALITY);
}

function calculateStartupQualityScore(godScore) {
  if (!godScore) return CONFIG.STARTUP_QUALITY * 0.5; // Default 50% if no score
  
  // Normalize GOD score (assumed 0-100) to contribution
  return (godScore / 100) * CONFIG.STARTUP_QUALITY;
}

function determineConfidence(score, investorTier) {
  let threshold = CONFIG.HIGH_CONFIDENCE;
  
  // Adjust thresholds based on investor tier
  if (investorTier === 'elite') threshold -= 5;
  if (investorTier === 'emerging') threshold += 5;
  
  if (score >= threshold) return 'high';
  if (score >= CONFIG.MEDIUM_CONFIDENCE) return 'medium';
  return 'low';
}

function generateMatchReasoning(scores, startup, investor) {
  const reasons = [];
  
  if (scores.sector > 20) {
    reasons.push(`Strong sector alignment in ${investor.sectors?.slice(0, 2).join(', ') || 'target sectors'}`);
  } else if (scores.sector > 10) {
    reasons.push('Partial sector overlap');
  }
  
  if (scores.stage > 15) {
    reasons.push(`Stage fit: ${startup.stage || 'early'} stage investor`);
  }
  
  if (scores.investorQuality > 20) {
    reasons.push(`${investor.investor_tier || 'Active'} investor with proven track record`);
  }
  
  if (scores.startupQuality > 10) {
    reasons.push(`High-potential startup (GOD score: ${startup.total_god_score || 'N/A'})`);
  }
  
  if (investor.investor_tier === 'elite') {
    reasons.push('⭐ Elite-tier investor');
  }
  
  return reasons.join('; ') || 'Potential alignment based on investment criteria';
}

async function generateMatches() {
  console.log('\n🎯 ENHANCED MATCHING ENGINE v2\n');
  console.log('═'.repeat(80));
  console.log('NEW: Using Investor GOD Scores for quality-weighted matches\n');
  
  // Get startups via RPC - use startup_uploads which has GOD scores and FK relationship
  const { data: startupResult, error: startupError } = await supabase.rpc('exec_sql_rows', {
    sql_query: `SELECT id, name, sectors, stage, total_god_score FROM startup_uploads WHERE status = 'approved' LIMIT 1000`
  });
  
  if (startupError) {
    console.error('Startup fetch error:', startupError);
    return;
  }
  
  // Handle both array and object return types
  let startups;
  if (Array.isArray(startupResult)) {
    startups = startupResult;
  } else if (startupResult && typeof startupResult === 'object') {
    startups = Object.values(startupResult);
  } else {
    startups = [];
  }
  
  // Get investors with scores via RPC - use correct column names
  const { data: investorResult, error: investorError } = await supabase.rpc('exec_sql_rows', {
    sql_query: `SELECT id, name, sectors, stage, geography_focus, investor_score, investor_tier FROM investors WHERE investor_score IS NOT NULL ORDER BY investor_score DESC`
  });
  
  if (investorError) {
    console.error('Investor fetch error:', investorError);
    return;
  }
  
  let investors;
  if (Array.isArray(investorResult)) {
    investors = investorResult;
  } else if (investorResult && typeof investorResult === 'object') {
    investors = Object.values(investorResult);
  } else {
    investors = [];
  }
  
  console.log(`📊 Processing ${startups.length} startups × ${investors.length} scored investors\n`);
  
  if (startups.length === 0 || investors.length === 0) {
    console.log('❌ No data found! Debug info:');
    console.log('   Startup result type:', typeof startupResult);
    console.log('   Investor result type:', typeof investorResult);
    return;
  }
  
  // Clear existing matches
  const { data: deleteResult } = await supabase.rpc('exec_sql_modify', {
    sql_query: 'DELETE FROM startup_investor_matches'
  });
  console.log('🗑️  Cleared existing matches\n');
  
  let totalMatches = 0;
  let highConfidence = 0;
  let eliteMatches = 0;
  
  const tierCounts = { elite: 0, strong: 0, solid: 0, emerging: 0 };
  const allMatches = [];
  
  for (const startup of startups) {
    let startupMatchCount = 0;
    
    for (const investor of investors) {
      // Calculate all score components - using correct field names
      const scores = {
        sector: calculateSectorMatch(startup.sectors, investor.sectors),
        stage: calculateStageMatch(startup.stage, investor.stage),
        geo: calculateGeoMatch(null, investor.geography_focus),  // startups don't have geo in startup_uploads
        investorQuality: calculateInvestorQualityScore(investor.investor_score, investor.investor_tier),
        startupQuality: calculateStartupQualityScore(startup.total_god_score)
      };
      
      const totalScore = Math.round(
        scores.sector + 
        scores.stage + 
        scores.geo + 
        scores.investorQuality + 
        scores.startupQuality
      );
      
      // Only save matches above threshold
      if (totalScore >= CONFIG.MIN_MATCH_SCORE) {
        const confidence = determineConfidence(totalScore, investor.investor_tier);
        const reasoning = generateMatchReasoning(scores, startup, investor);
        
        allMatches.push({
          startup_id: startup.id,
          investor_id: investor.id,
          match_score: totalScore,
          confidence_level: confidence,
          reasoning: reasoning,
          fit_analysis: {
            sector_score: scores.sector,
            stage_score: scores.stage,
            geo_score: scores.geo,
            investor_quality: scores.investorQuality,
            startup_quality: scores.startupQuality,
            investor_tier: investor.investor_tier
          }
        });
        
        totalMatches++;
        startupMatchCount++;
        
        if (confidence === 'high') highConfidence++;
        if (investor.investor_tier === 'elite') eliteMatches++;
        tierCounts[investor.investor_tier || 'emerging']++;
      }
    }
    
    if (startupMatchCount > 0) {
      console.log(`✓ ${startup.name}: ${startupMatchCount} matches`);
    }
  }
  
  // Batch insert matches (100 at a time)
  console.log('\n💾 Saving matches...');
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < allMatches.length; i += BATCH_SIZE) {
    const batch = allMatches.slice(i, i + BATCH_SIZE);
    
    const values = batch.map(m => 
      `('${m.startup_id}', '${m.investor_id}', ${m.match_score}, '${m.confidence_level}', '${m.reasoning.replace(/'/g, "''")}', '${JSON.stringify(m.fit_analysis).replace(/'/g, "''")}', NOW())`
    ).join(',\n');
    
    const { error } = await supabase.rpc('exec_sql_modify', {
      sql_query: `
        INSERT INTO startup_investor_matches 
        (startup_id, investor_id, match_score, confidence_level, reasoning, fit_analysis, created_at)
        VALUES ${values}
      `
    });
    
    if (error) {
      console.error(`Batch insert error at ${i}:`, error);
    }
    
    process.stdout.write(`\r   Saved ${Math.min(i + BATCH_SIZE, allMatches.length)}/${allMatches.length}`);
  }
  
  // Results summary
  console.log('\n\n' + '═'.repeat(80));
  console.log('\n📊 MATCHING RESULTS\n');
  console.log(`   Total Matches: ${totalMatches}`);
  console.log(`   High Confidence: ${highConfidence} (${((highConfidence/totalMatches)*100).toFixed(1)}%)`);
  console.log(`   Elite Investor Matches: ${eliteMatches}`);
  
  console.log('\n📈 Matches by Investor Tier:');
  console.log(`   🏆 Elite:    ${tierCounts.elite} (${((tierCounts.elite/totalMatches)*100).toFixed(1)}%)`);
  console.log(`   💪 Strong:   ${tierCounts.strong} (${((tierCounts.strong/totalMatches)*100).toFixed(1)}%)`);
  console.log(`   ✓  Solid:    ${tierCounts.solid} (${((tierCounts.solid/totalMatches)*100).toFixed(1)}%)`);
  console.log(`   🌱 Emerging: ${tierCounts.emerging} (${((tierCounts.emerging/totalMatches)*100).toFixed(1)}%)`);
  
  // Show score distribution by tier
  console.log('\n📉 Average Match Scores by Investor Tier:');
  const { data: tierScores } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT 
        i.investor_tier,
        ROUND(AVG(m.match_score), 1) as avg_score,
        COUNT(*) as matches
      FROM startup_investor_matches m
      JOIN investors i ON m.investor_id = i.id
      GROUP BY i.investor_tier
      ORDER BY avg_score DESC
    `
  });
  
  if (tierScores) {
    tierScores.forEach(t => {
      console.log(`   ${t.investor_tier}: ${t.avg_score} avg (${t.matches} matches)`);
    });
  }
  
  console.log('\n✅ Enhanced matching complete!\n');
}

generateMatches().catch(console.error);
