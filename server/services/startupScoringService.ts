/**
 * STARTUP SCORING SERVICE
 * Evaluates startups based on VC criteria (YC, Sequoia, Founders Fund, First Round, Seed/Angel)
 * Scores 1-10 where 10 = hottest investment opportunity
 * 
 * Seed/Angel investors added: Focus on team & vision, product-market fit, early traction,
 * clear go-to-market, and financial planning (12-18 month runway).
 */

interface StartupProfile {
  // Team
  team?: Array<{
    name: string;
    role: string;
    background?: string;
    previousCompanies?: string[];
    education?: string;
  }>;
  founders_count?: number;
  technical_cofounders?: number;
  
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
    ecosystem: number; // 0-1.5 NEW
    grit: number; // 0-1.5 NEW
    problem_validation: number; // 0-2 NEW (Your #1 criterion)
  };
  matchCount: number; // How many investors to match (5-20)
  reasoning: string[];
  tier: 'hot' | 'warm' | 'cold';
}

/**
 * Main scoring function - evaluates startup quality
 */
export function calculateHotScore(startup: StartupProfile): HotScore {
  const teamScore = scoreTeam(startup);
  const tractionScore = scoreTraction(startup);
  const marketScore = scoreMarket(startup);
  const productScore = scoreProduct(startup);
  const visionScore = scoreVision(startup);
  const ecosystemScore = scoreEcosystem(startup); // NEW
  const gritScore = scoreGrit(startup); // NEW
  const problemValidationScore = scoreProblemValidation(startup); // NEW - Your #1 criterion
  
  // Total possible: 3 + 3 + 2 + 2 + 2 + 1.5 + 1.5 + 2 = 17 points, normalized to 10
  const rawTotal = teamScore + tractionScore + marketScore + productScore + visionScore + ecosystemScore + gritScore + problemValidationScore;
  const total = Math.min((rawTotal / 17) * 10, 10); // Normalize to 10-point scale
  
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
      problem_validation: problemValidationScore
    },
    matchCount,
    reasoning: generateReasoning(startup, { 
      teamScore, 
      tractionScore, 
      marketScore, 
      productScore, 
      visionScore,
      ecosystemScore,
      gritScore,
      problemValidationScore
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
  if (startup.team && startup.team.length > 0) {
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
  
  // Pivot history - intelligent pivots are GOOD (0-0.5 points)
  if (startup.pivots_made !== undefined && startup.pivot_history) {
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
  if (startup.customer_feedback_frequency === 'daily') {
    score += 0.5; // Daily customer contact = exceptional obsession
  } else if (startup.customer_feedback_frequency === 'weekly') {
    score += 0.35; // Weekly = strong
  } else if (startup.customer_feedback_frequency === 'monthly') {
    score += 0.2; // Monthly = acceptable
  }
  
  // Speed of iteration (0-0.5 points)
  if (startup.time_to_iterate_days !== undefined) {
    if (startup.time_to_iterate_days <= 7) {
      score += 0.5; // Ship updates within a week = exceptional velocity
    } else if (startup.time_to_iterate_days <= 14) {
      score += 0.35; // Within 2 weeks = strong
    } else if (startup.time_to_iterate_days <= 30) {
      score += 0.2; // Within a month = acceptable
    }
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
  
  return Math.min(score, 2);
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(startup: StartupProfile, scores: any): string[] {
  const reasons: string[] = [];
  
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
  
  return reasons;
}

/**
 * Quick qualification check - should this startup get matched at all?
 */
export function qualifiesForMatching(startup: StartupProfile): boolean {
  const score = calculateHotScore(startup);
  return score.total >= 2; // Minimum score of 2/10 to get any matches
}
