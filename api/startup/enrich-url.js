/**
 * Vercel Serverless Function: URL Enrichment with Pyth Inference Engine
 * 
 * This endpoint runs the inference engine to calculate GOD scores
 * Works in production on Vercel without needing a separate backend server
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, key);
}

// Inference patterns (from lib/inference-extractor.js)
const FUNDING_PATTERNS = [
  /raised?\s*\$?([\d,.]+)\s*(million|m|mn)/gi,
  /\$?([\d,.]+)\s*(million|m|mn)\s*(seed|series|round|funding)/gi,
  /series\s*[a-e]\s*:?\s*\$?([\d,.]+)\s*(million|m|mn)?/gi,
  /funding\s*:?\s*\$?([\d,.]+)\s*(million|m|mn)/gi,
];

const SECTOR_KEYWORDS = {
  'AI/ML': ['artificial intelligence', 'machine learning', 'ai', 'ml', 'deep learning', 'neural', 'llm', 'gpt', 'nlp', 'computer vision'],
  'FinTech': ['fintech', 'financial', 'banking', 'payments', 'lending', 'insurance', 'insurtech', 'crypto', 'blockchain', 'defi'],
  'HealthTech': ['health', 'medical', 'healthcare', 'biotech', 'pharma', 'clinical', 'patient', 'telemedicine', 'digital health'],
  'CleanTech': ['clean', 'climate', 'energy', 'solar', 'sustainable', 'green', 'carbon', 'renewable', 'ev', 'electric vehicle'],
  'DevTools': ['developer', 'devtools', 'api', 'sdk', 'infrastructure', 'platform', 'developer experience', 'dx', 'devops', 'ci/cd'],
  'SaaS': ['saas', 'software as a service', 'cloud', 'enterprise', 'b2b'],
  'E-Commerce': ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'shop', 'commerce', 'dtc', 'direct to consumer'],
  'Cybersecurity': ['security', 'cyber', 'infosec', 'encryption', 'privacy', 'authentication', 'identity'],
};

const TEAM_PATTERNS = [
  /ex[-\s]?(google|meta|facebook|apple|amazon|microsoft|netflix|stripe|uber|airbnb|linkedin)/gi,
  /former\s+(google|meta|facebook|apple|amazon|microsoft|netflix|stripe|uber|airbnb)/gi,
  /(stanford|mit|harvard|berkeley|caltech|yale|princeton)\s*(alum|graduate|phd|mba)/gi,
  /y\s*combinator|yc\s*(w|s)?\d{2}|techstars|500\s*startups/gi,
  /phd|doctorate|professor/gi,
  /serial\s*entrepreneur|founded\s*\d+\s*companies/gi,
];

const EXECUTION_PATTERNS = [
  /launched|live|available now|try it|sign up/gi,
  /demo|playground|sandbox|try free/gi,
  /\d+[k+]?\s*(users|customers|clients|companies)/gi,
  /revenue|arr|mrr|\$\d+[km]?\s*(arr|mrr|revenue)/gi,
  /growing|growth|month.over.month|yoy/gi,
];

function extractInferenceData(text, url = '') {
  if (!text) return {};
  
  const lowerText = text.toLowerCase();
  
  // Extract sectors
  const sectors = [];
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      sectors.push(sector);
    }
  }
  
  // Extract funding
  let funding_amount = null;
  for (const pattern of FUNDING_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (num > 0) {
        funding_amount = num * 1000000; // Convert to actual dollars
        break;
      }
    }
  }
  
  // Extract team signals
  const team_signals = [];
  const credential_signals = [];
  for (const pattern of TEAM_PATTERNS) {
    const matches = text.match(pattern) || [];
    matches.forEach(m => {
      const clean = m.trim();
      if (!team_signals.includes(clean)) {
        team_signals.push(clean);
        if (/ex[-\s]?|former/i.test(clean)) credential_signals.push(clean);
      }
    });
  }
  
  // Extract execution signals
  const execution_signals = [];
  const is_launched = EXECUTION_PATTERNS[0].test(text);
  const has_demo = EXECUTION_PATTERNS[1].test(text);
  const has_customers = EXECUTION_PATTERNS[2].test(text);
  const has_revenue = EXECUTION_PATTERNS[3].test(text);
  
  if (is_launched) execution_signals.push('Product Launched');
  if (has_demo) execution_signals.push('Has Demo');
  if (has_customers) execution_signals.push('Has Customers');
  if (has_revenue) execution_signals.push('Has Revenue');
  
  // Technical cofounder detection
  const has_technical_cofounder = /cto|technical\s*co-?founder|engineer.*founder|phd/i.test(text);
  
  return {
    sectors: sectors.length > 0 ? sectors : ['Technology'],
    funding_amount,
    team_signals,
    credential_signals,
    execution_signals,
    is_launched,
    has_demo,
    has_customers,
    has_revenue,
    has_technical_cofounder,
  };
}

// Sector weights for scoring
const SECTOR_WEIGHTS = {
  'AI/ML': 15, 'FinTech': 12, 'HealthTech': 12, 'CleanTech': 10, 'DevTools': 10,
  'SaaS': 8, 'Cybersecurity': 8, 'E-Commerce': 6, 'LegalTech': 6, 'Gaming': 5,
};

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const startTime = Date.now();
  
  try {
    const { url, startupId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    
    console.log(`🔥 Enriching URL: ${url}`);
    
    // Fetch website content
    let websiteContent = '';
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      });
      
      const html = await response.text();
      // Strip HTML tags
      websiteContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);
    } catch (fetchError) {
      console.log(`⚠️  Could not fetch ${url}: ${fetchError.message}`);
    }
    
    // Run inference
    const inference = extractInferenceData(websiteContent, url);
    
    // Determine data tier
    const hasRichData = !!(
      inference.funding_amount ||
      inference.has_revenue ||
      (inference.execution_signals?.length >= 3)
    );
    const hasSomeData = !!(
      inference.sectors?.length > 0 ||
      inference.team_signals?.length > 0 ||
      inference.is_launched ||
      inference.has_customers
    );
    const tier = hasRichData ? 'A' : (hasSomeData ? 'B' : 'C');
    
    // Calculate GOD score
    let godScore = 40;
    let scores = { vision: 10, market: 10, traction: 8, team: 8, product: 8 };
    
    if (tier === 'A') {
      let vision = 15, market = 0, traction = 0, team = 0, product = 0;
      
      if (inference.sectors?.length > 0) {
        for (const sector of inference.sectors) {
          market = Math.max(market, SECTOR_WEIGHTS[sector] || 5);
        }
        market += 5;
      }
      market = Math.min(25, market);
      
      if (inference.has_revenue) traction += 15;
      if (inference.has_customers) traction += 8;
      if (inference.funding_amount) {
        const amt = inference.funding_amount;
        if (amt >= 10000000) traction += 10;
        else if (amt >= 1000000) traction += 5;
      }
      traction = Math.min(25, traction);
      
      if (inference.has_technical_cofounder) team += 10;
      if (inference.credential_signals?.length > 0) {
        team += Math.min(10, inference.credential_signals.length * 3);
      }
      team = Math.min(25, team);
      
      if (inference.is_launched) product += 15;
      if (inference.has_demo) product += 5;
      product = Math.min(20, product);
      
      godScore = Math.min(100, vision + market + traction + team + product);
      scores = { vision, market, traction, team, product };
    } else if (tier === 'B') {
      let base = 40;
      if (inference.sectors?.length > 0) {
        for (const sector of inference.sectors) {
          base = Math.max(base, 40 + (SECTOR_WEIGHTS[sector] || 0) / 2);
        }
      }
      if (inference.is_launched) base += 4;
      if (inference.has_demo) base += 2;
      if (inference.has_customers) base += 3;
      if (inference.has_technical_cofounder) base += 2;
      godScore = Math.min(55, Math.round(base));
    }
    
    // Update database if startupId provided
    if (startupId) {
      const supabase = getSupabaseClient();
      await supabase
        .from('startup_uploads')
        .update({
          sectors: inference.sectors || ['Technology'],
          total_god_score: godScore,
          extracted_data: {
            ...inference,
            data_tier: tier,
            inference_method: 'pyth_inference_engine',
            enriched_at: new Date().toISOString(),
          },
        })
        .eq('id', startupId);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Enrichment complete: ${godScore} (Tier ${tier}) in ${duration}ms`);
    
    return res.status(200).json({
      success: true,
      godScore,
      tier,
      scores,
      inference: {
        sectors: inference.sectors,
        is_launched: inference.is_launched,
        has_demo: inference.has_demo,
        has_technical_cofounder: inference.has_technical_cofounder,
        has_revenue: inference.has_revenue,
        has_customers: inference.has_customers,
        funding_amount: inference.funding_amount,
        team_signals: inference.team_signals,
        credential_signals: inference.credential_signals,
        execution_signals: inference.execution_signals,
      }
    });
  } catch (error) {
    console.error('Error enriching URL:', error);
    return res.status(500).json({ error: 'Failed to enrich URL', message: error.message });
  }
};
