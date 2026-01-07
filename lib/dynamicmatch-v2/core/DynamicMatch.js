/**
 * DYNAMICMATCH V2 - UNIVERSAL ADAPTIVE PARSER
 * ============================================
 * 
 * "Think different. Think around corners."
 * 
 * This is not a scraper. This is an intelligence extraction system.
 * It adapts to ANY source, extracts structured data WITHOUT AI APIs,
 * and builds a foundation for predictive scoring.
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────┐
 * │                 DynamicMatch v2                  │
 * ├─────────────────────────────────────────────────┤
 * │  1. Source Detection    → What type of content? │
 * │  2. Structure Extraction → Schema.org, meta     │
 * │  3. Content Parsing     → Readability, tables   │
 * │  4. Signal Cascade      → 500+ pattern matches  │
 * │  5. Entity Resolution   → Dedupe, normalize     │
 * │  6. Confidence Scoring  → How sure are we?      │
 * └─────────────────────────────────────────────────┘
 * 
 * @author Hot Match Team
 * @version 2.0.0
 */

const { SourceDetector } = require('./SourceDetector');
const { StructureExtractor } = require('./StructureExtractor');
const { SignalCascade } = require('../signals/SignalCascade');
const { EntityResolver } = require('./EntityResolver');
const { ConfidenceScorer } = require('./ConfidenceScorer');

class DynamicMatch {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      maxRetries: options.maxRetries || 2,
      userAgent: options.userAgent || 'HotMatch/2.0 (Startup Intelligence)',
      respectRobots: options.respectRobots !== false,
      cacheResults: options.cacheResults !== false,
      ...options
    };

    // Initialize components
    this.sourceDetector = new SourceDetector();
    this.structureExtractor = new StructureExtractor();
    this.signalCascade = new SignalCascade();
    this.entityResolver = new EntityResolver();
    this.confidenceScorer = new ConfidenceScorer();

    // Stats tracking
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      cacheHits: 0,
      avgLatency: 0,
      signalsExtracted: 0
    };

    // Simple in-memory cache
    this.cache = new Map();
    this.cacheMaxAge = 3600000; // 1 hour
  }

  /**
   * Main extraction method - the heart of DynamicMatch
   * 
   * @param {string} input - URL, text, or structured data
   * @param {object} context - Optional context (e.g., startup name for better matching)
   * @returns {Promise<ExtractionResult>}
   */
  async extract(input, context = {}) {
    const startTime = Date.now();
    this.stats.requests++;

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(input);
      if (this.options.cacheResults && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheMaxAge) {
          this.stats.cacheHits++;
          return { ...cached.data, fromCache: true };
        }
      }

      // Step 1: Detect source type
      const source = await this.sourceDetector.detect(input);
      
      // Step 2: Fetch content if URL
      let content = input;
      let rawHtml = null;
      
      if (source.isUrl) {
        const fetchResult = await this.fetchContent(source.url);
        content = fetchResult.text;
        rawHtml = fetchResult.html;
      }

      // Step 3: Extract structured data
      const structure = await this.structureExtractor.extract(rawHtml || content, source);

      // Step 4: Run signal cascade
      const signals = await this.signalCascade.process(content, structure, context);

      // Step 5: Resolve entities
      const entities = await this.entityResolver.resolve(signals, structure, context);

      // Step 6: Calculate confidence
      const confidence = this.confidenceScorer.score(signals, structure, entities);

      // Build result
      const result = {
        source: {
          type: source.type,
          url: source.url,
          domain: source.domain,
          adapter: source.adapter
        },
        structure: {
          schemaOrg: structure.schemaOrg,
          openGraph: structure.openGraph,
          metaTags: structure.metaTags,
          jsonLd: structure.jsonLd
        },
        signals: {
          funding: signals.funding,
          traction: signals.traction,
          team: signals.team,
          product: signals.product,
          market: signals.market,
          momentum: signals.momentum
        },
        entities: {
          company: entities.company,
          founders: entities.founders,
          investors: entities.investors,
          competitors: entities.competitors
        },
        confidence: {
          overall: confidence.overall,
          breakdown: confidence.breakdown,
          dataQuality: confidence.dataQuality
        },
        meta: {
          extractedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          version: '2.0.0',
          signalCount: this.countSignals(signals)
        }
      };

      // Update stats
      this.stats.successes++;
      this.stats.signalsExtracted += result.meta.signalCount;
      this.updateAvgLatency(result.meta.latencyMs);

      // Cache result
      if (this.options.cacheResults) {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result;

    } catch (error) {
      this.stats.failures++;
      
      return {
        source: { type: 'unknown', url: input },
        error: {
          message: error.message,
          code: error.code || 'EXTRACTION_FAILED'
        },
        signals: {},
        entities: {},
        confidence: { overall: 0 },
        meta: {
          extractedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          version: '2.0.0',
          signalCount: 0
        }
      };
    }
  }

  /**
   * Batch extraction for multiple inputs
   */
  async extractBatch(inputs, context = {}, concurrency = 5) {
    const results = [];
    
    for (let i = 0; i < inputs.length; i += concurrency) {
      const batch = inputs.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(input => this.extract(input, context))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Extract and merge from multiple sources for same entity
   */
  async extractAndMerge(sources, context = {}) {
    const results = await this.extractBatch(sources, context);
    return this.entityResolver.mergeResults(results);
  }

  /**
   * Fetch content with retries and error handling
   */
  async fetchContent(url) {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': this.options.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive'
        },
        timeout: this.options.timeout
      };

      const req = protocol.request(options, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.fetchContent(res.headers.location).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            html: data,
            text: this.htmlToText(data),
            contentType: res.headers['content-type']
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Simple HTML to text conversion
   */
  htmlToText(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Count total signals extracted
   */
  countSignals(signals) {
    let count = 0;
    for (const category of Object.values(signals)) {
      if (Array.isArray(category)) {
        count += category.length;
      } else if (typeof category === 'object' && category !== null) {
        count += Object.keys(category).filter(k => category[k] !== null).length;
      }
    }
    return count;
  }

  /**
   * Generate cache key
   */
  getCacheKey(input) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(input).digest('hex');
  }

  /**
   * Update rolling average latency
   */
  updateAvgLatency(latency) {
    const total = this.stats.successes + this.stats.failures;
    this.stats.avgLatency = (this.stats.avgLatency * (total - 1) + latency) / total;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      successRate: this.stats.requests > 0 
        ? (this.stats.successes / this.stats.requests * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { DynamicMatch };
