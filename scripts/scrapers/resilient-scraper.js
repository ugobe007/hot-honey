#!/usr/bin/env node
/**
 * RESILIENT SCRAPER
 * =================
 * Enhanced scraper with full Phase 3 features:
 * - Anti-bot bypass
 * - Rate limiting
 * - Retry with exponential backoff
 * - Self-healing
 * - Comprehensive error handling
 * 
 * This is the production-ready version of the world-class scraper.
 * 
 * Usage:
 *   node scripts/scrapers/resilient-scraper.js <url> <dataType>
 */

require('dotenv').config();
const { WorldClassScraper } = require('./world-class-scraper');

/**
 * Resilient Scraper - Production-ready with all Phase 3 features
 */
class ResilientScraper extends WorldClassScraper {
  constructor(options = {}) {
    super({
      enableAutoRecovery: true,
      enableRateLimiting: true,
      enableAntiBot: true,
      useAI: true,
      useBrowser: false, // Enable when needed
      antiBot: {
        rotateUserAgent: true,
        randomizeHeaders: true,
        respectRobotsTxt: true
      },
      rateLimiter: {
        defaultRequestsPerMinute: 10,
        defaultRequestsPerHour: 100,
        enableExponentialBackoff: true
      },
      retry: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        jitter: true
      },
      ...options
    });
  }

  /**
   * Scrape with comprehensive error handling and resilience
   */
  async scrapeResilient(url, dataType, expectedFields = {}) {
    console.log(`\n🛡️  RESILIENT SCRAPING: ${url}`);
    console.log(`📋 Data Type: ${dataType}`);
    
    try {
      const result = await this.scrape(url, dataType, expectedFields);
      
      if (result.success) {
        console.log(`\n✅ SUCCESS!`);
        console.log(`   Strategy: ${result.strategy || result.metadata?.strategy || 'multi-strategy'}`);
        if (result.recovered) {
          console.log(`   🔧 Auto-recovered with: ${result.recoveryStrategy}`);
        }
        if (result.validation) {
          console.log(`   📊 Quality Score: ${result.validation.score}/100`);
        }
        return result;
      } else {
        console.log(`\n❌ FAILED`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Recoverable: ${result.recoverable ? 'Yes' : 'No'}`);
        if (result.analysis) {
          console.log(`   Recommendations:`, result.analysis.recommendations.map(r => r.action));
        }
        return result;
      }
    } catch (error) {
      console.error(`\n❌ FATAL ERROR: ${error.message}`);
      return {
        success: false,
        error: error.message,
        fatal: true
      };
    }
  }

  /**
   * Batch scrape with rate limiting and queue management
   */
  async scrapeBatch(urls, dataType, expectedFields = {}, options = {}) {
    const {
      concurrency = 1, // Process one at a time by default
      delayBetweenRequests = 2000
    } = options;

    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);
      
      const result = await this.scrapeResilient(url, dataType, expectedFields);
      results.push({ url, ...result });
      
      // Delay between requests (except last)
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    const recoveredCount = results.filter(r => r.recovered).length;
    
    console.log(`\n📊 BATCH SUMMARY`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Auto-recovered: ${recoveredCount}`);
    console.log(`   Failed: ${results.length - successCount}`);
    
    return results;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🛡️  RESILIENT SCRAPER - Production-Ready World-Class Scraper

Usage: node scripts/scrapers/resilient-scraper.js <url> <dataType> [options]

Examples:
  # Single URL
  node scripts/scrapers/resilient-scraper.js https://example.com/startup startup
  
  # With custom rate limits
  node scripts/scrapers/resilient-scraper.js https://example.com/startup startup --rpm 5

Options:
  --rpm <number>     Requests per minute (default: 10)
  --rph <number>     Requests per hour (default: 100)
  --no-ai            Disable AI fallback
  --no-recovery      Disable auto-recovery
  --no-rate-limit    Disable rate limiting
    `);
    process.exit(1);
  }
  
  const url = args[0];
  const dataType = args[1];
  
  // Parse options
  const rpmIndex = args.indexOf('--rpm');
  const rphIndex = args.indexOf('--rph');
  const options = {
    useAI: !args.includes('--no-ai'),
    enableAutoRecovery: !args.includes('--no-recovery'),
    enableRateLimiting: !args.includes('--no-rate-limit'),
    rateLimiter: {
      defaultRequestsPerMinute: rpmIndex !== -1 ? parseInt(args[rpmIndex + 1]) : 10,
      defaultRequestsPerHour: rphIndex !== -1 ? parseInt(args[rphIndex + 1]) : 100
    }
  };
  
  // Default fields based on data type
  const fieldSchemas = {
    startup: {
      name: { type: 'string', required: true },
      description: { type: 'string', required: false },
      funding: { type: 'currency', required: false },
      url: { type: 'url', required: false }
    },
    investor: {
      name: { type: 'string', required: true },
      bio: { type: 'string', required: false },
      url: { type: 'url', required: false }
    },
    article: {
      title: { type: 'string', required: true },
      content: { type: 'string', required: false },
      author: { type: 'string', required: false }
    }
  };
  
  const expectedFields = fieldSchemas[dataType] || fieldSchemas.startup;
  
  const scraper = new ResilientScraper(options);
  
  scraper.scrapeResilient(url, dataType, expectedFields)
    .then(result => {
      if (result.success) {
        console.log('\n✅ Scraping successful!');
        console.log(JSON.stringify(result.data, null, 2));
        process.exit(0);
      } else {
        console.log('\n❌ Scraping failed');
        if (result.analysis) {
          console.log('Analysis:', JSON.stringify(result.analysis, null, 2));
        }
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { ResilientScraper };

