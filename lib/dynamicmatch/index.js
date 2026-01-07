/**
 * DynamicMatch - Pattern-based intelligence extraction
 * No AI APIs - pure pattern matching and source-specific parsers
 * 
 * "Think different" - extract signal from noise without expensive inference
 */

const { detectSource, getExtractor } = require('./sourceDetector');
const { extractSignals } = require('./signalExtractor');

class DynamicMatch {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  /**
   * Main entry point - extract structured data from any URL or company name
   */
  async extract(input) {
    const startTime = Date.now();
    
    try {
      // Detect what kind of source this is
      const source = await detectSource(input);
      
      // Get the appropriate extractor
      const extractor = getExtractor(source.type);
      
      // Extract raw data using source-specific patterns
      const rawData = await extractor.extract(source.url);
      
      // Run signal inference on extracted text
      const signals = extractSignals(rawData);
      
      // Merge and return
      const result = {
        source: source.type,
        url: source.url,
        extracted: rawData,
        signals: signals,
        confidence: this.calculateConfidence(rawData, signals),
        latency_ms: Date.now() - startTime
      };
      
      this.stats.hits++;
      return result;
      
    } catch (error) {
      this.stats.errors++;
      return {
        source: 'unknown',
        url: input,
        extracted: {},
        signals: {},
        confidence: 0,
        error: error.message,
        latency_ms: Date.now() - startTime
      };
    }
  }

  calculateConfidence(rawData, signals) {
    let score = 0;
    if (rawData.name) score += 10;
    if (rawData.description && rawData.description.length > 50) score += 20;
    if (rawData.funding_amount) score += 25;
    if (rawData.employee_count) score += 15;
    if (signals.has_revenue) score += 20;
    if (signals.is_launched) score += 10;
    return Math.min(100, score);
  }

  getStats() {
    return this.stats;
  }
}

module.exports = { DynamicMatch };
