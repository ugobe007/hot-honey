#!/usr/bin/env node
/**
 * GOD SCORE V6.1 - STAGE-ADJUSTED WEIGHTS + SOCIAL SIGNALS
 * =========================================================
 * No AI/ML API calls - pure math and logic
 * 
 * Philosophy: Ruthlessly honest scoring with stage-appropriate expectations
 * - Pre-seed: Team & product velocity matter most (no revenue expected)
 * - Seed: Early traction signals + team + velocity + social proof
 * - Series A: Revenue required (ARR, growth, unit economics) + social validation
 * - Series B+: Scale metrics (ARR, efficiency, margins) + brand awareness
 * - Social signals: 7-10% weight (community validation from Twitter/Reddit/HN)
 * - Most startups should score 20-50
 * - Only exceptional startups score 70+
 * - Data-driven, not vibes
 * 
 * Run: node god-score-formula.js
 * Run limited: node god-score-formula.js --limit 100
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// =============================================================================
// STAGE-ADJUSTED WEIGHTS (total = 100 each stage) - WITH SOCIAL SIGNALS
// =============================================================================
const STAGE_WEIGHTS = {
  1: { // Pre-seed - NO revenue expected
    team: 32,
    product_velocity: 23,
    market_timing: 18,
    customer_validation: 15,
    social: 7,  // ✅ Social validation matters even early
    vision: 5
  },
  2: { // Seed - Early revenue signals
    team: 23,
    traction: 23,  // Users, engagement, early revenue
    product_velocity: 18,
    market_timing: 13,
    customer_validation: 8,
    social: 10,  // ✅ Higher weight - social proof important
    vision: 5
  },
  3: { // Series A - Revenue required
    traction: 38,  // ARR, growth, unit economics
    team: 18,
    market: 18,
    product: 13,
    social: 8,  // ✅ Social signals = market validation
    vision: 5
  },
  4: { // Series B+ - Scale metrics
    traction: 47,  // ARR, efficiency, margins
    market: 18,
    team: 13,
    product: 9,
    social: 8,  // ✅ Social buzz = brand awareness
    vision: 5
  }
};

// =============================================================================
// SECTOR DIFFICULTY MULTIPLIERS
// Hot sectors = easier to raise but higher bar
// Cold sectors = harder to raise but lower expectations
// =============================================================================
const SECTOR_MULTIPLIERS = {
  // HOT - High competition, need exceptional metrics
  'AI/ML': { difficulty: 1.2, demand: 100 },
  'AI': { difficulty: 1.2, demand: 100 },
  'Climate Tech': { difficulty: 1.1, demand: 85 },
  'Climate': { difficulty: 1.1, demand: 85 },
  'Healthcare': { difficulty: 1.1, demand: 90 },
  'Fintech': { difficulty: 1.1, demand: 95 },
  'FinTech': { difficulty: 1.1, demand: 95 },
  'Cybersecurity': { difficulty: 1.15, demand: 80 },
  
  // WARM - Solid demand
  'SaaS': { difficulty: 1.0, demand: 75 },
  'B2B SaaS': { difficulty: 1.0, demand: 75 },
  'Enterprise': { difficulty: 1.0, demand: 70 },
  'Developer Tools': { difficulty: 1.0, demand: 65 },
  'DevTools': { difficulty: 1.0, demand: 65 },
  'EdTech': { difficulty: 0.95, demand: 55 },
  'Gaming': { difficulty: 0.95, demand: 50 },
  
  // COOLING - Lower demand
  'Crypto': { difficulty: 0.85, demand: 30 },
  'Web3': { difficulty: 0.85, demand: 25 },
  'DeFi': { difficulty: 0.8, demand: 20 },
  'Consumer': { difficulty: 0.9, demand: 40 },
  'Social': { difficulty: 0.85, demand: 25 },
  
  // DEFAULT
  'default': { difficulty: 1.0, demand: 50 }
};

// =============================================================================
// TRACTION SCORE (0-100) - Weight: 35%
// This is the most important - hard numbers don't lie
// =============================================================================
function calculateTractionScore(startup) {
  let score = 0;
  let signals = 0;
  
  // ARR (Annual Recurring Revenue) - THE key metric
  const arr = startup.arr || 0;
  if (arr >= 10000000) { score += 40; signals++; }      // $10M+ ARR = exceptional
  else if (arr >= 5000000) { score += 35; signals++; }  // $5M+ ARR
  else if (arr >= 1000000) { score += 30; signals++; }  // $1M+ ARR = strong
  else if (arr >= 500000) { score += 25; signals++; }   // $500K ARR
  else if (arr >= 100000) { score += 18; signals++; }   // $100K ARR = traction
  else if (arr >= 50000) { score += 12; signals++; }    // $50K ARR = early traction
  else if (arr >= 10000) { score += 6; signals++; }     // $10K ARR = some revenue
  else if (arr > 0) { score += 3; signals++; }          // Any revenue
  // No ARR = 0 points (harsh but real)
  
  // MRR as fallback if no ARR
  if (!arr && startup.mrr) {
    const mrr = startup.mrr;
    if (mrr >= 100000) { score += 25; signals++; }
    else if (mrr >= 50000) { score += 20; signals++; }
    else if (mrr >= 20000) { score += 15; signals++; }
    else if (mrr >= 10000) { score += 10; signals++; }
    else if (mrr >= 5000) { score += 6; signals++; }
    else if (mrr > 0) { score += 3; signals++; }
  }
  
  // Growth Rate (monthly)
  const growth = startup.growth_rate_monthly || 0;
  if (growth >= 30) { score += 20; signals++; }       // 30%+ MoM = exceptional
  else if (growth >= 20) { score += 16; signals++; }  // 20%+ MoM = great
  else if (growth >= 15) { score += 12; signals++; }  // 15%+ MoM = good
  else if (growth >= 10) { score += 8; signals++; }   // 10%+ MoM = decent
  else if (growth >= 5) { score += 4; signals++; }    // 5%+ MoM = okay
  else if (growth > 0) { score += 2; signals++; }
  
  // Customer Count
  const customers = startup.customer_count || 0;
  if (customers >= 1000) { score += 15; signals++; }
  else if (customers >= 500) { score += 12; signals++; }
  else if (customers >= 100) { score += 9; signals++; }
  else if (customers >= 50) { score += 6; signals++; }
  else if (customers >= 10) { score += 3; signals++; }
  else if (customers > 0) { score += 1; signals++; }
  
  // LTV/CAC Ratio (unit economics)
  const ltvCac = parseFloat(startup.ltv_cac_ratio) || 0;
  if (ltvCac >= 5) { score += 10; signals++; }        // 5:1+ = excellent
  else if (ltvCac >= 3) { score += 7; signals++; }    // 3:1+ = good
  else if (ltvCac >= 2) { score += 4; signals++; }    // 2:1+ = okay
  else if (ltvCac >= 1) { score += 1; signals++; }    // Break even
  
  // NRR (Net Revenue Retention)
  const nrr = startup.nrr || 0;
  if (nrr >= 150) { score += 8; signals++; }          // 150%+ = exceptional expansion
  else if (nrr >= 120) { score += 6; signals++; }     // 120%+ = great
  else if (nrr >= 100) { score += 3; signals++; }     // 100%+ = no churn
  
  // Engagement (DAU/WAU ratio)
  const dauWau = parseFloat(startup.dau_wau_ratio) || 0;
  if (dauWau >= 0.6) { score += 7; signals++; }       // 60%+ = daily habit
  else if (dauWau >= 0.4) { score += 5; signals++; }  // 40%+ = good engagement
  else if (dauWau >= 0.2) { score += 2; signals++; }
  
  // Penalize if NO traction signals at all
  if (signals === 0) {
    return 5; // Base score for no traction = very low
  }
  
  return Math.min(100, score);
}

// =============================================================================
// TEAM SCORE (0-100) - Weight: 25%
// =============================================================================
function calculateTeamScore(startup) {
  let score = 20; // Base score
  
  // Technical cofounder - CRITICAL for tech startups
  if (startup.has_technical_cofounder === true) {
    score += 25;
  } else if (startup.has_technical_cofounder === false) {
    score -= 10; // Penalize lack of technical cofounder
  }
  
  // Team size - right size for stage
  const teamSize = startup.team_size || startup.team_size_estimate || 0;
  const stage = startup.stage || 1;
  
  if (stage <= 2) { // Pre-seed/Seed
    if (teamSize >= 2 && teamSize <= 10) score += 15;
    else if (teamSize >= 11 && teamSize <= 20) score += 10;
    else if (teamSize === 1) score += 5; // Solo founder
    else if (teamSize > 20) score -= 5; // Too big for stage
  } else { // Series A+
    if (teamSize >= 10 && teamSize <= 50) score += 15;
    else if (teamSize >= 5 && teamSize < 10) score += 10;
    else if (teamSize > 50) score += 12;
  }
  
  // Founder age signals
  const avgAge = startup.founder_avg_age || 0;
  if (avgAge >= 25 && avgAge <= 45) {
    score += 10; // Prime founder age range
  } else if (avgAge >= 20 && avgAge < 25) {
    score += 8; // Young but capable
  } else if (avgAge > 45 && avgAge <= 55) {
    score += 8; // Experienced
  }
  
  // First time founders penalty (slight - they can still succeed)
  if (startup.first_time_founders === true) {
    score -= 5;
  } else if (startup.first_time_founders === false) {
    score += 10; // Repeat founders bonus
  }
  
  // Education signals (from founder_education array)
  const education = startup.founder_education || [];
  const topSchools = ['Stanford', 'MIT', 'Harvard', 'Berkeley', 'CMU', 'Caltech', 'Princeton', 'Yale'];
  const hasTopSchool = education.some(e => 
    topSchools.some(school => (e || '').toLowerCase().includes(school.toLowerCase()))
  );
  if (hasTopSchool) score += 10;
  
  // Advisors and strategic partners
  const advisors = startup.advisors || [];
  const partners = startup.strategic_partners || [];
  if (Array.isArray(advisors) && advisors.length >= 3) score += 8;
  else if (Array.isArray(advisors) && advisors.length >= 1) score += 4;
  if (Array.isArray(partners) && partners.length >= 2) score += 7;
  else if (Array.isArray(partners) && partners.length >= 1) score += 3;
  
  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// MARKET SCORE (0-100) - Weight: 20%
// =============================================================================
function calculateMarketScore(startup) {
  let score = 20; // Base score
  
  // TAM (Total Addressable Market)
  const tam = (startup.tam_estimate || '').toLowerCase();
  if (tam.includes('trillion') || tam.includes('1t') || tam.includes('$1,000b')) {
    score += 30; // Massive market
  } else if (tam.includes('billion') || tam.includes('100b') || tam.includes('$100b')) {
    score += 25;
  } else if (tam.includes('50b') || tam.includes('$50b')) {
    score += 20;
  } else if (tam.includes('10b') || tam.includes('$10b')) {
    score += 15;
  } else if (tam.includes('1b') || tam.includes('$1b')) {
    score += 10;
  } else if (tam.includes('million') || tam.includes('100m')) {
    score += 5; // Small market
  }
  
  // Sector heat multiplier
  const sectors = startup.sectors || [];
  let maxDemand = 50;
  let difficulty = 1.0;
  
  for (const sector of sectors) {
    const data = SECTOR_MULTIPLIERS[sector] || SECTOR_MULTIPLIERS['default'];
    if (data.demand > maxDemand) {
      maxDemand = data.demand;
      difficulty = data.difficulty;
    }
  }
  
  // Add sector demand bonus (0-20 points based on investor demand)
  score += Math.round(maxDemand / 5); // 0-20 points
  
  // Location bonus (certain hubs)
  const location = (startup.location || '').toLowerCase();
  const hotLocations = ['san francisco', 'sf', 'bay area', 'nyc', 'new york', 'austin', 'boston', 'seattle', 'los angeles', 'la'];
  const goodLocations = ['london', 'berlin', 'tel aviv', 'singapore', 'toronto', 'denver', 'miami', 'chicago'];
  
  if (hotLocations.some(loc => location.includes(loc))) {
    score += 10;
  } else if (goodLocations.some(loc => location.includes(loc))) {
    score += 5;
  }
  
  // Why Now signal
  if (startup.why_now && startup.why_now.length > 50) {
    score += 8; // Has articulated market timing
  }
  
  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// PRODUCT SCORE (0-100) - Weight: 15%
// =============================================================================
function calculateProductScore(startup) {
  let score = 15; // Base score
  
  // Is launched?
  if (startup.is_launched === true) {
    score += 20;
  } else {
    score -= 5; // Not launched = penalty
  }
  
  // Has demo?
  if (startup.has_demo === true) {
    score += 10;
  }
  
  // Speed to MVP
  const daysToMvp = startup.days_from_idea_to_mvp || 0;
  if (daysToMvp > 0 && daysToMvp <= 30) {
    score += 15; // Built MVP in a month = impressive
  } else if (daysToMvp > 30 && daysToMvp <= 90) {
    score += 10;
  } else if (daysToMvp > 90 && daysToMvp <= 180) {
    score += 5;
  }
  
  // Deployment frequency (shipping velocity)
  const deployFreq = (startup.deployment_frequency || '').toLowerCase();
  if (deployFreq.includes('daily') || deployFreq.includes('continuous')) {
    score += 15;
  } else if (deployFreq.includes('weekly')) {
    score += 10;
  } else if (deployFreq.includes('bi-weekly') || deployFreq.includes('biweekly')) {
    score += 7;
  } else if (deployFreq.includes('monthly')) {
    score += 4;
  }
  
  // Features shipped
  const featuresShipped = startup.features_shipped_last_month || 0;
  if (featuresShipped >= 10) score += 10;
  else if (featuresShipped >= 5) score += 7;
  else if (featuresShipped >= 2) score += 4;
  else if (featuresShipped >= 1) score += 2;
  
  // NPS Score
  const nps = startup.nps_score || 0;
  if (nps >= 70) score += 12; // World class
  else if (nps >= 50) score += 9;
  else if (nps >= 30) score += 6;
  else if (nps >= 0) score += 3;
  
  // Users who would be "very disappointed"
  const disappointed = startup.users_who_would_be_very_disappointed || 0;
  if (disappointed >= 40) score += 10; // PMF signal
  else if (disappointed >= 25) score += 6;
  else if (disappointed >= 10) score += 3;
  
  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// VISION SCORE (0-100) - Weight: 5%
// Qualitative signals - lowest weight because subjective
// =============================================================================
function calculateVisionScore(startup) {
  let score = 20; // Base score
  
  // Smell tests (YC style)
  if (startup.smell_test_lean === true) score += 10;
  if (startup.smell_test_user_passion === true) score += 15;
  if (startup.smell_test_learning_public === true) score += 8;
  if (startup.smell_test_inevitable === true) score += 12;
  if (startup.smell_test_massive_if_works === true) score += 15;
  
  // Or use pre-calculated smell test score
  const smellScore = startup.smell_test_score || 0;
  if (smellScore > 0) {
    score = Math.max(score, smellScore);
  }
  
  // Contrarian belief (shows independent thinking)
  if (startup.contrarian_belief && startup.contrarian_belief.length > 30) {
    score += 10;
  }
  
  // Unfair advantage
  if (startup.unfair_advantage && startup.unfair_advantage.length > 30) {
    score += 10;
  }
  
  // Organic referral rate (word of mouth)
  const referral = startup.organic_referral_rate || 0;
  if (referral >= 50) score += 10;
  else if (referral >= 30) score += 7;
  else if (referral >= 15) score += 4;
  
  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// HELPER: Get stage number from startup data
// =============================================================================
function getStageNumber(startup) {
  const stage = (startup.stage || '').toString().toLowerCase();
  
  if (stage.includes('pre-seed') || stage === '1' || stage === 'pre_seed') return 1;
  if (stage.includes('seed') || stage === '2') return 2;
  if (stage.includes('series a') || stage === '3' || stage === 'series_a') return 3;
  if (stage.includes('series b') || stage.includes('series c') || stage.includes('series d') || 
      stage.includes('growth') || stage.includes('late') || stage === '4') return 4;
  
  // Default to stage 2 (Seed) if unclear
  return 2;
}

// =============================================================================
// PRODUCT VELOCITY SCORE (0-100)
// Speed to MVP, deployment frequency, features shipped
// =============================================================================
function calculateProductVelocityScore(startup) {
  let score = 20; // Base score
  
  // Speed to MVP
  const daysToMvp = startup.days_from_idea_to_mvp || 0;
  if (daysToMvp > 0 && daysToMvp <= 30) {
    score += 30; // Built MVP in a month = impressive
  } else if (daysToMvp > 30 && daysToMvp <= 90) {
    score += 25;
  } else if (daysToMvp > 90 && daysToMvp <= 180) {
    score += 15;
  } else if (daysToMvp > 180 && daysToMvp <= 365) {
    score += 8;
  }
  
  // Deployment frequency (shipping velocity)
  const deployFreq = (startup.deployment_frequency || '').toLowerCase();
  if (deployFreq.includes('daily') || deployFreq.includes('continuous')) {
    score += 30;
  } else if (deployFreq.includes('weekly')) {
    score += 20;
  } else if (deployFreq.includes('bi-weekly') || deployFreq.includes('biweekly')) {
    score += 15;
  } else if (deployFreq.includes('monthly')) {
    score += 8;
  }
  
  // Features shipped
  const featuresShipped = startup.features_shipped_last_month || 0;
  if (featuresShipped >= 10) score += 20;
  else if (featuresShipped >= 5) score += 15;
  else if (featuresShipped >= 2) score += 10;
  else if (featuresShipped >= 1) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// MARKET TIMING SCORE (0-100)
// Why Now, sector heat, location
// =============================================================================
function calculateMarketTimingScore(startup) {
  let score = 20; // Base score
  
  // Why Now signal
  if (startup.why_now && startup.why_now.length > 50) {
    score += 30; // Has articulated market timing
  } else if (startup.why_now && startup.why_now.length > 20) {
    score += 15;
  }
  
  // Sector heat multiplier
  const sectors = startup.sectors || [];
  let maxDemand = 50;
  
  for (const sector of sectors) {
    const data = SECTOR_MULTIPLIERS[sector] || SECTOR_MULTIPLIERS['default'];
    if (data.demand > maxDemand) {
      maxDemand = data.demand;
    }
  }
  
  // Add sector demand bonus (0-30 points based on investor demand)
  score += Math.round(maxDemand * 0.3); // 0-30 points
  
  // Location bonus (certain hubs)
  const location = (startup.location || '').toLowerCase();
  const hotLocations = ['san francisco', 'sf', 'bay area', 'nyc', 'new york', 'austin', 'boston', 'seattle', 'los angeles', 'la'];
  const goodLocations = ['london', 'berlin', 'tel aviv', 'singapore', 'toronto', 'denver', 'miami', 'chicago'];
  
  if (hotLocations.some(loc => location.includes(loc))) {
    score += 20;
  } else if (goodLocations.some(loc => location.includes(loc))) {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// CUSTOMER VALIDATION SCORE (0-100)
// Early user signals, NPS, engagement
// =============================================================================
function calculateCustomerValidationScore(startup) {
  let score = 15; // Base score
  
  // Is launched?
  if (startup.is_launched === true) {
    score += 25;
  } else {
    score -= 10; // Not launched = penalty
  }
  
  // Has demo?
  if (startup.has_demo === true) {
    score += 15;
  }
  
  // Customer Count (early validation)
  const customers = startup.customer_count || 0;
  if (customers >= 100) { score += 20; }
  else if (customers >= 50) { score += 15; }
  else if (customers >= 10) { score += 10; }
  else if (customers > 0) { score += 5; }
  
  // NPS Score
  const nps = startup.nps_score || 0;
  if (nps >= 70) score += 20; // World class
  else if (nps >= 50) score += 15;
  else if (nps >= 30) score += 10;
  else if (nps >= 0) score += 5;
  
  // Users who would be "very disappointed" (PMF signal)
  const disappointed = startup.users_who_would_be_very_disappointed || 0;
  if (disappointed >= 40) score += 20; // Strong PMF signal
  else if (disappointed >= 25) score += 12;
  else if (disappointed >= 10) score += 6;
  
  // Engagement (DAU/WAU ratio)
  const dauWau = parseFloat(startup.dau_wau_ratio) || 0;
  if (dauWau >= 0.6) score += 15; // Daily habit
  else if (dauWau >= 0.4) score += 10;
  else if (dauWau >= 0.2) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// SOCIAL BUZZ SCORE (0-100) - Weight: 7-10% (stage-dependent)
// Community validation and social proof
// =============================================================================
async function calculateSocialBuzzScore(startupName) {
  try {
    // Query social signals from database
    const { data: signals, error } = await supabase
      .from('social_signals')
      .select('sentiment, engagement_score, platform')
      .eq('startup_name', startupName);
    
    if (error || !signals || signals.length === 0) {
      return 0; // No social data = 0 points
    }
    
    let score = 0;
    
    // Base score for mentions
    const mentionCount = signals.length;
    if (mentionCount >= 500) score += 30;
    else if (mentionCount >= 200) score += 25;
    else if (mentionCount >= 100) score += 20;
    else if (mentionCount >= 50) score += 15;
    else if (mentionCount >= 20) score += 10;
    else if (mentionCount >= 10) score += 5;
    else score += 2;
    
    // Sentiment analysis
    const praiseCount = signals.filter(s => s.sentiment === 'praise').length;
    const concernCount = signals.filter(s => s.sentiment === 'concern').length;
    const interestCount = signals.filter(s => s.sentiment === 'interest').length;
    const helpCount = signals.filter(s => s.sentiment === 'help').length;
    
    // Praise signals (users love it)
    const praisePct = mentionCount > 0 ? (praiseCount / mentionCount) * 100 : 0;
    if (praisePct >= 20) score += 25; // Exceptional positive sentiment
    else if (praisePct >= 10) score += 20;
    else if (praisePct >= 5) score += 15;
    else if (praisePct >= 2) score += 10;
    
    // Concern penalty (red flags)
    const concernPct = mentionCount > 0 ? (concernCount / mentionCount) * 100 : 0;
    if (concernPct >= 10) score -= 20; // Major red flag
    else if (concernPct >= 5) score -= 10;
    else if (concernPct >= 2) score -= 5;
    
    // Interest signals (people researching)
    if (interestCount >= 10) score += 10;
    else if (interestCount >= 5) score += 5;
    
    // Help signals (founder is respected)
    if (helpCount >= 5) score += 8;
    else if (helpCount >= 2) score += 4;
    
    // Engagement score (viral content)
    const totalEngagement = signals.reduce((sum, s) => sum + (s.engagement_score || 0), 0);
    const avgEngagement = mentionCount > 0 ? totalEngagement / mentionCount : 0;
    if (avgEngagement >= 100) score += 15;
    else if (avgEngagement >= 50) score += 10;
    else if (avgEngagement >= 20) score += 5;
    
    // Platform diversity (shows broad awareness)
    const platforms = new Set(signals.map(s => s.platform));
    if (platforms.size >= 3) score += 5; // On Reddit, HN, and Twitter
    else if (platforms.size >= 2) score += 3;
    
    return Math.min(100, Math.max(0, score));
    
  } catch (error) {
    console.error(`Social buzz error for ${startupName}:`, error.message);
    return 0;
  }
}

// =============================================================================
// CALCULATE TOTAL GOD SCORE (STAGE-ADJUSTED + SOCIAL SIGNALS)
// =============================================================================
async function calculateGodScore(startup) {
  const stage = getStageNumber(startup);
  const weights = STAGE_WEIGHTS[stage] || STAGE_WEIGHTS[2]; // Default to Seed if invalid stage
  
  // Calculate all scores
  const traction = calculateTractionScore(startup);
  const team = calculateTeamScore(startup);
  const market = calculateMarketScore(startup);
  const product = calculateProductScore(startup);
  const vision = calculateVisionScore(startup);
  const productVelocity = calculateProductVelocityScore(startup);
  const marketTiming = calculateMarketTimingScore(startup);
  const customerValidation = calculateCustomerValidationScore(startup);
  const social = await calculateSocialBuzzScore(startup.name); // ✅ NEW!
  
  // Calculate weighted average based on stage
  let total = 0;
  
  if (stage === 1) {
    // Pre-seed: team, product_velocity, market_timing, customer_validation, social, vision
    total = Math.round(
      (team * weights.team / 100) +
      (productVelocity * weights.product_velocity / 100) +
      (marketTiming * weights.market_timing / 100) +
      (customerValidation * weights.customer_validation / 100) +
      (social * weights.social / 100) +
      (vision * weights.vision / 100)
    );
  } else if (stage === 2) {
    // Seed: team, traction, product_velocity, market_timing, customer_validation, social, vision
    total = Math.round(
      (team * weights.team / 100) +
      (traction * weights.traction / 100) +
      (productVelocity * weights.product_velocity / 100) +
      (marketTiming * weights.market_timing / 100) +
      (customerValidation * weights.customer_validation / 100) +
      (social * weights.social / 100) +
      (vision * weights.vision / 100)
    );
  } else if (stage === 3 || stage === 4) {
    // Series A+: traction, team, market, product, social, vision
    total = Math.round(
      (traction * weights.traction / 100) +
      (team * weights.team / 100) +
      (market * weights.market / 100) +
      (product * weights.product / 100) +
      (social * weights.social / 100) +
      (vision * weights.vision / 100)
    );
  }
  
  // Return scores - always include all components for database compatibility
  return {
    total: Math.min(100, Math.max(0, total)),
    traction_score: traction,
    team_score: team,
    market_score: market,
    product_score: product,
    social_score: social,
    vision_score: vision,
    stage: stage // Include stage for debugging
  };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
async function main() {
  console.log('🎯 GOD SCORE V6.1 - WITH SOCIAL SIGNALS');
  console.log('=========================================');
  console.log('No AI API calls - pure math and logic');
  console.log('Stage-appropriate scoring: Pre-seed → Seed → Series A → Series B+');
  console.log('✅ Social buzz scoring integrated (7-10% weight)\n');
  
  // Parse args
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) || 100 : null;
  
  // Fetch startups
  let query = supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved')
    .order('updated_at', { ascending: true });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: startups, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    process.exit(1);
  }
  
  console.log(`📊 Processing ${startups.length} startups...\n`);
  
  let updated = 0;
  let errors = 0;
  const scoreDistribution = { '0-19': 0, '20-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 };
  
  for (const startup of startups) {
    try {
      const scores = await calculateGodScore(startup); // ✅ Now async
      
      // Track distribution
      if (scores.total < 20) scoreDistribution['0-19']++;
      else if (scores.total < 40) scoreDistribution['20-39']++;
      else if (scores.total < 60) scoreDistribution['40-59']++;
      else if (scores.total < 80) scoreDistribution['60-79']++;
      else scoreDistribution['80-100']++;
      
      // Update database
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update({
          total_god_score: scores.total,
          traction_score: scores.traction_score,
          team_score: scores.team_score,
          market_score: scores.market_score,
          product_score: scores.product_score,
          social_score: scores.social_score, // ✅ NEW!
          vision_score: scores.vision_score,
          updated_at: new Date().toISOString()
        })
        .eq('id', startup.id);
      
      if (updateError) {
        console.error(`❌ ${startup.name}: ${updateError.message}`);
        errors++;
      } else {
        const emoji = scores.total >= 70 ? '🔥' : scores.total >= 50 ? '✅' : scores.total >= 30 ? '📊' : '⚠️';
        const stageLabel = ['', 'Pre-Seed', 'Seed', 'Series A', 'Series B+'][scores.stage] || `Stage ${scores.stage}`;
        console.log(`${emoji} [${stageLabel}] ${startup.name}: ${scores.total} (T:${scores.traction_score} Te:${scores.team_score} M:${scores.market_score} P:${scores.product_score} S:${scores.social_score} V:${scores.vision_score})`);
        updated++;
      }
      
    } catch (err) {
      console.error(`❌ ${startup.name}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n=====================================');
  console.log('📈 SCORE DISTRIBUTION:');
  console.log(`   0-19:  ${scoreDistribution['0-19']} startups`);
  console.log(`   20-39: ${scoreDistribution['20-39']} startups`);
  console.log(`   40-59: ${scoreDistribution['40-59']} startups`);
  console.log(`   60-79: ${scoreDistribution['60-79']} startups`);
  console.log(`   80-100: ${scoreDistribution['80-100']} startups`);
  console.log('=====================================');
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);
}

main().catch(console.error);

