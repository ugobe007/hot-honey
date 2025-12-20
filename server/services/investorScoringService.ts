/**
 * INVESTOR SCORING SERVICE - THE VC GOD ALGORITHM
 * ================================================
 * Evaluates investors/VCs based on quality metrics similar to how we score startups.
 * Scores 1-10 where 10 = highest quality investor match.
 * 
 * Why rank VCs?
 * - Not all VCs are equal for all startups
 * - Active VCs (deploying capital) > Dormant VCs
 * - Sector experts > Generalists (for specific startups)
 * - Responsive VCs > Slow VCs
 * - Lead investors > Followers (for new rounds)
 * - VCs with successful exits > VCs with no exits
 */

interface InvestorProfile {
  // Identity
  id?: string;
  name?: string;
  firm?: string;
  title?: string;
  
  // Track Record
  total_investments?: number;
  successful_exits?: number;
  unicorns?: number;
  portfolio_companies?: string[];
  notable_investments?: any[];
  
  // Fund Health
  active_fund_size?: number;
  dry_powder_estimate?: number;
  investment_pace_per_year?: number;
  last_investment_date?: string | Date;
  
  // Investment Style
  leads_rounds?: boolean;
  follows_rounds?: boolean;
  typical_ownership_pct?: number;
  check_size_min?: number;
  check_size_max?: number;
  
  // Focus & Expertise
  stage?: string[];
  sectors?: string[];
  geography_focus?: string[];
  investment_thesis?: string;
  
  // Responsiveness & Access
  avg_response_time_days?: number;
  preferred_intro_method?: string;
  decision_maker?: boolean;
  board_seats?: number;
  
  // Social Proof
  linkedin_url?: string;
  twitter_url?: string;
  bio?: string;
  is_verified?: boolean;
}

interface InvestorScore {
  total: number; // 0-10 scale
  percentile: number; // 0-100 percentile among all VCs
  breakdown: {
    track_record: number; // 0-3: Exits, unicorns, portfolio quality
    activity_level: number; // 0-2: Recent investments, deployment pace
    fund_health: number; // 0-2: Dry powder, fund size
    sector_expertise: number; // 0-1.5: Deep vs broad focus
    responsiveness: number; // 0-1.5: Response time, decision maker
  };
  tier: 'elite' | 'strong' | 'solid' | 'emerging';
  signals: string[];
  matchMultiplier: number; // 1.0-2.0x bonus for match scoring
}

/**
 * Main scoring function - evaluates investor quality
 */
export function calculateInvestorScore(investor: InvestorProfile): InvestorScore {
  const signals: string[] = [];
  
  // ============================================
  // TRACK RECORD (0-3 points)
  // ============================================
  let trackRecordScore = 0;
  
  // Total investments (0-1.5)
  const investments = investor.total_investments || 0;
  if (investments >= 100) {
    trackRecordScore += 1.5;
    signals.push('Highly experienced: 100+ investments');
  } else if (investments >= 50) {
    trackRecordScore += 1.2;
    signals.push('Experienced: 50+ investments');
  } else if (investments >= 20) {
    trackRecordScore += 0.8;
    signals.push('Active investor: 20+ investments');
  } else if (investments >= 5) {
    trackRecordScore += 0.4;
    signals.push('Established: 5+ investments');
  }
  
  // Successful exits (0-1.0)
  const exits = investor.successful_exits || 0;
  if (exits >= 20) {
    trackRecordScore += 1.0;
    signals.push('Exceptional track record: 20+ exits');
  } else if (exits >= 10) {
    trackRecordScore += 0.8;
    signals.push('Strong exits: 10+');
  } else if (exits >= 5) {
    trackRecordScore += 0.5;
    signals.push('Solid exits: 5+');
  } else if (exits >= 1) {
    trackRecordScore += 0.2;
    signals.push('Has exits');
  }
  
  // Exit rate bonus
  if (investments > 0 && exits > 0) {
    const exitRate = exits / investments;
    if (exitRate >= 0.2) {
      trackRecordScore += 0.5;
      signals.push(`High exit rate: ${(exitRate * 100).toFixed(0)}%`);
    }
  }
  
  trackRecordScore = Math.min(trackRecordScore, 3);
  
  // ============================================
  // ACTIVITY LEVEL (0-2 points)
  // ============================================
  let activityScore = 0;
  
  // Investment pace
  const pace = investor.investment_pace_per_year || 0;
  if (pace >= 20) {
    activityScore += 1.0;
    signals.push('High velocity: 20+ deals/year');
  } else if (pace >= 10) {
    activityScore += 0.7;
    signals.push('Active pace: 10+ deals/year');
  } else if (pace >= 5) {
    activityScore += 0.4;
  }
  
  // Recent activity
  if (investor.last_investment_date) {
    const lastInvestment = new Date(investor.last_investment_date);
    const monthsAgo = (Date.now() - lastInvestment.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsAgo <= 3) {
      activityScore += 1.0;
      signals.push('Very active: invested in last 3 months');
    } else if (monthsAgo <= 6) {
      activityScore += 0.7;
      signals.push('Active: invested in last 6 months');
    } else if (monthsAgo <= 12) {
      activityScore += 0.4;
      signals.push('Recent activity within 12 months');
    }
  }
  
  activityScore = Math.min(activityScore, 2);
  
  // ============================================
  // FUND HEALTH (0-2 points)
  // ============================================
  let fundHealthScore = 0;
  
  // Fund size
  const fundSize = investor.active_fund_size || 0;
  if (fundSize >= 500000000) { // $500M+
    fundHealthScore += 1.0;
    signals.push('Large fund: $500M+');
  } else if (fundSize >= 100000000) { // $100M+
    fundHealthScore += 0.7;
    signals.push('Mid-size fund: $100M+');
  } else if (fundSize >= 20000000) { // $20M+
    fundHealthScore += 0.4;
  }
  
  // Dry powder (capital available)
  const dryPowder = investor.dry_powder_estimate || 0;
  if (dryPowder >= 100000000) {
    fundHealthScore += 1.0;
    signals.push('High dry powder: $100M+ available');
  } else if (dryPowder >= 20000000) {
    fundHealthScore += 0.6;
    signals.push('Capital available: $20M+');
  } else if (dryPowder >= 5000000) {
    fundHealthScore += 0.3;
  }
  
  // If no fund data, give partial credit for active investors
  if (fundSize === 0 && dryPowder === 0 && investments >= 10) {
    fundHealthScore += 0.5;
  }
  
  fundHealthScore = Math.min(fundHealthScore, 2);
  
  // ============================================
  // SECTOR EXPERTISE (0-1.5 points)
  // ============================================
  let expertiseScore = 0;
  
  // Sector focus depth
  const sectors = investor.sectors || [];
  if (sectors.length >= 1 && sectors.length <= 3) {
    expertiseScore += 1.0;
    signals.push(`Focused expertise: ${sectors.slice(0, 3).join(', ')}`);
  } else if (sectors.length <= 6) {
    expertiseScore += 0.6;
    signals.push('Broad sector coverage');
  } else if (sectors.length > 0) {
    expertiseScore += 0.3;
    signals.push('Generalist investor');
  }
  
  // Investment thesis quality
  if (investor.investment_thesis && investor.investment_thesis.length > 100) {
    expertiseScore += 0.5;
    signals.push('Clear investment thesis');
  }
  
  expertiseScore = Math.min(expertiseScore, 1.5);
  
  // ============================================
  // RESPONSIVENESS (0-1.5 points)
  // ============================================
  let responsivenessScore = 0;
  
  // Response time
  const responseTime = investor.avg_response_time_days || 0;
  if (responseTime > 0 && responseTime <= 3) {
    responsivenessScore += 0.75;
    signals.push('Fast responder: <3 days');
  } else if (responseTime <= 7) {
    responsivenessScore += 0.5;
    signals.push('Good response time: <1 week');
  } else if (responseTime <= 14) {
    responsivenessScore += 0.25;
  }
  
  // Decision maker status
  if (investor.decision_maker) {
    responsivenessScore += 0.5;
    signals.push('Decision maker: faster process');
  }
  
  // Lead investor capability
  if (investor.leads_rounds) {
    responsivenessScore += 0.25;
    signals.push('Leads rounds');
  }
  
  responsivenessScore = Math.min(responsivenessScore, 1.5);
  
  // ============================================
  // CALCULATE TOTAL & TIER
  // ============================================
  const total = Math.min(
    trackRecordScore + activityScore + fundHealthScore + expertiseScore + responsivenessScore,
    10
  );
  
  // Determine tier
  let tier: 'elite' | 'strong' | 'solid' | 'emerging';
  if (total >= 8) {
    tier = 'elite';
  } else if (total >= 6) {
    tier = 'strong';
  } else if (total >= 4) {
    tier = 'solid';
  } else {
    tier = 'emerging';
  }
  
  // Calculate match multiplier (for weighting in matches)
  // Elite investors get up to 2x weight in match ranking
  const matchMultiplier = 1 + (total / 10);
  
  return {
    total: Math.round(total * 10) / 10,
    percentile: Math.round(total * 10), // Rough percentile
    breakdown: {
      track_record: Math.round(trackRecordScore * 10) / 10,
      activity_level: Math.round(activityScore * 10) / 10,
      fund_health: Math.round(fundHealthScore * 10) / 10,
      sector_expertise: Math.round(expertiseScore * 10) / 10,
      responsiveness: Math.round(responsivenessScore * 10) / 10,
    },
    tier,
    signals,
    matchMultiplier: Math.round(matchMultiplier * 100) / 100,
  };
}

/**
 * Calculate fit score between startup and investor
 * Takes into account both investor quality AND startup-investor fit
 */
export function calculateStartupInvestorFit(
  startupProfile: any,
  investorProfile: InvestorProfile,
  verbose: boolean = false
): { fitScore: number; reasons: string[] } {
  const reasons: string[] = [];
  let fitScore = 0;
  
  // Stage alignment (0-25 points)
  const startupStage = normalizeStage(startupProfile.stage);
  const investorStages = (investorProfile.stage || []).map(s => normalizeStage(s));
  
  if (investorStages.includes(startupStage)) {
    fitScore += 25;
    reasons.push(`Stage match: ${startupStage}`);
  } else if (investorStages.some(s => isAdjacentStage(s, startupStage))) {
    fitScore += 15;
    reasons.push('Adjacent stage fit');
  }
  
  // Sector alignment (0-25 points)
  const startupSectors = normalizeSectors(startupProfile.sectors || startupProfile.industries || []);
  const investorSectors = normalizeSectors(investorProfile.sectors || []);
  
  const sectorOverlap = startupSectors.filter(s => 
    investorSectors.some(is => s.includes(is) || is.includes(s))
  );
  
  if (sectorOverlap.length >= 2) {
    fitScore += 25;
    reasons.push(`Strong sector alignment: ${sectorOverlap.slice(0, 2).join(', ')}`);
  } else if (sectorOverlap.length === 1) {
    fitScore += 18;
    reasons.push(`Sector match: ${sectorOverlap[0]}`);
  }
  
  // Check size alignment (0-20 points)
  const raiseAmount = parseRaiseAmount(startupProfile.raise || startupProfile.raise_amount);
  const minCheck = investorProfile.check_size_min || 0;
  const maxCheck = investorProfile.check_size_max || Infinity;
  
  if (raiseAmount >= minCheck && raiseAmount <= maxCheck) {
    fitScore += 20;
    reasons.push('Check size fits perfectly');
  } else if (raiseAmount >= minCheck * 0.5 && raiseAmount <= maxCheck * 1.5) {
    fitScore += 10;
    reasons.push('Check size close to range');
  }
  
  // Geography alignment (0-5 points) - Reduced importance: modern VCs invest globally
  const startupGeo = normalizeGeography(startupProfile.location || startupProfile.geography);
  const investorGeos = (investorProfile.geography_focus || []).map(g => normalizeGeography(g));
  
  if (investorGeos.length === 0 || investorGeos.includes('global')) {
    fitScore += 5;  // Small bonus for global investors
    reasons.push('Global investor - geography flexible');
  } else if (investorGeos.includes(startupGeo)) {
    fitScore += 5;  // Small bonus for exact match
    reasons.push(`Geography match: ${startupGeo}`);
  } else if (investorGeos.some(g => g.includes('us') && startupGeo.includes('us'))) {
    fitScore += 3;  // Very small bonus for regional match
    reasons.push('US-based investor');
  }
  // No penalty for geography mismatch - modern VC is global
  
  // Lead investor fit (0-15 points)
  if (investorProfile.leads_rounds && startupProfile.seeking_lead) {
    fitScore += 15;
    reasons.push('Can lead round - important for new rounds');
  } else if (investorProfile.leads_rounds) {
    fitScore += 10;
    reasons.push('Lead investor capability');
  } else if (investorProfile.follows_rounds) {
    fitScore += 5;
    reasons.push('Follows rounds - good for syndicate');
  }
  
  if (verbose) {
    console.log(`\n🎯 Fit Analysis: ${startupProfile.name} ↔ ${investorProfile.name || investorProfile.firm}`);
    console.log(`   Fit Score: ${fitScore}/100`);
    reasons.forEach(r => console.log(`   • ${r}`));
  }
  
  return { fitScore: Math.min(fitScore, 100), reasons };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeStage(stage: any): string {
  if (!stage) return 'seed';
  const s = String(stage).toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (s.includes('preseed') || s.includes('pre')) return 'pre-seed';
  if (s.includes('seed')) return 'seed';
  if (s.includes('seriesa') || s === 'a') return 'series-a';
  if (s.includes('seriesb') || s === 'b') return 'series-b';
  if (s.includes('seriesc') || s === 'c') return 'series-c';
  if (s.includes('growth') || s.includes('late')) return 'growth';
  
  return 'seed';
}

function isAdjacentStage(investorStage: string, startupStage: string): boolean {
  const stageOrder = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'];
  const investorIdx = stageOrder.indexOf(investorStage);
  const startupIdx = stageOrder.indexOf(startupStage);
  
  return Math.abs(investorIdx - startupIdx) <= 1;
}

function normalizeSectors(sectors: any[]): string[] {
  if (!Array.isArray(sectors)) return [];
  return sectors.map(s => String(s).toLowerCase().replace(/[^a-z0-9]/g, ''));
}

function normalizeGeography(geo: any): string {
  if (!geo) return 'global';
  const g = String(geo).toLowerCase();
  
  if (g.includes('sf') || g.includes('bay') || g.includes('silicon')) return 'sf-bay-area';
  if (g.includes('ny') || g.includes('new york')) return 'nyc';
  if (g.includes('us') || g.includes('united states') || g.includes('america')) return 'us';
  if (g.includes('europe') || g.includes('eu')) return 'europe';
  if (g.includes('asia')) return 'asia';
  if (g.includes('global') || g.includes('worldwide')) return 'global';
  
  return g;
}

function parseRaiseAmount(raise: any): number {
  if (typeof raise === 'number') return raise;
  if (!raise) return 0;
  
  const str = String(raise).toLowerCase();
  const match = str.match(/[\d.]+/);
  if (!match) return 0;
  
  let amount = parseFloat(match[0]);
  
  if (str.includes('m')) amount *= 1000000;
  else if (str.includes('k')) amount *= 1000;
  else if (str.includes('b')) amount *= 1000000000;
  
  return amount;
}

// Export all functions
export default {
  calculateInvestorScore,
  calculateStartupInvestorFit,
};
