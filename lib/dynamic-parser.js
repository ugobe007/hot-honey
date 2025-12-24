#!/usr/bin/env node
/**
 * DYNAMIC PARSER - Parse.bot Style
 * 
 * Turn any webpage into structured data using natural language schemas.
 * No hardcoded selectors - AI reverse-engineers the page structure.
 * 
 * Usage:
 *   const parser = new DynamicParser();
 *   const data = await parser.parse(url, schema);
 * 
 * Schema Examples:
 *   - "Extract all startup names, descriptions, and funding amounts"
 *   - "Find team members with their names, roles, and LinkedIn URLs"
 *   - "Get investor details: name, check size, sectors, and portfolio companies"
 */

require('dotenv').config();
const cheerio = require('cheerio');

// API Keys
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

class DynamicParser {
  constructor(options = {}) {
    // Auto-select provider based on available API keys, prefer OpenAI
    const requestedProvider = options.provider || process.env.PARSE_PROVIDER || 'auto';
    
    if (requestedProvider === 'auto') {
      // Auto-select: prefer Anthropic (better extraction), fallback to OpenAI
      if (ANTHROPIC_API_KEY) {
        this.provider = 'anthropic';
      } else if (OPENAI_API_KEY) {
        this.provider = 'openai';
      } else {
        this.provider = 'anthropic'; // default
      }
    } else {
      this.provider = requestedProvider;
    }
    
    this.model = options.model || (this.provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gpt-4o-mini');
    this.maxTokens = options.maxTokens || 4000;
    this.cache = new Map(); // URL -> parsed result cache
    this.cacheTimeout = options.cacheTimeout || 60 * 60 * 1000; // 1 hour default
    
    // Initialize AI client
    this._initClient();
  }
  
  _initClient() {
    if (this.provider === 'anthropic' && ANTHROPIC_API_KEY) {
      const { Anthropic } = require('@anthropic-ai/sdk');
      this.client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      console.log('🤖 Using Anthropic Claude');
    } else if (this.provider === 'openai' && OPENAI_API_KEY) {
      const OpenAI = require('openai');
      this.client = new OpenAI({ apiKey: OPENAI_API_KEY });
      console.log('🤖 Using OpenAI GPT-4o');
    } else {
      console.warn(`⚠️ No API key for ${this.provider}`);
    }
  }
  
  /**
   * CORE METHOD: Parse any URL with a natural language schema
   * 
   * @param {string} url - The webpage to parse
   * @param {string|object} schema - Natural language description OR structured schema
   * @param {object} options - Additional options
   * @returns {object} Parsed data matching the schema
   */
  async parse(url, schema, options = {}) {
    const startTime = Date.now();
    
    // Check cache
    const cacheKey = `${url}:${JSON.stringify(schema)}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Cache hit');
        return cached.data;
      }
    }
    
    // Fetch the page
    console.log(`\n🌐 Fetching: ${url}`);
    const html = await this._fetch(url);
    
    // Extract and clean content
    const content = this._extractContent(html, url);
    console.log(`📄 Extracted ${content.length} chars of content`);
    
    // Build the AI prompt based on schema type
    const prompt = this._buildPrompt(content, schema, url, options);
    
    // Call AI for extraction
    console.log(`🧠 Parsing with ${this.provider}...`);
    const result = await this._callAI(prompt);
    
    // Validate and clean result
    const cleanResult = this._validateResult(result, schema);
    
    // Cache the result
    this.cache.set(cacheKey, { data: cleanResult, timestamp: Date.now() });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Parsed in ${elapsed}ms`);
    
    return cleanResult;
  }
  
  /**
   * Parse with a predefined schema type (startup, investor, team, news)
   */
  async parseAs(url, type, options = {}) {
    const schemas = {
      startup: {
        description: 'Extract startup information',
        fields: {
          name: 'Company name',
          tagline: 'One-line description or tagline',
          description: 'Full description (max 500 chars)',
          sectors: 'Array of industry sectors',
          stage: 'Funding stage (Pre-Seed, Seed, Series A, etc.)',
          funding_amount: 'Latest funding amount if mentioned',
          team_size: 'Number of employees if mentioned',
          location: 'Headquarters location',
          website: 'Company website URL',
          founded_year: 'Year founded',
          founders: 'Array of founder names',
          traction: 'Any metrics mentioned (users, revenue, growth)',
        }
      },
      investor: {
        description: 'Extract investor/VC information',
        fields: {
          name: 'Firm or individual name',
          type: 'VC, Angel, Accelerator, Corporate VC, etc.',
          check_size: 'Typical investment size range',
          stages: 'Array of stages they invest in',
          sectors: 'Array of focus sectors',
          geography: 'Geographic focus',
          portfolio: 'Array of notable portfolio companies',
          partners: 'Array of partner names',
          website: 'Firm website',
          description: 'Brief description of investment thesis',
        }
      },
      team: {
        description: 'Extract team/people information',
        fields: {
          members: [{
            name: 'Full name',
            role: 'Job title/role',
            bio: 'Brief bio (max 200 chars)',
            linkedin: 'LinkedIn URL if available',
            twitter: 'Twitter/X handle if available',
            background: 'Previous companies or education',
          }]
        }
      },
      funding_news: {
        description: 'Extract funding announcement details',
        fields: {
          company_name: 'Startup that raised funding',
          amount: 'Funding amount',
          round: 'Funding round (Seed, Series A, etc.)',
          valuation: 'Valuation if mentioned',
          lead_investors: 'Array of lead investors',
          other_investors: 'Array of participating investors',
          use_of_funds: 'What the funding will be used for',
          date: 'Announcement date',
        }
      }
    };
    
    const schema = schemas[type];
    if (!schema) {
      throw new Error(`Unknown schema type: ${type}. Valid types: ${Object.keys(schemas).join(', ')}`);
    }
    
    return this.parse(url, schema, options);
  }
  
  /**
   * Bulk parse multiple URLs with the same schema
   */
  async parseBulk(urls, schema, options = {}) {
    const concurrency = options.concurrency || 3;
    const results = [];
    
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(url => this.parse(url, schema, options).catch(err => ({
          url,
          error: err.message
        })))
      );
      results.push(...batchResults);
      
      // Rate limit between batches
      if (i + concurrency < urls.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    return results;
  }
  
  // ==================== PRIVATE METHODS ====================
  
  async _fetch(url) {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.text();
  }
  
  _extractContent(html, url) {
    const $ = cheerio.load(html);
    
    // Remove noise
    $('script, style, nav, footer, header, aside, iframe, noscript, svg, [role="banner"], [role="navigation"]').remove();
    
    // Try to get structured data first (JSON-LD)
    let structuredData = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data) structuredData = data;
      } catch {}
    });
    
    // Get meta tags
    const meta = {
      title: $('title').text() || $('meta[property="og:title"]').attr('content'),
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
      url: $('meta[property="og:url"]').attr('content') || url,
    };
    
    // Get main content
    const mainContent = $('main, article, [role="main"], .content, #content').first();
    const text = mainContent.length ? mainContent.text() : $('body').text();
    
    // Clean up
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 20000); // Limit for AI context
    
    return JSON.stringify({
      meta,
      structuredData,
      content: cleanText,
    });
  }
  
  _buildPrompt(content, schema, url, options) {
    const isNaturalLanguage = typeof schema === 'string';
    
    const systemPrompt = `You are a precision data extraction AI. Extract ONLY the requested data from web content.

RULES:
1. Return ONLY valid JSON - no markdown, no explanations
2. If a field cannot be found, use null (not empty string)
3. Be precise - don't hallucinate or guess
4. Extract ALL matching items, don't skip any
5. Clean and normalize data (trim whitespace, standardize formats)`;

    let userPrompt;
    
    if (isNaturalLanguage) {
      // Natural language schema (Parse.bot style)
      userPrompt = `URL: ${url}

TASK: ${schema}

Return the extracted data as a JSON object or array.

CONTENT:
${content}`;
    } else {
      // Structured schema
      userPrompt = `URL: ${url}

TASK: ${schema.description}

EXTRACT THESE FIELDS:
${JSON.stringify(schema.fields, null, 2)}

Return a JSON object matching this structure exactly. Use null for missing fields.

CONTENT:
${content}`;
    }
    
    return { system: systemPrompt, user: userPrompt };
  }
  
  async _callAI(prompt) {
    if (!this.client) {
      throw new Error('No AI client initialized');
    }
    
    if (this.provider === 'anthropic') {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      });
      
      return response.content[0]?.text || '';
    } else {
      // OpenAI
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      });
      
      return response.choices[0]?.message?.content || '';
    }
  }
  
  _validateResult(text, schema) {
    // Try to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from response
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }
    
    return parsed;
  }
}

// ==================== CLI INTERFACE ====================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🔮 DYNAMIC PARSER - Parse.bot Style

Usage:
  node lib/dynamic-parser.js <url> <schema>
  node lib/dynamic-parser.js <url> --type=<startup|investor|team|funding_news>

Examples:
  node lib/dynamic-parser.js "https://stripe.com/about" "Extract company description and founding year"
  node lib/dynamic-parser.js "https://a16z.com/team" --type=team
  node lib/dynamic-parser.js "https://techcrunch.com/..." "Extract startup name, funding amount, and investors"
`);
    process.exit(1);
  }
  
  const url = args[0];
  const parser = new DynamicParser();
  
  // Check for --type flag
  const typeArg = args.find(a => a.startsWith('--type='));
  
  let result;
  if (typeArg) {
    const type = typeArg.split('=')[1];
    result = await parser.parseAs(url, type);
  } else {
    const schema = args.slice(1).join(' ');
    result = await parser.parse(url, schema);
  }
  
  console.log('\n📊 RESULT:\n');
  console.log(JSON.stringify(result, null, 2));
}

// Export for use as module
module.exports = { DynamicParser };

// Run CLI if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}
