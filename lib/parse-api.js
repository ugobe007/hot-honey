#!/usr/bin/env node
/**
 * PARSE API - Local Parse.bot-Style Service
 * 
 * Start this server and call it with any URL + schema:
 * 
 * POST /parse
 * {
 *   "url": "https://techcrunch.com/...",
 *   "query": "Extract startup name, funding amount, investors, and round type"
 * }
 * 
 * Returns structured JSON based on your natural language query.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { DynamicParser } = require('./dynamic-parser');

const app = express();
const PORT = process.env.PARSE_API_PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize parser
const parser = new DynamicParser({
  provider: process.env.PARSE_PROVIDER || 'anthropic',
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'parse-api', timestamp: new Date().toISOString() });
});

/**
 * MAIN ENDPOINT: Parse any URL with natural language
 * 
 * POST /parse
 * {
 *   "url": "https://example.com",
 *   "query": "Extract all products with prices"
 * }
 */
app.post('/parse', async (req, res) => {
  const { url, query, type, options } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing required field: url' });
  }
  
  if (!query && !type) {
    return res.status(400).json({ error: 'Must provide either "query" (natural language) or "type" (startup, investor, team, funding_news)' });
  }
  
  try {
    const startTime = Date.now();
    
    let result;
    if (type) {
      result = await parser.parseAs(url, type, options || {});
    } else {
      result = await parser.parse(url, query, options || {});
    }
    
    res.json({
      success: true,
      url,
      query: query || `type:${type}`,
      data: result,
      meta: {
        parsed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      }
    });
    
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      url,
      query: query || type,
    });
  }
});

/**
 * Bulk parse multiple URLs
 * 
 * POST /parse/bulk
 * {
 *   "urls": ["https://...", "https://..."],
 *   "query": "Extract startup info",
 *   "concurrency": 3
 * }
 */
app.post('/parse/bulk', async (req, res) => {
  const { urls, query, type, concurrency = 3 } = req.body;
  
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Missing required field: urls (array)' });
  }
  
  if (!query && !type) {
    return res.status(400).json({ error: 'Must provide either "query" or "type"' });
  }
  
  try {
    const schema = type ? undefined : query;
    const results = await parser.parseBulk(urls, schema || { type }, { concurrency });
    
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Quick parse with predefined type
 * 
 * GET /parse/startup?url=https://...
 * GET /parse/investor?url=https://...
 * GET /parse/team?url=https://...
 * GET /parse/funding?url=https://...
 */
['startup', 'investor', 'team', 'funding_news'].forEach(type => {
  app.get(`/parse/${type.replace('_', '')}`, async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing query param: url' });
    }
    
    try {
      const result = await parser.parseAs(url, type);
      res.json({ success: true, url, type, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🔮 PARSE API - Local Parse.bot-Style Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Server running on http://localhost:${PORT}

ENDPOINTS:
  POST /parse              - Parse URL with natural language query
  POST /parse/bulk         - Parse multiple URLs
  GET  /parse/startup      - Quick parse as startup
  GET  /parse/investor     - Quick parse as investor
  GET  /parse/team         - Quick parse as team page
  GET  /parse/fundingnews  - Quick parse funding announcement
  GET  /health             - Health check

EXAMPLE:
  curl -X POST http://localhost:${PORT}/parse \\
    -H "Content-Type: application/json" \\
    -d '{"url": "https://techcrunch.com/...", "query": "Extract startup name and funding"}'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

module.exports = app;
