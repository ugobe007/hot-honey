/**
 * DYNAMICMATCH V2 - STARTUP INTELLIGENCE ENGINE
 * ==============================================
 * 
 * "Think different. Think around corners. Leave everyone behind."
 * 
 * A complete system for extracting, analyzing, and predicting
 * startup success WITHOUT expensive AI API calls.
 * 
 * Usage:
 * ```javascript
 * const { DynamicMatchEngine } = require('dynamicmatch-v2');
 * 
 * const engine = new DynamicMatchEngine();
 * 
 * // Extract and score from any URL
 * const result = await engine.analyze('https://company.com');
 * console.log(result.godScore, result.successProbability);
 * 
 * // Extract from text
 * const result2 = await engine.analyze(pressReleaseText);
 * 
 * // Combine multiple sources
 * const result3 = await engine.analyzeMultiple([
 *   'https://company.com',
 *   'https://crunchbase.com/organization/company',
 *   'https://linkedin.com/company/company'
 * ]);
 * ```
 */

const { DynamicMatch } = require('./core/DynamicMatch');
const { SourceDetector } = require('./core/SourceDetector');
const { StructureExtractor } = require('./core/StructureExtractor');
const { SignalCascade } = require('./signals/SignalCascade');
const { EntityResolver } = require('./core/EntityResolver');
const { ConfidenceScorer } = require('./core/ConfidenceScorer');
const { PredictiveGodEngine } = require('./prediction/PredictiveGodEngine');

class DynamicMatchEngine {
  constructor(options = {}) {
    this.options = options;
    
    // Initialize components
    this.dynamicMatch = new DynamicMatch(options);
    this.predictiveEngine = new PredictiveGodEngine(options);
    
    // Stats
    this.stats = {
      analyzed: 0,
      avgGodScore: 0,
      avgSuccessProb: 0,
      errors: 0
    };
  }

  /**
   * Main analysis method - extract and score from any input
   * 
   * @param {string} input - URL, text, or structured data
   * @param {object} context - Optional context (company name, etc.)
   * @returns {Promise<AnalysisResult>}
   */
  async analyze(input, context = {}) {
    const startTime = Date.now();

    try {
      // Step 1: Extract data using DynamicMatch
      const extraction = await this.dynamicMatch.extract(input, context);

      if (extraction.error) {
        this.stats.errors++;
        return {
          success: false,
          error: extraction.error,
          input,
          latencyMs: Date.now() - startTime
        };
      }

      // Step 2: Run predictive scoring
      const prediction = await this.predictiveEngine.score(
        extraction.signals,
        extraction.entities,
        context.historicalData
      );

      // Step 3: Build result
      const result = {
        success: true,
        
        // Core scores
        godScore: prediction.godScore,
        deltaScore: prediction.deltaScore,
        predictedScore: prediction.predictedScore,
        successProbability: prediction.successProbability,
        
        // Tier classification
        tier: prediction.tier,
        predictedTier: prediction.predictedTier,
        
        // Detailed data
        company: extraction.entities.company,
        founders: extraction.entities.founders,
        investors: extraction.entities.investors,
        
        // Signals
        signals: extraction.signals,
        
        // Score breakdown
        breakdown: prediction.breakdown,
        
        // Insights
        insights: prediction.insights,
        
        // Confidence
        confidence: {
          overall: prediction.confidence,
          extraction: extraction.confidence?.overall || 0,
          dataQuality: extraction.confidence?.dataQuality || 'unknown'
        },
        
        // Source info
        source: extraction.source,
        structure: extraction.structure,
        
        // Meta
        meta: {
          input,
          analyzedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          version: '2.0.0'
        }
      };

      // Update stats
      this.stats.analyzed++;
      this.updateAverages(prediction);

      return result;

    } catch (error) {
      this.stats.errors++;
      return {
        success: false,
        error: {
          message: error.message,
          code: 'ANALYSIS_FAILED'
        },
        input,
        latencyMs: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze multiple sources and merge results
   */
  async analyzeMultiple(inputs, context = {}) {
    const results = await Promise.all(
      inputs.map(input => this.analyze(input, context))
    );

    // Filter successful results
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
      return {
        success: false,
        error: 'All sources failed',
        sources: inputs,
        errors: results.map(r => r.error)
      };
    }

    // Merge data from all sources
    const merged = this.mergeResults(successful);

    // Re-score with merged data
    const prediction = await this.predictiveEngine.score(
      merged.signals,
      merged.entities,
      context.historicalData
    );

    return {
      success: true,
      
      // Core scores (from merged data)
      godScore: prediction.godScore,
      deltaScore: prediction.deltaScore,
      predictedScore: prediction.predictedScore,
      successProbability: prediction.successProbability,
      
      tier: prediction.tier,
      predictedTier: prediction.predictedTier,
      
      // Merged data
      company: merged.entities.company,
      founders: merged.entities.founders,
      investors: merged.entities.investors,
      signals: merged.signals,
      
      // Source info
      sources: successful.map(r => ({
        url: r.source?.url,
        type: r.source?.type,
        confidence: r.confidence?.overall
      })),
      
      // Breakdown and insights
      breakdown: prediction.breakdown,
      insights: prediction.insights,
      
      // Meta
      meta: {
        inputCount: inputs.length,
        successfulSources: successful.length,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Quick score - just get GOD score without full analysis
   */
  async quickScore(input, context = {}) {
    const result = await this.analyze(input, context);
    
    return {
      godScore: result.godScore || 0,
      tier: result.tier || 'unknown',
      successProbability: result.successProbability || 0,
      confidence: result.confidence?.overall || 0
    };
  }

  /**
   * Batch analysis with progress callback
   */
  async analyzeBatch(inputs, context = {}, onProgress = null) {
    const results = [];
    const total = inputs.length;

    for (let i = 0; i < inputs.length; i++) {
      const result = await this.analyze(inputs[i], context);
      results.push(result);

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          percent: Math.round((i + 1) / total * 100),
          lastResult: result
        });
      }

      // Small delay to avoid overwhelming sources
      await this.sleep(100);
    }

    return {
      results,
      summary: this.summarizeBatch(results)
    };
  }

  /**
   * Merge results from multiple analyses
   */
  mergeResults(results) {
    const merged = {
      entities: {
        company: null,
        founders: [],
        investors: [],
        competitors: []
      },
      signals: {
        funding: null,
        traction: null,
        team: null,
        product: null,
        market: null,
        momentum: null
      }
    };

    // Find best company data
    for (const result of results) {
      if (result.company && 
          (!merged.entities.company || 
           result.confidence?.overall > merged.entities.company.confidence)) {
        merged.entities.company = result.company;
      }
    }

    // Merge founders (dedupe)
    const founderMap = new Map();
    for (const result of results) {
      for (const founder of result.founders || []) {
        const key = founder.name?.toLowerCase();
        if (key && !founderMap.has(key)) {
          founderMap.set(key, founder);
        }
      }
    }
    merged.entities.founders = Array.from(founderMap.values());

    // Merge investors (dedupe)
    const investorMap = new Map();
    for (const result of results) {
      for (const investor of result.investors || []) {
        const key = investor.name?.toLowerCase();
        if (key && !investorMap.has(key)) {
          investorMap.set(key, investor);
        }
      }
    }
    merged.entities.investors = Array.from(investorMap.values());

    // Merge signals (prefer non-null values)
    for (const result of results) {
      if (!result.signals) continue;
      
      for (const [category, data] of Object.entries(result.signals)) {
        if (data && (!merged.signals[category] || 
            this.signalHasMoreData(data, merged.signals[category]))) {
          merged.signals[category] = data;
        }
      }
    }

    return merged;
  }

  /**
   * Check if signal A has more data than signal B
   */
  signalHasMoreData(a, b) {
    if (!b) return true;
    
    const countData = (obj) => {
      let count = 0;
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) count += value.length;
        else if (value !== null && value !== false && value !== undefined) count++;
      }
      return count;
    };

    return countData(a) > countData(b);
  }

  /**
   * Summarize batch results
   */
  summarizeBatch(results) {
    const successful = results.filter(r => r.success);
    
    return {
      total: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      avgGodScore: successful.length > 0 
        ? Math.round(successful.reduce((s, r) => s + (r.godScore || 0), 0) / successful.length)
        : 0,
      avgSuccessProb: successful.length > 0
        ? Math.round(successful.reduce((s, r) => s + (r.successProbability || 0), 0) / successful.length * 100) / 100
        : 0,
      tierDistribution: this.getTierDistribution(successful)
    };
  }

  /**
   * Get tier distribution from results
   */
  getTierDistribution(results) {
    const dist = {
      'T1-Elite': 0,
      'T2-Strong': 0,
      'T3-Emerging': 0,
      'T4-Angel': 0,
      'T5-Incubator': 0
    };

    for (const result of results) {
      if (result.tier && dist.hasOwnProperty(result.tier)) {
        dist[result.tier]++;
      }
    }

    return dist;
  }

  /**
   * Update running averages
   */
  updateAverages(prediction) {
    const n = this.stats.analyzed;
    this.stats.avgGodScore = (this.stats.avgGodScore * (n - 1) + prediction.godScore) / n;
    this.stats.avgSuccessProb = (this.stats.avgSuccessProb * (n - 1) + prediction.successProbability) / n;
  }

  /**
   * Get engine stats
   */
  getStats() {
    return {
      ...this.stats,
      extractorStats: this.dynamicMatch.getStats(),
      avgGodScore: Math.round(this.stats.avgGodScore),
      avgSuccessProb: Math.round(this.stats.avgSuccessProb * 100) / 100
    };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export everything
module.exports = {
  DynamicMatchEngine,
  DynamicMatch,
  SourceDetector,
  StructureExtractor,
  SignalCascade,
  EntityResolver,
  ConfidenceScorer,
  PredictiveGodEngine
};
