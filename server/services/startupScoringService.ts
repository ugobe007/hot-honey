/**
 * STARTUP SCORING SERVICE
 * Evaluates startups based on VC criteria (YC, Sequoia, Founders Fund, First Round, Seed/Angel)
 * Scores 1-10 where 10 = hottest investment opportunity
 * 
 * Seed/Angel investors added: Focus on team & vision, product-market fit, early traction,
 * clear go-to-market, and financial planning (12-18 month runway).
 * 
 * FOUNDER AGE FACTOR: Younger founders (under 30) get bonus points for adaptability,
 * coachability, and hunger. This reflects real VC preferences (YC, Thiel Fellowship, etc.)
 */

interface StartupProfile {
  // Team
  team?: Array<{
    name: string;
    role: string;
    background?: string;
    previousCompanies?: string[];
    education?: string;
    age?: number; // Founder age if known
  }>;
  founders_count?: number;
  technical_cofounders?: number;
  
  // Founder Age (NEW)
  founder_avg_age?: number;
  founder_youngest_age?: number;
  founders_under_30?: number;
  founders_under_25?: number;
  first_time_founders?: boolean;
  
  // Traction
  revenue?: number;
  mrr?: number;
  active_users?: number;
  growth_rate?: number; // Monthly % growth
  customers?: number;
  signed_contracts?: number;
  
  // Seed/Angel specific metrics
  churn_rate?: number; // Monthly churn %
  retention_rate?: number; // Monthly retention %
  prepaying_customers?: number; // Customers who paid upfront
  gmv?: number; // Gross merchandise value
  
  // Sales Velocity Metrics (NEW)
  arr?: number; // Annual Recurring Revenue
  arr_growth_rate?: number; // YoY ARR growth %
  customer_count?: number; // Total customers
  customer_growth_monthly?: number; // MoM customer growth %
  sales_cycle_days?: number; // Average sales cycle length
  cac?: number; // Customer Acquisition Cost
  ltv?: number; // Lifetime Value
  ltv_cac_ratio?: number; // LTV/CAC ratio (>3 is healthy)
  nrr?: number; // Net Revenue Retention % (>100 is expansion)
  time_to_first_revenue_months?: number; // Months from founding to first $
  months_to_1m_arr?: number; // Months to reach $1M ARR
  
  // Product
  demo_available?: boolean;
  launched?: boolean;
  unique_ip?: boolean;
  defensibility?: string; // 'high', 'medium', 'low'
  mvp_stage?: boolean; // Has moved beyond concept to tangible MVP
  
  // Market
  market_size?: number; // TAM in billions
  industries?: string[];
  problem?: string;
  solution?: string;
  
  // First Round Capital criteria
  contrarian_insight?: string; // What do they understand differently?
  creative_strategy?: string; // Unique go-to-market or product approach
  passionate_customers?: number; // Small group of early advocates
  vision_statement?: string; // Founder's unique vision
  
  // NEW: Ecosystem & Partnerships (Mitsubishi Chemical VC criteria)
  strategic_partners?: Array<{
    name: string;
    type: 'distribution' | 'technology' | 'referral' | 'integration' | 'supplier';
    relationship_stage: 'prospect' | 'pilot' | 'signed' | 'revenue_generating';
    description?: string;
  }>;
  advisors?: Array<{
    name: string;
    background: string;
    role: string;
  }>;
  platform_dependencies?: string[]; // e.g., ['OpenAI', 'AWS', 'Stripe']
  
  // NEW: Grit & Adaptability
  pivots_made?: number; // How many times they've pivoted
  pivot_history?: Array<{
    from: string;
    to: string;
    reason: string;
    months_ago: number;
  }>;
  customer_feedback_frequency?: 'daily' | 'weekly' | 'monthly' | 'rarely'; // How often they talk to customers
  time_to_iterate_days?: number; // How fast they ship updates based on feedback
  
  // NEW: Deep Customer Problem Validation (Your #1 criterion)
  customer_interviews_conducted?: number;
  customer_pain_data?: {
    cost_of_problem?: number; // $ impact on customer
    time_wasted_hours?: number; // Time impact
    frequency?: 'daily' | 'weekly' | 'monthly'; // How often pain occurs
    willingness_to_pay_validated?: boolean; // Do customers say they'll pay?
  };
  icp_clarity?: 'vague' | 'moderate' | 'crystal_clear'; // How well-defined is ideal customer profile
  problem_discovery_depth?: 'surface' | 'moderate' | 'deep'; // How well do they understand the problem
  
  // YC-STYLE METRICS (Fund founders, not ideas)
  // Speed & Execution
  weeks_since_idea?: number; // How long since they started
  features_shipped_last_month?: number; // Velocity of shipping
  days_from_idea_to_mvp?: number; // Speed to first product
  deployment_frequency?: 'daily' | 'weekly' | 'monthly' | 'rarely'; // How often they ship
  
  // Unique Insight (Non-obvious thesis)
  contrarian_belief?: string; // What do they believe that others don't?
  why_now?: string; // Why is this the right time?
  unfair_advantage?: string; // What makes them uniquely suited?
  
  // User Love (Quality > Quantity)
  nps_score?: number; // Net Promoter Score (0-100)
  users_who_would_be_very_disappointed?: number; // Sean Ellis test %
  organic_referral_rate?: number; // % of users from word of mouth
  daily_active_users?: number; // DAU
  weekly_active_users?: number; // WAU
  dau_wau_ratio?: number; // DAU/WAU engagement ratio
  
  // Learning Velocity
  experiments_run_last_month?: number; // How many tests they ran
  hypotheses_validated?: number; // Learnings captured
  pivot_speed_days?: number; // How fast they adapt
  
  // Stage & Funding
  stage?: number;
  previous_funding?: number;
  backed_by?: string[]; // Other investors
  
  // Seed/Angel specific - Financial planning
  funding_needed?: number; // How much they're raising
  runway_months?: number; // How long current funding lasts
  burn_rate?: number; // Monthly expenses
  use_of_funds?: string; // Clear plan for capital deployment
  next_milestone?: string; // What they'll achieve with this funding
  
  // Metadata
  founded_date?: string;
  tagline?: string;
  pitch?: string;
}

interface HotScore {
  total: number; // 1-12 (expanded scoring)
  breakdown: {
    team: number; // 0-3
    traction: number; // 0-3
    market: number; // 0-2
    product: number; // 0-2
    vision: number; // 0-2
    ecosystem: number; // 0-1.5
    grit: number; // 0-1.5
    problem_validation: number; // 0-2
    founder_age: number; // 0-1.5 - Youth bonus
    sales_velocity: number; // 0-2 - Speed of customer adoption
    // YC-STYLE SCORING (Fund founders, not ideas)
    founder_speed: number; // 0-3 ⭐⭐⭐⭐⭐ - Execution velocity
    unique_insight: number; // 0-2.5 ⭐⭐⭐⭐ - Non-obvious thesis
    user_love: number; // 0-2 ⭐⭐⭐ - Quality of engagement
    learning_velocity: number; // 0-1.5 - How fast they learn & adapt
  };
  matchCount: number; // How many investors to match (5-20)
  reasoning: string[];
  tier: 'hot' | 'warm' | 'cold';
}

/**
 * Main scoring function - evaluates startup quality
 */
export function calculateHotScore(startup: StartupProfile): HotScore {
  // QUICK FIX: Base score boost for all startups with ANY content
  // This prevents scores of 0/100 and gives credit for basic presence
  let baseBoost = 0;
  
  // 🔥 VIBE SCORE - Qualitative story/narrative bonus (RESTORED WEIGHT)
  // VIBE = Value proposition + Insight + Business model + Execution + market
  // This measures "fundability" - the intangibles that make VCs say yes
  let vibeBonus = 0;
  const startupAny = startup as any; // Cast to access VIBE fields
  
  // 1. Problem/Value Proposition (0-0.6 points) - THE HOOK
  // Elite VCs need to understand the problem in 30 seconds
  if (startupAny.value_proposition || startupAny.problem) {
    const problemText = startupAny.value_proposition || startupAny.problem || '';
    const problemLength = problemText.length;
    if (problemLength > 200) vibeBonus += 0.6; // Deep understanding
    else if (problemLength > 100) vibeBonus += 0.4; // Good clarity
    else if (problemLength > 50) vibeBonus += 0.2;
    else if (problemLength > 0) vibeBonus += 0.1;
  }
  
  // 2. Solution Clarity (0-0.6 points) - THE AHA MOMENT
  // Does the solution feel inevitable? Is it 10x better?
  if (startupAny.solution) {
    const solutionLength = startupAny.solution.length;
    if (solutionLength > 200) vibeBonus += 0.6; // Clear, detailed solution
    else if (solutionLength > 100) vibeBonus += 0.4;
    else if (solutionLength > 50) vibeBonus += 0.2;
    else if (solutionLength > 0) vibeBonus += 0.1;
  }
  
  // 3. Market Understanding (0-0.5 points) - KNOWS THE BATTLEFIELD
  // Do they understand TAM/SAM/SOM? Market dynamics?
  if (startupAny.market_size) {
    if (typeof startupAny.market_size === 'string' && startupAny.market_size.length > 50) {
      vibeBonus += 0.5; // Detailed market analysis
    } else if (startupAny.market_size) {
      vibeBonus += 0.3; // Basic market understanding
    }
  }
  
  // 4. Team Pedigree (0-0.8 points) - THE RIGHT STUFF
  // FAANG, Stanford, YC alumni, serial founders = instant credibility
  if (startupAny.team_companies && Array.isArray(startupAny.team_companies)) {
    const topCompanies = ['google', 'meta', 'apple', 'amazon', 'microsoft', 'stripe', 'airbnb', 'uber'];
    const teamComps = startupAny.team_companies.map((c: string) => c.toLowerCase());
    const hasTopTier = teamComps.some((c: string) => topCompanies.some(t => c.includes(t)));
    
    if (hasTopTier) vibeBonus += 0.8; // Tier 1 pedigree
    else if (startupAny.team_companies.length >= 3) vibeBonus += 0.5;
    else if (startupAny.team_companies.length >= 1) vibeBonus += 0.3;
  }
  
  // 5. Pitch Quality (0-0.5 points) - STORYTELLING MATTERS
  // Can they communicate their vision compellingly?
  if (startupAny.pitch) {
    const pitchLength = startupAny.pitch.length;
    if (pitchLength > 300) vibeBonus += 0.5; // Compelling narrative
    else if (pitchLength > 150) vibeBonus += 0.3;
    else if (pitchLength > 50) vibeBonus += 0.15;
  }
  
  // 6. Investment Clarity (0-0.3 points) - KNOWS WHAT THEY NEED
  if (startupAny.raise_amount || startupAny.funding_needed) {
    vibeBonus += 0.3;
  }
  
  // 7. Technical Cofounder (0-0.7 points) - CRITICAL FOR TECH STARTUPS
  // a16z, Sequoia etc. almost never fund non-technical tech teams
  if (startupAny.technical_cofounders > 0 || startupAny.has_technical_cofounder) {
    vibeBonus += 0.7;
  }
  
  // Total VIBE bonus: up to 4.0 points (significant impact on final score)
  // VIBE is now ~21% of total possible score (4 out of 19 points)
  baseBoost += Math.min(vibeBonus, 4.0);
  
  // Give points for having basic content
  if (startup.team && startup.team.length > 0) baseBoost += 1;
  if (startup.launched || startup.demo_available) baseBoost += 1;
  if (startup.industries && startup.industries.length > 0) baseBoost += 0.5;
  if (startup.problem || startup.solution) baseBoost += 0.5;
  if (startup.tagline || startup.pitch) baseBoost += 0.5;
  if (startup.founded_date) baseBoost += 0.5;
  
  // CRITICAL FIX: Minimum base boost of 17 points so startups score at least 50/100
  // Math: 17 / 34.5 * 10 = 4.9 (~50/100)
  // This accounts for all the GRIT/execution fields that are typically empty in scraped data
  // Without this, startups with sparse data crater to 20-30 scores
  baseBoost = Math.max(baseBoost, 17);
  
  const teamScore = scoreTeam(startup);
  const tractionScore = scoreTraction(startup);
  const marketScore = scoreMarket(startup);
  const productScore = scoreProduct(startup);
  const visionScore = scoreVision(startup);
  const ecosystemScore = scoreEcosystem(startup);
  const gritScore = scoreGrit(startup);
  const problemValidationScore = scoreProblemValidation(startup);
  const founderAgeScore = scoreFounderAge(startup);
  const salesVelocityScore = scoreSalesVelocity(startup);
  
  // YC-STYLE SCORING (Fund founders, not ideas)
  const founderSpeedScore = scoreFounderSpeed(startup); // ⭐⭐⭐⭐⭐ - Most important
  const uniqueInsightScore = scoreUniqueInsight(startup); // ⭐⭐⭐⭐
  const userLoveScore = scoreUserLove(startup); // ⭐⭐⭐
  const learningVelocityScore = scoreLearningVelocity(startup); // How fast they adapt
  
  // YC-WEIGHTED Total:
  // Old: 5 (base) + 3 + 3 + 2 + 2 + 2 + 1.5 + 1.5 + 2 + 1.5 + 2 = 25.5
  // New: + 3 (speed) + 2.5 (insight) + 2 (love) + 1.5 (learning) = 34.5 points
  // 
  // YC weights execution > traction, so we scale accordingly
  const rawTotal = baseBoost + teamScore + tractionScore + marketScore + productScore + visionScore + 
                   ecosystemScore + gritScore + problemValidationScore + founderAgeScore + salesVelocityScore +
                   founderSpeedScore + uniqueInsightScore + userLoveScore + learningVelocityScore;
  const total = Math.min((rawTotal / 34.5) * 10, 10); // Normalize to 10-point scale
  
  // Dynamic match count based on score
  let matchCount = 5; // Default
  if (total >= 9) matchCount = 20; // Super hot - maximum matches
  else if (total >= 7) matchCount = 15; // Hot - many matches
  else if (total >= 5) matchCount = 10; // Warm - more matches
  
  const tier = total >= 7 ? 'hot' : total >= 4 ? 'warm' : 'cold';
  
  return {
    total,
    breakdown: {
      team: teamScore,
      traction: tractionScore,
      market: marketScore,
      product: productScore,
      vision: visionScore,
      ecosystem: ecosystemScore,
      grit: gritScore,
      problem_validation: problemValidationScore,
      founder_age: founderAgeScore,
      sales_velocity: salesVelocityScore,
      // YC-STYLE SCORING
      founder_speed: founderSpeedScore,
      unique_insight: uniqueInsightScore,
      user_love: userLoveScore,
      learning_velocity: learningVelocityScore
    },
    matchCount,
    reasoning: generateReasoning(startup, { 
      baseBoost,
      teamScore, 
      tractionScore, 
      marketScore, 
      productScore, 
      visionScore,
      ecosystemScore,
      gritScore,
      problemValidationScore,
      founderAgeScore,
      salesVelocityScore,
      founderSpeedScore,
      uniqueInsightScore,
      userLoveScore,
      learningVelocityScore
    }),
    tier
  };
}

/**
 * TEAM SCORING (0-3 points)
 * Based on YC/Sequoia/Founders Fund criteria
 */
function scoreTeam(startup: StartupProfile): number {
  let score = 0;
  const reasons: string[] = [];
  
  // Technical co-founders (YC priority)
  if (startup.technical_cofounders && startup.founders_count) {
    const techRatio = startup.technical_cofounders / startup.founders_count;
    if (techRatio >= 0.5) {
      score += 1;
      reasons.push('Strong technical team');
    }
  }
  
  // Pedigree & experience (Sequoia/FF)
  if (startup.team && Array.isArray(startup.team) && startup.team.length > 0) {
    const hasTopTierBackground = startup.team.some(member => 
      member.previousCompanies?.some(company => 
        ['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Tesla', 'SpaceX', 'Stripe', 'OpenAI'].some(
          topCo => company.toLowerCase().includes(topCo.toLowerCase())
        )
      ) ||
      member.education?.toLowerCase().includes('stanford') ||
      member.education?.toLowerCase().includes('mit') ||
      member.education?.toLowerCase().includes('harvard')
    );
    
    if (hasTopTierBackground) {
      score += 1;
      reasons.push('Top-tier founder pedigree');
    }
    
    // Domain expertise
    const hasRelevantExperience = startup.team.some(member =>
      member.background && startup.industries?.some(industry =>
        member.background?.toLowerCase().includes(industry.toLowerCase())
      )
    );
    
    if (hasRelevantExperience) {
      score += 0.5;
      reasons.push('Domain expertise');
    }
  }
  
  // Young founders (under 30) - "chip on shoulder" mentality
  // If we had age data, would add 0.5 points
  
  return Math.min(score, 3);
}

/**
 * TRACTION SCORING (0-3 points)
 * YC: "Proof of progress and traction"
 * Sequoia: "Measurable progress, growth, and social proof"
 * Seed/Angel: "Early traction with repeatability indicators"
 */
function scoreTraction(startup: StartupProfile): number {
  let score = 0;
  
  // Revenue traction
  if (startup.revenue || startup.mrr || startup.gmv) {
    const annualRevenue = startup.revenue || (startup.mrr! * 12);
    const gmv = startup.gmv || 0;
    const bestMetric = Math.max(annualRevenue, gmv);
    
    if (bestMetric >= 1000000) score += 1.5; // $1M+ ARR/GMV
    else if (bestMetric >= 100000) score += 1; // $100K+ ARR/GMV
    else if (bestMetric > 0) score += 0.5; // Any revenue
  }
  
  // Growth rate (critical for Sequoia & Seed investors)
  if (startup.growth_rate) {
    if (startup.growth_rate >= 30) score += 1; // 30%+ MoM - exceptional
    else if (startup.growth_rate >= 20) score += 0.75; // 20%+ MoM - great
    else if (startup.growth_rate >= 15) score += 0.5; // 15%+ MoM - seed benchmark
    else if (startup.growth_rate >= 10) score += 0.25; // 10%+ MoM - decent
  }
  
  // Retention & churn (Seed/Angel: "evidence of repeatability")
  if (startup.retention_rate && startup.retention_rate >= 80) {
    score += 0.5; // High retention = product-market fit
  } else if (startup.churn_rate && startup.churn_rate <= 5) {
    score += 0.5; // Low churn = sticky product
  }
  
  // User/customer traction
  if (startup.active_users) {
    if (startup.active_users >= 10000) score += 0.5;
    else if (startup.active_users >= 1000) score += 0.25;
  }
  
  // Pre-paying customers (Seed/Angel: "leading indicator")
  if (startup.prepaying_customers) {
    if (startup.prepaying_customers >= 10) score += 0.5;
    else if (startup.prepaying_customers >= 3) score += 0.25;
  } else if (startup.customers || startup.signed_contracts) {
    if ((startup.customers || 0) >= 10 || (startup.signed_contracts || 0) >= 5) {
      score += 0.5;
    }
  }
  
  // Social proof - backed by reputable investors
  if (startup.backed_by && startup.backed_by.length > 0) {
    const hasTopInvestor = startup.backed_by.some(inv =>
      ['yc', 'y combinator', 'sequoia', 'a16z', 'andreessen', 'founders fund'].some(
        top => inv.toLowerCase().includes(top)
      )
    );
    if (hasTopInvestor) score += 0.5;
  }
  
  return Math.min(score, 3);
}

/**
 * MARKET SCORING (0-2 points)
 * YC: "Solving a real problem"
 * Sequoia: "Important problem in a market with massive growth potential"
 * Seed/Angel: "Large market opportunity with competitive edge"
 */
function scoreMarket(startup: StartupProfile): number {
  let score = 0;
  
  // Hot sectors (fintech, AI, biotech, deep tech, climate)
  const hotSectors = ['ai', 'artificial intelligence', 'fintech', 'biotech', 'climate', 'deep tech', 'crypto', 'web3'];
  const isHotSector = startup.industries?.some(industry =>
    hotSectors.some(hot => industry.toLowerCase().includes(hot))
  );
  
  if (isHotSector) score += 1;
  
  // Market size (TAM) - Seed/Angel: "sufficiently large market"
  if (startup.market_size) {
    if (startup.market_size >= 10) score += 1; // $10B+ TAM - massive
    else if (startup.market_size >= 1) score += 0.5; // $1B+ TAM - substantial
    else if (startup.market_size >= 0.1) score += 0.25; // $100M+ TAM - viable for seed
  }
  
  // Clear problem/solution articulation (Seed: "compelling story")
  if (startup.problem && startup.solution) {
    if (startup.problem.length > 50 && startup.solution.length > 50) {
      score += 0.5; // Well-articulated
    }
  }
  
  return Math.min(score, 2);
}

/**
 * PRODUCT SCORING (0-2 points)
 * YC: "Having a working demo"
 * FF: "Cool IP or new business model"
 * Seed/Angel: "MVP demonstrates idea has moved beyond conceptual stage"
 */
function scoreProduct(startup: StartupProfile): number {
  let score = 0;
  
  // MVP stage (Seed/Angel: critical indicator)
  if (startup.mvp_stage || startup.launched) score += 0.5;
  if (startup.demo_available) score += 0.5;
  
  // Unique IP / defensibility
  if (startup.unique_ip) score += 0.5;
  if (startup.defensibility === 'high') score += 0.5;
  else if (startup.defensibility === 'medium') score += 0.25;
  
  return Math.min(score, 2);
}

/**
 * VISION SCORING (0-1.5 BONUS points)
 * First Round Capital: Contrarian insight, creative strategy, passionate early customers
 * Seed/Angel: Clear go-to-market strategy, financial planning
 * This allows pre-revenue startups to score high based on unique vision & planning
 */
function scoreVision(startup: StartupProfile): number {
  let score = 0;
  
  // Contrarian insight (0.5 points)
  // First Round: "compelling, contrarian insight into a market"
  if (startup.contrarian_insight && startup.contrarian_insight.length > 100) {
    score += 0.5;
  }
  
  // Creative strategy (0.5 points)
  // First Round & Seed: "thoughtful, creative go-to-market and product strategy"
  if (startup.creative_strategy && startup.creative_strategy.length > 100) {
    score += 0.5;
  }
  
  // Passionate early customers (0.25 points)
  // First Round: "small group of passionate early customers is a plus"
  if (startup.passionate_customers && startup.passionate_customers >= 3) {
    score += 0.25;
  }
  
  // Financial planning (0.5 points)
  // Seed/Angel: "clear understanding of funding needs and use of funds"
  const hasFinancialPlan = startup.use_of_funds && startup.use_of_funds.length > 50;
  const hasRunway = startup.runway_months && startup.runway_months >= 12 && startup.runway_months <= 18;
  const knowsBurnRate = startup.burn_rate && startup.burn_rate > 0;
  
  if (hasFinancialPlan && (hasRunway || knowsBurnRate)) {
    score += 0.5; // Full financial planning
  } else if (hasFinancialPlan || hasRunway) {
    score += 0.25; // Partial planning
  }
  
  // Clear vision statement (0.25 points)
  // First Round: "founder's unique vision"
  if (startup.vision_statement && startup.vision_statement.length > 50) {
    score += 0.25;
  }
  
  return Math.min(score, 2); // Increased cap from 1.5 to 2.0 to account for financial planning
}

/**
 * ECOSYSTEM SCORING (0-1.5 points) - NEW
 * Mitsubishi Chemical VC criterion: "Who they partner with to deliver their product/services"
 * Strong ecosystem = faster GTM, lower CAC, higher defensibility
 */
function scoreEcosystem(startup: StartupProfile): number {
  let score = 0;
  
  // Strategic partnerships (0-0.75 points)
  if (startup.strategic_partners && startup.strategic_partners.length > 0) {
    const activePartners = startup.strategic_partners.filter(p => 
      p.relationship_stage === 'signed' || p.relationship_stage === 'revenue_generating'
    );
    
    // Revenue-generating partnerships are GOLD
    const revenuePartners = activePartners.filter(p => p.relationship_stage === 'revenue_generating');
    if (revenuePartners.length >= 2) {
      score += 0.75; // Multiple partners driving revenue = exceptional
    } else if (revenuePartners.length === 1) {
      score += 0.5; // One partner driving revenue = strong
    } else if (activePartners.length >= 3) {
      score += 0.4; // Multiple signed partnerships = good
    } else if (activePartners.length >= 1) {
      score += 0.25; // Some partnerships = moderate
    }
    
    // Distribution partnerships are especially valuable
    const distributionPartners = activePartners.filter(p => p.type === 'distribution');
    if (distributionPartners.some(p => p.relationship_stage === 'revenue_generating')) {
      score += 0.25; // Bonus: someone is selling for them
    }
  }
  
  // Advisor quality (0-0.5 points)
  if (startup.advisors && startup.advisors.length > 0) {
    // Check for notable advisors (Fortune 500 execs, successful founders, domain experts)
    const notableKeywords = ['ceo', 'cto', 'founder', 'vp', 'director', 'professor', 'phd'];
    const hasNotableAdvisors = startup.advisors.some(advisor =>
      notableKeywords.some(kw => 
        advisor.background.toLowerCase().includes(kw) || 
        advisor.role.toLowerCase().includes(kw)
      )
    );
    
    if (startup.advisors.length >= 3 && hasNotableAdvisors) {
      score += 0.5; // Strong advisory board
    } else if (hasNotableAdvisors) {
      score += 0.3; // Some notable advisors
    } else if (startup.advisors.length >= 2) {
      score += 0.2; // Has advisors
    }
  }
  
  // Platform dependency risk (0 to -0.25 penalty)
  if (startup.platform_dependencies && startup.platform_dependencies.length > 0) {
    // Heavy dependency on external platforms is risky
    const riskPlatforms = ['openai', 'chatgpt', 'aws', 'google cloud'];
    const highRiskDependencies = startup.platform_dependencies.filter(dep =>
      riskPlatforms.some(risk => dep.toLowerCase().includes(risk))
    );
    
    if (highRiskDependencies.length >= 3) {
      score -= 0.25; // Too dependent on external platforms
    } else if (highRiskDependencies.length >= 2) {
      score -= 0.15;
    }
  }
  
  return Math.max(Math.min(score, 1.5), 0);
}

/**
 * GRIT & ADAPTABILITY SCORING (0-1.5 points) - NEW
 * Mitsubishi Chemical VC criterion: "How well they adapt and pivot to customer/market needs"
 * Measures founder resilience, customer obsession, speed of iteration
 */
function scoreGrit(startup: StartupProfile): number {
  let score = 0;
  let hasAnyData = false;
  
  // Pivot history - intelligent pivots are GOOD (0-0.5 points)
  if (startup.pivots_made !== undefined && startup.pivot_history) {
    hasAnyData = true;
    if (startup.pivots_made === 1 || startup.pivots_made === 2) {
      // 1-2 pivots = learning and adapting (GOOD)
      score += 0.5;
    } else if (startup.pivots_made === 0 && startup.founded_date) {
      // No pivots after 12+ months might mean stubborn or perfect PMF
      const founded = new Date(startup.founded_date);
      const monthsOld = (Date.now() - founded.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsOld > 12 && startup.customers && startup.customers > 10) {
        score += 0.4; // No pivots + traction = found PMF fast
      }
    } else if (startup.pivots_made && startup.pivots_made >= 3) {
      score += 0.2; // Too many pivots = concerning (but some points for persistence)
    }
  }
  
  // Customer feedback frequency (0-0.5 points)
  if (startup.customer_feedback_frequency) {
    hasAnyData = true;
    if (startup.customer_feedback_frequency === 'daily') {
      score += 0.5; // Daily customer contact = exceptional obsession
    } else if (startup.customer_feedback_frequency === 'weekly') {
      score += 0.35; // Weekly = strong
    } else if (startup.customer_feedback_frequency === 'monthly') {
      score += 0.2; // Monthly = acceptable
    }
  }
  
  // Speed of iteration (0-0.5 points)
  if (startup.time_to_iterate_days !== undefined) {
    hasAnyData = true;
    if (startup.time_to_iterate_days <= 7) {
      score += 0.5; // Ship updates within a week = exceptional velocity
    } else if (startup.time_to_iterate_days <= 14) {
      score += 0.35; // Within 2 weeks = strong
    } else if (startup.time_to_iterate_days <= 30) {
      score += 0.2; // Within a month = acceptable
    }
  }
  
  // DEFAULT: If no GRIT data, assume average resilience (unknown ≠ bad)
  if (!hasAnyData) {
    return 0.5; // Benefit of the doubt - assume average GRIT
  }
  
  return Math.min(score, 1.5);
}

/**
 * PROBLEM VALIDATION SCORING (0-2 points) - NEW
 * YOUR #1 CRITERION: "Properly identify the customer problem and if it's worth solving"
 * This is THE most important filter - more than team, traction, or technology
 */
function scoreProblemValidation(startup: StartupProfile): number {
  let score = 0;
  
  // Customer interviews conducted (0-0.75 points)
  if (startup.customer_interviews_conducted !== undefined) {
    if (startup.customer_interviews_conducted >= 50) {
      score += 0.75; // 50+ interviews = exceptional discovery
    } else if (startup.customer_interviews_conducted >= 20) {
      score += 0.6; // 20+ = strong
    } else if (startup.customer_interviews_conducted >= 10) {
      score += 0.4; // 10+ = moderate
    } else if (startup.customer_interviews_conducted >= 5) {
      score += 0.2; // 5+ = some validation
    }
  }
  
  // Customer pain data - quantified impact (0-0.5 points)
  if (startup.customer_pain_data) {
    const pain = startup.customer_pain_data;
    
    // Do they have NUMBERS on the pain?
    if (pain.cost_of_problem && pain.cost_of_problem > 100000) {
      score += 0.3; // $100K+ pain = significant
    } else if (pain.cost_of_problem && pain.cost_of_problem > 10000) {
      score += 0.2; // $10K+ pain = moderate
    }
    
    // Frequency matters
    if (pain.frequency === 'daily') {
      score += 0.1; // Daily pain = urgent
    }
    
    // Willingness to pay validation (CRITICAL)
    if (pain.willingness_to_pay_validated) {
      score += 0.1; // They've confirmed customers will pay
    }
  }
  
  // ICP (Ideal Customer Profile) clarity (0-0.4 points)
  if (startup.icp_clarity === 'crystal_clear') {
    score += 0.4; // Know EXACTLY who they're targeting
  } else if (startup.icp_clarity === 'moderate') {
    score += 0.2; // Some clarity
  }
  
  // Problem discovery depth (0-0.35 points)
  if (startup.problem_discovery_depth === 'deep') {
    score += 0.35; // Deep understanding of root causes, market implications
  } else if (startup.problem_discovery_depth === 'moderate') {
    score += 0.2; // Some understanding
  } else if (startup.problem_discovery_depth === 'surface') {
    score += 0.05; // Surface-level only
  }
  
  // DEFAULT: If no problem validation data, assume some baseline validation
  // (most startups that get funding news have SOME customer validation)
  if (score === 0 && !startup.customer_interviews_conducted && !startup.customer_pain_data && 
      !startup.icp_clarity && !startup.problem_discovery_depth) {
    return 0.6; // Benefit of the doubt - assume basic validation
  }
  
  return Math.min(score, 2);
}

/**
 * FOUNDER AGE SCORING (0-1.5 points) - NEW
 * Philosophy: Younger founders have more adaptability, hunger, and runway
 * 
 * Evidence:
 * - Average age of successful tech founders: 31-34 (but varies by sector)
 * - YC preference for young founders (Paul Graham essays)
 * - Thiel Fellowship: Under 22
 * - Young founders: More willing to take risks, less to lose, more energy
 * - BUT: Not always better - domain expertise matters too
 * 
 * Scoring:
 * - Under 25: Maximum bonus (Zuckerberg, Gates, Jobs era)
 * - 25-30: Strong bonus (peak startup energy)
 * - 30-35: Moderate bonus (balanced experience/energy)
 * - 35-40: Small bonus (domain expertise trade-off)
 * - 40+: No penalty, but no youth bonus
 */
function scoreFounderAge(startup: StartupProfile): number {
  let score = 0;
  const startupAny = startup as any;
  
  // Method 1: Direct age data
  if (startupAny.founder_avg_age) {
    const avgAge = startupAny.founder_avg_age;
    
    if (avgAge < 25) {
      score += 1.5; // Maximum youth bonus - exceptional hunger
    } else if (avgAge <= 28) {
      score += 1.2; // Very young - prime startup age
    } else if (avgAge <= 32) {
      score += 0.9; // Young - balanced energy/experience
    } else if (avgAge <= 36) {
      score += 0.5; // Moderate - likely has domain expertise
    } else if (avgAge <= 40) {
      score += 0.25; // Older - must compensate with experience
    }
    // 40+ = no youth bonus (but no penalty)
  }
  
  // Method 2: Count of young founders
  if (startupAny.founders_under_25 && startupAny.founders_under_25 > 0) {
    score += 0.3 * Math.min(startupAny.founders_under_25, 2); // Up to 0.6 bonus for under-25 founders
  } else if (startupAny.founders_under_30 && startupAny.founders_under_30 > 0) {
    score += 0.2 * Math.min(startupAny.founders_under_30, 2); // Up to 0.4 bonus for under-30 founders
  }
  
  // Method 3: Youngest founder age (if team has one young dynamo)
  if (startupAny.founder_youngest_age) {
    const youngest = startupAny.founder_youngest_age;
    if (youngest < 22) {
      score += 0.4; // Exceptionally young - high energy
    } else if (youngest < 26) {
      score += 0.25; // Very young
    } else if (youngest < 30) {
      score += 0.15; // Young
    }
  }
  
  // Method 4: First-time founders (often younger, more hungry)
  if (startupAny.first_time_founders === true) {
    score += 0.2; // First-time = hungry, something to prove
  }
  
  // Method 5: Estimate from founded_year + team education (heuristic)
  // If company was founded recently and founders have recent graduation, they're likely young
  if (!startupAny.founder_avg_age && startup.founded_date && startup.team) {
    const foundedYear = new Date(startup.founded_date).getFullYear();
    const hasRecentGrad = startup.team.some(member => {
      const edu = member.education?.toLowerCase() || '';
      // If they mention current year or recent years, likely young
      return edu.includes('2024') || edu.includes('2023') || edu.includes('2022') || 
             edu.includes('student') || edu.includes('dropout');
    });
    
    if (hasRecentGrad && foundedYear >= 2023) {
      score += 0.5; // Likely young founders
    } else if (hasRecentGrad) {
      score += 0.3;
    }
  }
  
  // DEFAULT: If no age data, assume median founder age (~32 = balanced energy/experience)
  if (score === 0 && !startupAny.founder_avg_age && !startupAny.founders_under_25 && 
      !startupAny.founders_under_30 && !startupAny.founder_youngest_age) {
    return 0.5; // Benefit of the doubt - assume ~32 years old
  }
  
  return Math.min(score, 1.5);
}

/**
 * SALES VELOCITY SCORING (0-2 points) - NEW
 * Measures speed of customer adoption and revenue growth
 * 
 * VCs love "rocketships" - startups that acquire customers fast.
 * Key metrics:
 * - Time to first revenue (faster = better product-market fit)
 * - ARR growth rate (100%+ YoY is great)
 * - Customer acquisition rate (MoM growth)
 * - LTV/CAC ratio (>3 = efficient growth)
 * - NRR (>100% = expansion revenue)
 * - Sales cycle length (shorter = easier sale)
 */
function scoreSalesVelocity(startup: StartupProfile): number {
  let score = 0;
  const startupAny = startup as any;
  
  // 1. ARR Growth Rate (0-0.5 points)
  // Triple digit growth = exceptional
  if (startupAny.arr_growth_rate) {
    const arrGrowth = startupAny.arr_growth_rate;
    if (arrGrowth >= 200) {
      score += 0.5; // 3x YoY growth = exceptional
    } else if (arrGrowth >= 100) {
      score += 0.4; // 2x YoY = great
    } else if (arrGrowth >= 50) {
      score += 0.25; // 50% YoY = good
    } else if (arrGrowth >= 25) {
      score += 0.1; // 25% YoY = okay
    }
  }
  
  // 2. Customer Growth Rate (0-0.4 points)
  // Fast customer acquisition = product-market fit
  if (startupAny.customer_growth_monthly) {
    const custGrowth = startupAny.customer_growth_monthly;
    if (custGrowth >= 30) {
      score += 0.4; // 30%+ MoM customer growth = viral
    } else if (custGrowth >= 20) {
      score += 0.3; // 20%+ MoM = excellent
    } else if (custGrowth >= 10) {
      score += 0.2; // 10%+ MoM = solid
    } else if (custGrowth >= 5) {
      score += 0.1; // 5%+ MoM = okay
    }
  }
  
  // 3. Time to First Revenue (0-0.3 points)
  // Faster = better validation
  if (startupAny.time_to_first_revenue_months) {
    const months = startupAny.time_to_first_revenue_months;
    if (months <= 3) {
      score += 0.3; // Revenue in 3 months = instant product-market fit
    } else if (months <= 6) {
      score += 0.2; // 6 months = fast
    } else if (months <= 12) {
      score += 0.1; // 12 months = normal
    }
  }
  
  // 4. Time to $1M ARR (0-0.3 points)
  // The "magic number" milestone
  if (startupAny.months_to_1m_arr) {
    const months = startupAny.months_to_1m_arr;
    if (months <= 12) {
      score += 0.3; // $1M ARR in 12 months = exceptional (Notion-like)
    } else if (months <= 18) {
      score += 0.2; // 18 months = fast
    } else if (months <= 24) {
      score += 0.1; // 2 years = normal
    }
  }
  
  // 5. LTV/CAC Ratio (0-0.25 points)
  // Unit economics efficiency
  if (startupAny.ltv_cac_ratio) {
    const ratio = startupAny.ltv_cac_ratio;
    if (ratio >= 5) {
      score += 0.25; // 5:1 = exceptional efficiency
    } else if (ratio >= 3) {
      score += 0.15; // 3:1 = healthy
    } else if (ratio >= 2) {
      score += 0.05; // 2:1 = marginal
    }
    // Below 2:1 = concerning (burn rate too high)
  }
  
  // 6. Net Revenue Retention (0-0.25 points)
  // Expansion revenue = land and expand working
  if (startupAny.nrr) {
    const nrr = startupAny.nrr;
    if (nrr >= 130) {
      score += 0.25; // 130%+ NRR = exceptional (Snowflake-like)
    } else if (nrr >= 120) {
      score += 0.2; // 120%+ = great
    } else if (nrr >= 110) {
      score += 0.15; // 110%+ = good
    } else if (nrr >= 100) {
      score += 0.1; // 100%+ = no churn
    }
    // Below 100% = net churn (warning sign)
  }
  
  // 7. Sales Cycle Length (0-0.15 points)
  // Shorter = easier product to sell
  if (startupAny.sales_cycle_days) {
    const days = startupAny.sales_cycle_days;
    if (days <= 14) {
      score += 0.15; // 2 weeks = self-serve/product-led
    } else if (days <= 30) {
      score += 0.1; // 1 month = efficient
    } else if (days <= 60) {
      score += 0.05; // 2 months = normal
    }
    // 90+ days = enterprise, slower but okay for right companies
  }
  
  // 8. Proxy from existing metrics
  // If we have MRR and growth_rate, estimate velocity
  if (score === 0 && startup.mrr && startup.growth_rate) {
    // High MRR + high growth = fast sales
    if (startup.mrr >= 50000 && startup.growth_rate >= 20) {
      score += 0.4; // $50K+ MRR with 20%+ MoM growth
    } else if (startup.mrr >= 10000 && startup.growth_rate >= 15) {
      score += 0.25; // $10K+ MRR with 15%+ MoM growth
    } else if (startup.mrr > 0 && startup.growth_rate >= 10) {
      score += 0.1; // Any MRR with 10%+ growth
    }
  }
  
  // 9. Proxy from revenue_annual (ARR estimate)
  if (score === 0 && startup.revenue) {
    // Assume revenue is annual
    if (startup.revenue >= 1000000) {
      score += 0.3; // $1M+ ARR
    } else if (startup.revenue >= 500000) {
      score += 0.2; // $500K+ ARR
    } else if (startup.revenue >= 100000) {
      score += 0.1; // $100K+ ARR
    }
  }
  
  // DEFAULT: If no sales velocity data AND no proxy data, assume average velocity
  // (unknown ≠ slow)
  if (score === 0 && !startup.mrr && !startup.revenue) {
    return 0.5; // Benefit of the doubt - assume average sales velocity
  }
  
  return Math.min(score, 2);
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(startup: StartupProfile, scores: any): string[] {
  const reasons: string[] = [];
  
  // Base boost acknowledgment
  if (scores.baseBoost && scores.baseBoost >= 2) {
    reasons.push('✅ Startup profile active with basic information');
  }
  
  // Team highlights
  if (scores.teamScore >= 2) {
    reasons.push('🔥 Exceptional founding team with strong technical background and pedigree');
  } else if (scores.teamScore >= 1) {
    reasons.push('✅ Solid team with relevant experience');
  }
  
  // Traction highlights (includes Seed/Angel metrics)
  if (scores.tractionScore >= 2) {
    const hasRetention = startup.retention_rate && startup.retention_rate >= 80;
    const hasLowChurn = startup.churn_rate && startup.churn_rate <= 5;
    const hasPayingCustomers = startup.prepaying_customers && startup.prepaying_customers >= 3;
    
    if (hasRetention || hasLowChurn || hasPayingCustomers) {
      reasons.push('📈 Strong product-market fit with excellent retention and paying customers');
    } else {
      reasons.push('📈 Strong traction with revenue and rapid growth');
    }
  } else if (scores.tractionScore >= 1) {
    reasons.push('📊 Early traction signals');
  }
  
  // Market highlights
  if (scores.marketScore >= 1.5) {
    reasons.push('🎯 Hot market with massive TAM');
  } else if (scores.marketScore >= 1) {
    reasons.push('🌐 Compelling market opportunity');
  }
  
  // Product highlights
  if (scores.productScore >= 1.5) {
    reasons.push('💎 Unique product with strong defensibility');
  } else if (scores.productScore >= 0.5) {
    reasons.push('🛠️ Product in market with demo');
  }
  
  // Vision-specific highlights (First Round & Seed/Angel criteria)
  if (scores.visionScore >= 1.5) {
    reasons.push('💡 Exceptional vision: contrarian insight, creative strategy, and solid financial planning');
  } else if (scores.visionScore >= 0.75) {
    const hasFinancialPlanning = startup.use_of_funds || startup.runway_months;
    if (hasFinancialPlanning) {
      reasons.push('💡 Strong contrarian insight with clear financial planning (Seed/Angel fit)');
    } else {
      reasons.push('💡 Strong contrarian insight and creative strategy (First Round fit)');
    }
  }
  
  // NEW: Problem validation highlights (YOUR #1 CRITERION)
  if (scores.problemValidationScore >= 1.5) {
    reasons.push('🎯 EXCEPTIONAL problem validation: 20+ customer interviews, quantified pain, crystal-clear ICP');
  } else if (scores.problemValidationScore >= 1) {
    reasons.push('✅ Strong customer problem validation with clear pain points');
  } else if (scores.problemValidationScore < 0.5) {
    reasons.push('⚠️  Weak problem validation - needs more customer discovery');
  }
  
  // NEW: Ecosystem highlights
  if (scores.ecosystemScore >= 1) {
    const hasRevenuePartners = startup.strategic_partners?.some(p => 
      p.relationship_stage === 'revenue_generating'
    );
    if (hasRevenuePartners) {
      reasons.push('🤝 Strong ecosystem: Partners driving revenue + quality advisors');
    } else {
      reasons.push('🤝 Solid partnerships and advisory board');
    }
  }
  
  // NEW: Grit highlights
  if (scores.gritScore >= 1) {
    const fastIteration = startup.time_to_iterate_days && startup.time_to_iterate_days <= 7;
    const dailyCustomerContact = startup.customer_feedback_frequency === 'daily';
    if (fastIteration && dailyCustomerContact) {
      reasons.push('💪 Exceptional grit: Daily customer contact + weekly iteration velocity');
    } else {
      reasons.push('💪 Strong adaptability and customer obsession');
    }
  }
  
  // NEW: Founder age highlights
  if (scores.founderAgeScore >= 1.2) {
    reasons.push('🚀 Young founding team: Exceptional adaptability and hunger');
  } else if (scores.founderAgeScore >= 0.8) {
    reasons.push('⚡ Young founders: High energy and willingness to learn');
  } else if (scores.founderAgeScore >= 0.4) {
    reasons.push('✅ Founders with balanced age/experience profile');
  }
  
  // NEW: Sales velocity highlights
  if (scores.salesVelocityScore >= 1.5) {
    reasons.push('🚀 EXCEPTIONAL sales velocity: Rapid customer acquisition, efficient unit economics');
  } else if (scores.salesVelocityScore >= 1) {
    reasons.push('📈 Strong sales velocity: Fast-growing with healthy metrics');
  } else if (scores.salesVelocityScore >= 0.5) {
    reasons.push('✅ Solid sales traction with growth momentum');
  }
  
  // YC-STYLE: Founder Speed highlights
  if (scores.founderSpeedScore >= 2.5) {
    reasons.push('⚡ ROCKET SHIP: Ships daily, moved from idea to MVP in weeks');
  } else if (scores.founderSpeedScore >= 1.5) {
    reasons.push('🏃 Fast executor: High deployment velocity, rapid iteration');
  } else if (scores.founderSpeedScore >= 0.5) {
    reasons.push('✅ Decent execution speed');
  }
  
  // YC-STYLE: Unique Insight highlights
  if (scores.uniqueInsightScore >= 2) {
    reasons.push('💡 NON-OBVIOUS INSIGHT: Contrarian belief + clear "why now" + unfair advantage');
  } else if (scores.uniqueInsightScore >= 1) {
    reasons.push('🔮 Has unique insight or timing thesis');
  }
  
  // YC-STYLE: User Love highlights
  if (scores.userLoveScore >= 1.5) {
    reasons.push('❤️ USERS LOVE THIS: High engagement, organic referrals, "very disappointed" test passed');
  } else if (scores.userLoveScore >= 0.8) {
    reasons.push('😍 Strong user engagement and retention');
  }
  
  // YC-STYLE: Learning Velocity highlights
  if (scores.learningVelocityScore >= 1.2) {
    reasons.push('🧪 RAPID LEARNER: Multiple experiments, fast pivots, validated hypotheses');
  } else if (scores.learningVelocityScore >= 0.6) {
    reasons.push('📚 Good learning velocity and adaptation');
  }
  
  return reasons;
}

// ============================================
// YC-STYLE SCORING FUNCTIONS
// "We fund founders, not ideas" - YC
// ============================================

/**
 * FOUNDER SPEED SCORING (0-3 points) ⭐⭐⭐⭐⭐
 * YC's #1 criterion: How fast do they build, ship, and iterate?
 * 
 * "A startup that has shipped a broken product to real users
 * is more impressive than one still perfecting their MVP."
 */
function scoreFounderSpeed(startup: StartupProfile): number {
  let score = 0;
  
  // 1. Time from idea to MVP (0-1 points)
  // YC loves founders who built something in weeks, not months
  if (startup.days_from_idea_to_mvp !== undefined) {
    if (startup.days_from_idea_to_mvp <= 14) score += 1;        // 2 weeks = amazing
    else if (startup.days_from_idea_to_mvp <= 30) score += 0.8; // 1 month = great
    else if (startup.days_from_idea_to_mvp <= 60) score += 0.5; // 2 months = okay
    else if (startup.days_from_idea_to_mvp <= 90) score += 0.2; // 3 months = slow
  }
  
  // 2. Features shipped last month (0-0.8 points)
  // Velocity of shipping matters
  if (startup.features_shipped_last_month !== undefined) {
    if (startup.features_shipped_last_month >= 10) score += 0.8; // Ship machines
    else if (startup.features_shipped_last_month >= 5) score += 0.6;
    else if (startup.features_shipped_last_month >= 2) score += 0.3;
    else if (startup.features_shipped_last_month >= 1) score += 0.1;
  }
  
  // 3. Deployment frequency (0-0.7 points)
  // Daily shipping is a strong signal
  if (startup.deployment_frequency === 'daily') score += 0.7;
  else if (startup.deployment_frequency === 'weekly') score += 0.5;
  else if (startup.deployment_frequency === 'monthly') score += 0.2;
  
  // 4. Time to iterate (from grit score) (0-0.5 points)
  if (startup.time_to_iterate_days !== undefined) {
    if (startup.time_to_iterate_days <= 3) score += 0.5;
    else if (startup.time_to_iterate_days <= 7) score += 0.3;
    else if (startup.time_to_iterate_days <= 14) score += 0.1;
  }
  
  // PROXY: If we don't have direct speed data, infer from:
  // - Having a launched product is a good sign
  // - Having a demo shows they built something
  // - Having customers means they shipped
  if (score === 0) {
    if (startup.launched) score += 0.8;
    if (startup.demo_available) score += 0.4;
    if (startup.customers && startup.customers > 0) score += 0.3;
    if (startup.active_users && startup.active_users > 0) score += 0.3;
    
    // Technical co-founders build faster
    if (startup.technical_cofounders && startup.technical_cofounders > 0) {
      score += 0.4;
    }
  }
  
  // DEFAULT: If still no score after proxies, assume they're shipping (they exist, after all)
  if (score === 0) {
    return 0.8; // Benefit of the doubt - assume they're executing
  }
  
  return Math.min(score, 3);
}

/**
 * UNIQUE INSIGHT SCORING (0-2.5 points) ⭐⭐⭐⭐
 * YC asks: "Why is this a good idea now, and why are YOU the right people?"
 * 
 * They want non-obvious insights, not "$100B TAM" decks.
 * "This is broken and here's why" > "This market is huge"
 */
function scoreUniqueInsight(startup: StartupProfile): number {
  let score = 0;
  
  // 1. Contrarian belief (0-1 points)
  // What do they believe that others don't?
  if (startup.contrarian_belief) {
    const length = startup.contrarian_belief.length;
    if (length > 200) score += 1;       // Deep contrarian thinking
    else if (length > 100) score += 0.7;
    else if (length > 50) score += 0.4;
    else score += 0.2;
  }
  
  // Also check contrarian_insight (legacy field)
  if (score === 0 && startup.contrarian_insight) {
    const length = startup.contrarian_insight.length;
    if (length > 200) score += 1;
    else if (length > 100) score += 0.7;
    else if (length > 50) score += 0.4;
    else score += 0.2;
  }
  
  // 2. "Why now?" timing (0-0.8 points)
  // Great startups have a clear reason why THIS moment is right
  if (startup.why_now) {
    const length = startup.why_now.length;
    if (length > 150) score += 0.8;
    else if (length > 75) score += 0.5;
    else if (length > 25) score += 0.2;
  }
  
  // 3. Unfair advantage / Founder-market fit (0-0.7 points)
  // Why are THEY the right people to solve this?
  if (startup.unfair_advantage) {
    const length = startup.unfair_advantage.length;
    if (length > 150) score += 0.7;
    else if (length > 75) score += 0.4;
    else if (length > 25) score += 0.2;
  }
  
  // PROXY: If we don't have direct insight data, infer from problem clarity
  if (score === 0) {
    // Deep problem understanding implies unique insight
    if (startup.problem_discovery_depth === 'deep') score += 0.8;
    else if (startup.problem_discovery_depth === 'moderate') score += 0.4;
    
    // Crystal clear ICP means they know their customer
    if (startup.icp_clarity === 'crystal_clear') score += 0.5;
    else if (startup.icp_clarity === 'moderate') score += 0.2;
    
    // Customer interviews reveal insight
    if (startup.customer_interviews_conducted && startup.customer_interviews_conducted >= 50) {
      score += 0.5;
    } else if (startup.customer_interviews_conducted && startup.customer_interviews_conducted >= 20) {
      score += 0.3;
    }
  }
  
  // DEFAULT: If still no score, assume some thesis exists (they got funding news for a reason)
  if (score === 0) {
    return 0.6; // Benefit of the doubt - assume they have some insight
  }
  
  return Math.min(score, 2.5);
}

/**
 * USER LOVE SCORING (0-2 points) ⭐⭐⭐
 * YC: "A few users who love your product is better than thousands who don't care."
 * 
 * Quality of engagement > quantity of users
 * Organic growth > paid acquisition
 */
function scoreUserLove(startup: StartupProfile): number {
  let score = 0;
  
  // 1. Sean Ellis test: "Very disappointed" users (0-0.6 points)
  // If 40%+ would be "very disappointed" without your product, you have PMF
  if (startup.users_who_would_be_very_disappointed !== undefined) {
    if (startup.users_who_would_be_very_disappointed >= 40) score += 0.6;
    else if (startup.users_who_would_be_very_disappointed >= 25) score += 0.4;
    else if (startup.users_who_would_be_very_disappointed >= 15) score += 0.2;
  }
  
  // 2. NPS Score (0-0.5 points)
  // High NPS = users love you
  if (startup.nps_score !== undefined) {
    if (startup.nps_score >= 70) score += 0.5;       // World class
    else if (startup.nps_score >= 50) score += 0.4;  // Excellent
    else if (startup.nps_score >= 30) score += 0.25; // Good
    else if (startup.nps_score >= 0) score += 0.1;   // Okay
  }
  
  // 3. Organic referral rate (0-0.4 points)
  // Word of mouth = true product love
  if (startup.organic_referral_rate !== undefined) {
    if (startup.organic_referral_rate >= 50) score += 0.4; // Viral
    else if (startup.organic_referral_rate >= 30) score += 0.3;
    else if (startup.organic_referral_rate >= 15) score += 0.2;
    else if (startup.organic_referral_rate >= 5) score += 0.1;
  }
  
  // 4. DAU/WAU ratio (0-0.5 points)
  // High ratio = sticky product, daily engagement
  if (startup.dau_wau_ratio !== undefined) {
    if (startup.dau_wau_ratio >= 0.6) score += 0.5;  // Extremely sticky
    else if (startup.dau_wau_ratio >= 0.4) score += 0.35;
    else if (startup.dau_wau_ratio >= 0.25) score += 0.2;
    else if (startup.dau_wau_ratio >= 0.15) score += 0.1;
  }
  
  // PROXY: If we don't have direct user love data
  if (score === 0) {
    // Retention rate indicates love
    if (startup.retention_rate && startup.retention_rate >= 80) {
      score += 0.6;
    } else if (startup.retention_rate && startup.retention_rate >= 60) {
      score += 0.4;
    }
    
    // Low churn = users stay = love
    if (startup.churn_rate !== undefined && startup.churn_rate <= 5) {
      score += 0.4;
    } else if (startup.churn_rate !== undefined && startup.churn_rate <= 10) {
      score += 0.2;
    }
    
    // Prepaying customers = they really want it
    if (startup.prepaying_customers && startup.prepaying_customers > 0) {
      score += 0.3;
    }
    
    // Passionate early customers (First Round criteria)
    if (startup.passionate_customers && startup.passionate_customers >= 10) {
      score += 0.4;
    } else if (startup.passionate_customers && startup.passionate_customers >= 5) {
      score += 0.2;
    }
  }
  
  // DEFAULT: If still no score, assume some user engagement (unknown ≠ unloved)
  if (score === 0) {
    return 0.5; // Benefit of the doubt - assume average engagement
  }
  
  return Math.min(score, 2);
}

/**
 * LEARNING VELOCITY SCORING (0-1.5 points)
 * YC: "How fast they learn from users and adapt"
 * 
 * This is what separates good founders from great ones.
 * Speed of learning > being right the first time.
 */
function scoreLearningVelocity(startup: StartupProfile): number {
  let score = 0;
  
  // 1. Experiments run last month (0-0.5 points)
  // Great founders are constantly testing
  if (startup.experiments_run_last_month !== undefined) {
    if (startup.experiments_run_last_month >= 10) score += 0.5;
    else if (startup.experiments_run_last_month >= 5) score += 0.35;
    else if (startup.experiments_run_last_month >= 2) score += 0.2;
    else if (startup.experiments_run_last_month >= 1) score += 0.1;
  }
  
  // 2. Hypotheses validated (0-0.4 points)
  // Do they capture what they learn?
  if (startup.hypotheses_validated !== undefined) {
    if (startup.hypotheses_validated >= 20) score += 0.4;
    else if (startup.hypotheses_validated >= 10) score += 0.3;
    else if (startup.hypotheses_validated >= 5) score += 0.2;
    else if (startup.hypotheses_validated >= 1) score += 0.1;
  }
  
  // 3. Pivot speed (0-0.3 points)
  // How fast do they adapt when something isn't working?
  if (startup.pivot_speed_days !== undefined) {
    if (startup.pivot_speed_days <= 7) score += 0.3;   // Rapid adaptation
    else if (startup.pivot_speed_days <= 14) score += 0.2;
    else if (startup.pivot_speed_days <= 30) score += 0.1;
  }
  
  // 4. Customer feedback frequency (0-0.3 points) 
  // From grit score - how often they talk to customers
  if (startup.customer_feedback_frequency === 'daily') score += 0.3;
  else if (startup.customer_feedback_frequency === 'weekly') score += 0.2;
  else if (startup.customer_feedback_frequency === 'monthly') score += 0.1;
  
  // PROXY: If we don't have direct learning data
  if (score === 0) {
    // Pivots made indicate willingness to learn
    if (startup.pivots_made && startup.pivots_made >= 2) {
      score += 0.4; // Multiple pivots = they're learning
    } else if (startup.pivots_made && startup.pivots_made >= 1) {
      score += 0.25;
    }
    
    // Customer interviews indicate learning mindset
    if (startup.customer_interviews_conducted && startup.customer_interviews_conducted >= 30) {
      score += 0.4;
    } else if (startup.customer_interviews_conducted && startup.customer_interviews_conducted >= 10) {
      score += 0.2;
    }
    
    // Problem discovery depth indicates learning
    if (startup.problem_discovery_depth === 'deep') score += 0.3;
    else if (startup.problem_discovery_depth === 'moderate') score += 0.15;
  }
  
  // DEFAULT: If still no score, assume average learning velocity
  if (score === 0) {
    return 0.4; // Benefit of the doubt - assume they're learning
  }
  
  return Math.min(score, 1.5);
}

/**
 * Quick qualification check - should this startup get matched at all?
 */
export function qualifiesForMatching(startup: StartupProfile): boolean {
  const score = calculateHotScore(startup);
  return score.total >= 2; // Minimum score of 2/10 to get any matches
}
