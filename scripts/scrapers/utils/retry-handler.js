#!/usr/bin/env node
/**
 * RETRY HANDLER
 * =============
 * Handles retries with exponential backoff, jitter, and smart error handling.
 */

/**
 * Retry Handler
 */
class RetryHandler {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      baseDelayMs: 1000, // 1 second base
      maxDelayMs: 30000, // 30 seconds max
      exponentialBase: 2,
      jitter: true,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
      retryableStatusCodes: [429, 500, 502, 503, 504],
      ...options
    };
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, context = {}) {
    let lastError = null;
    let attempt = 0;
    
    while (attempt <= this.options.maxRetries) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt, context);
          console.log(`  ⏳ Retry attempt ${attempt}/${this.options.maxRetries} after ${(delay / 1000).toFixed(1)}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await fn();
        return {
          success: true,
          result,
          attempts: attempt + 1
        };
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Check if error is retryable
        if (!this.isRetryable(error, attempt)) {
          return {
            success: false,
            error,
            attempts: attempt,
            retryable: false
          };
        }
        
        // Check if we've exceeded max retries
        if (attempt > this.options.maxRetries) {
          return {
            success: false,
            error,
            attempts: attempt,
            retryable: true,
            reason: 'max_retries_exceeded'
          };
        }
      }
    }
    
    return {
      success: false,
      error: lastError,
      attempts: attempt,
      retryable: false
    };
  }

  /**
   * Calculate delay for retry (exponential backoff + jitter)
   */
  calculateDelay(attempt, context = {}) {
    // Exponential backoff: baseDelay * (exponentialBase ^ attempt)
    let delay = this.options.baseDelayMs * Math.pow(this.options.exponentialBase, attempt - 1);
    
    // Cap at max delay
    delay = Math.min(delay, this.options.maxDelayMs);
    
    // Add jitter (random variation) to prevent thundering herd
    if (this.options.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * jitterAmount * 2) - jitterAmount;
    }
    
    // Respect retry-after header if present
    if (context.retryAfter) {
      delay = Math.max(delay, context.retryAfter);
    }
    
    return Math.floor(delay);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error, attempt) {
    // Network errors are usually retryable
    if (error.code && this.options.retryableErrors.includes(error.code)) {
      return true;
    }
    
    // HTTP status codes
    if (error.response) {
      const status = error.response.status || error.response.statusCode;
      if (this.options.retryableStatusCodes.includes(status)) {
        return true;
      }
      
      // 4xx errors (except 429) are usually not retryable
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }
    
    // 404 Not Found is not retryable
    if (error.message && error.message.includes('404')) {
      return false;
    }
    
    // 401 Unauthorized is not retryable (auth issue)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return false;
    }
    
    // Unknown errors - retry once
    return attempt <= 1;
  }

  /**
   * Extract retry-after from error response
   */
  extractRetryAfter(error) {
    if (error.response && error.response.headers) {
      const retryAfter = error.response.headers['retry-after'] || 
                        error.response.headers['Retry-After'];
      
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
          return seconds * 1000; // Convert to milliseconds
        }
        
        // Could be a date
        const date = new Date(retryAfter);
        if (!isNaN(date.getTime())) {
          return Math.max(0, date.getTime() - Date.now());
        }
      }
    }
    
    return null;
  }
}

module.exports = { RetryHandler };

