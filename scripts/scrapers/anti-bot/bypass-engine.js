#!/usr/bin/env node
/**
 * ANTI-BOT BYPASS ENGINE
 * ======================
 * Handles anti-bot measures: rate limiting, CAPTCHAs, user-agent rotation,
 * header randomization, cookie management, and proxy rotation.
 */

const crypto = require('crypto');

/**
 * Anti-Bot Bypass Engine
 */
class AntiBotBypass {
  constructor(options = {}) {
    this.options = {
      rotateUserAgent: true,
      randomizeHeaders: true,
      useProxies: false,
      proxyList: [],
      respectRobotsTxt: true,
      ...options
    };
    
    this.userAgents = this.getUserAgents();
    this.currentUserAgentIndex = 0;
    this.requestHistory = new Map(); // Track requests per domain
  }

  /**
   * Get headers for a request (with randomization)
   */
  getHeaders(domain, customHeaders = {}) {
    const baseHeaders = {
      'User-Agent': this.getUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': this.getAcceptLanguage(),
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
      ...customHeaders
    };

    // Randomize order slightly (simulate real browser)
    if (this.options.randomizeHeaders) {
      return this.randomizeHeaderOrder(baseHeaders);
    }

    return baseHeaders;
  }

  /**
   * Get user agent (rotate if enabled)
   */
  getUserAgent() {
    if (!this.options.rotateUserAgent) {
      return this.userAgents[0];
    }

    // Rotate to next user agent
    const userAgent = this.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    
    return userAgent;
  }

  /**
   * Get list of realistic user agents
   */
  getUserAgents() {
    return [
      // Chrome (Mac)
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      
      // Chrome (Windows)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      
      // Firefox (Mac)
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
      
      // Firefox (Windows)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      
      // Safari
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      
      // Edge
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    ];
  }

  /**
   * Get random Accept-Language header
   */
  getAcceptLanguage() {
    const languages = [
      'en-US,en;q=0.9',
      'en-US,en;q=0.9,fr;q=0.8',
      'en-GB,en;q=0.9',
      'en-US,en;q=0.9,es;q=0.8'
    ];
    
    return languages[Math.floor(Math.random() * languages.length)];
  }

  /**
   * Randomize header order (make it less predictable)
   */
  randomizeHeaderOrder(headers) {
    const entries = Object.entries(headers);
    
    // Shuffle slightly (keep User-Agent first)
    const userAgent = entries.find(([key]) => key === 'User-Agent');
    const others = entries.filter(([key]) => key !== 'User-Agent');
    
    // Shuffle others
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    
    // Reconstruct with User-Agent first
    const shuffled = userAgent ? [userAgent, ...others] : others;
    
    return Object.fromEntries(shuffled);
  }

  /**
   * Add random delay to simulate human behavior
   */
  async humanDelay(minMs = 1000, maxMs = 3000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Check if response indicates rate limiting
   */
  isRateLimited(response) {
    if (!response) return false;
    
    const status = response.status || response.statusCode;
    const headers = response.headers || {};
    
    // HTTP 429 (Too Many Requests)
    if (status === 429) return true;
    
    // Check for rate limit headers
    if (headers['x-ratelimit-remaining'] === '0') return true;
    if (headers['retry-after']) return true;
    
    return false;
  }

  /**
   * Check if response indicates CAPTCHA
   */
  isCAPTCHA(response, body) {
    if (!response) return false;
    
    const status = response.status || response.statusCode;
    const bodyText = (body || '').toLowerCase();
    
    // HTTP 403 might be CAPTCHA
    if (status === 403) {
      const captchaIndicators = [
        'captcha',
        'recaptcha',
        'hcaptcha',
        'cloudflare',
        'challenge',
        'verify you are human',
        'prove you are not a robot'
      ];
      
      return captchaIndicators.some(indicator => bodyText.includes(indicator));
    }
    
    return false;
  }

  /**
   * Get retry-after delay from response
   */
  getRetryAfter(response) {
    const headers = response.headers || {};
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
      }
      
      // Could be a date, parse it
      const date = new Date(retryAfter);
      if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
      }
    }
    
    return null;
  }

  /**
   * Detect if response is blocked/banned
   */
  isBlocked(response, body) {
    if (!response) return false;
    
    const status = response.status || response.statusCode;
    const bodyText = (body || '').toLowerCase();
    
    // Check status codes
    if (status === 403 || status === 451) return true;
    
    // Check for blocking indicators
    const blockIndicators = [
      'access denied',
      'blocked',
      'forbidden',
      'you have been banned',
      'ip blocked',
      'too many requests from this ip'
    ];
    
    return blockIndicators.some(indicator => bodyText.includes(indicator));
  }

  /**
   * Track request to domain (for rate limiting)
   */
  trackRequest(domain) {
    if (!this.requestHistory.has(domain)) {
      this.requestHistory.set(domain, []);
    }
    
    const history = this.requestHistory.get(domain);
    const now = Date.now();
    
    // Add current request
    history.push(now);
    
    // Keep only last hour of requests
    const oneHourAgo = now - (60 * 60 * 1000);
    const filtered = history.filter(timestamp => timestamp > oneHourAgo);
    this.requestHistory.set(domain, filtered);
    
    return filtered.length;
  }

  /**
   * Check if we should delay before next request
   */
  shouldDelay(domain, requestsPerMinute = 10) {
    const history = this.requestHistory.get(domain) || [];
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    
    const recentRequests = history.filter(timestamp => timestamp > oneMinuteAgo);
    
    return recentRequests.length >= requestsPerMinute;
  }

  /**
   * Get delay needed before next request
   */
  getDelayNeeded(domain, requestsPerMinute = 10) {
    if (!this.shouldDelay(domain, requestsPerMinute)) {
      return 0;
    }
    
    const history = this.requestHistory.get(domain) || [];
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    
    const recentRequests = history.filter(timestamp => timestamp > oneMinuteAgo);
    if (recentRequests.length === 0) return 0;
    
    // Calculate when we can make the next request
    const oldestRecent = Math.min(...recentRequests);
    const timeUntilWindow = (oldestRecent + (60 * 1000)) - now;
    
    return Math.max(0, timeUntilWindow + 1000); // Add 1 second buffer
  }

  /**
   * Generate browser fingerprint (for detection)
   */
  generateFingerprint() {
    // This would generate a consistent fingerprint
    // For now, return a simple hash
    return crypto.createHash('md5')
      .update(this.getUserAgent() + Date.now().toString())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get proxy for request (if proxy rotation enabled)
   */
  getProxy() {
    if (!this.options.useProxies || this.options.proxyList.length === 0) {
      return null;
    }
    
    // Round-robin proxy selection
    const proxyIndex = Math.floor(Math.random() * this.options.proxyList.length);
    return this.options.proxyList[proxyIndex];
  }
}

module.exports = { AntiBotBypass };

