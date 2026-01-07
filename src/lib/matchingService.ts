/**
 * GOD SCORE MATCHING SERVICE
 * ==========================
 * Maps GOD Score dimensions to investor preferences
 * Integrates with existing MatchingEngine component
 */

import { supabase } from './supabase';

// Investor type preferences mapped to GOD dimensions
export const INVESTOR_PREFERENCES: Record<string, {
  weights: { team: number; market: number; product: number; traction: number; vision: number };
  minScore: number;
  preferredStages: string[];
  decisionSpeed: 'fast' | 'medium' | 'slow';
}> = {
  'VC': {
    weights: { team: 0.25, market: 0.30, product: 0.20, traction: 0.15, vision: 0.10 },
    minScore: 40,
    preferredStages: ['Seed', 'Series A', 'Series B'],
    decisionSpeed: 'medium'
  },
  'Family Office': {
    weights: { team: 0.30, market: 0.20, product: 0.15, traction: 0.15, vision: 0.20 },
    minScore: 35,
    preferredStages: ['Seed', 'Series A', 'Series B', 'Growth'],
    decisionSpeed: 'slow'
  },
  'SWF': {
    weights: { team: 0.15, market: 0.35, product: 0.15, traction: 0.25, vision: 0.10 },
    minScore: 50,
    preferredStages: ['Growth', 'Late Stage'],
    decisionSpeed: 'slow'
  },
  'Super Angel': {
    weights: { team: 0.35, market: 0.15, product: 0.25, traction: 0.20, vision: 0.05 },
    minScore: 30,
    preferredStages: ['Pre-Seed', 'Seed'],
    decisionSpeed: 'fast'
  },
  'Angel Group': {
    weights: { team: 0.30, market: 0.20, product: 0.25, traction: 0.15, vision: 0.10 },
    minScore: 30,
    preferredStages: ['Pre-Seed', 'Seed', 'Series A'],
    decisionSpeed: 'medium'
  },
  'Gov': {
    weights: { team: 0.20, market: 0.25, product: 0.30, traction: 0.10, vision: 0.15 },
    minScore: 35,
    preferredStages: ['Seed', 'Series A', 'Series B'],
    decisionSpeed: 'slow'
  },
  'University': {
    weights: { team: 0.25, market: 0.15, product: 0.35, traction: 0.10, vision: 0.15 },
    minScore: 30,
    preferredStages: ['Pre-Seed', 'Seed'],
    decisionSpeed: 'slow'
  },
  'Endowment': {
    weights: { team: 0.20, market: 0.30, product: 0.15, traction: 0.25, vision: 0.10 },
    minScore: 45,
    preferredStages: ['Growth', 'Late Stage'],
    decisionSpeed: 'slow'
  }
};

const DEFAULT_PREFERENCES = {
  weights: { team: 0.25, market: 0.25, product: 0.20, traction: 0.20, vision: 0.10 },
  minScore: 35,
  preferredStages: ['Seed', 'Series A', 'Series B'],
  decisionSpeed: 'medium' as const
};

export interface Startup {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  website?: string;
  sectors?: string[];
  stage?: string;
  location?: string;
  total_god_score?: number;
  team_score?: number;
  market_score?: number;
  product_score?: number;
  traction_score?: number;
  vision_score?: number;
  raise_amount?: string;
  funding_ask?: number;
}

export interface Investor {
  id: string;
  name: string;
  firm?: string;
  bio?: string;
  investment_thesis?: string;
  sectors?: string[];
  stage?: string[];
  check_size_min?: number;
  check_size_max?: number;
  geography_focus?: string[];
  notable_investments?: any;
  investor_type?: string;
  primary_motivation?: string;
  decision_speed?: string;
  linkedin_url?: string;
  blog_url?: string;
}

export interface MatchResult {
  investor: Investor;
  score: number;
  reasons: string[];
  breakdown: {
    industryMatch: number;
    stageMatch: number;
    geographyMatch: number;
    checkSizeMatch: number;
    thesisAlignment: number;
    godScoreWeighted: number;
  };
  investorType: string;
  decisionSpeed: string;
}

/**
 * Calculate weighted match score between startup and investor
 */
export function calculateMatchScore(startup: Startup, investor: Investor): MatchResult {
  const prefs = INVESTOR_PREFERENCES[investor.investor_type || 'VC'] || DEFAULT_PREFERENCES;
  
  // Get startup GOD scores (default to 50 if missing)
  const team = startup.team_score || 50;
  const market = startup.market_score || 50;
  const product = startup.product_score || 50;
  const traction = startup.traction_score || 50;
  const vision = startup.vision_score || 50;
  
  // Calculate weighted GOD score based on investor preferences
  const godScoreWeighted = (
    team * prefs.weights.team +
    market * prefs.weights.market +
    product * prefs.weights.product +
    traction * prefs.weights.traction +
    vision * prefs.weights.vision
  );
  
  let matchScore = godScoreWeighted;
  const matchReasons: string[] = [];
  
  // Breakdown for UI
  const breakdown = {
    industryMatch: 0,
    stageMatch: 0,
    geographyMatch: 0,
    checkSizeMatch: 0,
    thesisAlignment: 0,
    godScoreWeighted: Math.round(godScoreWeighted)
  };
  
  // Sector alignment (+15 max)
  if (investor.sectors && startup.sectors) {
    const investorSectors = Array.isArray(investor.sectors) ? investor.sectors : [];
    const startupSectors = Array.isArray(startup.sectors) ? startup.sectors : [];
    const overlap = investorSectors.filter(s => 
      startupSectors.some(ss => 
        ss.toLowerCase().includes(s.toLowerCase()) || 
        s.toLowerCase().includes(ss.toLowerCase())
      )
    );
    if (overlap.length > 0) {
      const sectorBonus = Math.min(15, overlap.length * 5);
      matchScore += sectorBonus;
      breakdown.industryMatch = Math.min(100, overlap.length * 33);
      matchReasons.push(`Sector match: ${overlap.slice(0, 2).join(', ')}`);
    }
  }
  
  // Stage alignment (+10)
  if (investor.stage && startup.stage) {
    const investorStages = Array.isArray(investor.stage) ? investor.stage : [investor.stage];
    
    // Convert startup stage to string and map numeric stages to text
    let startupStage: string;
    if (Array.isArray(startup.stage)) {
      startupStage = startup.stage[0];
    } else if (typeof startup.stage === 'number') {
      // Map numeric stages: 0=Pre-Seed, 1=Seed, 2=Series A, 3=Series B, 4=Growth, 5=Late Stage
      const stageMap: Record<number, string> = {
        0: 'Pre-Seed',
        1: 'Seed',
        2: 'Series A',
        3: 'Series B',
        4: 'Growth',
        5: 'Late Stage'
      };
      startupStage = stageMap[startup.stage] || 'Seed'; // Default to Seed if unknown
    } else {
      startupStage = String(startup.stage || '');
    }
    
    if (startupStage) {
      const stageMatch = investorStages.some(s => {
        const investorStageStr = typeof s === 'string' ? s : String(s || '');
        return investorStageStr.toLowerCase().includes(startupStage.toLowerCase()) ||
               startupStage.toLowerCase().includes(investorStageStr.toLowerCase());
      });
      if (stageMatch) {
        matchScore += 10;
        breakdown.stageMatch = 100;
        matchReasons.push('Stage aligned');
      } else {
        breakdown.stageMatch = 30;
      }
    }
  }
  
  // Geography alignment (+5)
  if (investor.geography_focus && startup.location) {
    const geos = Array.isArray(investor.geography_focus) ? investor.geography_focus : [];
    const geoMatch = geos.some(g => 
      g.toLowerCase() === 'global' || 
      startup.location?.toLowerCase().includes(g.toLowerCase()) ||
      g.toLowerCase().includes(startup.location?.toLowerCase() || '')
    );
    if (geoMatch) {
      matchScore += 5;
      breakdown.geographyMatch = 100;
      matchReasons.push('Geography aligned');
    } else {
      breakdown.geographyMatch = 50;
    }
  } else {
    breakdown.geographyMatch = 70; // No data = neutral
  }
  
  // Check size alignment (+5 or -10)
  if (investor.check_size_min && investor.check_size_max && startup.funding_ask) {
    if (startup.funding_ask >= investor.check_size_min && startup.funding_ask <= investor.check_size_max) {
      matchScore += 5;
      breakdown.checkSizeMatch = 100;
      matchReasons.push('Check size aligned');
    } else if (startup.funding_ask < investor.check_size_min * 0.5 || startup.funding_ask > investor.check_size_max * 2) {
      matchScore -= 10;
      breakdown.checkSizeMatch = 20;
      matchReasons.push('Check size mismatch');
    } else {
      breakdown.checkSizeMatch = 60;
    }
  } else {
    breakdown.checkSizeMatch = 70; // No data = neutral
  }
  
  // Mission alignment for mission-driven investors (+10)
  if (investor.primary_motivation === 'mission') {
    const missionSectors = ['Climate', 'Clean Energy', 'Healthcare', 'Education', 'Social Impact', 'Sustainability'];
    if (startup.sectors?.some(s => missionSectors.some(ms => s.toLowerCase().includes(ms.toLowerCase())))) {
      matchScore += 10;
      breakdown.thesisAlignment = 100;
      matchReasons.push('Mission aligned');
    } else {
      breakdown.thesisAlignment = 40;
    }
  } else {
    // Thesis alignment based on description match (simplified)
    breakdown.thesisAlignment = Math.min(100, 50 + (startup.total_god_score || 50) / 2);
  }
  
  // Cap at 100
  matchScore = Math.min(100, Math.max(0, matchScore));
  
  return {
    investor,
    score: Math.round(matchScore),
    reasons: matchReasons,
    breakdown,
    investorType: investor.investor_type || 'VC',
    decisionSpeed: investor.decision_speed || prefs.decisionSpeed
  };
}

/**
 * Find best investor matches for a startup
 */
export async function findMatchesForStartup(
  startupId: string, 
  limit: number = 10,
  options?: {
    investorTypes?: string[];
    minScore?: number;
    sectors?: string[];
  }
): Promise<MatchResult[]> {
  // Get startup data
  const { data: startup, error: startupError } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('id', startupId)
    .single();
  
  if (startupError || !startup) {
    throw new Error('Startup not found');
  }
  
  // Build investor query
  let query = supabase
    .from('investors')
    .select('*')
    .not('name', 'ilike', '%(%'); // Filter out garbage
  
  // Filter by investor type if specified
  if (options?.investorTypes && options.investorTypes.length > 0) {
    query = query.in('investor_type', options.investorTypes);
  }
  
  // Filter by sectors if specified
  if (options?.sectors && options.sectors.length > 0) {
    query = query.overlaps('sectors', options.sectors);
  }
  
  const { data: investors, error: investorError } = await query.limit(100);
  
  if (investorError) {
    throw new Error('Failed to fetch investors');
  }
  
  if (!investors || investors.length === 0) {
    return [];
  }
  
  // Calculate match scores
  const matches = investors.map(investor => calculateMatchScore(startup, investor));
  
  // Filter by minimum score
  const minScore = options?.minScore || 30;
  const filteredMatches = matches.filter(m => m.score >= minScore);
  
  // Sort by score and return top matches
  filteredMatches.sort((a, b) => b.score - a.score);
  
  return filteredMatches.slice(0, limit);
}

/**
 * Find best startup matches for an investor
 */
export async function findMatchesForInvestor(
  investorId: string,
  limit: number = 10,
  options?: {
    minGodScore?: number;
    stages?: string[];
    sectors?: string[];
  }
): Promise<{ startup: Startup; score: number; reasons: string[] }[]> {
  // Get investor data
  const { data: investor, error: investorError } = await supabase
    .from('investors')
    .select('*')
    .eq('id', investorId)
    .single();
  
  if (investorError || !investor) {
    throw new Error('Investor not found');
  }
  
  const prefs = INVESTOR_PREFERENCES[investor.investor_type || 'VC'] || DEFAULT_PREFERENCES;
  const minScore = options?.minGodScore || prefs.minScore;
  
  // Build startup query
  let query = supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved')
    .gte('total_god_score', minScore);
  
  // Filter by stage if specified
  if (options?.stages && options.stages.length > 0) {
    query = query.in('stage', options.stages);
  }
  
  const { data: startups, error: startupError } = await query.limit(100);
  
  if (startupError) {
    throw new Error('Failed to fetch startups');
  }
  
  if (!startups || startups.length === 0) {
    return [];
  }
  
  // Calculate match scores
  const matches = startups.map(startup => {
    const result = calculateMatchScore(startup, investor);
    return {
      startup,
      score: result.score,
      reasons: result.reasons
    };
  });
  
  // Sort by score and return top matches
  matches.sort((a, b) => b.score - a.score);
  
  return matches.slice(0, limit);
}

/**
 * Get investor type icon/emoji
 */
export function getInvestorTypeIcon(type?: string): string {
  switch (type) {
    case 'VC': return '💼';
    case 'Family Office': return '🏛️';
    case 'SWF': return '🌍';
    case 'Super Angel': return '👼';
    case 'Angel Group': return '👥';
    case 'Gov': return '🏛️';
    case 'University': return '🎓';
    case 'Endowment': return '📚';
    case 'CVC': return '🏢';
    default: return '💰';
  }
}

/**
 * Get decision speed badge color
 */
export function getDecisionSpeedColor(speed?: string): string {
  switch (speed) {
    case 'fast': return 'text-green-400 bg-green-500/20';
    case 'medium': return 'text-yellow-400 bg-yellow-500/20';
    case 'slow': return 'text-orange-400 bg-orange-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
}

/**
 * Format check size range
 */
export function formatCheckSize(min?: number, max?: number): string {
  if (!min && !max) return 'Undisclosed';
  
  const formatAmount = (amt: number) => {
    if (amt >= 1000000000) return `$${(amt / 1000000000).toFixed(1)}B`;
    if (amt >= 1000000) return `$${(amt / 1000000).toFixed(0)}M`;
    if (amt >= 1000) return `$${(amt / 1000).toFixed(0)}K`;
    return `$${amt}`;
  };
  
  if (min && max) {
    return `${formatAmount(min)} - ${formatAmount(max)}`;
  } else if (min) {
    return `${formatAmount(min)}+`;
  } else if (max) {
    return `Up to ${formatAmount(max)}`;
  }
  return 'Undisclosed';
}

