#!/usr/bin/env node
/**
 * AUTO-RECOVERY ENGINE
 * ====================
 * Automatically recovers from parsing failures by trying new strategies,
 * regenerating selectors, and learning from failures.
 */

const { SelectorRegenerator } = require('./selector-regenerator');
const { HTMLStructureAnalyzer } = require('./html-structure-analyzer');
const { MultiStrategyParser } = require('../parsers/multi-strategy-parser');
const { getSelectorDB } = require('../database/selector-db');
const { FailureDetector } = require('./failure-detector');

/**
 * Auto-Recovery Engine
 */
class AutoRecovery {
  constructor(options = {}) {
    this.selectorRegenerator = new SelectorRegenerator();
    this.structureAnalyzer = new HTMLStructureAnalyzer();
    this.failureDetector = new FailureDetector();
    this.selectorDB = getSelectorDB();
    this.options = {
      maxRecoveryAttempts: 3,
      enableSelectorRegeneration: true,
      enableAIFallback: true,
      ...options
    };
  }

  /**
   * Attempt to recover from a parsing failure
   */
  async recover(html, domain, dataType, fields, failureAnalysis) {
    console.log(`\n🔧 AUTO-RECOVERY: Attempting to recover from failure...`);
    console.log(`   Error Type: ${failureAnalysis.errorType}`);
    console.log(`   Domain: ${domain}`);

    const recoveryStrategies = this.getRecoveryStrategies(failureAnalysis);

    for (const strategy of recoveryStrategies) {
      console.log(`\n   🎯 Trying recovery strategy: ${strategy.name}`);

      try {
        const result = await this.executeRecoveryStrategy(
          strategy,
          html,
          domain,
          dataType,
          fields,
          failureAnalysis
        );

        if (result.success) {
          console.log(`   ✅ Recovery successful with: ${strategy.name}`);
          
          // Learn from recovery
          await this.learnFromRecovery(domain, dataType, strategy, result);
          
          return {
            recovered: true,
            strategy: strategy.name,
            data: result.data,
            newSelectors: result.newSelectors || []
          };
        }
      } catch (error) {
        console.log(`   ❌ Recovery strategy failed: ${error.message}`);
        continue;
      }
    }

    // All recovery strategies failed
    console.log(`   ❌ All recovery strategies failed`);
    return {
      recovered: false,
      strategiesAttempted: recoveryStrategies.map(s => s.name)
    };
  }

  /**
   * Get recovery strategies based on failure type
   */
  getRecoveryStrategies(failureAnalysis) {
    const strategies = [];

    switch (failureAnalysis.errorType) {
      case 'selector_not_found':
      case 'html_structure_changed':
        // Try selector regeneration
        if (this.options.enableSelectorRegeneration) {
          strategies.push({
            name: 'selector_regeneration',
            priority: 1,
            method: 'regenerateSelectors'
          });
        }
        
        // Try AI parsing
        if (this.options.enableAIFallback) {
          strategies.push({
            name: 'ai_fallback',
            priority: 2,
            method: 'tryAIParsing'
          });
        }
        
        // Try pattern matching
        strategies.push({
          name: 'pattern_matching',
          priority: 3,
          method: 'tryPatternMatching'
        });
        break;

      case 'timeout':
        // Try browser automation
        strategies.push({
          name: 'browser_automation',
          priority: 1,
          method: 'tryBrowserAutomation'
        });
        break;

      case 'rate_limited':
        // Wait and retry
        strategies.push({
          name: 'backoff_retry',
          priority: 1,
          method: 'waitAndRetry'
        });
        break;

      default:
        // Try all strategies
        if (this.options.enableSelectorRegeneration) {
          strategies.push({
            name: 'selector_regeneration',
            priority: 1,
            method: 'regenerateSelectors'
          });
        }
        
        if (this.options.enableAIFallback) {
          strategies.push({
            name: 'ai_fallback',
            priority: 2,
            method: 'tryAIParsing'
          });
        }
    }

    return strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute a recovery strategy
   */
  async executeRecoveryStrategy(strategy, html, domain, dataType, fields, failureAnalysis) {
    switch (strategy.method) {
      case 'regenerateSelectors':
        return await this.regenerateSelectors(html, domain, dataType, fields);
      
      case 'tryAIParsing':
        return await this.tryAIParsing(html, domain, dataType, fields);
      
      case 'tryPatternMatching':
        return await this.tryPatternMatching(html, domain, dataType, fields);
      
      case 'tryBrowserAutomation':
        return await this.tryBrowserAutomation(domain, dataType, fields);
      
      case 'waitAndRetry':
        return await this.waitAndRetry(html, domain, dataType, fields);
      
      default:
        throw new Error(`Unknown recovery method: ${strategy.method}`);
    }
  }

  /**
   * Recovery Strategy 1: Regenerate selectors
   */
  async regenerateSelectors(html, domain, dataType, fields) {
    console.log(`     🔄 Regenerating selectors...`);

    const newSelectors = {};
    const parser = new MultiStrategyParser({ useAI: false, useBrowser: false });

    // Regenerate selectors for each field
    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      const fieldType = typeof fieldConfig === 'object' ? fieldConfig.type : 'string';
      
      const candidates = await this.selectorRegenerator.generateSelectors(
        html,
        fieldName,
        fieldType
      );

      if (candidates.length > 0) {
        // Try top candidate
        const topCandidate = candidates[0];
        newSelectors[fieldName] = topCandidate.selector;

        console.log(`     ✅ Found new selector for '${fieldName}': ${topCandidate.selector}`);
      }
    }

    if (Object.keys(newSelectors).length === 0) {
      return { success: false, error: 'No new selectors generated' };
    }

    // Try parsing with new selectors
    // Create a modified fields object with new selectors
    const fieldsWithSelectors = {};
    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      if (newSelectors[fieldName]) {
        fieldsWithSelectors[fieldName] = {
          ...(typeof fieldConfig === 'object' ? fieldConfig : { type: fieldConfig }),
          selector: newSelectors[fieldName]
        };
      } else {
        fieldsWithSelectors[fieldName] = fieldConfig;
      }
    }

    // Parse with new selectors
    const result = await parser.parse(html, domain, dataType, fieldsWithSelectors);

    if (result.success) {
      // Save new selectors to database
      for (const [fieldName, selector] of Object.entries(newSelectors)) {
        await this.selectorDB.saveSelector(
          domain,
          dataType,
          selector,
          'css',
          fieldName
        );
      }

      return {
        success: true,
        data: result.data,
        newSelectors
      };
    }

    return { success: false, error: 'New selectors did not work' };
  }

  /**
   * Recovery Strategy 2: Try AI parsing
   */
  async tryAIParsing(html, domain, dataType, fields) {
    console.log(`     🤖 Trying AI parsing...`);

    const parser = new MultiStrategyParser({ useAI: true, useBrowser: false });
    
    // Force AI strategy
    const result = await parser.parse(html, domain, dataType, fields);

    if (result.success && result.strategy === 'ai') {
      return {
        success: true,
        data: result.data,
        strategy: 'ai'
      };
    }

    return { success: false, error: 'AI parsing failed' };
  }

  /**
   * Recovery Strategy 3: Try pattern matching
   */
  async tryPatternMatching(html, domain, dataType, fields) {
    console.log(`     📐 Trying pattern matching...`);

    const parser = new MultiStrategyParser({ 
      useAI: false, 
      useBrowser: false 
    });

    // Force pattern strategy by removing CSS selector support temporarily
    const result = await parser.parse(html, domain, dataType, fields);

    if (result.success && result.strategy === 'pattern') {
      return {
        success: true,
        data: result.data,
        strategy: 'pattern'
      };
    }

    return { success: false, error: 'Pattern matching failed' };
  }

  /**
   * Recovery Strategy 4: Try browser automation
   */
  async tryBrowserAutomation(domain, dataType, fields) {
    console.log(`     🌐 Trying browser automation...`);
    
    // This would use Puppeteer/Playwright
    // Placeholder for now
    return { 
      success: false, 
      error: 'Browser automation not yet implemented' 
    };
  }

  /**
   * Recovery Strategy 5: Wait and retry
   */
  async waitAndRetry(html, domain, dataType, fields) {
    console.log(`     ⏳ Waiting 30 seconds before retry...`);
    
    await new Promise(resolve => setTimeout(resolve, 30000));

    const parser = new MultiStrategyParser();
    const result = await parser.parse(html, domain, dataType, fields);

    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }

    return { success: false, error: 'Retry after wait failed' };
  }

  /**
   * Learn from successful recovery
   */
  async learnFromRecovery(domain, dataType, strategy, result) {
    // Mark recovery as successful in database
    // Could store recovery patterns for future use
    
    if (result.newSelectors) {
      console.log(`     📚 Learning: Saved ${Object.keys(result.newSelectors).length} new selectors`);
    }
  }
}

module.exports = { AutoRecovery };

