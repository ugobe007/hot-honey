/**
 * Startup Match Search Service
 * 
 * Provides comprehensive search and filtering capabilities for startups
 * to find and investigate their investor matches.
 */

import { supabase } from '../config/supabase';

export interface MatchSearchFilters {
  // Score filters
  minScore?: number;
  maxScore?: number;
  confidenceLevel?: 'high' | 'medium' | 'low';
  
  // Investor filters
  investorTier?: 'elite' | 'strong' | 'emerging';
  investorType?: 'vc' | 'angel' | 'family_office' | 'corporate' | 'accelerator';
  leadsRounds?: boolean;
  activeInvestor?: boolean; // Recent investment activity
  
  // Sector/Stage filters
  sectors?: string[];
  stage?: string[];
  geography?: string[];
  
  // Check size filters
  minCheckSize?: number;
  maxCheckSize?: number;
  
  // Portfolio fit
  portfolioFit?: 'similar' | 'complementary' | 'gap' | 'any';
  
  // Sorting
  sortBy?: 'score' | 'recent' | 'investor_tier' | 'check_size';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
}

export interface MatchSearchResult {
  match_id: string;
  startup_id: string;
  investor_id: string;
  match_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  reasoning: string;
  created_at: string;
  
  // Investor details
  investor: {
    id: string;
    name: string;
    firm: string;
    title: string;
    photo_url?: string;
    linkedin_url?: string;
    investor_tier?: string;
    investor_score?: number;
    sectors?: string[];
    stage?: string;
    geography_focus?: string[];
    check_size_min?: number;
    check_size_max?: number;
    portfolio_companies?: string[];
    notable_investments?: any;
    investment_thesis?: string;
    last_investment_date?: string;
    investment_pace_per_year?: number;
    leads_rounds?: boolean;
  };
  
  // Startup details (for context)
  startup: {
    id: string;
    name: string;
    sectors?: string[];
    stage?: number;
    total_god_score?: number;
  };
}

/**
 * Search matches for a startup with advanced filtering
 * 
 * Smart Default: For startups, we limit to top 25% OR matches above 60 (whichever is more restrictive)
 * This prevents overwhelming users while ensuring they see quality matches.
 * Users can expand by adjusting filters.
 */
export async function searchStartupMatches(
  startupId: string,
  filters: MatchSearchFilters = {}
): Promise<{ matches: MatchSearchResult[]; total: number; filtered_total: number; limit_applied?: boolean }> {
  try {
    const {
      minScore,
      maxScore = 100,
      confidenceLevel,
      investorTier,
      investorType,
      leadsRounds,
      activeInvestor,
      sectors,
      stage,
      geography,
      minCheckSize,
      maxCheckSize,
      portfolioFit,
      sortBy = 'score',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = filters;

    // Smart default: If minScore not specified, apply smart filtering
    let effectiveMinScore = minScore;
    let limitApplied = false;
    
    if (minScore === undefined) {
      // First, get total count to calculate top 25%
      const { count: totalCount } = await supabase
        .from('startup_investor_matches')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', startupId);
      
      // Get all scores to find top 25% threshold
      const { data: allMatches } = await supabase
        .from('startup_investor_matches')
        .select('match_score')
        .eq('startup_id', startupId)
        .order('match_score', { ascending: false });
      
      if (allMatches && allMatches.length > 0) {
        const scores = allMatches.map(m => m.match_score).filter(s => typeof s === 'number');
        const top25PercentIndex = Math.floor(scores.length * 0.25);
        const top25PercentScore = scores[top25PercentIndex] || 0;
        
        // Use the more restrictive: top 25% score OR 60
        effectiveMinScore = Math.max(top25PercentScore, 65); // Increased from 60 to 65
        limitApplied = true;
      } else {
        effectiveMinScore = 65; // Increased from 60 to 65 for better selectivity
        limitApplied = true;
      }
    } else {
      effectiveMinScore = minScore;
    }

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
        investors:investor_id (
          id,
          name,
          firm,
          title,
          photo_url,
          linkedin_url,
          investor_tier,
          investor_score,
          sectors,
          stage,
          geography_focus,
          check_size_min,
          check_size_max,
          portfolio_companies,
          notable_investments,
          investment_thesis,
          last_investment_date,
          investment_pace_per_year,
          leads_rounds,
          status
        ),
        startup_uploads:startup_id (
          id,
          name,
          sectors,
          stage,
          total_god_score
        )
      `, { count: 'exact' })
      .eq('startup_id', startupId)
      .gte('match_score', effectiveMinScore)
      .lte('match_score', maxScore);

    // Apply filters
    if (confidenceLevel) {
      query = query.eq('confidence_level', confidenceLevel);
    }

    if (investorTier) {
      query = query.eq('investors.investor_tier', investorTier);
    }

    if (leadsRounds !== undefined) {
      query = query.eq('investors.leads_rounds', leadsRounds);
    }

    // Active investor filter (invested in last 6 months)
    if (activeInvestor) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      query = query.gte('investors.last_investment_date', sixMonthsAgo.toISOString());
    }

    // Sector filter (check if investor sectors overlap with filter)
    if (sectors && sectors.length > 0) {
      // Note: This is a simplified filter - full implementation would use array overlap
      // For now, we'll filter in JavaScript after fetching
    }

    // Stage filter
    if (stage && stage.length > 0) {
      // Filter by investor stage preferences
      // Note: This requires array overlap check in post-processing
    }

    // Geography filter
    if (geography && geography.length > 0) {
      // Filter by investor geography focus
      // Note: This requires array overlap check in post-processing
    }

    // Check size filters
    if (minCheckSize !== undefined) {
      query = query.lte('investors.check_size_min', minCheckSize);
    }
    if (maxCheckSize !== undefined) {
      query = query.gte('investors.check_size_max', maxCheckSize);
    }

    // Sorting
    if (sortBy === 'score') {
      query = query.order('match_score', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'recent') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'investor_tier') {
      query = query.order('investors.investor_score', { ascending: sortOrder === 'asc' });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error searching matches:', error);
      throw error;
    }

    // Post-process to apply filters that require array checks
    let filteredMatches = (data || []) as any[];

    // Sector filter (post-process)
    if (sectors && sectors.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        const investorSectors = match.investors?.sectors || [];
        if (Array.isArray(investorSectors)) {
          return sectors.some(s => 
            investorSectors.some((is: string) => 
              is.toLowerCase().includes(s.toLowerCase()) || 
              s.toLowerCase().includes(is.toLowerCase())
            )
          );
        }
        return false;
      });
    }

    // Stage filter (post-process)
    if (stage && stage.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        const investorStage = match.investors?.stage || '';
        const stageStr = typeof investorStage === 'string' ? investorStage : String(investorStage);
        return stage.some(s => stageStr.toLowerCase().includes(s.toLowerCase()));
      });
    }

    // Geography filter (post-process)
    if (geography && geography.length > 0) {
      filteredMatches = filteredMatches.filter(match => {
        const investorGeos = match.investors?.geography_focus || [];
        if (Array.isArray(investorGeos)) {
          return geography.some(g => 
            investorGeos.some((ig: string) => 
              ig.toLowerCase().includes(g.toLowerCase()) || 
              g.toLowerCase().includes(ig.toLowerCase())
            )
          );
        }
        return false;
      });
    }

    // Portfolio fit filter (post-process)
    if (portfolioFit && portfolioFit !== 'any') {
      filteredMatches = filteredMatches.filter(match => {
        const portfolio = match.investors?.portfolio_companies || [];
        const startupSectors = match.startup_uploads?.sectors || [];
        
        if (portfolioFit === 'similar') {
          // Check for similar companies in portfolio
          return portfolio.length > 0 && startupSectors.length > 0;
        } else if (portfolioFit === 'complementary') {
          // Check for complementary companies
          return portfolio.length > 0;
        } else if (portfolioFit === 'gap') {
          // Check for portfolio gap (no similar companies)
          return portfolio.length === 0 || !startupSectors.some((s: string) => 
            portfolio.some((p: string) => p.toLowerCase().includes(s.toLowerCase()))
          );
        }
        return true;
      });
    }

    // Format results
    const matches: MatchSearchResult[] = filteredMatches.map(match => ({
      match_id: match.id,
      startup_id: match.startup_id,
      investor_id: match.investor_id,
      match_score: match.match_score,
      confidence_level: match.confidence_level,
      reasoning: match.reasoning,
      created_at: match.created_at,
      investor: {
        id: match.investors?.id || '',
        name: match.investors?.name || '',
        firm: match.investors?.firm || '',
        title: match.investors?.title || '',
        photo_url: match.investors?.photo_url,
        linkedin_url: match.investors?.linkedin_url,
        investor_tier: match.investors?.investor_tier,
        investor_score: match.investors?.investor_score,
        sectors: match.investors?.sectors,
        stage: match.investors?.stage,
        geography_focus: match.investors?.geography_focus,
        check_size_min: match.investors?.check_size_min,
        check_size_max: match.investors?.check_size_max,
        portfolio_companies: match.investors?.portfolio_companies,
        notable_investments: match.investors?.notable_investments,
        investment_thesis: match.investors?.investment_thesis,
        last_investment_date: match.investors?.last_investment_date,
        investment_pace_per_year: match.investors?.investment_pace_per_year,
        leads_rounds: match.investors?.leads_rounds,
      },
      startup: {
        id: match.startup_uploads?.id || '',
        name: match.startup_uploads?.name || '',
        sectors: match.startup_uploads?.sectors,
        stage: match.startup_uploads?.stage,
        total_god_score: match.startup_uploads?.total_god_score,
      },
    }));

    // Get total count (before filtering) for reference
    const { count: totalBeforeFilter } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true })
      .eq('startup_id', startupId);

    return {
      matches,
      total: totalBeforeFilter || 0, // Total matches before smart filtering
      filtered_total: matches.length, // Matches after filtering
      limit_applied: limitApplied, // Whether smart limit was applied
    };
  } catch (error) {
    console.error('Error in searchStartupMatches:', error);
    throw error;
  }
}

/**
 * Get top matches for a startup (simplified, no filters)
 */
export async function getTopStartupMatches(
  startupId: string,
  limit: number = 10
): Promise<MatchSearchResult[]> {
  const { matches } = await searchStartupMatches(startupId, {
    minScore: 65, // Increased from 50 to 65 for better selectivity
    confidenceLevel: 'high',
    sortBy: 'score',
    sortOrder: 'desc',
    limit,
  });
  return matches;
}

/**
 * Get match statistics for a startup
 */
export async function getStartupMatchStats(startupId: string): Promise<{
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  averageScore: number;
  topSectors: { sector: string; count: number }[];
  topInvestorTiers: { tier: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
}> {
  try {
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        match_score,
        confidence_level,
        investors:investor_id (
          sectors,
          investor_tier
        )
      `)
      .eq('startup_id', startupId);

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

    // Top sectors
    const sectorCounts: Record<string, number> = {};
    matchesList.forEach(match => {
      const sectors = match.investors?.sectors || [];
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

    // Top investor tiers
    const tierCounts: Record<string, number> = {};
    matchesList.forEach(match => {
      const tier = match.investors?.investor_tier || 'unknown';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });
    const topInvestorTiers = Object.entries(tierCounts)
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count);

    // Score distribution
    const distribution = [
      { range: '90-100', count: scores.filter(s => s >= 90).length },
      { range: '80-89', count: scores.filter(s => s >= 80 && s < 90).length },
      { range: '70-79', count: scores.filter(s => s >= 70 && s < 80).length },
      { range: '60-69', count: scores.filter(s => s >= 60 && s < 70).length },
      { range: '50-59', count: scores.filter(s => s >= 50 && s < 60).length },
      { range: '<50', count: scores.filter(s => s < 50).length },
    ];

    return {
      total,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      averageScore: Math.round(averageScore * 10) / 10,
      topSectors,
      topInvestorTiers,
      scoreDistribution: distribution,
    };
  } catch (error) {
    console.error('Error getting match stats:', error);
    throw error;
  }
}

