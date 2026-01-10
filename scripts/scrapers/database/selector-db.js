#!/usr/bin/env node
/**
 * SELECTOR DATABASE
 * =================
 * Stores and manages CSS selectors, parsing strategies, and success rates
 * per website/pattern. This is the knowledge base for self-healing scrapers.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Make database optional - scraper works without it
let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    // Silent - database is optional
    supabase = null;
  }
}

/**
 * Selector Database Manager
 */
class SelectorDatabase {
  constructor() {
    this.cache = new Map(); // In-memory cache for fast lookups
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get selectors for a website/pattern
   */
  async getSelectors(domain, dataType) {
    const cacheKey = `${domain}:${dataType}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.selectors;
      }
    }

    // If no database connection, return empty array (scraper works without DB)
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('scraper_selectors')
        .select('*')
        .eq('domain', domain)
        .eq('data_type', dataType)
        .eq('active', true)
        .order('success_rate', { ascending: false })
        .limit(10);

      if (error) {
        // Table might not exist yet - that's OK, just return empty array (silent)
        if (error.message.includes('Could not find the table') || error.message.includes('does not exist')) {
          // Silent - table is optional, scraper works without it
          return [];
        }
        console.warn(`⚠️  Selector DB query error: ${error.message}`);
        return [];
      }

      const selectors = (data || []).map(row => ({
        id: row.id,
        selector: row.selector,
        strategy: row.strategy, // 'css', 'ai', 'pattern', 'browser'
        dataType: row.data_type,
        field: row.field,
        successRate: row.success_rate,
        lastSuccess: row.last_success,
        usageCount: row.usage_count,
        metadata: row.metadata || {}
      }));

      // Cache results
      this.cache.set(cacheKey, {
        selectors,
        timestamp: Date.now()
      });

      return selectors;
    } catch (error) {
      console.error(`❌ Error fetching selectors: ${error.message}`);
      return [];
    }
  }

  /**
   * Save a successful selector
   */
  async saveSelector(domain, dataType, selector, strategy, field, metadata = {}) {
    try {
      // Check if selector already exists
      const { data: existing } = await supabase
        .from('scraper_selectors')
        .select('id, success_rate, usage_count')
        .eq('domain', domain)
        .eq('data_type', dataType)
        .eq('selector', selector)
        .eq('field', field)
        .single();

      if (existing) {
        // Update existing selector - increase success rate
        const newUsageCount = (existing.usage_count || 0) + 1;
        const newSuccessRate = Math.min(100, (existing.success_rate || 0) + 1);
        
        await supabase
          .from('scraper_selectors')
          .update({
            success_rate: newSuccessRate,
            usage_count: newUsageCount,
            last_success: new Date().toISOString(),
            metadata: metadata,
            active: true
          })
          .eq('id', existing.id);

        // Invalidate cache
        this.cache.delete(`${domain}:${dataType}`);
        
        return existing.id;
      } else {
        // Create new selector
        const { data, error } = await supabase
          .from('scraper_selectors')
          .insert({
            domain,
            data_type: dataType,
            selector,
            strategy,
            field: field || 'general',
            success_rate: 1,
            usage_count: 1,
            last_success: new Date().toISOString(),
            metadata,
            active: true,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;
        
        // Invalidate cache
        this.cache.delete(`${domain}:${dataType}`);
        
        return data.id;
      }
    } catch (error) {
      // Table might not exist yet - that's OK, just log silently (optional feature)
      if (error.message.includes('Could not find the table') || error.message.includes('does not exist')) {
        // Silent - table is optional, scraper works without it
        return null;
      }
      console.error(`❌ Error saving selector: ${error.message}`);
      return null;
    }
  }

  /**
   * Record a failed selector attempt
   */
  async recordFailure(selectorId) {
    try {
      const { data: existing } = await supabase
        .from('scraper_selectors')
        .select('success_rate, usage_count, failure_count')
        .eq('id', selectorId)
        .single();

      if (!existing) return;

      const newUsageCount = (existing.usage_count || 0) + 1;
      const newFailureCount = (existing.failure_count || 0) + 1;
      const newSuccessRate = Math.max(0, (existing.success_rate || 100) - 5); // Decrease by 5%

      // If success rate drops below 30%, deactivate
      const shouldDeactivate = newSuccessRate < 30;

      await supabase
        .from('scraper_selectors')
        .update({
          success_rate: newSuccessRate,
          usage_count: newUsageCount,
          failure_count: newFailureCount,
          last_failure: new Date().toISOString(),
          active: !shouldDeactivate
        })
        .eq('id', selectorId);

      if (shouldDeactivate) {
        console.log(`⚠️  Selector ${selectorId} deactivated (success rate < 30%)`);
      }
    } catch (error) {
      console.error(`❌ Error recording failure: ${error.message}`);
    }
  }

  /**
   * Get similar domain patterns (for sharing knowledge)
   */
  async getSimilarDomains(domain) {
    try {
      // Extract base domain (e.g., 'techcrunch.com' from 'www.techcrunch.com')
      const baseDomain = domain.replace(/^www\./, '').split('/')[0];
      
      const { data } = await supabase
        .from('scraper_selectors')
        .select('domain, data_type, strategy, selector, success_rate')
        .like('domain', `%${baseDomain}%`)
        .eq('active', true)
        .order('success_rate', { ascending: false })
        .limit(20);

      return data || [];
    } catch (error) {
      console.error(`❌ Error finding similar domains: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate selector from HTML structure (for auto-learning)
   */
  generateSelectorFromHTML(html, targetText, field) {
    // This is a placeholder - will be enhanced with HTML analysis
    // For now, returns common patterns
    const commonPatterns = [
      `.${field}`,
      `#${field}`,
      `[class*="${field}"]`,
      `[data-field="${field}"]`,
      `[aria-label*="${field}"]`
    ];

    return commonPatterns;
  }
}

// Singleton instance
let instance = null;

function getSelectorDB() {
  if (!instance) {
    instance = new SelectorDatabase();
  }
  return instance;
}

module.exports = { SelectorDatabase, getSelectorDB };

