/**
 * SOURCE DETECTOR
 * ================
 * 
 * Intelligently detects the type and source of input.
 * Maps URLs to specialized adapters for optimal extraction.
 * 
 * Supported Sources:
 * - Crunchbase (company profiles, funding rounds)
 * - LinkedIn (company pages, people profiles)
 * - AngelList/Wellfound (startup profiles)
 * - GitHub (repos, orgs, user profiles)
 * - Twitter/X (profiles, company accounts)
 * - Product Hunt (launches, products)
 * - Y Combinator (company directory)
 * - TechCrunch (articles, funding news)
 * - SEC EDGAR (filings, 10-K, S-1)
 * - Press releases (PRNewswire, BusinessWire)
 * - Generic websites (company homepages)
 */

class SourceDetector {
  constructor() {
    // Domain to adapter mapping
    this.adapters = {
      // Startup databases
      'crunchbase.com': { adapter: 'crunchbase', type: 'database', priority: 'high' },
      'wellfound.com': { adapter: 'wellfound', type: 'database', priority: 'high' },
      'angellist.com': { adapter: 'wellfound', type: 'database', priority: 'high' },
      'pitchbook.com': { adapter: 'pitchbook', type: 'database', priority: 'high' },
      'dealroom.co': { adapter: 'dealroom', type: 'database', priority: 'high' },
      
      // Social/Professional
      'linkedin.com': { adapter: 'linkedin', type: 'social', priority: 'high' },
      'twitter.com': { adapter: 'twitter', type: 'social', priority: 'medium' },
      'x.com': { adapter: 'twitter', type: 'social', priority: 'medium' },
      
      // Developer platforms
      'github.com': { adapter: 'github', type: 'developer', priority: 'high' },
      'gitlab.com': { adapter: 'gitlab', type: 'developer', priority: 'medium' },
      'npmjs.com': { adapter: 'npm', type: 'developer', priority: 'medium' },
      
      // Launch platforms
      'producthunt.com': { adapter: 'producthunt', type: 'launch', priority: 'high' },
      'news.ycombinator.com': { adapter: 'hackernews', type: 'launch', priority: 'medium' },
      'ycombinator.com': { adapter: 'yc', type: 'accelerator', priority: 'high' },
      
      // News sources
      'techcrunch.com': { adapter: 'techcrunch', type: 'news', priority: 'high' },
      'venturebeat.com': { adapter: 'news', type: 'news', priority: 'medium' },
      'bloomberg.com': { adapter: 'news', type: 'news', priority: 'medium' },
      'forbes.com': { adapter: 'news', type: 'news', priority: 'medium' },
      'reuters.com': { adapter: 'news', type: 'news', priority: 'high' },
      'wsj.com': { adapter: 'news', type: 'news', priority: 'high' },
      
      // Press releases
      'prnewswire.com': { adapter: 'pressrelease', type: 'press', priority: 'high' },
      'businesswire.com': { adapter: 'pressrelease', type: 'press', priority: 'high' },
      'globenewswire.com': { adapter: 'pressrelease', type: 'press', priority: 'high' },
      
      // Government/Regulatory
      'sec.gov': { adapter: 'sec', type: 'regulatory', priority: 'high' },
      
      // Job boards (signal for growth)
      'greenhouse.io': { adapter: 'jobs', type: 'hiring', priority: 'medium' },
      'lever.co': { adapter: 'jobs', type: 'hiring', priority: 'medium' },
      'ashbyhq.com': { adapter: 'jobs', type: 'hiring', priority: 'medium' },
      'jobs.lever.co': { adapter: 'jobs', type: 'hiring', priority: 'medium' },
      'boards.greenhouse.io': { adapter: 'jobs', type: 'hiring', priority: 'medium' }
    };

    // URL patterns for more specific matching
    this.patterns = [
      // Crunchbase patterns
      { 
        pattern: /crunchbase\.com\/organization\/([^\/]+)/,
        adapter: 'crunchbase',
        type: 'company',
        extract: (match) => ({ slug: match[1] })
      },
      { 
        pattern: /crunchbase\.com\/person\/([^\/]+)/,
        adapter: 'crunchbase',
        type: 'person',
        extract: (match) => ({ slug: match[1] })
      },
      { 
        pattern: /crunchbase\.com\/funding_round\/([^\/]+)/,
        adapter: 'crunchbase',
        type: 'funding',
        extract: (match) => ({ id: match[1] })
      },
      
      // LinkedIn patterns
      { 
        pattern: /linkedin\.com\/company\/([^\/]+)/,
        adapter: 'linkedin',
        type: 'company',
        extract: (match) => ({ slug: match[1] })
      },
      { 
        pattern: /linkedin\.com\/in\/([^\/]+)/,
        adapter: 'linkedin',
        type: 'person',
        extract: (match) => ({ slug: match[1] })
      },
      
      // GitHub patterns
      { 
        pattern: /github\.com\/([^\/]+)\/([^\/]+)/,
        adapter: 'github',
        type: 'repo',
        extract: (match) => ({ owner: match[1], repo: match[2] })
      },
      { 
        pattern: /github\.com\/([^\/]+)\/?$/,
        adapter: 'github',
        type: 'org',
        extract: (match) => ({ org: match[1] })
      },
      
      // Product Hunt patterns
      { 
        pattern: /producthunt\.com\/posts\/([^\/]+)/,
        adapter: 'producthunt',
        type: 'product',
        extract: (match) => ({ slug: match[1] })
      },
      
      // YC patterns
      { 
        pattern: /ycombinator\.com\/companies\/([^\/]+)/,
        adapter: 'yc',
        type: 'company',
        extract: (match) => ({ slug: match[1] })
      },
      
      // SEC patterns
      { 
        pattern: /sec\.gov\/cgi-bin\/browse-edgar.*CIK=(\d+)/,
        adapter: 'sec',
        type: 'company',
        extract: (match) => ({ cik: match[1] })
      },
      { 
        pattern: /sec\.gov\/Archives\/edgar\/data\/(\d+)/,
        adapter: 'sec',
        type: 'filing',
        extract: (match) => ({ cik: match[1] })
      }
    ];
  }

  /**
   * Detect the source type and return metadata
   */
  async detect(input) {
    // Check if it's a URL
    const urlInfo = this.parseUrl(input);
    
    if (urlInfo.isUrl) {
      // Try pattern matching first (more specific)
      for (const { pattern, adapter, type, extract } of this.patterns) {
        const match = input.match(pattern);
        if (match) {
          return {
            isUrl: true,
            url: urlInfo.url,
            domain: urlInfo.domain,
            adapter,
            type,
            extracted: extract(match),
            priority: 'high',
            confidence: 0.95
          };
        }
      }

      // Fall back to domain matching
      const domainInfo = this.adapters[urlInfo.domain] || 
                         this.adapters[urlInfo.baseDomain];
      
      if (domainInfo) {
        return {
          isUrl: true,
          url: urlInfo.url,
          domain: urlInfo.domain,
          ...domainInfo,
          confidence: 0.8
        };
      }

      // Unknown domain - use generic adapter
      return {
        isUrl: true,
        url: urlInfo.url,
        domain: urlInfo.domain,
        adapter: 'generic',
        type: 'website',
        priority: 'low',
        confidence: 0.5
      };
    }

    // Not a URL - analyze as text
    return this.analyzeText(input);
  }

  /**
   * Parse URL and extract components
   */
  parseUrl(input) {
    try {
      // Add protocol if missing
      let url = input;
      if (!url.match(/^https?:\/\//i)) {
        // Check if it looks like a URL
        if (url.match(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(\/.*)?$/i)) {
          url = 'https://' + url;
        } else {
          return { isUrl: false };
        }
      }

      const parsed = new URL(url);
      const domain = parsed.hostname.replace(/^www\./, '');
      const parts = domain.split('.');
      const baseDomain = parts.slice(-2).join('.');

      return {
        isUrl: true,
        url: parsed.href,
        domain,
        baseDomain,
        path: parsed.pathname,
        query: Object.fromEntries(parsed.searchParams)
      };
    } catch {
      return { isUrl: false };
    }
  }

  /**
   * Analyze text input to determine what it contains
   */
  analyzeText(text) {
    const analysis = {
      isUrl: false,
      type: 'text',
      adapter: 'text',
      contentType: this.detectContentType(text),
      language: this.detectLanguage(text),
      confidence: 0.6
    };

    // Check if it's structured data
    if (this.isJson(text)) {
      analysis.type = 'json';
      analysis.adapter = 'json';
      analysis.confidence = 0.9;
    } else if (this.isXml(text)) {
      analysis.type = 'xml';
      analysis.adapter = 'xml';
      analysis.confidence = 0.9;
    } else if (this.isHtml(text)) {
      analysis.type = 'html';
      analysis.adapter = 'html';
      analysis.confidence = 0.8;
    }

    return analysis;
  }

  /**
   * Detect what type of content the text contains
   */
  detectContentType(text) {
    const indicators = {
      funding: /\b(raised|funding|series [a-e]|seed|investment|valuation)\b/i,
      hiring: /\b(hiring|job|career|position|role|join.*team)\b/i,
      product: /\b(launch|released|announce|feature|update|beta)\b/i,
      press: /\b(press release|for immediate release|contact:|media)\b/i,
      financial: /\b(revenue|profit|loss|earnings|quarterly|fiscal)\b/i,
      acquisition: /\b(acquire|acquisition|merger|bought|purchase)\b/i
    };

    const detected = [];
    for (const [type, pattern] of Object.entries(indicators)) {
      if (pattern.test(text)) {
        detected.push(type);
      }
    }

    return detected.length > 0 ? detected : ['general'];
  }

  /**
   * Simple language detection
   */
  detectLanguage(text) {
    // Very basic - just check for common English words
    const englishWords = /\b(the|and|is|are|was|were|have|has|been|will|would|could|should)\b/gi;
    const matches = text.match(englishWords) || [];
    return matches.length > 5 ? 'en' : 'unknown';
  }

  /**
   * Check if text is valid JSON
   */
  isJson(text) {
    try {
      JSON.parse(text.trim());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if text looks like XML
   */
  isXml(text) {
    return text.trim().startsWith('<?xml') || 
           (text.trim().startsWith('<') && text.includes('</'));
  }

  /**
   * Check if text looks like HTML
   */
  isHtml(text) {
    return /<(!DOCTYPE|html|head|body|div|p|a|span)/i.test(text);
  }

  /**
   * Get list of all supported adapters
   */
  getSupportedAdapters() {
    const adapters = new Set();
    for (const info of Object.values(this.adapters)) {
      adapters.add(info.adapter);
    }
    for (const { adapter } of this.patterns) {
      adapters.add(adapter);
    }
    return Array.from(adapters);
  }
}

module.exports = { SourceDetector };
