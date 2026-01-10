#!/usr/bin/env node
/**
 * SELECTOR REGENERATOR
 * ====================
 * Automatically generates new CSS selectors when parsing fails.
 * Analyzes HTML structure and suggests new selectors.
 */

const cheerio = require('cheerio');

/**
 * Selector Regenerator
 */
class SelectorRegenerator {
  constructor() {
    this.commonPatterns = {
      name: [
        'h1', 'h2.title', '.title', '.name', '[itemprop="name"]',
        'title', '.company-name', '.startup-name', '.product-name'
      ],
      description: [
        'p.description', '.description', '[itemprop="description"]',
        'meta[name="description"]', '.summary', '.about', '.intro'
      ],
      funding: [
        '.funding', '.raised', '[data-funding]', '.investment',
        '[class*="fund"]', '[class*="raise"]'
      ],
      url: [
        'a[href]', 'link[rel="canonical"]', 'meta[property="og:url"]'
      ],
      date: [
        'time', '.date', '[datetime]', '.published', '.timestamp'
      ]
    };
  }

  /**
   * Generate selectors for a field by analyzing HTML structure
   */
  async generateSelectors(html, fieldName, fieldType, targetText = null) {
    const $ = cheerio.load(html);
    const selectors = new Set();

    // Strategy 1: Try common patterns
    if (this.commonPatterns[fieldName]) {
      this.commonPatterns[fieldName].forEach(sel => selectors.add(sel));
    }

    // Strategy 2: Search by text content (if targetText provided)
    if (targetText) {
      const textSelectors = this.findSelectorsByText($, targetText, fieldType);
      textSelectors.forEach(sel => selectors.add(sel));
    }

    // Strategy 3: Analyze HTML structure for semantic patterns
    const semanticSelectors = this.findSemanticSelectors($, fieldName, fieldType);
    semanticSelectors.forEach(sel => selectors.add(sel));

    // Strategy 4: Look for data attributes
    const dataSelectors = this.findDataAttributeSelectors($, fieldName);
    dataSelectors.forEach(sel => selectors.add(sel));

    // Strategy 5: Look for ARIA labels
    const ariaSelectors = this.findAriaSelectors($, fieldName);
    ariaSelectors.forEach(sel => selectors.add(sel));

    // Test selectors and rank by match count
    const rankedSelectors = Array.from(selectors)
      .map(selector => ({
        selector,
        matches: this.countMatches($, selector, targetText, fieldType),
        specificity: this.calculateSpecificity(selector)
      }))
      .filter(s => s.matches > 0)
      .sort((a, b) => {
        // Prioritize: 1) matches, 2) specificity
        if (b.matches !== a.matches) return b.matches - a.matches;
        return b.specificity - a.specificity;
      });

    return rankedSelectors.slice(0, 10); // Return top 10
  }

  /**
   * Find selectors by searching for target text in HTML
   */
  findSelectorsByText($, targetText, fieldType) {
    const selectors = [];
    const searchText = targetText.toLowerCase().trim();

    // Search all elements
    $('*').each((i, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase().trim();

      if (text.includes(searchText) || searchText.includes(text)) {
        // Generate selector for this element
        const selector = this.generateSelectorForElement($el);
        if (selector) {
          selectors.push(selector);
        }
      }
    });

    return selectors;
  }

  /**
   * Find semantic selectors (class names, IDs that suggest purpose)
   */
  findSemanticSelectors($, fieldName, fieldType) {
    const selectors = [];
    const keywords = this.getSemanticKeywords(fieldName);

    // Search for class names or IDs containing keywords
    $('*').each((i, el) => {
      const $el = $(el);
      const classes = $el.attr('class') || '';
      const id = $el.attr('id') || '';

      for (const keyword of keywords) {
        if (classes.toLowerCase().includes(keyword) || id.toLowerCase().includes(keyword)) {
          // Generate selector
          if (classes) {
            classes.split(' ').forEach(cls => {
              if (cls.toLowerCase().includes(keyword)) {
                selectors.push(`.${cls}`);
              }
            });
          }
          if (id && id.toLowerCase().includes(keyword)) {
            selectors.push(`#${id}`);
          }
        }
      }
    });

    return [...new Set(selectors)];
  }

  /**
   * Find data attribute selectors
   */
  findDataAttributeSelectors($, fieldName) {
    const selectors = [];
    const keywords = this.getSemanticKeywords(fieldName);

    $('*').each((i, el) => {
      const $el = $(el);
      
      // Check all data attributes
      Object.keys(el.attribs || {}).forEach(attr => {
        if (attr.startsWith('data-')) {
          const attrValue = attr.replace('data-', '').toLowerCase();
          
          for (const keyword of keywords) {
            if (attrValue.includes(keyword) || attrValue === fieldName) {
              selectors.push(`[${attr}]`);
            }
          }
        }
      });
    });

    return [...new Set(selectors)];
  }

  /**
   * Find ARIA label selectors
   */
  findAriaSelectors($, fieldName) {
    const selectors = [];
    const keywords = this.getSemanticKeywords(fieldName);

    $('*').each((i, el) => {
      const $el = $(el);
      const ariaLabel = $el.attr('aria-label') || '';
      const ariaLabelledBy = $el.attr('aria-labelledby') || '';

      if (ariaLabel) {
        for (const keyword of keywords) {
          if (ariaLabel.toLowerCase().includes(keyword)) {
            selectors.push(`[aria-label*="${keyword}"]`);
          }
        }
      }
    });

    return [...new Set(selectors)];
  }

  /**
   * Generate selector for a specific element
   */
  generateSelectorForElement($el) {
    const id = $el.attr('id');
    if (id) {
      return `#${id}`;
    }

    const classes = $el.attr('class');
    if (classes) {
      const classList = classes.split(' ').filter(c => c.trim());
      if (classList.length > 0) {
        return `.${classList[0]}`;
      }
    }

    const tag = $el.prop('tagName')?.toLowerCase();
    if (tag) {
      // Try to make it more specific with parent context
      const parent = $el.parent();
      if (parent.length > 0) {
        const parentClass = parent.attr('class');
        if (parentClass) {
          return `.${parentClass.split(' ')[0]} ${tag}`;
        }
      }
      return tag;
    }

    return null;
  }

  /**
   * Count how many elements match a selector
   */
  countMatches($, selector, targetText, fieldType) {
    try {
      const elements = $(selector);
      
      if (targetText) {
        // If targetText provided, count exact matches
        const searchText = targetText.toLowerCase().trim();
        let matches = 0;
        
        elements.each((i, el) => {
          const text = $(el).text().toLowerCase().trim();
          if (text.includes(searchText) || searchText.includes(text)) {
            matches++;
          }
        });
        
        return matches;
      }
      
      return elements.length;
    } catch (error) {
      return 0; // Invalid selector
    }
  }

  /**
   * Calculate CSS selector specificity (rough estimate)
   */
  calculateSpecificity(selector) {
    // Simple specificity: ID > class > element
    const idCount = (selector.match(/#/g) || []).length;
    const classCount = (selector.match(/\./g) || []).length;
    const elementCount = selector.match(/^[a-z]+/g) ? 1 : 0;
    
    return (idCount * 100) + (classCount * 10) + elementCount;
  }

  /**
   * Get semantic keywords for a field
   */
  getSemanticKeywords(fieldName) {
    const keywordMap = {
      name: ['name', 'title', 'company', 'product', 'brand'],
      description: ['description', 'summary', 'about', 'intro', 'bio', 'overview'],
      funding: ['funding', 'fund', 'raise', 'raised', 'investment', 'capital'],
      url: ['url', 'link', 'website', 'site', 'homepage'],
      date: ['date', 'time', 'published', 'created', 'updated'],
      email: ['email', 'mail', 'contact'],
      location: ['location', 'city', 'address', 'place'],
      stage: ['stage', 'round', 'series'],
      sectors: ['sector', 'category', 'industry', 'vertical']
    };

    return keywordMap[fieldName] || [fieldName];
  }

  /**
   * Analyze HTML structure changes
   */
  analyzeStructureChanges(html1, html2) {
    const $1 = cheerio.load(html1);
    const $2 = cheerio.load(html2);

    const changes = {
      addedElements: [],
      removedElements: [],
      changedAttributes: [],
      structureSimilarity: 0
    };

    // Compare common selectors
    const commonSelectors = ['h1', 'h2', '.title', '.description', '[itemprop="name"]'];
    
    let matching = 0;
    for (const sel of commonSelectors) {
      const count1 = $1(sel).length;
      const count2 = $2(sel).length;
      
      if (count1 === count2 && count1 > 0) {
        matching++;
      }
    }

    changes.structureSimilarity = (matching / commonSelectors.length) * 100;

    return changes;
  }

  /**
   * Suggest new selectors based on old selector failure
   */
  async regenerateFromFailure(oldSelector, html, fieldName, fieldType) {
    console.log(`  🔄 Regenerating selector for '${fieldName}'...`);
    
    // Get candidates
    const candidates = await this.generateSelectors(html, fieldName, fieldType);
    
    if (candidates.length === 0) {
      return null;
    }

    // Return top candidate
    return {
      oldSelector,
      newSelector: candidates[0].selector,
      confidence: candidates[0].matches,
      alternatives: candidates.slice(1, 5).map(c => c.selector)
    };
  }
}

module.exports = { SelectorRegenerator };

