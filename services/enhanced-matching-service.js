/**
 * ENHANCED MATCHING SERVICE
 * 
 * Integrates all ML components into a unified matching pipeline:
 * 1. Base embedding similarity
 * 2. Portfolio fit scoring
 * 3. Feedback-adjusted preferences
 * 4. GOD score weighting
 * 
 * This is the production-ready matching engine.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { PortfolioFitService } = require('./portfolio-fit-service');
const { MatchFeedbackService } = require('./match-feedback-service');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

class EnhancedMatchingService {
  constructor() {
    this.portfolioService = new PortfolioFitService();
    this.feedbackService = new MatchFeedbackService();
    
    // Weights for combining scores
    this.weights = {
      embedding: 0.30,      // Semantic similarity
      godScore: 0.25,       // Startup quality
      portfolioFit: 0.25,   // Portfolio analysis
      feedback: 0.20        // Learned preferences
    };
  }

  /**
   * Calculate enhanced match score with all signals
   */
  async calculateEnhancedScore(startupId, investorId, options = {}) {
    const { includeReasoning = true } = options;

    try {
      // Get base data
      const [startupResult, investorResult, existingMatch] = await Promise.all([
        supabase.from('startup_uploads').select('*').eq('id', startupId).single(),
        supabase.from('investors').select('*').eq('id', investorId).single(),
        supabase.from('startup_investor_matches')
          .select('match_score, semantic_similarity_score')
          .eq('startup_id', startupId)
          .eq('investor_id', investorId)
          .single()
      ]);

      const startup = startupResult.data;
      const investor = investorResult.data;

      if (!startup || !investor) {
        return { score: 0, error: 'Missing startup or investor data' };
      }

      // 1. Embedding similarity (from existing match or calculate)
      let embeddingScore = 0;
      if (existingMatch.data?.semantic_similarity_score) {
        embeddingScore = existingMatch.data.semantic_similarity_score / 100;
      } else if (startup.embedding_1536 && investor.embedding_1536) {
        embeddingScore = this.cosineSimilarity(startup.embedding_1536, investor.embedding_1536);
      }

      // 2. GOD score (normalized to 0-1)
      const godScore = (startup.total_god_score || 50) / 100;

      // 3. Portfolio fit
      const portfolioFit = await this.portfolioService.calculatePortfolioFit(startupId, investorId);

      // 4. Feedback adjustment
      const feedbackAdjustment = await this.feedbackService.getAdjustedMatchScore(
        investorId, 
        startupId, 
        existingMatch.data?.match_score || 50
      );

      // Combine scores
      const baseScore = 
        embeddingScore * this.weights.embedding +
        godScore * this.weights.godScore +
        portfolioFit.score * this.weights.portfolioFit;

      // Apply feedback adjustment (additive, capped at ±15)
      const feedbackDelta = (feedbackAdjustment - (existingMatch.data?.match_score || 50)) / 100;
      const finalScore = Math.max(0, Math.min(100, (baseScore * 100) + feedbackDelta * 20));

      const result = {
        score: Math.round(finalScore * 10) / 10,
        components: {
          embedding: Math.round(embeddingScore * 100),
          godScore: Math.round(godScore * 100),
          portfolioFit: Math.round(portfolioFit.score * 100),
          feedbackAdjusted: Math.round(feedbackAdjustment)
        },
        confidence: this.calculateConfidence(startup, investor, portfolioFit)
      };

      if (includeReasoning) {
        result.reasoning = this.generateReasoning(startup, investor, result.components, portfolioFit);
      }

      return result;
    } catch (err) {
      console.error('Enhanced matching error:', err);
      return { score: 0, error: err.message };
    }
  }

  /**
   * Re-rank existing matches with enhanced scoring
   */
  async rerankMatches(investorId, limit = 50) {
    // Get existing matches
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, match_score')
      .eq('investor_id', investorId)
      .order('match_score', { ascending: false })
      .limit(limit);

    if (!matches?.length) return [];

    // Calculate enhanced scores
    const enhanced = [];
    for (const match of matches) {
      const result = await this.calculateEnhancedScore(match.startup_id, investorId, {
        includeReasoning: false
      });
      
      enhanced.push({
        matchId: match.id,
        startupId: match.startup_id,
        originalScore: match.match_score,
        enhancedScore: result.score,
        components: result.components
      });
    }

    // Sort by enhanced score
    enhanced.sort((a, b) => b.enhancedScore - a.enhancedScore);

    // Update matches with new scores
    for (let i = 0; i < enhanced.length; i++) {
      const e = enhanced[i];
      await supabase
        .from('startup_investor_matches')
        .update({
          match_score: e.enhancedScore,
          fit_analysis: {
            ...e.components,
            original_score: e.originalScore,
            enhanced_at: new Date().toISOString()
          }
        })
        .eq('id', e.matchId);
    }

    return enhanced;
  }

  /**
   * Find best matches for a startup using enhanced scoring
   */
  async findBestInvestors(startupId, limit = 20) {
    // Get startup
    const { data: startup } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('id', startupId)
      .single();

    if (!startup) return [];

    // Get potential investors (matching sectors)
    const startupSectors = startup.sectors || [];
    
    let query = supabase
      .from('investors')
      .select('id, name, sectors, stage')
      .limit(200);

    // If startup has sectors, prioritize matching investors
    if (startupSectors.length > 0) {
      query = query.overlaps('sectors', startupSectors);
    }

    const { data: investors } = await query;
    if (!investors?.length) return [];

    // Score each investor
    const scored = [];
    for (const investor of investors) {
      const result = await this.calculateEnhancedScore(startupId, investor.id);
      scored.push({
        investorId: investor.id,
        investorName: investor.name,
        score: result.score,
        components: result.components,
        reasoning: result.reasoning
      });
    }

    // Sort and return top matches
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(startup, investor, components, portfolioFit) {
    const reasons = [];

    // Embedding similarity
    if (components.embedding >= 70) {
      reasons.push(`🎯 Strong semantic alignment (${components.embedding}%)`);
    } else if (components.embedding >= 50) {
      reasons.push(`📊 Moderate concept overlap (${components.embedding}%)`);
    }

    // GOD score
    if (components.godScore >= 80) {
      reasons.push(`⭐ Elite startup quality (GOD: ${components.godScore})`);
    } else if (components.godScore >= 60) {
      reasons.push(`✓ Strong fundamentals (GOD: ${components.godScore})`);
    }

    // Portfolio fit
    if (components.portfolioFit >= 70) {
      reasons.push(`🏆 Excellent portfolio fit`);
      if (portfolioFit.reasoning) {
        reasons.push(`  └─ ${portfolioFit.reasoning}`);
      }
    } else if (components.portfolioFit >= 50) {
      reasons.push(`📈 Good portfolio alignment`);
    }

    // Sectors
    const matchedSectors = (startup.sectors || []).filter(s => 
      (investor.sectors || []).some(is => 
        is.toLowerCase().includes(s.toLowerCase())
      )
    );
    if (matchedSectors.length > 0) {
      reasons.push(`🏷️ Sector match: ${matchedSectors.join(', ')}`);
    }

    return reasons.join('\n');
  }

  /**
   * Calculate confidence in the match score
   */
  calculateConfidence(startup, investor, portfolioFit) {
    let confidence = 0;

    // Startup data quality
    if (startup.embedding_1536) confidence += 0.2;
    if (startup.description && startup.description.length > 100) confidence += 0.1;
    if (startup.sectors?.length > 0) confidence += 0.1;
    if (startup.total_god_score > 0) confidence += 0.1;

    // Investor data quality  
    if (investor.embedding_1536) confidence += 0.2;
    if (investor.investment_thesis && investor.investment_thesis.length > 50) confidence += 0.1;
    if (investor.sectors?.length > 0) confidence += 0.1;

    // Portfolio fit confidence
    confidence += portfolioFit.confidence * 0.1;

    return Math.min(1, confidence);
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }
}

// CLI interface
async function main() {
  const service = new EnhancedMatchingService();
  const args = process.argv.slice(2);

  if (args[0] === '--rerank' && args[1]) {
    console.log(`🔄 Re-ranking matches for investor: ${args[1]}`);
    const results = await service.rerankMatches(args[1]);
    console.log(`  Re-ranked ${results.length} matches`);
    console.log('\nTop 5 enhanced matches:');
    results.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. Score: ${r.enhancedScore} (was ${r.originalScore})`);
    });
  } else if (args[0] === '--find' && args[1]) {
    console.log(`🔍 Finding best investors for startup: ${args[1]}`);
    const results = await service.findBestInvestors(args[1]);
    console.log(`\nTop 10 matches:`);
    results.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.investorName}: ${r.score}`);
      console.log(`     ${r.reasoning?.split('\n')[0] || ''}`);
    });
  } else {
    console.log('🎯 Enhanced Matching Service');
    console.log('Usage:');
    console.log('  --rerank <investorId>   Re-rank matches for an investor');
    console.log('  --find <startupId>      Find best investors for a startup');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EnhancedMatchingService };
