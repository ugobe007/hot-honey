/**
 * Match Investigation Service
 * 
 * Provides deep-dive analysis tools for investigating individual matches
 * and understanding the fit between startups and investors.
 */

import { supabase } from '../config/supabase';

export interface MatchBreakdown {
  match_id: string;
  total_score: number;
  components: {
    name: string;
    score: number;
    max_score: number;
    weight: number;
    details: string;
  }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface PortfolioAnalysis {
  investor_id: string;
  investor_name: string;
  portfolio_companies: string[];
  similar_companies: {
    name: string;
    sector: string;
    stage: string;
    exit_status?: string;
  }[];
  complementary_companies: {
    name: string;
    sector: string;
    reason: string;
  }[];
  portfolio_gaps: {
    sector: string;
    opportunity: string;
  }[];
}

export interface FitAnalysis {
  stage_fit: {
    match: boolean;
    score: number;
    details: string;
  };
  sector_fit: {
    match: boolean;
    score: number;
    matched_sectors: string[];
    details: string;
  };
  geography_fit: {
    match: boolean;
    score: number;
    details: string;
  };
  check_size_fit: {
    match: boolean;
    score: number;
    startup_raise: number;
    investor_range: { min: number; max: number };
    details: string;
  };
  portfolio_fit: {
    match: boolean;
    score: number;
    analysis: string;
  };
  traction_fit: {
    match: boolean;
    score: number;
    metrics: {
      revenue?: number;
      growth?: number;
      customers?: number;
    };
    details: string;
  };
}

/**
 * Get detailed breakdown of a match score
 */
export async function getMatchBreakdown(
  matchId: string
): Promise<MatchBreakdown> {
  try {
    const { data: match, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        id,
        match_score,
        reasoning,
        startup_uploads:startup_id (
          id,
          name,
          sectors,
          stage,
          total_god_score,
          location,
          raise_amount,
          mrr,
          arr,
          growth_rate_monthly,
          customer_count,
          team_size,
          extracted_data
        ),
        investors:investor_id (
          id,
          name,
          firm,
          sectors,
          stage,
          geography_focus,
          check_size_min,
          check_size_max,
          portfolio_companies,
          investment_thesis,
          investor_tier,
          investor_score,
          last_investment_date,
          investment_pace_per_year,
          leads_rounds
        )
      `)
      .eq('id', matchId)
      .single();

    if (error) throw error;
    if (!match) throw new Error('Match not found');

    const startup = match.startup_uploads;
    const investor = match.investors;

    // Parse reasoning to extract component scores
    const components: MatchBreakdown['components'] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // GOD Score Component (55 points max)
    const godScore = startup?.total_god_score || 50;
    const godScoreComponent = Math.floor(godScore * 0.55);
    components.push({
      name: 'GOD Score Base',
      score: godScoreComponent,
      max_score: 55,
      weight: 55,
      details: `Startup GOD score: ${godScore} → ${godScoreComponent} points (55% weight)`,
    });

    // Quality Bonus
    if (godScore >= 80) {
      components.push({
        name: 'Elite Startup Bonus',
        score: 15,
        max_score: 15,
        weight: 15,
        details: 'Elite startup (GOD 80+) receives +15 bonus',
      });
      strengths.push('Elite startup quality (GOD 80+)');
    } else if (godScore >= 75) {
      components.push({
        name: 'High-Quality Startup Bonus',
        score: 10,
        max_score: 10,
        weight: 10,
        details: 'High-quality startup (GOD 75-79) receives +10 bonus',
      });
      strengths.push('High-quality startup (GOD 75-79)');
    } else if (godScore >= 70) {
      components.push({
        name: 'Quality Startup Bonus',
        score: 5,
        max_score: 5,
        weight: 5,
        details: 'Quality startup (GOD 70-74) receives +5 bonus',
      });
    } else if (godScore < 60) {
      weaknesses.push(`Startup GOD score is below 60 (${godScore})`);
      recommendations.push('Focus on improving startup fundamentals to increase match quality');
    }

    // Stage Fit (15 points)
    const startupStage = startup?.stage || 2;
    const investorStages = (investor?.stage || '').toString().toLowerCase();
    let stageScore = 0;
    let stageDetails = '';

    if (startupStage === 1 && investorStages.includes('pre')) {
      stageScore = 15;
      stageDetails = 'Perfect pre-seed stage alignment';
      strengths.push('Perfect stage fit (pre-seed)');
    } else if (startupStage === 2 && investorStages.includes('seed')) {
      stageScore = 15;
      stageDetails = 'Perfect seed stage alignment';
      strengths.push('Perfect stage fit (seed)');
    } else if (startupStage >= 3 && investorStages.includes('series')) {
      stageScore = 15;
      stageDetails = 'Perfect series stage alignment';
      strengths.push('Perfect stage fit (series)');
    } else if (investorStages.includes('early')) {
      stageScore = 10;
      stageDetails = 'Good early-stage alignment';
    } else if (investorStages.includes('any') || investorStages.includes('all')) {
      stageScore = 8;
      stageDetails = 'Flexible investor (any stage)';
    } else {
      stageDetails = 'Stage mismatch';
      weaknesses.push('Stage alignment could be improved');
      recommendations.push('Consider investors who focus on your stage');
    }

    components.push({
      name: 'Stage Fit',
      score: stageScore,
      max_score: 15,
      weight: 15,
      details: stageDetails,
    });

    // Sector Fit (20 points)
    const startupSectors = Array.isArray(startup?.sectors)
      ? startup.sectors.map(s => s.toLowerCase().trim())
      : (startup?.sectors || '').toString().split(',').map(s => s.trim().toLowerCase());

    const investorSectors = Array.isArray(investor?.sectors)
      ? investor.sectors.map(s => s.toLowerCase().trim())
      : (investor?.sectors || investor?.investment_thesis || '').toString().toLowerCase();

    let sectorMatches = 0;
    const matchedSectors: string[] = [];

    if (Array.isArray(startupSectors) && startupSectors.length > 0) {
      startupSectors.forEach(sector => {
        if (Array.isArray(investorSectors)) {
          if (investorSectors.some(invS => invS.toLowerCase().includes(sector) || sector.includes(invS.toLowerCase()))) {
            sectorMatches++;
            matchedSectors.push(sector);
          }
        } else if (investorSectors.includes(sector) || investorSectors.includes(sector.replace(/\s+/g, ''))) {
          sectorMatches++;
          matchedSectors.push(sector);
        }
      });
    }

    const sectorScore = Math.min(sectorMatches * 7, 20);
    components.push({
      name: 'Sector Fit',
      score: sectorScore,
      max_score: 20,
      weight: 20,
      details: sectorMatches > 0
        ? `${sectorMatches} sector match(es): ${matchedSectors.join(', ')}`
        : 'No sector alignment',
    });

    if (sectorMatches > 0) {
      strengths.push(`Strong sector alignment: ${matchedSectors.join(', ')}`);
    } else {
      weaknesses.push('No sector alignment');
      recommendations.push('Consider investors who focus on your sectors');
    }

    // Geography Fit (5 points)
    const startupLoc = (startup?.location || '').toLowerCase();
    const investorGeos = Array.isArray(investor?.geography_focus)
      ? investor.geography_focus.map(g => g.toLowerCase())
      : [(investor?.geography_focus || '').toLowerCase()];

    const hasGeoMatch = investorGeos.some(invLoc => 
      startupLoc.includes(invLoc) || invLoc.includes(startupLoc)
    );

    const geoScore = hasGeoMatch ? 5 : 0;
    components.push({
      name: 'Geography Fit',
      score: geoScore,
      max_score: 5,
      weight: 5,
      details: hasGeoMatch
        ? `Geography match: ${startup?.location} aligns with investor focus`
        : 'No geography alignment',
    });

    if (hasGeoMatch) {
      strengths.push('Geography alignment');
    } else {
      weaknesses.push('Geography mismatch');
    }

    // Investor Quality (5 points)
    const investorScore = investor?.investor_score || investor?.quality_score || 5;
    let investorQualityScore = 0;
    if (investorScore >= 8) {
      investorQualityScore = 5;
      strengths.push('Elite investor match');
    } else if (investorScore >= 6) {
      investorQualityScore = 3;
      strengths.push('Quality investor match');
    }

    components.push({
      name: 'Investor Quality',
      score: investorQualityScore,
      max_score: 5,
      weight: 5,
      details: `Investor score: ${investorScore} → ${investorQualityScore} points`,
    });

    // Check Size Fit (10 points)
    const startupRaise = startup?.raise_amount || startup?.extracted_data?.funding_amount_usd || 0;
    const minCheck = investor?.check_size_min || 0;
    const maxCheck = investor?.check_size_max || Infinity;
    let checkSizeScore = 0;
    let checkSizeDetails = '';

    if (startupRaise > 0 && minCheck > 0) {
      if (startupRaise >= minCheck && startupRaise <= maxCheck) {
        checkSizeScore = 10;
        checkSizeDetails = 'Perfect check size fit';
        strengths.push('Perfect check size alignment');
      } else if (startupRaise < minCheck && startupRaise >= minCheck * 0.5) {
        checkSizeScore = 5;
        checkSizeDetails = 'Slightly below minimum check size';
      } else if (startupRaise > maxCheck && startupRaise <= maxCheck * 1.5) {
        checkSizeScore = 5;
        checkSizeDetails = 'Slightly above maximum check size';
      } else {
        checkSizeDetails = 'Check size mismatch';
        weaknesses.push('Check size may not align with investor range');
      }
    } else {
      checkSizeDetails = 'Check size data unavailable';
    }

    components.push({
      name: 'Check Size Fit',
      score: checkSizeScore,
      max_score: 10,
      weight: 10,
      details: checkSizeDetails,
    });

    // Investment Activity (5 points)
    let activityScore = 0;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const lastInvestment = investor?.last_investment_date 
      ? new Date(investor.last_investment_date) 
      : null;

    if (lastInvestment && lastInvestment > sixMonthsAgo) {
      activityScore += 3;
      strengths.push('Active investor (recent investments)');
    }
    if (investor?.investment_pace_per_year && investor.investment_pace_per_year >= 10) {
      activityScore += 2;
      strengths.push('High investment pace');
    }
    if (investor?.leads_rounds) {
      activityScore += 2;
      strengths.push('Leads rounds');
    }

    components.push({
      name: 'Investment Activity',
      score: Math.min(activityScore, 5),
      max_score: 5,
      weight: 5,
      details: activityScore > 0 ? 'Active investor with recent activity' : 'Limited recent activity',
    });

    // Calculate total from components
    const calculatedTotal = components.reduce((sum, c) => sum + c.score, 0);

    // Generate recommendations
    if (weaknesses.length === 0) {
      recommendations.push('This is a strong match - prioritize outreach');
    } else {
      recommendations.push('Review weaknesses and consider if they can be addressed');
    }

    if (investor?.portfolio_companies && Array.isArray(investor.portfolio_companies) && investor.portfolio_companies.length > 0) {
      recommendations.push('Research investor portfolio for connection opportunities');
    }

    return {
      match_id: matchId,
      total_score: match.match_score || calculatedTotal,
      components,
      strengths,
      weaknesses,
      recommendations,
    };
  } catch (error) {
    console.error('Error getting match breakdown:', error);
    throw error;
  }
}

/**
 * Analyze investor portfolio fit for a startup
 */
export async function getPortfolioAnalysis(
  investorId: string,
  startupId: string
): Promise<PortfolioAnalysis> {
  try {
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('id, name, portfolio_companies, sectors')
      .eq('id', investorId)
      .single();

    if (investorError) throw investorError;

    const { data: startup, error: startupError } = await supabase
      .from('startup_uploads')
      .select('id, name, sectors, stage')
      .eq('id', startupId)
      .single();

    if (startupError) throw startupError;

    const portfolio = investor.portfolio_companies || [];
    const startupSectors = Array.isArray(startup.sectors)
      ? startup.sectors.map(s => s.toLowerCase())
      : (startup.sectors || '').toString().toLowerCase().split(',');

    // Find similar companies (same sector)
    const similarCompanies = portfolio
      .filter((company: string) => {
        const companyLower = company.toLowerCase();
        return startupSectors.some(sector => 
          companyLower.includes(sector) || sector.includes(companyLower)
        );
      })
      .map((company: string) => ({
        name: company,
        sector: startupSectors.find(s => company.toLowerCase().includes(s)) || 'Unknown',
        stage: 'Unknown',
      }));

    // Find complementary companies (adjacent sectors)
    const complementaryCompanies = portfolio
      .filter((company: string) => {
        const companyLower = company.toLowerCase();
        // Adjacent sector logic
        const isComplementary = 
          (companyLower.includes('fintech') || companyLower.includes('payments')) && 
          (startupSectors.some(s => s.includes('fintech') || s.includes('payments'))) ||
          (companyLower.includes('healthcare') || companyLower.includes('biotech')) && 
          (startupSectors.some(s => s.includes('healthcare') || s.includes('biotech')));
        return isComplementary && !similarCompanies.some(sc => sc.name === company);
      })
      .map((company: string) => ({
        name: company,
        sector: 'Complementary',
        reason: 'Adjacent sector with potential synergies',
      }));

    // Identify portfolio gaps
    const investorSectors = Array.isArray(investor.sectors)
      ? investor.sectors.map(s => s.toLowerCase())
      : (investor.sectors || '').toString().toLowerCase();
    
    const portfolioGaps = startupSectors
      .filter(sector => {
        // Check if investor focuses on this sector but has no portfolio companies in it
        const investorFocusesOnSector = investorSectors.includes(sector);
        const hasPortfolioCompany = portfolio.some((company: string) => 
          company.toLowerCase().includes(sector)
        );
        return investorFocusesOnSector && !hasPortfolioCompany;
      })
      .map(sector => ({
        sector,
        opportunity: `New opportunity in ${sector} - investor focuses here but has no portfolio companies yet`,
      }));

    return {
      investor_id: investorId,
      investor_name: investor.name || '',
      portfolio_companies: portfolio,
      similar_companies: similarCompanies,
      complementary_companies: complementaryCompanies,
      portfolio_gaps: portfolioGaps,
    };
  } catch (error) {
    console.error('Error getting portfolio analysis:', error);
    throw error;
  }
}

/**
 * Get comprehensive fit analysis for a match
 */
export async function getFitAnalysis(
  matchId: string
): Promise<FitAnalysis> {
  try {
    const { data: match, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        id,
        startup_uploads:startup_id (
          id,
          sectors,
          stage,
          location,
          raise_amount,
          mrr,
          arr,
          growth_rate_monthly,
          customer_count,
          extracted_data
        ),
        investors:investor_id (
          id,
          sectors,
          stage,
          geography_focus,
          check_size_min,
          check_size_max,
          portfolio_companies
        )
      `)
      .eq('id', matchId)
      .single();

    if (error) throw error;

    const startup = match.startup_uploads;
    const investor = match.investors;

    // Stage fit
    const startupStage = startup?.stage || 2;
    const investorStages = (investor?.stage || '').toString().toLowerCase();
    const stageMatch = 
      (startupStage === 1 && investorStages.includes('pre')) ||
      (startupStage === 2 && investorStages.includes('seed')) ||
      (startupStage >= 3 && investorStages.includes('series')) ||
      investorStages.includes('early') ||
      investorStages.includes('any') ||
      investorStages.includes('all');

    // Sector fit
    const startupSectors = Array.isArray(startup?.sectors)
      ? startup.sectors.map(s => s.toLowerCase())
      : (startup?.sectors || '').toString().toLowerCase().split(',');
    const investorSectors = Array.isArray(investor?.sectors)
      ? investor.sectors.map(s => s.toLowerCase())
      : (investor?.sectors || '').toString().toLowerCase();

    const matchedSectors = startupSectors.filter(sector => {
      if (Array.isArray(investorSectors)) {
        return investorSectors.some(is => 
          is.includes(sector) || sector.includes(is)
        );
      }
      return investorSectors.includes(sector);
    });

    // Geography fit
    const startupLoc = (startup?.location || '').toLowerCase();
    const investorGeos = Array.isArray(investor?.geography_focus)
      ? investor.geography_focus.map(g => g.toLowerCase())
      : [(investor?.geography_focus || '').toLowerCase()];
    const geoMatch = investorGeos.some(geo => 
      startupLoc.includes(geo) || geo.includes(startupLoc)
    );

    // Check size fit
    const startupRaise = startup?.raise_amount || startup?.extracted_data?.funding_amount_usd || 0;
    const minCheck = investor?.check_size_min || 0;
    const maxCheck = investor?.check_size_max || Infinity;
    const checkSizeMatch = startupRaise >= minCheck && startupRaise <= maxCheck;

    // Portfolio fit
    const portfolio = investor?.portfolio_companies || [];
    const portfolioMatch = portfolio.length > 0 && 
      portfolio.some((company: string) => {
        const companyLower = company.toLowerCase();
        return startupSectors.some(sector => companyLower.includes(sector));
      });

    // Traction fit
    const hasTraction = 
      (startup?.mrr || 0) > 0 ||
      (startup?.arr || 0) > 0 ||
      (startup?.growth_rate_monthly || 0) > 0 ||
      (startup?.customer_count || 0) > 0;

    return {
      stage_fit: {
        match: stageMatch,
        score: stageMatch ? 15 : 0,
        details: stageMatch 
          ? `Stage alignment: ${startupStage} matches investor focus`
          : 'Stage mismatch - investor may not focus on this stage',
      },
      sector_fit: {
        match: matchedSectors.length > 0,
        score: Math.min(matchedSectors.length * 7, 20),
        matched_sectors: matchedSectors,
        details: matchedSectors.length > 0
          ? `Sector alignment: ${matchedSectors.join(', ')}`
          : 'No sector alignment',
      },
      geography_fit: {
        match: geoMatch,
        score: geoMatch ? 5 : 0,
        details: geoMatch
          ? `Geography alignment: ${startup?.location} matches investor focus`
          : 'Geography mismatch',
      },
      check_size_fit: {
        match: checkSizeMatch,
        score: checkSizeMatch ? 10 : 0,
        startup_raise: startupRaise,
        investor_range: { min: minCheck, max: maxCheck },
        details: checkSizeMatch
          ? `Check size fit: $${startupRaise.toLocaleString()} within investor range`
          : `Check size mismatch: $${startupRaise.toLocaleString()} outside investor range`,
      },
      portfolio_fit: {
        match: portfolioMatch,
        score: portfolioMatch ? 5 : 2,
        analysis: portfolioMatch
          ? 'Similar companies in investor portfolio - strong fit'
          : portfolio.length > 0
            ? 'Portfolio gap - new opportunity for investor'
            : 'No portfolio data available',
      },
      traction_fit: {
        match: hasTraction,
        score: hasTraction ? 5 : 0,
        metrics: {
          revenue: startup?.mrr || startup?.arr || undefined,
          growth: startup?.growth_rate_monthly || undefined,
          customers: startup?.customer_count || undefined,
        },
        details: hasTraction
          ? 'Startup has demonstrated traction'
          : 'Limited traction metrics available',
      },
    };
  } catch (error) {
    console.error('Error getting fit analysis:', error);
    throw error;
  }
}





