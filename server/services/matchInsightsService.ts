/**
 * Match Insights Service
 * 
 * Provides AI-powered insights, trends, and recommendations
 * for both startups and investors to understand their matches better.
 */

import { supabase } from '../config/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface MatchInsight {
  type: 'trend' | 'recommendation' | 'warning' | 'opportunity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable?: boolean;
  actionText?: string;
  data?: any;
}

export interface MatchTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  period: string;
  significance: 'high' | 'medium' | 'low';
}

/**
 * Get insights for a startup's matches
 */
export async function getStartupMatchInsights(
  startupId: string
): Promise<MatchInsight[]> {
  try {
    // Get match data
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        match_score,
        confidence_level,
        reasoning,
        created_at,
        investors:investor_id (
          name,
          firm,
          investor_tier,
          investor_score,
          sectors,
          stage,
          check_size_min,
          check_size_max,
          portfolio_companies,
          last_investment_date,
          investment_pace_per_year,
          leads_rounds
        ),
        startup_uploads:startup_id (
          name,
          sectors,
          stage,
          total_god_score,
          location
        )
      `)
      .eq('startup_id', startupId)
      .order('match_score', { ascending: false })
      .limit(50);

    if (error) throw error;

    const insights: MatchInsight[] = [];

    // 1. Analyze match quality trends
    const recentMatches = matches?.filter(m => {
      const matchDate = new Date(m.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return matchDate > thirtyDaysAgo;
    }) || [];

    const olderMatches = matches?.filter(m => {
      const matchDate = new Date(m.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return matchDate <= thirtyDaysAgo;
    }) || [];

    if (recentMatches.length > 0 && olderMatches.length > 0) {
      const recentAvg = recentMatches.reduce((sum, m) => sum + (m.match_score || 0), 0) / recentMatches.length;
      const olderAvg = olderMatches.reduce((sum, m) => sum + (m.match_score || 0), 0) / olderMatches.length;
      const change = recentAvg - olderAvg;

      if (Math.abs(change) > 5) {
        insights.push({
          type: 'trend',
          title: change > 0 ? 'Match Quality Improving' : 'Match Quality Declining',
          description: `Your recent matches have an average score of ${recentAvg.toFixed(1)}, which is ${Math.abs(change).toFixed(1)} points ${change > 0 ? 'higher' : 'lower'} than your older matches.`,
          priority: Math.abs(change) > 10 ? 'high' : 'medium',
          actionable: true,
          actionText: change > 0 ? 'Continue focusing on these areas' : 'Review your startup profile and update key metrics',
        });
      }
    }

    // 2. Check for elite investor matches
    const eliteMatches = matches?.filter(m => 
      m.investors?.investor_tier === 'elite' || (m.investors?.investor_score || 0) >= 8
    ) || [];

    if (eliteMatches.length > 0) {
      insights.push({
        type: 'opportunity',
        title: `${eliteMatches.length} Elite Investor Matches`,
        description: `You have ${eliteMatches.length} matches with elite-tier investors. These are high-value opportunities worth prioritizing.`,
        priority: 'high',
        actionable: true,
        actionText: 'Review elite matches and prepare personalized outreach',
        data: { count: eliteMatches.length },
      });
    }

    // 3. Check for sector concentration
    const sectorCounts: Record<string, number> = {};
    matches?.forEach(match => {
      const sectors = match.investors?.sectors || [];
      if (Array.isArray(sectors)) {
        sectors.forEach((s: string) => {
          sectorCounts[s] = (sectorCounts[s] || 0) + 1;
        });
      }
    });

    const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];
    if (topSector && topSector[1] > (matches?.length || 0) * 0.4) {
      insights.push({
        type: 'warning',
        title: 'Sector Concentration Risk',
        description: `${Math.round((topSector[1] / (matches?.length || 1)) * 100)}% of your matches are in ${topSector[0]}. Consider diversifying your investor outreach.`,
        priority: 'medium',
        actionable: true,
        actionText: 'Explore investors in adjacent sectors',
      });
    }

    // 4. Check for active investors
    const activeInvestors = matches?.filter(m => {
      if (!m.investors?.last_investment_date) return false;
      const lastInvestment = new Date(m.investors.last_investment_date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return lastInvestment > sixMonthsAgo;
    }) || [];

    if (activeInvestors.length > 0) {
      insights.push({
        type: 'opportunity',
        title: `${activeInvestors.length} Active Investors`,
        description: `${activeInvestors.length} of your matches have invested in the last 6 months, indicating they're actively deploying capital.`,
        priority: 'high',
        actionable: true,
        actionText: 'Prioritize outreach to active investors',
        data: { count: activeInvestors.length },
      });
    }

    // 5. Check for lead investors
    const leadInvestors = matches?.filter(m => m.investors?.leads_rounds === true) || [];
    if (leadInvestors.length > 0) {
      insights.push({
        type: 'opportunity',
        title: `${leadInvestors.length} Lead Investor Matches`,
        description: `You have ${leadInvestors.length} matches with investors who typically lead rounds. These are valuable for closing your round faster.`,
        priority: 'high',
        actionable: true,
        actionText: 'Focus on lead investor outreach',
        data: { count: leadInvestors.length },
      });
    }

    // 6. AI-generated insights
    if (matches && matches.length > 0) {
      const aiInsights = await generateAIInsights(matches, 'startup');
      insights.push(...aiInsights);
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  } catch (error) {
    console.error('Error getting startup match insights:', error);
    throw error;
  }
}

/**
 * Get insights for an investor's matches
 */
export async function getInvestorMatchInsights(
  investorId: string
): Promise<MatchInsight[]> {
  try {
    // Get match data
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        match_score,
        confidence_level,
        reasoning,
        created_at,
        startup_uploads:startup_id (
          name,
          sectors,
          stage,
          total_god_score,
          traction_score,
          team_score,
          location,
          mrr,
          arr,
          growth_rate_monthly,
          customer_count
        ),
        investors:investor_id (
          name,
          firm,
          sectors,
          stage
        )
      `)
      .eq('investor_id', investorId)
      .order('match_score', { ascending: false })
      .limit(50);

    if (error) throw error;

    const insights: MatchInsight[] = [];

    // 1. Check for elite startups
    const eliteStartups = matches?.filter(m => 
      (m.startup_uploads?.total_god_score || 0) >= 80
    ) || [];

    if (eliteStartups.length > 0) {
      insights.push({
        type: 'opportunity',
        title: `${eliteStartups.length} Elite Startup Matches`,
        description: `You have ${eliteStartups.length} matches with elite startups (GOD score 80+). These are high-quality opportunities.`,
        priority: 'high',
        actionable: true,
        actionText: 'Review elite startup matches',
        data: { count: eliteStartups.length },
      });
    }

    // 2. Check for high-traction startups
    const highTraction = matches?.filter(m => {
      const traction = m.startup_uploads?.traction_score || 0;
      const mrr = m.startup_uploads?.mrr || 0;
      const arr = m.startup_uploads?.arr || 0;
      const growth = m.startup_uploads?.growth_rate_monthly || 0;
      return traction >= 70 || mrr > 10000 || arr > 120000 || growth > 20;
    }) || [];

    if (highTraction.length > 0) {
      insights.push({
        type: 'opportunity',
        title: `${highTraction.length} High-Traction Startups`,
        description: `${highTraction.length} of your matches show strong traction metrics (revenue, growth, or high traction scores).`,
        priority: 'high',
        actionable: true,
        actionText: 'Prioritize high-traction matches',
        data: { count: highTraction.length },
      });
    }

    // 3. Check for sector alignment
    const investorSectors = matches?.[0]?.investors?.sectors || [];
    const startupSectorCounts: Record<string, number> = {};
    
    matches?.forEach(match => {
      const sectors = match.startup_uploads?.sectors || [];
      if (Array.isArray(sectors)) {
        sectors.forEach((s: string) => {
          startupSectorCounts[s] = (startupSectorCounts[s] || 0) + 1;
        });
      }
    });

    const alignedSectors = Object.entries(startupSectorCounts).filter(([sector]) => {
      if (Array.isArray(investorSectors)) {
        return investorSectors.some((is: string) => 
          is.toLowerCase().includes(sector.toLowerCase()) || 
          sector.toLowerCase().includes(is.toLowerCase())
        );
      }
      return false;
    });

    if (alignedSectors.length > 0) {
      insights.push({
        type: 'trend',
        title: 'Strong Sector Alignment',
        description: `Your matches are well-aligned with your investment focus. Top matched sectors: ${alignedSectors.slice(0, 3).map(([s]) => s).join(', ')}.`,
        priority: 'medium',
        actionable: false,
      });
    }

    // 4. Check for stage distribution
    const stageCounts: Record<number, number> = {};
    matches?.forEach(match => {
      const stage = match.startup_uploads?.stage;
      if (typeof stage === 'number') {
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      }
    });

    const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];
    if (topStage) {
      const stageName = topStage[0] === '1' ? 'Pre-seed' : topStage[0] === '2' ? 'Seed' : `Series ${String.fromCharCode(64 + parseInt(topStage[0]))}`;
      insights.push({
        type: 'trend',
        title: `Most Matches at ${stageName} Stage`,
        description: `${topStage[1]} of your matches are ${stageName} stage startups, indicating strong alignment with your stage focus.`,
        priority: 'low',
        actionable: false,
      });
    }

    // 5. AI-generated insights
    if (matches && matches.length > 0) {
      const aiInsights = await generateAIInsights(matches, 'investor');
      insights.push(...aiInsights);
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  } catch (error) {
    console.error('Error getting investor match insights:', error);
    throw error;
  }
}

/**
 * Generate AI-powered insights using Claude
 */
async function generateAIInsights(
  matches: any[],
  perspective: 'startup' | 'investor'
): Promise<MatchInsight[]> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return []; // Return empty if no API key
    }

    const matchesSummary = matches.slice(0, 10).map(m => ({
      score: m.match_score,
      confidence: m.confidence_level,
      reasoning: m.reasoning?.substring(0, 100),
      ...(perspective === 'startup' ? {
        investor: {
          name: m.investors?.name,
          firm: m.investors?.firm,
          tier: m.investors?.investor_tier,
        },
      } : {
        startup: {
          name: m.startup_uploads?.name,
          god_score: m.startup_uploads?.total_god_score,
          sectors: m.startup_uploads?.sectors,
        },
      }),
    }));

    const prompt = `You are an expert VC analyst. Analyze these ${perspective} matches and provide 2-3 key insights.

${perspective === 'startup' ? 'STARTUP PERSPECTIVE:' : 'INVESTOR PERSPECTIVE:'}
${JSON.stringify(matchesSummary, null, 2)}

Provide insights in JSON format:
{
  "insights": [
    {
      "type": "trend" | "recommendation" | "warning" | "opportunity",
      "title": "Short title",
      "description": "1-2 sentence description",
      "priority": "high" | "medium" | "low",
      "actionable": true/false,
      "actionText": "Optional action text"
    }
  ]
}

Focus on actionable insights that help ${perspective === 'startup' ? 'the startup' : 'the investor'} make better decisions.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.insights || [];
      }
    }

    return [];
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [];
  }
}

/**
 * Get match trends over time
 */
export async function getMatchTrends(
  entityId: string,
  entityType: 'startup' | 'investor',
  days: number = 30
): Promise<MatchTrend[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const column = entityType === 'startup' ? 'startup_id' : 'investor_id';
    
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select('match_score, confidence_level, created_at')
      .eq(column, entityId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const trends: MatchTrend[] = [];

    if (matches && matches.length > 0) {
      // Calculate average score trend
      const firstHalf = matches.slice(0, Math.floor(matches.length / 2));
      const secondHalf = matches.slice(Math.floor(matches.length / 2));

      const firstAvg = firstHalf.reduce((sum, m) => sum + (m.match_score || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + (m.match_score || 0), 0) / secondHalf.length;
      const change = secondAvg - firstAvg;

      if (Math.abs(change) > 2) {
        trends.push({
          metric: 'Average Match Score',
          direction: change > 0 ? 'up' : 'down',
          change: Math.abs(change),
          period: `Last ${days} days`,
          significance: Math.abs(change) > 5 ? 'high' : 'medium',
        });
      }

      // High confidence match trend
      const firstHigh = firstHalf.filter(m => m.confidence_level === 'high').length;
      const secondHigh = secondHalf.filter(m => m.confidence_level === 'high').length;
      const highChange = ((secondHigh / secondHalf.length) - (firstHigh / firstHalf.length)) * 100;

      if (Math.abs(highChange) > 5) {
        trends.push({
          metric: 'High Confidence Matches',
          direction: highChange > 0 ? 'up' : 'down',
          change: Math.abs(highChange),
          period: `Last ${days} days`,
          significance: Math.abs(highChange) > 10 ? 'high' : 'medium',
        });
      }
    }

    return trends;
  } catch (error) {
    console.error('Error getting match trends:', error);
    throw error;
  }
}





