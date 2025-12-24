/**
 * Investor Match Search Service
 * 
 * Provides comprehensive search and filtering capabilities for investors
 * to find and investigate startup matches.
 */

import { supabase } from '../config/supabase';

export interface InvestorMatchFilters {
  // Score filters
  minScore?: number;
  maxScore?: number;
  confidenceLevel?: 'high' | 'medium' | 'low';
  
  // Startup quality filters
  minGODScore?: number;
  maxGODScore?: number;
  godScoreRange?: 'elite' | 'high' | 'quality' | 'good' | 'any'; // 80+, 75-79, 70-74, 60-69, any
  
  // Sector/Stage filters
  sectors?: string[];
  stage?: number[]; // 1=pre-seed, 2=seed, 3=series-a, etc.
  geography?: string[];
  
  // Traction filters
  hasRevenue?: boolean;
  minMRR?: number;
  minARR?: number;
  minGrowthRate?: number; // Monthly growth rate %
  minCustomers?: number;
  minTeamSize?: number;
  
  // Stage-specific filters
  fundingStage?: string[]; // 'pre-seed', 'seed', 'series-a', etc.
  raiseAmount?: {
    min?: number;
    max?: number;
  };
  
  // Team filters
  hasTechnicalCofounder?: boolean;
  minFounders?: number;
  founderBackground?: string[]; // 'ex-faang', 'yc', 'serial', etc.
  
  // Sorting
  sortBy?: 'score' | 'recent' | 'god_score' | 'traction' | 'stage';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
}

export interface InvestorMatchResult {
  match_id: string;
  startup_id: string;
  investor_id: string;
  match_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  reasoning: string;
  created_at: string;
  
  // Startup details
  startup: {
    id: string;
    name: string;
    description?: string;
    tagline?: string;
    website?: string;
    sectors?: string[];
    stage?: number;
    location?: string;
    total_god_score?: number;
    team_score?: number;
    traction_score?: number;
    market_score?: number;
    product_score?: number;
    vision_score?: number;
    mrr?: number;
    arr?: number;
    growth_rate_monthly?: number;
    customer_count?: number;
    team_size?: number;
    funding_stage?: string;
    raise_amount?: number;
    extracted_data?: any;
  };
  
  // Investor details (for context)
  investor: {
    id: string;
    name: string;
    firm: string;
  };
}

/**
 * Search matches for an investor with advanced filtering
 */
export async function searchInvestorMatches(
  investorId: string,
  filters: InvestorMatchFilters = {}
): Promise<{ matches: InvestorMatchResult[]; total: number }> {
  try {
    const {
      minScore = 0,
      maxScore = 100,
      confidenceLevel,
      minGODScore,
      maxGODScore,
      godScoreRange,
      sectors,
      stage,
      geography,
      hasRevenue,
      minMRR,
      minARR,
      minGrowthRate,
      minCustomers,
      minTeamSize,
      fundingStage,
      raiseAmount,
      hasTechnicalCofounder,
      minFounders,
      sortBy = 'score',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = filters;

    // Build base query
    let query = supabase
      .from('startup_investor_matches')
      .select(`
        id,
        startup_id,
        investor_id,
        match_score,
        confidence_level,
        reasoning,
        created_at,
        startup_uploads:startup_id (
          id,
          name,
          description,
          tagline,
          website,
          sectors,
          stage,
          location,
          total_god_score,
          team_score,
          traction_score,
          market_score,
          product_score,
          vision_score,
          mrr,
          arr,
          growth_rate_monthly,
          customer_count,
          team_size,
          raise_amount,
          extracted_data
        ),
        investors:investor_id (
          id,
          name,
          firm
        )
      `, { count: 'exact' })
      .eq('investor_id', investorId)
      .gte('match_score', minScore)
      .lte('match_score', maxScore);

    // Apply filters
    if (confidenceLevel) {
      query = query.eq('confidence_level', confidenceLevel);
    }

    // GOD score filters
    if (minGODScore !== undefined) {
      query = query.gte('startup_uploads.total_god_score', minGODScore);
    }
    if (maxGODScore !== undefined) {
      query = query.lte('startup_uploads.total_god_score', maxGODScore);
    }

    // GOD score range filter
    if (godScoreRange && godScoreRange !== 'any') {
      if (godScoreRange === 'elite') {
        query = query.gte('startup_uploads.total_god_score', 80);
      } else if (godScoreRange === 'high') {
        query = query.gte('startup_uploads.total_god_score', 75).lt('startup_uploads.total_god_score', 80);
      } else if (godScoreRange === 'quality') {
        query = query.gte('startup_uploads.total_god_score', 70).lt('startup_uploads.total_god_score', 75);
      } else if (godScoreRange === 'good') {
        query = query.gte('startup_uploads.total_god_score', 60).lt('startup_uploads.total_god_score', 70);
      }
    }

    // Stage filter
    if (stage && stage.length > 0) {
      query = query.in('startup_uploads.stage', stage);
    }

    // Traction filters
    if (hasRevenue) {
      query = query.or('startup_uploads.mrr.gt.0,startup_uploads.arr.gt.0');
    }
    if (minMRR !== undefined) {
      query = query.gte('startup_uploads.mrr', minMRR);
    }
    if (minARR !== undefined) {
      query = query.gte('startup_uploads.arr', minARR);
    }
    if (minGrowthRate !== undefined) {
      query = query.gte('startup_uploads.growth_rate_monthly', minGrowthRate);
    }
    if (minCustomers !== undefined) {
      query = query.gte('startup_uploads.customer_count', minCustomers);
    }
    if (minTeamSize !== undefined) {
      query = query.gte('startup_uploads.team_size', minTeamSize);
    }

    // Raise amount filter
    if (raiseAmount?.min !== undefined) {
      query = query.gte('startup_uploads.raise_amount', raiseAmount.min);
    }
    if (raiseAmount?.max !== undefined) {
      query = query.lte('startup_uploads.raise_amount', raiseAmount.max);
    }

    // Sorting
    if (sortBy === 'score') {
      query = query.order('match_score', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'recent') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'god_score') {
      query = query.order('startup_uploads.total_god_score', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'traction') {
      query = query.order('startup_uploads.traction_score', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'stage') {
      query = query.order('startup_uploads.stage', { ascending: sortOrder === 'asc' });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error searching investor matches:', error);
      throw error;
    }

    // Post-process to apply filters that require array checks or complex logic
    let filteredMatches = (data || []) as any[];

    // Sector filter (post-process)
    if (sectors && sectors.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        const startupSectors = match.startup_uploads?.sectors || [];
        if (Array.isArray(startupSectors)) {
          return sectors.some(s => 
            startupSectors.some((ss: string) => 
              ss.toLowerCase().includes(s.toLowerCase()) || 
              s.toLowerCase().includes(ss.toLowerCase())
            )
          );
        }
        return false;
      });
    }

    // Geography filter (post-process)
    if (geography && geography.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        const startupLocation = match.startup_uploads?.location || '';
        const locationStr = typeof startupLocation === 'string' ? startupLocation : String(startupLocation);
        return geography.some(g => 
          locationStr.toLowerCase().includes(g.toLowerCase()) || 
          g.toLowerCase().includes(locationStr.toLowerCase())
        );
      });
    }

    // Funding stage filter (post-process - check extracted_data)
    if (fundingStage && fundingStage.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        const extractedData = match.startup_uploads?.extracted_data || {};
        const stage = extractedData.funding_stage || '';
        const stageStr = typeof stage === 'string' ? stage : String(stage);
        return fundingStage.some(fs => 
          stageStr.toLowerCase().includes(fs.toLowerCase())
        );
      });
    }

    // Format results
    const matches: InvestorMatchResult[] = filteredMatches.map(match => ({
      match_id: match.id,
      startup_id: match.startup_id,
      investor_id: match.investor_id,
      match_score: match.match_score,
      confidence_level: match.confidence_level,
      reasoning: match.reasoning,
      created_at: match.created_at,
      startup: {
        id: match.startup_uploads?.id || '',
        name: match.startup_uploads?.name || '',
        description: match.startup_uploads?.description,
        tagline: match.startup_uploads?.tagline,
        website: match.startup_uploads?.website,
        sectors: match.startup_uploads?.sectors,
        stage: match.startup_uploads?.stage,
        location: match.startup_uploads?.location,
        total_god_score: match.startup_uploads?.total_god_score,
        team_score: match.startup_uploads?.team_score,
        traction_score: match.startup_uploads?.traction_score,
        market_score: match.startup_uploads?.market_score,
        product_score: match.startup_uploads?.product_score,
        vision_score: match.startup_uploads?.vision_score,
        mrr: match.startup_uploads?.mrr,
        arr: match.startup_uploads?.arr,
        growth_rate_monthly: match.startup_uploads?.growth_rate_monthly,
        customer_count: match.startup_uploads?.customer_count,
        team_size: match.startup_uploads?.team_size,
        funding_stage: match.startup_uploads?.extracted_data?.funding_stage,
        raise_amount: match.startup_uploads?.raise_amount,
        extracted_data: match.startup_uploads?.extracted_data,
      },
      investor: {
        id: match.investors?.id || '',
        name: match.investors?.name || '',
        firm: match.investors?.firm || '',
      },
    }));

    return {
      matches,
      total: count || matches.length,
    };
  } catch (error) {
    console.error('Error in searchInvestorMatches:', error);
    throw error;
  }
}

/**
 * Get top matches for an investor (simplified, no filters)
 */
export async function getTopInvestorMatches(
  investorId: string,
  limit: number = 10
): Promise<InvestorMatchResult[]> {
  const { matches } = await searchInvestorMatches(investorId, {
    minScore: 65, // Increased from 50 to 65 for better selectivity
    confidenceLevel: 'high',
    godScoreRange: 'quality', // 70+ GOD score
    sortBy: 'score',
    sortOrder: 'desc',
    limit,
  });
  return matches;
}

/**
 * Get match statistics for an investor
 */
export async function getInvestorMatchStats(investorId: string): Promise<{
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  averageScore: number;
  averageGODScore: number;
  topSectors: { sector: string; count: number }[];
  topStages: { stage: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  godScoreDistribution: { range: string; count: number }[];
}> {
  try {
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        match_score,
        confidence_level,
        startup_uploads:startup_id (
          sectors,
          stage,
          total_god_score
        )
      `)
      .eq('investor_id', investorId);

    if (error) throw error;

    const matchesList = matches || [];
    const total = matchesList.length;
    
    const highConfidence = matchesList.filter(m => m.confidence_level === 'high').length;
    const mediumConfidence = matchesList.filter(m => m.confidence_level === 'medium').length;
    const lowConfidence = matchesList.filter(m => m.confidence_level === 'low').length;
    
    const scores = matchesList.map(m => m.match_score).filter(s => typeof s === 'number');
    const averageScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;

    const godScores = matchesList
      .map(m => m.startup_uploads?.total_god_score)
      .filter(s => typeof s === 'number' && s > 0);
    const averageGODScore = godScores.length > 0
      ? godScores.reduce((a, b) => a + b, 0) / godScores.length
      : 0;

    // Top sectors
    const sectorCounts: Record<string, number> = {};
    matchesList.forEach(match => {
      const sectors = match.startup_uploads?.sectors || [];
      if (Array.isArray(sectors)) {
        sectors.forEach((s: string) => {
          sectorCounts[s] = (sectorCounts[s] || 0) + 1;
        });
      }
    });
    const topSectors = Object.entries(sectorCounts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top stages
    const stageCounts: Record<number, number> = {};
    matchesList.forEach(match => {
      const stage = match.startup_uploads?.stage;
      if (typeof stage === 'number') {
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      }
    });
    const topStages = Object.entries(stageCounts)
      .map(([stage, count]) => ({ 
        stage: stage === '1' ? 'Pre-seed' : stage === '2' ? 'Seed' : `Series ${String.fromCharCode(64 + parseInt(stage))}`,
        count 
      }))
      .sort((a, b) => b.count - a.count);

    // Score distribution
    const distribution = [
      { range: '90-100', count: scores.filter(s => s >= 90).length },
      { range: '80-89', count: scores.filter(s => s >= 80 && s < 90).length },
      { range: '70-79', count: scores.filter(s => s >= 70 && s < 79).length },
      { range: '60-69', count: scores.filter(s => s >= 60 && s < 70).length },
      { range: '50-59', count: scores.filter(s => s >= 50 && s < 60).length },
      { range: '<50', count: scores.filter(s => s < 50).length },
    ];

    // GOD score distribution
    const godDistribution = [
      { range: '80-100', count: godScores.filter(s => s >= 80).length },
      { range: '70-79', count: godScores.filter(s => s >= 70 && s < 80).length },
      { range: '60-69', count: godScores.filter(s => s >= 60 && s < 70).length },
      { range: '50-59', count: godScores.filter(s => s >= 50 && s < 60).length },
      { range: '<50', count: godScores.filter(s => s < 50).length },
    ];

    return {
      total,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      averageScore: Math.round(averageScore * 10) / 10,
      averageGODScore: Math.round(averageGODScore * 10) / 10,
      topSectors,
      topStages,
      scoreDistribution: distribution,
      godScoreDistribution: godDistribution,
    };
  } catch (error) {
    console.error('Error getting investor match stats:', error);
    throw error;
  }
}

