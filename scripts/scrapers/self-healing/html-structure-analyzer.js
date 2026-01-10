#!/usr/bin/env node
/**
 * HTML STRUCTURE ANALYZER
 * =======================
 * Analyzes HTML structure to detect changes and patterns.
 * Helps with selector generation and layout detection.
 */

const cheerio = require('cheerio');
const crypto = require('crypto');

/**
 * HTML Structure Analyzer
 */
class HTMLStructureAnalyzer {
  /**
   * Analyze HTML structure and extract patterns
   */
  analyze(html) {
    const $ = cheerio.load(html);
    
    return {
      structure: this.extractStructure($),
      metadata: this.extractMetadata($),
      patterns: this.detectPatterns($),
      semanticElements: this.findSemanticElements($),
      fingerprint: this.generateFingerprint($)
    };
  }

  /**
   * Extract HTML structure (hierarchy, common classes, IDs)
   */
  extractStructure($) {
    const structure = {
      depth: this.calculateDepth($),
      commonClasses: this.findCommonClasses($),
      commonIds: this.findCommonIds($),
      tagDistribution: this.getTagDistribution($),
      nestingPatterns: this.analyzeNesting($)
    };

    return structure;
  }

  /**
   * Calculate average HTML depth
   */
  calculateDepth($) {
    let maxDepth = 0;
    let totalDepth = 0;
    let elementCount = 0;

    $('*').each((i, el) => {
      let depth = 0;
      let current = el.parent;
      
      while (current && current.type !== 'root') {
        depth++;
        current = current.parent;
      }
      
      maxDepth = Math.max(maxDepth, depth);
      totalDepth += depth;
      elementCount++;
    });

    return {
      max: maxDepth,
      average: elementCount > 0 ? (totalDepth / elementCount).toFixed(2) : 0
    };
  }

  /**
   * Find most common CSS classes
   */
  findCommonClasses($) {
    const classCount = {};
    
    $('[class]').each((i, el) => {
      const classes = ($(el).attr('class') || '').split(' ').filter(c => c.trim());
      classes.forEach(cls => {
        classCount[cls] = (classCount[cls] || 0) + 1;
      });
    });

    return Object.entries(classCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([className, count]) => ({ className, count }));
  }

  /**
   * Find most common IDs
   */
  findCommonIds($) {
    const idCount = {};
    
    $('[id]').each((i, el) => {
      const id = $(el).attr('id');
      if (id) {
        idCount[id] = (idCount[id] || 0) + 1;
      }
    });

    return Object.entries(idCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, count }));
  }

  /**
   * Get tag distribution
   */
  getTagDistribution($) {
    const tagCount = {};
    
    $('*').each((i, el) => {
      const tag = el.tagName?.toLowerCase();
      if (tag) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    });

    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));
  }

  /**
   * Analyze nesting patterns
   */
  analyzeNesting($) {
    const patterns = [];
    
    // Common nesting patterns
    const commonPatterns = [
      'div > div',
      'article > h1',
      'section > h2',
      'div.container',
      'div.content',
      'div.wrapper'
    ];

    commonPatterns.forEach(pattern => {
      const count = $(pattern).length;
      if (count > 0) {
        patterns.push({ pattern, count });
      }
    });

    return patterns;
  }

  /**
   * Extract metadata (title, description, Open Graph, etc.)
   */
  extractMetadata($) {
    return {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || '',
      ogTitle: $('meta[property="og:title"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
      hasJSONLD: $('script[type="application/ld+json"]').length > 0,
      jsonLDCount: $('script[type="application/ld+json"]').length
    };
  }

  /**
   * Detect common patterns (e.g., Bootstrap, Tailwind, React apps)
   */
  detectPatterns($) {
    const patterns = {
      framework: this.detectFramework($),
      cssFramework: this.detectCSSFramework($),
      isSPA: this.detectSPA($),
      hasRSS: $('link[type="application/rss+xml"]').length > 0,
      hasSitemap: $('a[href*="sitemap"]').length > 0
    };

    return patterns;
  }

  /**
   * Detect JavaScript framework
   */
  detectFramework($) {
    const html = $.html().toLowerCase();
    const scripts = $('script').map((i, el) => $(el).attr('src') || '').get().join(' ').toLowerCase();
    
    if (html.includes('react') || scripts.includes('react')) return 'React';
    if (html.includes('vue') || scripts.includes('vue')) return 'Vue';
    if (html.includes('angular') || scripts.includes('angular')) return 'Angular';
    if (html.includes('next.js') || scripts.includes('_next')) return 'Next.js';
    if (html.includes('nuxt') || scripts.includes('nuxt')) return 'Nuxt';
    
    return 'Unknown';
  }

  /**
   * Detect CSS framework
   */
  detectCSSFramework($) {
    const html = $.html().toLowerCase();
    const classes = $('[class]').map((i, el) => $(el).attr('class')).get().join(' ').toLowerCase();
    
    if (classes.includes('bootstrap') || html.includes('bootstrap')) return 'Bootstrap';
    if (classes.includes('tailwind') || html.includes('tailwind')) return 'Tailwind';
    if (classes.includes('bulma') || html.includes('bulma')) return 'Bulma';
    if (classes.includes('foundation') || html.includes('foundation')) return 'Foundation';
    if (classes.includes('material') || html.includes('material')) return 'Material Design';
    
    return 'Unknown';
  }

  /**
   * Detect if site is a Single Page Application (SPA)
   */
  detectSPA($) {
    const html = $.html();
    
    // Check for common SPA indicators
    const indicators = [
      /react/i,
      /vue/i,
      /angular/i,
      /<div id="root"/i,
      /<div id="app"/i,
      /data-reactroot/i,
      /__next/i
    ];

    return indicators.some(pattern => pattern.test(html));
  }

  /**
   * Find semantic HTML5 elements
   */
  findSemanticElements($) {
    return {
      articles: $('article').length,
      sections: $('section').length,
      navs: $('nav').length,
      headers: $('header').length,
      footers: $('footer').length,
      asides: $('aside').length,
      mains: $('main').length
    };
  }

  /**
   * Generate fingerprint for structure comparison
   */
  generateFingerprint($) {
    const structure = {
      tagCount: this.getTagDistribution($).length,
      commonClasses: this.findCommonClasses($).slice(0, 5).map(c => c.className),
      hasSemantic: Object.values(this.findSemanticElements($)).some(v => v > 0)
    };

    const hash = crypto.createHash('md5')
      .update(JSON.stringify(structure))
      .digest('hex');

    return hash;
  }

  /**
   * Compare two HTML structures
   */
  compare(html1, html2) {
    const analysis1 = this.analyze(html1);
    const analysis2 = this.analyze(html2);

    const similarity = analysis1.fingerprint === analysis2.fingerprint ? 100 : 0;

    // More detailed comparison
    const classOverlap = this.calculateOverlap(
      analysis1.structure.commonClasses.map(c => c.className),
      analysis2.structure.commonClasses.map(c => c.className)
    );

    return {
      fingerprintMatch: analysis1.fingerprint === analysis2.fingerprint,
      classSimilarity: classOverlap,
      overallSimilarity: (similarity + (classOverlap * 50)) / 2,
      changes: this.detectChanges(analysis1, analysis2)
    };
  }

  /**
   * Calculate overlap between two arrays
   */
  calculateOverlap(arr1, arr2) {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = [...set1].filter(x => set2.has(x));
    return (intersection.length / Math.max(set1.size, set2.size)) * 100;
  }

  /**
   * Detect specific changes between two analyses
   */
  detectChanges(analysis1, analysis2) {
    const changes = {
      newClasses: [],
      removedClasses: [],
      structureChanged: analysis1.fingerprint !== analysis2.fingerprint
    };

    const classes1 = new Set(analysis1.structure.commonClasses.map(c => c.className));
    const classes2 = new Set(analysis2.structure.commonClasses.map(c => c.className));

    changes.newClasses = [...classes2].filter(c => !classes1.has(c));
    changes.removedClasses = [...classes1].filter(c => !classes2.has(c));

    return changes;
  }
}

module.exports = { HTMLStructureAnalyzer };

