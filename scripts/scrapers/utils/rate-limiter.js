#!/usr/bin/env node
/**
 * RATE LIMITER
 * ============
 * Smart rate limiting with domain-specific limits, queue management,
 * and exponential backoff.
 */

/**
 * Rate Limiter
 */
class RateLimiter {
  constructor(options = {}) {
    this.options = {
      defaultRequestsPerMinute: 10,
      defaultRequestsPerHour: 100,
      enableExponentialBackoff: true,
      maxBackoffMs: 5 * 60 * 1000, // 5 minutes max
      ...options
    };
    
    this.domainLimits = new Map(); // Per-domain limits
    this.requestQueues = new Map(); // Per-domain queues
    this.backoffTimers = new Map(); // Per-domain backoff
  }

  /**
   * Set rate limit for a domain
   */
  setDomainLimit(domain, requestsPerMinute, requestsPerHour = null) {
    this.domainLimits.set(domain, {
      perMinute: requestsPerMinute,
      perHour: requestsPerHour || requestsPerMinute * 60
    });
  }

  /**
   * Get rate limit for a domain
   */
  getDomainLimit(domain) {
    return this.domainLimits.get(domain) || {
      perMinute: this.options.defaultRequestsPerMinute,
      perHour: this.options.defaultRequestsPerHour
    };
  }

  /**
   * Check if we can make a request now
   */
  canRequest(domain) {
    const limit = this.getDomainLimit(domain);
    const now = Date.now();
    
    // Check if in backoff period
    if (this.backoffTimers.has(domain)) {
      const backoffUntil = this.backoffTimers.get(domain);
      if (now < backoffUntil) {
        return {
          allowed: false,
          waitMs: backoffUntil - now,
          reason: 'backoff'
        };
      } else {
        // Backoff expired, clear it
        this.backoffTimers.delete(domain);
      }
    }
    
    // Get request queue for domain
    if (!this.requestQueues.has(domain)) {
      this.requestQueues.set(domain, []);
    }
    
    const queue = this.requestQueues.get(domain);
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Count recent requests
    const recentMinute = queue.filter(t => t > oneMinuteAgo).length;
    const recentHour = queue.filter(t => t > oneHourAgo).length;
    
    // Check limits
    if (recentMinute >= limit.perMinute) {
      // Calculate wait time until we can make next request
      const oldestInMinute = queue
        .filter(t => t > oneMinuteAgo)
        .sort((a, b) => a - b)[0];
      
      const waitMs = (oldestInMinute + (60 * 1000)) - now + 100; // Add 100ms buffer
      
      return {
        allowed: false,
        waitMs: Math.min(waitMs, 60000), // Cap at 1 minute
        reason: 'rate_limit_minute'
      };
    }
    
    if (recentHour >= limit.perHour) {
      const oldestInHour = queue
        .filter(t => t > oneHourAgo)
        .sort((a, b) => a - b)[0];
      
      const waitMs = (oldestInHour + (60 * 60 * 1000)) - now + 100;
      
      return {
        allowed: false,
        waitMs: Math.min(waitMs, 3600000), // Cap at 1 hour
        reason: 'rate_limit_hour'
      };
    }
    
    return {
      allowed: true,
      waitMs: 0,
      reason: null
    };
  }

  /**
   * Record a request
   */
  recordRequest(domain) {
    if (!this.requestQueues.has(domain)) {
      this.requestQueues.set(domain, []);
    }
    
    const queue = this.requestQueues.get(domain);
    const now = Date.now();
    
    queue.push(now);
    
    // Clean old entries (older than 1 hour)
    const oneHourAgo = now - (60 * 60 * 1000);
    const filtered = queue.filter(t => t > oneHourAgo);
    this.requestQueues.set(domain, filtered);
    
    return filtered.length;
  }

  /**
   * Wait until we can make a request
   */
  async waitUntilAllowed(domain, timeoutMs = 60000) {
    const startTime = Date.now();
    
    while (true) {
      const check = this.canRequest(domain);
      
      if (check.allowed) {
        return { allowed: true, waited: Date.now() - startTime };
      }
      
      if (Date.now() - startTime > timeoutMs) {
        return { allowed: false, reason: 'timeout', waited: Date.now() - startTime };
      }
      
      // Wait before checking again
      const waitTime = Math.min(check.waitMs, 1000); // Check every second max
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Apply exponential backoff to a domain
   */
  applyBackoff(domain, attemptNumber = 1) {
    if (!this.options.enableExponentialBackoff) {
      return;
    }
    
    // Exponential backoff: 2^attempt * baseDelay
    const baseDelayMs = 5000; // 5 seconds base
    const backoffMs = Math.min(
      Math.pow(2, attemptNumber) * baseDelayMs,
      this.options.maxBackoffMs
    );
    
    const backoffUntil = Date.now() + backoffMs;
    this.backoffTimers.set(domain, backoffUntil);
    
    console.log(`  ⏳ Applying backoff to ${domain}: ${(backoffMs / 1000).toFixed(1)}s`);
    
    return backoffMs;
  }

  /**
   * Clear backoff for a domain
   */
  clearBackoff(domain) {
    this.backoffTimers.delete(domain);
  }

  /**
   * Get statistics for a domain
   */
  getStats(domain) {
    const limit = this.getDomainLimit(domain);
    const queue = this.requestQueues.get(domain) || [];
    const now = Date.now();
    
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    return {
      requestsLastMinute: queue.filter(t => t > oneMinuteAgo).length,
      requestsLastHour: queue.filter(t => t > oneHourAgo).length,
      limitPerMinute: limit.perMinute,
      limitPerHour: limit.perHour,
      inBackoff: this.backoffTimers.has(domain),
      backoffUntil: this.backoffTimers.get(domain) || null
    };
  }
}

module.exports = { RateLimiter };

