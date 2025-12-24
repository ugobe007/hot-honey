/**
 * PORTFOLIO FIT SCORING SERVICE
 * 
 * Analyzes investor portfolios to score startup fit based on:
 * 1. Portfolio company similarity (sector, stage, model)
 * 2. Co-investment patterns (who they invest with)
 * 3. Investment timing patterns (thesis evolution)
 * 4. Exit success correlation (what predicts their winners)
 * 
 * This goes beyond stated preferences to learn actual investment behavior.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

class PortfolioFitService {
  
  /**
   * Calculate portfolio-based fit score for a startup-investor pair
   */
  async calculatePortfolioFit(startupId, investorId) {
    try {
      // Get startup details
      const { data: startup } = await supabase
        .from('startup_uploads')
        .select('*')
        .eq('id', startupId)
        .single();

      // Get investor with portfolio
      const { data: investor } = await supabase
        .from('investors')
        .select('*, portfolio_performance, portfolio_companies, notable_investments')
        .eq('id', investorId)
        .single();

      if (!startup || !investor) {
        return { score: 0, reasoning: 'Missing data' };
      }

      // Calculate component scores
      const sectorFit = await this.calculateSectorFit(startup, investor);
      const stageFit = await this.calculateStageFit(startup, investor);
      const patternFit = await this.calculatePatternFit(startup, investor);
      const thesisFit = await this.calculateThesisFit(startup, investor);
      const exitPatternFit = await this.calculateExitPatternFit(startup, investor);

      // Weight the components
      const weights = {
        sector: 0.25,
        stage: 0.20,
        pattern: 0.20,
        thesis: 0.20,
        exitPattern: 0.15
      };

      const totalScore = 
        sectorFit.score * weights.sector +
        stageFit.score * weights.stage +
        patternFit.score * weights.pattern +
        thesisFit.score * weights.thesis +
        exitPatternFit.score * weights.exitPattern;

      // Build reasoning
      const reasoning = this.buildReasoning({
        sectorFit,
        stageFit,
        patternFit,
        thesisFit,
        exitPatternFit
      });

      return {
        score: Math.round(totalScore * 100) / 100,
        components: {
          sectorFit,
          stageFit,
          patternFit,
          thesisFit,
          exitPatternFit
        },
        reasoning,
        confidence: this.calculateConfidence(investor)
      };
    } catch (err) {
      console.error('Portfolio fit calculation error:', err);
      return { score: 0, error: err.message };
    }
  }

  /**
   * Calculate sector fit based on portfolio composition
   */
  async calculateSectorFit(startup, investor) {
    const startupSectors = startup.sectors || [];
    const investorSectors = investor.sectors || [];
    
    // Get portfolio companies for deeper analysis
    const portfolioCompanies = investor.portfolio_companies || [];
    const notableInvestments = investor.notable_investments || [];

    // Direct sector match
    const directMatches = startupSectors.filter(s => 
      investorSectors.some(is => 
        is.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(is.toLowerCase())
      )
    );

    const directMatchScore = startupSectors.length > 0 
      ? directMatches.length / startupSectors.length 
      : 0;

    // Adjacent sector analysis (AI, SaaS often adjacent)
    const adjacentSectors = {
      'Artificial Intelligence': ['Machine Learning', 'Data', 'Automation', 'SaaS'],
      'SaaS': ['Enterprise Software', 'B2B', 'Cloud'],
      'FinTech': ['Payments', 'Banking', 'Insurance', 'Crypto/Web3'],
      'HealthTech': ['BioTech', 'Medical Devices', 'Healthcare'],
      'E-Commerce': ['Marketplace', 'Retail', 'D2C', 'Consumer'],
      'Developer Tools': ['DevOps', 'Infrastructure', 'Open Source'],
      'Cybersecurity': ['Security', 'Enterprise Software', 'Infrastructure']
    };

    let adjacentMatchCount = 0;
    for (const sector of startupSectors) {
      const adjacent = adjacentSectors[sector] || [];
      if (adjacent.some(adj => investorSectors.includes(adj))) {
        adjacentMatchCount++;
      }
    }

    const adjacentScore = startupSectors.length > 0
      ? adjacentMatchCount / startupSectors.length * 0.7 // 70% value of direct
      : 0;

    const totalScore = Math.min(1, directMatchScore * 0.7 + adjacentScore * 0.3);

    return {
      score: totalScore,
      directMatches,
      matchedSectors: directMatches,
      adjacentMatches: adjacentMatchCount > 0,
      reasoning: directMatches.length > 0 
        ? `Direct sector match: ${directMatches.join(', ')}`
        : adjacentMatchCount > 0 
          ? 'Adjacent sector fit'
          : 'No clear sector match'
    };
  }

  /**
   * Calculate stage fit based on investment history
   */
  async calculateStageFit(startup, investor) {
    const investorStages = investor.stage || [];
    const startupStage = startup.latest_funding_round || this.stageFromNumber(startup.stage);

    // Get actual investment stage distribution
    const { data: investments } = await supabase
      .from('investor_investments')
      .select('round_type')
      .eq('investor_id', investor.id);

    // Calculate stage distribution from actual investments
    const stageDistribution = {};
    if (investments) {
      for (const inv of investments) {
        const stage = this.normalizeStage(inv.round_type);
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
      }
    }

    // Check if startup stage matches investor preference
    const normalizedStartupStage = this.normalizeStage(startupStage);
    
    let score = 0;
    let reasoning = '';

    // Direct stage match in preferences
    if (investorStages.some(s => this.normalizeStage(s) === normalizedStartupStage)) {
      score = 1.0;
      reasoning = `${startupStage} is in investor's stated focus`;
    }
    // Historical investment at this stage
    else if (stageDistribution[normalizedStartupStage]) {
      const total = Object.values(stageDistribution).reduce((a, b) => a + b, 0);
      score = 0.8 * (stageDistribution[normalizedStartupStage] / total);
      reasoning = `Investor has ${stageDistribution[normalizedStartupStage]} prior investments at ${startupStage}`;
    }
    // Adjacent stage
    else if (this.isAdjacentStage(normalizedStartupStage, investorStages)) {
      score = 0.5;
      reasoning = `${startupStage} is adjacent to investor's typical stages`;
    }
    else {
      reasoning = `${startupStage} doesn't match investor's typical stages`;
    }

    return { score, reasoning, stageDistribution };
  }

  /**
   * Calculate pattern fit based on portfolio characteristics
   */
  async calculatePatternFit(startup, investor) {
    const patterns = {
      technical_founder: 0,
      revenue_focus: 0,
      team_size: 0,
      market_size: 0
    };

    // Analyze startup characteristics
    const startupHasTechFounder = startup.has_technical_cofounder || false;
    const startupHasRevenue = startup.has_revenue || startup.mrr > 0 || startup.arr > 0;
    const startupTeamSize = startup.team_size || 1;
    
    // Get portfolio company patterns (if we have them)
    const { data: portfolioStartups } = await supabase
      .from('startup_uploads')
      .select('has_technical_cofounder, has_revenue, team_size, arr, mrr')
      .in('lead_investor', [investor.name, investor.firm])
      .limit(50);

    if (portfolioStartups && portfolioStartups.length > 0) {
      const techFounderPct = portfolioStartups.filter(s => s.has_technical_cofounder).length / portfolioStartups.length;
      const revenuePct = portfolioStartups.filter(s => s.has_revenue || s.mrr > 0).length / portfolioStartups.length;
      const avgTeamSize = portfolioStartups.reduce((a, s) => a + (s.team_size || 1), 0) / portfolioStartups.length;

      // Score based on similarity to portfolio
      patterns.technical_founder = startupHasTechFounder === (techFounderPct > 0.5) ? 1 : 0.5;
      patterns.revenue_focus = startupHasRevenue === (revenuePct > 0.5) ? 1 : 0.5;
      patterns.team_size = Math.max(0, 1 - Math.abs(startupTeamSize - avgTeamSize) / 10);
    } else {
      // Default scores when no portfolio data
      patterns.technical_founder = startupHasTechFounder ? 0.7 : 0.5;
      patterns.revenue_focus = startupHasRevenue ? 0.6 : 0.5;
      patterns.team_size = 0.5;
    }

    const avgScore = Object.values(patterns).reduce((a, b) => a + b, 0) / Object.keys(patterns).length;

    return {
      score: avgScore,
      patterns,
      reasoning: this.patternReasoning(patterns, startup)
    };
  }

  /**
   * Calculate thesis alignment using AI
   */
  async calculateThesisFit(startup, investor) {
    if (!investor.investment_thesis && !investor.bio) {
      return { score: 0.5, reasoning: 'No thesis data available' };
    }

    const thesis = investor.investment_thesis || investor.bio || '';
    const startupDescription = `
      ${startup.name}: ${startup.tagline || ''}
      ${startup.description || ''}
      ${startup.pitch || ''}
      Sectors: ${(startup.sectors || []).join(', ')}
      Problem: ${startup.contrarian_belief || ''}
    `;

    try {
      // Use AI to assess thesis alignment
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing startup-investor fit. Given an investor thesis and startup description, rate their alignment from 0-100 and explain why in one sentence.'
          },
          {
            role: 'user',
            content: `Investor Thesis: ${thesis}\n\nStartup: ${startupDescription}\n\nRespond with JSON: {"score": number, "reasoning": "string"}`
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        score: (result.score || 50) / 100,
        reasoning: result.reasoning || 'AI-assessed thesis alignment'
      };
    } catch (err) {
      console.error('Thesis analysis error:', err);
      // Fallback: keyword matching
      const thesisLower = thesis.toLowerCase();
      const startupLower = startupDescription.toLowerCase();
      const keywords = (startup.sectors || []).map(s => s.toLowerCase());
      const matches = keywords.filter(k => thesisLower.includes(k)).length;
      const score = keywords.length > 0 ? matches / keywords.length * 0.7 : 0.5;
      
      return { score, reasoning: 'Keyword-based thesis match' };
    }
  }

  /**
   * Calculate fit based on exit patterns (what predicts success for this investor)
   */
  async calculateExitPatternFit(startup, investor) {
    // Get investor's successful exits
    const { data: exits } = await supabase
      .from('startup_exits')
      .select('startup_name, exit_type, exit_value_numeric, startup_uploads(*)')
      .eq('lead_investor_id', investor.id)
      .in('deal_status', ['completed']);

    if (!exits || exits.length === 0) {
      // Check portfolio performance field
      const perf = investor.portfolio_performance || {};
      if (perf.total_exits > 0) {
        return { 
          score: 0.6, 
          reasoning: `${perf.total_exits} known exits but no detailed data`,
          hasExitData: false 
        };
      }
      return { score: 0.5, reasoning: 'No exit data available', hasExitData: false };
    }

    // Analyze patterns from successful exits
    const exitPatterns = {
      avgGodScore: 0,
      sectors: {},
      techFounderPct: 0,
      avgTeamSize: 0
    };

    let exitCount = 0;
    for (const exit of exits) {
      const portfolio = exit.startup_uploads;
      if (portfolio) {
        exitPatterns.avgGodScore += portfolio.total_god_score || 50;
        (portfolio.sectors || []).forEach(s => {
          exitPatterns.sectors[s] = (exitPatterns.sectors[s] || 0) + 1;
        });
        if (portfolio.has_technical_cofounder) exitPatterns.techFounderPct++;
        exitPatterns.avgTeamSize += portfolio.team_size || 1;
        exitCount++;
      }
    }

    if (exitCount > 0) {
      exitPatterns.avgGodScore /= exitCount;
      exitPatterns.techFounderPct /= exitCount;
      exitPatterns.avgTeamSize /= exitCount;
    }

    // Score startup against exit patterns
    let score = 0;
    const reasons = [];

    // GOD score similarity
    const godScoreDiff = Math.abs((startup.total_god_score || 50) - exitPatterns.avgGodScore);
    score += Math.max(0, 1 - godScoreDiff / 30) * 0.3;
    if (godScoreDiff < 10) reasons.push('GOD score matches exit pattern');

    // Sector match with successful exits
    const topExitSectors = Object.entries(exitPatterns.sectors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);
    const sectorMatch = (startup.sectors || []).some(s => topExitSectors.includes(s));
    if (sectorMatch) {
      score += 0.4;
      reasons.push(`Sector matches ${topExitSectors[0]} exits`);
    }

    // Team composition
    if (startup.has_technical_cofounder === (exitPatterns.techFounderPct > 0.5)) {
      score += 0.3;
      reasons.push('Team composition matches exit pattern');
    }

    return {
      score: Math.min(1, score),
      reasoning: reasons.length > 0 ? reasons.join('; ') : 'Limited exit pattern match',
      exitCount: exits.length,
      topExitSectors,
      hasExitData: true
    };
  }

  /**
   * Build comprehensive reasoning
   */
  buildReasoning(components) {
    const reasons = [];
    
    if (components.sectorFit.score > 0.7) {
      reasons.push(`✅ Strong sector fit: ${components.sectorFit.reasoning}`);
    } else if (components.sectorFit.score > 0.4) {
      reasons.push(`⚡ Moderate sector fit: ${components.sectorFit.reasoning}`);
    }

    if (components.stageFit.score > 0.7) {
      reasons.push(`✅ Stage aligned: ${components.stageFit.reasoning}`);
    }

    if (components.thesisFit.score > 0.7) {
      reasons.push(`✅ Thesis match: ${components.thesisFit.reasoning}`);
    }

    if (components.exitPatternFit.hasExitData && components.exitPatternFit.score > 0.6) {
      reasons.push(`🏆 Matches exit pattern: ${components.exitPatternFit.reasoning}`);
    }

    return reasons.length > 0 ? reasons.join('\n') : 'Limited fit signals';
  }

  /**
   * Calculate confidence in the portfolio fit score
   */
  calculateConfidence(investor) {
    let confidence = 0;
    
    if (investor.portfolio_companies && investor.portfolio_companies.length > 5) confidence += 0.3;
    if (investor.investment_thesis && investor.investment_thesis.length > 50) confidence += 0.2;
    if (investor.portfolio_performance) confidence += 0.2;
    if (investor.sectors && investor.sectors.length > 2) confidence += 0.15;
    if (investor.stage && investor.stage.length > 0) confidence += 0.15;

    return Math.min(1, confidence);
  }

  /**
   * Bulk calculate portfolio fit for all matches of an investor
   */
  async bulkCalculateForInvestor(investorId, limit = 100) {
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id')
      .eq('investor_id', investorId)
      .limit(limit);

    if (!matches) return [];

    const results = [];
    for (const match of matches) {
      const fit = await this.calculatePortfolioFit(match.startup_id, investorId);
      results.push({ matchId: match.id, startupId: match.startup_id, ...fit });
      
      // Update match with portfolio fit data
      await supabase
        .from('startup_investor_matches')
        .update({
          fit_analysis: {
            portfolio_fit_score: fit.score,
            portfolio_fit_reasoning: fit.reasoning,
            portfolio_fit_confidence: fit.confidence,
            calculated_at: new Date().toISOString()
          }
        })
        .eq('id', match.id);
    }

    return results;
  }

  // Helper methods
  stageFromNumber(stage) {
    const stages = { 0: 'Pre-seed', 1: 'Seed', 2: 'Series A', 3: 'Series B', 4: 'Series C+' };
    return stages[stage] || 'Seed';
  }

  normalizeStage(stage) {
    if (!stage) return 'seed';
    const lower = stage.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower.includes('preseed') || lower.includes('pre')) return 'pre-seed';
    if (lower.includes('seed')) return 'seed';
    if (lower.includes('seriesa') || lower === 'a') return 'series-a';
    if (lower.includes('seriesb') || lower === 'b') return 'series-b';
    if (lower.includes('seriesc') || lower === 'c' || lower.includes('growth')) return 'growth';
    return 'seed';
  }

  isAdjacentStage(stage, investorStages) {
    const stageOrder = ['pre-seed', 'seed', 'series-a', 'series-b', 'growth'];
    const idx = stageOrder.indexOf(stage);
    if (idx === -1) return false;
    
    const adjacent = [stageOrder[idx - 1], stageOrder[idx + 1]].filter(Boolean);
    return investorStages.some(s => adjacent.includes(this.normalizeStage(s)));
  }

  patternReasoning(patterns, startup) {
    const points = [];
    if (patterns.technical_founder > 0.8 && startup.has_technical_cofounder) {
      points.push('Technical founder matches pattern');
    }
    if (patterns.revenue_focus > 0.8 && (startup.has_revenue || startup.mrr > 0)) {
      points.push('Revenue stage matches pattern');
    }
    return points.length > 0 ? points.join('; ') : 'General pattern assessment';
  }
}

module.exports = { PortfolioFitService };
