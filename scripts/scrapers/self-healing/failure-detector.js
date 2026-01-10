#!/usr/bin/env node
/**
 * FAILURE DETECTOR
 * ================
 * Detects parsing failures, analyzes causes, and triggers self-healing actions.
 */

const { getSelectorDB } = require('../database/selector-db');

/**
 * Failure Detector
 */
class FailureDetector {
  constructor() {
    this.failurePatterns = new Map(); // Track failure patterns
    this.selectorDB = getSelectorDB();
  }

  /**
   * Analyze a parsing failure
   */
  async analyzeFailure(error, html, domain, dataType, strategy, selector) {
    const analysis = {
      timestamp: new Date().toISOString(),
      domain,
      dataType,
      strategy,
      selector,
      errorMessage: error.message,
      errorType: this.classifyError(error),
      htmlLength: html ? html.length : 0,
      recommendations: []
    };

    // Analyze error type
    switch (analysis.errorType) {
      case 'not_found':
        analysis.recommendations.push({
          action: 'check_url',
          priority: 'high',
          reason: 'URL returned 404 - page does not exist or URL is incorrect'
        });
        break;
        
      case 'selector_not_found':
        analysis.recommendations.push({
          action: 'regenerate_selector',
          priority: 'high',
          reason: 'CSS selector no longer matches HTML structure'
        });
        break;
        
      case 'rate_limited':
        analysis.recommendations.push({
          action: 'backoff_retry',
          priority: 'high',
          reason: 'Rate limited by website'
        });
        break;
        
      case 'captcha':
        analysis.recommendations.push({
          action: 'manual_intervention',
          priority: 'critical',
          reason: 'CAPTCHA detected'
        });
        break;
        
      case 'html_structure_changed':
        analysis.recommendations.push({
          action: 'analyze_html_structure',
          priority: 'high',
          reason: 'Website layout changed'
        });
        break;
        
      case 'timeout':
        analysis.recommendations.push({
          action: 'try_browser_automation',
          priority: 'medium',
          reason: 'Page requires JavaScript'
        });
        break;
    }

    // Store failure pattern for learning
    await this.recordFailurePattern(analysis);

    return analysis;
  }

  /**
   * Classify error type
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    // Check for 404 first (URL issue, not recoverable)
    if (message.includes('404') || message.includes('page not found') || message.includes('not found (404)')) {
      return 'not_found';
    }
    
    // Check for selector issues (recoverable)
    if (message.includes('selector') || message.includes('null')) {
      return 'selector_not_found';
    }
    
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
      return 'rate_limited';
    }
    
    if (message.includes('captcha') || message.includes('robot') || message.includes('403')) {
      return 'captcha';
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    
    if (message.includes('structure') || message.includes('changed') || message.includes('layout')) {
      return 'html_structure_changed';
    }
    
    // HTTP errors
    if (message.includes('404')) {
      return 'not_found';
    }
    
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'server_error';
    }
    
    return 'unknown';
  }

  /**
   * Record failure pattern for learning
   */
  async recordFailurePattern(analysis) {
    const patternKey = `${analysis.domain}:${analysis.dataType}:${analysis.errorType}`;
    
    if (!this.failurePatterns.has(patternKey)) {
      this.failurePatterns.set(patternKey, {
        count: 0,
        firstSeen: analysis.timestamp,
        lastSeen: analysis.timestamp,
        recommendations: analysis.recommendations
      });
    }
    
    const pattern = this.failurePatterns.get(patternKey);
    pattern.count++;
    pattern.lastSeen = analysis.timestamp;
    
    // If same failure occurs 3+ times, mark as persistent
    if (pattern.count >= 3) {
      console.log(`⚠️  Persistent failure pattern detected: ${patternKey} (${pattern.count} times)`);
    }
  }

  /**
   * Get failure recommendations
   */
  getRecommendations(analysis) {
    return analysis.recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Check if failure is recoverable
   */
  isRecoverable(analysis) {
    const nonRecoverable = ['captcha', 'permission_denied', 'not_found'];
    return !nonRecoverable.includes(analysis.errorType);
  }
}

module.exports = { FailureDetector };

