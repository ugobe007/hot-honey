#!/usr/bin/env node
/**
 * SELECTIVE MATCHING ENGINE v5 - "YC SMELL TESTS"
 * ================================================
 * 
 * Philosophy: Top-tier VCs are EXTREMELY picky. They reject 99%+ of deals.
 * Our matching should reflect this reality.
 * 
 * YC SMELL TESTS (Quick Heuristics):
 * 1. Could 2 people build this in 3 months? (Lean)
 * 2. Do users sound emotionally attached? (Passion)
 * 3. Is the founder learning in public? (Transparency)
 * 4. Does this feel early but inevitable? (Timing)
 * 5. Could this be massive if it works? (TAM)
 * 
 * KEY INSIGHT: Bidirectional quality matching
 * - Elite investors (a16z, Sequoia) → Only elite startups
 * - Strong investors → Strong+ startups
 * - Solid investors → Solid+ startups
 * - Emerging investors → All startups (they need deal flow)
 * 
 * DISQUALIFIERS (instant rejection by top VCs):
 * - No technical cofounder for tech startups
 * - No traction at all
 * - Vague problem/solution
 * - Team without relevant experience
 * 
 * Run: node generate-matches-selective.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// SELECTIVITY CONFIGURATION
// ============================================

const CONFIG = {
  // Minimum startup score required for each investor tier
  TIER_THRESHOLDS: {
    elite: 75,    // Elite VCs only see 75+ GOD score startups
    strong: 55,   // Strong VCs see 55+ startups  
    solid: 40,    // Solid VCs see 40+ startups
    emerging: 0   // Emerging VCs see all (they need deal flow)
  },
  
  // Max startups each investor tier should be matched with
  MAX_MATCHES_PER_INVESTOR: {
    elite: 15,    // Elite VCs are very selective
    strong: 30,   // Strong VCs see more
    solid: 50,    // Solid see even more
    emerging: 100 // Emerging see most
  },
  
  // Score components (total = 100)
  WEIGHTS: {
    STARTUP_QUALITY: 30,     // Startup GOD score
    INVESTOR_QUALITY: 25,    // Investor GOD score  
    SECTOR_FIT: 25,          // Sector alignment
    STAGE_FIT: 15,           // Stage match
    SPECIAL_CRITERIA: 5      // Special sauce
  },
  
  // VIBE coefficient - narrative quality bonus
  VIBE_BOOST: {
    excellent_pitch: 5,      // Clear, compelling story
    strong_problem: 3,       // Well-defined problem
    unique_insight: 4,       // Contrarian view
    team_pedigree: 5         // FAANG/Top startup experience
  },
  
  // Sales velocity bonus
  SALES_VELOCITY_BOOST: {
    fast_growth: 8,          // 20%+ MoM growth
    efficient_cac: 4,        // LTV/CAC > 3
    high_nrr: 5,             // NRR > 120%
    quick_sales: 3           // Sales cycle < 30 days
  },
  
  // YC-STYLE SCORING - "We fund founders, not ideas"
  YC_STYLE_BOOST: {
    founder_speed: 10,       // ⭐⭐⭐⭐⭐ Ship daily? Built MVP in 2 weeks?
    unique_insight: 8,       // ⭐⭐⭐⭐ Contrarian belief + "Why now?"
    user_love: 6,            // ⭐⭐⭐ Sean Ellis test, NPS, organic referrals
    learning_velocity: 5,    // Experiments run, hypotheses validated
    first_time_founder: 2,   // YC backs first-timers with hunger
    young_founder: 2         // Adaptability bonus (not age discrimination)
  },
  
  // YC SMELL TESTS - Quick binary assessments
  SMELL_TEST_BOOST: {
    lean: 2,              // Could 2 people build this in 3 months?
    user_passion: 2,      // Do users sound emotionally attached?
    learning_public: 2,   // Is the founder learning in public?
    inevitable: 2,        // Does this feel early but inevitable?
    massive_if_works: 2   // Could this be massive if it works?
  }
};

// Known top-tier VCs and their specific criteria
const ELITE_VC_CRITERIA = {
  'andreessen horowitz': {
    requires: ['technical_cofounder', 'traction'],
    prefers: ['consumer', 'enterprise', 'crypto', 'ai'],
    min_team_score: 2
  },
  'a16z': {
    requires: ['technical_cofounder', 'traction'],
    prefers: ['consumer', 'enterprise', 'crypto', 'ai'],
    min_team_score: 2
  },
  'sequoia capital': {
    requires: ['technical_cofounder', 'market_size', 'sales_velocity'],
    prefers: ['enterprise', 'consumer', 'fintech'],
    min_team_score: 2.5
  },
  'y combinator': {
    // YC Philosophy: "We fund founders, not ideas"
    // They care MOST about: Speed, Insight, Learning Velocity
    requires: ['founder_speed'],  // Can you build fast?
    prefers: ['saas', 'ai', 'developer_tools', 'consumer', 'fintech'],
    min_team_score: 1.5,
    // YC-specific bonuses (override normal scoring)
    yc_weights: {
      founder_speed: 5,        // ⭐⭐⭐⭐⭐ Most important
      unique_insight: 4,       // ⭐⭐⭐⭐ Why now? Why you?
      user_love: 3,            // ⭐⭐⭐ Quality > quantity
      learning_velocity: 3,    // Fast learners win
      traction: 2,             // Helpful but not required
      polish: 0                // YC doesn't care about polish
    }
  },
  'founders fund': {
    requires: ['vision', 'contrarian'],
    prefers: ['deeptech', 'ai', 'space', 'defense'],
    min_team_score: 2
  },
  'benchmark': {
    requires: ['product_excellence'],
    prefers: ['consumer', 'marketplace'],
    min_team_score: 2
  },
  'greylock': {
    requires: ['enterprise_experience'],
    prefers: ['enterprise', 'saas', 'ai'],
    min_team_score: 2
  }
};

// ============================================
// DISQUALIFIER CHECKS
// ============================================

function checkDisqualifiers(startup, investor) {
  const disqualifiers = [];
  const investorName = (investor.name || '').toLowerCase();
  const isEliteVC = investor.investor_tier === 'elite';
  
  // Check if this is a known elite VC with specific criteria
  const eliteCriteria = Object.entries(ELITE_VC_CRITERIA).find(([name]) => 
    investorName.includes(name)
  );
  
  if (eliteCriteria) {
    const [vcName, criteria] = eliteCriteria;
    
    // Check required criteria
    if (criteria.requires.includes('technical_cofounder') && !startup.has_technical_cofounder) {
      disqualifiers.push(`${vcName} requires technical cofounder`);
    }
    
    if (criteria.requires.includes('traction') && (!startup.revenue_annual || startup.revenue_annual < 10000)) {
      disqualifiers.push(`${vcName} requires revenue traction`);
    }
    
    if (criteria.min_team_score && (startup.team_score || 0) / 100 * 3 < criteria.min_team_score) {
      disqualifiers.push(`Team score too low for ${vcName}`);
    }
  }
  
  // Generic elite VC disqualifiers
  if (isEliteVC) {
    // No technical cofounder for tech startup = instant reject
    if (!startup.has_technical_cofounder && isTechStartup(startup)) {
      disqualifiers.push('Elite VCs require technical cofounder for tech startups');
    }
    
    // Zero traction = too early for elite VCs
    if (!startup.revenue_annual && !startup.mrr && (startup.total_god_score || 0) < 70) {
      disqualifiers.push('Elite VCs need traction signals');
    }
    
    // No clear sectors = unclear focus
    if (!startup.sectors || startup.sectors.length === 0) {
      disqualifiers.push('Elite VCs need clear sector focus');
    }
    
    // Founders over 45 for consumer tech = harder sell to elite VCs
    // (Note: This is a real bias in VC, not a value judgment)
    if (startup.founder_avg_age && startup.founder_avg_age > 45 && isTechStartup(startup)) {
      // Not a hard disqualifier, but noted
      // disqualifiers.push('Founder age profile less typical for elite tech VC');
    }
  }
  
  return disqualifiers;
}

function isTechStartup(startup) {
  const techSectors = ['saas', 'ai', 'software', 'developer', 'cloud', 'data', 'ml', 'tech'];
  const sectors = (startup.sectors || []).map(s => s.toLowerCase());
  return sectors.some(s => techSectors.some(t => s.includes(t)));
}

// ============================================
// FOUNDER AGE SCORING
// ============================================

function calculateFounderAgeBonus(startup) {
  let ageBonus = 0;
  
  // Direct age data
  if (startup.founder_avg_age) {
    const avgAge = startup.founder_avg_age;
    
    if (avgAge < 25) {
      ageBonus += 8; // Maximum youth bonus - Zuckerberg era energy
    } else if (avgAge <= 28) {
      ageBonus += 6; // Very young - prime startup age
    } else if (avgAge <= 32) {
      ageBonus += 4; // Young - balanced energy/experience
    } else if (avgAge <= 36) {
      ageBonus += 2; // Moderate - has domain expertise
    } else if (avgAge <= 40) {
      ageBonus += 1; // Older - must compensate with experience
    }
    // 40+ = no youth bonus
  }
  
  // Count of young founders
  if (startup.founders_under_25 && startup.founders_under_25 > 0) {
    ageBonus += 2 * Math.min(startup.founders_under_25, 2);
  } else if (startup.founders_under_30 && startup.founders_under_30 > 0) {
    ageBonus += 1 * Math.min(startup.founders_under_30, 2);
  }
  
  // Youngest founder (if team has one young dynamo)
  if (startup.founder_youngest_age) {
    if (startup.founder_youngest_age < 22) ageBonus += 3;
    else if (startup.founder_youngest_age < 26) ageBonus += 2;
    else if (startup.founder_youngest_age < 30) ageBonus += 1;
  }
  
  // First-time founders (often younger, hungrier)
  if (startup.first_time_founders === true) {
    ageBonus += 1;
  }
  
  return Math.min(ageBonus, 10); // Cap at 10 points
}

// ============================================
// VIBE COEFFICIENT CALCULATION
// ============================================

function calculateVibeCoefficient(startup) {
  let vibe = 0;
  
  // Pitch quality (0-5)
  if (startup.pitch && startup.pitch.length > 200) {
    vibe += CONFIG.VIBE_BOOST.excellent_pitch;
  } else if (startup.pitch && startup.pitch.length > 50) {
    vibe += CONFIG.VIBE_BOOST.excellent_pitch * 0.5;
  }
  
  // Problem clarity (0-3) - from description/tagline
  if (startup.description && startup.description.length > 100) {
    vibe += CONFIG.VIBE_BOOST.strong_problem;
  }
  
  // Team pedigree indicator (0-5)
  // If they have high team_score, assume good pedigree
  if (startup.team_score && startup.team_score >= 70) {
    vibe += CONFIG.VIBE_BOOST.team_pedigree;
  } else if (startup.team_score && startup.team_score >= 50) {
    vibe += CONFIG.VIBE_BOOST.team_pedigree * 0.5;
  }
  
  // Unique insight (from extracted_data or high vision score)
  if (startup.vision_score && startup.vision_score >= 60) {
    vibe += CONFIG.VIBE_BOOST.unique_insight;
  }
  
  return Math.min(vibe, 15); // Cap at 15 points
}

// ============================================
// SELECTIVITY SCORING
// ============================================

function calculateSelectiveMatch(startup, investor) {
  // Step 1: Check tier threshold - can this startup even be shown to this investor?
  const minScore = CONFIG.TIER_THRESHOLDS[investor.investor_tier] || 0;
  const startupScore = startup.total_god_score || 50;
  
  if (startupScore < minScore) {
    return { score: 0, rejected: true, reason: `Startup score ${startupScore} below ${investor.investor_tier} threshold ${minScore}` };
  }
  
  // Step 2: Check disqualifiers
  const disqualifiers = checkDisqualifiers(startup, investor);
  if (disqualifiers.length > 0) {
    return { score: 0, rejected: true, reason: disqualifiers[0] };
  }
  
  // Step 3: Calculate match score components
  const scores = {};
  
  // Startup Quality (0-30)
  scores.startup_quality = (startupScore / 100) * CONFIG.WEIGHTS.STARTUP_QUALITY;
  
  // Investor Quality (0-25)
  const investorScore = investor.investor_score || 5;
  scores.investor_quality = (investorScore / 10) * CONFIG.WEIGHTS.INVESTOR_QUALITY;
  
  // Sector Fit (0-25)
  scores.sector_fit = calculateSectorFit(startup.sectors, investor.sectors);
  
  // Stage Fit (0-15)
  scores.stage_fit = calculateStageFit(startup.stage, investor.stage);
  
  // VIBE Coefficient (0-15 bonus)
  scores.vibe = calculateVibeCoefficient(startup);
  
  // Founder Age Bonus (0-10) - Young founders = more adaptable
  scores.founder_age = calculateFounderAgeBonus(startup);
  
  // Sales Velocity Bonus (0-10) - Fast sales = VC magnet
  scores.sales_velocity = calculateSalesVelocityBonus(startup);
  
  // YC-STYLE SCORING (0-15) - Speed, Insight, User Love, Learning
  scores.yc_style = calculateYCStyleBonus(startup, investor);
  
  // YC SMELL TESTS (0-10) - Quick heuristic assessments
  scores.smell_tests = calculateSmellTestBonus(startup, investor);
  
  // Special criteria (0-5)
  scores.special = calculateSpecialCriteria(startup, investor);

  // Check if this is YC - they use different weights!
  const investorName = (investor.name || '').toLowerCase();
  const isYC = investorName.includes('y combinator') || investorName.includes('yc ');
  
  // Total score with weighted components
  let totalScore;
  if (isYC) {
    // YC WEIGHTS: Speed & Insight > Traction
    // "We fund founders, not ideas"
    totalScore = Math.round(
      scores.startup_quality * 0.6 +   // Less weight on polish
      scores.investor_quality +
      scores.sector_fit * 0.7 +        // YC is sector-agnostic
      scores.stage_fit * 0.5 +         // YC backs very early
      scores.yc_style * 1.5 +          // YC-style gets 150% weight!
      scores.smell_tests * 1.5 +       // Smell tests VERY important for YC
      scores.founder_age * 0.4 +       // Young founders welcome
      scores.sales_velocity * 0.3 +    // Traction helpful but not required
      scores.special
    );
  } else {
    totalScore = Math.round(
      scores.startup_quality +
      scores.investor_quality +
      scores.sector_fit +
      scores.stage_fit +
      scores.vibe * 0.5 +           // VIBE at 50% weight
      scores.founder_age * 0.3 +    // Founder age at 30% weight
      scores.sales_velocity * 0.4 + // Sales velocity at 40% weight (VCs LOVE growth)
      scores.yc_style * 0.3 +       // YC-style at 30% for non-YC investors
      scores.smell_tests * 0.5 +    // Smell tests at 50% weight for others
      scores.special
    );
  }
  
  return {
    score: Math.min(totalScore, 100),
    rejected: false,
    scores,
    confidence: determineConfidence(totalScore, investor.investor_tier, startupScore)
  };
}

function calculateSectorFit(startupSectors, investorSectors) {
  if (!startupSectors || !investorSectors) return CONFIG.WEIGHTS.SECTOR_FIT * 0.3;
  
  const sArray = Array.isArray(startupSectors) ? startupSectors : [startupSectors];
  const iArray = Array.isArray(investorSectors) ? investorSectors : [investorSectors];
  
  // Normalize
  const normalize = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const sSectors = sArray.map(normalize);
  const iSectors = iArray.map(normalize);
  
  // Count matches
  const matches = sSectors.filter(s => 
    iSectors.some(i => s.includes(i) || i.includes(s))
  ).length;
  
  if (matches === 0) return CONFIG.WEIGHTS.SECTOR_FIT * 0.2; // Small credit for potential
  
  const matchRatio = Math.min(matches / sSectors.length, 1);
  return CONFIG.WEIGHTS.SECTOR_FIT * (0.5 + matchRatio * 0.5);
}

function calculateStageFit(startupStage, investorStages) {
  if (!investorStages) return CONFIG.WEIGHTS.STAGE_FIT * 0.5;
  
  const stages = Array.isArray(investorStages) ? investorStages : [investorStages];
  const stageStr = String(startupStage || 1);
  
  // Map numeric stage to names
  const stageMap = {
    '0': ['pre-seed', 'idea'],
    '1': ['seed', 'pre-seed'],
    '2': ['seed', 'series_a'],
    '3': ['series_a', 'series_b'],
    '4': ['series_b', 'growth']
  };
  
  const expectedStages = stageMap[stageStr] || ['seed'];
  const hasMatch = stages.some(s => 
    expectedStages.some(e => String(s).toLowerCase().includes(e))
  );
  
  return hasMatch ? CONFIG.WEIGHTS.STAGE_FIT : CONFIG.WEIGHTS.STAGE_FIT * 0.3;
}

function calculateSpecialCriteria(startup, investor) {
  let special = 0;
  
  // Both have strong scores = premium match
  if ((startup.total_god_score || 0) >= 80 && (investor.investor_score || 0) >= 8) {
    special += 3;
  }
  
  // Technical cofounder bonus for tech-focused VCs
  if (startup.has_technical_cofounder && isTechFocusedVC(investor)) {
    special += 2;
  }
  
  return Math.min(special, CONFIG.WEIGHTS.SPECIAL_CRITERIA);
}

// ============================================
// SALES VELOCITY SCORING (0-10)
// Fast sales = VCs love it
// ============================================

function calculateSalesVelocityBonus(startup) {
  let velocity = 0;
  
  // 1. ARR Growth Rate (0-3) - The #1 metric VCs care about
  const arrGrowth = startup.arr_growth_rate;
  if (arrGrowth !== null && arrGrowth !== undefined) {
    if (arrGrowth >= 300) velocity += 3;        // 3x+ growth = exceptional
    else if (arrGrowth >= 200) velocity += 2.5; // 2x+ growth = excellent
    else if (arrGrowth >= 100) velocity += 2;   // 2x growth = strong
    else if (arrGrowth >= 50) velocity += 1;    // 50%+ growth = decent
  }
  
  // 2. Customer Growth Rate (0-2) - Shows product-market fit
  const customerGrowth = startup.customer_growth_monthly;
  if (customerGrowth !== null && customerGrowth !== undefined) {
    if (customerGrowth >= 30) velocity += 2;      // 30%+ MoM = viral
    else if (customerGrowth >= 20) velocity += 1.5; // 20%+ MoM = excellent
    else if (customerGrowth >= 10) velocity += 1;   // 10%+ MoM = solid
    else if (customerGrowth >= 5) velocity += 0.5;  // 5%+ MoM = okay
  }
  
  // 3. Time to First Revenue (0-1.5) - Speed to market
  const timeToRevenue = startup.time_to_first_revenue_months;
  if (timeToRevenue !== null && timeToRevenue !== undefined) {
    if (timeToRevenue <= 3) velocity += 1.5;      // Revenue in 3 months = amazing
    else if (timeToRevenue <= 6) velocity += 1;   // 6 months = great
    else if (timeToRevenue <= 12) velocity += 0.5; // 12 months = okay
  }
  
  // 4. Time to $1M ARR (0-2) - The milestone metric
  const timeTo1M = startup.months_to_1m_arr;
  if (timeTo1M !== null && timeTo1M !== undefined) {
    if (timeTo1M <= 12) velocity += 2;           // Under 1 year = rocket ship
    else if (timeTo1M <= 18) velocity += 1.5;    // 18 months = excellent
    else if (timeTo1M <= 24) velocity += 1;      // 2 years = solid
    else if (timeTo1M <= 36) velocity += 0.5;    // 3 years = okay
  }
  
  // 5. LTV/CAC Ratio (0-1) - Unit economics
  const ltvCac = startup.ltv_cac_ratio;
  if (ltvCac !== null && ltvCac !== undefined) {
    if (ltvCac >= 5) velocity += 1;              // 5:1 = excellent
    else if (ltvCac >= 3) velocity += 0.7;       // 3:1 = standard target
    else if (ltvCac >= 2) velocity += 0.4;       // 2:1 = okay
  }
  
  // 6. Net Revenue Retention (0-1) - Customer stickiness
  const nrr = startup.nrr;
  if (nrr !== null && nrr !== undefined) {
    if (nrr >= 130) velocity += 1;               // 130%+ = best in class
    else if (nrr >= 110) velocity += 0.7;        // 110%+ = excellent
    else if (nrr >= 100) velocity += 0.4;        // 100%+ = healthy
  }
  
  // 7. Sales Cycle Days (0-0.5) - Shorter = faster growth
  const salesCycle = startup.sales_cycle_days;
  if (salesCycle !== null && salesCycle !== undefined) {
    if (salesCycle <= 14) velocity += 0.5;       // Under 2 weeks = awesome
    else if (salesCycle <= 30) velocity += 0.3;  // 1 month = good
    else if (salesCycle <= 60) velocity += 0.1;  // 2 months = okay
  }
  
  // 8. Proxy signals when direct metrics unavailable
  // Use raise_amount as proxy for traction validation
  if (velocity === 0 && startup.raise_amount) {
    const funding = startup.raise_amount;
    if (funding >= 5000000) velocity += 1.5;     // $5M+ = validated
    else if (funding >= 1000000) velocity += 1;  // $1M+ = good signal
    else if (funding >= 500000) velocity += 0.5; // $500K+ = decent
  }
  
  // 9. User/customer count as additional signal
  const customerCount = startup.customer_count;
  if (customerCount !== null && customerCount !== undefined) {
    if (customerCount >= 1000) velocity += 0.5;  // 1000+ = scale
    else if (customerCount >= 100) velocity += 0.3; // 100+ = traction
    else if (customerCount >= 10) velocity += 0.1;  // 10+ = starting
  }
  
  return Math.min(velocity, 10); // Cap at 10 points
}

// ============================================
// YC-STYLE SCORING (0-15)
// "We fund founders, not ideas"
// Speed > Insight > User Love > Learning Velocity
// ============================================

function calculateYCStyleBonus(startup, investor) {
  let score = 0;
  
  // 1. FOUNDER SPEED (0-5) ⭐⭐⭐⭐⭐ - Most important for YC
  // How fast do they build, ship, and iterate?
  let speedScore = 0;
  
  // Time from idea to MVP
  if (startup.days_from_idea_to_mvp !== null && startup.days_from_idea_to_mvp !== undefined) {
    if (startup.days_from_idea_to_mvp <= 14) speedScore += 2;       // 2 weeks = amazing
    else if (startup.days_from_idea_to_mvp <= 30) speedScore += 1.5; // 1 month = great
    else if (startup.days_from_idea_to_mvp <= 60) speedScore += 1;   // 2 months = okay
    else if (startup.days_from_idea_to_mvp <= 90) speedScore += 0.5; // 3 months = slow
  }
  
  // Features shipped last month
  if (startup.features_shipped_last_month !== null && startup.features_shipped_last_month !== undefined) {
    if (startup.features_shipped_last_month >= 10) speedScore += 1.5;
    else if (startup.features_shipped_last_month >= 5) speedScore += 1;
    else if (startup.features_shipped_last_month >= 2) speedScore += 0.5;
  }
  
  // Deployment frequency
  if (startup.deployment_frequency === 'daily') speedScore += 1.5;
  else if (startup.deployment_frequency === 'weekly') speedScore += 1;
  else if (startup.deployment_frequency === 'monthly') speedScore += 0.3;
  
  // PROXY: If no direct speed data, infer from launch status + technical cofounder
  if (speedScore === 0) {
    if (startup.is_launched) speedScore += 1.5;
    if (startup.has_technical_cofounder) speedScore += 1;
    if (startup.customer_count && startup.customer_count > 0) speedScore += 0.5;
    // High traction score implies they shipped fast
    if (startup.traction_score && startup.traction_score >= 70) speedScore += 1;
  }
  
  score += Math.min(speedScore, 5);
  
  // 2. UNIQUE INSIGHT (0-4) ⭐⭐⭐⭐
  // Non-obvious thesis + "Why now?" + Founder-market fit
  let insightScore = 0;
  
  // Contrarian belief
  if (startup.contrarian_belief && startup.contrarian_belief.length > 100) {
    insightScore += 1.5;
  } else if (startup.contrarian_belief && startup.contrarian_belief.length > 50) {
    insightScore += 0.8;
  }
  
  // Why now?
  if (startup.why_now && startup.why_now.length > 100) {
    insightScore += 1.2;
  } else if (startup.why_now && startup.why_now.length > 50) {
    insightScore += 0.6;
  }
  
  // Unfair advantage
  if (startup.unfair_advantage && startup.unfair_advantage.length > 100) {
    insightScore += 1.3;
  } else if (startup.unfair_advantage && startup.unfair_advantage.length > 50) {
    insightScore += 0.6;
  }
  
  // PROXY: If no direct insight data, infer from vision score and problem depth
  if (insightScore === 0) {
    if (startup.vision_score && startup.vision_score >= 80) insightScore += 2;
    else if (startup.vision_score && startup.vision_score >= 60) insightScore += 1;
    
    // Good pitch implies clear insight
    if (startup.pitch && startup.pitch.length > 200) insightScore += 1;
  }
  
  score += Math.min(insightScore, 4);
  
  // 3. USER LOVE (0-3) ⭐⭐⭐
  // "A few users who love your product > thousands who don't care"
  let loveScore = 0;
  
  // Sean Ellis test
  if (startup.users_who_would_be_very_disappointed !== null && startup.users_who_would_be_very_disappointed !== undefined) {
    if (startup.users_who_would_be_very_disappointed >= 40) loveScore += 1.5; // PMF!
    else if (startup.users_who_would_be_very_disappointed >= 25) loveScore += 1;
    else if (startup.users_who_would_be_very_disappointed >= 15) loveScore += 0.5;
  }
  
  // NPS Score
  if (startup.nps_score !== null && startup.nps_score !== undefined) {
    if (startup.nps_score >= 70) loveScore += 0.8;
    else if (startup.nps_score >= 50) loveScore += 0.5;
    else if (startup.nps_score >= 30) loveScore += 0.25;
  }
  
  // Organic referrals
  if (startup.organic_referral_rate !== null && startup.organic_referral_rate !== undefined) {
    if (startup.organic_referral_rate >= 50) loveScore += 0.7;
    else if (startup.organic_referral_rate >= 30) loveScore += 0.5;
    else if (startup.organic_referral_rate >= 15) loveScore += 0.25;
  }
  
  // PROXY: If no direct love data, infer from NRR and customer growth
  if (loveScore === 0) {
    if (startup.nrr && startup.nrr >= 120) loveScore += 1.5;
    else if (startup.nrr && startup.nrr >= 100) loveScore += 0.8;
    
    if (startup.customer_growth_monthly && startup.customer_growth_monthly >= 20) loveScore += 0.8;
    else if (startup.customer_growth_monthly && startup.customer_growth_monthly >= 10) loveScore += 0.4;
  }
  
  score += Math.min(loveScore, 3);
  
  // 4. LEARNING VELOCITY (0-3)
  // How fast do they learn from users and adapt?
  let learnScore = 0;
  
  // Experiments run
  if (startup.experiments_run_last_month !== null && startup.experiments_run_last_month !== undefined) {
    if (startup.experiments_run_last_month >= 10) learnScore += 1;
    else if (startup.experiments_run_last_month >= 5) learnScore += 0.7;
    else if (startup.experiments_run_last_month >= 2) learnScore += 0.4;
  }
  
  // Hypotheses validated
  if (startup.hypotheses_validated !== null && startup.hypotheses_validated !== undefined) {
    if (startup.hypotheses_validated >= 20) learnScore += 0.8;
    else if (startup.hypotheses_validated >= 10) learnScore += 0.5;
    else if (startup.hypotheses_validated >= 5) learnScore += 0.25;
  }
  
  // Pivot speed
  if (startup.pivot_speed_days !== null && startup.pivot_speed_days !== undefined) {
    if (startup.pivot_speed_days <= 7) learnScore += 0.6;
    else if (startup.pivot_speed_days <= 14) learnScore += 0.4;
    else if (startup.pivot_speed_days <= 30) learnScore += 0.2;
  }
  
  // Customer feedback frequency
  if (startup.customer_feedback_frequency === 'daily') learnScore += 0.6;
  else if (startup.customer_feedback_frequency === 'weekly') learnScore += 0.4;
  
  // PROXY: If no direct learning data, infer from pivots and problem validation
  if (learnScore === 0) {
    if (startup.pivots_made && startup.pivots_made >= 2) learnScore += 0.8;
    else if (startup.pivots_made && startup.pivots_made >= 1) learnScore += 0.5;
    
    // Problem depth implies learning
    if (startup.problem_discovery_depth === 'deep') learnScore += 0.8;
    else if (startup.problem_discovery_depth === 'moderate') learnScore += 0.4;
  }
  
  score += Math.min(learnScore, 3);
  
  return Math.min(score, 15); // Cap at 15 points
}

// ============================================
// YC SMELL TEST SCORING (0-10)
// Quick heuristic assessments that YC uses
// ============================================

function calculateSmellTestBonus(startup, investor) {
  let smellScore = 0;
  
  // Check if investor is YC-style (values these tests more)
  const investorName = (investor.name || '').toLowerCase();
  const isYCStyle = investorName.includes('y combinator') || 
                    investorName.includes('yc ') ||
                    investorName.includes('techstars') ||
                    investorName.includes('500') ||
                    investorName.includes('accelerator');
  
  // Multiplier for YC-style investors
  const multiplier = isYCStyle ? 1.5 : 1.0;
  
  // 1. LEAN TEST (0-2): Could 2 people build this in 3 months?
  // VCs love capital-efficient startups
  if (startup.smell_test_lean === true) {
    smellScore += 2 * multiplier;
  } else if (startup.build_complexity === 'simple') {
    smellScore += 1.5 * multiplier;
  } else if (startup.build_complexity === 'moderate') {
    smellScore += 0.5 * multiplier;
  }
  // Complex/enterprise = no bonus (but not a penalty)
  
  // 2. USER PASSION TEST (0-2): Do users sound emotionally attached?
  // Passionate users = viral growth potential
  if (startup.smell_test_user_passion === true) {
    smellScore += 2 * multiplier;
  } else if (startup.organic_word_of_mouth === true) {
    smellScore += 1.5 * multiplier;
  } else if (startup.user_testimonial_sentiment === 'passionate') {
    smellScore += 1 * multiplier;
  }
  
  // 3. LEARNING IN PUBLIC TEST (0-2): Is the founder learning in public?
  // Transparency = good for community, fundraising, hiring
  if (startup.smell_test_learning_public === true) {
    smellScore += 2 * multiplier;
  } else if (startup.founder_twitter_active === true || startup.founder_blog_active === true) {
    smellScore += 1 * multiplier;
  } else if (startup.build_in_public === true) {
    smellScore += 1.5 * multiplier;
  }
  
  // 4. INEVITABLE TEST (0-2): Does this feel early but inevitable?
  // Timing is everything - "Why now?" question
  if (startup.smell_test_inevitable === true) {
    smellScore += 2 * multiplier;
  } else if (startup.market_timing_score && startup.market_timing_score >= 8) {
    smellScore += 1.5 * multiplier;
  } else if (startup.market_timing_score && startup.market_timing_score >= 6) {
    smellScore += 0.5 * multiplier;
  }
  
  // 5. MASSIVE IF WORKS TEST (0-2): Could this be massive if it works?
  // VCs need venture-scale returns
  if (startup.smell_test_massive_if_works === true) {
    smellScore += 2 * multiplier;
  } else if (startup.tam_estimate === '$100B+') {
    smellScore += 2 * multiplier;
  } else if (startup.tam_estimate === '$10B+') {
    smellScore += 1 * multiplier;
  } else if (startup.tam_estimate === '$1B+') {
    smellScore += 0.5 * multiplier;
  }
  
  // COMPOSITE: Direct smell_test_score provides quick override
  if (startup.smell_test_score !== null && startup.smell_test_score !== undefined) {
    // If they have a 5/5, they pass all quick tests
    if (startup.smell_test_score >= 5) {
      return 10; // Max score
    } else if (startup.smell_test_score >= 4) {
      return Math.max(smellScore, 8);
    } else if (startup.smell_test_score >= 3) {
      return Math.max(smellScore, 6);
    }
  }
  
  return Math.min(smellScore, 10); // Cap at 10 points
}

function isTechFocusedVC(investor) {
  const techSectors = ['saas', 'ai', 'software', 'developer', 'enterprise'];
  const sectors = (investor.sectors || []).map(s => s.toLowerCase());
  return sectors.some(s => techSectors.some(t => s.includes(t)));
}

function determineConfidence(score, investorTier, startupScore) {
  // High confidence requires:
  // 1. Good match score (70+)
  // 2. Startup quality matches investor tier expectation
  
  if (investorTier === 'elite') {
    if (score >= 75 && startupScore >= 80) return 'high';
    if (score >= 60 && startupScore >= 70) return 'medium';
    return 'low';
  }
  
  if (investorTier === 'strong') {
    if (score >= 65 && startupScore >= 60) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
  
  // Solid/Emerging
  if (score >= 60) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

async function generateSelectiveMatches() {
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 SELECTIVE MATCHING ENGINE v4 - YC PHILOSOPHY');
  console.log('═'.repeat(80));
  console.log('\nPhilosophy: "We fund founders, not ideas" - YC\n');
  console.log('Priority: Speed ⭐⭐⭐⭐⭐ > Insight ⭐⭐⭐⭐ > User Love ⭐⭐⭐ > Traction ⭐⭐\n');
  
  // Get startups with scores (including YC-style fields and smell tests)
  const { data: startups } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, sectors, stage, pitch, description, tagline,
             total_god_score, team_score, traction_score, market_score, 
             product_score, vision_score, has_technical_cofounder,
             revenue_annual, mrr, is_launched, raise_amount,
             founder_avg_age, founder_youngest_age, founders_under_30, 
             founders_under_25, first_time_founders,
             -- Sales velocity metrics
             arr, arr_growth_rate, customer_count, customer_growth_monthly,
             sales_cycle_days, cac, ltv, ltv_cac_ratio, nrr,
             time_to_first_revenue_months, months_to_1m_arr,
             -- YC-style metrics (Speed & Execution)
             days_from_idea_to_mvp, features_shipped_last_month, deployment_frequency,
             -- YC-style metrics (Unique Insight)
             contrarian_belief, why_now, unfair_advantage,
             -- YC-style metrics (User Love)
             nps_score, users_who_would_be_very_disappointed, organic_referral_rate,
             -- YC-style metrics (Learning Velocity)
             experiments_run_last_month, hypotheses_validated, pivot_speed_days,
             customer_feedback_frequency, pivots_made, problem_discovery_depth,
             -- YC Smell Tests (Quick Binary Assessments)
             smell_test_lean, smell_test_user_passion, smell_test_learning_public,
             smell_test_inevitable, smell_test_massive_if_works, smell_test_score,
             tam_estimate, market_timing_score, enabling_technology
      FROM startup_uploads 
      WHERE status = 'approved' AND total_god_score IS NOT NULL
      ORDER BY total_god_score DESC
    `
  });
  
  // Get investors with scores
  const { data: investors } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, sectors, stage, investor_score, investor_tier
      FROM investors 
      WHERE investor_score IS NOT NULL
      ORDER BY investor_score DESC
    `
  });
  
  console.log(`📊 ${startups?.length || 0} startups × ${investors?.length || 0} investors\n`);
  
  if (!startups?.length || !investors?.length) {
    console.log('❌ No data to match');
    return;
  }
  
  // BUG FIX: DO NOT truncate - use upsert to preserve existing matches
  // This prevents loss of matches when script only processes a subset
  console.log('💾 Using upsert to update matches (preserving all existing matches)\n');
  
  // Track statistics
  const stats = {
    total: 0,
    byTier: { elite: 0, strong: 0, solid: 0, emerging: 0 },
    rejected: { elite: 0, strong: 0, solid: 0, emerging: 0 },
    byConfidence: { high: 0, medium: 0, low: 0 },
    avgScoreByTier: { elite: [], strong: [], solid: [], emerging: [] }
  };
  
  const allMatches = [];
  const investorMatchCounts = new Map();
  
  // Process each investor
  for (const investor of investors) {
    const tier = investor.investor_tier || 'emerging';
    const maxMatches = CONFIG.MAX_MATCHES_PER_INVESTOR[tier] || 50;
    let matchCount = 0;
    
    // Sort startups by quality for this investor
    const rankedStartups = startups
      .map(startup => ({
        startup,
        ...calculateSelectiveMatch(startup, investor)
      }))
      .filter(m => !m.rejected && m.score >= 40) // Minimum viable match
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMatches);
    
    for (const match of rankedStartups) {
      allMatches.push({
        startup_id: match.startup.id,
        investor_id: investor.id,
        match_score: match.score,
        confidence_level: match.confidence,
        reasoning: generateReasoning(match, investor),
        fit_analysis: {
          ...match.scores,
          investor_tier: tier,
          startup_tier: match.startup.total_god_score >= 80 ? 'elite' : 
                       match.startup.total_god_score >= 60 ? 'strong' : 'solid'
        }
      });
      
      stats.total++;
      stats.byTier[tier]++;
      stats.byConfidence[match.confidence]++;
      stats.avgScoreByTier[tier].push(match.score);
      matchCount++;
    }
    
    // Track rejections
    const rejectedCount = startups.length - rankedStartups.length;
    stats.rejected[tier] += rejectedCount;
    
    investorMatchCounts.set(investor.id, matchCount);
  }
  
  // Batch insert
  console.log('💾 Saving matches...\n');
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < allMatches.length; i += BATCH_SIZE) {
    const batch = allMatches.slice(i, i + BATCH_SIZE);
    const values = batch.map(m => 
      `('${m.startup_id}', '${m.investor_id}', ${m.match_score}, '${m.confidence_level}', '${m.reasoning.replace(/'/g, "''")}', '${JSON.stringify(m.fit_analysis).replace(/'/g, "''")}', NOW())`
    ).join(',\n');
    
    // BUG FIX: Use INSERT ... ON CONFLICT to handle duplicates (upsert behavior)
    // This preserves existing matches and only updates when conflict occurs
    await supabase.rpc('exec_sql_modify', {
      sql_query: `
        INSERT INTO startup_investor_matches 
        (startup_id, investor_id, match_score, confidence_level, reasoning, fit_analysis, created_at)
        VALUES ${values}
        ON CONFLICT (startup_id, investor_id) 
        DO UPDATE SET 
          match_score = EXCLUDED.match_score,
          confidence_level = EXCLUDED.confidence_level,
          reasoning = EXCLUDED.reasoning,
          fit_analysis = EXCLUDED.fit_analysis,
          updated_at = NOW()
        -- NOTE: created_at is NOT updated - preserves original creation time
      `
    });
    
    process.stdout.write(`\r   ${Math.min(i + BATCH_SIZE, allMatches.length)}/${allMatches.length}`);
  }
  
  // Print results
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 SELECTIVE MATCHING RESULTS');
  console.log('═'.repeat(80));
  
  console.log(`\n✅ Total Matches: ${stats.total}`);
  console.log(`   (Down from ${startups.length * investors.length} possible = ${((stats.total / (startups.length * investors.length)) * 100).toFixed(1)}% selectivity)\n`);
  
  console.log('📈 Matches by Investor Tier:');
  for (const tier of ['elite', 'strong', 'solid', 'emerging']) {
    const count = stats.byTier[tier];
    const rejected = stats.rejected[tier];
    const avgScore = stats.avgScoreByTier[tier].length > 0 
      ? (stats.avgScoreByTier[tier].reduce((a, b) => a + b, 0) / stats.avgScoreByTier[tier].length).toFixed(1)
      : 'N/A';
    const icon = tier === 'elite' ? '🏆' : tier === 'strong' ? '💪' : tier === 'solid' ? '✓' : '🌱';
    console.log(`   ${icon} ${tier.padEnd(10)} ${count} matches (avg ${avgScore}), ${rejected} rejected`);
  }
  
  console.log('\n🎯 Matches by Confidence:');
  console.log(`   🔥 High:   ${stats.byConfidence.high} (${((stats.byConfidence.high / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   ⚡ Medium: ${stats.byConfidence.medium} (${((stats.byConfidence.medium / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   ❄️  Low:    ${stats.byConfidence.low} (${((stats.byConfidence.low / stats.total) * 100).toFixed(1)}%)`);
  
  // Show sample elite matches
  console.log('\n🏆 Sample Elite Investor Matches:');
  const eliteMatches = allMatches
    .filter(m => m.fit_analysis.investor_tier === 'elite')
    .slice(0, 5);
  
  for (const m of eliteMatches) {
    const startup = startups.find(s => s.id === m.startup_id);
    const investor = investors.find(i => i.id === m.investor_id);
    console.log(`   ${investor?.name} ↔ ${startup?.name} (${m.match_score}% - ${m.confidence_level})`);
  }
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

function generateReasoning(match, investor) {
  const parts = [];
  
  if (match.scores.startup_quality >= 25) {
    parts.push('High-quality startup');
  }
  
  if (match.scores.sector_fit >= 20) {
    parts.push('Strong sector alignment');
  }
  
  if (match.scores.vibe >= 10) {
    parts.push('Compelling narrative');
  }
  
  if (investor.investor_tier === 'elite') {
    parts.push(`Elite investor match`);
  }
  
  if (match.confidence === 'high') {
    parts.push('High confidence fit');
  }
  
  return parts.join('; ') || 'Potential alignment';
}

generateSelectiveMatches().catch(console.error);
